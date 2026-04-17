/*
 * Plugin: ui_chat - Chat/Log tab in the uikit panel
 *
 * Absorbs the OWRX+ chat/log panel (#openwebrx-panel-log) into the uikit
 * dockable panel as a "Chat" tab. All messages flowing through divlog() are
 * mirrored here. The original panel is hidden but kept in the DOM.
 *
 * If allow_chat is enabled server-side, a nickname + message input row is
 * shown at the bottom of the tab. Sending uses Chat.sendMessage() directly.
 *
 * License: MIT
 * Copyright (c) 2026 Stanislav Lechev [0xAF], LZ2SLL
 */

Plugins.ui_chat = Plugins.ui_chat || {};
Plugins.ui_chat._version = 0.1;

Plugins.ui_chat._baseUrl = (document.currentScript && document.currentScript.src || '').replace(/ui_chat\/ui_chat\.js(\?.*)?$/, '');

Plugins.ui_chat._messagesEl = null;
Plugins.ui_chat._inputRowEl = null;
Plugins.ui_chat._nameInputEl = null;
Plugins.ui_chat._tabEl = null;
Plugins.ui_chat._badgeEl = null;
Plugins.ui_chat._separatorEl = null;
Plugins.ui_chat._separatorTimer = null;
Plugins.ui_chat._scrollHintEl = null;
Plugins.ui_chat._unreadCount = 0;
Plugins.ui_chat._panelHovered = false;
Plugins.ui_chat._originalPanelEnabled = false;
Plugins.ui_chat._lsKey = 'ui_chat';

Plugins.ui_chat._isTabVisible = function () {
	var root = document.getElementById('owrx-uikit-root');
	return !!(this._panelHovered &&
		this._tabEl &&
		this._tabEl.classList.contains('is-active') &&
		root && !root.classList.contains('owrx-uikit--hidden'));
};

Plugins.ui_chat._markRead = function () {
	if (!this._separatorEl && !this._unreadCount) return;
	var self = this;

	// Hide badge immediately
	this._unreadCount = 0;
	if (this._badgeEl) this._badgeEl.style.display = 'none';

	// Scroll to separator so the user sees where new messages start
	if (this._separatorEl) {
		this._separatorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Start squeeze-up animation immediately
	clearTimeout(this._separatorTimer);
	this._separatorTimer = setTimeout(function () {
		self._separatorTimer = null;
		var sep = self._separatorEl;
		if (!sep) return;
		self._separatorEl = null;

		// Lock current height so CSS can animate from it to 0
		sep.style.overflow = 'hidden';
		sep.style.height = sep.offsetHeight + 'px';
		void sep.offsetHeight; // force reflow before transition starts
		sep.style.transition = 'height 0.6s ease, margin 0.6s ease, padding 0.6s ease, opacity 0.35s ease';
		sep.style.height = '0';
		sep.style.marginTop = '0';
		sep.style.marginBottom = '0';
		sep.style.opacity = '0';

		sep.addEventListener('transitionend', function handler(e) {
			if (e.propertyName !== 'height') return;
			sep.removeEventListener('transitionend', handler);
			if (sep.parentNode) sep.parentNode.removeChild(sep);
			// Stay at current position so user can read from the first new message
		});
	}, 0);
};

Plugins.ui_chat._appendMessage = function (html, is_error) {
	if (!this._messagesEl) return;

	if (!this._isTabVisible()) {
		// Insert separator before the first unread message
		if (this._unreadCount === 0) {
			var sep = document.createElement('div');
			sep.className = 'owrx-uikit-chat__separator';
			sep.textContent = 'new messages';
			this._messagesEl.appendChild(sep);
			this._separatorEl = sep;
		}
		this._unreadCount++;
		if (this._badgeEl) {
			this._badgeEl.textContent = this._unreadCount > 99 ? '99+' : String(this._unreadCount);
			this._badgeEl.style.display = '';
		}
	}

	var msg = document.createElement('div');
	msg.className = 'owrx-uikit-chat__msg' + (is_error ? ' owrx-uikit-chat__msg--error' : '');
	msg.innerHTML = html;
	this._messagesEl.appendChild(msg);
	if (this._isTabVisible()) {
		this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
	} else if (this._separatorEl) {
		// Keep separator visible so user sees where new messages start when they open the tab
		this._separatorEl.scrollIntoView({ block: 'start' });
	}
	this._updateScrollHint();
};

Plugins.ui_chat._updateScrollHint = function () {
	if (!this._scrollHintEl || !this._messagesEl) return;
	var el = this._messagesEl;
	var hasBelow = el.scrollTop + el.clientHeight < el.scrollHeight - 24;
	this._scrollHintEl.style.display = hasBelow ? 'flex' : 'none';
};

Plugins.ui_chat._syncInputRow = function () {
	var orig = document.getElementById('openwebrx-chat-inputs');
	if (!orig || !this._inputRowEl) return;
	var hidden = window.getComputedStyle(orig).display === 'none';
	this._inputRowEl.style.display = hidden ? 'none' : 'flex';
};

Plugins.ui_chat.init = async function () {
	var baseUrl = this._baseUrl;

	if (!Plugins.isLoaded('utils', 0.7)) {
		await Plugins.load(baseUrl + 'utils/utils.js');
	}
	if (!Plugins.isLoaded('utils', 0.7)) {
		console.error('[ui_chat] requires utils >= 0.7');
		return false;
	}

	if (!Plugins.isLoaded('uikit', 0.4)) {
		await Plugins.load(baseUrl + 'uikit/uikit.js');
	}
	if (!Plugins.isLoaded('uikit', 0.4)) {
		console.error('[ui_chat] requires uikit >= 0.4');
		return false;
	}

	if (Plugins.uikit._initPromise instanceof Promise) {
		await Plugins.uikit._initPromise;
	}

	var self = this;
	var ui = Plugins.uikit;

	// ── Build tab ───────────────────────────────────────────────────────────

	var slug = ui.addTab('Chat', { order: 200 });
	var tabEl = ui.getTabEl(slug);
	if (!tabEl) return true;
	this._tabEl = tabEl;

	// ── Badge: insert before the tab label in the tab button ───────────────

	var tabBtn = document.querySelector('.owrx-uikit__tabs-scroll [data-tab="' + slug + '"]');
	if (tabBtn) {
		var badge = document.createElement('span');
		badge.className = 'owrx-uikit-chat__badge';
		badge.style.display = 'none';
		tabBtn.insertBefore(badge, tabBtn.firstChild);
		this._badgeEl = badge;
	}

	// ── Reset unread when tab becomes visible ───────────────────────────────

	// MutationObserver: re-check read state when tab activation or panel visibility changes
	var readObserver = new MutationObserver(function () {
		if (self._isTabVisible()) self._markRead();
	});
	readObserver.observe(tabEl, { attributes: true, attributeFilter: ['class'] });
	var uikitRoot = document.getElementById('owrx-uikit-root');
	if (uikitRoot) readObserver.observe(uikitRoot, { attributes: true, attributeFilter: ['class'] });

	// Panel hover: messages are only "read" while the mouse is over the panel
	var uikitPanel = document.querySelector('#owrx-uikit-root .owrx-uikit__panel');
	if (uikitPanel) {
		uikitPanel.addEventListener('mouseenter', function () {
			self._panelHovered = true;
			if (self._isTabVisible()) self._markRead();
		});
		uikitPanel.addEventListener('mouseleave', function () {
			self._panelHovered = false;
		});
	}

	var messagesEl = ui.el('div', { cls: 'owrx-uikit-chat__messages' });
	this._messagesEl = messagesEl;

	var scrollHint = ui.el('div', { cls: 'owrx-uikit-chat__scroll-hint', style: { display: 'none' } });
	scrollHint.appendChild(ui.buildSvg('0 0 14 14', ['<polyline points="2,3 7,10 12,3"/>'], 14));
	scrollHint.addEventListener('click', function () {
		messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
	});
	this._scrollHintEl = scrollHint;

	messagesEl.addEventListener('scroll', function () { self._updateScrollHint(); });

	var messagesWrap = ui.el('div', {
		cls: 'owrx-uikit-chat__messages-wrap',
		children: [messagesEl, scrollHint]
	});

	// Nickname input — pre-populate from the original input (Chat.loadSettings()
	// already restored it from localStorage into #openwebrx-chat-name)
	var origNameInput = document.getElementById('openwebrx-chat-name');
	var savedNick = (origNameInput && origNameInput.value) ||
	                (typeof Chat !== 'undefined' && Chat.nickname) || '';

	var nameInput = ui.el('input', {
		attrs: { placeholder: 'Name', autocomplete: 'off', value: savedNick },
		cls: 'owrx-uikit-chat__name-input'
	});
	this._nameInputEl = nameInput;

	// Message input (form wraps both to avoid browser password warnings)
	var msgInput = ui.el('input', {
		attrs: { placeholder: 'Message…', autocomplete: 'off' },
		cls: 'owrx-uikit-chat__msg-input'
	});

	var sendBtn = ui.createButton('Send', {
		style: 'primary',
		onClick: function () {
			var text = msgInput.value.trim();
			if (!text) return;
			var nick = nameInput.value.trim();
			if (typeof Chat !== 'undefined' && typeof Chat.sendMessage === 'function') {
				Chat.sendMessage(text, nick);
			}
			msgInput.value = '';
			msgInput.focus();
		}
	});

	var inputForm = ui.el('form', {
		cls: 'owrx-uikit-chat__input-row',
		attrs: { autocomplete: 'off' },
		style: { display: 'none' },
		children: [nameInput, msgInput, sendBtn],
		on: { submit: function (e) { e.preventDefault(); sendBtn.click(); } }
	});
	this._inputRowEl = inputForm;

	// Enter key in message input submits
	msgInput.addEventListener('keydown', function (e) {
		e.stopPropagation();
		if (e.key === 'Enter') { e.preventDefault(); sendBtn.click(); }
	});
	nameInput.addEventListener('keydown', function (e) { e.stopPropagation(); });
	nameInput.addEventListener('change', function () {
		var nick = nameInput.value.trim();
		if (origNameInput) origNameInput.value = nick;
		if (typeof Chat !== 'undefined' && typeof Chat.setNickname === 'function') {
			Chat.setNickname(nick);
		}
	});

	ui.el('div', {
		cls: 'owrx-uikit-chat',
		children: [messagesWrap, inputForm],
		parent: tabEl
	});

	// ── Copy existing content (header + messages) ──────────────────────────
	// The original .nano-content contains: title div, author div, <hr>, then
	// #openwebrx-messages. We clone header nodes as-is and wrap message nodes
	// individually so they get the correct CSS class.

	var nanoContent = document.querySelector('#openwebrx-log-scroll .nano-content');
	if (nanoContent) {
		var origMessages = document.getElementById('openwebrx-messages');
		var nodes = nanoContent.childNodes;
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) continue;
			if (node === origMessages) {
				// Copy each existing message as its own div
				var msgNodes = node.childNodes;
				for (var j = 0; j < msgNodes.length; j++) {
					var mn = msgNodes[j];
					if (mn.nodeType === Node.TEXT_NODE && !mn.textContent.trim()) continue;
					var msgDiv = document.createElement('div');
					msgDiv.className = 'owrx-uikit-chat__msg';
					msgDiv.appendChild(mn.cloneNode(true));
					messagesEl.appendChild(msgDiv);
				}
			} else {
				// Header content (title, author line, hr) — clone as-is
				messagesEl.appendChild(node.cloneNode(true));
			}
		}
		messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	// ── Load persisted settings ─────────────────────────────────────────────

	if (typeof LS !== 'undefined' && typeof LS.loadStr === 'function') {
		var saved = LS.loadStr(this._lsKey);
		if (saved) {
			try { var parsed = JSON.parse(saved); self._originalPanelEnabled = !!parsed.originalPanelEnabled; } catch (e) {}
		}
	}

	// ── Hide original panel (unless user opted to keep it) ──────────────────

	var logPanel = document.getElementById('openwebrx-panel-log');
	if (logPanel && !self._originalPanelEnabled) logPanel.style.display = 'none';

	// ── Wrap divlog ─────────────────────────────────────────────────────────

	Plugins.utils.wrap_func(
		'divlog',
		function (orig, thisArg, args) { return true; },
		function (res, thisArg, args) { self._appendMessage(args[0], !!args[1]); }
	);

	// ── Wrap toggle_panel — block showing the original log panel ────────────

	Plugins.utils.wrap_func(
		'toggle_panel',
		function (orig, thisArg, args) {
			if (args[0] === 'openwebrx-panel-log' && !self._originalPanelEnabled) return false;
			return true;
		},
		null
	);

	// ── Debug checkbox in the UI settings tab ──────────────────────────────

	var uiTabEl = ui.getSettingsTabEl('ui');
	if (uiTabEl) {
		var checkbox = ui.el('input', { type: 'checkbox' });
		checkbox.checked = self._originalPanelEnabled;
		checkbox.addEventListener('change', function () {
			self._originalPanelEnabled = checkbox.checked;
			if (typeof LS !== 'undefined' && typeof LS.save === 'function') {
				LS.save(self._lsKey, JSON.stringify({ originalPanelEnabled: self._originalPanelEnabled }));
			}
			var panel = document.getElementById('openwebrx-panel-log');
			if (panel) panel.style.display = self._originalPanelEnabled ? '' : 'none';
		});

		uiTabEl.appendChild(ui.el('div', {
			cls: 'owrx-uikit__settings-section',
			style: { marginTop: '20px' },
			children: [
				ui.el('div', { cls: 'owrx-uikit__settings-title', text: 'Chat' }),
				ui.el('div', {
					cls: 'owrx-uikit__settings-group',
					children: [
						ui.el('label', {
							cls: 'owrx-uikit__settings-label owrx-uikit__settings-label--inline',
							children: [checkbox, document.createTextNode('Enable original panel')]
						})
					]
				})
			]
		}));
	}

	// ── Sync allow_chat input row via MutationObserver ──────────────────────

	var origInputs = document.getElementById('openwebrx-chat-inputs');
	if (origInputs) {
		self._syncInputRow();
		var observer = new MutationObserver(function () { self._syncInputRow(); });
		observer.observe(origInputs, { attributes: true, attributeFilter: ['style'] });
	}

	// ── Sync nickname after config WS message is processed ──────────────────
	// utils fires server:config:after once OWRX+ has applied the config,
	// which is when Chat.loadSettings() has populated #openwebrx-chat-name.

	$(document).on('server:config:after', function () {
		if (self._nameInputEl && !self._nameInputEl.value) {
			var origName = document.getElementById('openwebrx-chat-name');
			if (origName && origName.value) self._nameInputEl.value = origName.value;
		}
	});

	return true;
};
