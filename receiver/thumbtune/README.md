---
layout: default
title: ThumbTune
parent: Receiver Plugins
---

# ThumbTune

A minimalistic, zero-CPU idle floating control panel for OpenWebRX+. 
Designed specifically for easy one-thumb tuning and zooming on mobile devices (e.g., Safari on iPad/iPhone).

On newer OpenWebRX+ versions, ThumbTune opens in a movable, resizable plugin window. Use the **ThumbTune** button in the plugin stack to reopen it after closing. On older versions, it keeps its original floating panel and dragging behavior.

![Screenshot](thumbtune.jpg)

## Features
* **Mobile Optimized:** Large touch-friendly numpad and buttons.
* **Floating & Dragable:** Move it anywhere on the screen so it doesn't block the waterfall.
* **Center-frequency jumps:** Double arrows shift the SDR center by a quarter of the bandwidth. They appear when a magic key is available, including one set by the `magic_key` plugin; the server must also allow center-frequency changes.
* **Zero-CPU Idle:** Event listeners only trigger upon interaction, saving mobile battery.

## Usage
To enable this plugin, add `'thumbtune'` to the `PluginsToLoad` array in your `receiver/init.js` configuration file.

## Code
[Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/thumbtune)
