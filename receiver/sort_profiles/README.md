---
layout: page
title: "OpenWebRX+ Receiver Plugin: Sort Profiles by NAME"
permalink: /receiver/sort_profiles
---

This `receiver` plugin will sort your profile list by *name* (__NOT__ by frequency)  
This plugin is more an example for devs, than useful to users.

The plugin depends on [utils](https://0xaf.github.io/openwebrxplus-plugins/receiver/utils) plugin.

## Load

Add this lines in your `init.js` file:

```js
await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/sort_profiles/sort_profiles.js');
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
