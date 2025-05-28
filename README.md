--- 
layout: page
title: OpenWebRX+ Plugins Home
permalink: /
---

# OpenWebRX+ Plugins

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**OpenWebRX+ Plugins** is a community-driven collection of plugins that extend [OpenWebRX+](https://github.com/luarvique/openwebrx) with new features, UI enhancements, and integrations for SDR receivers.

## Table of Contents

- [Project Overview](#project-overview)
- [Plugin List](#plugin-list)
  - [Receiver Plugins](#receiver-plugins)
  - [Map Plugins](#map-plugins)
  - [Thirdparty Plugins](#thirdparty-plugins)
- [Installation & Loading Plugins](#installation--loading-plugins)
  - [Example setup](#example-setup)
- [Raspberry Pi & Docker Notes](#raspberry-pi--docker-notes)
- [Developing Plugins](#developing-plugins)
  - [Hosting on GitHub](#hosting-on-github)
- [Contributing](#contributing)
- [Support](#support)
- [FAQ](#faq)
- [Contributors](#contributors)
- [License](#license)

## Project Overview

This repository provides a set of plugins for OpenWebRX+, allowing users to customize and enhance their SDR experience. Plugins are grouped into:

- **Receiver Plugins**: Enhance the receiver UI and add new features.
- **Map Plugins**: Add new layers or features to the map interface.

Each plugin is documented in its own folder.

## Plugin List

### Receiver Plugins

| Name | Description |
| :------ | :---------- |
|[search_bookmarks](receiver/search_bookmarks)|Search all OWRX bookmarks and click to tune ([Yannis](#contributors))|
|[toggle_scannable](receiver/toggle_scannable)|Toggle the scannable state of bookmarks with right mouse button|
|[tune_precise](receiver/tune_precise)|Add buttons for precise frequency tuning ([LZ2DMV](#contributors))|
|[mouse_freq](receiver/mouse_freq)|Show frequency under cursor on the waterfall|
|[doppler](receiver/doppler)|Track Doppler shift/effect of satellites|
|[magic_key](receiver/magic_key)|Set MagicKey without typing it in the browser's address bar|
|[screenshot](receiver/screenshot)|Take screenshot of the waterfall|
|[screen_reader](receiver/screen_reader)|Provide spoken notifications for accessibility|
|[antenna_switcher](receiver/antenna_switcher)|Antenna switching for Raspberry Pi devices ([LZ2DMV](#contributors))|
|[tune_checkbox](receiver/tune_checkbox)|Enable mouse-scroll to zoom by default ([LZ2DMV](#contributors))|
|[frequency_far_jump](receiver/frequency_far_jump)|Jump to a frequency outside the current profile ([LZ2DMV](#contributors))|
|[~~keyboard_shortcuts~~](receiver/keyboard_shortcuts)|(**deprecated**) Add keyboard shortcuts|
|[colorful_spectrum](receiver/colorful_spectrum)|Colorize the spectrum analyzer|
|[connect_notify](receiver/connect_notify)|Send/receive notifications on user connect/disconnect|
|[sort_profiles](receiver/sort_profiles)|Sort profiles by name|
|[utils](receiver/utils)|Utility plugin, required by many plugins|
|[notify](receiver/notify)|Notification utility plugin|
|[example](receiver/example)|Example plugin for developers|
|[example_theme](receiver/example_theme)|Example theme plugin for developers|

### Map Plugins

| Name | Description |
| :------ | :---------- |
|[~~layer_qth_maidenhead~~](map/layer_qth_maidenhead)|(**deprecated**) Add Maidenhead (QTH) grid to the map|

### Thirdparty Plugins

| Name | Description |
| :------ | :---------- |
|[owrxantswitcher](https://github.com/jrghnng/owrxantswitcher)|Switch antenna ports using a WebAPI on the server.|

## Installation & Loading Plugins

1. **Find your OpenWebRX+ `htdocs` folder**  
   Use the following command to locate it:

   ```sh
   find / -name openwebrx.js
   ```

2. **Typical locations for `htdocs`**:
   - `/opt/openwebrx/htdocs`
   - `/usr/lib/python3/dist-packages/htdocs`

3. **Create the plugins folder if it doesn't exist**  

   ```sh
   mkdir -p /path/to/htdocs/plugins/receiver
   ```

4. **Create or edit the `init.js` file**  
   Use the provided templates:
   - [receiver/init.js.sample](receiver/init.js.sample)
   - [map/init.js.sample](map/init.js.sample)

5. **Add plugin loading lines to your `init.js` file**  
   For example:

   ```js
   Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/tune_precise/tune_precise.js');
   ```

### Example setup

```bash
OWRX_FOLDER=$(dirname `find / -name openwebrx.js`)
mkdir -p "$OWRX_FOLDER/plugins/receiver"
cd "$OWRX_FOLDER/plugins/receiver"
wget https://0xaf.github.io/openwebrxplus-plugins/receiver/init.js.sample -O init.js
${EDITOR-nano} init.js
```

See each plugin's README for specific instructions.

## Raspberry Pi & Docker Notes

- **Raspberry Pi**:  
  If using [Raspberry Pi images](https://github.com/luarvique/openwebrx/releases), a caching service (`varnish`) may prevent plugins from loading immediately after editing `init.js`.  
  Restart services to clear cache:

  ```sh
  sudo systemctl restart varnish nginx
  ```

- **Docker**:  
  For Docker images ([openwebrxplus](https://hub.docker.com/r/slechev/openwebrxplus)), bind-mount the plugins folder and follow the above instructions. See Docker image documentation for details.

## Developing Plugins

If you want to create new plugins:

1. Get familiar with the OWRX+ JS codebase.
2. Review the [example plugin](receiver/example) and [example theme plugin](receiver/example_theme).
3. Develop plugins locally in `$OWRX_FOLDER/plugins/{type}/your_plugin/`.
4. Load local plugins by folder name:  
   `Plugins.load('your_plugin');`
5. Load remote plugins by URL:  
   `Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/map/layer_qth_maidenhead/layer_qth_maidenhead.js');`

### Hosting on GitHub

To host plugins on GitHub, use [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) for correct JS Content-Type.

## Contributing

Contributions are welcome!  

- Submit pull requests, providing the same structure for the folders as the rest of the plugins.
- For major changes, open an issue first to discuss.
- Please follow the style of existing plugins and documentation.

## Support

Use these plugins at your own risk. No warranty is provided.  
For support, contact [`LZ2SLL`](https://0xaf.org/about/) or join the [OWRX+ Telegram Chat](https://t.me/openwebrx_chat).

## FAQ

**Q: My plugin changes are not visible after editing `init.js`.**  
A: If using Raspberry Pi images, restart `varnish` and `nginx` as described above.

**Q: Where do I put my local plugins?**  
A: In the `htdocs/plugins/receiver` or `htdocs/plugins/map` folder of your OpenWebRX+ installation.

**Q: How do I load a plugin from a URL?**  
A: Use `Plugins.load('https://.../plugin_name/plugin_name.js');` in your `init.js`.

---

## Contributors

- [LZ2DMV](https://github.com/LZ2DMV)
- [Yannis](https://github.com/ysamouhos)

---

## License

This project is licensed under the [MIT License](LICENSE).
