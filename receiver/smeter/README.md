---
layout: page
title: "OpenWebRX+ Receiver Plugin: S-Meter"
permalink: /receiver/smeter
---

This `receiver` plugin adds a new or replaces the default S-meter with a high-resolution, graphical bar display. It automatically switches between HF and VHF/UHF standards and offers extensive customization options via a built-in menu.

## Preview

![S-Meter Preview](https://0xaf.github.io/openwebrxplus-plugins/receiver/smeter/smeter.jpg)

## Load

Add this line in your `init.js` file:

```js
// load remote
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/smeter/smeter.js');
// or local
Plugins.load('smeter');
```

## Configuration

You can configure the plugin by setting the parameters in your `init.js` file (before loading the plugin):

```js
// --- S-METER CONFIGURATION (init.js) ---
// These values must be set BEFORE Plugins.load('smeter')
window.smeter_config_global = {
    calibration_offset_hf: 0,  // Calibration for HF (<30MHz) in dB
    calibration_offset_vhf: 0, // Calibration for VHF/UHF (>30MHz) in dB
    s0_offset_hf: 0,           // S0 Level adjustment for HF
    s0_offset_vhf: 0,          // S0 Level adjustment for VHF
    hide_original: false,      // Set to true to hide the original S-meter
    show_text: true,           // Set to false to hide the text below the S-meter
    use_iaru_vhf: true,        // Set to true to use IARU VHF standard (S9 = -93dBm)
    smeter_delay: 0            // Delay in ms to sync with audio
};

```

### Parameter Explanation
* **calibration_offset_hf**: Adds this value (in dB) to the measured shortwave signal. Useful for compensating for cable attenuation or gain.
* **calibration_offset_vhf**: Same for frequencies above 30 MHz.
* **s0_offset_hf/vhf**: Adjusts the S0 reference level (start of the scale). Useful if the noise floor is displayed too high.
* **hide_original**: If set to `true`, the standard OpenWebRX S-meter is hidden, and only this plugin is displayed.
* **show_text**: If set to `false`, the text display (S-value and dBm) below the bar is hidden.
* **use_iaru_vhf**: If set to `true` (default), the IARU standard for VHF (S9 = -93dBm) is used. If `false`, the HF standard (S9 = -73dBm) is used for all frequencies.
* **smeter_delay**: Adds a delay (in milliseconds) to the S-meter display to synchronize it with the audio (useful for web SDR latencies).

## Usage
**Long Press (> 800ms)** on the S-Meter panel to open the **Settings Menu**.

### Settings Menu
* **HF/VHF Calibration (S9)**: Adjusts the offset (in dB) to calibrate the S9 reference point.
* **HF/VHF S0 Level**: Adjusts the S0 reference point. This changes the sensitivity/linearity at the lower end of the scale without affecting S9.
* **Auto S0**: Automatically calibrates the S0 level so that the current noise floor is displayed as S2.
* **IARU VHF Standard**: Toggles between the IARU standard for VHF (S9 = -93dBm) and the HF standard (S9 = -73dBm). Default is enabled.
* **Sync Delay**: Adjusts the time delay of the S-meter to match the audio output.
* **Export/Import**: Save your settings to a JSON file or load them back.
* **Default**: Resets all settings to their default values.

*Note: Controls for the frequency band not currently in use (HF vs VHF) are automatically disabled.*
*Note: Settings changed in the menu are saved in the browser's local storage and persist across reloads.*

## Note on Accuracy

Marat, the developer of OpenWebRX+, states:
> **"I strongly doubt that many users will manually calibrate their OWRX+ instances. That is exactly why an S-Meter is not integrated into OWRX+ by default: I simply cannot guarantee that correct values are displayed."**

## License

MIT
