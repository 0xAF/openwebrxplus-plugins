---
layout: page
title: "OpenWebRX+ Receiver Plugin: Minimap"
permalink: /receiver/minimap
---

This receiver plugin opens the map without leaving the receiver page. On current OpenWebRX+, it uses the built-in `MapPlugin` button and window. If the MAP button already exists, the plugin reuses it. On older versions without `MapPlugin`, the plugin keeps its original minimap popup.

The `width`, `height`, `right`, `bottom`, `remember_position`, `remember_size`, and `resizable` plugin settings apply to the older popup. The built-in Map window manages its own position and size.

## Load

Add this line in your `init.js` file (await so plugins depending on notify run after it is ready):

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/minimap/minimap.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).

## Code

[Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/minimap)
