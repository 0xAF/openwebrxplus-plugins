---
layout: page
title: OpenWebRX+ Plugins Home
permalink: /
---

OpenWebRX+ Plugin collection.  

There are two types of plugins as of now:

* [Receiver Plugins](#receiver-plugins)
* [Map Plugins](#map-plugins)

Every plugin has it's own documentation.  

Learn how to [install and load the plugins](#load-plugins).

---

### Receiver Plugins

| Name | Description |
| :------ | :---------- |
|[toggle_scannable](receiver/toggle_scannable)|Toggle the scannable state of the bookmarks with right mouse button|
|[tune_precise](receiver/tune_precise)|Add buttons to precisely tune the frequency ([LZ2DMV](#contributors))|
|[mouse_freq](receiver/mouse_freq)|Show freq under cursor next to the cursor|
|[doppler](receiver/doppler)|Track Doppler shift/effect of satellites (based on Sergey Osipov's work)|
|[magic_key](receiver/magic_key)|set MagicKey without typing it in the browser's address bar|
|[screenshot](receiver/screenshot)|take screenshot of the waterfall|
|[screen_reader](receiver/screen_reader)|provide spoken notifications to users with Assistive Technology|
|[antenna_switcher](receiver/antenna_switcher)|antenna switching functionality for Raspberry Pi devices ([LZ2DMV](#contributors))|
|[tune_checkbox](receiver/tune_checkbox)|make the 'Hold mouse wheel down to tune' setting enabled by default ([LZ2DMV](#contributors))|
|[frequency_far_jump](receiver/frequency_far_jump)|jump to a frequency outside of the current profile, by typing it in the receiver's frequency dial ([LZ2DMV](#contributors))|
|[~~keyboard_shortcuts~~](receiver/keyboard_shortcuts)|(**deprecated**) add keyboard shortcuts to the receiver|
|[colorful_spectrum](receiver/colorful_spectrum)|colorize the spectrum analyzer|
|[connect_notify](receiver/connect_notify)|send/receive notifications on user connect/disconnect|
|[sort_profiles](receiver/sort_profiles)|sort profiles by __NAME__|
|[tune_checkbox](receiver/tune_checkbox)|enable mouse-scroll to zoom by default ([LZ2DMV](#contributors))|
|[utils](receiver/utils)|this is utility plugin, required by many plugins|
|[notify](receiver/notify)|this is utility plugin, required by some plugins|
|[example](receiver/example)|example plugin for developers|
|[example_theme](receiver/example_theme)|example theme plugin for developers|

### Map Plugins

| Name | Description |
| :------ | :---------- |
|[~~layer_qth_maidenhead~~](map/layer_qth_maidenhead)|(**deprecated**) add Maidenhead (QTH) grid to the map|

---

### Load Plugins

To load a plugin you need to create `init.js` file inside your `openwebrx` installation under `htdocs/plugins/{type}` folder. The `{type}` should be `receiver` or `map`.  
The folder could be one of the these, depending on the installation of OWRX+ you have:

* /opt/openwebrx/htdocs
* /usr/lib/python3/dist-packages/htdocs

You can find the correct folder with this command:  
`find / -name openwebrx.js`

Now create or edit the `init.js` file. The easiest way is to use the provided templates:

* [receiver/init.js.sample](receiver/init.js.sample)
* [map/init.js.sample](map/init.js.sample)

Here is an example how to create the `receiver/init.js`.  

```bash
OWRX_FOLDER=$(dirname `find / -name openwebrx.js`) # find OWRX+ htdocs folder
mkdir -p "$OWRX_FOLDER/plugins/receiver" # create folder if it does not exist
cd "$OWRX_FOLDER/plugins/receiver" # go inside folder
wget https://0xaf.github.io/openwebrxplus-plugins/receiver/init.js.sample -O init.js # download template
${EDITOR-nano} init.js # start the editor
```

### Raspberry Pi Images

If you are using the [Raspberry Pi images](https://github.com/luarvique/openwebrx/releases), there is a caching service called `varnish` that might (will) prevent your plugins from loading immediately after you edit the `init.js` file.  
To avoid weird issues, it is recommended to invalidate the cache after any changes to the plugins system by restarting the corresponding services:

`sudo systemctl restart varnish nginx`

### Docker

If you're using Docker images ([openwebrxplus](https://hub.docker.com/r/slechev/openwebrxplus) or [openwebrxplus-softmbe](https://hub.docker.com/r/slechev/openwebrxplus-softmbe)), then you will need to bind-mount the plugins folder to your host system and follow the instructions above. More info can be found in the docker pages of the images.

### Create plugins

If you're a developer and want to create new plugins, you need to get familiar with OWRX+ JS code.  
Then you might want to check the [example plugin](receiver/example) or the [example theme plugin](receiver/example_theme).
After you get the are familiar enough, you can check the code of the rest plugins.

You can develop your plugins locally and load them, similar to the remote plugins.  
Local plugins should be in their own sub-folder under `$OWRX_FOLDER/plugins/{type}/` and should be loaded by their (folder) name. i.e. `Plugins.load('layer_qth_maidenhead');`.  
Note that remote plugins are loaded with direct url to the `.js` file. i.e. `Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/map/layer_qth_maidenhead/layer_qth_maidenhead.js');`.  

### Hosting your plugins on GitHub

If you want to host your plugins on Github, you will need to create [Github Page](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) over your repository, because direct links to a file in the repo will return wrong Content-Type and the browser will not load JS with wrong content-type. Finding the rest is up to you.

### Support

Use these plugins at your own risk. No warranty at all.  
For support, you can find me (`LZ2SLL`) in the [OWRX+ Telegram Chat](https://t.me/openwebrx_chat) or [here](https://0xAF.org/about/).

### Contributors

* [LZ2DMV](https://github.com/LZ2DMV)