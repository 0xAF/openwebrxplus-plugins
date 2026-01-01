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
window.smeter_config_global = {
    calibration_offset_hf: 0,  // Calibration for HF (<30MHz) in dB
    calibration_offset_vhf: 0, // Calibration for VHF/UHF (>30MHz) in dB
    hide_original: false,      // Set to true to hide the original S-meter
    show_text: true            // Set to false to hide the text below the S-meter
};
```

### Parameter Explanation
* **calibration_offset_hf**: Adds this value (in dB) to the measured shortwave signal. Useful for compensating for cable attenuation or gain.
* **calibration_offset_vhf**: Same for frequencies above 30 MHz.
* **hide_original**: If set to `true`, the standard OpenWebRX S-meter is hidden, and only this plugin is displayed.
* **show_text**: If set to `false`, the text display (S-value and dBm) below the bar is hidden.

## Note on Accuracy

Marat, the developer of OpenWebRX+, states:
> "I strongly doubt that many users will manually calibrate their OWRX+ instances. That is exactly why an S-Meter is not integrated into OWRX+ by default: I simply cannot guarantee that correct values are displayed."

## Lizenz

MIT
