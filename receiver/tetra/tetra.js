/*
 * TETRA demodulation plugin for OpenWebRx+
 */

// Initialize the plugin namespace if it doesn't exist
if (!Plugins.tetra) Plugins.tetra = {};

// Plugin version
Plugins.tetra.version = 1.0;

// Enable CSS loading for this plugin
Plugins.tetra.no_css = false;

// Init function of the plugin
Plugins.tetra.init = function () {
  // Check if utils plugin is loaded
  if (!Plugins.isLoaded('utils', 0.1)) {
    console.error('TETRA plugin depends on "utils >= 0.1".');
    return false;
  }

  console.log('TETRA demodulation plugin initialized');

  // Add TETRA mode to the available modes
  Plugins.tetra.addTetraMode();
  
  // Create UI for TETRA data and buttons
  Plugins.tetra.createUI();

  // Listen for when OpenWebRX is initialized
  $(document).on('event:owrx_initialized', function () {
    console.log('TETRA plugin: OpenWebRX initialized');
    
    // Ensure UI is created after initialization
    Plugins.tetra.createUI();
    
    // Force a re-render of the demodulator panel to show our new mode
    if (typeof UI !== 'undefined' && UI.getDemodulatorPanel) {
      UI.getDemodulatorPanel().render();
    }
  });
  
  // Listen for demodulator changes
$(document).on('event:demodulator_change', function(e, demodulator) {
  // Check if TETRA is the current modulation
  if (demodulator && demodulator.getModulation() === 'tetra') {
    console.log('TETRA mode activated');
    // Show TETRA container
    $('#tetra-container').show();
    // Add active class to TETRA button
    $('#openwebrx-button-tetra').addClass('highlighted');
  } else {
    // Hide TETRA container when not in TETRA mode
    $('#tetra-container').hide();
    // Remove active class from TETRA button
    $('#openwebrx-button-tetra').removeClass('highlighted');
  }
});

// TETRA button click handling is now managed by DemodulatorPanel automatically

  // Listen for panel rendered events to ensure our UI elements are created
  $(document).on('event:panel_rendered', function() {
    // Ensure our UI elements are created after panel renders
    setTimeout(function() {
      Plugins.tetra.createUI();
    }, 100);
  });

  // Trigger a custom event that other plugins can listen for
  $(document).trigger('event:tetra_initialized');

  return true;
};

// Function to add TETRA mode to the available modes
Plugins.tetra.addTetraMode = function () {
  // Check if Modes object exists
  if (typeof Modes === 'undefined') {
    console.error('TETRA plugin: Modes object not found');
    return false;
  }

  // Get current modes
  const currentModes = Modes.getModes();
  
  // Check if TETRA mode already exists
  if (currentModes.some(mode => mode.modulation === 'tetra')) {
    console.log('TETRA mode already exists');
    return true;
  }

  // Create TETRA mode object in the format expected by Modes.setModes
  const tetraMode = {
    modulation: 'tetra',
    name: 'TETRA',
    type: 'analog',
    squelch: true,
    bandpass: {
      low_cut: -4000,
      high_cut: 4000
    },
    ifRate: 8000,
    underlying: ['nfm'],
    secondaryFft: true
  };

  // Add TETRA mode to the available modes
  const newModes = [...currentModes, tetraMode];
  Modes.setModes(newModes);
  
  // Patch the DemodulatorPanel.prototype.render method to trigger an event when rendering is complete
  if (!Plugins.tetra.rendererPatched && typeof DemodulatorPanel !== 'undefined') {
    Plugins.tetra.rendererPatched = true;
    Plugins.utils.wrap_func(
      'DemodulatorPanel.prototype.render',
      function(orig, thisArg, args) {
        return true; // Allow original function to execute
      },
      function(res) {
        // After rendering is complete, trigger our custom event
        $(document).trigger('event:panel_rendered');
        return res;
      }
    );
  }
  
  console.log('TETRA mode added to available modes');
  return true;
};

// Create UI for TETRA data display and control buttons
Plugins.tetra.createUI = function() {
  // Create TETRA control buttons row if it doesn't exist
  if ($('#tetra-row').length === 0) {
    // Add TETRA control row after the modes panel, similar to doppler plugin
    $('.openwebrx-modes').after(`
      <div id="tetra-row" class="openwebrx-panel-line openwebrx-panel-flex-line">
        <div id="tetra-enable" class="openwebrx-button">Enable TETRA</div>
        <div id="tetra-decode" class="openwebrx-button">Start Decode</div>
        <div id="tetra-status" class="openwebrx-button" style="background-color: #666;">TETRA Ready</div>
      </div>
    `);
    
    // Add click handlers for TETRA buttons
    $('#tetra-enable').click(function() {
      Plugins.tetra.enableTetraMode();
    });
    
    $('#tetra-decode').click(function() {
      Plugins.tetra.toggleDecode();
    });
  }
  
  // Create container for TETRA data if it doesn't exist
  if ($('#tetra-container').length === 0) {
    // Add container to the secondary demod panel
    $('#openwebrx-panel-digimodes').append(
      '<div id="tetra-container" class="tetra-data-container" style="display:none;">' +
        '<div class="tetra-header">TETRA Demodulation</div>' +
        '<div id="tetra-messages"></div>' +
        '<div id="tetra-info" class="tetra-info">Waiting for TETRA data...</div>' +
      '</div>'
    );
  }
};

// Handle TETRA demodulation
Plugins.tetra.handleDemodulation = function (data) {
  // Process TETRA demodulation data
  if (data && data.type === 'tetra') {
    console.log('TETRA data received:', data);
    
    // Ensure UI exists
    Plugins.tetra.createUI();
    
    // Show TETRA container
    $('#tetra-container').show();
    
    // Update info
    $('#tetra-info').text('TETRA signal detected - ' + new Date().toLocaleTimeString());
    
    // Add message to display
    if (data.message) {
      $('#tetra-messages').append(
        '<div class="tetra-message">' + data.message + '</div>'
      );
      
      // Limit number of messages to prevent overflow
      const maxMessages = 10;
      if ($('#tetra-messages .tetra-message').length > maxMessages) {
        $('#tetra-messages .tetra-message').first().remove();
      }
    }
  }
};

// Listen for demodulator changes
Plugins.utils.wrap_func(
  'demodulator_analog_replace',
  function (orig, thisArg, args) {
    return true; // Allow original function to execute
  },
  function (res) {
    // After demodulator changes, check if TETRA is selected
    if (demodulators[0].getModulation() === 'tetra') {
      console.log('TETRA demodulation activated');
      // Additional setup for TETRA demodulation if needed
    }
  }
);

// TETRA control functions
Plugins.tetra.enableTetraMode = function() {
  // Switch to TETRA demodulation mode
  if (typeof demodulators !== 'undefined' && demodulators[0]) {
    demodulators[0].setModulation('tetra');
    $('#tetra-status').text('TETRA Active').css('background-color', '#4CAF50');
    console.log('TETRA mode enabled');
  }
};

Plugins.tetra.decoding = false;
Plugins.tetra.toggleDecode = function() {
  if (!Plugins.tetra.decoding) {
    // Start decoding
    Plugins.tetra.decoding = true;
    $('#tetra-decode').text('Stop Decode').css('background-color', '#f44336');
    $('#tetra-status').text('Decoding...').css('background-color', '#FF9800');
    console.log('TETRA decoding started');
    
    // Show TETRA container
    $('#tetra-container').show();
  } else {
    // Stop decoding
    Plugins.tetra.decoding = false;
    $('#tetra-decode').text('Start Decode').css('background-color', '');
    $('#tetra-status').text('TETRA Ready').css('background-color', '#666');
    console.log('TETRA decoding stopped');
    
    // Hide TETRA container
    $('#tetra-container').hide();
  }
};

// Register event listener for TETRA data
$(document).on('server:tetra:before', function (e, data) {
  Plugins.tetra.handleDemodulation(data);
});

// Update status when TETRA mode is selected
$(document).on('event:demodulator_change', function(e, demodulator) {
  if (demodulator && demodulator.getModulation() === 'tetra') {
    $('#tetra-status').text('TETRA Active').css('background-color', '#4CAF50');
  }
});