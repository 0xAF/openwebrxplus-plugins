/*
 * uikit-modals.js — Plugin modal API (createModal, openModal, closeModal,
 *                    destroyModal, getModal), resize handle, info/question dialogs
 *
 * Depends on uikit-core.js (el, iconClose, createButton)
 */

// ── Plugin Modal API ────────────────────────────────────────────────────────

// Creates and registers a modal. Idempotent — calling again with the same
// slug updates opts and returns the existing handle.
Plugins.uikit.createModal = function (slug, opts) {
	if (!this._ui || !this._ui.root) {
		console.error('[uikit] createModal: uikit not initialized');
		return null;
	}
	if (this._modals[slug]) {
		Object.assign(this._modals[slug].opts, opts || {});
		return this._buildPluginModalHandle(slug);
	}
	opts = opts || {};
	this._buildPluginModal(slug, opts);
	return this._buildPluginModalHandle(slug);
};

Plugins.uikit.openModal = function (slug) {
	var entry = this._modals[slug];
	if (!entry) return;

	entry._lastFocus = document.activeElement;

	var visibleEl = entry.wrapEl || entry.modalEl;
	visibleEl.classList.remove('owrx-uikit__hidden');
	if (entry.wrapEl) {
		entry.wrapEl.setAttribute('aria-hidden', 'false');
		entry.wrapEl.removeAttribute('inert');
	}
	entry.modalEl.focus();

	if (typeof entry.opts.onOpen === 'function') {
		entry.opts.onOpen();
	}
};

Plugins.uikit.closeModal = function (slug) {
	var entry = this._modals[slug];
	if (!entry) return;

	// onClose hook can return false to prevent closing
	if (typeof entry.opts.onClose === 'function') {
		if (entry.opts.onClose() === false) return;
	}

	var visibleEl = entry.wrapEl || entry.modalEl;
	visibleEl.classList.add('owrx-uikit__hidden');
	if (entry.wrapEl) {
		entry.wrapEl.setAttribute('aria-hidden', 'true');
		entry.wrapEl.setAttribute('inert', '');
	}

	var last = entry._lastFocus;
	if (last && typeof last.focus === 'function') last.focus();
};

Plugins.uikit.destroyModal = function (slug) {
	var entry = this._modals[slug];
	if (!entry) return;

	var removeEl = entry.wrapEl || entry.modalEl;
	if (removeEl && removeEl.parentNode) {
		removeEl.parentNode.removeChild(removeEl);
	}

	var last = entry._lastFocus;
	if (last && typeof last.focus === 'function') last.focus();

	delete this._modals[slug];
};

Plugins.uikit.getModal = function (slug) {
	if (!this._modals[slug]) return null;
	return this._buildPluginModalHandle(slug);
};

// ── Modal Construction ──────────────────────────────────────────────────────

Plugins.uikit._buildPluginModal = function (slug, opts) {
	var self = this;
	var showTitleBar = opts.titleBar !== undefined ? opts.titleBar : !!opts.title;
	var showCloseBtn = opts.closeButton !== undefined ? opts.closeButton : true;
	var closeBtnPos = opts.closeButtonPosition === 'left' ? 'left' : 'right';
	var showBackdrop = opts.backdrop !== undefined ? opts.backdrop : true;
	var showFooter = !!opts.footer;
	var isResizable = !!opts.resizable;

	var modalEl = this.el('div', {
		cls: 'owrx-uikit__pm' + (opts.className ? ' ' + opts.className : ''),
		attrs: { tabindex: '-1' },
		style: {
			width: opts.width || '480px',
			height: (opts.height && opts.height !== 'auto') ? opts.height : '',
			minWidth: opts.minWidth || '',
			minHeight: opts.minHeight || ''
		},
		on: { keydown: function (e) {
			e.stopPropagation();
			if (e.key === 'Escape' && opts.closeOnEsc !== false) self.closeModal(slug);
		}}
	});

	if (isResizable) modalEl.classList.add('owrx-uikit__pm--resizable');

	// Apply custom border styling
	if (opts.border === false) {
		modalEl.style.border = 'none';
	} else if (opts.borderStyle) {
		modalEl.style.border = opts.borderStyle;
	}
	if (opts.borderRadius) {
		modalEl.style.borderRadius = opts.borderRadius;
	}

	// Header with title and optional close button
	if (showTitleBar) {
		var headerChildren = [];

		if (showCloseBtn && closeBtnPos === 'left') {
			headerChildren.push(this.el('button', {
				type: 'button',
				cls: 'owrx-uikit__icon-btn owrx-uikit__pm-close',
				title: 'Close',
				children: [this.iconClose()],
				// stopPropagation prevents click from reaching the canvas/waterfall below
				on: { click: function (e) { e.stopPropagation(); self.closeModal(slug); } }
			}));
		}

		headerChildren.push(this.el('div', {
			cls: 'owrx-uikit__pm-title',
			text: opts.title || ''
		}));

		if (showCloseBtn && closeBtnPos === 'right') {
			headerChildren.push(this.el('button', {
				type: 'button',
				cls: 'owrx-uikit__icon-btn owrx-uikit__pm-close',
				title: 'Close',
				children: [this.iconClose()],
				on: { click: function (e) { e.stopPropagation(); self.closeModal(slug); } }
			}));
		}

		this.el('div', {
			cls: 'owrx-uikit__pm-header',
			children: headerChildren,
			parent: modalEl
		});
	}

	// Floating close button when there's no title bar
	if (showCloseBtn && !showTitleBar) {
		this.el('button', {
			type: 'button',
			cls: 'owrx-uikit__icon-btn owrx-uikit__pm-close-float owrx-uikit__pm-close-float--' + closeBtnPos,
			title: 'Close',
			children: [this.iconClose()],
			on: { click: function (e) { e.stopPropagation(); self.closeModal(slug); } },
			parent: modalEl
		});
	}

	// Body (plugin content goes here)
	var bodyEl = this.el('div', { cls: 'owrx-uikit__pm-body openwebrx-panel', parent: modalEl });

	// Footer (optional button bar)
	var footerEl = null;
	if (showFooter) {
		footerEl = this.el('div', { cls: 'owrx-uikit__pm-footer', parent: modalEl });
	}

	// Resize handle (bottom-right corner)
	var resizeHandle = null;
	if (isResizable) {
		resizeHandle = this.el('div', {
			cls: 'owrx-uikit__pm-resize-handle',
			title: 'Resize',
			parent: modalEl
		});
	}

	// Wrap in backdrop or insert directly (floating modal)
	var wrapEl = null;
	if (showBackdrop) {
		wrapEl = this.el('div', {
			cls: 'owrx-uikit__pm-backdrop owrx-uikit__hidden',
			attrs: { 'aria-hidden': 'true', inert: '' },
			children: [modalEl],
			parent: this._ui.root
		});

		if (opts.closeOnBackdrop !== false) {
			wrapEl.addEventListener('click', function (e) {
				// _resizing flag prevents close when the user drags the resize
				// handle and releases the mouse outside the modal boundary
				if (e.target === wrapEl && !entry._resizing) {
					e.stopPropagation();
					self.closeModal(slug);
				}
			});
		}
	} else {
		modalEl.classList.add('owrx-uikit__pm--floating');
		modalEl.classList.add('owrx-uikit__hidden');
		this._ui.root.appendChild(modalEl);
	}

	var entry = {
		slug: slug,
		opts: opts,
		wrapEl: wrapEl,
		modalEl: modalEl,
		bodyEl: bodyEl,
		footerEl: footerEl,
		resizeHandle: resizeHandle,
		_lastFocus: null,
		_resizing: false
	};

	this._modals[slug] = entry;

	if (isResizable) {
		this._bindResizeHandle(entry);
	}

	return entry;
};

// Returns a public handle object for a registered modal.
Plugins.uikit._buildPluginModalHandle = function (slug) {
	var self = this;
	var entry = this._modals[slug];
	if (!entry) return null;
	return {
		contentEl: entry.bodyEl,
		footerEl: entry.footerEl,
		open: function () { self.openModal(slug); },
		close: function () { self.closeModal(slug); },
		destroy: function () { self.destroyModal(slug); }
	};
};

// ── Resize Handle ───────────────────────────────────────────────────────────

Plugins.uikit._bindResizeHandle = function (entry) {
	var handle = entry.resizeHandle;
	var modalEl = entry.modalEl;
	var minW = parseFloat(entry.opts.minWidth) || 200;
	var minH = parseFloat(entry.opts.minHeight) || 80;
	var startX, startY, startW, startH;

	function onMove(e) {
		var newW = Math.max(minW, startW + e.clientX - startX);
		var newH = Math.max(minH, startH + e.clientY - startY);
		modalEl.style.width = newW + 'px';
		modalEl.style.height = newH + 'px';
	}

	function onUp() {
		document.removeEventListener('pointermove', onMove);
		document.removeEventListener('pointerup', onUp);
		// setTimeout(0) delays clearing the flag so the synchronous click event
		// (which fires immediately after pointerup) still sees _resizing=true
		// and the backdrop handler skips the close.
		setTimeout(function () { entry._resizing = false; }, 0);
	}

	handle.addEventListener('pointerdown', function (e) {
		e.preventDefault();
		entry._resizing = true;
		startX = e.clientX;
		startY = e.clientY;
		var rect = modalEl.getBoundingClientRect();
		startW = rect.width;
		startH = rect.height;
		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	});
};

// ── info / question Dialogs ─────────────────────────────────────────────────

// Shows a modal with a message and an OK button. Returns a Promise that
// resolves when OK is clicked. The modal is auto-destroyed.
Plugins.uikit.info = function (message, opts) {
	var self = this;
	return new Promise(function (resolve) {
		var slug = '__info_' + Date.now() + '__';
		opts = opts || {};
		var modal = self.createModal(slug, {
			title: opts.title !== undefined ? opts.title : 'Information',
			closeButton: false,
			closeOnEsc: false,
			closeOnBackdrop: false,
			footer: true,
			width: opts.width || '400px'
		});

		if (typeof message === 'string') {
			self.el('p', { cls: 'owrx-uikit__pm-message', text: message, parent: modal.contentEl });
		} else if (message instanceof HTMLElement) {
			modal.contentEl.appendChild(message);
		}

		var okBtn = self.createButton(opts.okLabel || 'OK', {
			style: 'primary',
			onClick: function () { self.destroyModal(slug); resolve(); }
		});
		modal.footerEl.appendChild(okBtn);

		self.openModal(slug);
		okBtn.focus();
	});
};

// Shows a modal with OK / Cancel buttons. Resolves true (OK) or false (Cancel).
Plugins.uikit.question = function (message, opts) {
	var self = this;
	return new Promise(function (resolve) {
		var slug = '__question_' + Date.now() + '__';
		opts = opts || {};
		var modal = self.createModal(slug, {
			title: opts.title !== undefined ? opts.title : 'Confirm',
			closeButton: false,
			closeOnEsc: false,
			closeOnBackdrop: false,
			footer: true,
			width: opts.width || '400px'
		});

		if (typeof message === 'string') {
			self.el('p', { cls: 'owrx-uikit__pm-message', text: message, parent: modal.contentEl });
		} else if (message instanceof HTMLElement) {
			modal.contentEl.appendChild(message);
		}

		var cancelBtn = self.createButton(opts.cancelLabel || 'Cancel', {
			style: 'ghost',
			onClick: function () { self.destroyModal(slug); resolve(false); }
		});

		var okBtn = self.createButton(opts.okLabel || 'OK', {
			style: 'primary',
			onClick: function () { self.destroyModal(slug); resolve(true); }
		});

		modal.footerEl.appendChild(cancelBtn);
		modal.footerEl.appendChild(okBtn);

		self.openModal(slug);
		okBtn.focus();
	});
};
