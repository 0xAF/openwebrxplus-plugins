/*
 * Plugin: Add Maidenhead Locator (QTH) layer to the map.
 *
 * License: MIT
 * Copyright (c) 2023 Stanislav Lechev [0xAF], LZ2SLL
 */

// no css for this plugin
Plugins.layer_qth_maidenhead.no_css = true;

// Initialize the plugin
Plugins.layer_qth_maidenhead.init = async function () {

  var interval = setInterval(async function () {
    // if google maps gets loaded, stop here
    if (typeof (google) !== 'undefined') {
      Plugins._debug('Maidenhead QTH Locator layer is supported in OSM only.')
      clearInterval(interval);
      return;
    }

    // wait for Leaflet to get loaded.
    if (typeof (L) === 'undefined') return;
    clearInterval(interval);

    var installed = false;
    $.each(mapExtraLayers, function (idx, mel) {
      if (mel.name === "Maidenhead-QTH") installed = true;
    });
    if (installed || typeof (L.maidenhead) !== 'undefined') {
      console.error('This OWRX+ installation already have Maidenhead (QTH) layer. Not installing the plugin.');
      return false;
    }

    // now load Maidenhead QTH locators and add them to the map
    await Plugins._load_script("https://ha8tks.github.io/Leaflet.Maidenhead/src/L.Maidenhead.js")
      .then(function () {
        var enabled = LS.loadBool('leaflet-layer-maidenhead'); // should return false if not found

        // create layer
        var layer = L.maidenhead({
          color: 'rgba(255, 0, 0, 0.4)'
        });

        // add the layer to the list with extra layers and attach onChange handler
        $('#openwebrx-map-extralayers').append(
          $('<label><input type="checkbox" ' +
            'name="Maidenhead" ' +
            'idx="99" ' +
            'id="openwebrx-map-layer-maidenhead"' +
            (enabled ? ' checked ' : '') +
            '>Maidenhead (QTH)</label>'
          ).on('change', function (e) {
            LS.save('leaflet-layer-maidenhead', e.target.checked);
            if (e.target.checked) {
              if (map.hasLayer(layer))
                map.removeLayer(layer);
              map.addLayer(layer);
            } else {
              map.removeLayer(layer);
            }
          })
        );
        if (enabled) map.addLayer(layer);
      });

  }, 10);

  // return true, to indicate the plugin is loaded correctly
  return true;
}
