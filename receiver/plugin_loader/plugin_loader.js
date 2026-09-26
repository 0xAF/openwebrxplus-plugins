/*
 * Plugin: plugin_loader - Let users enable admin-approved plugins from a native plugin window
 *
 * The list of available plugins comes from receiver/plugins.json (next to this plugin's folder).
 * Built-in OpenWebRX+ plugins (MapPlugin, SunPlugin, ...) are listed only when present.
 *
 * Usage (at the end of init.js):
 *   await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/plugin_loader/plugin_loader.js');
 *   Plugins.plugin_loader.setup({ allowed: ['doppler', 'MapPlugin'], allow_all: false });

 *
 * Requires OpenWebRX+ 1.2.124+ (Plugins.addButton / Plugins.addWindow).
 *
 * License: MIT
 * Copyright (c) 2026 Stanislav Lechev [0xAF], LZ2SLL
 */

Plugins.plugin_loader = Plugins.plugin_loader || {};
Plugins.plugin_loader._version = 0.1;

// styles are injected by the plugin
Plugins.plugin_loader.no_css = true;

Plugins.plugin_loader._cdnUrl = 'https://0xaf.github.io/openwebrxplus-plugins/receiver/';

// base URL of the receiver plugins folder, e.g. 'https://0xaf.github.io/openwebrxplus-plugins/receiver/'
// init() switches it to the CDN when plugins.json is not found next to this plugin.
Plugins.plugin_loader._baseUrl = (document.currentScript && document.currentScript.src || '')
	.replace(/plugin_loader\/plugin_loader\.js(\?.*)?$/, '')
	|| Plugins.plugin_loader._cdnUrl;

Plugins.plugin_loader._lsKey = 'plugin_loader_enabled';
Plugins.plugin_loader._manifest = [];  // plugin entries from plugins.json (+ unknown built-ins)
Plugins.plugin_loader._byId = {};
Plugins.plugin_loader._config = { allowed: [], allow_all: false, allow_experimental: false, allow_thirdparty: false };
Plugins.plugin_loader._admin = {};     // ids loaded before setup() - locked
Plugins.plugin_loader._user = {};      // ids enabled by the user in this browser
Plugins.plugin_loader._started = {};   // built-in plugins started by this loader
Plugins.plugin_loader._removed = {};   // ids unchecked by the user, removed after reload
Plugins.plugin_loader._busy = {};
Plugins.plugin_loader._errors = {};
Plugins.plugin_loader._setupDone = false;
Plugins.plugin_loader._manifestLoaded = false;

// Load the manifest. The UI is created later by setup().
Plugins.plugin_loader.init = async function () {
	const self = Plugins.plugin_loader;
	if (typeof Plugins.addButton !== 'function' || typeof Plugins.addWindow !== 'function') {
		console.error('[plugin_loader] requires OpenWebRX+ 1.2.124 or newer (plugin windows).');
		return false;
	}

	// Look for plugins.json next to this plugin, then on the CDN.
	// Plugins are loaded from the same place as the manifest.
	const bases = [self._baseUrl];
	if (self._baseUrl !== self._cdnUrl) bases.push(self._cdnUrl);
	for (const base of bases) {
		try {
			const res = await fetch(base + 'plugins.json', { cache: 'no-cache' });
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const data = await res.json();
			self._manifest = data.plugins || [];
			self._baseUrl = base;
			self._manifestLoaded = true;
			break;
		} catch (e) {
			console.warn('[plugin_loader] cannot load ' + base + 'plugins.json: ' + e.message);
		}
	}
	if (!self._manifestLoaded) {
		console.error('[plugin_loader] plugins.json not found, the plugin list is not available.');
		return false;
	}
	self._manifest.forEach(function (p) {
		self._byId[p.id] = p;
	});
	return true;
};

/*
 * Configure the loader, create its button and window, and load the plugins
 * the user enabled earlier. Call it once, after all admin plugins are loaded.
 * It waits until the receiver page is fully initialized, so it is safe to call
 * it early in init.js.
 *
 * Plugin ids are repository folder names ('doppler'), built-in plugin names
 * ('MapPlugin') or third-party ids from plugins.json. All options default to off.
 *
 * config.allowed            - array of plugin ids (see above).
 * config.allow_all          - true lets the user enable any repository or built-in plugin.
 * config.allow_experimental - true lets the user enable any experimental plugin.
 * config.allow_thirdparty   - true lets the user enable any third-party plugin with a script URL.
 *
 * `allow_all` does not include experimental and third-party plugins - they need
 * their own flag or an explicit entry in `allowed`.
 *
 * Returns a Promise resolved after the user's plugins are loaded.
 */
Plugins.plugin_loader.setup = async function (config) {
	var self = Plugins.plugin_loader;
	if (!self._manifestLoaded) {
		console.error('[plugin_loader] setup() skipped: the plugin failed to load (see errors above).');
		return;
	}
	if (self._setupDone) {
		console.warn('[plugin_loader] setup() was already called.');
		return;
	}
	self._setupDone = true;
	config = config || {};
	self._config.allowed = Array.isArray(config.allowed) ? config.allowed.slice() : [];
	self._config.allow_all = !!config.allow_all;
	self._config.allow_experimental = !!config.allow_experimental;
	self._config.allow_thirdparty = !!config.allow_thirdparty;

	// built-in plugins need the receiver page to be initialized
	await self._whenReady();

	if (self._config.allow_all) self._addUnknownBuiltins();

	// everything already running was loaded by the admin
	self._manifest.forEach(function (p) {
		if (self._isLoaded(p)) self._admin[p.id] = true;
	});

	self._injectStyle();
	var button = Plugins.addButton('plugin_loader', 'PLUGINS', function () {
		self._render();
		Plugins.toggleWindow('plugin_loader');
	});
	// addButton() only takes text - replace it with the puzzle icon
	if (button) {
		button.innerHTML = self._icon;
		button.title = 'Plugins';
		button.setAttribute('aria-label', 'Plugins');
		button.style.width = '16px';
	}
	self._window = Plugins.addWindow('plugin_loader', 'Plugins');
	self._body = self._window && self._window.querySelector('.openwebrx-plugin-body');

	// restore the user's selection
	const saved = self._loadSaved();
	for (const id of saved) {
		const p = self._byId[id];
		if (!p || !self._isPermitted(p) || !self._isAvailable(p)) continue;
		self._user[id] = true;
		if (!self._isLoaded(p)) await self._enable(p);
	}
	self._render();
};

// ---------------------------------------------------------------------------
// plugin state helpers

// Resolve once OpenWebRX+ has initialized the receiver page.
// Uses utils.on_ready() when available, otherwise the same check without utils:
// `clock` is the last object created by openwebrx_init().
Plugins.plugin_loader._whenReady = function () {
	return new Promise(function (resolve) {
		if (Plugins.utils && typeof Plugins.utils.on_ready === 'function') {
			Plugins.utils.on_ready(resolve);
			return;
		}
		(function check() {
			if (document.owrx_initialized || typeof clock !== 'undefined') resolve();
			else setTimeout(check, 50);
		})();
	});
};

// Built-in plugins not listed in plugins.json (only shown with allow_all).
Plugins.plugin_loader._addUnknownBuiltins = function () {
	var self = Plugins.plugin_loader;
	var known = {};
	self._manifest.forEach(function (p) { if (p.global) known[p.global] = true; });
	Object.keys(window).forEach(function (name) {
		if (!/Plugin$/.test(name) || known[name] || self._byId[name]) return;
		var g = window[name];
		if (typeof g !== 'function' || typeof g.init !== 'function') return;
		var p = { id: name, category: 'builtin', global: name, description: 'Unknown built-in plugin' };
		self._manifest.push(p);
		self._byId[name] = p;
	});
};

Plugins.plugin_loader._url = function (p) {
	if (p.category === 'thirdparty') return p.url;
	return Plugins.plugin_loader._baseUrl + p.id + '/' + p.id + '.js';
};

// Name under which a plugin registers in Plugins[] (the script basename).
Plugins.plugin_loader._pluginName = function (p) {
	return (Plugins.plugin_loader._url(p) || '').split('/').pop().replace(/\.js(\?.*)?$/, '');
};

// Built-in plugins are available only when OpenWebRX+ provides them.
Plugins.plugin_loader._isAvailable = function (p) {
	// third-party plugins without a script URL are only listed in the README
	if (p.category === 'thirdparty') return !!p.url;
	if (p.category !== 'builtin') return true;
	var g = window[p.global];
	return typeof g === 'function' && typeof g.init === 'function';
};

Plugins.plugin_loader._isLoaded = function (p) {
	var self = Plugins.plugin_loader;
	if (p.category !== 'builtin') return !!Plugins.isLoaded(self._pluginName(p));
	if (!self._isAvailable(p)) return false;
	if (self._started[p.id]) return true;
	// built-ins have no "started" flag - look for the DOM they create
	var g = window[p.global];
	var selector = p.detect;
	if (!selector && g.myname) {
		selector = ['button', 'section', 'window'].map(function (kind) {
			return '#plugin-' + kind + '-' + g.myname;
		}).join(',');
	}
	try {
		return !!(selector && document.querySelector(selector));
	} catch (e) {
		return false;
	}
};

Plugins.plugin_loader._isPermitted = function (p) {
	var cfg = Plugins.plugin_loader._config;
	if (cfg.allowed.indexOf(p.id) >= 0) return true;
	if (p.category === 'experimental') return cfg.allow_experimental;
	if (p.category === 'thirdparty') return cfg.allow_thirdparty;
	return cfg.allow_all;
};

// Deprecated plugins are hidden when their built-in replacement exists.
Plugins.plugin_loader._isReplaced = function (p) {
	var rep = p.replaced_by && Plugins.plugin_loader._byId[p.replaced_by];
	return !!(rep && rep.category === 'builtin' && Plugins.plugin_loader._isAvailable(rep));
};

Plugins.plugin_loader._isVisible = function (p) {
	var self = Plugins.plugin_loader;
	if (p.category === 'utility' || p.id === 'plugin_loader') return false;
	if (!self._isAvailable(p)) return false;
	if (self._isLoaded(p)) return true;
	if (p.category === 'deprecated' && self._isReplaced(p)) return false;
	return self._isPermitted(p);
};

// ---------------------------------------------------------------------------
// loading

// Load a plugin and its dependencies. Returns true on success.
Plugins.plugin_loader._enable = async function (p) {
	const self = Plugins.plugin_loader;
	const conflict = (p.conflicts || []).filter(function (id) {
		return self._byId[id] && self._isLoaded(self._byId[id]);
	});
	if (conflict.length) {
		self._errors[p.id] = 'Conflicts with ' + conflict.join(', ');
		return false;
	}
	delete self._errors[p.id];

	try {
		for (const depId of p.requires || []) {
			const dep = self._byId[depId];
			if (dep && !self._isLoaded(dep) && !await self._loadScript(dep)) {
				throw new Error('Cannot load dependency ' + depId);
			}
		}
		if (p.category === 'builtin') {
			window[p.global].init();
			self._started[p.id] = true;
		} else if (!await self._loadScript(p)) {
			throw new Error('Cannot load plugin');
		}
	} catch (e) {
		self._errors[p.id] = e.message;
		console.error('[plugin_loader] ' + p.id + ': ' + e.message);
		return false;
	}
	return true;
};

Plugins.plugin_loader._loadScript = async function (p) {
	const self = Plugins.plugin_loader;
	const name = self._pluginName(p);
	await Plugins.load(self._url(p));
	if (Plugins.isLoaded(name)) return true;
	// Plugins.load() refuses to retry once Plugins[name] exists
	delete Plugins[name];
	return false;
};

Plugins.plugin_loader._toggle = async function (p, on) {
	const self = Plugins.plugin_loader;
	if (on) {
		if (self._removed[p.id]) {
			// still running - just keep it
			delete self._removed[p.id];
			self._user[p.id] = true;
		} else {
			self._busy[p.id] = true;
			self._render();
			const ok = await self._enable(p);
			delete self._busy[p.id];
			if (ok) self._user[p.id] = true;
		}
	} else {
		delete self._user[p.id];
		self._removed[p.id] = true;
	}
	self._save();
	self._render();
};

// ---------------------------------------------------------------------------
// storage

Plugins.plugin_loader._loadSaved = function () {
	try {
		var list = JSON.parse(localStorage.getItem(Plugins.plugin_loader._lsKey) || '[]');
		return Array.isArray(list) ? list : [];
	} catch (e) {
		return [];
	}
};

Plugins.plugin_loader._save = function () {
	var self = Plugins.plugin_loader;
	// keep ids the admin does not allow right now, the user may get them back later
	var list = self._loadSaved().filter(function (id) {
		return !self._byId[id] || !self._isPermitted(self._byId[id]);
	});
	Object.keys(self._user).forEach(function (id) {
		if (list.indexOf(id) < 0) list.push(id);
	});
	try {
		localStorage.setItem(self._lsKey, JSON.stringify(list));
	} catch (e) {
		console.warn('[plugin_loader] cannot save the plugin selection.');
	}
};

// ---------------------------------------------------------------------------
// UI

Plugins.plugin_loader._style = [
	'#plugin-window-plugin_loader { width: 320px; height: 420px; max-width: calc(100vw - 20px); max-height: calc(100vh - 20px); }',
	'#plugin-window-plugin_loader .openwebrx-plugin-body { padding: 0; overflow-y: auto; min-height: 0; }',
	'.plugin-loader { display: flex; flex-direction: column; min-height: 100%; }',
	'.plugin-loader__list { flex: 1; padding: 2px 10px 8px; }',
	'.plugin-loader__group { margin: 10px 0 2px; padding-bottom: 3px; font-size: 8pt; font-weight: bold;',
	'  letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; border-bottom: 1px solid rgba(255, 255, 255, 0.15); }',
	'.plugin-loader__row { display: flex; align-items: center; gap: 10px; padding: 6px 4px; margin: 0 -4px;',
	'  border-radius: 4px; cursor: pointer; }',
	'.plugin-loader__row:hover { background: rgba(255, 255, 255, 0.06); }',
	'.plugin-loader__row--locked { cursor: default; }',
	'.plugin-loader__row--locked:hover { background: none; }',
	'.plugin-loader__info { flex: 1; min-width: 0; }',
	'.plugin-loader__title { display: flex; align-items: center; gap: 6px; }',
	'.plugin-loader__name { font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
	'.plugin-loader__badge { flex: none; padding: 0 5px; border-radius: 3px; font-size: 7.5pt; line-height: 14px;',
	'  text-transform: uppercase; background: rgba(255, 255, 255, 0.15); }',
	'.plugin-loader__badge--reload { background: #8a6d1f; }',
	'.plugin-loader__badge--error { background: #8f2f2f; }',
	'.plugin-loader__desc { margin-top: 1px; font-size: 8.5pt; line-height: 1.3; opacity: 0.7; overflow: hidden;',
	'  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }',
	'.plugin-loader__error { margin-top: 2px; font-size: 8.5pt; color: #ff9a9a; }',
	'.plugin-loader__empty { padding: 20px 0; text-align: center; opacity: 0.7; }',
	'.plugin-loader__switch { -webkit-appearance: none; appearance: none; position: relative; flex: none;',
	'  width: 30px; height: 16px; margin: 0; border-radius: 8px; background: rgba(255, 255, 255, 0.25);',
	'  cursor: pointer; transition: background 0.15s; }',
	'.plugin-loader__switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px;',
	'  border-radius: 50%; background: #fff; transition: transform 0.15s; }',
	'.plugin-loader__switch:checked { background: #3fa34d; }',
	'.plugin-loader__switch:checked::after { transform: translateX(14px); }',
	'.plugin-loader__switch:disabled { opacity: 0.45; cursor: default; }',
	'.plugin-loader__switch:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }',
	'.plugin-loader__footer { position: sticky; bottom: 0; display: flex; align-items: center; gap: 8px;',
	'  padding: 6px 10px; font-size: 8.5pt; background: #4a4a4a; border-top: 1px solid rgba(255, 255, 255, 0.15); }',
	'.plugin-loader__footer span { flex: 1; }'
].join('\n');

// puzzle piece, drawn with the button text color
Plugins.plugin_loader._icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"'
	+ ' style="display:block;margin:1px auto 0"><path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.7'
	+ ' 2.7 0 0 1 0 5.4H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 0 1 5.4 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/></svg>';

Plugins.plugin_loader._injectStyle = function () {
	if (document.getElementById('plugin-loader-style')) return;
	var style = document.createElement('style');
	style.id = 'plugin-loader-style';
	style.textContent = Plugins.plugin_loader._style;
	document.head.appendChild(style);
};

Plugins.plugin_loader._el = function (tag, cls, text) {
	var el = document.createElement(tag);
	if (cls) el.className = cls;
	if (text) el.textContent = text;
	return el;
};

Plugins.plugin_loader._row = function (p) {
	var self = Plugins.plugin_loader;
	var el = self._el;
	var loaded = self._isLoaded(p);
	// loaded by the admin, by another plugin, or as a dependency - cannot be turned off
	var locked = loaded && !self._user[p.id] && !self._removed[p.id];
	var badge = null;

	if (self._busy[p.id]) badge = ['loading', ''];
	else if (self._errors[p.id]) badge = ['error', 'error'];
	else if (self._removed[p.id]) badge = ['reload', 'reload'];
	else if (locked) badge = [self._admin[p.id] ? 'admin' : 'active', ''];
	else if (p.category === 'deprecated') badge = ['deprecated', ''];

	var row = el('label', 'plugin-loader__row' + (locked ? ' plugin-loader__row--locked' : ''));
	var info = el('div', 'plugin-loader__info');
	var title = el('div', 'plugin-loader__title');
	title.appendChild(el('span', 'plugin-loader__name', p.id));
	if (badge) {
		title.appendChild(el('span', 'plugin-loader__badge' + (badge[1] ? ' plugin-loader__badge--' + badge[1] : ''), badge[0]));
	}
	info.appendChild(title);

	// descriptions are Markdown in plugins.json - drop the formatting
	var text = (p.description || '').replace(/[`*]/g, '');
	var desc = el('div', 'plugin-loader__desc', text);
	desc.title = text;
	info.appendChild(desc);
	if (self._errors[p.id]) info.appendChild(el('div', 'plugin-loader__error', self._errors[p.id]));

	var sw = el('input', 'plugin-loader__switch');
	sw.type = 'checkbox';
	sw.setAttribute('role', 'switch');
	sw.checked = (loaded && !self._removed[p.id]) || !!self._busy[p.id];
	sw.disabled = locked || !!self._busy[p.id];
	if (locked) row.title = self._admin[p.id] ? 'Loaded by the administrator' : 'Already running';
	sw.addEventListener('change', function () { self._toggle(p, sw.checked); });

	row.appendChild(info);
	row.appendChild(sw);
	return row;
};

Plugins.plugin_loader._render = function () {
	var self = Plugins.plugin_loader;
	var el = self._el;
	if (!self._body) return;

	var root = el('div', 'plugin-loader');
	var list = el('div', 'plugin-loader__list');
	var groups = [
		{ title: 'Built-in', match: function (p) { return p.category === 'builtin'; } },
		{ title: 'Plugins', match: function (p) { return p.category === 'receiver' || p.category === 'deprecated'; } },
		{ title: 'Experimental', match: function (p) { return p.category === 'experimental'; } },
		{ title: 'Third-party', match: function (p) { return p.category === 'thirdparty'; } }
	];
	var empty = true;
	groups.forEach(function (g) {
		var items = self._manifest.filter(function (p) { return g.match(p) && self._isVisible(p); });
		if (!items.length) return;
		empty = false;
		list.appendChild(el('div', 'plugin-loader__group', g.title));
		items.forEach(function (p) { list.appendChild(self._row(p)); });
	});
	if (empty) list.appendChild(el('div', 'plugin-loader__empty', 'No plugins available.'));
	root.appendChild(list);

	if (Object.keys(self._removed).length) {
		var footer = el('div', 'plugin-loader__footer');
		footer.appendChild(el('span', '', 'Turned off plugins are removed after a reload.'));
		var reload = el('div', 'openwebrx-button', 'Reload');
		reload.addEventListener('click', function () { window.location.reload(); });
		footer.appendChild(reload);
		root.appendChild(footer);
	}

	// keep the scroll position when re-rendering
	var scroll = self._body.scrollTop;
	self._body.innerHTML = '';
	self._body.appendChild(root);
	self._body.scrollTop = scroll;
};
