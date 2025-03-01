/*
 * Plugin: Mouse Freq - show frequency under mouse pointer
 *
 * I saw this on https://rikmotik.ru/ and decided to make a plugin.
 *
 * License: MIT
 * Copyright (c) 2025 Stanislav Lechev [0xAF], LZ2SLL
 */

// no css for this plugin
Plugins.mouse_freq.no_css = true;

// Initialize the plugin
Plugins.mouse_freq.init = async function () {

  // Check if utils plugin is loaded
  if (!Plugins.isLoaded('utils', 0.2)) {
    // try to load the utils plugin
    await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');

    // check again if it was loaded successfully
    if (!Plugins.isLoaded('utils', 0.2)) {
      console.error('mouse_freq plugin depends on "utils >= 0.2".');
      return false;
    } else {
      Plugins._debug('Plugin "utils" has been loaded as dependency.');
    }
  }

  // create new mouse freq div if it's not there
  if ($("#mouse-freq").length < 1)
    $('<div id="mouse-freq" role="status"></div>').css({
      position: "absolute",
      zIndex: 999,
      fontSize: "x-small",
      color: "white",
      fontWeight: 800,
      display: "none",
      borderRadius: "5px",
      border: "1px solid black",
      backgroundColor: "rgba(0,0,0, .5)"
    }).appendTo("body");

  $(document).on('event:owrx_initialized', function (e, data) {
    $("#webrx-canvas-container").mousemove(function (pos) {
      $('#mouse-freq').show().text($(".webrx-mouse-freq").text()).css({
        'left': (pos.pageX + 15) + 'px',
        'top': (pos.pageY - 5) + 'px'
      });
    }).mouseleave(function () {
      $("#mouse-freq").hide();
    });
  });

  return true;
}
