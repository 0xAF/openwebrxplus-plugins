---
layout: page
title: "OpenWebRX+ Receiver Plugin: ui_chat"
permalink: /receiver/ui_chat
---

This `receiver` plugin absorbs the OWRX+ chat/log panel into the uikit
dockable panel as a **Chat** tab. All system log messages and user chat
messages appear there instead of in the original floating modal.

## Load

Add to your `init.js` after uikit:

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/uikit/uikit.js');
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/ui_chat/ui_chat.js');
```

`ui_chat` will auto-load `utils` and `uikit` if they are not already loaded,
so the first two lines are optional.

## Dependencies

- `utils` >= 0.6
- `uikit` >= 0.3

## Behaviour

- A **Chat** tab is added to the uikit panel (order 200).
- Any messages that were already in the log before the plugin loaded (e.g. the connection greeting) are copied into the tab on init.
- All subsequent messages — system log, SDR errors, and user chat — are mirrored to the tab as they arrive. The original `#openwebrx-panel-log` panel is hidden but kept in the DOM so existing OWRX+ code continues to work.
- The original panel is prevented from popping up on errors (`toggle_panel` is intercepted).
- When the server enables chat (`allow_chat: true`), a **nickname + message** input row appears at the bottom of the tab. Sending calls `Chat.sendMessage()` directly.
- When chat is disabled (`allow_chat: false`), the input row is hidden and the tab acts as a read-only log viewer.
- Messages auto-scroll to the bottom as new ones arrive.

## Code

Code is in the [Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/ui_chat).
