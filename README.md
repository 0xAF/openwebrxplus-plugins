# openwebrxplus-plugins
Plugins collection for OpenWebRX+

My public plugins for OWRX+.  
Every plugin has it's own documentation.  

### receiver plugins
- [antenna_switcher](receiver/antenna_switcher/) - antenna switching functionality for Raspberry Pi devices (LZ2DMV)
 - [tune_checkbox](receiver/tune_checkbox/) - make the 'Hold mouse wheel down to tune' setting enabled by default (LZ2DMV)
 - [frequency_far_jump](receiver/frequency_far_jump/) - jump to a frequency outside of the current profile, by typing it in the receiver's frequency dial (LZ2DMV)
 - [keyboard_shortcuts](receiver/keyboard_shortcuts/) - add keyboard shortcuts to the receiver
 - [colorful_spectrum](receiver/colorful_spectrum/) - colorize the spectrum analyzer
 - [connect_notify](receiver/connect_notify/) - send/receive notifications on user connect/disconnect
 - [sort_profiles](receiver/sort_profiles/) - sort profiles by __NAME__
 - [utils](receiver/utils/) - (this is utility plugin, required by many plugins)
 - [notify](receiver/notify/) - (this is utility plugin, required by some plugins)

### map plugins
 - [layer_qth_maidenhead](map/layer_qth_maidenhead/) - add Maidenhead (QTH) grid to the map

## load plugin
To load a plugin you need to create `init.js` file inside your `openwebrx` installation under `htdocs/plugins/{type}` folder. The `{type}` could be `receiver` or `map` as of the time of writing this info.   
This could be one of the following folders or any other folder:
 * /opt/openwebrx/htdocs
 * /usr/lib/python3/dist-packages/htdocs

You can find the folder with this command:  
`find / -name openwebrx.js`

You need to create/edit the `init.js`.  
In the next example we will load `receiver` plugins.  
First we need to create the `init.js` file:  
```bash
OWRX_FOLDER=$(dirname `find / -name openwebrx.js`)
cd "$OWRX_FOLDER/plugins/receiver"
cp init.js.sample init.js
$EDITOR init.js
```

__Use [receiver/init.js.sample](receiver/init.js.sample) or [map/init.js.sample](map/init.js.sample) file as a template.__  


Each of the locally installed plugins (if any) should be in its own sub-folder under `$OWRX_FOLDER/plugins/{type}/` and should be loaded by its name. i.e. `Plugins.load('layer_qth_maidenhead');`.  
The remote plugins should be loaded with direct url to the `.js` file. i.e. `Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/map/layer_qth_maidenhead/layer_qth_maidenhead.js');`.  

### restart cache

If you are using **the Raspberry Pi images**, there is an active caching service called `varnish` that might prevent your plugins from loading immediately after you install them.

To avoid weird issues, it is recommended to invalidate the cache after any changes to the plugins system by restarting the corresponding services:

`sudo systemctl restart varnish nginx`

## docker
If you're using Docker images, then bind-mount the plugins folder to your host system and follow the instructions above. More info can be found in my docker images.


## hosting your plugins on github
If you want to host your plugins on Github, you will have to create [Github Page](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) over your repository. Finding the rest is up to you.

## support
Use these plugins at your own risk. No warranty at all.  
For support, you can find me (`LZ2SLL`) in the [OWRX+ Telegram Chat](https://t.me/openwebrx_chat) or [here](https://0xAF.org/about/).
