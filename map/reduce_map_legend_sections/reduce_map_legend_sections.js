Plugins.reduce_map_legend_sections.no_css = true;

/**
 * Adds CSS transition styles for smooth collapse/expand animations.
 * Creates two states: normal (visible) and collapsed (hidden).
 *
 * @param {string} selector - CSS selector for the elements to style
 * @param {string} collapsedClass - CSS class name for the collapsed state
 */
function addTransitionStyle(selector, collapsedClass) {
  // Create a new style element to inject into the page
  const style = document.createElement('style');
  style.textContent = `
    /* Normal state: visible with smooth transitions */
    ${selector} {
      transition: max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease;
      overflow: hidden; /* Hide content when max-height is 0 */
      max-height: 500px; /* Large enough to fit content */
      opacity: 1; /* Fully visible */
      margin-bottom: 1em; /* Normal spacing between sections */
    }
    /* Collapsed state: hidden with 0 height and transparent */
    ${selector}.${collapsedClass} {
      max-height: 0;
      opacity: 0;
      margin-bottom: 0; /* Remove bottom margin when collapsed */
      margin-top: 0; /* Remove top margin when collapsed */
    }
  `;
  document.head.appendChild(style);
}

/**
 * Makes a section collapsible by clicking on its title (h3 element).
 *
 * @param {string} titleText - The exact text content of the h3 title to make clickable
 * @param {Array<HTMLElement>} elements - Array of DOM elements to show/hide when clicking
 * @param {string} collapsedClass - CSS class name to toggle for collapsed state
 */
function makeCollapsible(titleText, elements, collapsedClass) {
  // Find the h3 element with the matching text content
  const title = Array.from(document.querySelectorAll('h3'))
    .find(h3 => h3.textContent.trim() === titleText);

  // Exit early if title not found or any element is missing
  if (!title || elements.some(el => !el)) return;

  // Make the title appear clickable
  title.style.cursor = 'pointer';
  title.style.userSelect = 'none'; // Prevent text selection when clicking
  title.style.transition = 'margin 0.3s ease'; // Smooth margin animation for both top and bottom

  // Create a visual indicator (arrow) to show the section is collapsible
  const indicator = document.createElement('span');
  indicator.textContent = ' ▼'; // Down arrow symbol
  indicator.style.fontSize = '0.8em'; // Slightly smaller than title text
  indicator.style.transition = 'transform 0.3s ease'; // Smooth rotation animation
  indicator.style.display = 'inline-block'; // Required for transform to work
  title.appendChild(indicator);

  // Add click event to toggle visibility
  title.addEventListener('click', () => {
    // Toggle the collapsed class on all elements in the section
    elements.forEach(el => el.classList.toggle(collapsedClass));

    // Check if section is now collapsed
    const isCollapsed = elements[0].classList.contains(collapsedClass);

    // Rotate the arrow indicator: -90deg (right) when collapsed, 0deg (down) when expanded
    indicator.style.transform = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';

    // Minimize margins when collapsed to reduce spacing between sections
    if (isCollapsed) {
      title.style.marginTop = '2px';
      title.style.marginBottom = '2px';
    } else {
      // Reset to original margins when expanded
      title.style.marginTop = '';
      title.style.marginBottom = '';
    }
  });
}

// ===== Get DOM element references once (more efficient) =====
const featuresList = document.querySelector('ul.features');
const mapSource = document.getElementById('openwebrx-map-source');
const mapExtras = document.getElementById('openwebrx-map-extralayers');
const colorMode = document.getElementById('openwebrx-map-colormode');
const colorContent = document.querySelector('.content');

// ===== Setup Features section =====
addTransitionStyle('ul.features', 'collapsed');
makeCollapsible('Features', [featuresList], 'collapsed');

// ===== Setup Map section (with two elements: select and checkboxes) =====
addTransitionStyle('#openwebrx-map-source', 'collapsed-map');
addTransitionStyle('#openwebrx-map-extralayers', 'collapsed-map');
makeCollapsible('Map', [mapSource, mapExtras], 'collapsed-map');

// ===== Setup Colors section (with two elements: select and color list) =====
addTransitionStyle('#openwebrx-map-colormode', 'collapsed-colors');
addTransitionStyle('.content', 'collapsed-colors');
makeCollapsible('Colors', [colorMode, colorContent], 'collapsed-colors');
