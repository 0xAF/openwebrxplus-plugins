/*
 * Plugin: Doppler - Track satellite frequency (Doppler shift/effect)
 *
 * This plugin started as a port of Sergey Osipov work:
 * https://github.com/studentkra/OpenWebRX-Doppler
 * Then evolved.
 * 
 * License: MIT
 * Copyright (c) 2024 Stanislav Lechev [0xAF], LZ2SLL
 * 
 * TODO:
 * - Option to integrate sat bookmarks
 * - Associate the bookmarks with modulation and SatID so it can be easily tracked, once bookmark is clicked.
 * - Scan the LocalStorage and remove old groups.
 */


// no css for this plugin
// Plugins.doppler.no_css = true;

// Initialize the plugin
Plugins.doppler.init = async function () {
  // Check if utils plugin is loaded
  // if (!Plugins.isLoaded('utils', 0.3)) {
  //   console.error('Example plugin depends on "utils >= 0.3".');
  //   return false;
  // }

  // await Plugins._load_script('http://192.168.175.99:8080/doppler/sat.js').catch(function () {
  await Plugins._load_script('https://0xaf.github.io/openwebrxplus-plugins/receiver/doppler/sat.js').catch(function() {
    throw ("Cannot load satellite-js script.");
  });

  await Plugins._load_script('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js').catch(function () {
    throw ("Cannot load lz-string script.");
  });
  

  await Plugins._load_style('https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.css').catch(function () {
    throw ("Cannot load jquery-modal style.");
  });

  await Plugins._load_script('https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.js').catch(function () {
    throw ("Cannot load jquery-modal script.");
  }).then(() => {
    // $.modal.defaults.escapeClose = true;
    // $.modal.defaults.clickClose = false;
    // $.modal.defaults.showClose = false;
  });

  // initialize on load
  if ($("#satellite-row").length < 1) {
    $(".openwebrx-modes").after(`
      <div id="satellite-row" class="openwebrx-panel-line openwebrx-panel-flex-line">
        <input id="satellite-input" type="text" placeholder="Sat ID">
        <div id="satellite-name" class="openwebrx-button">Open SAT Finder</div>
        <div id="satellite-track" class="openwebrx-button">TRACK</div>
      </div>
    `);

    var modalTabs = `
    <div class="satellite-modal-tabs-wrapper">
      <div class="satellite-modal-tabs">
    `;

    var groups = Object.keys(Plugins.doppler.satelliteGroups);
    for (let i = 0; i < groups.length; i++) {
      modalTabs += `
          <div class="satellite-modal-tab">
            <input type="radio" name="css-tabs" id="satellite-tab-${i}" ${i == 0 ? 'xxx-checked' : ''} onclick="Plugins.doppler.tabChange(${i}, '${groups[i]}')" class="satellite-modal-tab-switch" data-group="${groups[i]}">
            <label for="satellite-tab-${i}" class="satellite-modal-tab-label">${groups[i]}</label>
            <div class="satellite-modal-tab-content" id="satellite-tab-content-${i}">
              <div class="openwebrx-panel" style="transform: none; padding:0; background: none;">
                <select id="satellite-tab-content-${i}-select" class="openwebrx-panel-listbox" style="width: 70%; text-align: center" onchange="Plugins.doppler.selectChange(${i})">
                </select>
                <label style="">
                  Above <input id="satellite-tab-content-${i}-elevation" style="width: 8%" type="number" value="20" onchange="Plugins.doppler.selectChange(${i})" title="Find satellites above X degrees elevation"> °
                </label>
                <div id="satellite-tab-content-${i}-refresh" class="openwebrx-button" style="float: right;" onclick="Plugins.doppler.toggleRefresh(${i})" title="Refresh every 5sec">
                  <svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"
                      stroke-linejoin="round" d="M18.6091 5.89092L15.5 9H21.5V3L18.6091 5.89092ZM18.6091 5.89092C16.965 4.1131 14.6125 3 12 3C7.36745 3 3.55237 6.50005 3.05493 11M5.39092 18.1091L2.5 21V15H8.5L5.39092 18.1091ZM5.39092 18.1091C7.03504 19.8869 9.38753 21 12 21C16.6326 21 20.4476 17.5 20.9451 13"/>
                  </svg>
                </div>
              </div>
              <div id="satellite-tab-content-${i}-list" style="height: 370px; overflow-y: scroll">
                <table class="satellite-table">
                  <thead>
                    <tr>
                      <th align="left">SatID</th>
                      <th align="center">Name</th>
                      <th align="center">Elev</th>
                      <th align="center">Az</th>
                      <th align="center">Dist</th>
                      <th align="right">Visible</th>
                    </tr>
                  </thead>
                  <tbody id="satellite-tab-content-${i}-tbody">
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      `;
    }

    modalTabs += `
      </div>
    </div>
    `;

    $('#satellite-row').append(`
      <div id="satellite-modal" class="modal satellite-modal">
        <div class="satellite-modal-header">
          Satellite Finder (up to 2 hours)
        </div>
        <div class="satellite-modal-body">
        ${modalTabs}
        <br><br><center style="vertical-align: middle">Select Category</center>
        </div>
        <div class="satellite-modal-footer">
          <div class="openwebrx-button" rel="modal:close" onclick="$.modal.close()">Close</div>
        </div>
      </div>
    `);

    $('#satellite-modal').on($.modal.BEFORE_CLOSE, function(event, modal) {
      if (Plugins.doppler.scanRunning !== undefined) {
        Plugins.doppler.toggleRefresh(Plugins.doppler.scanRunning);
      }
    });

    $("#satellite-name").click(() => {
      // window.open("https://tle.ivanstanojevic.me/", "_blank");
      $('#satellite-modal').modal({
        escapeClose: true,
        clickClose: false,
        showClose: false,
      });
    });

    $("#satellite-track").click(() => {
      if (Plugins.doppler.intervalId) {
        Plugins.doppler.stop_tracker();
        return;
      }

      if (($('#satellite-input').val()).length < 1) {
        Plugins.doppler.stop_tracker("NOT FOUND!");
        return;
      }

      var satObj = null;
      if (Plugins.doppler.lastGroupName) {
        try {
          var store = JSON.parse(LZString.decompress(LS.loadStr('satellites.' + Plugins.doppler.lastGroupName)));
          satObj = store.data.find(obj => obj.NORAD_CAT_ID === parseInt($('#satellite-input').val() ,10));
          Plugins.doppler.start_tracker(satObj);
        } catch (e) { satObj = null; }
      }

      if (!satObj) {
        fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=' + $('#satellite-input').val() + '&FORMAT=JSON')
          .then(response => response.json())
          .then(data2 => {
            Plugins.doppler.start_tracker(data2[0])
          })
          .catch((error) => {
            console.error(error);
            Plugins.doppler.stop_tracker(error);
          });
      }
    });
  } // initialize

  return true; // plugin init return
}

Plugins.doppler.stop_tracker = function (info) {
  clearInterval(Plugins.doppler.intervalId);
  Plugins.doppler.intervalId = undefined;
  $('#satellite-track').removeClass('highlighted').text('TRACK');
  $('#satellite-name').text((info && info.length) ? info : "Open SAT Finder");
}

Plugins.doppler.start_tracker = function (obj) {
  // var satrec = satellite.twoline2satrec(line1, line2);
  // var satrec = satellite.object2satrec(obj);
  var satrec = satellite.json2satrec(obj);
  if (satrec.error>0) {
    Plugins.doppler.stop_tracker("Bad SAT Data");
    return;
  };
  var asl = $('.webrx-rx-desc').text().match(/ASL:\s*(\d+)\s*m/);
  asl = (asl && asl[1] && parseInt(asl[1]) > 0) ? parseInt(asl[1]) / 1000 : 0;
  var receiverPos = Utils.getReceiverPos();
  if (!receiverPos || !receiverPos.lat || !receiverPos.lon) {
    Plugins.doppler.stop_tracker("Set Receiver Position");
    return;
  }

  $("#satellite-name").text(obj.OBJECT_NAME);
  $("#satellite-track").addClass('highlighted').text("STOP");
  var demodulator = $('#openwebrx-panel-receiver').demodulatorPanel().getDemodulator();
  var startFreq = demodulator.get_offset_frequency() + center_freq;
  Plugins.doppler.intervalId = setInterval(() => {
    var demodulator = $('#openwebrx-panel-receiver').demodulatorPanel().getDemodulator();
    newFreq = Plugins.doppler.getDoppler(satrec, asl, receiverPos.lat, receiverPos.lon, startFreq);
    demodulator.set_offset_frequency(newFreq - center_freq);
    console.debug(`Doppler Freq: ${newFreq}`);
  }, 1000);
}

Plugins.doppler.getDoppler = function (satrec, asl, lat, lon, center) {
  var positionAndVelocity = satellite.propagate(satrec, new Date());
  var positionEci = positionAndVelocity.position;
  var velocityEci = positionAndVelocity.velocity;
  var observerGd = {
    longitude: satellite.degreesToRadians(lon),
    latitude: satellite.degreesToRadians(lat),
    height: asl
  };
  var gmst = satellite.gstime(new Date());
  var positionEcf = satellite.eciToEcf(positionEci, gmst);
  var observerEcf = satellite.geodeticToEcf(observerGd);
  var velocityEcf = satellite.eciToEcf(velocityEci, gmst);
  var dopplerFactor = satellite.dopplerFactor(observerEcf, positionEcf, velocityEcf);
  return (Math.round(dopplerFactor * center));
}

Plugins.doppler.tabChange = function (id, tab) {
  var options = `<option value="--empty--">-- Select group --`;
  for (const [key, val] of Object.entries(Plugins.doppler.satelliteGroups[tab])) {
    options += `<option value="${val}">${key}`;
  }
  var opts = $('#satellite-tab-content-' + id + '-select');
  opts.empty().append(`${options}`);
}

Plugins.doppler.selectChange = async function (id) {
  var groupName = $('#satellite-tab-content-' + id + '-select').val();
  if (!groupName.length || groupName === '--empty--') { console.error('no sat group selected'); return; }
  var elev = parseInt($('#satellite-tab-content-' + id +'-elevation').val(), 10);
  if (isNaN(elev) || elev < 1) { console.error('bad elevation: '+elev); return; }

  var store;
  try { store = JSON.parse(LZString.decompress(LS.loadStr('satellites.' + groupName))); }
  catch (e) { store = null; }

  // if we don't have cached data, or it is more than 2h old, get new data
  if (store === null || ((Math.floor(Date.now() / 1000) - store.last_sync) > (2 * 60 * 60))) {
    await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=' + groupName + '&FORMAT=JSON')
      .then(response => response.json())
      .then(data => {
        store = {};
        store.last_sync = Math.floor(Date.now() / 1000);
        store.data = data;
        LS.save('satellites.' + groupName, LZString.compress(JSON.stringify(store)));
      })
      .catch((error) => {
        console.error(error);
      });
  }

  var asl = $('.webrx-rx-desc').text().match(/ASL:\s*(\d+)\s*m/);
  asl = (asl && asl[1] && parseInt(asl[1]) > 0) ? parseInt(asl[1]) / 1000 : 0;
  var receiverPos = Utils.getReceiverPos();
  var observerGd = (receiverPos && receiverPos.lat && receiverPos.lon) ? {
    longitude: satellite.degreesToRadians(receiverPos.lon),
    latitude: satellite.degreesToRadians(receiverPos.lat),
    height: asl
  } : null;


  for (let i = 0; i < store.data.length; i++) {
    if (observerGd === null) {
      store.data[i].next_pass = 'Receiver position unknown.';
      break;
    }

    // lets find if the sat will be visible in the next hour
    // https://github.com/shashwatak/satellite-js/issues/56
    let curDate = new Date();
    // let satrec = satellite.object2satrec(store.data[i]);
    let satrec = satellite.json2satrec(store.data[i]);
    for (let m = 0; m < 120; m++) {
      // check every minute for the next hour
      var positionAndVelocity = satellite.propagate(satrec, curDate);
      if (satrec.error > 0) {
        console.error("Cant propagate. Bad satrec for " + store.data[i].OBJECT_NAME);
        console.log(store.data[i]);
        console.log(satrec);
        break;
      }
      var gmst = satellite.gstime(curDate);
      // var gmst = satellite.gstime(new Date());
      var positionEci = positionAndVelocity.position;
      var positionEcf = satellite.eciToEcf(positionEci, gmst);
      var lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
      store.data[i].elevation = satellite.radiansToDegrees(lookAngles.elevation);
      store.data[i].azimuth = satellite.radiansToDegrees(lookAngles.azimuth);
      store.data[i].distance = lookAngles.rangeSat;
      if (store.data[i].elevation > elev) {
        store.data[i].next_pass = curDate;
        break;
      }
      curDate.setMinutes(curDate.getMinutes() + 1); // add one minute
    }
  }

  store.data.sort(function(a, b) {
    if ((!a.next_pass || !(a.next_pass instanceof Date)) && (!b.next_pass || !(b.next_pass instanceof Date))) return 0;
    if (!a.next_pass || !(a.next_pass instanceof Date)) return 1;
    if (!b.next_pass || !(b.next_pass instanceof Date)) return -1;
    return a.next_pass - b.next_pass;
  });

  var tableRows;
  for (let i = 0; i < store.data.length; i++) {
    const s = store.data[i];
    let vis = "&gt;2h";
    if (s.next_pass) {
      if (s.next_pass <= new Date()) {
        vis = "<b>*NOW*</b>";
      } else {
        vis = String(s.next_pass.getHours()).padStart(2, '0') + ":" + String(s.next_pass.getMinutes()).padStart(2, '0');
      }
    }
    tableRows += `
    <tr onclick="Plugins.doppler.selectSatellite(${s.NORAD_CAT_ID}, '${groupName}')">
      <td align="left">${s.NORAD_CAT_ID}</td>
      <td align="center" style="max-width:160px; width: 160px;">${s.OBJECT_NAME}</td>
      <td align="center">${Math.round(s.elevation)}°</td>
      <td align="center">${Math.round(s.azimuth)}°</td>
      <td align="center">${Math.round(s.distance)}km</td>
      <td align="right">${vis}</td>
    </tr>
    `;
  }

  $('#satellite-tab-content-' + id + '-tbody').empty().append(`${tableRows}`);
}

Plugins.doppler.selectSatellite = function (id, grp) {
  Plugins.doppler.lastGroupName = grp;
  Plugins.doppler.lastSatId = id;
  $('#satellite-input').val(id);
  if (Plugins.doppler.intervalId) Plugins.doppler.stop_tracker();
  $.modal.close();
}

Plugins.doppler.toggleRefresh = function (id) {
  const refresh = $('#satellite-tab-content-' + id + '-refresh');
  if (Plugins.doppler.scanRunning === undefined) {
    refresh.css({ animationName: 'openwebrx-scan-animation', animationDuration: '1s', animationIterationCount: 'infinite', filter: 'none'});
    Plugins.doppler.scanRunning = id;
    Plugins.doppler.selectChange(id);
    Plugins.doppler.scanIntervalId = setInterval(() => {
      Plugins.doppler.selectChange(Plugins.doppler.scanRunning);
    }, 5000);
  } else {
    if (Plugins.doppler.scanRunning !== id) { // another scan is running
      Plugins.doppler.toggleRefresh(Plugins.doppler.scanRunning);
    } else {
      clearInterval(Plugins.doppler.scanIntervalId);
      Plugins.doppler.scanIntervalId = undefined;
      Plugins.doppler.scanRunning = undefined;
      refresh.css({ animationName: ''});
    }
  }
}

// cSpell:disable
// Groups: https://celestrak.org/NORAD/elements/index.php?FORMAT=json
Plugins.doppler.satelliteGroups = {
  'HAM': { // our custom set
    'Space Stations': 'stations',
    'Amateur Radio': 'amateur',
    'Weather': 'weather',
    'NOAA': 'noaa',
  },
  'Special': {
    'Last 30 Days\' Launches': 'last-30-days',
    'Space Stations': 'stations',
    '100 (or so) Brightest': 'visual',
    'Active Satellites': 'active',
    'Analyst Satellites': 'analyst',
    'Russian ASAT Test Debris (COSMOS 1408)': 'cosmos-1408-debris',
    'Chinese ASAT Test Debris (FENGYUN 1C)': 'fengyun-1c-debris',
    'IRIDIUM 33 Debris': 'iridium-33-debris',
    'COSMOS 2251 Debris': 'cosmos-2251-debris',
  },
  'Weather': {
    'Weather': 'weather',
    'NOAA': 'noaa',
    'GOES': 'goes',
    'Earth Resources': 'resource',
    'Search & Rescue (SARSAT)': 'sarsat',
    'Disaster Monitoring': 'dmc',
    'Tracking and Data Relay Satellite System (TDRSS)': 'tdrss',
    'ARGOS Data Collection System': 'argos',
    'Planet': 'planet',
    'Spire': 'spire',
  },
  'Comms': {
    'Active Geosynchronous': 'geo',
    'GEO Protected Zone': 'gpz',
    'GEO Protected Zone Plus': 'gpz-plus',
    'Intelsat': 'intelsat',
    'SES': 'ses',
    'Eutelsat': 'eutelsat',
    'Iridium': 'iridium',
    'Iridium NEXT': 'iridium-NEXT',
    'Starlink': 'starlink',
    'OneWeb': 'oneweb',
    'Orbcomm': 'orbcomm',
    'Globalstar': 'globalstar',
    'Swarm': 'swarm',
    'Amateur Radio': 'amateur',
    'SatNOGS': 'satnogs',
    'Experimental Comm': 'x-comm',
    'Other Comm': 'other-comm',
    'Gorizont': 'gorizont',
    'Raduga': 'raduga',
    'Molniya': 'molniya',
  },
  'Nav': {
    'GNSS': 'gnss',
    'GPS Operational': 'gps-ops',
    'GLONASS Operational': 'glo-ops',
    'Galileo': 'galileo',
    'Beidou': 'beidou',
    'Satellite-Based Augmentation System (WAAS/EGNOS/MSAS)': 'sbas',
    'Navy Navigation Satellite System (NNSS)': 'nnss',
    'Russian LEO Navigation': 'musson',
  },
  'Science': {
    'Space & Earth Science': 'science',
    'Geodetic': 'geodetic',
    'Engineering': 'engineering',
    'Education': 'education',
  },
  'Misc': {
    'Miscellaneous Military': 'military',
    'Radar Calibration': 'radar',
    'CubeSats': 'cubesat',
    'Other Satellites': 'other',
  },
};
// cSpell:enable
