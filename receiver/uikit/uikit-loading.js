/*
 * uikit-loading.js — Loading overlay with spinner
 *
 * Shows/hides a dimming overlay with a CSS spinner over any DOM element.
 * Works on modal content, panel tabs, or any positioned container.
 *
 * Depends on uikit-core.js (el)
 */

// el: DOM element or CSS selector string
// show: true to show overlay, false to remove it
Plugins.uikit.loading = function (el, show) {
	if (typeof el === 'string') {
		el = document.querySelector(el);
	}
	if (!el) return;

	if (show) {
		if (el._uikitLoading) return; // already showing

		// The overlay is position:absolute, so the parent needs positioning context.
		// If the element is position:static, temporarily switch to relative.
		var cs = window.getComputedStyle(el);
		if (cs.position === 'static') {
			el.dataset.uikitOrigPosition = 'static';
			el.style.position = 'relative';
		}

		var overlay = this.el('div', {
			cls: 'owrx-uikit__loading',
			children: [
				this.el('div', { cls: 'owrx-uikit__loading-spinner' })
			],
			parent: el
		});

		// Store reference on the element for removal
		el._uikitLoading = overlay;
	} else {
		if (el._uikitLoading) {
			if (el._uikitLoading.parentNode) {
				el._uikitLoading.parentNode.removeChild(el._uikitLoading);
			}
			el._uikitLoading = null;
		}
		// Restore original position if we changed it
		if (el.dataset.uikitOrigPosition) {
			el.style.position = el.dataset.uikitOrigPosition;
			delete el.dataset.uikitOrigPosition;
		}
	}
};
