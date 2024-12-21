---
layout: page
title: "OpenWebRX+ Receiver Plugin: Tune Checkbox"
permalink: /receiver/tune_checkbox
---

This a one-line `receiver` plugin to make the 'Hold mouse wheel down to tune' setting enabled by default.  
This setting allows you to use the mouse scroll to zoom into the waterfall.  
By default, the state of this checkbox is stored in localStorage in your browser. If you often delete your browser's cache and localStorage contents, this plugin might be useful.

## Load

Add this lines in your `init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/tune_checkbox/tune_checkbox.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
