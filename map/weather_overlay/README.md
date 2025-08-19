# Weather Overlay Plugin for OpenWebRX+

This plugin adds weather data overlays to the OpenWebRX+ map interface using OpenWeatherMap API.

## Features

- **Multiple Weather Layers**: Precipitation, Clouds, Temperature, Wind Speed, and Pressure
- **Real-time Data**: Live weather information from OpenWeatherMap
- **Interactive Controls**: Toggle layers on/off and adjust opacity
- **Persistent Settings**: Layer states and opacity levels are saved in browser storage
- **Responsive Design**: Works on desktop and mobile devices
- **OSM Integration**: Designed specifically for OpenStreetMap (Leaflet) maps

## Installation

1. Copy the `weather_overlay` folder to your OpenWebRX+ plugins/map directory:
   ```
   htdocs/plugins/map/weather_overlay/
   ```

2. Add the plugin to your map plugin initialization file (`init.js`):
   ```javascript
   // Load weather overlay plugin
   $.getScript(mp_url + 'weather_overlay/weather_overlay.js');
   ```

3. Include the CSS file in your HTML head section or load it dynamically:
   ```html
   <link rel="stylesheet" href="plugins/map/weather_overlay/weather_overlay.css">
   ```

## Configuration

### API Key Setup

The plugin uses OpenWeatherMap's free tier by default with a demo API key. For production use, you should:

1. Sign up for a free account at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your API key from the dashboard
3. Replace the `OWM_API_KEY` constant in `weather_overlay.js`:
   ```javascript
   const OWM_API_KEY = 'your_api_key_here';
   ```

### Available Weather Layers

| Layer | Description | Default Opacity |
|-------|-------------|----------------|
| Precipitation | Rain, snow, and other precipitation | 60% |
| Clouds | Cloud coverage | 40% |
| Temperature | Temperature data | 50% |
| Wind Speed | Wind speed visualization | 50% |
| Pressure | Atmospheric pressure | 40% |

## Usage

1. **Access Controls**: The weather control panel appears in the top-right corner of the map
2. **Toggle Layers**: Use checkboxes to enable/disable weather layers
3. **Adjust Opacity**: Use the sliders to control layer transparency
4. **Collapse Panel**: Click the arrow button to minimize the control panel

## Technical Details

### Dependencies

- Leaflet.js (included with OpenWebRX+ OSM maps)
- jQuery (included with OpenWebRX+)
- OpenWeatherMap Tile API

### Browser Compatibility

- Modern browsers with ES6 support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+

### Performance Considerations

- Weather tiles are cached by the browser
- API requests are made only when tiles are needed
- Demo API key has rate limits - use your own key for production

## API Reference

### Plugin Methods

```javascript
// Toggle weather panel visibility
Plugins.weather_overlay.togglePanel();

// Get current layer status
Plugins.weather_overlay.getLayerStatus();

// Access layer objects
Plugins.weather_overlay.layers.precipitation
Plugins.weather_overlay.layers.clouds
// etc.
```

### Local Storage Keys

The plugin saves settings using these localStorage keys:
- `leaflet-layer-weather-{layerName}`: Layer enabled state
- `leaflet-layer-weather-{layerName}-opacity`: Layer opacity value

## Troubleshooting

### Common Issues

1. **Weather layers not appearing**:
   - Check browser console for API errors
   - Verify API key is valid
   - Ensure you're using OSM (not Google Maps)

2. **Control panel not showing**:
   - Verify CSS file is loaded
   - Check for JavaScript errors in console
   - Ensure Leaflet is loaded before the plugin

3. **Slow loading**:
   - Check network connection
   - Consider using your own API key for better rate limits

### Debug Mode

Enable plugin debugging in your `init.js`:
```javascript
Plugins._enable_debug = true;
```

## License

MIT License - Feel free to modify and distribute.

## Credits

- Weather data provided by [OpenWeatherMap](https://openweathermap.org/)
- Built for [OpenWebRX+](https://github.com/luarvique/openwebrx)
- Uses [Leaflet](https://leafletjs.com/) mapping library

## Version History

- **1.0.0**: Initial release with basic weather overlay functionality
  - Precipitation, clouds, temperature, wind, and pressure layers
  - Interactive control panel with opacity controls
  - Persistent settings storage
  - Responsive design support