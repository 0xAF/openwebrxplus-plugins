# OpenWebRX+ Plugins — Development Guide

## Project structure

```text
receiver/           — Receiver-page plugins (loaded via receiver/init.js)
map/                — Map-page plugins (loaded via map/init.js)
docs/               — Documentation (GitHub Pages / Jekyll)
```

Each plugin is a folder under `receiver/` or `map/` containing at minimum `pluginname.js` and optionally `pluginname.css`. The CSS is auto-loaded unless `Plugins.pluginname.no_css = true`.

## Plugin conventions

- **Namespace**: `Plugins.pluginname = Plugins.pluginname || {};`
- **Version**: `Plugins.pluginname._version = 0.1;`
- **init()**: Must return `true` on success, `false` on failure.
- **Dependencies**: Check with `Plugins.isLoaded('dep', minVersion)`.
- **Load order matters**: Use `await Plugins.load(...)` in `init.js`.
- **External scripts/styles**: Use `Plugins._load_script(url)` and `Plugins._load_style(url)`.
- **No CSS**: Set `Plugins.pluginname.no_css = true` before `init()` if no CSS file.

## Key infrastructure plugins

- **utils** (`receiver/utils/utils.js`) — `wrap_func()`, `on_ready()`, event system, `deepMerge()`, `fillTemplate()`. Almost all plugins depend on this.
- **uikit** (`receiver/uikit/uikit.js`) — Dockable panel, settings modal, plugin modals, toasts, loading overlays. Version 0.3+.
- **notify** (`receiver/notify/notify.js`) — Deprecated in favor of `uikit.toast()`. Has backward-compat shim.

## uikit migration

Existing plugins are being migrated to use uikit for their UI. Rules:

- The migrated plugin gets a new folder and name prefixed with `ui_` (e.g. `magic_key` → `ui_magic_key`).
- The original plugin is left untouched for backward compatibility.
- Migrated plugins capture `_baseUrl` at load time via `document.currentScript.src` and use it for auto-loading dependencies.
- Migrated plugins require `uikit >= 0.3` and `utils >= 0.6`.
- **Always update dependency version checks** (`Plugins.isLoaded('uikit', x)` and `Plugins.isLoaded('utils', x)`) to the latest released versions when touching a plugin. Current versions: `uikit = 0.3`, `utils = 0.7`.
- Use `var ui = Plugins.uikit;` as the local shorthand alias inside migrated plugin `init()` functions.

## uikit specifics

- `example_uikit` plugin version MUST always match `uikit` version and be incremented together. When adding new uikit features, add corresponding demos to `example_uikit`.
- Keep the changelog in `uikit.js` header comments up to date (same style as `utils.js`) — add an entry for every version bump.
- CSS classes are scoped under `.owrx-uikit` (BEM-like naming: `__element`, `--modifier`).
- Plugin modal class prefix: `.owrx-uikit__pm-*`
- Toast class prefix: `.owrx-uikit__toast*` and `.owrx-uikit-toasts` (container)
- Loading overlay: `.owrx-uikit__loading*`
- Toast containers are appended to `document.body` (independent of uikit root).
- Plugin modals are appended to `#owrx-uikit-root`.
- The root element has `pointer-events: none`; interactive children must set `pointer-events: auto`.

## Code style

- Plain ES5-compatible JavaScript (no modules, no build step, no TypeScript).
- jQuery is available globally (`$`).
- Use `var` not `let`/`const` for broad browser compatibility (except in `async` functions where `const`/`let` are acceptable).
- Indent with tabs.
- Use `Plugins.pluginname.method = function () { ... };` pattern (not class syntax).
- Each plugin's README has YAML frontmatter for Jekyll (GitHub Pages).
- **Always update a plugin's README** when adding new functionality, changing behaviour, or touching the plugin in any significant way.
- **Always update the copyright year** in the JS file header when touching a plugin (e.g. `Copyright (c) 2023-2026`).
- Every plugin README must include a `## Code` section with a link to the Github repo: `[Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/<plugin_name>)` (use `map/` for map plugins).

## OpenWebRX+ integration points

- DOM selectors: `#openwebrx-panel-receiver`, `#openwebrx-sdr-profiles-listbox`, `.openwebrx-modes`
- Global vars: `center_freq`, `currentprofile`, `clock`
- WebSocket events via `Plugins.utils.wrap_func('on_ws_recv', ...)` or `$(document).on('server:type:before', ...)`
- jQuery-based UI framework
- Demodulator: `$("#openwebrx-panel-receiver").demodulatorPanel().getDemodulator()`
- Theme system: CSS custom properties (`--theme-color1`, etc.) on `body.theme-*`

## Remote hosting

- Base URL: `https://0xaf.github.io/openwebrxplus-plugins/`
- Plugins can be loaded from this CDN or locally.

## Testing

- No test framework. Test by loading in a local OpenWebRX+ instance.
- `Plugins._enable_debug = true` enables loader debug output.
- `Plugins.utils._DEBUG_ALL_EVENTS = true` logs all events.
- The `example_uikit` plugin provides interactive tests for all uikit features.
