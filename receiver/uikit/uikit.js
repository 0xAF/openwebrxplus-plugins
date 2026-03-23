/*
 * Plugin: uikit - UI helper toolkit for OpenWebRX+ plugins
 *
 * Provides a dockable panel (top/right/bottom/left), settings modal with tabs,
 * and helper methods for other plugins to build UI.
 *
 * License: MIT
 */

// Namespace
Plugins.uikit = Plugins.uikit || {};

Plugins.uikit._version = 0.2;

// Default settings (can be overridden in init.js before load)
Plugins.uikit.settings = Plugins.uikit.settings || {};

Plugins.uikit._defaults = {
	position: 'bottom',
	visible: true,
	mode: 'overlay'
};

Plugins.uikit._state = {
	lastTab: null,
	lastSettingsTab: 'ui'
};

Plugins.uikit._tabs = {
	panel: [],
	settings: []
};

Plugins.uikit._modals = {};

Plugins.uikit._toasts = {};
Plugins.uikit._toastContainers = {};
Plugins.uikit._toastSeq = 0;

Plugins.uikit.init = function () {
	if (document.getElementById('owrx-uikit-root')) {
		return true;
	}

	this._loadSettings();
	this._cacheBodyPadding();
	this._cachePagePadding();
	this._buildRoot();
	this._buildPanel();
	this._buildSettingsModal();
	this._applySettings();
	this._bindResize();
	this._scheduleLayoutSync();

	return true;
};

Plugins.uikit.svgFromString = function (svgString) {
	if (!svgString || typeof svgString !== 'string') return null;
	try {
		var parser = new DOMParser();
		var doc = parser.parseFromString(svgString, 'image/svg+xml');
		var svg = doc.querySelector('svg');
		if (!svg) {
			var wrapper = document.createElement('div');
			wrapper.innerHTML = svgString;
			svg = wrapper.querySelector('svg');
		}
		if (!svg) return null;
		return this._ensureSvg(svg);
	} catch (e) {
		return null;
	}
};

Plugins.uikit._ensureSvg = function (svg) {
	var ns = 'http://www.w3.org/2000/svg';
	if (svg.namespaceURI === ns) return document.importNode(svg, true);

	var newSvg = document.createElementNS(ns, 'svg');
	for (var i = 0; i < svg.attributes.length; i++) {
		var attr = svg.attributes[i];
		newSvg.setAttribute(attr.name, attr.value);
	}
	newSvg.setAttribute('xmlns', ns);
	newSvg.innerHTML = svg.innerHTML;
	return newSvg;
};

Plugins.uikit.addTab = function (name, opts) {
	return this._addTabInternal('panel', name, opts);
};

Plugins.uikit.addSettingsTab = function (name, opts) {
	return this._addTabInternal('settings', name, opts);
};

Plugins.uikit.getTabEl = function (name) {
	var slug = this._slugify(name);
	var panel = document.getElementById('uikit-tab-' + slug);
	return panel || null;
};

Plugins.uikit.getSettingsTabEl = function (name) {
	var slug = this._slugify(name);
	return document.getElementById('uikit-settings-tab-' + slug) || null;
};

Plugins.uikit.openSettings = function (tabName) {
	if (!this._ui || !this._ui.modalBackdrop) return;
	this._state.lastFocus = document.activeElement;
	this._ui.modalBackdrop.classList.remove('owrx-uikit__hidden');
	this._ui.modalBackdrop.setAttribute('aria-hidden', 'false');
	this._ui.modalBackdrop.removeAttribute('inert');
	if (tabName) {
		this._activateSettingsTab(this._slugify(tabName));
	} else if (this._state.lastSettingsTab) {
		this._activateSettingsTab(this._state.lastSettingsTab);
	} else {
		this._activateSettingsTab('ui');
	}

	var active = this._ui.modalTabsScroll.querySelector('.owrx-uikit__tab.is-active');
	if (!active) this._activateSettingsTab('ui');
	if (this._ui.modal) this._ui.modal.focus();
};

Plugins.uikit.closeSettings = function () {
	if (!this._ui || !this._ui.modalBackdrop) return;
	this._blurIfInside(this._ui.modalBackdrop, this._ui.settingsBtn);
	this._ui.modalBackdrop.classList.add('owrx-uikit__hidden');
	this._ui.modalBackdrop.setAttribute('aria-hidden', 'true');
	this._ui.modalBackdrop.setAttribute('inert', '');
	this._restoreFocus();
};

Plugins.uikit.setPanelPosition = function (pos) {
	var allowed = this._getAllowedPositions();
	if (allowed.indexOf(pos) === -1) {
		pos = allowed.indexOf('bottom') !== -1 ? 'bottom' : allowed[0];
	}
	this._settings.position = pos;
	this._saveSettings();
	this._applyPosition();
	this._applyPanelMode();
	this._renderPositionOptions();
};

Plugins.uikit.setPanelVisible = function (visible) {
	this._settings.visible = !!visible;
	this._saveSettings();
	this._applyVisibility();
	this._renderVisibilityToggle();
};

Plugins.uikit._loadSettings = function () {
	var stored = null;
	if (typeof LS !== 'undefined' && typeof LS.loadStr === 'function') {
		var raw = LS.loadStr('uikit');
		if (raw) {
			try { stored = JSON.parse(raw); } catch (e) { stored = null; }
		}
	}

	this._settings = Object.assign({}, this._defaults, this.settings || {}, stored || {});
};

Plugins.uikit._saveSettings = function () {
	if (typeof LS !== 'undefined' && typeof LS.save === 'function') {
		LS.save('uikit', JSON.stringify(this._settings));
	}
};

Plugins.uikit._buildRoot = function () {
	var root = document.createElement('div');
	root.id = 'owrx-uikit-root';
	root.className = 'owrx-uikit';

	var panel = document.createElement('div');
	panel.className = 'owrx-uikit__panel';

	var tabsBar = document.createElement('div');
	tabsBar.className = 'owrx-uikit__tabs-bar';

	var hideBtn = document.createElement('button');
	hideBtn.type = 'button';
	hideBtn.className = 'owrx-uikit__icon-btn owrx-uikit__hide-btn';
	hideBtn.title = 'Hide panel';
	hideBtn.appendChild(this._iconHide());

	var tabsScroll = document.createElement('div');
	tabsScroll.className = 'owrx-uikit__tabs-scroll';

	var settingsBtn = document.createElement('button');
	settingsBtn.type = 'button';
	settingsBtn.className = 'owrx-uikit__icon-btn owrx-uikit__settings-btn';
	settingsBtn.title = 'Settings';
	settingsBtn.appendChild(this._iconCog());

	tabsBar.appendChild(hideBtn);
	tabsBar.appendChild(tabsScroll);
	tabsBar.appendChild(settingsBtn);

	var content = document.createElement('div');
	content.className = 'owrx-uikit__content';

	panel.appendChild(tabsBar);
	panel.appendChild(content);

	var miniButton = document.createElement('button');
	miniButton.type = 'button';
	miniButton.className = 'owrx-uikit__mini-button owrx-uikit__icon-btn';
	miniButton.title = 'Show panel';
	miniButton.appendChild(this._iconChevron());

	root.appendChild(panel);
	root.appendChild(miniButton);

	document.body.appendChild(root);

	this._ui = {
		root: root,
		panel: panel,
		tabsBar: tabsBar,
		hideBtn: hideBtn,
		tabsScroll: tabsScroll,
		content: content,
		settingsBtn: settingsBtn,
		miniButton: miniButton
	};

	settingsBtn.addEventListener('click', this.openSettings.bind(this));
	hideBtn.addEventListener('click', this.setPanelVisible.bind(this, false));
	miniButton.addEventListener('click', this._showPanel.bind(this));
};

Plugins.uikit._buildPanel = function () {
	var slug = this._addTabInternal('panel', 'Panel', { order: 0, activate: true });
	var panel = this.getTabEl(slug);
	if (panel) {
		panel.appendChild(this._buildEmptyState());
	}
};

Plugins.uikit._buildSettingsModal = function () {
	var modalBackdrop = document.createElement('div');
	modalBackdrop.className = 'owrx-uikit__modal-backdrop owrx-uikit__hidden';
	modalBackdrop.setAttribute('aria-hidden', 'true');
	modalBackdrop.setAttribute('inert', '');

	var modal = document.createElement('div');
	modal.className = 'owrx-uikit__modal';
	modal.setAttribute('tabindex', '-1');

	var header = document.createElement('div');
	header.className = 'owrx-uikit__modal-header';

	var title = document.createElement('div');
	title.className = 'owrx-uikit__modal-title';
	title.textContent = 'UI Kit Settings';

	var closeBtn = document.createElement('button');
	closeBtn.type = 'button';
	closeBtn.className = 'owrx-uikit__icon-btn owrx-uikit__modal-close';
	closeBtn.title = 'Close';
	closeBtn.appendChild(this._iconClose());

	header.appendChild(title);
	header.appendChild(closeBtn);

	var modalTabsBar = document.createElement('div');
	modalTabsBar.className = 'owrx-uikit__tabs-bar';

	var modalTabsScroll = document.createElement('div');
	modalTabsScroll.className = 'owrx-uikit__tabs-scroll';

	modalTabsBar.appendChild(modalTabsScroll);

	var modalBody = document.createElement('div');
	modalBody.className = 'owrx-uikit__modal-body';

	modal.appendChild(header);
	modal.appendChild(modalTabsBar);
	modal.appendChild(modalBody);

	modalBackdrop.appendChild(modal);
	this._ui.root.appendChild(modalBackdrop);

	this._ui.modalBackdrop = modalBackdrop;
	this._ui.modal = modal;
	this._ui.modalTabsScroll = modalTabsScroll;
	this._ui.modalBody = modalBody;

	closeBtn.addEventListener('click', this.closeSettings.bind(this));
	modalBackdrop.addEventListener('click', function (e) {
		if (e.target === modalBackdrop) {
			Plugins.uikit.closeSettings();
		}
	});

	this._buildConfirmDialog();

	var slug = this._addTabInternal('settings', 'UI', { order: -100, activate: true });
	this._renderSettingsUI(slug);
	this._activateSettingsTab('ui');
};

Plugins.uikit._buildConfirmDialog = function () {
	var backdrop = document.createElement('div');
	backdrop.className = 'owrx-uikit__confirm-backdrop owrx-uikit__hidden';
	backdrop.setAttribute('aria-hidden', 'true');
	backdrop.setAttribute('inert', '');

	var dialog = document.createElement('div');
	dialog.className = 'owrx-uikit__confirm';
	dialog.setAttribute('tabindex', '-1');

	var title = document.createElement('div');
	title.className = 'owrx-uikit__confirm-title';
	title.textContent = 'Reset settings?';

	var text = document.createElement('div');
	text.className = 'owrx-uikit__confirm-text';
	text.textContent = 'This will restore the default UI Kit settings.';

	var actions = document.createElement('div');
	actions.className = 'owrx-uikit__confirm-actions';

	var cancelBtn = document.createElement('button');
	cancelBtn.type = 'button';
	cancelBtn.className = 'owrx-uikit__btn owrx-uikit__btn--ghost';
	cancelBtn.textContent = 'Cancel';

	var confirmBtn = document.createElement('button');
	confirmBtn.type = 'button';
	confirmBtn.className = 'owrx-uikit__btn owrx-uikit__btn--primary';
	confirmBtn.textContent = 'Reset';

	actions.appendChild(cancelBtn);
	actions.appendChild(confirmBtn);

	dialog.appendChild(title);
	dialog.appendChild(text);
	dialog.appendChild(actions);

	backdrop.appendChild(dialog);
	this._ui.root.appendChild(backdrop);

	this._ui.confirmBackdrop = backdrop;
	this._ui.confirmCancel = cancelBtn;
	this._ui.confirmOk = confirmBtn;

	cancelBtn.addEventListener('click', this._hideConfirm.bind(this));
	confirmBtn.addEventListener('click', this._confirmReset.bind(this));
	backdrop.addEventListener('click', function (e) {
		if (e.target === backdrop) Plugins.uikit._hideConfirm();
	});
};

Plugins.uikit._showConfirm = function () {
	this._state.lastConfirmFocus = document.activeElement;
	this._ui.confirmBackdrop.classList.remove('owrx-uikit__hidden');
	this._ui.confirmBackdrop.setAttribute('aria-hidden', 'false');
	this._ui.confirmBackdrop.removeAttribute('inert');
	if (this._ui.confirmBackdrop.firstChild) this._ui.confirmBackdrop.firstChild.focus();
};

Plugins.uikit._hideConfirm = function () {
	this._blurIfInside(this._ui.confirmBackdrop, this._ui.modal);
	this._ui.confirmBackdrop.classList.add('owrx-uikit__hidden');
	this._ui.confirmBackdrop.setAttribute('aria-hidden', 'true');
	this._ui.confirmBackdrop.setAttribute('inert', '');
	this._restoreConfirmFocus();
};

Plugins.uikit._confirmReset = function () {
	this._hideConfirm();
	this._settings = Object.assign({}, this._defaults);
	this._saveSettings();
	this._applySettings();
	this._renderSettingsUI('ui');
};

Plugins.uikit._applySettings = function () {
	this._normalizePosition();
	this._applyPosition();
	this._applyVisibility();
	this._applyPanelMode();
	this._renderSettingsUI('ui');
};

Plugins.uikit._applyPosition = function () {
	var root = this._ui.root;
	root.classList.remove('owrx-uikit--pos-top', 'owrx-uikit--pos-right', 'owrx-uikit--pos-bottom', 'owrx-uikit--pos-left');
	root.classList.add('owrx-uikit--pos-' + this._settings.position);
	this._updateMiniButtonIcon();
};

Plugins.uikit._applyVisibility = function () {
	var root = this._ui.root;
	if (this._settings.visible) {
		root.classList.remove('owrx-uikit--hidden');
	} else {
		root.classList.add('owrx-uikit--hidden');
	}
	this._applyPanelMode();
};

Plugins.uikit._showPanel = function () {
	this.setPanelVisible(true);
};

Plugins.uikit._renderSettingsUI = function (slug) {
	var tab = this._getSettingsTab(slug || 'ui');
	if (!tab) return;

	while (tab.firstChild) tab.removeChild(tab.firstChild);

	var section = document.createElement('div');
	section.className = 'owrx-uikit__settings-section';

	var title = document.createElement('div');
	title.className = 'owrx-uikit__settings-title';
	title.textContent = 'Panel';

	var positionGroup = document.createElement('div');
	positionGroup.className = 'owrx-uikit__settings-group';

	var positionLabel = document.createElement('div');
	positionLabel.className = 'owrx-uikit__settings-label';
	positionLabel.textContent = 'Position';

	var positionOptions = document.createElement('div');
	positionOptions.className = 'owrx-uikit__settings-options';
	positionOptions.dataset.role = 'position-options';

	positionGroup.appendChild(positionLabel);
	positionGroup.appendChild(positionOptions);

	var visibilityGroup = document.createElement('div');
	visibilityGroup.className = 'owrx-uikit__settings-group';

	var visibilityLabel = document.createElement('label');
	visibilityLabel.className = 'owrx-uikit__settings-label owrx-uikit__settings-label--inline';

	var visibilityInput = document.createElement('input');
	visibilityInput.type = 'checkbox';
	visibilityInput.checked = !!this._settings.visible;
	visibilityInput.dataset.role = 'visibility-toggle';
	visibilityInput.addEventListener('change', function (e) {
		Plugins.uikit.setPanelVisible(e.target.checked);
	});

	var visibilityText = document.createElement('span');
	visibilityText.textContent = 'Show panel';

	visibilityLabel.appendChild(visibilityInput);
	visibilityLabel.appendChild(visibilityText);
	visibilityGroup.appendChild(visibilityLabel);

	var modeGroup = document.createElement('div');
	modeGroup.className = 'owrx-uikit__settings-group';

	var modeLabel = document.createElement('div');
	modeLabel.className = 'owrx-uikit__settings-label';
	modeLabel.textContent = 'Panel mode';

	var modeOptions = document.createElement('div');
	modeOptions.className = 'owrx-uikit__settings-options';
	modeOptions.dataset.role = 'mode-options';

	modeGroup.appendChild(modeLabel);
	modeGroup.appendChild(modeOptions);

	var resetGroup = document.createElement('div');
	resetGroup.className = 'owrx-uikit__settings-group';

	var resetBtn = document.createElement('button');
	resetBtn.type = 'button';
	resetBtn.className = 'owrx-uikit__btn owrx-uikit__btn--danger';
	resetBtn.textContent = 'Reset to defaults';
	resetBtn.addEventListener('click', this._showConfirm.bind(this));

	resetGroup.appendChild(resetBtn);

	section.appendChild(title);
	section.appendChild(positionGroup);
	section.appendChild(modeGroup);
	section.appendChild(visibilityGroup);
	section.appendChild(resetGroup);

	tab.appendChild(section);

	this._ui.positionOptions = positionOptions;
	this._ui.modeOptions = modeOptions;
	this._ui.visibilityToggle = visibilityInput;

	this._renderPositionOptions();
	this._renderModeOptions();
	this._renderVisibilityToggle();
};

Plugins.uikit._renderPositionOptions = function () {
	var optionsWrap = this._ui.positionOptions || this._ui.modalBody.querySelector('[data-role="position-options"]');
	if (!optionsWrap) return;

	while (optionsWrap.firstChild) optionsWrap.removeChild(optionsWrap.firstChild);
	optionsWrap.classList.add('owrx-uikit__position-grid');

	var allowed = this._getAllowedPositions();
	for (var i = 0; i < allowed.length; i++) {
		var pos = allowed[i];
		var label = document.createElement('label');
		label.className = 'owrx-uikit__radio';
		label.dataset.pos = pos;

		var input = document.createElement('input');
		input.type = 'radio';
		input.name = 'uikit-position';
		input.value = pos;
		input.checked = this._settings.position === pos;
		input.addEventListener('change', function (e) {
			if (e.target.checked) Plugins.uikit.setPanelPosition(e.target.value);
		});

		var text = document.createElement('span');
		text.textContent = pos.charAt(0).toUpperCase() + pos.slice(1);

		label.appendChild(input);
		label.appendChild(text);
		optionsWrap.appendChild(label);
	}
};

Plugins.uikit._renderVisibilityToggle = function () {
	var checkbox = this._ui.visibilityToggle || this._ui.modalBody.querySelector('[data-role="visibility-toggle"]');
	if (checkbox) checkbox.checked = !!this._settings.visible;
};

Plugins.uikit._renderModeOptions = function () {
	var optionsWrap = this._ui.modeOptions || this._ui.modalBody.querySelector('[data-role="mode-options"]');
	if (!optionsWrap) return;

	while (optionsWrap.firstChild) optionsWrap.removeChild(optionsWrap.firstChild);

	var modes = ['overlay', 'push'];
	for (var i = 0; i < modes.length; i++) {
		var mode = modes[i];
		var label = document.createElement('label');
		label.className = 'owrx-uikit__radio';

		var input = document.createElement('input');
		input.type = 'radio';
		input.name = 'uikit-mode';
		input.value = mode;
		input.checked = this._settings.mode === mode;
		input.addEventListener('change', function (e) {
			if (e.target.checked) Plugins.uikit.setPanelMode(e.target.value);
		});

		var text = document.createElement('span');
		text.textContent = mode === 'overlay' ? 'Overlay' : 'Push';

		label.appendChild(input);
		label.appendChild(text);
		optionsWrap.appendChild(label);
	}
};

Plugins.uikit._getAllowedPositions = function () {
	var isMobile = window.innerWidth < 768;
	return isMobile ? ['top', 'bottom'] : ['top', 'right', 'bottom', 'left'];
};

Plugins.uikit._bindResize = function () {
	var self = this;
	window.addEventListener('resize', function () {
		var allowed = self._getAllowedPositions();
		if (allowed.indexOf(self._settings.position) === -1) {
			self._settings.position = allowed.indexOf('bottom') !== -1 ? 'bottom' : allowed[0];
			self._saveSettings();
			self._applyPosition();
		}
		self._renderPositionOptions();
	});
};

Plugins.uikit._scheduleLayoutSync = function () {
	var self = this;
	var scheduled = false;
	var run = function () {
		scheduled = false;
		self._applyPanelMode();
	};
	var schedule = function () {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(function () {
			requestAnimationFrame(run);
		});
	};

	schedule();
	setTimeout(schedule, 0);
	if (document.readyState === 'complete') {
		schedule();
	} else {
		window.addEventListener('load', schedule, { once: true });
	}
};

Plugins.uikit.setPanelMode = function (mode) {
	if (mode !== 'overlay' && mode !== 'push') mode = 'overlay';
	this._settings.mode = mode;
	this._saveSettings();
	this._applyPanelMode();
	this._renderModeOptions();
};

Plugins.uikit._cacheBodyPadding = function () {
	if (this._state.bodyPadding) return;
	var cs = window.getComputedStyle(document.body);
	this._state.bodyPadding = {
		top: cs.paddingTop || '',
		right: cs.paddingRight || '',
		bottom: cs.paddingBottom || '',
		left: cs.paddingLeft || ''
	};
};

Plugins.uikit._cachePagePadding = function () {
	if (this._state.pagePadding) return;
	var page = document.getElementById('webrx-page-container');
	if (!page) return;
	var cs = window.getComputedStyle(page);
	this._state.pagePadding = {
		top: cs.paddingTop || '',
		right: cs.paddingRight || '',
		bottom: cs.paddingBottom || '',
		left: cs.paddingLeft || ''
	};
};

Plugins.uikit._getPanelSize = function () {
	var fallback = { width: 320, height: 240 };
	if (!this._ui || !this._ui.panel) return fallback;
	var rect = this._ui.panel.getBoundingClientRect();
	return {
		width: Math.round(rect.width) || fallback.width,
		height: Math.round(rect.height) || fallback.height
	};
};

Plugins.uikit._setPadding = function (el, values) {
	if (!el || !values) return;
	el.style.paddingTop = values.top;
	el.style.paddingRight = values.right;
	el.style.paddingBottom = values.bottom;
	el.style.paddingLeft = values.left;
};

Plugins.uikit._setBox = function (el, values) {
	if (!el || !values) return;
	el.style.height = values.height;
	el.style.width = values.width;
	el.style.marginTop = values.marginTop;
	el.style.marginRight = values.marginRight;
	el.style.marginBottom = values.marginBottom;
	el.style.marginLeft = values.marginLeft;
};

Plugins.uikit._applyPanelMode = function () {
	if (!this._state.bodyPadding) this._cacheBodyPadding();
	if (!this._state.pagePadding) this._cachePagePadding();
	var base = this._state.bodyPadding;
	var visible = !!this._settings.visible;
	var mode = this._settings.mode || 'overlay';
	var size = this._getPanelSize();
	var height = size.height;
	var width = size.width;

	var padTop = base.top;
	var padRight = base.right;
	var padBottom = base.bottom;
	var padLeft = base.left;

	var target = document.getElementById('webrx-page-container');
	var basePage = this._state.pagePadding;
	var targetTop = basePage ? basePage.top : '';
	var targetRight = basePage ? basePage.right : '';
	var targetBottom = basePage ? basePage.bottom : '';
	var targetLeft = basePage ? basePage.left : '';
	var targetHeight = '';
	var targetMarginTop = '';

	if (mode === 'push' && visible) {
		switch (this._settings.position) {
			case 'top':
				if (target && basePage) {
					targetTop = basePage.top;
					targetMarginTop = height + 'px';
					targetHeight = 'calc(100% - ' + height + 'px)';
				} else {
					padTop = this._combinePadding(base.top, height);
				}
				break;
			case 'right':
				padRight = this._combinePadding(base.right, width);
				break;
			case 'left':
				padLeft = this._combinePadding(base.left, width);
				break;
			default:
				padBottom = base.bottom;
				targetBottom = this._combinePadding(basePage ? basePage.bottom : '', height);
		}
	}

	this._setPadding(document.body, { top: padTop, right: padRight, bottom: padBottom, left: padLeft });
	if (target && basePage) {
		this._setPadding(target, { top: targetTop, right: targetRight, bottom: targetBottom, left: targetLeft });
		this._setBox(target, {
			height: targetHeight,
			width: '',
			marginTop: targetMarginTop,
			marginRight: '',
			marginBottom: '',
			marginLeft: ''
		});
	}

	// Offset legacy absolute-bottom containers so they respect push space.
	if (this._ui && this._ui.root) {
		this._ui.root.style.bottom = '';
		this._ui.root.style.marginBottom = '';
	}

	var bottomOffset = (mode === 'push' && visible && this._settings.position === 'bottom') ? targetBottom : '';
	this._setBottomOffset('openwebrx-panels-container-left', bottomOffset);
	this._setBottomOffset('openwebrx-panels-container-right', bottomOffset);
};

Plugins.uikit._setBottomOffset = function (id, value) {
	var el = document.getElementById(id);
	if (!el) return;
	el.style.bottom = value;
};

Plugins.uikit._combinePadding = function (baseValue, addPx) {
	var base = parseInt(baseValue, 10);
	if (isNaN(base)) base = 0;
	return (base + addPx) + 'px';
};

Plugins.uikit._normalizePosition = function () {
	var allowed = this._getAllowedPositions();
	if (allowed.indexOf(this._settings.position) === -1) {
		this._settings.position = allowed.indexOf('bottom') !== -1 ? 'bottom' : allowed[0];
		this._saveSettings();
	}
};

Plugins.uikit._addTabInternal = function (type, name, opts) {
	opts = opts || {};
	var slug = this._slugify(name);
	slug = this._uniqueSlug(type, slug);

	var tabInfo = {
		name: name,
		slug: slug,
		order: (typeof opts.order === 'number') ? opts.order : 1000,
		icon: opts.icon || null
	};

	var tabButton = document.createElement('button');
	tabButton.type = 'button';
	tabButton.className = 'owrx-uikit__tab';
	tabButton.dataset.tab = slug;

	var iconEl = this._normalizeIcon(tabInfo.icon);
	if (iconEl) {
		var iconWrap = document.createElement('span');
		iconWrap.className = 'owrx-uikit__tab-icon';
		iconWrap.appendChild(iconEl);
		tabButton.appendChild(iconWrap);
	}

	var label = document.createElement('span');
	label.className = 'owrx-uikit__tab-label';
	label.textContent = name;
	
	tabButton.appendChild(label);

	var panel = document.createElement('div');
	if (type === 'panel') {
		panel.id = 'uikit-tab-' + slug;
		panel.className = 'owrx-uikit__tab-panel';
	} else {
		panel.id = 'uikit-settings-tab-' + slug;
		panel.className = 'owrx-uikit__tab-panel';
	}

	var tabsArray = this._tabs[type];
	tabsArray.push(tabInfo);

	var container = (type === 'panel') ? this._ui.tabsScroll : this._ui.modalTabsScroll;
	var contentContainer = (type === 'panel') ? this._ui.content : this._ui.modalBody;

	this._insertTabButton(container, tabButton, tabInfo, type);
	this._insertTabPanel(contentContainer, panel, tabInfo, type);

	var self = this;
	tabButton.addEventListener('click', function () {
		if (type === 'panel') {
			self._activateTab(slug);
		} else {
			self._activateSettingsTab(slug);
		}
	});

	if (opts.activate) {
		if (type === 'panel') this._activateTab(slug);
		else this._activateSettingsTab(slug);
	}

	return slug;
};

Plugins.uikit._insertTabButton = function (container, tabButton, tabInfo, type) {
	if (type === 'settings' && tabInfo.slug === 'ui') {
		container.insertBefore(tabButton, container.firstChild);
		tabButton.dataset.order = tabInfo.order;
		return;
	}
	var buttons = container.querySelectorAll('.owrx-uikit__tab');
	if (buttons.length === 0) {
		container.appendChild(tabButton);
		return;
	}
	var inserted = false;
	for (var i = 0; i < buttons.length; i++) {
		var btn = buttons[i];
		var order = parseFloat(btn.dataset.order || '1000');
		if (tabInfo.order < order) {
			container.insertBefore(tabButton, btn);
			inserted = true;
			break;
		}
	}
	if (!inserted) container.appendChild(tabButton);
	tabButton.dataset.order = tabInfo.order;
};

Plugins.uikit._insertTabPanel = function (container, panel, tabInfo, type) {
	if (type === 'settings' && tabInfo.slug === 'ui') {
		container.insertBefore(panel, container.firstChild);
		panel.dataset.order = tabInfo.order;
		return;
	}
	var panels = container.querySelectorAll('.owrx-uikit__tab-panel');
	if (panels.length === 0) {
		container.appendChild(panel);
		return;
	}
	var inserted = false;
	for (var i = 0; i < panels.length; i++) {
		var p = panels[i];
		var order = parseFloat(p.dataset.order || '1000');
		if (tabInfo.order < order) {
			container.insertBefore(panel, p);
			inserted = true;
			break;
		}
	}
	if (!inserted) container.appendChild(panel);
	panel.dataset.order = tabInfo.order;
};

Plugins.uikit._activateTab = function (slug) {
	var container = this._ui.tabsScroll;
	var contentContainer = this._ui.content;
	this._setActiveTab(container, contentContainer, slug);
	this._state.lastTab = slug;
};

Plugins.uikit._activateSettingsTab = function (slug) {
	var container = this._ui.modalTabsScroll;
	var contentContainer = this._ui.modalBody;
	this._setActiveTab(container, contentContainer, slug);
	this._state.lastSettingsTab = slug;
};

Plugins.uikit._setActiveTab = function (container, contentContainer, slug) {
	var tabs = container.querySelectorAll('.owrx-uikit__tab');
	for (var i = 0; i < tabs.length; i++) {
		var tab = tabs[i];
		if (tab.dataset.tab === slug) tab.classList.add('is-active');
		else tab.classList.remove('is-active');
	}
	var panels = contentContainer.querySelectorAll('.owrx-uikit__tab-panel');
	for (var j = 0; j < panels.length; j++) {
		var panel = panels[j];
		var panelSlug = panel.id.replace('uikit-tab-', '').replace('uikit-settings-tab-', '');
		if (panelSlug === slug) panel.classList.add('is-active');
		else panel.classList.remove('is-active');
	}
};

Plugins.uikit._getSettingsTab = function (slug) {
	return document.getElementById('uikit-settings-tab-' + slug);
};

Plugins.uikit._slugify = function (name) {
	if (!name) return 'tab';
	return name
		.toString()
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'tab';
};

Plugins.uikit._uniqueSlug = function (type, slug) {
	var existing = this._tabs[type].map(function (t) { return t.slug; });
	if (existing.indexOf(slug) === -1) return slug;
	var i = 2;
	var next = slug + '-' + i;
	while (existing.indexOf(next) !== -1) {
		i += 1;
		next = slug + '-' + i;
	}
	return next;
};

Plugins.uikit._normalizeIcon = function (icon) {
	if (!icon) return null;
	if (icon instanceof SVGElement) return icon;
	if (icon instanceof HTMLElement) return icon;
	if (typeof icon === 'string') {
		return this.svgFromString(icon);
	}
	return null;
};

Plugins.uikit._blurIfInside = function (container, fallbackEl) {
	if (!container) return;
	var active = document.activeElement;
	if (active && container.contains(active)) {
		if (fallbackEl && typeof fallbackEl.focus === 'function') {
			fallbackEl.focus();
		} else if (active && typeof active.blur === 'function') {
			active.blur();
		}
	}
};

Plugins.uikit._restoreFocus = function () {
	var last = this._state.lastFocus;
	if (last && typeof last.focus === 'function') {
		last.focus();
	}
};

Plugins.uikit._restoreConfirmFocus = function () {
	var last = this._state.lastConfirmFocus;
	if (last && typeof last.focus === 'function') {
		last.focus();
	} else if (this._ui.modal && typeof this._ui.modal.focus === 'function') {
		this._ui.modal.focus();
	}
};

Plugins.uikit._buildEmptyState = function () {
	var wrapper = document.createElement('div');
	wrapper.className = 'owrx-uikit__empty';

	var icon = document.createElement('div');
	icon.className = 'owrx-uikit__empty-icon';
	icon.appendChild(this._iconPanel());

	var title = document.createElement('div');
	title.className = 'owrx-uikit__empty-title';
	title.textContent = 'UI Kit';

	var text = document.createElement('div');
	text.className = 'owrx-uikit__empty-text';
	text.textContent = 'No tabs added yet.';

	var hint = document.createElement('div');
	hint.className = 'owrx-uikit__empty-hint';
	hint.textContent = "Use Plugins.uikit.addTab('My Tab') to add UI.";

	var settingsHint = document.createElement('div');
	settingsHint.className = 'owrx-uikit__empty-hint';
	settingsHint.textContent = "Use Plugins.uikit.addSettingsTab('My Tab') to add a settings tab.";

	wrapper.appendChild(icon);
	wrapper.appendChild(title);
	wrapper.appendChild(text);
	wrapper.appendChild(hint);
	wrapper.appendChild(settingsHint);

	return wrapper;
};


Plugins.uikit._iconCog = function () {
	return this._buildSvg('0 0 24 24', [
		'<circle cx="12" cy="12" r="3"/>',
		'<path d="M19.4 15a7.9 7.9 0 0 0 .1-2l2-1.5-2-3.4-2.4.5a7.6 7.6 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-.5-2 3.4 2 1.5a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.4 2.4-.5a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4.5 2-3.4-2-1.5z"/>'
	]);
};

Plugins.uikit._iconChevron = function () {
	return this._buildSvg('0 0 24 24', ['<path d="M8 14l4-4 4 4"/>']);
};

Plugins.uikit._iconHide = function () {
	return this._buildSvg('0 0 24 24', ['<path d="M6 12h12"/>', '<path d="M8 16h8"/>']);
};

Plugins.uikit._iconClose = function () {
	return this._buildSvg('0 0 24 24', ['<path d="M18 6L6 18M6 6l12 12"/>']);
};

Plugins.uikit._iconPanel = function () {
	return this._buildSvg('0 0 24 24', ['<rect x="3" y="4" width="18" height="16" rx="2" ry="2"/>', '<path d="M3 9h18"/>'], 24);
};

Plugins.uikit._iconArrow = function (dir) {
	switch (dir) {
		case 'down':
			return this._buildSvg('0 0 24 24', ['<path d="M8 10l4 4 4-4"/>']);
		case 'left':
			return this._buildSvg('0 0 24 24', ['<path d="M14 8l-4 4 4 4"/>']);
		case 'right':
			return this._buildSvg('0 0 24 24', ['<path d="M10 8l4 4-4 4"/>']);
		default:
			return this._buildSvg('0 0 24 24', ['<path d="M8 14l4-4 4 4"/>']);
	}
};

Plugins.uikit._updateMiniButtonIcon = function () {
	if (!this._ui || !this._ui.miniButton) return;
	var dir = 'up';
	switch (this._settings.position) {
		case 'top':
			dir = 'down';
			break;
		case 'left':
			dir = 'right';
			break;
		case 'right':
			dir = 'left';
			break;
		default:
			dir = 'up';
	}
	this._ui.miniButton.innerHTML = '';
	this._ui.miniButton.appendChild(this._iconArrow(dir));
};

Plugins.uikit._buildSvg = function (viewBox, paths, size) {
	var ns = 'http://www.w3.org/2000/svg';
	var svg = document.createElementNS(ns, 'svg');
	svg.setAttribute('xmlns', ns);
	svg.setAttribute('viewBox', viewBox);
	svg.setAttribute('width', size || 16);
	svg.setAttribute('height', size || 16);
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	svg.innerHTML = paths.join('');
	return svg;
};


// ── Plugin Modal API ────────────────────────────────────────────────────────

Plugins.uikit.createModal = function (slug, opts) {
	if (!this._ui || !this._ui.root) {
		console.error('[uikit] createModal: uikit not initialized');
		return null;
	}
	if (this._modals[slug]) {
		Object.assign(this._modals[slug].opts, opts || {});
		return this._buildPluginModalHandle(slug);
	}
	opts = opts || {};
	this._buildPluginModal(slug, opts);
	return this._buildPluginModalHandle(slug);
};

Plugins.uikit.openModal = function (slug) {
	var entry = this._modals[slug];
	if (!entry) return;

	entry._lastFocus = document.activeElement;

	var visibleEl = entry.wrapEl || entry.modalEl;
	visibleEl.classList.remove('owrx-uikit__hidden');
	if (entry.wrapEl) {
		entry.wrapEl.setAttribute('aria-hidden', 'false');
		entry.wrapEl.removeAttribute('inert');
	}
	entry.modalEl.focus();

	if (entry.opts.closeOnEsc !== false) {
		var self = this;
		entry._escHandler = function (e) {
			if (e.key === 'Escape') self.closeModal(slug);
		};
		document.addEventListener('keydown', entry._escHandler);
	}

	if (typeof entry.opts.onOpen === 'function') {
		entry.opts.onOpen();
	}
};

Plugins.uikit.closeModal = function (slug) {
	var entry = this._modals[slug];
	if (!entry) return;

	if (typeof entry.opts.onClose === 'function') {
		if (entry.opts.onClose() === false) return;
	}

	if (entry._escHandler) {
		document.removeEventListener('keydown', entry._escHandler);
		entry._escHandler = null;
	}

	var visibleEl = entry.wrapEl || entry.modalEl;
	visibleEl.classList.add('owrx-uikit__hidden');
	if (entry.wrapEl) {
		entry.wrapEl.setAttribute('aria-hidden', 'true');
		entry.wrapEl.setAttribute('inert', '');
	}

	var last = entry._lastFocus;
	if (last && typeof last.focus === 'function') last.focus();
};

Plugins.uikit.destroyModal = function (slug) {
	var entry = this._modals[slug];
	if (!entry) return;

	if (entry._escHandler) {
		document.removeEventListener('keydown', entry._escHandler);
		entry._escHandler = null;
	}

	var removeEl = entry.wrapEl || entry.modalEl;
	if (removeEl && removeEl.parentNode) {
		removeEl.parentNode.removeChild(removeEl);
	}

	var last = entry._lastFocus;
	if (last && typeof last.focus === 'function') last.focus();

	delete this._modals[slug];
};

Plugins.uikit.getModal = function (slug) {
	if (!this._modals[slug]) return null;
	return this._buildPluginModalHandle(slug);
};

Plugins.uikit._buildPluginModal = function (slug, opts) {
	var self = this;
	var showTitleBar = opts.titleBar !== undefined ? opts.titleBar : !!opts.title;
	var showCloseBtn = opts.closeButton !== undefined ? opts.closeButton : true;
	var closeBtnPos = opts.closeButtonPosition === 'left' ? 'left' : 'right';
	var showBackdrop = opts.backdrop !== undefined ? opts.backdrop : true;
	var showFooter = !!opts.footer;
	var isResizable = !!opts.resizable;

	var modalEl = document.createElement('div');
	modalEl.className = 'owrx-uikit__pm';
	if (opts.className) modalEl.className += ' ' + opts.className;
	if (isResizable) modalEl.classList.add('owrx-uikit__pm--resizable');
	modalEl.setAttribute('tabindex', '-1');

	modalEl.style.width = opts.width || '480px';
	if (opts.height && opts.height !== 'auto') modalEl.style.height = opts.height;
	if (opts.minWidth) modalEl.style.minWidth = opts.minWidth;
	if (opts.minHeight) modalEl.style.minHeight = opts.minHeight;

	if (opts.border === false) {
		modalEl.style.border = 'none';
	} else if (opts.borderStyle) {
		modalEl.style.border = opts.borderStyle;
	}
	if (opts.borderRadius) {
		modalEl.style.borderRadius = opts.borderRadius;
	}

	// Header
	if (showTitleBar) {
		var headerEl = document.createElement('div');
		headerEl.className = 'owrx-uikit__pm-header';

		if (showCloseBtn && closeBtnPos === 'left') {
			var closeBtnL = document.createElement('button');
			closeBtnL.type = 'button';
			closeBtnL.className = 'owrx-uikit__icon-btn owrx-uikit__pm-close';
			closeBtnL.title = 'Close';
			closeBtnL.appendChild(this._iconClose());
			closeBtnL.addEventListener('click', function (e) { e.stopPropagation(); self.closeModal(slug); });
			headerEl.appendChild(closeBtnL);
		}

		var titleEl = document.createElement('div');
		titleEl.className = 'owrx-uikit__pm-title';
		titleEl.textContent = opts.title || '';
		headerEl.appendChild(titleEl);

		if (showCloseBtn && closeBtnPos === 'right') {
			var closeBtnR = document.createElement('button');
			closeBtnR.type = 'button';
			closeBtnR.className = 'owrx-uikit__icon-btn owrx-uikit__pm-close';
			closeBtnR.title = 'Close';
			closeBtnR.appendChild(this._iconClose());
			closeBtnR.addEventListener('click', function (e) { e.stopPropagation(); self.closeModal(slug); });
			headerEl.appendChild(closeBtnR);
		}

		modalEl.appendChild(headerEl);
	}

	// Floating close button (no title bar)
	if (showCloseBtn && !showTitleBar) {
		var closeFloat = document.createElement('button');
		closeFloat.type = 'button';
		closeFloat.className = 'owrx-uikit__icon-btn owrx-uikit__pm-close-float owrx-uikit__pm-close-float--' + closeBtnPos;
		closeFloat.title = 'Close';
		closeFloat.appendChild(this._iconClose());
		closeFloat.addEventListener('click', function (e) { e.stopPropagation(); self.closeModal(slug); });
		modalEl.appendChild(closeFloat);
	}

	// Body
	var bodyEl = document.createElement('div');
	bodyEl.className = 'owrx-uikit__pm-body';
	modalEl.appendChild(bodyEl);

	// Footer
	var footerEl = null;
	if (showFooter) {
		footerEl = document.createElement('div');
		footerEl.className = 'owrx-uikit__pm-footer';
		modalEl.appendChild(footerEl);
	}

	// Resize handle
	var resizeHandle = null;
	if (isResizable) {
		resizeHandle = document.createElement('div');
		resizeHandle.className = 'owrx-uikit__pm-resize-handle';
		resizeHandle.title = 'Resize';
		modalEl.appendChild(resizeHandle);
	}

	// Wrap (backdrop or direct)
	var wrapEl = null;
	if (showBackdrop) {
		wrapEl = document.createElement('div');
		wrapEl.className = 'owrx-uikit__pm-backdrop owrx-uikit__hidden';
		wrapEl.setAttribute('aria-hidden', 'true');
		wrapEl.setAttribute('inert', '');
		wrapEl.appendChild(modalEl);

		if (opts.closeOnBackdrop !== false) {
			wrapEl.addEventListener('click', function (e) {
				if (e.target === wrapEl) {
					e.stopPropagation();
					self.closeModal(slug);
				}
			});
		}

		this._ui.root.appendChild(wrapEl);
	} else {
		modalEl.classList.add('owrx-uikit__pm--floating');
		modalEl.classList.add('owrx-uikit__hidden');
		this._ui.root.appendChild(modalEl);
	}

	var entry = {
		slug: slug,
		opts: opts,
		wrapEl: wrapEl,
		modalEl: modalEl,
		bodyEl: bodyEl,
		footerEl: footerEl,
		resizeHandle: resizeHandle,
		_lastFocus: null,
		_escHandler: null
	};

	this._modals[slug] = entry;

	if (isResizable) {
		this._bindResizeHandle(entry);
	}

	return entry;
};

Plugins.uikit._buildPluginModalHandle = function (slug) {
	var self = this;
	var entry = this._modals[slug];
	if (!entry) return null;
	return {
		contentEl: entry.bodyEl,
		footerEl: entry.footerEl,
		open: function () { self.openModal(slug); },
		close: function () { self.closeModal(slug); },
		destroy: function () { self.destroyModal(slug); }
	};
};

Plugins.uikit._bindResizeHandle = function (entry) {
	var handle = entry.resizeHandle;
	var modalEl = entry.modalEl;
	var minW = parseFloat(entry.opts.minWidth) || 200;
	var minH = parseFloat(entry.opts.minHeight) || 80;
	var startX, startY, startW, startH;

	function onMove(e) {
		var newW = Math.max(minW, startW + e.clientX - startX);
		var newH = Math.max(minH, startH + e.clientY - startY);
		modalEl.style.width = newW + 'px';
		modalEl.style.height = newH + 'px';
	}

	function onUp() {
		document.removeEventListener('pointermove', onMove);
		document.removeEventListener('pointerup', onUp);
	}

	handle.addEventListener('pointerdown', function (e) {
		e.preventDefault();
		startX = e.clientX;
		startY = e.clientY;
		var rect = modalEl.getBoundingClientRect();
		startW = rect.width;
		startH = rect.height;
		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	});
};


// ── info / question dialogs ─────────────────────────────────────────────────

Plugins.uikit.info = function (message, opts) {
	var self = this;
	return new Promise(function (resolve) {
		var slug = '__info_' + Date.now() + '__';
		opts = opts || {};
		var modal = self.createModal(slug, {
			title: opts.title !== undefined ? opts.title : 'Information',
			closeButton: false,
			closeOnEsc: false,
			closeOnBackdrop: false,
			footer: true,
			width: opts.width || '400px'
		});

		var p = document.createElement('p');
		p.className = 'owrx-uikit__pm-message';
		if (typeof message === 'string') {
			p.textContent = message;
		} else if (message instanceof HTMLElement) {
			modal.contentEl.appendChild(message);
		}
		if (typeof message === 'string') {
			modal.contentEl.appendChild(p);
		}

		var okBtn = document.createElement('button');
		okBtn.type = 'button';
		okBtn.className = 'owrx-uikit__btn owrx-uikit__btn--primary';
		okBtn.textContent = opts.okLabel || 'OK';
		okBtn.addEventListener('click', function () {
			self.destroyModal(slug);
			resolve();
		});
		modal.footerEl.appendChild(okBtn);

		self.openModal(slug);
		okBtn.focus();
	});
};

Plugins.uikit.question = function (message, opts) {
	var self = this;
	return new Promise(function (resolve) {
		var slug = '__question_' + Date.now() + '__';
		opts = opts || {};
		var modal = self.createModal(slug, {
			title: opts.title !== undefined ? opts.title : 'Confirm',
			closeButton: false,
			closeOnEsc: false,
			closeOnBackdrop: false,
			footer: true,
			width: opts.width || '400px'
		});

		var p = document.createElement('p');
		p.className = 'owrx-uikit__pm-message';
		if (typeof message === 'string') {
			p.textContent = message;
			modal.contentEl.appendChild(p);
		} else if (message instanceof HTMLElement) {
			modal.contentEl.appendChild(message);
		}

		var cancelBtn = document.createElement('button');
		cancelBtn.type = 'button';
		cancelBtn.className = 'owrx-uikit__btn owrx-uikit__btn--ghost';
		cancelBtn.textContent = opts.cancelLabel || 'Cancel';
		cancelBtn.addEventListener('click', function () {
			self.destroyModal(slug);
			resolve(false);
		});

		var okBtn = document.createElement('button');
		okBtn.type = 'button';
		okBtn.className = 'owrx-uikit__btn owrx-uikit__btn--primary';
		okBtn.textContent = opts.okLabel || 'OK';
		okBtn.addEventListener('click', function () {
			self.destroyModal(slug);
			resolve(true);
		});

		modal.footerEl.appendChild(cancelBtn);
		modal.footerEl.appendChild(okBtn);

		self.openModal(slug);
		okBtn.focus();
	});
};


// ── Toast / Notification System ─────────────────────────────────────────────

Plugins.uikit.toast = function (message, opts) {
	opts = opts || {};
	var self = this;
	var id = 'toast-' + (++this._toastSeq);
	var type = opts.type || 'info';
	var timeout = (opts.timeout !== undefined) ? opts.timeout : 4000;
	var closable = (opts.closable !== undefined) ? opts.closable : true;
	var position = opts.position || 'bottom-center';

	var container = this._getToastContainer(position);

	// Build toast element
	var toastEl = document.createElement('div');
	toastEl.className = 'owrx-uikit__toast owrx-uikit__toast--' + type;
	toastEl.dataset.toastId = id;

	// Icon
	var iconEl = document.createElement('div');
	iconEl.className = 'owrx-uikit__toast-icon';
	iconEl.appendChild(this._toastIcon(type));
	toastEl.appendChild(iconEl);

	// Content
	var contentEl = document.createElement('div');
	contentEl.className = 'owrx-uikit__toast-content';

	if (opts.title) {
		var titleEl = document.createElement('div');
		titleEl.className = 'owrx-uikit__toast-title';
		titleEl.textContent = opts.title;
		contentEl.appendChild(titleEl);
	}

	var msgEl = document.createElement('div');
	msgEl.className = 'owrx-uikit__toast-message';
	if (typeof message === 'string') {
		msgEl.textContent = message;
	} else if (message instanceof HTMLElement) {
		msgEl.appendChild(message);
	}
	contentEl.appendChild(msgEl);
	toastEl.appendChild(contentEl);

	// Close button
	if (closable) {
		var closeBtn = document.createElement('button');
		closeBtn.type = 'button';
		closeBtn.className = 'owrx-uikit__toast-close';
		closeBtn.title = 'Dismiss';
		closeBtn.appendChild(this._iconClose());
		closeBtn.addEventListener('click', function () {
			self.dismissToast(id);
		});
		toastEl.appendChild(closeBtn);
	}

	// Progress bar
	var progressEl = null;
	if (timeout > 0) {
		progressEl = document.createElement('div');
		progressEl.className = 'owrx-uikit__toast-progress';
		progressEl.style.animationDuration = timeout + 'ms';
		toastEl.appendChild(progressEl);
	}

	// Insert: top positions prepend, bottom positions append
	if (position.indexOf('top') === 0) {
		container.insertBefore(toastEl, container.firstChild);
	} else {
		container.appendChild(toastEl);
	}

	// Timer
	var entry = {
		el: toastEl,
		timer: null,
		deadline: 0,
		remaining: timeout,
		position: position
	};
	this._toasts[id] = entry;

	// Auto-dismiss timer
	if (timeout > 0) {
		this._startToastTimer(id);

		toastEl.addEventListener('mouseenter', function () {
			toastEl.classList.add('owrx-uikit__toast--paused');
			if (entry.timer) {
				clearTimeout(entry.timer);
				entry.timer = null;
			}
			entry.remaining = Math.max(0, entry.deadline - Date.now());
		});

		toastEl.addEventListener('mouseleave', function () {
			toastEl.classList.remove('owrx-uikit__toast--paused');
			if (entry.remaining > 0) {
				self._startToastTimer(id);
			}
		});
	}

	return id;
};

Plugins.uikit.dismissToast = function (id) {
	var entry = this._toasts[id];
	if (!entry) return;

	if (entry.timer) {
		clearTimeout(entry.timer);
		entry.timer = null;
	}

	var el = entry.el;
	el.classList.add('owrx-uikit__toast--dismissing');

	var self = this;
	el.addEventListener('animationend', function () {
		if (el.parentNode) el.parentNode.removeChild(el);
		delete self._toasts[id];
	}, { once: true });

	// Fallback if animation doesn't fire
	setTimeout(function () {
		if (self._toasts[id]) {
			if (el.parentNode) el.parentNode.removeChild(el);
			delete self._toasts[id];
		}
	}, 400);
};

Plugins.uikit.dismissAllToasts = function () {
	var ids = Object.keys(this._toasts);
	for (var i = 0; i < ids.length; i++) {
		this.dismissToast(ids[i]);
	}
};

Plugins.uikit._startToastTimer = function (id) {
	var entry = this._toasts[id];
	if (!entry || entry.remaining <= 0) return;
	var self = this;
	entry.deadline = Date.now() + entry.remaining;
	entry.timer = setTimeout(function () {
		self.dismissToast(id);
	}, entry.remaining);
};

Plugins.uikit._getToastContainer = function (position) {
	if (this._toastContainers[position]) return this._toastContainers[position];

	var container = document.createElement('div');
	container.className = 'owrx-uikit-toasts owrx-uikit-toasts--' + position;
	document.body.appendChild(container);

	this._toastContainers[position] = container;
	return container;
};

Plugins.uikit._toastIcon = function (type) {
	switch (type) {
		case 'success':
			return this._buildSvg('0 0 24 24', ['<path d="M20 6L9 17l-5-5"/>'], 20);
		case 'warning':
			return this._buildSvg('0 0 24 24', ['<path d="M12 9v4"/>', '<path d="M12 17h.01"/>', '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>'], 20);
		case 'error':
			return this._buildSvg('0 0 24 24', ['<circle cx="12" cy="12" r="10"/>', '<path d="M15 9l-6 6"/>', '<path d="M9 9l6 6"/>'], 20);
		default: // info
			return this._buildSvg('0 0 24 24', ['<circle cx="12" cy="12" r="10"/>', '<path d="M12 16v-4"/>', '<path d="M12 8h.01"/>'], 20);
	}
};


// ── Loading Overlay ─────────────────────────────────────────────────────────

Plugins.uikit.loading = function (el, show) {
	if (typeof el === 'string') {
		el = document.querySelector(el);
	}
	if (!el) return;

	if (show) {
		if (el._uikitLoading) return; // already showing

		var cs = window.getComputedStyle(el);
		if (cs.position === 'static') {
			el.dataset.uikitOrigPosition = 'static';
			el.style.position = 'relative';
		}

		var overlay = document.createElement('div');
		overlay.className = 'owrx-uikit__loading';

		var spinner = document.createElement('div');
		spinner.className = 'owrx-uikit__loading-spinner';
		overlay.appendChild(spinner);

		el.appendChild(overlay);
		el._uikitLoading = overlay;
	} else {
		if (el._uikitLoading) {
			if (el._uikitLoading.parentNode) {
				el._uikitLoading.parentNode.removeChild(el._uikitLoading);
			}
			el._uikitLoading = null;
		}
		if (el.dataset.uikitOrigPosition) {
			el.style.position = el.dataset.uikitOrigPosition;
			delete el.dataset.uikitOrigPosition;
		}
	}
};
