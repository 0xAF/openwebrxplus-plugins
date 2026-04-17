---
layout: page
title: "OpenWebRX+ Receiver Plugin: ui_magic_key"
permalink: /receiver/ui_magic_key
---

This `receiver` plugin adds a **Magic Key** tab in the UIKit settings modal,
allowing you to set the magic key for authenticated access without typing it in
the browser's address bar. The key is saved to `localStorage` and restored
automatically on the next page load.

## Load

Add to your `init.js`:

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/uikit/uikit.js');
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/ui_magic_key/ui_magic_key.js');
```

Note: `ui_magic_key` will auto-load `utils` and `uikit` if they are not already loaded, so the first two lines are optional.

## Dependencies

- `utils` >= 0.3
- `uikit` >= 0.3

## Behaviour

- The key input uses `type="password"` so the value is masked while typing.
- On **Set**, the key is saved to `localStorage` and immediately applied to the demodulator via `setMagicKey()`.
- On **Clear**, the key is removed from `localStorage` and the stored value is reset.
- On page load, any previously saved key is restored and applied automatically before the first WebSocket connection.
- `getMagicKey()` on the demodulator panel is wrapped so the plugin's stored key takes priority over any value from the URL query string.

## Code

Code is in the [Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/ui_magic_key).
