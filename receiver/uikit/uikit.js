/*
 * Plugin: uikit - UI helper toolkit for OpenWebRX+ plugins
 *
 * Provides a dockable panel (top/right/bottom/left), settings modal with tabs,
 * plugin modals, toast notifications, loading overlays, and helper methods
 * for other plugins to build UI.
 *
 * This file is the entry point. It sets up the namespace, defaults, shared
 * state, and loads the sub-modules (core, panel, settings, modals, toasts,
 * loading) before running initialization.
 *
 * License: MIT
 * Copyright (c) 2024-2026 Stanislav Lechev [0xAF], LZ2SLL
 *
 * Changes:
 * 0.1:
 *  - initial release: dockable panel, tab system, push/overlay mode
 * 0.2:
 *  - plugin modal API (createModal, openModal, closeModal, destroyModal, getModal)
 *  - resizable modals, backdrop, floating mode
 *  - info() and question() dialog helpers
 *  - toast notifications with progress bar and hover-pause
 *  - loading overlay (loading())
 *  - dual-range slider (createDualSlider)
 *  - renderRadioGroup helper
 *  - svgFromString, buildSvg, icon helpers
 * 0.3:
 *  - CSS custom property system (--uikit-* variables) for theme integration
 *  - body.has-theme integration: panel/tabs/modal surfaces follow OWRX+ theme colours
 *  - openwebrx-panel class on modal body and content for native input/select styling
 *  - keydown stopPropagation on modals to block OWRX+ global shortcuts
 *  - Escape key handled by modal keydown handler (removed document-level _escHandler)
 *  - _setPanelAlpha: hybrid opacity/background-alpha approach for themed vs non-themed
 *  - panel mouseenter/mouseleave: timer paused while mouse is over the panel
 *  - panelHovered state tracked in _state for use by dependent plugins
 * 0.4:
 *  - panelSize setting (20–50 % of screen, step 5): height for top/bottom, width for left/right
 *  - setPanelSize() public API; slider in settings UI tab
 *  - tabs-scroll: scrollbar hidden; left/right arrow buttons shown when overflow exists
 *  - tabs-scroll: mouse drag and touch drag for scrolling tabs
 *  - fade: content area uses opacity so native widgets fade in Firefox (matches Chrome)
 */

// Namespace
Plugins.uikit = Plugins.uikit || {};

Plugins.uikit._version = 0.4;

// Capture base URL at load time — document.currentScript is only available
// during script execution, not later in init(). Works for both local and
// remote loading (the browser resolves the full URL either way).
Plugins.uikit._baseUrl = (document.currentScript && document.currentScript.src || '').replace(/uikit\.js(\?.*)?$/, '');

// Default settings (can be overridden in init.js before load)
Plugins.uikit.settings = Plugins.uikit.settings || {};

Plugins.uikit._defaults = {
	position: 'bottom',
	visible: true,
	mode: 'push',
	opacityActive: 0.95,
	opacityInactive: 0.30,
	autoHide: false,
	autoHideDelay: 2,
	panelSize: 25
};

Plugins.uikit._state = {
	lastTab: null,
	lastSettingsTab: 'ui',
	inactiveTimer: null,
	inactiveMoveHandler: null,
	panelMouseenterHandler: null,
	panelMouseleaveHandler: null,
	panelHovered: false,
	autoHidden: false
};

Plugins.uikit._tabs = {
	panel: [],
	settings: []
};

Plugins.uikit._modals = {};

Plugins.uikit._toasts = {};
Plugins.uikit._toastContainers = {};
Plugins.uikit._toastSeq = 0;

// Stores the in-progress (or completed) init Promise so dependent plugins can
// await it without calling init() themselves, working around the plugin loader
// not awaiting async init() return values.
Plugins.uikit._initPromise = null;

Plugins.uikit.init = async function () {
	if (this._initPromise) return this._initPromise;

	this._initPromise = this._doInit();
	return this._initPromise;
};

Plugins.uikit._doInit = async function () {
	if (document.getElementById('owrx-uikit-root')) {
		return true;
	}

	// Load all sub-modules from the same directory as this file
	var base = this._baseUrl;
	await Plugins._load_script(base + 'uikit-core.js');
	await Plugins._load_script(base + 'uikit-panel.js');
	await Plugins._load_script(base + 'uikit-settings.js');
	await Plugins._load_script(base + 'uikit-modals.js');
	await Plugins._load_script(base + 'uikit-toasts.js');
	await Plugins._load_script(base + 'uikit-loading.js');

	// Build UI and apply saved settings
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
