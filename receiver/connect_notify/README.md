---
layout: page
title: "OpenWebRX+ Receiver Plugin: Connect/Disconnect notifications"
permalink: /receiver/connect_notify
---

This `receiver` plugin will:
 - Send a chat message to all users when you connect/disconnect to SDR
 - Show notification when another user is connected/disconnected to SDR

The plugin depends on [notify](https://0xaf.github.io/openwebrxplus-plugins/receiver/notify) plugin.

# Preview
![connect](connect_notify.png "Preview")

# Load
Add this line in your `init.js` file:
```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/connect_notify/connect_notify.js');
```

# init.js
Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).
