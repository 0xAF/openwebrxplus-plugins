---
layout: page
title: "OpenWebRX+ Receiver Plugin: Map"
permalink: /receiver/map
---

OpenWebRX+ includes a native map window, but it is not enabled automatically. No external plugin files are needed.

## Enable

Add this line once to your receiver `init.js`:

```javascript
MapPlugin.init();
```

Refresh the receiver page. A **MAP** button will appear beside the receiver panel and will open the native map in a window without leaving the receiver page.

Do not add `map` to `PluginsToLoad` and do not call `Plugins.load()` for it. This directory contains documentation only; all map functionality comes from OpenWebRX+.

`MapPlugin` requires a recent OpenWebRX+ version. If the browser console reports that `MapPlugin` is undefined, update OpenWebRX+ before enabling it.

## init.js

Learn how to [configure receiver plugins](/openwebrxplus-plugins/#beginner-quickstart).
