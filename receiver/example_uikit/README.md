---
layout: page
title: "OpenWebRX+ Receiver Plugin: UIKit Example (for devs)"
permalink: /receiver/example_uikit
---

This `receiver` plugin is an interactive demo for plugin developers.
It showcases every feature of the **uikit** plugin (v0.2+) with working,
copy-paste-ready code.

**There is no point in enabling this plugin for end users.**

## What it demonstrates

- **Panel tab** with buttons for each feature
- **Settings tab** added to the UIKit settings modal
- **Modals** — basic, close-left, no title bar, floating (no backdrop), resizable, custom border, lifecycle hooks
- **Dialogs** — `info()` and `question()` with Promise-based flow
- **Toasts** — all four types, with title, persistent (no timeout), dismiss all
- **Loading overlay** — on panel tab and on modal content

## Load

Add to your `init.js` after `uikit`:

```js
await Plugins.load('uikit');
await Plugins.load('example_uikit');
```

## Dependencies

- `uikit` >= 0.2

## Code

Code is in the [Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/example_uikit).
