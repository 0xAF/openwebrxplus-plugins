/*
 * uikit-settings.js — Settings modal, settings rendering, load/save/apply
 *
 * Uses createModal() for the settings modal and question() for the reset
 * confirm dialog — no duplicated modal/dialog construction.
 *
 * Depends on uikit-core.js (el, renderRadioGroup, createButton)
 * Depends on uikit-panel.js (setPanelPosition, setPanelVisible, setPanelMode, etc.)
 * Depends on uikit-modals.js (createModal, openModal, closeModal, question)
 */

// ── Settings Persistence ────────────────────────────────────────────────────

// Loads settings from localStorage, merging defaults → init.js overrides → stored.
Plugins.uikit._loadSettings = function () {
	var stored = null;
	if (typeof LS !== 'undefined' && typeof LS.loadStr === 'function') {
		var raw = LS.loadStr('uikit');
		if (raw) {
			try { stored = JSON.parse(raw); } catch (e) { stored = null; }
		}
	}

	// Migrate legacy 'opacity' key to 'opacityInactive'
	if (stored && stored.opacity !== undefined && stored.opacityInactive === undefined) {
		stored.opacityInactive = stored.opacity;
	}
	this._settings = Object.assign({}, this._defaults, this.settings || {}, stored || {});
};

Plugins.uikit._saveSettings = function () {
	if (typeof LS !== 'undefined' && typeof LS.save === 'function') {
		LS.save('uikit', JSON.stringify(this._settings));
	}
};

Plugins.uikit._applySettings = function () {
	this._normalizePosition();
	this._applyPosition();
	this._applyVisibility();
	this._applyPanelMode();
	this._initInactiveTimer();
	this._renderSettingsUI('ui');
};

// ── Settings Modal (built on top of createModal) ────────────────────────────

Plugins.uikit._buildSettingsModal = function () {
	var self = this;

	// Reuse the plugin modal API for the settings modal
	var handle = this.createModal('__uikit_settings__', {
		title: 'UI Kit Settings',
		closeButton: true,
		closeOnBackdrop: true,
		closeOnEsc: true,
		className: 'owrx-uikit__modal'
	});

	var entry = this._modals['__uikit_settings__'];

	// Insert a tabs bar between the header and body inside the modal.
	// createModal builds: header → body → footer; we need: header → tabs → body.
	var modalTabsBar = this.el('div', { cls: 'owrx-uikit__tabs-bar' });
	var modalTabsScroll = this.el('div', { cls: 'owrx-uikit__tabs-scroll', parent: modalTabsBar });
	entry.modalEl.insertBefore(modalTabsBar, entry.bodyEl);

	// Store references used by _addTabInternal and rendering methods
	this._ui.modalTabsScroll = modalTabsScroll;
	this._ui.modalBody = entry.bodyEl;

	// Add the built-in "UI" settings tab
	var slug = this._addTabInternal('settings', 'UI', { order: -100, activate: true });
	this._renderSettingsUI(slug);
	this._activateSettingsTab('ui');
};

Plugins.uikit.openSettings = function (tabName) {
	var entry = this._modals['__uikit_settings__'];
	if (!entry) return;

	// Activate the requested (or last-used) tab before opening
	if (tabName) {
		this._activateSettingsTab(this._slugify(tabName));
	} else if (this._state.lastSettingsTab) {
		this._activateSettingsTab(this._state.lastSettingsTab);
	} else {
		this._activateSettingsTab('ui');
	}

	// Ensure at least one tab is active
	var active = this._ui.modalTabsScroll.querySelector('.owrx-uikit__tab.is-active');
	if (!active) this._activateSettingsTab('ui');

	this.openModal('__uikit_settings__');
};

Plugins.uikit.closeSettings = function () {
	this.closeModal('__uikit_settings__');
};

// ── Reset Confirm (uses question() dialog) ──────────────────────────────────

// Uses the question() dialog instead of building a separate confirm modal.
Plugins.uikit._showConfirm = async function () {
	var yes = await this.question('This will restore the default UI Kit settings.', {
		title: 'Reset settings?',
		okLabel: 'Reset',
		cancelLabel: 'Cancel'
	});
	if (yes) {
		this._settings = Object.assign({}, this._defaults);
		this._saveSettings();
		this._applySettings();
		this._renderSettingsUI('ui');
	}
};

// ── Settings UI Rendering ───────────────────────────────────────────────────

Plugins.uikit._renderSettingsUI = function (slug) {
	var self = this;
	var tab = this._getSettingsTab(slug || 'ui');
	if (!tab) return;

	while (tab.firstChild) tab.removeChild(tab.firstChild);

	// Position options container (filled by _renderPositionOptions)
	var positionOptions = this.el('div', {
		cls: 'owrx-uikit__settings-options',
		data: { role: 'position-options' }
	});

	// Panel size slider (20 / 30 / 40 / 50 % of screen)
	var panelSizeLabel = this.el('div', {
		cls: 'owrx-uikit__settings-label',
		text: this._getPanelSizeLabel()
	});
	var panelSizeSlider = this.el('input', {
		type: 'range',
		attrs: { min: '20', max: '50', step: '5' },
		style: { width: '100%' },
		on: {
			input: function (e) {
				self._settings.panelSize = parseInt(e.target.value, 10);
				panelSizeLabel.textContent = self._getPanelSizeLabel();
				self._applyPanelSize();
			},
			change: function (e) {
				self._settings.panelSize = parseInt(e.target.value, 10);
				self._saveSettings();
				self._applyPanelSize();
				self._applyPanelMode();
			}
		}
	});
	panelSizeSlider.value = this._settings.panelSize || 30;

	// Visibility toggle
	var visibilityInput = this.el('input', {
		type: 'checkbox',
		data: { role: 'visibility-toggle' },
		on: { change: function (e) { self.setPanelVisible(e.target.checked); } }
	});
	visibilityInput.checked = !!this._settings.visible;

	// Mode options container (filled by _renderModeOptions)
	var modeOptions = this.el('div', {
		cls: 'owrx-uikit__settings-options',
		data: { role: 'mode-options' }
	});

	// Dual opacity slider (lower = inactive, upper = active)
	var opacityLabel = this.el('div', {
		cls: 'owrx-uikit__settings-label',
		text: 'Opacity — inactive: ' + Math.round((this._settings.opacityInactive || 0.5) * 100) + '% / active: ' + Math.round((this._settings.opacityActive || 0.92) * 100) + '%'
	});

	var prevLo = this._settings.opacityInactive || 0.5;
	var prevHi = this._settings.opacityActive || 0.92;

	var dualSlider = this.createDualSlider({
		min: 0.1, max: 1, step: 0.05,
		lower: prevLo,
		upper: prevHi,
		onInput: function (lo, hi) {
			self._state.pauseFade = true;
			var loMoved = lo !== prevLo;
			self._settings.opacityInactive = lo;
			self._settings.opacityActive = hi;
			opacityLabel.textContent = 'Opacity — inactive: ' + Math.round(lo * 100) + '% / active: ' + Math.round(hi * 100) + '%';
			if (self._settings.mode === 'overlay') self._setPanelAlpha(loMoved ? lo : hi, !loMoved);
			prevLo = lo; prevHi = hi;
		},
		onChange: function (lo, hi) {
			self._state.pauseFade = false;
			self._settings.opacityInactive = lo;
			self._settings.opacityActive = hi;
			self._saveSettings();
			if (self._settings.mode === 'overlay') {
				self._initInactiveTimer();
			}
		}
	});
	// Inactive timeout label + slider
	// Slider index → seconds: 0 = OFF, 1 = 2s, 2 = 3s, … 9 = 10s
	function delayToIndex(s) { return s ? Math.max(1, Math.min(9, s - 1)) : 0; }
	function indexToDelay(i) { return i ? i + 1 : 0; }
	function delayLabel(s) { return 'Inactive timeout: ' + (s ? s + 's' : 'OFF'); }

	var autoHideDelayLabel = this.el('div', {
		cls: 'owrx-uikit__settings-label',
		text: delayLabel(this._settings.autoHideDelay || 0)
	});
	var autoHideDelaySlider = this.el('input', {
		type: 'range',
		attrs: { min: '0', max: '9', step: '1' },
		style: { width: '100%' },
		on: {
			input: function (e) {
				var seconds = indexToDelay(parseInt(e.target.value, 10));
				self._settings.autoHideDelay = seconds;
				autoHideDelayLabel.textContent = delayLabel(seconds);
			},
			change: function (e) {
				self._settings.autoHideDelay = indexToDelay(parseInt(e.target.value, 10));
				self._saveSettings();
				self._initInactiveTimer();
			}
		}
	});
	autoHideDelaySlider.value = delayToIndex(this._settings.autoHideDelay || 0);

	// Hide-if-inactive checkbox
	var autoHideInput = this.el('input', {
		type: 'checkbox',
		on: { change: function (e) {
			self._settings.autoHide = e.target.checked;
			self._saveSettings();
			self._initInactiveTimer();
		}}
	});
	autoHideInput.checked = !!this._settings.autoHide;

	// Build the settings section
	this.el('div', {
		cls: 'owrx-uikit__settings-section',
		children: [
			this.el('div', { cls: 'owrx-uikit__settings-title', text: 'Panel' }),
			// Position (left) + Mode/Opacity/Visibility (right)
			this.el('div', {
				cls: 'owrx-uikit__settings-row',
				children: [
					// Left: position + size
					this.el('div', {
						cls: 'owrx-uikit__settings-group',
						children: [
							this.el('div', { cls: 'owrx-uikit__settings-label', text: 'Position' }),
							positionOptions,
							panelSizeLabel,
							panelSizeSlider
						]
					}),
					// Right: mode + opacity + visibility
					this.el('div', {
						cls: 'owrx-uikit__settings-group',
						children: [
							this.el('div', { cls: 'owrx-uikit__settings-label', text: 'Panel mode' }),
							modeOptions,
							opacityLabel,
							dualSlider.el,
							autoHideDelayLabel,
							autoHideDelaySlider,
							this.el('label', {
								cls: 'owrx-uikit__settings-label owrx-uikit__settings-label--inline',
								children: [
									autoHideInput,
									this.el('span', { text: 'Hide if inactive' })
								]
							}),
							this.el('label', {
								cls: 'owrx-uikit__settings-label owrx-uikit__settings-label--inline',
								children: [
									visibilityInput,
									this.el('span', { text: 'Show panel' })
								]
							})
						]
					})
				]
			}),
			// Reset group
			this.el('div', {
				cls: 'owrx-uikit__settings-group',
				children: [
					this.createButton('Reset to defaults', {
						style: 'danger',
						onClick: function () { self._showConfirm(); }
					})
				]
			})
		],
		parent: tab
	});

	// Store references for live updates from external calls
	this._ui.positionOptions = positionOptions;
	this._ui.modeOptions = modeOptions;
	this._ui.visibilityToggle = visibilityInput;
	this._ui.dualSlider = dualSlider;
	this._ui.opacityLabel = opacityLabel;
	this._ui.autoHideInput = autoHideInput;
	this._ui.autoHideDelaySlider = autoHideDelaySlider;
	this._ui.autoHideDelayLabel = autoHideDelayLabel;
	this._ui.panelSizeLabel = panelSizeLabel;
	this._ui.panelSizeSlider = panelSizeSlider;

	this._renderPositionOptions();
	this._renderModeOptions();
	this._renderVisibilityToggle();
	this._renderOpacitySlider();
	this._renderPanelSizeSlider();
};

// Renders position arrow buttons (icon-only, no text, hidden radio input).
Plugins.uikit._renderPositionOptions = function () {
	var optionsWrap = this._ui.positionOptions || this._ui.modalBody.querySelector('[data-role="position-options"]');
	if (!optionsWrap) return;

	optionsWrap.classList.add('owrx-uikit__position-grid');
	optionsWrap.innerHTML = '';
	var allowed = this._getAllowedPositions();
	var self = this;
	var arrowDir = { top: 'up', right: 'right', bottom: 'down', left: 'left' };

	for (var i = 0; i < allowed.length; i++) {
		var opt = allowed[i];
		var value = typeof opt === 'string' ? opt : opt.value;
		var input = self.el('input', {
			type: 'radio',
			attrs: { name: 'uikit-position', value: value },
			on: { change: (function (v) {
				return function (e) { if (e.target.checked) self.setPanelPosition(v); };
			})(value) }
		});
		var label = self.el('label', {
			cls: 'owrx-uikit__radio',
			data: { pos: value },
			parent: optionsWrap,
			children: [ input, self.iconArrow(arrowDir[value]) ]
		});
		input.checked = (value === self._settings.position);
	}
};

Plugins.uikit._renderVisibilityToggle = function () {
	var checkbox = this._ui.visibilityToggle || this._ui.modalBody.querySelector('[data-role="visibility-toggle"]');
	if (checkbox) checkbox.checked = !!this._settings.visible;
};

Plugins.uikit._renderOpacitySlider = function () {
	var ds = this._ui.dualSlider;
	var label = this._ui.opacityLabel;
	if (!ds) return;
	var isOverlay = this._settings.mode === 'overlay';
	var lo = this._settings.opacityInactive || 0.5;
	var hi = this._settings.opacityActive || 0.92;
	ds.setValues(lo, hi);
	if (label) label.textContent = 'Opacity — inactive: ' + Math.round(lo * 100) + '% / active: ' + Math.round(hi * 100) + '%';
	if (this._ui.autoHideInput) {
		this._ui.autoHideInput.checked = !!this._settings.autoHide;
		this._ui.autoHideInput.disabled = false;
	}
	if (this._ui.autoHideDelaySlider) {
		var d = this._settings.autoHideDelay || 0;
		this._ui.autoHideDelaySlider.value = d ? Math.max(1, Math.min(9, d - 1)) : 0;
	}
	if (this._ui.autoHideDelayLabel) {
		var ds2 = this._settings.autoHideDelay || 0;
		this._ui.autoHideDelayLabel.textContent = 'Inactive timeout: ' + (ds2 ? ds2 + 's' : 'OFF');
	}
};

Plugins.uikit._getPanelSizeLabel = function () {
	var pct = this._settings.panelSize || 30;
	var pos = this._settings.position || 'bottom';
	var axis = (pos === 'bottom' || pos === 'top') ? 'Height' : 'Width';
	return axis + ': ' + pct + '% of screen';
};

Plugins.uikit._renderPanelSizeSlider = function () {
	if (this._ui.panelSizeLabel) this._ui.panelSizeLabel.textContent = this._getPanelSizeLabel();
	if (this._ui.panelSizeSlider) this._ui.panelSizeSlider.value = this._settings.panelSize || 30;
};

// Renders mode radio buttons (overlay / push).
Plugins.uikit._renderModeOptions = function () {
	var optionsWrap = this._ui.modeOptions || this._ui.modalBody.querySelector('[data-role="mode-options"]');
	if (!optionsWrap) return;

	var self = this;
	this.renderRadioGroup(optionsWrap, 'uikit-mode', [
		{ value: 'overlay', label: 'Overlay' },
		{ value: 'push', label: 'Push' }
	], this._settings.mode, function (val) {
		self.setPanelMode(val);
	});
};
