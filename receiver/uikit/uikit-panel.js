/*
 * uikit-panel.js — Dockable panel, tab system, layout sync, positioning,
 *                   push/overlay mode, auto-fade opacity
 *
 * Depends on uikit-core.js (_el, icons, slugify, etc.)
 */

// ── Root & Panel Construction ───────────────────────────────────────────────

Plugins.uikit._buildRoot = function () {
	var self = this;

	var root = this.el('div', { id: 'owrx-uikit-root', cls: 'owrx-uikit' });

	var panel = this.el('div', { cls: 'owrx-uikit__panel' });

	var tabsBar = this.el('div', { cls: 'owrx-uikit__tabs-bar' });

	var hideBtn = this.el('button', {
		type: 'button',
		cls: 'owrx-uikit__icon-btn owrx-uikit__hide-btn',
		title: 'Hide panel',
		children: [this.iconHide()],
		on: { click: function () { self.setPanelVisible(false); } }
	});

	var tabsScroll = this.el('div', { cls: 'owrx-uikit__tabs-scroll' });

	var tabsArrowLeft = this.el('button', {
		type: 'button',
		cls: 'owrx-uikit__icon-btn owrx-uikit__tabs-arrow owrx-uikit__tabs-arrow--left',
		title: 'Scroll tabs left',
		style: { display: 'none' },
		children: [this.iconArrow('left')],
		on: { click: function () { tabsScroll.scrollBy({ left: -120, behavior: 'smooth' }); } }
	});

	var tabsArrowRight = this.el('button', {
		type: 'button',
		cls: 'owrx-uikit__icon-btn owrx-uikit__tabs-arrow owrx-uikit__tabs-arrow--right',
		title: 'Scroll tabs right',
		style: { display: 'none' },
		children: [this.iconArrow('right')],
		on: { click: function () { tabsScroll.scrollBy({ left: 120, behavior: 'smooth' }); } }
	});

	var settingsBtn = this.el('button', {
		type: 'button',
		cls: 'owrx-uikit__icon-btn owrx-uikit__settings-btn',
		title: 'Settings',
		children: [this.iconCog()],
		on: { click: function () { self.openSettings(); } }
	});

	tabsBar.appendChild(hideBtn);
	tabsBar.appendChild(tabsArrowLeft);
	tabsBar.appendChild(tabsScroll);
	tabsBar.appendChild(tabsArrowRight);
	tabsBar.appendChild(settingsBtn);

	// ── Tab drag-scroll (mouse + touch) ────────────────────────────────────────

	var drag = { active: false, dragged: false, x: 0, scrollLeft: 0 };

	tabsScroll.addEventListener('mousedown', function (e) {
		if (e.button !== 0) return;
		drag.active = true;
		drag.dragged = false;
		drag.x = e.clientX;
		drag.scrollLeft = tabsScroll.scrollLeft;
	}, { passive: true });

	// Suppress the click on the tab button after a drag so it doesn't activate
	tabsScroll.addEventListener('click', function (e) {
		if (drag.dragged) { e.stopPropagation(); drag.dragged = false; }
	}, true);

	document.addEventListener('mousemove', function (e) {
		if (!drag.active) return;
		var dx = e.clientX - drag.x;
		if (Math.abs(dx) > 4) drag.dragged = true;
		tabsScroll.scrollLeft = drag.scrollLeft - dx;
	});

	document.addEventListener('mouseup', function () { drag.active = false; });

	var touch = { x: 0, scrollLeft: 0 };
	tabsScroll.addEventListener('touchstart', function (e) {
		touch.x = e.touches[0].clientX;
		touch.scrollLeft = tabsScroll.scrollLeft;
	}, { passive: true });

	tabsScroll.addEventListener('touchmove', function (e) {
		tabsScroll.scrollLeft = touch.scrollLeft - (e.touches[0].clientX - touch.x);
	}, { passive: true });

	tabsScroll.addEventListener('scroll', function () { self._updateTabArrows(); });

	var content = this.el('div', { cls: 'owrx-uikit__content openwebrx-panel' });

	panel.appendChild(tabsBar);
	panel.appendChild(content);

	// Mini-button shown when panel is hidden — arrow points toward panel position
	var miniButton = this.el('button', {
		type: 'button',
		cls: 'owrx-uikit__mini-button owrx-uikit__icon-btn',
		title: 'Show panel',
		children: [this.iconChevron()],
		on: { click: function () { self._showPanel(); } }
	});

	root.appendChild(panel);
	root.appendChild(miniButton);
	document.body.appendChild(root);

	// Cache UI element references for use by all sub-modules
	this._ui = {
		root: root,
		panel: panel,
		tabsBar: tabsBar,
		hideBtn: hideBtn,
		tabsScroll: tabsScroll,
		tabsArrowLeft: tabsArrowLeft,
		tabsArrowRight: tabsArrowRight,
		content: content,
		settingsBtn: settingsBtn,
		miniButton: miniButton
	};
};

// No default tab — plugins add their own via addTab().
Plugins.uikit._buildPanel = function () {};

// ── Public Tab API ──────────────────────────────────────────────────────────

Plugins.uikit.addTab = function (name, opts) {
	return this._addTabInternal('panel', name, opts);
};

Plugins.uikit.addSettingsTab = function (name, opts) {
	return this._addTabInternal('settings', name, opts);
};

Plugins.uikit.getTabEl = function (name) {
	var slug = this._slugify(name);
	return document.getElementById('uikit-tab-' + slug) || null;
};

Plugins.uikit.getSettingsTabEl = function (name) {
	var slug = this._slugify(name);
	return document.getElementById('uikit-settings-tab-' + slug) || null;
};

// ── Tab Internals ───────────────────────────────────────────────────────────

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

	// Build the tab button with optional icon
	var tabButton = this.el('button', {
		type: 'button',
		cls: 'owrx-uikit__tab',
		data: { tab: slug }
	});

	var iconEl = this._normalizeIcon(tabInfo.icon);
	if (iconEl) {
		this.el('span', {
			cls: 'owrx-uikit__tab-icon',
			children: [iconEl],
			parent: tabButton
		});
	}

	this.el('span', {
		cls: 'owrx-uikit__tab-label',
		text: name,
		parent: tabButton
	});

	// Build the content panel for this tab
	var panel = this.el('div', {
		id: (type === 'panel' ? 'uikit-tab-' : 'uikit-settings-tab-') + slug,
		cls: 'owrx-uikit__tab-panel'
	});

	var tabsArray = this._tabs[type];
	tabsArray.push(tabInfo);

	var container = (type === 'panel') ? this._ui.tabsScroll : this._ui.modalTabsScroll;
	var contentContainer = (type === 'panel') ? this._ui.content : this._ui.modalBody;

	// Insert in order-sorted position
	this._insertTabButton(container, tabButton, tabInfo, type);
	this._insertTabPanel(contentContainer, panel, tabInfo, type);

	// Capture slug for closure
	var self = this;
	tabButton.addEventListener('click', function () {
		if (type === 'panel') self._activateTab(slug);
		else self._activateSettingsTab(slug);
	});

	// Activate if explicitly requested, or if this is the first tab (nothing active yet)
	var hasActive = container.querySelector('.owrx-uikit__tab.is-active');
	if (opts.activate || !hasActive) {
		if (type === 'panel') this._activateTab(slug);
		else this._activateSettingsTab(slug);
	}

	if (type === 'panel') this._updateTabArrows();

	return slug;
};

// Inserts a tab button in order-sorted position within the container.
Plugins.uikit._insertTabButton = function (container, tabButton, tabInfo, type) {
	// Settings "UI" tab always goes first
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

// Inserts a tab panel in order-sorted position within the content container.
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

// ── Tab Activation ──────────────────────────────────────────────────────────

Plugins.uikit._activateTab = function (slug) {
	this._setActiveTab(this._ui.tabsScroll, this._ui.content, slug);
	this._state.lastTab = slug;
};

Plugins.uikit._activateSettingsTab = function (slug) {
	this._setActiveTab(this._ui.modalTabsScroll, this._ui.modalBody, slug);
	this._state.lastSettingsTab = slug;
};

// Toggles is-active class on tab buttons and panels to show the selected tab.
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
		// Strip both possible id prefixes to get the slug
		var panelSlug = panel.id.replace('uikit-tab-', '').replace('uikit-settings-tab-', '');
		if (panelSlug === slug) panel.classList.add('is-active');
		else panel.classList.remove('is-active');
	}
};

Plugins.uikit._getSettingsTab = function (slug) {
	return document.getElementById('uikit-settings-tab-' + slug);
};

// ── Position / Visibility / Mode ────────────────────────────────────────────

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
	this._renderPanelSizeSlider();
};

Plugins.uikit.setPanelVisible = function (visible) {
	this._settings.visible = !!visible;
	this._saveSettings();
	this._applyVisibility();
	this._renderVisibilityToggle();
};

Plugins.uikit.setPanelMode = function (mode) {
	if (mode !== 'overlay' && mode !== 'push') mode = 'overlay';
	this._settings.mode = mode;
	this._saveSettings();
	this._applyPanelMode();
	this._renderModeOptions();
	this._renderOpacitySlider();
};

Plugins.uikit.setPanelOpacity = function (value) {
	value = Math.max(0.1, Math.min(1, parseFloat(value) || 0.5));
	this._settings.opacityInactive = value;
	this._saveSettings();
	this._initInactiveTimer();
};

Plugins.uikit._applyPosition = function () {
	var root = this._ui.root;
	root.classList.remove('owrx-uikit--pos-top', 'owrx-uikit--pos-right', 'owrx-uikit--pos-bottom', 'owrx-uikit--pos-left');
	root.classList.add('owrx-uikit--pos-' + this._settings.position);
	this._applyPanelSize();
	this._updateMiniButtonIcon();
};

Plugins.uikit._applyPanelSize = function () {
	if (!this._ui || !this._ui.panel) return;
	var pct = this._settings.panelSize || 30;
	var pos = this._settings.position || 'bottom';
	var panel = this._ui.panel;
	if (pos === 'bottom' || pos === 'top') {
		panel.style.height = pct + 'vh';
		panel.style.width = '';
	} else {
		panel.style.width = pct + 'vw';
		panel.style.height = '';
	}
};

Plugins.uikit.setFooter = function (el) {
	if (!this._ui || !this._ui.panel) return;
	if (this._ui.footer) this._ui.panel.removeChild(this._ui.footer);
	this._ui.footer = el;
	this._ui.panel.appendChild(el);
};

Plugins.uikit.setPanelSize = function (pct) {
	pct = Math.round(pct / 5) * 5;
	pct = Math.max(20, Math.min(50, pct));
	this._settings.panelSize = pct;
	this._saveSettings();
	this._applyPanelSize();
	this._applyPanelMode();
	this._renderPanelSizeSlider();
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

// On mobile (viewport < 768px), only top/bottom positions are usable.
Plugins.uikit._getAllowedPositions = function () {
	var isMobile = window.innerWidth < 768;
	return isMobile ? ['top', 'bottom'] : ['top', 'right', 'bottom', 'left'];
};

Plugins.uikit._normalizePosition = function () {
	var allowed = this._getAllowedPositions();
	if (allowed.indexOf(this._settings.position) === -1) {
		this._settings.position = allowed.indexOf('bottom') !== -1 ? 'bottom' : allowed[0];
		this._saveSettings();
	}
};

// ── Inactive Timer (unified fade + hide) ────────────────────────────────────

// Single timer that fires after the configured inactivity delay.
// If "hide if inactive" is on → adds owrx-uikit--auto-hidden.
// Otherwise in overlay mode → fades to inactive opacity.
// Mouse movement restores active state and restarts the timer.
// Skipped while an opacity slider is being dragged (pauseFade flag).
Plugins.uikit._initInactiveTimer = function () {
	this._destroyInactiveTimer();
	if (!this._ui || !this._ui.root) return;
	// Delay=0 means OFF — ensure active state and bail
	if (!this._settings.autoHideDelay) {
		if (this._state.autoHidden) this._setAutoHidden(false);
		this._setPanelAlpha(this._settings.opacityActive || 0.92);
		return;
	}

	var self = this;
	var delay = this._settings.autoHideDelay * 1000;

	function goInactive() {
		// Don't go inactive while the mouse is over the panel
		if (self._state.panelHovered) { startTimer(); return; }
		// Hide or fade depending on checkbox (both modes)
		if (self._settings.autoHide) {
			self._setAutoHidden(true);
		} else {
			self._setPanelAlpha(self._settings.opacityInactive || 0.5, false);
		}
	}

	function goActive() {
		if (self._state.autoHidden) self._setAutoHidden(false);
		self._setPanelAlpha(self._settings.opacityActive || 0.92);
	}

	function startTimer() {
		self._state.inactiveTimer = setTimeout(goInactive, delay);
	}

	this._state.inactiveMoveHandler = function () {
		if (self._state.pauseFade) return;
		goActive();
		clearTimeout(self._state.inactiveTimer);
		startTimer();
	};

	this._state.panelMouseenterHandler = function () {
		self._state.panelHovered = true;
		clearTimeout(self._state.inactiveTimer);
		goActive();
	};

	this._state.panelMouseleaveHandler = function () {
		self._state.panelHovered = false;
		startTimer();
	};

	document.addEventListener('mousemove', this._state.inactiveMoveHandler);
	this._ui.panel.addEventListener('mouseenter', this._state.panelMouseenterHandler);
	this._ui.panel.addEventListener('mouseleave', this._state.panelMouseleaveHandler);
	goActive();
	startTimer();
};

Plugins.uikit._destroyInactiveTimer = function () {
	if (this._state.inactiveTimer) {
		clearTimeout(this._state.inactiveTimer);
		this._state.inactiveTimer = null;
	}
	if (this._state.inactiveMoveHandler) {
		document.removeEventListener('mousemove', this._state.inactiveMoveHandler);
		this._state.inactiveMoveHandler = null;
	}
	if (this._state.panelMouseenterHandler && this._ui && this._ui.panel) {
		this._ui.panel.removeEventListener('mouseenter', this._state.panelMouseenterHandler);
		this._ui.panel.removeEventListener('mouseleave', this._state.panelMouseleaveHandler);
		this._state.panelMouseenterHandler = null;
		this._state.panelMouseleaveHandler = null;
	}
	this._state.panelHovered = false;
	if (this._state.autoHidden) this._setAutoHidden(false);
	this._setPanelAlpha(this._settings.opacityActive || 0.92);
};

// Fades the panel surfaces consistently across Chrome and Firefox.
// In default mode: panel/tabs backgrounds use --uikit-panel-bg-alpha (keeps
// backdrop-filter blur visible); content uses opacity so native widgets (inputs,
// buttons) also fade — matching Chrome's compositor behaviour in Firefox.
// In themed mode: opacity on the panel element cascades to everything.
Plugins.uikit._setPanelAlpha = function (alpha, withBlur) {
	if (!this._ui || !this._ui.panel) return;
	if (document.body.classList.contains('has-theme')) {
		this._ui.panel.style.opacity = alpha;
		this._ui.panel.style.removeProperty('--uikit-panel-bg-alpha');
		if (this._ui.tabsBar) this._ui.tabsBar.style.removeProperty('opacity');
		if (this._ui.content) this._ui.content.style.removeProperty('opacity');
		if (this._ui.footer)  this._ui.footer.style.removeProperty('opacity');
	} else {
		// Keep backdrop-filter active by only fading the panel background;
		// fade tabsBar, content, and footer via opacity so all child elements
		// (text, borders, native inputs) fade uniformly — matching Chrome behaviour.
		this._ui.panel.style.setProperty('--uikit-panel-bg-alpha', alpha);
		this._ui.panel.style.removeProperty('opacity');
		if (this._ui.tabsBar) this._ui.tabsBar.style.opacity = alpha;
		if (this._ui.content) this._ui.content.style.opacity = alpha;
		if (this._ui.footer)  this._ui.footer.style.opacity = alpha;
	}
	this._ui.panel.style.setProperty('--uikit-panel-blur', withBlur !== false ? 'blur(12px)' : 'none');
};

// ── Layout & Resize ─────────────────────────────────────────────────────────

Plugins.uikit._updateTabArrows = function () {
	var el = this._ui && this._ui.tabsScroll;
	var left = this._ui && this._ui.tabsArrowLeft;
	var right = this._ui && this._ui.tabsArrowRight;
	if (!el) return;
	var canLeft = el.scrollLeft > 1;
	var canRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
	if (left) left.style.display = canLeft ? '' : 'none';
	if (right) right.style.display = canRight ? '' : 'none';
};

// Re-check allowed positions on window resize (mobile may lose left/right).
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
		self._updateTabArrows();
	});
};

// Runs _applyPanelMode after the DOM has settled (double-rAF + load event).
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
		// Double requestAnimationFrame ensures layout has been computed
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

// Cache the original body padding so we can restore it when switching modes.
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

// Cache the original page container padding for push-mode offset calculations.
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

// Core layout engine: recalculates push padding based on current visibility
// (including auto-hidden state). Called by _applyPanelMode and _setAutoHidden.
Plugins.uikit._applyLayout = function () {
	if (!this._state.bodyPadding) this._cacheBodyPadding();
	if (!this._state.pagePadding) this._cachePagePadding();
	var base = this._state.bodyPadding;
	// Treat auto-hidden as not visible for layout purposes
	var visible = !!this._settings.visible && !this._state.autoHidden;
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

	// In push mode, add panel size to the appropriate edge padding
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

	// Reset any stale offsets on the root element
	if (this._ui && this._ui.root) {
		this._ui.root.style.bottom = '';
		this._ui.root.style.marginBottom = '';
	}

	// Offset legacy absolute-bottom containers so they respect push space
	var bottomOffset = (mode === 'push' && visible && this._settings.position === 'bottom') ? targetBottom : '';
	this._setBottomOffset('openwebrx-panels-container-left', bottomOffset);
	this._setBottomOffset('openwebrx-panels-container-right', bottomOffset);
};

// Applies layout then (re)starts the inactive timer.
Plugins.uikit._applyPanelMode = function () {
	this._applyLayout();
	this._initInactiveTimer();
};

// Temporarily hides/shows the panel without touching _settings.visible.
// Reuses owrx-uikit--hidden so push layout recalculates correctly.
Plugins.uikit._setAutoHidden = function (hidden) {
	this._state.autoHidden = !!hidden;
	var root = this._ui && this._ui.root;
	if (!root) return;
	if (hidden) {
		root.classList.add('owrx-uikit--hidden');
	} else if (this._settings.visible) {
		root.classList.remove('owrx-uikit--hidden');
	}
	this._applyLayout();
};

Plugins.uikit._setBottomOffset = function (id, value) {
	var el = document.getElementById(id);
	if (!el) return;
	el.style.bottom = value;
};

// Adds a pixel amount to an existing CSS padding value.
Plugins.uikit._combinePadding = function (baseValue, addPx) {
	var base = parseInt(baseValue, 10);
	if (isNaN(base)) base = 0;
	return (base + addPx) + 'px';
};

// ── Empty State ─────────────────────────────────────────────────────────────

// Shown when no tabs have been added to the panel.
Plugins.uikit._buildEmptyState = function () {
	return this.el('div', {
		cls: 'owrx-uikit__empty',
		children: [
			this.el('div', { cls: 'owrx-uikit__empty-icon', children: [this.iconPanel()] }),
			this.el('div', { cls: 'owrx-uikit__empty-title', text: 'UI Kit' }),
			this.el('div', { cls: 'owrx-uikit__empty-text', text: 'No tabs added yet.' }),
			this.el('div', { cls: 'owrx-uikit__empty-hint', text: "Use Plugins.uikit.addTab('My Tab') to add UI." }),
			this.el('div', { cls: 'owrx-uikit__empty-hint', text: "Use Plugins.uikit.addSettingsTab('My Tab') to add a settings tab." })
		]
	});
};
