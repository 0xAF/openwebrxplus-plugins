---
layout: page
title: "OpenWebRX+ Receiver Plugin: Doppler"
permalink: /receiver/doppler
---

This `receiver` plugin will track the Doppler shift frequency of a chosen satellite. Useful for SSTV/Packet.

This plugin started as a port of [work](https://github.com/studentkra/OpenWebRX-Doppler) by [Sergey Osipov](https://github.com/studentkra).  
Then I switched to [CelesTrak JSON API](https://celestrak.org/) and created Satellite Finder modal window.

## Preview

![doppler](doppler/doppler.png "Preview")

## Usage

 1. Open the Satellite finder window to choose a satellite or enter the SatID if you know it.
 2. Click TRACK.

The Satellite Finder window will help you find a satellite and will give useful information on each satellite.
![doppler1](doppler/doppler1.png "FindSat")

## Load

Add this line in your `init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/doppler/doppler.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
