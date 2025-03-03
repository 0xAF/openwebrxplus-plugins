---
layout: page
title: "OpenWebRX+ Receiver Plugin: Tune Precise"
permalink: /receiver/tune_precise
---

This plugin is an implementation of a feature we saw on rikmotik.ru for precise frequency tuning without a mouse scroll, but using buttons instead.

It adds six buttons in your receiver's panel to precisely tune the frequency up and down with different steps.

Default steps are 10kHz, 1kHz, 500Hz. To change the steps see below.

## Preview

![tune_precise](tune_precise/tune_precise.jpg "Preview")

## Load

Add this lines in your `init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/tune_precise/tune_precise.js');
```

## Configure

To configure the steps, add a setup line before the Plugin.load() call.
You should provide 3 steps in JS array, starting from the biggest one.
All steps should be provided in Hz.

```js
Plugins.tune_precise_steps = [12500, 5000, 1000]; // 12.5kHz, 5kHz, 1kHz
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/tune_precise/tune_precise.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
