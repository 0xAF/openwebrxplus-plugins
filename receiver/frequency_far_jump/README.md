
# OWRX+ Receiver Plugin: frequency_far_jump

This a simple `receiver` plugin to allow jumping to a frequency outside the boundary of the currently selected profile, by typing it in the receiver's frequency dial.

**Beware of the limitations of this approach:** the modulation and the other settings of the receiver **will stay the same** when jumping to the new, far frequency.

Please note that you **must supply the magic key** for your OpenWebRX+ instance if you have one configured with a '*#key=[KEY]*' at the end of the URL.

The plugin depends on [utils](https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/) plugin.


# load
1. Add this lines in your `init.js` file:
```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js')
    .then(async function () {
        Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/frequency_far_jump/frequency_far_jump.js');
    });
```

2. In case you are using OWRX+ installed from the package repository or you are using the Raspberry Pi images, **please invalidate the cache by restarting the corresponding services**:

`sudo systemctl restart varnish nginx`

# init.js
You can find more info on `init.js` [on GitHub pages](https://0xaf.github.io/openwebrxplus-plugins/) or directly in [0xAF's GitHub repo](https://github.com/0xAF/openwebrxplus-plugins).
