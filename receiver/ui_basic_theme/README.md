---
layout: page
title: "OpenWebRX+ Receiver Plugin: ui_basic_theme"
permalink: /receiver/ui_basic_theme
---

This `receiver` plugin adds a **UI Basic** theme that reproduces the flat dark
colour palette originally built into the uikit plugin — near-black surfaces with
a subtle cool tint. It is the recommended companion theme for uikit.

## Load

Add to your `init.js` **after** uikit:

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/uikit/uikit.js');
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/ui_basic_theme/ui_basic_theme.js');
```

Then select **UI Basic** in the OWRX+ theme list (Settings → Theme).

## What it does

- Registers a **UI Basic** entry in the OWRX+ theme selector.
- Defines all [`--uikit-*` CSS variables](https://0xaf.github.io/openwebrxplus-plugins/receiver/uikit#--uikit--css-variables) so uikit buttons, text, borders, and accents use the flat dark palette.
- Sets `--theme-color1` / `--theme-color2` so uikit surfaces (panel, tab bar, modal header) adopt matching near-black backgrounds.
- Overrides native OWRX+ `<input>`, `<select>`, and `.openwebrx-button` elements to use a flat dark gradient instead of the default theme appearance, keeping the receiver UI consistent.

## CSS variables defined

| Variable | Value |
| --- | --- |
| `--theme-color1` | `#0c0e12` |
| `--theme-color2` | `#11141a` |
| `--uikit-accent` | `#6f89ff` |
| `--uikit-accent-dim` | `rgba(111,137,255,.25)` |
| `--uikit-btn-bg` | `rgba(255,255,255,.06)` |
| `--uikit-btn-text` | `#e9edf5` |
| `--uikit-btn-primary-bg` | `#3b5bfd` |
| `--uikit-btn-primary-text` | `#ffffff` |
| `--uikit-btn-danger-bg` | `rgba(226,76,76,.15)` |
| `--uikit-btn-danger-border` | `rgba(226,76,76,.4)` |
| `--uikit-btn-danger-text` | `#ff9e9e` |
| `--uikit-btn-ghost-border` | `rgba(255,255,255,.12)` |
| `--uikit-btn-ghost-text` | `#d9dde6` |
| `--uikit-text` | `#f6f7f9` |
| `--uikit-text-dim` | `#cdd2db` |
| `--uikit-text-muted` | `#9aa3b2` |
| `--uikit-border` | `rgba(255,255,255,.08)` |
| `--uikit-border-strong` | `rgba(255,255,255,.35)` |
| `--uikit-border-mid` | `rgba(255,255,255,.12)` |
| `--uikit-input-bg` | `linear-gradient(#373737, #4F4F4F)` |
| `--uikit-input-bg-color` | `#373737` |
| `--uikit-input-option-bg` | `#373737` |
| `--uikit-native-btn-bg` | `linear-gradient(#373737, #4F4F4F)` |
| `--uikit-native-btn-bg-color` | `#373737` |
| `--uikit-native-btn-hover-bg` | `#474747` |

## Creating a custom uikit theme

To create your own theme, register a theme option in the OWRX+ theme selector and
define any `--uikit-*` variables you want to override on `body.theme-yourtheme`:

```js
// yourtheme.js
Plugins.yourtheme = Plugins.yourtheme || {};
Plugins.yourtheme._version = 0.1;
Plugins.yourtheme.no_css = false; // loads yourtheme.css automatically

Plugins.yourtheme.init = function () {
    $('#openwebrx-themes-listbox').append(
        $('<option>').val('yourtheme').text('Your Theme')
    );
    return true;
};
```

```css
/* yourtheme.css */
body.theme-yourtheme {
    --theme-color1: #1a0a2e;
    --theme-color2: #2a1045;
    --uikit-accent: #c084fc;
    --uikit-btn-primary-bg: #7c3aed;
    /* ... only override what you need */
}
```

uikit reads all `--uikit-*` values with fallbacks, so undefined variables
automatically use the built-in dark defaults.

## Code

Code is in the [Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/ui_basic_theme).
