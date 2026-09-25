---
layout: page
title: "OpenWebRX+ Receiver Plugin: MagicKey"
permalink: /receiver/magic_key
---

**Deprecated on OpenWebRX+ 1.2.125 and newer.** Use the built-in `KeyPlugin` instead. Add `KeyPlugin.init();` once in your receiver `init.js` to get a Magic Key input in the receiver Settings section. The built-in plugin is available but is not started automatically.

This `receiver` plugin will allow you to set the MagicKey without typing it in the browser's address bar.

## Preview

![magic_key](magic_key/magic_key.png "Preview")

## Load

For older OpenWebRX+ versions only, add this line in your `init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/magic_key/magic_key.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).

## Code

[Github repo](https://github.com/0xAF/openwebrxplus-plugins/tree/main/receiver/magic_key)
