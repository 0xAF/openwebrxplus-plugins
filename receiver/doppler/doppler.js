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

  await Plugins._load_script('https://cdnjs.cloudflare.com/ajax/libs/satellite.js/5.0.0/satellite.js').catch(function() {
    throw("Cannot load satellite-js script.");
  });



  if ($("#satellite-row").length < 1) {
    $(".openwebrx-modes").after(
      '<div id="satellite-row" class="openwebrx-panel-line openwebrx-panel-flex-line" style="padding: 4px 0px; justify-content: space-between">' +
        '<input id="satellite-input" type="text" placeholder="Sat ID" style="width: 60px;">' +
        '<div id="satellite-name" class="openwebrx-button" style="border: 0px solid; width: 122px; align-content: center; text-align: center">Find SAT</div>' +
        '<div id="satellite-track" class="openwebrx-button">TRACK</div>' +
      '</div>');

    $("#satellite-name").click(() => {
      window.open("https://tle.ivanstanojevic.me/", "_blank");
    });

    $("#satellite-track").click(() => {
      if (Plugins.doppler.intervalId) {
        clearInterval(Plugins.doppler.intervalId);
        Plugins.doppler.intervalId = undefined;
        $('#satellite-track').removeClass('highlighted').text('TRACK');
        $('#satellite-name').text("Not tracking.");
        Plugins.doppler.tracking = false;
        return;
      }

      var receiverPos = Utils.getReceiverPos();
      if (!receiverPos || !receiverPos.lat || !receiverPos.lon) {
        $('#satellite-name').text("Set Receiver Position");
          clearInterval(Plugins.doppler.intervalId);
          Plugins.doppler.intervalId = undefined;
        return;
      }

      if (($('#satellite-input').val()).length < 1) {
        $('#satellite-name').text("NOT FOUND!");
        clearInterval(Plugins.doppler.intervalId);
        Plugins.doppler.intervalId = undefined;
        return
      }

      fetch('https://tle.ivanstanojevic.me/api/tle/' + $('#satellite-input').val())
        .then(response => response.json())
        .then(data => {
          if (data.name === undefined) {
            $('#satellite-name').text("NOT FOUND!");
            clearInterval(Plugins.doppler.intervalId);
            Plugins.doppler.intervalId = undefined;
            return
          }
          $("#satellite-name").text(data.name);
          $("#satellite-track").text("STOP");
          Plugins.doppler.intervalId = setInterval(() => {
            var demodulator = $('#openwebrx-panel-receiver').demodulatorPanel().getDemodulator();
            curFreq = demodulator.get_offset_frequency() + center_freq;
            newFreq = GetDoppler(data.line1, data.line2, receiverPos.lat, receiverPos.lon, curFreq);
            demodulator.set_offset_frequency(newFreq - center_freq);
          }, 1000);
        })
        .catch((error) => {
          console.error(error);
          $("#satellite-name").text(error);
          clearInterval(Plugins.doppler.intervalId);
          Plugins.doppler.intervalId = undefined;
        });

    });

    // 0xAF: Copied from Sergey's work.
    function GetDoppler(tle1, tle2, GPSlat, GPSlon, center) {
      var satrec = satellite.twoline2satrec(tle1, tle2);
      var positionAndVelocity = satellite.propagate(satrec, new Date());
      var positionEci = positionAndVelocity.position;
      var velocityEci = positionAndVelocity.velocity;
      var observerGd = {
        longitude: satellite.degreesToRadians(GPSlon),
        latitude: satellite.degreesToRadians(GPSlat),
        height: 0.000 // TODO: we have this info (parse .webrx-rx-desc)
      };
      var gmst = satellite.gstime(new Date());
      var positionEcf = satellite.eciToEcf(positionEci, gmst);
      var observerEcf = satellite.geodeticToEcf(observerGd);
      velocityEcf = satellite.eciToEcf(velocityEci, gmst);
      dopplerFactor = satellite.dopplerFactor(observerEcf, positionEcf, velocityEcf);
      //console.log("Freq is:" + dopplerFactor * center + " Hz");
      return (Math.round(dopplerFactor * center));
    }
  }

  return true;
}




