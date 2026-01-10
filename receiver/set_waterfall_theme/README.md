---
layout: page
title: "OpenWebRX+ Receiver Plugin: Set Waterfall Theme"
permalink: /receiver/set_waterfall_theme
---

This is a `receiver` plugin to set the default waterfall theme.  
You can choose between the following standard themes:
- default
- turbo
- ha7ilm
- teejeez
- ocean
- eclipse

If a wrong one will be set a default theme will be used and an error message will be shown in the console.

## Load

Add this lines in your `init.js` file:

```js
Plugins.set_waterfall_theme_theme_value = 'ocean'; // set your desired theme here (see list above)
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/set_waterfall_theme/set_waterfall_theme.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
