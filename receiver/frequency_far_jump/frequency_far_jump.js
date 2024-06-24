/*
 * Plugin: Jump to a frequency outside the boundaries of the selected profile by typing it in the receiver's frequency dial.
 * Requires the option 'Allow users to change center frequency' to be enabled in the admin panel.
 * Please note that you must supply the magic key for your OpenWebRX+ instance if you have one configured with a '#key=[KEY]' at the end of the URL.
 *
 * License: Apache License 2.0
 * Copyright (c) 2024 Dimitar Milkov, LZ2DMV
 */

Plugins.frequency_far_jump.no_css = true;

Plugins.frequency_far_jump.init = async function () {

  if (!Plugins.isLoaded('utils', 0.1)) {

    await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');

    if (!Plugins.isLoaded('utils', 0.1)) {
      console.error('Plugin "frequency_far_jump" depends on "utils >= 0.1".');
      return false;
    } else {
      Plugins._debug('Plugin "utils" has been loaded as dependency.');
    }
  }

  Plugins.utils.wrap_func(
    'set_offset_frequency',
    function (orig, thisArg, args) {
      var to_what = Math.round(args[0]);

      if (typeof(to_what) == 'undefined') return;

      // The frequency is outside the boundaries of the current profile
      if (to_what > bandwidth / 2 || to_what < -bandwidth / 2) {
        // to_what is an offset, so we need to add the current full frequency (center_freq) to it
        var f = center_freq + to_what;
        var k = $('#openwebrx-panel-receiver').demodulatorPanel().getMagicKey();

        // Ask the backend over the WS to switch the frequency for us
        ws.send(JSON.stringify({
          "type": "setfrequency", "params": { "frequency": f, "key": k }
        }));

      } else {
        // The frequency is within the boundaries of the current profile,
        // just use the original set_offset_frequency
        orig.apply(thisArg, args);
      }
      return false;
    },
    null,
    Demodulator.prototype
  );

  return true;
}
