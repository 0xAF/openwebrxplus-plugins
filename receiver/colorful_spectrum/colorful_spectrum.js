/*
 * Plugin: colorify the spectrum analyzer.
 *
 * License: MIT
 * Copyright (c) 2023 Stanislav Lechev [0xAF], LZ2SLL
 */

// do not load CSS for this plugin
Plugins.colorful_spectrum.no_css = true;

Plugins.colorful_spectrum.init = async function () {

  // Check if utils plugin is loaded
  if (!Plugins.isLoaded('utils', 0.1)) {
    // try to load the utils plugin
    await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');

    // check again if it was loaded successfuly
    if (!Plugins.isLoaded('utils', 0.1)) {
      console.error('colorful_spectrum plugin depends on "utils >= 0.1".');
      return false;
    } else {
      Plugins._debug('Plugin "utils" has been loaded as dependency.');
    }
  }

  // wait for OWRX to initialize
  $(document).on('event:owrx_initialized', function () {
    Plugins.utils.wrap_func(
      'draw',
      function (orig, thisArg, args) {
        return true;
      },
      function (res, thisArg, args) {
        var vis_freq = get_visible_freq_range();
        var vis_start = 0.5 - (center_freq - vis_freq.start) / bandwidth;
        var vis_end = 0.5 - (center_freq - vis_freq.end) / bandwidth;
        var data_start = Math.round(fft_size * vis_start);
        var data_end = Math.round(fft_size * vis_end);
        var data_width = data_end - data_start;
        var data_height = Math.abs(thisArg.max - thisArg.min);
        var spec_width = thisArg.el.offsetWidth;
        var spec_height = thisArg.el.offsetHeight;
        if (spec_width <= data_width) {
          var x_ratio = data_width / spec_width;
          var y_ratio = spec_height / data_height;
          for (var x = 0; x < spec_width; x++) {
            var data = (thisArg.data[data_start + ((x * x_ratio) | 0)]);
            var y = (data - thisArg.min) * y_ratio;
            thisArg.ctx.fillRect(x, spec_height, 1, -y);
            if (data) {
              var c = Waterfall.makeColor(data);
              thisArg.ctx.fillStyle = "rgba(" +
                c[0] + ", " + c[1] + ", " + c[2] + ", " +
                (25 + y * 2) + "%)";
            }
          }
        }
      },
      spectrum
    );
  });

  return true;
}
