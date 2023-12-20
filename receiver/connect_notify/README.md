# OWRX+ Receiver Plugin: connect/disconnect notifications

This `receiver` plugin will:
 - Send a chat message to all users when you connect/disconnect to SDR
 - Show notification when another user is connected/disconnected to SDR

The plugin depends on [notify](https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/) plugin.


# load
Add this line in your `init.js` file:
```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/connect_notify/connect_notify.js');
```

# init.js
You can find more info on `init.js` [on github pages](https://0xaf.github.io/openwebrxplus-plugins/) or directly in [my github repo](https://github.com/0xAF/openwebrxplus-plugins)

# preview
![shortcuts](connect_notify.png "Preview")
