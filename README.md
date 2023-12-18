# openwebrxplus-plugins
Plugins collection for OpenWebRX+

My public plugins for OWRX+.  
Every plugin has it's own documentation.  

 - [keyboard_shortcuts](https://0xaf.github.io/openwebrxplus-plugins/receiver/keyboard_shortcuts/)
 - [colorful_spectrum](https://0xaf.github.io/openwebrxplus-plugins/receiver/colorful_spectrum/)

## load plugin
To load a plugin you need to create `init.js` file inside your `openwebrx` installation under `htdocs/plugins/{type}` folder. The `{type}` could be `receiver` or `map` as of the time of writing this info.   
This could be one of the following folders or any other folder:
 * /opt/openwebrx/htdocs/plugins
 * /usr/lib/python3/dist-packages/htdocs

You can find the folder with this command:  
`find / -name openwebrx.js`

You need to create/edit the `init.js`.  
NOTE: you can use the `init.js.sample` file.  
In the next example we will load `receiver` plugins.  
```bash
OWRX_FOLDER=$(dirname `find / -name openwebrx.js`)
cd "$OWRX_FOLDER/plugins/receiver"
cp init.js.sample init.js
$EDITOR init.js
```

An example `init.js` file would look like:
```js
// Receiver plugins loader.

// enable debug info in browser console
Plugins._enable_debug = true;

// First load the utils, needed for some plugins
Plugins.load('utils').then(function () {

  // load local plugins
  Plugins.load('example');
  Plugins.load('example_theme');
  Plugins.load('sort_profiles');

  // load remote plugins
  Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/keyboard_shortcuts/keyboard_shortcuts.js');
  Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/colorful_spectrum/colorful_spectrum.js');
});

```

Each of the local plugins should be in its own sub-folder under `$OWRX_FOLDER/plugins/receiver/` and should be loaded by its name.  
The remote plugins should be loaded with direct url to the `.js` file.  


## docker
If you're using Docker images, then bind-mount the plugins folder to your host system and follow the instructions above. More info can be found in my docker images.


## hosting your plugins on github
If you want to host your plugins on Github, you will have to create [Github Page](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) over your repository. Finding the rest is up to you.

## support
Use these plugins at your own risk. No warranty at all.  
For support, you can find me (`LZ2SLL`) in the [OWRX+ Telegram Chat](https://t.me/openwebrx_chat) or [here](https://0xAF.org/about/).
