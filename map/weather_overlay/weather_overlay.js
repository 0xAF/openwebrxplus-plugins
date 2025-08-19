/*
 * Plugin: Weather Overlay for OpenWebRX Map
 * 
 * Adds weather data overlays to the map using OpenWeatherMap API
 * Supports precipitation, clouds, temperature, wind, and pressure layers
 *
 * License: MIT
 * Copyright (c) 2024 OpenWebRX+ Weather Plugin
 */

// Ensure the plugin namespace exists
if (typeof Plugins.weather_overlay === 'undefined') {
  Plugins.weather_overlay = {
    name: 'Weather Overlay',
    version: '1.0.0',
    description: 'Adds weather data overlays to the map using OpenWeatherMap API'
  };
}

// Initialize the plugin
Plugins.weather_overlay.init = async function () {
  
  var interval = setInterval(async function () {
    // if google maps gets loaded, stop here - weather overlay works with OSM only
    if (typeof (google) !== 'undefined') {
      if (typeof Plugins._debug === 'function') {
        Plugins._debug('Weather overlay is supported in OSM only.');
      } else if (Plugins._debug) {
        console.log('Weather overlay is supported in OSM only.');
      }
      clearInterval(interval);
      return;
    }

    // wait for Leaflet to get loaded
    if (typeof (L) === 'undefined') return;
    clearInterval(interval);

    // Check if weather overlay is already installed
    var installed = false;
    $.each(mapExtraLayers, function (idx, mel) {
      if (mel.name && mel.name.includes("Weather")) installed = true;
    });
    if (installed) {
      console.error('Weather overlay already installed. Not installing the plugin.');
      return false;
    }

    // OpenWeatherMap API configuration
    const OWM_API_KEY = 'demo'; // Users should replace with their own API key <mcreference link="https://openweathermap.org/api" index="3">3</mcreference>
    const OWM_BASE_URL = 'https://tile.openweathermap.org/map';
    
    // Weather layer definitions <mcreference link="https://openweathermap.org/api/weathermaps" index="1">1</mcreference>
    const weatherLayers = {
      precipitation: {
        name: 'Precipitation',
        layer: 'precipitation_new',
        opacity: 0.6,
        enabled: false
      },
      clouds: {
        name: 'Clouds',
        layer: 'clouds_new', 
        opacity: 0.4,
        enabled: false
      },
      temperature: {
        name: 'Temperature',
        layer: 'temp_new',
        opacity: 0.5,
        enabled: false
      },
      wind: {
        name: 'Wind Speed',
        layer: 'wind_new',
        opacity: 0.5,
        enabled: false
      },
      pressure: {
        name: 'Pressure',
        layer: 'pressure_new',
        opacity: 0.4,
        enabled: false
      }
    };

    // Create weather layer objects
    const weatherLayerObjects = {};
    
    Object.keys(weatherLayers).forEach(function(key) {
      const config = weatherLayers[key];
      
      // Create tile layer using OpenWeatherMap tile service <mcreference link="https://openweathermap.org/api/weathermaps" index="1">1</mcreference>
      weatherLayerObjects[key] = L.tileLayer(
        `${OWM_BASE_URL}/${config.layer}/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
        {
          attribution: '© OpenWeatherMap',
          opacity: config.opacity,
          maxZoom: 18
        }
      );
      
      // Load saved state from localStorage
      const savedState = LS.loadBool(`leaflet-layer-weather-${key}`);
      config.enabled = savedState || false;
    });

    // Create weather control panel
    const weatherControl = L.control({ position: 'topright' });
    
    weatherControl.onAdd = function(map) {
      const div = L.DomUtil.create('div', 'weather-control leaflet-bar');
      div.innerHTML = `
        <div class="weather-panel">
          <div class="weather-header">
            <span class="weather-title">🌤️ Weather</span>
            <button class="weather-toggle" onclick="Plugins.weather_overlay.togglePanel()">▼</button>
          </div>
          <div class="weather-layers" id="weather-layers-panel">
            ${Object.keys(weatherLayers).map(key => {
              const config = weatherLayers[key];
              return `
                <label class="weather-layer-item">
                  <input type="checkbox" 
                         id="weather-${key}" 
                         data-layer="${key}"
                         ${config.enabled ? 'checked' : ''}>
                  <span>${config.name}</span>
                  <input type="range" 
                         class="opacity-slider" 
                         min="0" 
                         max="100" 
                         value="${Math.round(config.opacity * 100)}"
                         data-layer="${key}">
                </label>
              `;
            }).join('')}
            <div class="weather-info">
              <small>API Key: ${OWM_API_KEY === 'demo' ? 'Demo (Limited)' : 'Custom'}</small>
            </div>
          </div>
        </div>
      `;
      
      // Prevent map interaction when clicking on control
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      
      return div;
    };
    
    // Add weather control to map
    weatherControl.addTo(map);
    
    // Add event listeners for checkboxes and sliders
    $(document).on('change', '[data-layer]', function() {
      const layerKey = $(this).data('layer');
      const layer = weatherLayerObjects[layerKey];
      
      if ($(this).is(':checkbox')) {
        // Handle layer toggle
        const isChecked = $(this).is(':checked');
        weatherLayers[layerKey].enabled = isChecked;
        
        if (isChecked) {
          if (!map.hasLayer(layer)) {
            map.addLayer(layer);
          }
        } else {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
        }
        
        // Save state to localStorage
        LS.save(`leaflet-layer-weather-${layerKey}`, isChecked);
        
      } else if ($(this).hasClass('opacity-slider')) {
        // Handle opacity change
        const opacity = $(this).val() / 100;
        weatherLayers[layerKey].opacity = opacity;
        layer.setOpacity(opacity);
        
        // Save opacity to localStorage
        LS.save(`leaflet-layer-weather-${layerKey}-opacity`, opacity);
      }
    });
    
    // Initialize enabled layers
    Object.keys(weatherLayers).forEach(function(key) {
      const config = weatherLayers[key];
      if (config.enabled) {
        map.addLayer(weatherLayerObjects[key]);
      }
      
      // Load saved opacity
      const savedOpacity = LS.load(`leaflet-layer-weather-${key}-opacity`);
      if (savedOpacity !== null) {
        config.opacity = parseFloat(savedOpacity);
        weatherLayerObjects[key].setOpacity(config.opacity);
        $(`.opacity-slider[data-layer="${key}"]`).val(Math.round(config.opacity * 100));
      }
    });
    
    // Store references for external access
    Plugins.weather_overlay.layers = weatherLayerObjects;
    Plugins.weather_overlay.config = weatherLayers;
    
    if (typeof Plugins._debug === 'function') {
      Plugins._debug('Weather overlay plugin loaded successfully');
    } else if (Plugins._debug) {
      console.log('Weather overlay plugin loaded successfully');
    }
    
  }, 10);

  return true;
};

// Toggle weather panel visibility
Plugins.weather_overlay.togglePanel = function() {
  const panel = document.getElementById('weather-layers-panel');
  const toggle = document.querySelector('.weather-toggle');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    toggle.textContent = '▼';
  } else {
    panel.style.display = 'none';
    toggle.textContent = '▶';
  }
};

// Update API key (for users who want to use their own)
Plugins.weather_overlay.setApiKey = function(apiKey) {
  // This would require recreating the tile layers with the new API key
  console.log('To change API key, please modify the OWM_API_KEY constant in the plugin file');
};

// Get current weather layer status
Plugins.weather_overlay.getLayerStatus = function() {
  return Object.keys(Plugins.weather_overlay.config || {}).map(key => ({
    layer: key,
    name: Plugins.weather_overlay.config[key].name,
    enabled: Plugins.weather_overlay.config[key].enabled,
    opacity: Plugins.weather_overlay.config[key].opacity
  }));
};