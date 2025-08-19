/*
 * Weather Overlay Plugin Initialization
 * 
 * This file handles the loading and initialization of the weather overlay plugin
 * for OpenWebRX+ map interface.
 */

// Define the weather overlay plugin namespace
if (typeof Plugins === 'undefined') {
  var Plugins = {};
}

Plugins.weather_overlay = {
  name: 'Weather Overlay',
  version: '1.0.0',
  description: 'Adds weather data overlays to the map using OpenWeatherMap API',
  author: 'OpenWebRX+ Community',
  
  // Plugin configuration
  config: {
    // Default API key (users should replace with their own)
    apiKey: 'demo',
    
    // Default layer settings
    defaultLayers: {
      precipitation: { enabled: false, opacity: 0.6 },
      clouds: { enabled: false, opacity: 0.4 },
      temperature: { enabled: false, opacity: 0.5 },
      wind: { enabled: false, opacity: 0.5 },
      pressure: { enabled: false, opacity: 0.4 }
    },
    
    // Control panel settings
    controlPosition: 'topright',
    collapsible: true,
    
    // Performance settings
    maxZoom: 18,
    attribution: '© OpenWeatherMap'
  },
  
  // Plugin state
  initialized: false,
  layers: {},
  control: null
};

// Load the weather overlay plugin
(function() {
  'use strict';
  
  // Check if we're in the right environment
  if (typeof $ === 'undefined') {
    console.error('Weather Overlay Plugin: jQuery is required');
    return;
  }
  
  // Get the current script path for relative loading
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];
  var scriptPath = currentScript.src.substring(0, currentScript.src.lastIndexOf('/') + 1);
  
  // Load CSS file
  var cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.type = 'text/css';
  cssLink.href = scriptPath + 'weather_overlay.css';
  document.head.appendChild(cssLink);
  
  // Load the main plugin JavaScript
  $.getScript(scriptPath + 'weather_overlay.js')
    .done(function() {
      if (typeof Plugins._debug !== 'undefined' && Plugins._debug) {
        console.log('Weather Overlay Plugin: Main script loaded successfully');
      }
      
      // Initialize the plugin
      if (typeof Plugins.weather_overlay.init === 'function') {
        Plugins.weather_overlay.init().then(function(success) {
          if (success) {
            Plugins.weather_overlay.initialized = true;
            if (typeof Plugins._debug !== 'undefined' && Plugins._debug) {
              console.log('Weather Overlay Plugin: Initialized successfully');
            }
          }
        }).catch(function(error) {
          console.error('Weather Overlay Plugin: Initialization failed', error);
        });
      }
    })
    .fail(function(jqxhr, settings, exception) {
      console.error('Weather Overlay Plugin: Failed to load main script', exception);
    });
  
  // Utility function to update plugin configuration
  Plugins.weather_overlay.updateConfig = function(newConfig) {
    if (typeof newConfig === 'object') {
      $.extend(true, Plugins.weather_overlay.config, newConfig);
      
      if (typeof Plugins._debug !== 'undefined' && Plugins._debug) {
        console.log('Weather Overlay Plugin: Configuration updated', newConfig);
      }
      
      return true;
    }
    return false;
  };
  
  // Utility function to get plugin status
  Plugins.weather_overlay.getStatus = function() {
    return {
      initialized: Plugins.weather_overlay.initialized,
      layerCount: Object.keys(Plugins.weather_overlay.layers).length,
      config: Plugins.weather_overlay.config,
      version: Plugins.weather_overlay.version
    };
  };
  
  // Utility function to reset plugin to defaults
  Plugins.weather_overlay.reset = function() {
    // Clear localStorage settings
    Object.keys(Plugins.weather_overlay.config.defaultLayers).forEach(function(layerKey) {
      localStorage.removeItem(`leaflet-layer-weather-${layerKey}`);
      localStorage.removeItem(`leaflet-layer-weather-${layerKey}-opacity`);
    });
    
    // Reload the page to reinitialize
    if (confirm('This will reload the page to reset weather overlay settings. Continue?')) {
      window.location.reload();
    }
  };
  
})();

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Plugins.weather_overlay;
}