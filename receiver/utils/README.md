---
layout: page
title: "OpenWebRX+ Receiver Plugin: Utils (utility)"
permalink: /receiver/utils
---

This `utility` plugin will give a function wrapping method and will send some events.  
This plugin is a dependency for almost all plugins.


L :oad
Add this lines in your `init.js` file:
```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js').then(async function () {
  // load the rest of your plugins here
});
```

# init.js
Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
