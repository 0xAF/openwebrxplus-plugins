/*
 * Plugin: Screen Reader - Provide spoken notifications to users with Assistive Technology
 *
 * - Add invisible div for screen readers
 * - Catch events and write to the div, so the screen reader will speak the content.
 *
 * License: MIT
 * Copyright (c) 2024 Stanislav Lechev [0xAF], LZ2SLL
 */

// no css for this plugin
Plugins.screen_reader.no_css = true;

// Plugins.screen_reader.log_messages = true;

// Initialize the plugin
Plugins.screen_reader.init = async function () {

  // Check if utils plugin is loaded
  if (!Plugins.isLoaded('utils', 0.1)) {
    // try to load the utils plugin
    await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');

    // check again if it was loaded successfuly
    if (!Plugins.isLoaded('utils', 0.1)) {
      console.error('screen_reader plugin depends on "utils >= 0.1".');
      return false;
    } else {
      Plugins._debug('Plugin "utils" has been loaded as dependency.');
    }
  }

  // create new screen reader div if it's not there
  if ($("#screen-reader").length < 1)
    $("body").append(
      "<div id='screen-reader' style='position:absolute; left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;' role='status'></div>"
    );

  // create speaker function
  Plugins.screen_reader.speak = function (text) {
    if (document.owrx_initialized) {
      clearTimeout(this.timeout);
      $("#screen-reader").append(text+"<br/>\n");
      this.timeout = setTimeout(function () { $("#screen-reader").html('') }, 3000); // clear after 3 secs
      // console.log('DEBUG:', $('#screen-reader').text());
      if (Plugins.screen_reader.log_messages) divlog(text);
    }
  }

  // $(document).on('event:profile_changed', function (e, data) {
  //   Plugins.screen_reader.speak("Profile " + data);
  // });
  $(document).on('event:owrx_initialized', function (e, data) {

    $(document).on('server:config:after', function (e, data) {
      if (data.profile_id && data.sdr_id) { // profile was changed
        var name = $('#openwebrx-sdr-profiles-listbox')
          .find('option[value="' + data.sdr_id + '|' + data.profile_id + '"]').text();
        if (name) Plugins.screen_reader.speak("Profile: " + name);
      }
    });

    Plugins.utils.wrap_func(
      'setMode',
      function (orig, thisArg, args) { // beforeCB -> return true to call the original
        if (this.last_mode === args[0]) return true; // same mode, no need to announce
        Plugins.screen_reader.speak("Mode: " + args[0]);
        this.last_mode = args[0];
        return true;
      },
      function (res) { // afterCB
      },
      DemodulatorPanel.prototype
    );
  });


  // $(document).on('server:clients:after', function (e, data) {
  // });

  // $(window).bind('beforeunload', function () {
  // });

  return true;
}
