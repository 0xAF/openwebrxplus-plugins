/*
 * Plugin: User connect notification
 *
 * - Send a chat message to all users when you connect to SDR
 * - Show notification when another user is connected to SDR
 *
 * License: MIT
 * Copyright (c) 2023 Stanislav Lechev [0xAF], LZ2SLL
 */

// no css for this plugin
Plugins.connect_notify.no_css = true;

// Initialize the plugin
Plugins.connect_notify.init = async function () {

  if (!Plugins.isLoaded('notify', 0.1)) {
    // try to load the notify plugin
    await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/notify/notify.js');

    // check again if it was loaded successfully
    if (!Plugins.isLoaded('notify', 0.1)) {
      console.error('connect_notify plugin depends on "notify >= 0.1".');
      return false;
    } else {
      Plugins._debug('Plugin "notify" has been loaded as dependency.');
    }
  }

  Plugins.connect_notify.last = -1;
  $(document).on('server:clients:after', function (e, data) {
    var users = data - 1;
    if (Plugins.connect_notify.last < 0) {
      // this is our connection, so initialize.
      Plugins.connect_notify.last = users;
      // delay 100ms so the page initialize
      setTimeout(function () {
        var nick = LS.has('chatname') ? LS.loadStr('chatname') : 'Unknown';
        Chat.sendMessage('Connected.', nick);
      }, 100);
      return;
    }
    if (users != Plugins.connect_notify.last) {
      Plugins.notify.show('User ' + (
        (users > Plugins.connect_notify.last) ? 'Connected' : 'Disconnected'
      ));
      Plugins.connect_notify.last = users;
    }
  });
  $(window).bind('beforeunload', function () {
    var nick = LS.has('chatname') ? LS.loadStr('chatname') : 'Unknown';
    Chat.sendMessage('Disconnected.', nick);
  });

  return true;
}
