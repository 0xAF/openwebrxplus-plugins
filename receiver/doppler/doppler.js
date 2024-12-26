/*
 * Plugin: Doppler - Track satellite frequency (Doppler shift/effect)
 *
 * This plugin based Sergey Osipov work:
 * https://github.com/studentkra/OpenWebRX-Doppler
 * 
 * License: MIT
 * Copyright (c) 2024 Stanislav Lechev [0xAF], LZ2SLL
 */


// no css for this plugin
Plugins.doppler.no_css = true;

// Initialize the plugin
Plugins.doppler.init = async function () {
  // Check if utils plugin is loaded
  if (!Plugins.isLoaded('utils', 0.3)) {
    console.error('Example plugin depends on "utils >= 0.3".');
    return false;
  }

  await Plugins._load_script('https://0xaf.github.io/openwebrxplus-plugins/receiver/doppler/sat.js').catch(function() {
    throw("Cannot load satellite-js script.");
  });



  if ($("#satellite-row").length < 1) {
    $(".openwebrx-modes").after(
      '<div id="satellite-row" class="openwebrx-panel-line openwebrx-panel-flex-line" style="padding: 4px 0px; justify-content: space-between" title="ISS Zarya: 25544">' +
        '<input id="satellite-input" type="text" placeholder="Sat ID" style="width: 54px;">' +
        '<div id="satellite-name" class="openwebrx-button" style="border: 0px solid; width: 126px; align-content: center; text-align: center">Find SAT</div>' +
        '<div id="satellite-track" class="openwebrx-button" style="width: 48px; text-align: center">TRACK</div>' +
      '</div>');

    $("#satellite-name").click(() => {
      window.open("https://tle.ivanstanojevic.me/", "_blank");
    });

    function stop_tracker(info) {
      clearInterval(Plugins.doppler.intervalId);
      Plugins.doppler.intervalId = undefined;
      $('#satellite-track').removeClass('highlighted').text('TRACK');
      $('#satellite-name').text((info && info.length) ? info : "Not tracking.");
    }

    $("#satellite-track").click(() => {
      if (Plugins.doppler.intervalId) {
        stop_tracker();
        return;
      }

      var receiverPos = Utils.getReceiverPos();
      if (!receiverPos || !receiverPos.lat || !receiverPos.lon) {
        stop_tracker("Set Receiver Position");
        return;
      }

      if (($('#satellite-input').val()).length < 1) {
        stop_tracker("NOT FOUND!");
        return;
      }

      fetch('https://tle.ivanstanojevic.me/api/tle/' + $('#satellite-input').val())
        .then(response => response.json())
        .then(data => {
          if (data.name === undefined) {
            stop_tracker("NOT FOUND!");
            return;
          }
          $("#satellite-name").text(data.name);
          $("#satellite-track").addClass('highlighted').text("STOP");
          var demodulator = $('#openwebrx-panel-receiver').demodulatorPanel().getDemodulator();
          startFreq = demodulator.get_offset_frequency() + center_freq;
          Plugins.doppler.intervalId = setInterval(() => {
            newFreq = AF_GetDoppler(data.line1, data.line2, receiverPos.lat, receiverPos.lon, startFreq);
            // newFreqAF = AF_GetDoppler(data.line1, data.line2, receiverPos.lat, receiverPos.lon, startFreq);
            // console.log(`NewFreq: Sergey's: ${newFreq}, AF: ${newFreqAF}`);
            demodulator.set_offset_frequency(newFreq - center_freq);
          }, 1000);
        })
        .catch((error) => {
          console.error(error);
          stop_tracker(error);
        });

    });

    // 0xAF: Copied from Sergey's work.
    function AF_GetDoppler(tle1, tle2, GPSlat, GPSlon, center) {
      var satrec = satellite.twoline2satrec(tle1, tle2);
      var positionAndVelocity = satellite.propagate(satrec, new Date());
      var positionEci = positionAndVelocity.position;
      var velocityEci = positionAndVelocity.velocity;
      var asl=$('.webrx-rx-desc').text().match(/ASL:\s*(\d+)\s*m/);
      asl = (asl && asl[1] && parseInt(asl[1]) > 0) ? parseInt(asl[1]) / 1000 : 0;
      var observerGd = {
        longitude: satellite.degreesToRadians(GPSlon),
        latitude: satellite.degreesToRadians(GPSlat),
        height: asl
      };
      var gmst = satellite.gstime(new Date());
      var positionEcf = satellite.eciToEcf(positionEci, gmst);
      var observerEcf = satellite.geodeticToEcf(observerGd);
      velocityEcf = satellite.eciToEcf(velocityEci, gmst);
      dopplerFactor = satellite.dopplerFactor(observerEcf, positionEcf, velocityEcf);
      // console.log("Freq is:" + dopplerFactor * center + " Hz");
      return (Math.round(dopplerFactor * center));
    }
  }

  return true;
}
