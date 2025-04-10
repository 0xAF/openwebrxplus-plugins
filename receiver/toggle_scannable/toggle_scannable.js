/*
 * Plugin: ToggleScannable - Toggle scannable state of the bookmarks in the receiver
 *
 * License: MIT
 * Copyright (c) 2024 Stanislav Lechev [0xAF], LZ2SLL
 */


// no css for this plugin
// Plugins.toggle_scannable.no_css = true;

// Initialize the plugin
Plugins.toggle_scannable.init = async function () {
  // Check if utils plugin is loaded
  if (!Plugins.isLoaded('utils', 0.3)) {
    console.error('ToggleScannable plugin depends on "utils >= 0.3".');
    return false;
  }

  $(document).on('event:owrx_initialized', function () {
    // Call the wrap method of utils plugin
    Plugins.utils.wrap_func(
      'replace_bookmarks', // function to wrap
      function (orig, thisArg, args) { // before callback
        return true; // execute original function
      },
      function (res) { // after callback
        Plugins.toggle_scannable.rework_bookmarks();
        return undefined; // this will return original value from the original function
      },
      bookmarks // this is the object, where the replace_bookmarks() function should be found
    );
  });

  return true;
}

Plugins.toggle_scannable.rework_bookmarks = function () {
  $('#openwebrx-bookmarks-container').children().each(function (i, b) {
    const data = $(b).data();
    if (!data) return;
    if (data.scannable) $(b).addClass('scannable-enabled');
    if (data.toggle_scannable) return; // already processed
    $(b)
      .data('toggle_scannable', true)
      .prop('title', 'Right click to toggle scannable state')
      .on('contextmenu', function () {
        const index = bookmarks.bookmarks[data.source].findIndex(bm => bm.name === data.name && bm.frequency === data.frequency);
        data.scannable = !data.scannable;
        bookmarks.bookmarks[data.source][index].scannable = data.scannable;
        $(b)
          .toggleClass('scannable-enabled', data.scannable)
          .data('scannable', data.scannable);
        if (scanner.isRunning()) { // restart scanner if it is running
          scanner.stop();
          scanner.start();
        }
        return false; // prevent default context menu
      });
  });
}
