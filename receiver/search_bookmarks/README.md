## owrx-search-bookmarks by [Yannis](https://github.com/ysamouhos)

Search all owrx bookmarks and click to tune. Jumping to tune based on "frequency_far_jump" plugin by (LZ2DMV)

## Prerequisites

You must enable "Allow users to change center frequency" and in case you have set a magic key, you will have to provide it with a '#key=[KEY]' at the end of the URL.
You can also use the [magic_key](https://0xaf.github.io/openwebrxplus-plugins/receiver/magic_key) plugin.

## Installation

**NOTE**: *You need to use this plugin behind reverse proxy, like Nginx.*

   1. Add the following line in your nginx site configuration (point it to wherever your bookmarks.json file is)

      ```nginx
      location /bookmarks.json { alias /var/lib/openwebrx/bookmarks.json; }
      ```

   2. Add this line in your `init.js` file:

      ```js
      Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/search_bookmarks/search_bookmarks.js');
      ```

   3. Reload UI and you should have search bookmarks functionality on the receiver panel

## init.js

Learn how to [load plugins](/openwebrxplus-plugins/#load-plugins).

## Known issues

   1. Jumping to the bookmark does not switch receiver profile. Or rather, it switches but the change is not visible on the receiver panel. This is expected behaviour of OWRX+.

   2. There is no way yet to select specific receiver profile if multiple profiles exist. Mostly needed if multiple receivers exist.

## Contact and bug reports

You can reach Yannis on Telegram [@ysamouhos](https://t.me/ysamouhos) or [Github](https://github.com/ysamouhos)

## Preview

![image](https://github.com/user-attachments/assets/3b58fcf5-2b26-4f0d-8a72-f868f1c0eb52)
