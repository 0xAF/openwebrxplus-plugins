# owrx-search-bookmarks
Search all owrx bookmarks and click to tune. Jumping to tune based on "frequency_far_jump" plugin by (LZ2DMV)

# Prerequisites
You must enable "Allow users to change center frequency" and in case you have set a magic key, you will have to provide it with a '#key=[KEY]' at the end of the URL.


# Installation
1. Add the following line in your nginx site configuration (point it to wherever your bookmarks.json file is)
   location /bookmarks.json { alias /var/lib/openwebrx/bookmarks.json; }
2. Download and add the js and css files in plugins/receiver folder under search_bookmarks folder.
3. Edit init.js and add Plugins.load('search_bookmarks'); at the end of it.

Reload UI and you should have serch bookmarks functionality on the receiver panel

Please note this is still work in progress. 

# Known issues
1. Jumping to the bookmark does not switch receiver profile. (or rather, it switches but the change is not visible on the receiver panel)
2. There is no way yet to select specific receiver profile if multiple profiles exist. Mostly needed if multiple receivers exist.
