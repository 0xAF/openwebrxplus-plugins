---
layout: page
title: "OpenWebRX+ Receiver Plugin: Mouse Freq"
permalink: /receiver/mouse_freq
---

This `receiver` plugin will:

* Show the frequency next to the mouse cursor when it is on the waterfall

(I saw this on https://rikmotik.ru and decided to make a plugin.)

The plugin depends on [notify](https://0xaf.github.io/openwebrxplus-plugins/receiver/utils) v0.2 plugin.

## Preview

![mouse_freq](mouse_freq/mouse_freq.png "Preview")

## Load

Add this line in your `init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/mouse_freq/mouse_freq.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
