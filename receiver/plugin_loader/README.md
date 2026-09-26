---
layout: page
title: "OpenWebRX+ Receiver Plugin: Plugin Loader"
permalink: /receiver/plugin_loader
---

This `receiver` plugin lets users enable plugins themselves from a **Plugins** window, opened with the puzzle-piece button in the plugin button stack. The admin decides which plugins users may enable.

Each plugin has an on/off switch and a short description. Badges show the plugin state: **admin** (loaded by the admin, cannot be turned off), **active** (already running, e.g. as a dependency), **reload**, **error** and **deprecated**.

- Plugins are grouped as Built-in, Plugins, Experimental and Third-party.
- Built-in OpenWebRX+ plugins (`MapPlugin`, `SunPlugin`, `KeyPlugin`, `RigPlugin`, ...) are listed only when the running OpenWebRX+ version has them.
- Plugins the admin loaded in `init.js` are marked **admin** and cannot be turned off.
- The user's selection is saved in the browser (localStorage) and loaded again on the next visit.
- Turning a plugin off takes effect after a page reload. The window shows a **Reload** button.
- Dependencies (`utils`, `notify`, ...) are loaded automatically.
- Deprecated plugins are hidden when their built-in replacement is available.
- Plugins that conflict with an already running plugin (for example `magic_key` and `KeyPlugin`) are refused.

Requires OpenWebRX+ 1.2.124 or newer (native plugin buttons and windows).

## Load

Load the plugin **at the end** of your `init.js`, after all plugins the admin wants to load for everyone, then call `setup()`:

```js
(async () => {
	await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
	// ... other admin plugins ...

	await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/plugin_loader/plugin_loader.js');
	Plugins.plugin_loader.setup({
		allowed: ['doppler', 'screenshot', 'tune_precise', 'MapPlugin', 'SunPlugin'],
		allow_all: false
	});
})();
```

Everything loaded before `setup()` counts as loaded by the admin. `setup()` waits until the receiver page is fully initialized before it looks at the loaded plugins or starts any plugin.

## Settings

| Option | Default | Description |
| :----- | :------ | :---------- |
| `allowed` | `[]` | Plugin ids the user may enable: repository folder names (`doppler`) or built-in plugin names (`MapPlugin`) |
| `allow_all` | `false` | Let the user enable any repository or built-in plugin, ignoring `allowed`. Unknown built-in plugins of newer OpenWebRX+ versions are shown too |
| `allow_experimental` | `false` | Let the user enable any experimental plugin (for example the `ui_*` plugins) |
| `allow_thirdparty` | `false` | Let the user enable any third-party plugin that has a script URL in `plugins.json` |

`allow_all` does not include experimental and third-party plugins. Enable them with their own option, or list single plugins in `allowed`. Third-party plugins run code from other authors and are not reviewed by this project.

## Plugin list

The list comes from [`receiver/plugins.json`](https://github.com/0xAF/openwebrxplus-plugins/blob/main/receiver/plugins.json). The loader looks for it in the parent folder of `plugin_loader/` first (for a local install that is `htdocs/plugins/receiver/plugins.json`, next to `init.js`), then on `https://0xaf.github.io/openwebrxplus-plugins/receiver/plugins.json`. Plugins are loaded from the same place as the manifest, so if you mirror the plugins locally, copy `plugins.json` together with the plugin folders.

`plugins.json` is read with `fetch()`, so when the plugins are hosted on a different server than OpenWebRX+, that server must send the `Access-Control-Allow-Origin` header. GitHub Pages and plugins in the OpenWebRX+ `htdocs/plugins` folder need nothing. For a quick local test server:

```sh
darkhttpd /path/to/openwebrxplus-plugins --header 'Access-Control-Allow-Origin: *'
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).

## Code

[Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/plugin_loader)
