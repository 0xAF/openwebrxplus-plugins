---
layout: page
title: "OpenWebRX+ Receiver Plugin: Frequency Far Jump"
permalink: /receiver/frequency_far_jump
---

This a simple `receiver` plugin to allow jumping to a frequency outside the boundary of the currently selected profile, by typing it in the receiver's frequency dial.

**Beware of the limitations of this approach:** the modulation and the other settings of the receiver **will stay the same** when jumping to the new, far frequency.

Please note that you **must** enable *"Allow users to change center frequency"* and in case you have set a **magic key**, you will have to provide it with a '*#key=[KEY]*' at the end of the URL.

The plugin depends on [utils](https://0xaf.github.io/openwebrxplus-plugins/receiver/utils) plugin.

## Load

Add this lines in your `init.js` file:

```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js').then(async function () {
  Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/frequency_far_jump/frequency_far_jump.js');
});
```

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
