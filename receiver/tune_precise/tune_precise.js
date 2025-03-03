/*
 * Plugin: Tune Precise - add buttons to precisely tune the frequency
 *
 * License: MIT
 * Copyright (c) 2025 Dimitar Milkov, LZ2DMV
 * Copyright (c) 2025 Stanislav Lechev, LZ2SLL
 */

Plugins.tune_precise.no_css = true;

Plugins.tune_precise.init = async function () {
  function renderIcon(icon, size) {
    if (icon > 0) {
      return `<svg width="${size}px" height="${size}px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.1" d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" fill="#ffffff"/>
        <path d="M9 12H15" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 9L12 15" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#ffffff" stroke-width="2"/>
      </svg>`;
    } else {
      return `<svg width="${size}px" height="${size}px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.1" d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" fill="#ffffff"/>
        <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#ffffff" stroke-width="2"/>
        <path d="M9 12H15" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }
  }

  $(".webrx-mouse-freq").after(`
    <div id="id-step-freq" style="padding-bottom: 4px; padding-top: 4px; display: flex; justify-content: space-evenly; align-items: center;">
      <div class="tune-precise-step" data-step="-1000" title="-1kHz ">${renderIcon(-1, 24)}</div>
      <div class="tune-precise-step" data-step="-100"  title="-100Hz">${renderIcon(-1, 22)}</div>
      <div class="tune-precise-step" data-step="-10"   title="-10Hz ">${renderIcon(-1, 20)}</div>
      <div class="tune-precise-step" data-step="+10"   title="+10Hz ">${renderIcon(+1, 20)}</div>
      <div class="tune-precise-step" data-step="+100"  title="+100Hz">${renderIcon(+1, 22)}</div>
      <div class="tune-precise-step" data-step="+1000" title="+1kHz ">${renderIcon(+1, 24)}</div>
    </div>   
  `);
  $('.tune-precise-step')
    .css({
      cursor: 'pointer',
      filter: 'brightness(0.8)'
    }).hover(
      function () { $(this).css({ filter: "drop-shadow(0px 0px 2px rgb(255,255,255)) brightness(1)" }); },
      function () { $(this).css({ filter: "brightness(0.8)" }); }
    ).click(function (e) {
      const step = parseInt($(this).data('step'), 10);
      const demodulator = $("#openwebrx-panel-receiver").demodulatorPanel().getDemodulator();
      const freqCurrent = parseInt(demodulator.get_offset_frequency() + center_freq, 10);
      let freqNew = Math.round( (freqCurrent + step) / step ) * step; // round the frequency to the nearest whole number
      if (freqNew !== freqCurrent) demodulator.set_offset_frequency(freqNew - center_freq);
    });

  $('#openwebrx-panel-receiver').css({ userSelect: 'none' }); // disable auto-select of the text fields when user clicks multiple time in the receiver panel (ie. the freq buttons)

  return true;
};
