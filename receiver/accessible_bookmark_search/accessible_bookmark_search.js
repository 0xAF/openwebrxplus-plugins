/*
 * Accessible Bookmark Search plugin for OpenWebRX+.
 *
 * Replaces the built-in "Search Bookmarks" dialog (right-click on the
 * bookmark button, or the "Y" keyboard shortcut) with a fully keyboard-
 * and screen-reader-accessible version:
 *
 *  - Proper <label>s for the search field and the results list
 *  - Results shown in a native <select> dropdown instead of a table of links
 *  - RETURN in the search field runs/refreshes the search
 *  - Live filtering as you type (no need to press RETURN)
 *  - Leaving the search field empty shows ALL available bookmarks right away,
 *    including bandplan/dial-frequency entries
 *  - TAB from the search field into the results list opens the dropdown
 *  - Each entry is labeled with its source: "(Personal Bookmark)",
 *    "(Systemwide Bookmark)" or "(Bandplan Frequency)"
 *  - Selecting an entry (RETURN, click, or leaving the list) tunes the
 *    receiver to that bookmark
 *  - ESC closes both the search dialog and the "Edit Bookmark" dialog
 *
 * No changes to core files (Shortcuts.js, BookmarkBar.js, index.html, css)
 * are required or made. Both the "Y" shortcut and the right-click on the
 * bookmark button already call BookmarkBar.prototype.showSearchDialog(),
 * so overriding that one method is enough for both triggers to pick up
 * the accessible dialog automatically.
 *
 * License: MIT
 * Copyright (c) 2026
 * Autored by René Jaun, assisted by Claude AI
  *
 * Changes:
 * 0.1:
 *  - initial release
 * 0.2:
 *  - sort results naturally by number (e.g. CB1, CB2, CB10) instead of lexicographically
 */

Plugins.accessible_bookmark_search.no_css = true;
Plugins.accessible_bookmark_search._version = 0.2;

Plugins.accessible_bookmark_search.init = async function () {
	if (!Plugins.isLoaded('utils', 0.4)) {
		await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
		if (!Plugins.isLoaded('utils', 0.4)) {
			console.error('accessible_bookmark_search: plugin depends on "utils >= 0.4".');
			return false;
		}
		Plugins._debug('accessible_bookmark_search: plugin "utils" has been loaded as dependency.');
	}

	if (Plugins.isLoaded('search_bookmarks')) {
		console.warn('accessible_bookmark_search: the "search_bookmarks" plugin is also loaded; '
			+ 'both plugins patch the same BookmarkBar methods, so only the one loaded last '
			+ 'will actually be in effect. Load only one of the two.');
	}

	Plugins.utils.on_ready(function () {
		var $dialog = $('#openwebrx-dialog-search-bookmarks');

		if (!$dialog.length || typeof BookmarkBar === 'undefined') {
			console.error('accessible_bookmark_search: built-in search dialog not found; '
				+ 'this plugin requires an OpenWebRX+ version that ships the bookmark search dialog.');
			return;
		}

		// --- 1. DOM surgery: add missing <label>s and swap the results
		//        container for a native <select>, unless already done. ---

		var $searchText = $dialog.find('#search-text');
		if (!$dialog.find('label[for="search-text"]').length) {
			$searchText.before('<label for="search-text">Search:</label>');
		}

		var $resultsContainer = $dialog.find('#search-results');
		if ($resultsContainer.length && $resultsContainer.prop('tagName') !== 'SELECT') {
			var $select = $('<select id="search-results" name="search-results"></select>');
			$resultsContainer.replaceWith($select);
			$select.before('<label for="search-results">Results:</label>');
		}

		// --- 2. Extend/replace BookmarkBar.prototype ---

		BookmarkBar.prototype.getAllBookmarks = function () {
			return Object.values(this.bookmarks).reduce(function (l, v) { return l.concat(v); }, []);
		};

		BookmarkBar.prototype.formatSearchResult = function (b) {
			var sourceLabels = {
				local: 'Personal Bookmark',
				server: 'System Bookmark',
				dial_frequencies: 'Bandplan Frequency'
			};
			var label = sourceLabels[b.source] || b.source;
			return b.name + ' (' + label + ') ' + Utils.printFreq(b.frequency);
		};

		BookmarkBar.prototype.renderSearchResults = function () {
			var text = this.$search.find('#search-text').val().toLowerCase();

			var result = this.getAllBookmarks().filter(function (b) {
				return (b.name.toLowerCase().indexOf(text) >= 0);
			});

			result.sort(function (a, b) {
				return (a.name.localeCompare(b.name, undefined, { numeric: true }) || (a.frequency - b.frequency));
			});

			this.searchResults = result;

			// Pre-select the entry matching the currently tuned frequency/mode, if any
			var curFreq = UI.getFrequency();
			var curMode = UI.getModulation();
			var selectedIdx = -1;
			for (var i = 0; i < result.length; i++) {
				if (result[i].frequency === curFreq && result[i].modulation === curMode) {
					selectedIdx = i;
					break;
				}
			}

			var me = this;
			var $sel = this.$search.find('#search-results');
			var options = ['<option value="-1">Nothing selected - stay on current frequency</option>'];
			options = options.concat(result.map(function (b, i) {
				var sel = (i === selectedIdx) ? ' selected="selected"' : '';
				return '<option value="' + i + '"' + sel + '>' + me.formatSearchResult(b) + '</option>';
			}));
			$sel.html(options.join('\n'));

			return result;
		};

		BookmarkBar.prototype.searchBookmarks = function () {
			var result = this.renderSearchResults();

			if (result.length) {
				var $sel = this.$search.find('#search-results');
				$sel.focus();
				if ($sel[0].showPicker) $sel[0].showPicker();
			}
		};

		BookmarkBar.prototype.closeSearchDialog = function () {
			this.searchClosing = true;
			this.$search.hide();
			this.searchClosing = false;
		};

		BookmarkBar.prototype.showSearchDialog = function (text) {
			this.$search.show();

			var $input = this.$search.find('#search-text');
			if (text != null) $input.val(text);

			this.renderSearchResults();

			$input.focus();
			$input.select();
		};

		// --- 3. (Re-)wire event handlers on the (possibly replaced) elements ---

		$dialog.find('.openwebrx-button[data-action=cancel]').off('click').on('click', function () {
			bookmarks.closeSearchDialog();
		});

		$dialog.find('#search-text').on('input', function () {
			bookmarks.renderSearchResults();
		});

		$dialog.find('#search-text').on('keydown', function (e) {
			if (e.keyCode === 13) {
				e.preventDefault();
				bookmarks.searchBookmarks();
			} else if (e.keyCode === 9 && !e.shiftKey) {
				var results = $dialog.find('#search-results');
				if (results[0].options.length) {
					e.preventDefault();
					results.focus();
					if (results[0].showPicker) results[0].showPicker();
				}
			}
		});

		$dialog.find('#search-results').on('change', function () {
			var idx = $(this).val();
			if (idx !== null && idx !== '-1' && bookmarks.searchResults && bookmarks.searchResults[idx]) {
				UI.tuneBookmark(bookmarks.searchResults[idx]);
			}
		});

		$dialog.find('#search-results').on('blur', function () {
			if (bookmarks.searchClosing) return;
			var idx = $(this).val();
			if (idx !== null && idx !== '-1' && bookmarks.searchResults && bookmarks.searchResults[idx]) {
				UI.tuneBookmark(bookmarks.searchResults[idx]);
			}
		});

		$dialog.on('keydown', function (e) {
			if (e.keyCode === 27) bookmarks.closeSearchDialog();
		});

		// --- 4. ESC also closes the "Edit Bookmark" dialog (same a11y gap) ---

		$('#openwebrx-dialog-bookmark').on('keydown', function (e) {
			if (e.keyCode === 27) $(this).hide();
		});

		Plugins._debug('accessible_bookmark_search: patched the bookmark search dialog for accessibility.');
	});

	return true;
};
