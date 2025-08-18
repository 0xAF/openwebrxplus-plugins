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
  
  // Create UI for TETRA data
  Plugins.tetra.createUI();

  // Listen for when OpenWebRX is initialized
  $(document).on('event:owrx_initialized', function () {
    console.log('TETRA plugin: OpenWebRX initialized');
    
    // Ensure UI is created after initialization
    Plugins.tetra.createUI();
    
    // Add click handler for TETRA mode button if it exists
    $('.openwebrx-button-dig[data-modulation="tetra"]').addClass('tetra-mode-button');
  });
  
  // Listen for demodulator changes
  $(document).on('event:demodulator_change', function() {
    // Check if TETRA is the current modulation
    if (demodulators && demodulators[0] && demodulators[0].getModulation() === 'tetra') {
      console.log('TETRA mode activated');
      // Show TETRA container
      $('#tetra-container').show();
      // Add active class to TETRA button
      $('.tetra-mode-button').addClass('tetra-mode-active');
    } else {
      // Hide TETRA container when not in TETRA mode
      $('#tetra-container').hide();
      // Remove active class from TETRA button
      $('.tetra-mode-button').removeClass('tetra-mode-active');
    }
  });

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

  // Create TETRA mode
  const tetraMode = new Mode(
    'tetra',           // modulation
    'TETRA',           // name
    'digimode',        // type
    true,              // squelch
    new Bandpass(      // bandpass
      -4000,           // low_cut
      4000,            // high_cut
      5                // transition_width
    ),
    8000,              // ifRate
    'nfm'              // underlying modulation
  );

  // Add TETRA mode to the available modes
  const newModes = [...currentModes, tetraMode];
  Modes.setModes(newModes);
  
  console.log('TETRA mode added to available modes');
  return true;
};

// Create UI for TETRA data display
Plugins.tetra.createUI = function() {
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

// Register event listener for TETRA data
$(document).on('server:tetra:before', function (e, data) {
  Plugins.tetra.handleDemodulation(data);
});