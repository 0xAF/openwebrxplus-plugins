---
layout: page
title: "OpenWebRX+ Receiver Plugin: Minimap"
permalink: /receiver/minimap
---

**Deprecated on OpenWebRX+ versions with `MapPlugin`.** Use the built-in map window instead. Add `MapPlugin.init();` once in your receiver `init.js` to create its **MAP** button; the built-in plugin is available but is not started automatically.

This receiver plugin opens the map without leaving the receiver page. If loaded on a version with `MapPlugin`, it delegates to the built-in button and window, reusing an existing **MAP** button. On older versions without `MapPlugin`, it keeps its original minimap popup.

The `width`, `height`, `right`, `bottom`, `remember_position`, `remember_size`, and `resizable` plugin settings apply to the older popup. The built-in Map window manages its own position and size.

## Load

For older OpenWebRX+ versions only, add this line in your `init.js` file:

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/minimap/minimap.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).

## Code

[Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/minimap)
