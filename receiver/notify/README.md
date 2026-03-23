---
layout: page
title: "OpenWebRX+ Receiver Plugin: Notify"
permalink: /receiver/notify
---

**Deprecated:** Use `Plugins.uikit.toast()` (uikit >= 0.2) instead. This plugin now delegates to `uikit.toast()` when uikit is loaded, falling back to its own display otherwise.

This is a `utility` plugin. It provides notifications for other plugins.

## Usage

```js
Plugins.notify.show('some notification');
```

## Load

Add this line in your `init.js` file (await so plugins depending on notify run after it is ready):

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
