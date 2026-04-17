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
 */

// Namespace
Plugins.uikit = Plugins.uikit || {};

Plugins.uikit._version = 0.3;

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
	autoHideDelay: 2
};

Plugins.uikit._state = {
	lastTab: null,
	lastSettingsTab: 'ui',
	inactiveTimer: null,
	inactiveMoveHandler: null,
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
