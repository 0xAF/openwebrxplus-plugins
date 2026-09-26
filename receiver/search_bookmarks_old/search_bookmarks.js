// Compatibility loader for the old Search Bookmarks plugin.
// The plugin was renamed to search_bookmarks_old.js - load that file directly:
// await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/search_bookmarks_old/search_bookmarks_old.js');

Plugins.search_bookmarks.no_css = true;

// URL of the renamed plugin, next to this file
Plugins.search_bookmarks._oldUrl = (document.currentScript && document.currentScript.src || '')
	.replace(/search_bookmarks\.js(\?.*)?$/, 'search_bookmarks_old.js')
	|| 'https://0xaf.github.io/openwebrxplus-plugins/receiver/search_bookmarks_old/search_bookmarks_old.js';

Plugins.search_bookmarks.init = async function () {
	console.warn('search_bookmarks_old/search_bookmarks.js is deprecated, load search_bookmarks_old/search_bookmarks_old.js instead.');
	await Plugins.load(Plugins.search_bookmarks._oldUrl);
	return !!Plugins.isLoaded('search_bookmarks_old');
};
