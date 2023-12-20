/*
 * Plugin: Provides notifications for other plugins
 *
 * Usage:
 *   Plugins.notify.send('some notification');
 *
 */

// Notify plugin version
Plugins.notify._version = 0.1;

// Initialize the plugin
Plugins.notify.init = function () {
  Plugins.notify.show = function (text) {
    // create the message div if it's not there
    if ($("#plugins-notification").length < 1)
      $("body").append("<div id='plugins-notification'></div>");

    // set the message text
    $("#plugins-notification").html(text);

    // show the message
    $("#plugins-notification").fadeIn('fast');

    // clear the timeout of previous message (if exists)
    clearTimeout(Plugins.notify.notify_timeout);

    // timeout the current message
    Plugins.notify.notify_timeout = setTimeout('$("#plugins-notification").fadeOut("fast")', 1000);

  };

  return true;
}
