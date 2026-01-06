---
layout: page
title: "OpenWebRX+ Receiver Plugin: Freq Scanner"
permalink: /receiver/freq_scanner
---

This `receiver` plugin adds a versatile frequency scanner to OpenWebRX+. It scans the currently visible frequency range (or profile range) for signals exceeding the squelch threshold. It includes features like a blacklist, digital signal filtering, and multiple scan modes.

## Preview

![freq_scanner Preview](https://0xaf.github.io/openwebrxplus-plugins/receiver/freq_scanner/freq_scanner.jpg)

## Load

Add this line in your `init.js` file:

```js
//remote
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/freq_scanner/freq_scanner.js');
// local
Plugins.load('freq_scanner');
```

## Usage

A **Scanner** section is added to the receiver panel.

### Buttons
* **Scan**: Start or Stop scanning.
    * **Long Click (> 800ms)**: Opens the **Scan Options** menu.
* **Skip**: Skips the current frequency (only active when scanning).
* **Block**: Adds the current frequency to the blacklist.
* **List**: Opens the **Blacklist Management** menu.

### Scan Options (Scan Button)
* **Scan Modes**:
    * **Normal (Carrier)**: Stays on frequency while a signal is present (plus a short delay).
    * **Stop on signal**: Stops scanning completely when a signal is found.
    * **10s Sample**: Listens for 10 seconds, then continues scanning regardless of the signal.
* **Delay**: Set the wait time after signal loss (Standard, 5s, 10s).
* **Filter: Only Analog**: If enabled, the scanner automatically skips frequencies marked as digital (DMR, YSF, D-Star, etc.) in your bookmarks.

### Blacklist Management (List Button)
* **Release Frequency**: Removes the current frequency from the blacklist.
* **Clear Blacklist**: Removes all blocked frequencies.
* **Export / Import**: Save or load the blacklist (JSON).

### Interaction
* **Squelch**: The scanner uses the current squelch level set by the slider in the OpenWebRX+ interface.
* **Manual Tuning**: Clicking on the waterfall while scanning stops the scanner.
* **Tuning Step**: The scanner respects the current tuning step size.
* **Modulation**: The scanner is active only for AM and FM modes.

## Configuration

No manual configuration in `init.js` is required. The plugin automatically adapts to the current profile, center frequency, and bandwidth.

## License

MIT
