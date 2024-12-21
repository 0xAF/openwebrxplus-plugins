/*
 * Plugin: sort profiles by name.
 *
 * License: MIT
 * Copyright (c) 2023 Stanislav Lechev [0xAF], LZ2SLL
 */

// do not load CSS for this plugin
Plugins.sort_profiles.no_css = true;

// Initialize the plugin
Plugins.sort_profiles.init = async function () {

  // Check if utils plugin is loaded
  if (!Plugins.isLoaded('utils', 0.1)) {
    // try to load the utils plugin
    await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');

    // check again if it was loaded successfully
    if (!Plugins.isLoaded('utils', 0.1)) {
      console.error('soft_profiles plugin depends on "utils >= 0.1".');
      return false;
    } else {
      Plugins._debug('Plugin "utils" has been loaded as dependency.');
    }
  }


  // Catch the event, when server sends us the profiles.
  $(document).on('server:profiles:after', function (e, data) {
    var sel = $('#openwebrx-sdr-profiles-listbox');

    // if the list is empty, return
    if (!sel[0] || !sel[0].length)
      return;

    var selected = sel.val();
    var list = sel.find('option');

    // sort the list of options, alphanumeric and ignoring the case
    list.sort(function (a, b) {
      return $(a).text()
        .localeCompare(
          $(b).text(), undefined, {
            numeric: true,
            sensitivity: 'base'
          }
        );
    });

    // now reset the list and fill it with the new sorted one
    sel.html('').append(list);

    // set the selected profile from our cached value
    sel.val(selected);
  });

  // return true to validate plugin load
  return true;
}
