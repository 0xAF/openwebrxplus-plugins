---
layout: page
title: "OpenWebRX+ Receiver Plugin: Doppler"
permalink: /receiver/doppler
---

This `receiver` plugin will track the Doppler shift frequency of a chosen satellite. Useful for SSTV.

This plugin is based on the [work](https://github.com/studentkra/OpenWebRX-Doppler) of [Sergey Osipov](https://github.com/studentkra) and uses [this TLE API](https://tle.ivanstanojevic.me/).

## Preview

![doppler](doppler/doppler.png "Preview")

## Usage

 1. Click on the "Find SAT" button and find a satellite to track.
 2. Enter SatID
 3. Click TRACK.

To find the SatID, click the "Find SAT" button and you will be sent to a webpage with satellites to choose from. Once you find your satellite, click on it and you will be presented with some extra information where you can see the SatID.
![doppler1](doppler/doppler1.png "FindSat")

## Load

Add this line in your `init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/doppler/doppler.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
