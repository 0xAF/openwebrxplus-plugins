---
layout: page
title: "OpenWebRX+ Receiver Plugin: Example plugin (for devs)"
permalink: /receiver/example
---

This plugin is a reference for developers. It is **not meant to be loaded** — the file starts with a `throw` to prevent accidental use. Read the source as a cookbook.

---

## New Developer Quickstart

### 1. Create your plugin folder and file

```text
htdocs/plugins/receiver/my_plugin/my_plugin.js
```

The folder name and JS filename must match exactly. The plugin loader derives the plugin name from both.

### 2. Minimal plugin skeleton

```js
/*
 * my_plugin - short description
 *
 * License: MIT
 * Copyright (c) 2025 Your Name
 */

// Tell the loader there is no CSS file for this plugin.
// Remove this line if you ship a my_plugin.css alongside the JS.
Plugins.my_plugin.no_css = true;

// Declare a version so other plugins can check for it with Plugins.isLoaded().
Plugins.my_plugin._version = 0.1;

// The loader calls init() after the JS is fetched.
// Return true on success, false to signal a failed dependency check.
Plugins.my_plugin.init = function () {

  // Dependency check — remove if you don't need utils.
  if (!Plugins.isLoaded('utils', 0.1)) {
    console.error('my_plugin requires utils >= 0.1');
    return false;
  }

  console.log('my_plugin loaded!');
  return true;
};
```

### 3. Load it locally in `init.js`

```js
// Load utils first (required dependency for most plugins)
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');

// Load your local plugin by folder name (no URL needed for local plugins)
await Plugins.load('my_plugin');
```

### 4. Iterate

- Open the browser console (F12) to see `console.log` / `console.error` output.
- Set `Plugins._enable_debug = true;` in `init.js` for verbose loader output.
- Set `Plugins.utils._DEBUG_ALL_EVENTS = true;` to log every OWRX+ event.

---

## Patterns shown in `example.js`

### Listening to events (read-only)

Use `$(document).on('event:name', callback)` to react to events. You cannot modify the data from here — for that, wrap the source function instead (see below).

```js
$(document).on('event:profile_changed', function (e, data) {
  console.log('profile changed to:', data);
});
```

**Useful events fired by the `utils` plugin:**

| Event | When |
| ----- | ---- |
| `event:profile_changed` | User switches SDR profile |
| `server:config:before` / `:after` | Server sends configuration |
| `server:bookmarks:before` / `:after` | Server sends bookmarks |
| `server:profiles:before` / `:after` | Server sends profile list |
| `server:features:before` / `:after` | Server sends feature flags |
| `server:clients:before` / `:after` | Client count changes |

All `server:*` events carry the message value as the second argument to the callback.

### Wrapping an existing OWRX+ function

Use `Plugins.utils.wrap_func()` to intercept any global function. The `before_cb` runs first and controls whether the original is called. The `after_cb` runs after and can replace the return value.

```js
Plugins.utils.wrap_func(
  'sdr_profile_changed',          // name of the global function to wrap
  function (orig, thisArg, args) { // before callback
    console.log('about to change profile');
    return true;                  // return true to let the original run
  },
  function (res, thisArg, args) { // after callback
    console.log('profile changed');
    return res;                   // return res (or a replacement value)
  }
);
```

Return `false` from `before_cb` to block the original call (and skip `after_cb`). If you call `orig.apply(thisArg, args)` yourself inside `before_cb`, also return `false` to prevent a second call.

### Wrapping a function that only exists after OWRX+ initialises

Some objects (e.g. `bookmarks`) are created during page init, not at load time. Wait for the ready signal before wrapping them:

```js
Plugins.utils.on_ready(function () {
  Plugins.utils.wrap_func('replace_bookmarks',
    function (orig, thisArg, args) {
      // args[0] is the bookmark array, args[1] is the source ('server'|'client')
      if (args[1] === 'server' && Array.isArray(args[0]) && args[0].length) {
        args[0][0].name = 'replaced';
      }
      orig.apply(thisArg, args);
      return false; // we called orig ourselves, prevent a second call
    },
    function () { /* skipped */ },
    bookmarks  // pass the object that owns the function
  );
});
```

### Useful DOM selectors and globals

| What | Selector / variable |
| ---- | ------------------- |
| Receiver panel | `#openwebrx-panel-receiver` |
| Profile dropdown | `#openwebrx-sdr-profiles-listbox` |
| Theme dropdown | `#openwebrx-themes-listbox` |
| Current profile ID | `currentprofile` (global) |
| Center frequency (Hz) | `center_freq` (global) |
| Demodulator object | `$("#openwebrx-panel-receiver").demodulatorPanel().getDemodulator()` |

### Shipping a CSS file

Drop a `my_plugin.css` next to `my_plugin.js`. The loader fetches it automatically after the JS unless `Plugins.my_plugin.no_css = true` is set.

---

## See also

- [`example_theme`](../example_theme) — how to add a new colour theme
- [`utils`](../utils) — `wrap_func`, `on_ready`, `deepMerge`, `fillTemplate`
- [`notify`](../notify) — show toast notifications with `Plugins.notify.show()`
- [`uikit`](../uikit) — dockable panel and settings modal for richer UIs
