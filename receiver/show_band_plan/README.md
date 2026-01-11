---
layout: page
title: "OpenWebRX+ Receiver Plugin: Show Band Plan"
permalink: /receiver/show_band_plan
---

This is a `receiver` plugin to make the 'Show band plan ribbon' setting enabled by default. 
To allow the band plan ribbon to be shown correctly, the change will be made 5 seconds after the page has been loaded.

## Load

Add this lines in your `init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/show_band_plan/show_band_plan.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
