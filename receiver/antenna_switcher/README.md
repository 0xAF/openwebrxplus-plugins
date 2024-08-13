  
# OWRX+ Receiver Plugin: antenna_switcher

This is a `receiver` plugin to add antenna switching functionality for Raspberry Pi devices, providing logical levels on their GPIO ports that correpond to the user's antenna selection via buttons on the WebSDR's front-end.

It consists of a **front-end** and **back-end** part.

The front-end is a standard OpenWebRX+ plugin and its installation does not differ from the standard way you install plugins:

# I. Front-end installation

## load
Add this lines in your `init.js` file:
```js
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/antenna_switcher/antenna_switcher.js');
```

## options

### Back-end URL

You probably don't want to change the default back-end instance URL, but if you do want to, you can do it from `init.js`, before or after the plugin has loaded, with:

`Plugins.antenna_switcher.API_URL = 'URL:PORT/antenna_switch'`

## init.js
You can find more info on `init.js` [on GitHub pages](https://0xaf.github.io/openwebrxplus-plugins/) or directly in [0xAF's GitHub repo](https://github.com/0xAF/openwebrxplus-plugins).

# II. Back-end installation

The back-end installation script **is designed to work with OpenWebRX+ installed from the repository as a package**. You need to adjust it in case you want to use it inside a Docker container.

For the back-end, download and run the **install_backend.sh** Bash script **as root**:

`chmod +x ./install_backend.sh`

`./install_backend.sh`

The script will download and install the Flask back-end in a Python virtual envrionment located in `/opt/antenna_switcher`, so you don't have to worry about libraries messing up your system's default Python installation.

It will also create a target file for a systemd service called `antenna_switcher`, then start and enable it.

The nginx configuration will be extended to provide reverse proxying from the OpenWebRX front-end *(default port 8073)* to the Flask back-end *(port 8075, binding only on 127.0.0.1)*.

## Configuration

Things like which GPIO pins to raise high when the corresponding button from the front-end is selected can be configured in `/opt/antenna_switcher/antenna_switcher.cfg`.
