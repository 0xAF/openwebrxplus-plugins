/*
 * Plugin: ui_status - Status bar footer in the uikit panel
 *
 * Mirrors the OWRX+ status progress bars (#openwebrx-panel-status) into a
 * footer strip pinned at the bottom of the uikit panel, visible regardless of
 * which tab is active. The original panel is hidden but kept in the DOM so all
 * OWRX+ update paths (audioReporter, WebSocket handlers) continue to write to
 * the original elements. A MutationObserver on each original bar keeps our
 * mirrors in sync.
 *
 * Responsive layout: flex-wrap with min/max-width drives automatic 1×6 / 2×3
 * / 3×2 wrapping based on available panel width.
 *
 * License: MIT
 * Copyright (c) 2026 Stanislav Lechev [0xAF], LZ2SLL
 */

Plugins.ui_status = Plugins.ui_status || {};
Plugins.ui_status._version = 0.1;

Plugins.ui_status._baseUrl = (document.currentScript && document.currentScript.src || '').replace(/ui_status\/ui_status\.js(\?.*)?$/, '');

Plugins.ui_status._observers = [];
Plugins.ui_status._footerEl = null;
Plugins.ui_status._originalPanelEnabled = false;
Plugins.ui_status._lsKey = 'ui_status';

// Original bar IDs in display order (battery is hidden by default)
Plugins.ui_status._BARS = [
	'openwebrx-bar-audio-buffer',
	'openwebrx-bar-audio-output',
	'openwebrx-bar-audio-speed',
	'openwebrx-bar-network-speed',
	'openwebrx-bar-server-cpu',
	'openwebrx-bar-clients',
	'openwebrx-bar-battery'
];

Plugins.ui_status._syncBar = function (origEl, mirrorEl) {
	// Mirror visibility (battery bar starts hidden)
	mirrorEl.style.display = origEl.style.display;

	// Mirror fill transform
	var fillOrig = origEl.querySelector('.openwebrx-progressbar-bar');
	var fillMirror = mirrorEl.querySelector('.owrx-uikit-status__bar-fill');
	if (fillOrig && fillMirror) fillMirror.style.transform = fillOrig.style.transform;

	// Mirror label text
	var textOrig = origEl.querySelector('.openwebrx-progressbar-text');
	var textMirror = mirrorEl.querySelector('.owrx-uikit-status__bar-text');
	if (textOrig && textMirror) textMirror.textContent = textOrig.textContent;

	// Mirror over-threshold class
	mirrorEl.classList.toggle('owrx-uikit-status__bar--over',
		origEl.classList.contains('openwebrx-progressbar--over'));
};

Plugins.ui_status.init = async function () {
	var baseUrl = this._baseUrl;
	var self = this;

	if (!Plugins.isLoaded('utils', 0.7)) {
		await Plugins.load(baseUrl + 'utils/utils.js');
	}
	if (!Plugins.isLoaded('utils', 0.7)) {
		console.error('[ui_status] requires utils >= 0.7');
		return false;
	}

	if (!Plugins.isLoaded('uikit', 0.5)) {
		await Plugins.load(baseUrl + 'uikit/uikit.js');
	}
	if (!Plugins.isLoaded('uikit', 0.5)) {
		console.error('[ui_status] requires uikit >= 0.5');
		return false;
	}

	if (Plugins.uikit._initPromise instanceof Promise) {
		await Plugins.uikit._initPromise;
	}

	var ui = Plugins.uikit;

	// ── Build mirror bars ───────────────────────────────────────────────────

	var mirrorBars = [];

	this._BARS.forEach(function (barId) {
		var origEl = document.getElementById(barId);
		if (!origEl) return;

		var fillEl = ui.el('div', { cls: 'owrx-uikit-status__bar-fill' });
		var textEl = ui.el('div', { cls: 'owrx-uikit-status__bar-text' });
		var mirrorEl = ui.el('div', {
			cls: 'owrx-uikit-status__bar',
			children: [fillEl, textEl]
		});

		// Initial sync
		self._syncBar(origEl, mirrorEl);

		// Live sync via MutationObserver
		var obs = new MutationObserver(function () {
			self._syncBar(origEl, mirrorEl);
		});
		obs.observe(origEl, {
			subtree: true,
			childList: true,
			attributes: true,
			characterData: true
		});
		self._observers.push(obs);

		mirrorBars.push(mirrorEl);
	});

	// ── Build footer ────────────────────────────────────────────────────────

	var footer = ui.el('div', {
		cls: 'owrx-uikit__footer owrx-uikit-status',
		children: mirrorBars
	});
	this._footerEl = footer;
	ui.setFooter(footer);

	// ── Load persisted settings ─────────────────────────────────────────────

	if (typeof LS !== 'undefined' && typeof LS.loadStr === 'function') {
		var saved = LS.loadStr(this._lsKey);
		if (saved) {
			try { var parsed = JSON.parse(saved); self._originalPanelEnabled = !!parsed.originalPanelEnabled; } catch (e) {}
		}
	}

	// ── Hide original panel ─────────────────────────────────────────────────

	var statusPanel = document.getElementById('openwebrx-panel-status');
	if (statusPanel && !self._originalPanelEnabled) statusPanel.style.display = 'none';

	// ── Block toggle_panel from re-showing the original ─────────────────────

	Plugins.utils.wrap_func(
		'toggle_panel',
		function (orig, thisArg, args) {
			if (args[0] === 'openwebrx-panel-status' && !self._originalPanelEnabled) return false;
			return true;
		},
		null
	);

	// ── Settings checkbox in the UI settings tab ────────────────────────────

	var uiTabEl = ui.getSettingsTabEl('ui');
	if (uiTabEl) {
		var checkbox = ui.el('input', { type: 'checkbox' });
		checkbox.checked = self._originalPanelEnabled;
		checkbox.addEventListener('change', function () {
			self._originalPanelEnabled = checkbox.checked;
			if (typeof LS !== 'undefined' && typeof LS.save === 'function') {
				LS.save(self._lsKey, JSON.stringify({ originalPanelEnabled: self._originalPanelEnabled }));
			}
			var panel = document.getElementById('openwebrx-panel-status');
			if (panel) panel.style.display = self._originalPanelEnabled ? '' : 'none';
		});

		uiTabEl.appendChild(ui.el('div', {
			cls: 'owrx-uikit__settings-section',
			style: { marginTop: '20px' },
			children: [
				ui.el('div', { cls: 'owrx-uikit__settings-title', text: 'Status' }),
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

	return true;
};
