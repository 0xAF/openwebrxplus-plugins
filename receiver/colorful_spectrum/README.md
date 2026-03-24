---
layout: page
title: "OpenWebRX+ Receiver Plugin: Colorful Spectrum"
permalink: /receiver/colorful_spectrum
---

This `receiver` plugin will colorify your spectrum analyzer.

## Preview

![spectrum](colorful_spectrum/colorful_spectrum.png "Preview")

## Load

Add this line in your `init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/colorful_spectrum/colorful_spectrum.js');
```

## Configuration
You can configure the default waterfall color and the background opacity by setting the parameters in your `init.js` file (before loading the plugin):
```js
window.SpectrumDefaultColor = 'waterfall'; //or whatever color you want
window.SpectrumBackgroundOpacity = 0.0; // Change this number between 0.0 (clear) and 1.0 (pitch black)
```
## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
