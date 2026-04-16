/*
 * uikit-core.js — DOM helpers, SVG/icon builders, button factory, slug utilities
 *
 * Loaded by uikit.js before any other sub-module. Provides the el() DOM
 * factory used throughout the codebase to replace repetitive createElement
 * boilerplate.
 */

// ── DOM Factory ─────────────────────────────────────────────────────────────

// Creates a DOM element in one call.  Accepts tag name and an options object:
//   cls, text, html, id, title, type  — set directly on the element
//   attrs  — { name: value } for setAttribute()
//   data   — { key: value } for dataset
//   style  — string (cssText) or object (individual properties)
//   on     — { event: handler } for addEventListener()
//   disabled — sets the disabled property (for buttons/inputs)
//   children — array of child elements to append (falsy items skipped)
//   parent — if set, the new element is appended to this parent
Plugins.uikit.el = function (tag, opts) {
	opts = opts || {};
	var el = document.createElement(tag);
	if (opts.cls) el.className = opts.cls;
	if (opts.text) el.textContent = opts.text;
	if (opts.html) el.innerHTML = opts.html;
	if (opts.id) el.id = opts.id;
	if (opts.title) el.title = opts.title;
	if (opts.type) el.type = opts.type;
	if (opts.attrs) {
		for (var k in opts.attrs) el.setAttribute(k, opts.attrs[k]);
	}
	if (opts.data) {
		for (var k in opts.data) el.dataset[k] = opts.data[k];
	}
	if (opts.style) {
		if (typeof opts.style === 'string') el.style.cssText = opts.style;
		else for (var k in opts.style) el.style[k] = opts.style[k];
	}
	if (opts.on) {
		for (var ev in opts.on) el.addEventListener(ev, opts.on[ev]);
	}
	if (opts.children) {
		for (var i = 0; i < opts.children.length; i++) {
			if (opts.children[i]) el.appendChild(opts.children[i]);
		}
	}
	if (opts.disabled) el.disabled = true;
	if (opts.parent) opts.parent.appendChild(el);
	return el;
};

// ── Radio Group Helper ──────────────────────────────────────────────────────

// Renders a group of radio buttons into a container.
// options: array of strings or { value, label } objects.
// onChange(value) is called when a radio is selected.
Plugins.uikit.renderRadioGroup = function (container, name, options, current, onChange) {
	container.innerHTML = '';
	var self = this;
	for (var i = 0; i < options.length; i++) {
		var opt = options[i];
		var value = typeof opt === 'string' ? opt : opt.value;
		var label = typeof opt === 'string' ? (value.charAt(0).toUpperCase() + value.slice(1)) : opt.label;
		self.el('label', {
			cls: 'owrx-uikit__radio',
			data: (typeof opt === 'object' && opt.data) ? opt.data : undefined,
			parent: container,
			children: [
				self.el('input', {
					type: 'radio',
					attrs: { name: name, value: value },
					on: { change: function (e) { if (e.target.checked) onChange(e.target.value); } }
				}),
				self.el('span', { text: label })
			]
		});
		// Set checked after append — radio group name scoping requires the
		// input to be in the DOM before checked state is reliable.
		container.lastChild.querySelector('input').checked = (value === current);
	}
};

// ── Dual Range Slider ────────────────────────────────────────────────────────

// Creates a dual-thumb range slider for selecting a [lower, upper] range.
// opts: { min, max, step, lower, upper, onInput(lo,hi), onChange(lo,hi) }
// Returns: { el, setDisabled(bool), setValues(lo, hi) }
Plugins.uikit.createDualSlider = function (opts) {
	var min  = parseFloat(opts.min  !== undefined ? opts.min  : 0);
	var max  = parseFloat(opts.max  !== undefined ? opts.max  : 1);
	var step = parseFloat(opts.step !== undefined ? opts.step : 0.05);
	var lo   = parseFloat(opts.lower !== undefined ? opts.lower : min);
	var hi   = parseFloat(opts.upper !== undefined ? opts.upper : max);

	var wrap  = this.el('div', { cls: 'owrx-uikit__dual-range' });
	var track = this.el('div', { cls: 'owrx-uikit__dual-range-track', parent: wrap });
	var fill  = this.el('div', { cls: 'owrx-uikit__dual-range-fill', parent: track });

	var inputLo = document.createElement('input');
	inputLo.type = 'range';
	inputLo.min = min; inputLo.max = max; inputLo.step = step; inputLo.value = lo;
	wrap.appendChild(inputLo);

	var inputHi = document.createElement('input');
	inputHi.type = 'range';
	inputHi.min = min; inputHi.max = max; inputHi.step = step; inputHi.value = hi;
	wrap.appendChild(inputHi);

	function pct(v) { return (v - min) / (max - min) * 100; }

	function syncFill() {
		fill.style.left  = pct(parseFloat(inputLo.value)) + '%';
		fill.style.right = (100 - pct(parseFloat(inputHi.value))) + '%';
	}

	function syncZ() {
		var atMax = parseFloat(inputLo.value) >= parseFloat(inputHi.value);
		inputLo.style.zIndex = atMax ? 2 : 1;
		inputHi.style.zIndex = atMax ? 1 : 2;
	}

	inputLo.addEventListener('input', function () {
		if (parseFloat(inputLo.value) > parseFloat(inputHi.value)) inputLo.value = inputHi.value;
		syncFill(); syncZ();
		if (opts.onInput) opts.onInput(parseFloat(inputLo.value), parseFloat(inputHi.value));
	});

	inputHi.addEventListener('input', function () {
		if (parseFloat(inputHi.value) < parseFloat(inputLo.value)) inputHi.value = inputLo.value;
		syncFill(); syncZ();
		if (opts.onInput) opts.onInput(parseFloat(inputLo.value), parseFloat(inputHi.value));
	});

	inputLo.addEventListener('change', function () {
		if (opts.onChange) opts.onChange(parseFloat(inputLo.value), parseFloat(inputHi.value));
	});

	inputHi.addEventListener('change', function () {
		if (opts.onChange) opts.onChange(parseFloat(inputLo.value), parseFloat(inputHi.value));
	});

	syncFill();
	syncZ();

	return {
		el: wrap,
		setDisabled: function (disabled) {
			inputLo.disabled = disabled;
			inputHi.disabled = disabled;
		},
		setValues: function (lo, hi) {
			inputLo.value = lo;
			inputHi.value = hi;
			syncFill();
			syncZ();
		}
	};
};

// ── SVG Helpers ─────────────────────────────────────────────────────────────

// Builds an SVG element from a viewBox string and array of inner path/shape strings.
Plugins.uikit.buildSvg = function (viewBox, paths, size) {
	var ns = 'http://www.w3.org/2000/svg';
	var svg = document.createElementNS(ns, 'svg');
	svg.setAttribute('xmlns', ns);
	svg.setAttribute('viewBox', viewBox);
	svg.setAttribute('width', size || 16);
	svg.setAttribute('height', size || 16);
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	svg.innerHTML = paths.join('');
	return svg;
};

// Parses an SVG string and returns a proper SVG DOM element.
Plugins.uikit.svgFromString = function (svgString) {
	if (!svgString || typeof svgString !== 'string') return null;
	try {
		var parser = new DOMParser();
		var doc = parser.parseFromString(svgString, 'image/svg+xml');
		var svg = doc.querySelector('svg');
		if (!svg) {
			// Fallback: parse as HTML fragment
			var wrapper = document.createElement('div');
			wrapper.innerHTML = svgString;
			svg = wrapper.querySelector('svg');
		}
		if (!svg) return null;
		return this._ensureSvg(svg);
	} catch (e) {
		return null;
	}
};

// Ensures an SVG element is in the correct namespace (importNode if needed).
Plugins.uikit._ensureSvg = function (svg) {
	var ns = 'http://www.w3.org/2000/svg';
	if (svg.namespaceURI === ns) return document.importNode(svg, true);

	// Re-create in the SVG namespace if parsed from HTML
	var newSvg = document.createElementNS(ns, 'svg');
	for (var i = 0; i < svg.attributes.length; i++) {
		var attr = svg.attributes[i];
		newSvg.setAttribute(attr.name, attr.value);
	}
	newSvg.setAttribute('xmlns', ns);
	newSvg.innerHTML = svg.innerHTML;
	return newSvg;
};

// ── Icon Builders ───────────────────────────────────────────────────────────

Plugins.uikit.iconCog = function () {
	return this.buildSvg('0 0 24 24', [
		'<circle cx="12" cy="12" r="3"/>',
		'<path d="M19.4 15a7.9 7.9 0 0 0 .1-2l2-1.5-2-3.4-2.4.5a7.6 7.6 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-.5-2 3.4 2 1.5a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.4 2.4-.5a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4.5 2-3.4-2-1.5z"/>'
	]);
};

Plugins.uikit.iconChevron = function () {
	return this.buildSvg('0 0 24 24', ['<path d="M8 14l4-4 4 4"/>']);
};

Plugins.uikit.iconHide = function () {
	return this.buildSvg('0 0 24 24', ['<path d="M6 12h12"/>', '<path d="M8 16h8"/>']);
};

Plugins.uikit.iconClose = function () {
	return this.buildSvg('0 0 24 24', ['<path d="M18 6L6 18M6 6l12 12"/>']);
};

Plugins.uikit.iconPanel = function () {
	return this.buildSvg('0 0 24 24', ['<rect x="3" y="4" width="18" height="16" rx="2" ry="2"/>', '<path d="M3 9h18"/>'], 24);
};

Plugins.uikit.iconArrow = function (dir) {
	switch (dir) {
		case 'down':
			return this.buildSvg('0 0 24 24', ['<path d="M8 10l4 4 4-4"/>']);
		case 'left':
			return this.buildSvg('0 0 24 24', ['<path d="M14 8l-4 4 4 4"/>']);
		case 'right':
			return this.buildSvg('0 0 24 24', ['<path d="M10 8l4 4-4 4"/>']);
		default:
			return this.buildSvg('0 0 24 24', ['<path d="M8 14l4-4 4 4"/>']);
	}
};

// Updates the mini-button arrow to point toward the panel's current position.
Plugins.uikit._updateMiniButtonIcon = function () {
	if (!this._ui || !this._ui.miniButton) return;
	var dir = 'up';
	switch (this._settings.position) {
		case 'top': dir = 'down'; break;
		case 'left': dir = 'right'; break;
		case 'right': dir = 'left'; break;
		default: dir = 'up';
	}
	this._ui.miniButton.innerHTML = '';
	this._ui.miniButton.appendChild(this.iconArrow(dir));
};

// ── Button Factory ──────────────────────────────────────────────────────────

// Creates a styled button element.
// opts.style: 'default' | 'primary' | 'ghost' | 'danger'
// opts.onClick, opts.className, opts.title, opts.disabled
Plugins.uikit.createButton = function (label, opts) {
	opts = opts || {};
	var styleMap = {
		primary: 'owrx-uikit__btn owrx-uikit__btn--primary',
		ghost: 'owrx-uikit__btn owrx-uikit__btn--ghost',
		danger: 'owrx-uikit__btn owrx-uikit__btn--danger'
	};
	var cls = styleMap[opts.style] || 'owrx-uikit__btn';
	if (opts.className) cls += ' ' + opts.className;

	var btn = this.el('button', {
		type: 'button',
		cls: cls,
		text: label,
		title: opts.title || null,
		disabled: !!opts.disabled,
		on: typeof opts.onClick === 'function' ? { click: opts.onClick } : {}
	});
	return btn;
};

// ── Slug Utilities ──────────────────────────────────────────────────────────

// Converts a name to a URL-friendly slug (lowercase, hyphens).
Plugins.uikit._slugify = function (name) {
	if (!name) return 'tab';
	return name
		.toString()
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'tab';
};

// Ensures slug uniqueness within a tab type by appending -2, -3, etc.
Plugins.uikit._uniqueSlug = function (type, slug) {
	var existing = this._tabs[type].map(function (t) { return t.slug; });
	if (existing.indexOf(slug) === -1) return slug;
	var i = 2;
	var next = slug + '-' + i;
	while (existing.indexOf(next) !== -1) {
		i += 1;
		next = slug + '-' + i;
	}
	return next;
};

// Normalizes an icon value (SVGElement, HTMLElement, or SVG string) into a DOM element.
Plugins.uikit._normalizeIcon = function (icon) {
	if (!icon) return null;
	if (icon instanceof SVGElement) return icon;
	if (icon instanceof HTMLElement) return icon;
	if (typeof icon === 'string') {
		return this.svgFromString(icon);
	}
	return null;
};

