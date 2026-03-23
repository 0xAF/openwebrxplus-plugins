# OpenWebRX+ Plugins — Development Guide

## Project structure

```
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
- **uikit** (`receiver/uikit/uikit.js`) — Dockable panel, settings modal, plugin modals, toasts, loading overlays. Version 0.2+.
- **notify** (`receiver/notify/notify.js`) — Deprecated in favor of `uikit.toast()`. Has backward-compat shim.

## uikit specifics

- `example_uikit` plugin version MUST always match `uikit` version and be incremented together. When adding new uikit features, add corresponding demos to `example_uikit`.
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
