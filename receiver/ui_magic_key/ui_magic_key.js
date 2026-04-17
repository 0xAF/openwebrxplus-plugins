/*
 * Plugin: ui_magic_key - Set the MagicKey via a UIKit settings tab
 *
 * Adds a "Magic Key" tab in the UIKit settings modal where the key can be
 * typed, saved persistently to localStorage, and cleared. The saved key is
 * automatically restored on page load and applied to the demodulator.
 *
 * License: MIT
 * Copyright (c) 2024 Stanislav Lechev [0xAF], LZ2SLL
 */

Plugins.ui_magic_key = Plugins.ui_magic_key || {};
Plugins.ui_magic_key._version = 0.1;
Plugins.ui_magic_key.no_css = true;

Plugins.ui_magic_key._baseUrl = (document.currentScript && document.currentScript.src || '').replace(/ui_magic_key\/ui_magic_key\.js(\?.*)?$/, '');

Plugins.ui_magic_key._lsKey = 'ui_magic_key';

Plugins.ui_magic_key._loadKey = function () {
	if (typeof LS !== 'undefined' && typeof LS.loadStr === 'function') {
		var val = LS.loadStr(this._lsKey);
		return (val && val.length) ? val : undefined;
	}
	return undefined;
};

Plugins.ui_magic_key._saveKey = function (key) {
	if (typeof LS !== 'undefined' && typeof LS.save === 'function') {
		if (key) {
			LS.save(this._lsKey, key);
		} else {
			LS.delete(this._lsKey);
		}
	}
};

Plugins.ui_magic_key._applyKey = function (key) {
	this._currentKey = key || undefined;
	if (key) {
		var panel = $('#openwebrx-panel-receiver').demodulatorPanel();
		if (panel && typeof panel.setMagicKey === 'function') {
			panel.setMagicKey(key);
		}
	}
};

Plugins.ui_magic_key.init = async function () {
	var baseUrl = this._baseUrl;

	if (!Plugins.isLoaded('utils', 0.3)) {
		await Plugins.load(baseUrl + 'utils/utils.js');
	}
	if (!Plugins.isLoaded('utils', 0.3)) {
		console.error('[ui_magic_key] requires utils >= 0.3');
		return false;
	}

	if (!Plugins.isLoaded('uikit', 0.3)) {
		await Plugins.load(baseUrl + 'uikit/uikit.js');
	}
	if (!Plugins.isLoaded('uikit', 0.3)) {
		console.error('[ui_magic_key] requires uikit >= 0.3');
		return false;
	}

	if (Plugins.uikit._initPromise instanceof Promise) {
		await Plugins.uikit._initPromise;
	}

	var self = this;

	// Restore and apply saved key immediately
	var savedKey = this._loadKey();
	this._applyKey(savedKey);

	// Wrap getMagicKey so this plugin's key takes priority over the URL param
	Plugins.utils.wrap_func(
		'getMagicKey',
		function (orig, thisArg, args) { return true; },
		function (res) { return self._currentKey !== undefined ? self._currentKey : res; },
		$('#openwebrx-panel-receiver').demodulatorPanel()
	);

	// Build the settings tab
	var slug = Plugins.uikit.addSettingsTab('Magic Key', { order: 100 });
	var tabEl = Plugins.uikit.getSettingsTabEl(slug);
	if (!tabEl) return true;

	var ui = Plugins.uikit;

	// Current key display
	var statusLabel = ui.el('div', {
		cls: 'owrx-uikit__settings-label',
		text: savedKey ? 'Current key is set.' : 'No key set.'
	});

	// Input row
	var input = ui.el('input', {
		type: 'password',
		attrs: { placeholder: 'Enter magic key…', autocomplete: 'off' },
		style: { flex: '1', minWidth: '0', marginRight: '6px' }
	});

	var setBtn = ui.createButton('Set', {
		style: 'primary',
		onClick: function () {
			var val = input.value.trim();
			if (!val) return;
			self._saveKey(val);
			self._applyKey(val);
			input.value = '';
			statusLabel.textContent = 'Current key is set.';
			ui.toast('Magic key set.', { type: 'info', timeout: 2000 });
		}
	});

	var clearBtn = ui.createButton('Clear', {
		style: 'danger',
		onClick: function () {
			self._saveKey(null);
			self._applyKey(null);
			input.value = '';
			statusLabel.textContent = 'No key set.';
			ui.toast('Magic key cleared.', { type: 'warning', timeout: 2000 });
		}
	});

	clearBtn.style.marginLeft = '4px';

	var inputRow = ui.el('form', {
		attrs: { autocomplete: 'off' },
		style: { display: 'flex', alignItems: 'center' },
		children: [input, setBtn, clearBtn],
		on: { submit: function (e) { e.preventDefault(); setBtn.click(); } }
	});

	var section = ui.el('div', {
		cls: 'owrx-uikit__settings-section',
		children: [
			ui.el('div', { cls: 'owrx-uikit__settings-title', text: 'Magic Key' }),
			ui.el('div', {
				cls: 'owrx-uikit__settings-group',
				children: [
					ui.el('div', {
						cls: 'owrx-uikit__settings-label',
						text: 'Set the magic key for authenticated access without exposing it in the URL.'
					}),
					statusLabel,
					inputRow
				]
			})
		]
	});

	tabEl.appendChild(section);

	return true;
};
