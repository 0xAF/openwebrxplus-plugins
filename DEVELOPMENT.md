---
layout: page
title: "OpenWebRX+ Plugins: Development Guide"
permalink: /development
---

# Development Guide

How to write receiver plugins for OpenWebRX+ 1.2.125 and newer, and how to add them to this repository.

- [Quickstart](#quickstart)
- [Plugin Structure](#plugin-structure)
- [Plugin Loader API](#plugin-loader-api)
- [Native Plugin UI API](#native-plugin-ui-api)
- [Built-in Plugins](#built-in-plugins)
- [utils Plugin API](#utils-plugin-api)
- [notify Plugin API](#notify-plugin-api)
- [Plugin Options](#plugin-options)
- [Adding a New Plugin to This Repository](#adding-a-new-plugin-to-this-repository)
- [Hosting on GitHub](#hosting-on-github)

## Quickstart

The [example plugin README](receiver/example/README.md) has a step-by-step quickstart, a minimal plugin skeleton, a table of available events, and annotated patterns for the most common tasks (event listening, function wrapping, DOM access).

1. Create `$OWRX_FOLDER/plugins/receiver/my_plugin/my_plugin.js`.
2. Load it locally by folder name: `await Plugins.load('my_plugin');`
3. Export `Plugins.my_plugin.init()` — return `true` on success, `false` on a failed dependency check.

## Plugin Structure

- Each plugin lives in `plugins/{receiver|map}/plugin_name/` with a matching `plugin_name.js` entry file.
- Set `Plugins.<name>._version` so other plugins can check for it with `Plugins.isLoaded('name', version)`.
- Set `Plugins.<name>.no_css = true` if there is no sibling CSS file; otherwise the loader fetches `plugin_name.css` automatically.
- Declare dependencies with `await Plugins.load('dep')` before loading plugins that need them.
- Use `Plugins.utils.wrap_func()` to intercept existing OWRX+ functions and `Plugins.utils.on_ready()` to defer work until the page is fully initialised.
- Use the [native plugin UI API](#native-plugin-ui-api) for buttons, windows and receiver sections.

## Plugin Loader API

Provided by OpenWebRX+ (`htdocs/plugins.js`). The receiver loads `plugins/receiver/init.js` when the page DOM is ready.

| Function | Description |
| :------- | :---------- |
| `Plugins.load(name_or_url)` | Load a plugin. A plain name loads `plugins/receiver/<name>/<name>.js`, a URL loads that file. Calls `init()` and loads `<name>.css` unless `no_css` is set. Returns a Promise |
| `Plugins.isLoaded(name, version)` | Truthy when the plugin is loaded and its `_version` is at least `version` |
| `Plugins._load_script(url)` / `Plugins._load_style(url)` | Load an extra script or stylesheet. Return a Promise |
| `Plugins._enable_debug = true` | Print loader debug messages to the console |

- `Plugins.load()` creates `Plugins.<name>` before the script runs, so a plugin extends that object: `Plugins.my_plugin.init = function () { ... };`
- If `Plugins.<name>` already exists, `Plugins.load()` treats the plugin as loaded and returns without loading it.
- `init()` may be `async`. A falsy return value is reported as a failed initialization and the CSS is not loaded.

## Native Plugin UI API

Provided by OpenWebRX+ (`htdocs/lib/Plugins.js`). Check that a function exists before using it, and keep a fallback when the plugin must also work on older versions.

### `Plugins.addButton(id, title, handler, color)`

Adds a button to the plugin button stack next to the receiver panel and returns the button element.

- `id`: the button gets the element id `plugin-button-<id>`.
- `title`: button text. It is HTML-escaped; to show an icon, replace the content of the returned element (`button.innerHTML = '<svg ...>'`).
- `handler`: optional click handler.
- `color`: optional CSS background.

### `Plugins.addWindow(id, title, content)`

Creates a floating, draggable and resizable window and returns the window element. The window starts hidden.

- The element id is `plugin-window-<id>`. Calling it again with the same `id` returns the existing window.
- `content` is inserted as HTML into the window body, `.openwebrx-plugin-body`.
- Position and size are saved in localStorage (`plugin_<id>_x`, `_y`, `_w`, `_h`).

### `Plugins.toggleWindow(id, on)`

Shows (`on = true`), hides (`on = false`) or toggles (no `on`) the window.

### `Plugins.addSection(id, title, content)`

Adds a collapsible section to the receiver panel, before the Settings section, and returns the **content** element (`.openwebrx-section`).

- The section title (divider) has the element id `plugin-section-<id>` and is the content's `previousElementSibling`.
- `content` is inserted as HTML into the content element.
- The open/closed state is saved in localStorage under `plugin-section-<id>`. New sections start closed.

```js
var content = Plugins.addSection('my_plugin', 'My Plugin');
content.appendChild(myControls);
// open it by default when the user has not chosen yet
if (!LS.has('plugin-section-my_plugin')) UI.toggleSection(content.previousElementSibling, true);
```

### `Plugins.toggleSection(id)`

Toggles the section open or closed. To set a specific state, use `UI.toggleSection(divider, on)`.

## Built-in Plugins

OpenWebRX+ ships optional plugins as global objects with an `init()` method: `MapPlugin`, `SunPlugin`, `KeyPlugin` and `RigPlugin` (see the [Built-in Plugins](README.md#built-in-plugins) table).

- Call `init()` once, after the receiver page is initialized. Most of them do not check for a second call.
- They create elements with the ids described above (`plugin-button-<name>`, `plugin-section-<name>`, `plugin-window-<name>`), where `<name>` is `XPlugin.myname`. Use them to find out whether a built-in plugin is running.
- A plugin that replaces a deprecated plugin of this repository should reuse the built-in one when it exists, as `minimap` does with `MapPlugin`.

## utils Plugin API

[utils](receiver/utils) (current version 0.8) is the shared helper plugin. Require the version that introduced the function you use: `Plugins.isLoaded('utils', 0.8)`.

| Function | Since | Description |
| :------- | :---- | :---------- |
| `wrap_func(name, before_cb, after_cb, obj)` | 0.1 | Wrap the function `obj[name]` (default `obj` is `window`). `before_cb(orig, thisArg, args)` returns `true` to call the original; `after_cb(result)` can change the return value |
| `on_ready(callback)` | 0.4 | Call `callback` once OpenWebRX+ has finished initializing the page (`document.owrx_initialized`) |
| `deepMerge(target, source)` | 0.5 | Deep-merge `source` into `target`, e.g. user options into defaults |
| `fillTemplate(template, variables)` | 0.5 | Replace `{name}` placeholders with values |
| `findCommonPrefix(strings)` | 0.6 | Longest common prefix of an array of strings |
| `observe_mutations(targets, options, callback, run_now)` | 0.8 | `MutationObserver` setup for one or more targets; returns handles |
| `disconnect_observers(handles)` | 0.8 | Disconnect handles from `observe_mutations()` |

Events triggered on `document` by utils (listen with `$(document).on(...)`):

- `event:owrx_initialized` — the page is initialized.
- `event:profile_changed` — the user switched the SDR profile; the profile name is passed as data.
- `server:<type>:before` / `server:<type>:after` — around the handling of every server WebSocket message (`config`, `bookmarks`, `profiles`, `features`, `clients`, ...); the message value is passed as data.
- `Plugins.utils._DEBUG_ALL_EVENTS = true` logs all events to the console.

See the [utils README](receiver/utils) for details and examples.

## notify Plugin API

[notify](receiver/notify) shows short notifications on the receiver page.

- `Plugins.notify.show(text)` — show a notification.

## Plugin Options

Plugins that take options from `init.js` provide a `setup(options)` method, called after the plugin is loaded:

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/my_plugin/my_plugin.js');
Plugins.my_plugin.setup({ color: 'red' });
```

- Options read only at runtime (for example on every event) may also be plain properties, set after `Plugins.load()`: `Plugins.screen_reader.log_messages = true;`
- Never create or modify `Plugins.<name>` before `Plugins.load()`. `Plugins.load()` treats an existing `Plugins.<name>` as already loaded and skips the plugin.
- Merge the options with defaults using `Plugins.utils.deepMerge()` when the plugin depends on utils.
- `setup()` must work when called after `init()` and apply the new options to UI that already exists.

## Adding a New Plugin to This Repository

All receiver plugins are listed in [`receiver/plugins.json`](receiver/plugins.json). This manifest is the single source of truth: the [plugin_loader](receiver/plugin_loader) plugin reads it at runtime, and the plugin tables in the [README](README.md) are generated from it.

1. Create `receiver/<name>/<name>.js`, and `<name>.css` if needed.
2. Create `receiver/<name>/README.md` with the Jekyll frontmatter and a `## Code` section linking to the Github repo (see any existing plugin).
3. Add an entry to `receiver/plugins.json`. The order of entries is the order of the README tables.
4. Run `python3 tools/plugins.py`. It validates the manifest, checks that every plugin folder is listed, and regenerates the README tables.
5. Commit the plugin folder, `receiver/plugins.json` and `README.md` together.

Do not edit the README tables between `<!-- plugins:...:start -->` and `<!-- plugins:...:end -->` by hand. Change `plugins.json` and run the script. `python3 tools/plugins.py --check` only validates and fails if the README is outdated.

Manifest entry fields:

| Field | Required | Description |
| :---- | :------- | :---------- |
| `id` | yes | Plugin folder name, the global name of a built-in plugin (`MapPlugin`), or a unique name for a third-party plugin |
| `category` | yes | `builtin`, `receiver`, `utility`, `deprecated`, `experimental` or `thirdparty`. Experimental plugins are not listed in the README |
| `description` | yes | One line, Markdown allowed. Shown in the README and in the loader |
| `author` | no | Contributor name, rendered as a link to [Contributors](README.md#contributors) |
| `requires` | no | Plugin ids loaded before this plugin, e.g. `["utils"]` |
| `conflicts` | no | Plugin ids that cannot run together with this plugin |
| `replaced_by` | no | Built-in plugin that replaces a deprecated plugin; the loader hides the deprecated plugin when the built-in exists |
| `homepage` | third-party | Project page of a third-party plugin, used as the README link |
| `url` | no | Third-party only: `https://` link to the plugin `.js` file. Without it the plugin is listed in the README but not in the loader |
| `global` | built-in | Global object of the built-in plugin, e.g. `MapPlugin` |
| `since` | built-in | First OpenWebRX+ version with the built-in plugin |
| `detect` | no | Built-ins only: CSS selector that exists once the plugin is started, when it does not create `#plugin-button-<name>`, `#plugin-section-<name>` or `#plugin-window-<name>` |

When a new built-in plugin appears in OpenWebRX+, add it with `"category": "builtin"` and also add a commented-out line for it in [`receiver/init.js.sample`](receiver/init.js.sample).

Third-party plugins live in other repositories. Add them with `"category": "thirdparty"` and a `homepage`. Add `url` only when the plugin is a single `.js` file that works with `Plugins.load()` and needs no server-side setup; only then can users enable it from the loader.

Map plugins are not part of the manifest; their table is edited by hand.

## Hosting on GitHub

To host plugins on GitHub, use [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) for correct JS Content-Type.

Plugins hosted on a different server than OpenWebRX+ load fine with `Plugins.load()`, but `fetch()` requests (for example `plugin_loader` reading `plugins.json`) need the `Access-Control-Allow-Origin` header. GitHub Pages sends it.
