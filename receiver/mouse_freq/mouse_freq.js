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
  if (!Plugins.isLoaded('utils', 0.4)) {
    // try to load the utils plugin
    await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');

    // check again if it was loaded successfully
    if (!Plugins.isLoaded('utils', 0.4)) {
      console.error('mouse_freq plugin depends on "utils" >= 0.4.');
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

  Plugins.utils.on_ready(function () {
    $("#webrx-canvas-container").mousemove(function (e) {
      if (!e.buttons) // no mouse button pressed, so it is not dragging, we can display
        $('#mouse-freq').show().text($(".webrx-mouse-freq").text()).css({
          'left': (e.pageX + 15) + 'px',
          'top': (e.pageY - 5) + 'px'
        });
    })
    .on("mousedown mouseleave", function() { // hide when mouse button is pressed or mouse leaves the canvas
      $("#mouse-freq").hide();
    });
  });

  return true;
}
