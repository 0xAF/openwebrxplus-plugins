# TETRA Demodulation Plugin for OpenWebRX+

## Overview
This plugin adds support for TERRESTRIAL TRUNKED RADIO (TETRA) demodulation in OpenWebRX+. TETRA is a digital mobile radio standard developed by ETSI, primarily used by emergency services, government agencies, and utilities for secure voice and data communication.

## Features
- Adds TETRA as a selectable demodulation mode in the OpenWebRX+ interface
- Configures appropriate bandpass settings for TETRA signals
- Processes and displays TETRA demodulation data

## Requirements
- OpenWebRX+ installation
- Utils plugin (version >= 0.1)

## Installation
1. Place the `tetra` folder in your OpenWebRX+ plugins directory: `htdocs/plugins/receiver/`
2. Add the following line to your `init.js` file:
   ```javascript
   Plugins.load('tetra');
   ```

## Usage
After installation and restarting OpenWebRX+, TETRA will appear as a selectable mode in the demodulation options. Select it when tuning to TETRA signals.

## Technical Details
TETRA uses π/4-DQPSK modulation with a channel spacing of 25 kHz. The plugin configures appropriate bandpass settings (-4000 to 4000 Hz) for optimal reception.

## License
This plugin is provided under the same license as OpenWebRX+.