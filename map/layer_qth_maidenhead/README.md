---
layout: page
title: "OpenWebRX+ Map Plugin: Maidenhead (QTH) grid"
permalink: /map/layer_qth_maidenhead
---

This `map` plugin will show Maidenhead (QTH) grid on the map as an extra layer.  
This plugin will work up to __OWRX+ v1.2.43__. The later releases have this layer built-in and the plugin will not install even if loaded.  

## Preview

![Maidenhead](maidenhead.png "Preview")

## Load

Add this line in your `map/init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/map/layer_qth_maidenhead/layer_qth_maidenhead.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
