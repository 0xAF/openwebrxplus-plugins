---
layout: page
title: "OpenWebRX+ Receiver Plugin: Minimap"
permalink: /receiver/minimap
---

This is `utility` plugin. It adds a minimap to receiver page, dont neet to open the map page.

## Load

Add this line in your `init.js` file (await so plugins depending on notify run after it is ready):

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/minimap/minimap.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
