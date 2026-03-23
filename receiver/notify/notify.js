/*
 * Plugin: Provides notifications for other plugins
 *
 * Usage:
 *   Plugins.notify.send('some notification');
 *
 * License: MIT
 * Copyright (c) 2023 Stanislav Lechev [0xAF], LZ2SLL
 *
 */

// Notify plugin version
Plugins.notify._version = 0.1;

// Initialize the plugin
Plugins.notify.init = function () {
  Plugins.notify.show = function (text) {
    // Delegate to uikit.toast() if available (uikit >= 0.2)
    if (typeof Plugins !== 'undefined' && Plugins.uikit && typeof Plugins.uikit.toast === 'function') {
      Plugins.uikit.toast(text, { type: 'info', timeout: 2000 });
      return;
    }

    // Fallback: original jQuery-based notification
    if ($("#plugins-notification").length < 1)
      $("body").append("<div id='plugins-notification'></div>");

    $("#plugins-notification").html(text);
    $("#plugins-notification").fadeIn('fast');

    clearTimeout(Plugins.notify.notify_timeout);
    Plugins.notify.notify_timeout = setTimeout(() => $("#plugins-notification").fadeOut("fast"), 1000);
  };

  return true;
}
