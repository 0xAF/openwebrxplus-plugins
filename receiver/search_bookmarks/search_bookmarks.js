// Seaarch Bookmarks UI plugin for OpenWebRX+
// License: MIT
// Switching frquency code is based on LZ2DMV "frequency_far_jump" plugin

Plugins.search_bookmarks.init = function () {
    if (!Plugins.isLoaded('utils', 0.1)) {
      Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');
      Plugins._debug('Plugin "utils" has been loaded as dependency.');
    }
    // Create search section container
    const searchSection = document.createElement('div');
    searchSection.id = 'openwebrx-section-search-content';
    searchSection.classList.add('openwebrx-section');

    // Create search panel line
    const searchPanelLine = document.createElement('div');
    searchPanelLine.classList.add('openwebrx-search', 'openwebrx-panel-line');
    searchSection.appendChild(searchPanelLine);

    // Create search input grid
    const searchGrid = document.createElement('div');
    searchGrid.classList.add('openwebrx-search-grid');
    searchPanelLine.appendChild(searchGrid);

    // Create search input field
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'owrx-search-input';
    searchInput.placeholder = 'Search bookmarks...';
    searchInput.classList.add('openwebrx-input');
    searchGrid.appendChild(searchInput);

    // Create search button
    const searchButton = document.createElement('div');
    searchButton.id = 'owrx-search-button';
    searchButton.classList.add('openwebrx-button');
    searchButton.textContent = 'Search';
    searchButton.onclick = function() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            performBookmarkSearch(searchTerm);
        }
    };
    searchGrid.appendChild(searchButton);

    // Create clear button
    const clearButton = document.createElement('div');
    clearButton.id = 'owrx-clear-search-button';
    clearButton.classList.add('openwebrx-button');
    clearButton.textContent = 'Clear';
    clearButton.onclick = function() {
        searchInput.value = '';
        clearSearchResults();
    };
    searchGrid.appendChild(clearButton);

    // Section divider to hide/show search panel
    const searchSectionDivider = document.createElement('div');
    searchSectionDivider.id = 'openwebrx-section-search';
    searchSectionDivider.classList.add('openwebrx-section-divider');
    searchSectionDivider.onclick = () => UI.toggleSection(searchSectionDivider);
    searchSectionDivider.innerHTML = '&blacktriangledown;&nbsp;Search Bookmarks';

    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'owrx-search-results-wrapper';
      
    // Create results container
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'owrx-search-results';
    resultsContainer.className = 'owrx-search-results';
    resultsWrapper.appendChild(resultsContainer);
    searchSection.appendChild(resultsWrapper);

    // Create loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'owrx-search-loading';
    loadingIndicator.classList.add('openwebrx-loading');
    loadingIndicator.style.display = 'none';
    loadingIndicator.textContent = 'Loading...';
    searchSection.appendChild(loadingIndicator);

    // Insert elements into DOM
    const targetElement = document.getElementById('openwebrx-section-modes');
    targetElement.parentNode.insertBefore(searchSectionDivider, targetElement);
    targetElement.parentNode.insertBefore(searchSection, targetElement);

    // Add keyboard support (search on Enter key)
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });

    // URL to fetch JSON data from (configure this as needed)
    const BOOKMARKS_JSON_URL = '/bookmarks.json'; // Update with your actual URL

    // Function to perform the search
    async function performBookmarkSearch(term) {
        const loading = document.getElementById('owrx-search-loading');
        const resultsContainer = document.getElementById('owrx-search-results');
        
        try {
            // Show loading indicator
            loading.style.display = 'block';
            resultsContainer.innerHTML = '';

            // Fetch bookmarks data
            const response = await fetch(BOOKMARKS_JSON_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const bookmarks = await response.json();

            // Filter bookmarks
            const results = filterBookmarks(bookmarks, term.toLowerCase());
            
            // Display results
	    console.log('Bookmarks:', results);
            displaySearchResults(results);
        } catch (error) {
            console.error('Error fetching or processing bookmarks:', error);
            resultsContainer.innerHTML = 
                `<div class="openwebrx-error">Error loading bookmarks: ${error.message}</div>`;
        } finally {
            loading.style.display = 'none';
        }
    }


    function filterBookmarks(bookmarks, term) {
        return bookmarks.filter(bookmark => {
            // Search in multiple fields
            return (
                (bookmark.name && bookmark.name.toLowerCase().includes(term)) ||
                (bookmark.frequency && bookmark.frequency.toString().includes(term)) ||
                (bookmark.mode && bookmark.mode.toLowerCase().includes(term)) ||
                (bookmark.description && bookmark.description.toLowerCase().includes(term))
            );
        });
    }

    // Display search results
    function displaySearchResults(results) {
        const container = document.getElementById('owrx-search-results');
        container.innerHTML = '';
        
        if (results.length === 0) {
            container.innerHTML = '<div class="owrx-no-results">No matches found</div>';
            return;
        }
        
        results.forEach(bookmark => {
            const resultItem = document.createElement('div');
            resultItem.className = 'owrx-search-result';
            
            // Create result content
            const content = document.createElement('div');
            content.className = 'owrx-search-result-content';
            
            // Name
            const name = document.createElement('div');
            name.className = 'owrx-search-result-name';
            name.textContent = bookmark.name || 'Unnamed Bookmark';
            content.appendChild(name);
            
            // Frequency and mode
            if (bookmark.frequency) {
                const freq = document.createElement('div');
                freq.className = 'owrx-search-result-freq';
                freq.textContent = `${bookmark.frequency} kHz`;
                if (bookmark.mode) {
                    freq.textContent += ` (${bookmark.mode})`;
                }
                content.appendChild(freq);
            }
            
            // Description
            if (bookmark.description) {
                const desc = document.createElement('div');
                desc.className = 'owrx-search-result-desc';
                desc.textContent = bookmark.description;
                content.appendChild(desc);
            }
            
            resultItem.appendChild(content);
            
            // Click handler
            resultItem.addEventListener('click', () => {
		handleBookmarkSelection(bookmark);
            });
            
            container.appendChild(resultItem);
        });
    }

    function selectBookmark(bookmark) {
        console.log("Selected bookmark:", bookmark);
        
        // Tune to the bookmark's frequency
        if (bookmark.frequency && typeof receiver !== 'undefined') {
            const freq = parseFloat(bookmark.frequency) * 1000; // Convert kHz to Hz
            if (!isNaN(freq)) {
                receiver.setFrequency(freq);
                
                // Set mode if specified
                if (bookmark.mode) {
                    receiver.setMode(bookmark.mode.toUpperCase());
                }
                
                // Optional: Close search results after selection
                resultsContainer.innerHTML = '';
                searchInput.value = '';
            }
        }
    }

    // Handle bookmark selection (tune to frequency, etc.)
    function handleBookmarkSelection(bookmark) {
      var to_what = Math.round(bookmark.frequency);
      if (to_what > bandwidth / 2 || to_what < -bandwidth / 2) {
        var f = to_what;
        var k = $('#openwebrx-panel-receiver').demodulatorPanel().getMagicKey();

        // Ask the backend over the WS to switch the frequency for us
        ws.send(JSON.stringify({
          "type": "setfrequency", "params": { "frequency": f, "key": k }
        }));

      } else {
        // The frequency is within the boundaries of the current profile,
        // just use the original set_offset_frequency
        orig.apply(thisArg, args);
      }
    }

    function clearSearchResults() {
        document.getElementById('owrx-search-results').innerHTML = '';
    }

    return true;
};
