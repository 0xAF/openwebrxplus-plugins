/*
 * uikit-toasts.js — Toast notification system
 *
 * Toasts stack vertically with auto-dismiss timers that pause on hover.
 * Containers are appended to document.body (independent of uikit root/panel).
 *
 * Depends on uikit-core.js (el, buildSvg, iconClose)
 */

// ── Toast API ───────────────────────────────────────────────────────────────

// Shows a toast notification. Returns a unique ID for early dismissal.
// opts: { type, title, timeout, closable, position }
Plugins.uikit.toast = function (message, opts) {
	opts = opts || {};
	var self = this;
	var id = 'toast-' + (++this._toastSeq);
	var type = opts.type || 'info';
	var timeout = (opts.timeout !== undefined) ? opts.timeout : 4000;
	var closable = (opts.closable !== undefined) ? opts.closable : true;
	var position = opts.position || 'bottom-center';

	var container = this._getToastContainer(position);

	// Build toast element
	var toastEl = this.el('div', {
		cls: 'owrx-uikit__toast owrx-uikit__toast--' + type,
		data: { toastId: id }
	});

	// Icon
	this.el('div', {
		cls: 'owrx-uikit__toast-icon',
		children: [this._toastIcon(type)],
		parent: toastEl
	});

	// Content (optional title + message)
	var contentEl = this.el('div', { cls: 'owrx-uikit__toast-content', parent: toastEl });

	if (opts.title) {
		this.el('div', { cls: 'owrx-uikit__toast-title', text: opts.title, parent: contentEl });
	}

	var msgEl = this.el('div', { cls: 'owrx-uikit__toast-message', parent: contentEl });
	if (typeof message === 'string') {
		msgEl.textContent = message;
	} else if (message instanceof HTMLElement) {
		msgEl.appendChild(message);
	}

	// Close button
	if (closable) {
		this.el('button', {
			type: 'button',
			cls: 'owrx-uikit__toast-close',
			title: 'Dismiss',
			children: [this.iconClose()],
			on: { click: function () { self.dismissToast(id); } },
			parent: toastEl
		});
	}

	// Progress bar (visual countdown)
	if (timeout > 0) {
		this.el('div', {
			cls: 'owrx-uikit__toast-progress',
			style: { animationDuration: timeout + 'ms' },
			parent: toastEl
		});
	}

	// Top positions prepend (newest at top), bottom positions append (newest at bottom)
	if (position.indexOf('top') === 0) {
		container.insertBefore(toastEl, container.firstChild);
	} else {
		container.appendChild(toastEl);
	}

	// Timer state for pause/resume on hover
	var entry = {
		el: toastEl,
		timer: null,
		deadline: 0,
		remaining: timeout,
		position: position
	};
	this._toasts[id] = entry;

	// Auto-dismiss with hover pause/resume
	if (timeout > 0) {
		this._startToastTimer(id);

		toastEl.addEventListener('mouseenter', function () {
			// Pause: freeze the progress bar and save remaining time
			toastEl.classList.add('owrx-uikit__toast--paused');
			if (entry.timer) {
				clearTimeout(entry.timer);
				entry.timer = null;
			}
			entry.remaining = Math.max(0, entry.deadline - Date.now());
		});

		toastEl.addEventListener('mouseleave', function () {
			// Resume: restart the timer with the remaining time
			toastEl.classList.remove('owrx-uikit__toast--paused');
			if (entry.remaining > 0) {
				self._startToastTimer(id);
			}
		});
	}

	return id;
};

// Dismisses a toast with slide-out animation.
Plugins.uikit.dismissToast = function (id) {
	var entry = this._toasts[id];
	if (!entry) return;

	if (entry.timer) {
		clearTimeout(entry.timer);
		entry.timer = null;
	}

	var el = entry.el;
	el.classList.add('owrx-uikit__toast--dismissing');

	var self = this;
	el.addEventListener('animationend', function () {
		if (el.parentNode) el.parentNode.removeChild(el);
		delete self._toasts[id];
	}, { once: true });

	// Fallback removal if CSS animation doesn't fire (e.g. display:none parent)
	setTimeout(function () {
		if (self._toasts[id]) {
			if (el.parentNode) el.parentNode.removeChild(el);
			delete self._toasts[id];
		}
	}, 400);
};

Plugins.uikit.dismissAllToasts = function () {
	var ids = Object.keys(this._toasts);
	for (var i = 0; i < ids.length; i++) {
		this.dismissToast(ids[i]);
	}
};

// ── Toast Internals ─────────────────────────────────────────────────────────

// Starts (or restarts) the auto-dismiss timer, recording the deadline
// so remaining time can be computed on hover-pause.
Plugins.uikit._startToastTimer = function (id) {
	var entry = this._toasts[id];
	if (!entry || entry.remaining <= 0) return;
	var self = this;
	entry.deadline = Date.now() + entry.remaining;
	entry.timer = setTimeout(function () {
		self.dismissToast(id);
	}, entry.remaining);
};

// Lazily creates a positioned container for toasts (one per position).
// Containers live on document.body, not inside the uikit root, so they're
// not affected by panel position or pointer-events: none on the root.
Plugins.uikit._getToastContainer = function (position) {
	if (this._toastContainers[position]) return this._toastContainers[position];

	var container = this.el('div', {
		cls: 'owrx-uikit-toasts owrx-uikit-toasts--' + position,
		parent: document.body
	});

	this._toastContainers[position] = container;
	return container;
};

// Returns an SVG icon element for the given toast type.
Plugins.uikit._toastIcon = function (type) {
	switch (type) {
		case 'success':
			return this.buildSvg('0 0 24 24', ['<path d="M20 6L9 17l-5-5"/>'], 20);
		case 'warning':
			return this.buildSvg('0 0 24 24', ['<path d="M12 9v4"/>', '<path d="M12 17h.01"/>', '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>'], 20);
		case 'error':
			return this.buildSvg('0 0 24 24', ['<circle cx="12" cy="12" r="10"/>', '<path d="M15 9l-6 6"/>', '<path d="M9 9l6 6"/>'], 20);
		default: // info
			return this.buildSvg('0 0 24 24', ['<circle cx="12" cy="12" r="10"/>', '<path d="M12 16v-4"/>', '<path d="M12 8h.01"/>'], 20);
	}
};
