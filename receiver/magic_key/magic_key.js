/*
 * Plugin: MagicKey - Set the MagicKey without writing it in browser's address bar
 *
 * License: MIT
 * Copyright (c) 2024 Stanislav Lechev [0xAF], LZ2SLL
 */


// no css for this plugin
Plugins.magic_key.no_css = true;

// Initialize the plugin
Plugins.magic_key.init = async function () {
  // Check if utils plugin is loaded
  if (!Plugins.isLoaded('utils', 0.3)) {
    console.error('Example plugin depends on "utils >= 0.3".');
    return false;
  }


  if ($("#setMagicKeyBtn").length < 1) {
    $(".openwebrx-bookmark-button").before(
      '<div id="setMagicKeyBtn" class="openwebrx-button openwebrx-square-button">' +
      '<svg fill="#FFFFFF" width="27px" height="27px" viewBox="-18.91 0 122.88 122.88" version="1.1" ' +
      'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><g>' +
      '<path d="M60.78,43.44c-1.49,0.81-3.35,0.26-4.15-1.22c-0.81-1.49-0.26-3.35,1.23-4.15c7.04-3.82,10.32-8.76,10.98-13.59 c0.35-2.58-0.05-5.17-1.02-7.57c-' +
      '0.99-2.43-2.56-4.64-4.55-6.42c-3.87-3.46-9.3-5.28-14.97-3.87c-2.3,0.57-4.29,1.72-6.03,3.34 c-1.85,1.72-3.45,3.97-4.85,6.63c-0.79,1.5-2.64,2.07-4.13,' +
      '1.29c-1.5-0.79-2.07-2.64-1.29-4.13c1.72-3.26,3.73-6.06,6.11-8.28 c2.49-2.31,5.38-3.97,8.74-4.8c7.8-1.93,15.23,0.53,20.51,5.25c2.68,2.4,4.81,5.39,6.15,' +
      '8.69c1.35,3.33,1.9,6.99,1.39,10.7 C73.99,31.93,69.75,38.57,60.78,43.44L60.78,43.44z M37.32,67.61c-11.6-15.58-11.88-30.34,2.2-44.06l-10.14-5.6 C21.26,' +
      '14.79,6.36,38.08,12.12,44.3l7.9,11.72l-1.63,3.4c-0.45,1.01-0.01,1.72,1.09,2.21l1.07,0.29L0,102.59l4.16,8.87l8.32-2.45 l2.14-4.16l-2.05-3.84l4.52-0.97L' +
      '18.14,98l-2.36-3.6l1.55-3.01l4.51-0.57l1.47-2.85l-2.52-3.29l1.61-3.12l4.6-0.75l6.26-11.95 l1.06,0.58C36.16,70.56,37.11,69.84,37.32,67.61L37.32,67.61z ' +
      'M59.15,77.38l-3.06,11.42l-4.25,1.68l-0.89,3.33l3.1,2.63l-0.81,3.03 l-4.2,1.48l-0.86,3.2l3.01,2.95l-0.58,2.17l-4.13,1.87l2.76,3.25l-1.19,4.43l-7.45,4.07l' +
      '-5.82-7.63l11.1-41.43l-2.69-0.72 c-0.55-0.15-0.89-0.72-0.74-1.28l1.13-4.21c-8.14-6.17-12.17-16.85-9.37-27.32c3.6-13.45,17.18-21.57,30.64-18.55 c0.06,' +
      '0.72,0.05,1.45-0.05,2.18c-0.25,1.82-1.04,3.69-2.5,5.5c-0.2,0.24-0.41,0.49-0.63,0.73c-4.3-0.28-8.33,2.5-9.49,6.82 c-0.5,1.86-0.39,3.74,0.2,5.43c0.14,0.6,' +
      '0.37,1.18,0.67,1.75c0.71,1.3,1.75,2.29,2.97,2.92c0.8,0.53,1.7,0.93,2.67,1.2 c4.83,1.29,9.78-1.49,11.22-6.24c1.46-1.29,2.73-2.65,3.82-4.05c2.12-2.73,3.57-' +
      '5.63,4.43-8.58c5.84,6.3,8.41,15.37,6.02,24.29c-2.8,10.47-11.65,17.71-21.77,18.98l-1.13,4.21c-0.15,0.55-0.72,0.89-1.28,0.74L59.15,77.38L59.15,77.38z"/>' +
      '</g></svg></div>');
    $("#setMagicKeyBtn").css({ width: '27px', height: '27px', textAlign: 'center' });
    $('#setMagicKeyBtn').click(function () {
      window.localKey = prompt("Enter new Magic Key");
      if (window.localKey !== undefined) $('#openwebrx-panel-receiver').demodulatorPanel().setMagicKey(window.localKey);
    });

    Plugins.utils.wrap_func(
      'getMagicKey',
      // beforeCB: return true to call the afterCB
      function (orig, thisArg, args) { return true; },
      // afterCB: return localKey or the original one
      function (res) { return window.localKey !== undefined ? window.localKey : res; },
      $('#openwebrx-panel-receiver').demodulatorPanel()
    );

  }

  return true;
}




