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

A small **SCA** button is added to the bottom left of the receiver panel. Clicking this button opens a floating, draggable window containing the scanner controls.

### SCA Button Status
* **Grey**: Scanner is stopped and window is closed.
* **Green**: Scanner window is open.
* **Yellow**: Scanner is running in the background (window closed).

### Scanner Window Buttons
* **Scan**: Start or Stop scanning.
    * **Long Click (> 800ms)**: Opens the **Scan Options** menu (indicated by a triangle).
* **Skip**: Skips the current frequency (only active when scanning).
* **Block**: Adds the current frequency to the blacklist.
    * **Long Click (> 800ms)**: Opens the **Block Options** menu (indicated by a triangle).
* **Setup**: Opens the **Scanner Setup & Blacklist** menu.

### Scan Options (Scan Button)
* **Scan Modes**:
    * **Normal (Carrier)**: Stays on frequency while a signal is present (plus a short delay).
    * **Stop on signal**: Stops scanning completely when a signal is found.
    * **10s Sample**: Listens for 10 seconds, then continues scanning regardless of the signal.
* **Delay**: Set the wait time after signal loss (Standard, 5s, 10s).
* **Filter: Only Analog**: If enabled, the scanner automatically skips frequencies marked as digital (DMR, YSF, D-Star, etc.) in your bookmarks.

### Block Options (Block Button)
* **Always Show Blocked Ranges**: If enabled, blocked frequencies and ranges are visualized as colored bars on the waterfall even when the scanner is not running.
* **Color**: Cycles through different colors for the blocked range visualization (Red, Orange, Yellow, Green, Blue, Purple, White).
* **Clear Visible Blocked Ranges**: Removes all blacklist entries that are currently visible in the waterfall view.
* **Remove Blocked Range**: Allows you to remove a specific blocked range or frequency by clicking on it in the waterfall.
* **Block Range**: Allows you to select a frequency range on the waterfall to block. Click and drag to define the range.

### Scanner Setup (Setup Button)
* **Export / Import Plugin Settings**: Save or load the plugin configuration including the blacklist (JSON).
* **Manage Blacklist**: Opens a dialog to manually manage the blacklist entries.
* **Clear Blacklist**: Removes all blocked frequencies.

### Interaction
* **Squelch**: The scanner uses the current squelch level set by the slider in the OpenWebRX+ interface.
* **Manual Tuning**: Clicking on the waterfall while scanning stops the scanner.
* **Tuning Step**: The scanner respects the current tuning step size.
* **Modulation**: The scanner is active only for AM and FM modes.
* **Visualizer**: Blocked frequencies and ranges are shown as semi-transparent bars on the waterfall.

## Configuration

No manual configuration in `init.js` is required. The plugin automatically adapts to the current profile, center frequency, and bandwidth.

## License

MIT
