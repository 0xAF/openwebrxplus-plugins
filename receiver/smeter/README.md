---
layout: page
title: "OpenWebRX+ Receiver Plugin: S-Meter"
permalink: /receiver/smeter
---

This `receiver` plugin replaces the default S-meter with a high-resolution, graphical bar display. It automatically switches between HF and VHF/UHF standards.

## Preview

!smeter

## Load

Add this line in your `init.js` file:

```js
Plugins.load('smeter');
```

## Configuration

You can configure the plugin by creating or editing `config.js` in the plugin directory:

```js
Plugins.smeter_config = {
    calibration_offset_hf: 0,  // Calibration for HF (<30MHz) in dB
    calibration_offset_vhf: 0, // Calibration for VHF/UHF (>30MHz) in dB
    hide_original: false       // Set to true to hide the original S-meter
};
```

### Parameter Explanation
* **calibration_offset_hf**: Adds this value (in dB) to the measured shortwave signal. Useful for compensating for cable attenuation or gain.
* **calibration_offset_vhf**: Same for frequencies above 30 MHz.
* **hide_original**: If set to `true`, the standard OpenWebRX S-meter is hidden, and only this plugin is displayed.

## Lizenz

MIT
