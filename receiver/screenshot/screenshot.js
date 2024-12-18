/*
 * Plugin: Screenshot - Take a screenshot of the waterfall
 *
 * License: MIT
 * Copyright (c) 2024 Stanislav Lechev [0xAF], LZ2SLL
 */


// no css for this plugin
Plugins.screenshot.no_css = true;

// Initialize the plugin
Plugins.screenshot.init = async function () {

  // await Plugins._load_script('https://0xaf.github.io/openwebrxplus-plugins/receiver/screenshot/html2canvas.min.js').catch(function() {
  await Plugins._load_script('http://192.168.175.99:8080/screenshot/html2canvas.min.js').catch(function() {
    throw("Cannot load html2canvas script.");
  });


  if ($("#screenshot-btn").length < 1) {
    $(".openwebrx-record-button").wrap("<div class='openwebrx-button openwebrx-square-button' style='background: none; width:2rem;'></div>");
    $(".openwebrx-record-button").after("<div id='screenshot-btn' class='openwebrx-button openwebrx-square-button xopenwebrx-record-button'>PIC</div>");
    $(".openwebrx-record-button, #screenshot-btn").css({ float: 'none', marginTop: 0, width: '2rem', textAlign: 'center', padding: '2px 8px' });
    $('#screenshot-btn').click(function () {

      var freq = window.center_freq + $('#openwebrx-panel-receiver').demodulatorPanel().getDemodulator().get_offset_frequency();
      freq = parseInt(freq / 1000);
      freq = parseFloat(freq / 1000);
      console.log(freq);

      let cloned_width = document.querySelector('#webrx-canvas-container').style.width;
      let cloned_height = 1200;
      var iframe_canvas = document.createElement("canvas");
      iframe_canvas.setAttribute('width', cloned_width);
      iframe_canvas.setAttribute('height', cloned_height);
      document.body.appendChild(iframe_canvas);
      html2canvas(document.querySelector('.openwebrx-waterfall-container'), {
        canvas: iframe_canvas,
        width: cloned_width,
        height: cloned_height,
        windowWidth: cloned_width,
        windowHeight: cloned_height,
        onclone: (e) => {
          // console.log(e);
          return e;
        }
      }).then(function (canvas) {
        // console.log(canvas);
        var d = new Date();
        var a = document.createElement("a");
        a.setAttribute('download', `sdr-screenshot-${freq.toFixed(3)}MHz-${d.toISOString()}.png`);
        a.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { document.body.removeChild(a); document.body.removeChild(iframe_canvas) }, 0);
      });

    });
  }

  return true;
}




