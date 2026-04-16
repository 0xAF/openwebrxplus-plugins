/*
 * Plugin: example_uikit - Demo plugin showcasing all UIKit features
 *
 * This plugin is for developers. It demonstrates every UIKit API with
 * working, copy-paste-ready code. Enable it in init.js to explore.
 *
 * Dependencies: uikit >= 0.3
 * License: MIT
 */

Plugins.example_uikit = Plugins.example_uikit || {};
Plugins.example_uikit._version = 0.3;
Plugins.example_uikit.no_css = true;

Plugins.example_uikit.init = async function () {
	if (!Plugins.isLoaded('uikit', 0.3)) {
		await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/uikit/uikit.js');
	}
	if (!Plugins.isLoaded('uikit', 0.3)) {
		console.error('[example_uikit] failed to load uikit >= 0.3');
		return false;
	}

	// The plugin loader calls uikit.init() but does not await it (async return
	// value is treated as truthy and ignored). Await the stored Promise directly
	// so sub-modules are guaranteed to be loaded before we use any of their API.
	if (Plugins.uikit._initPromise instanceof Promise) {
		await Plugins.uikit._initPromise;
	}

	// Helper: create a demo button with margin
	function btn(label, style, onclick) {
		var b = Plugins.uikit.createButton(label, { style: style || 'default', onClick: onclick });
		b.style.margin = '3px';
		return b;
	}

	var starIcon = Plugins.uikit.buildSvg('0 0 24 24', [
		'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01z"/>'
	]);

	// ── Buttons Tab ─────────────────────────────────────────────────────
	var buttonsSlug = Plugins.uikit.addTab('Buttons', { order: 902 });
	var buttonsEl = Plugins.uikit.getTabEl(buttonsSlug);
	if (buttonsEl) {
		var wrap = document.createElement('div');

		wrap.appendChild(btn('Default', 'default', function () {
			Plugins.uikit.toast('Default button clicked', { timeout: 2000 });
		}));
		wrap.appendChild(btn('Primary', 'primary', function () {
			Plugins.uikit.toast('Primary button clicked', { type: 'info', timeout: 2000 });
		}));
		wrap.appendChild(btn('Ghost', 'ghost', function () {
			Plugins.uikit.toast('Ghost button clicked', { type: 'info', timeout: 2000 });
		}));
		wrap.appendChild(btn('Danger', 'danger', function () {
			Plugins.uikit.toast('Danger button clicked', { type: 'warning', timeout: 2000 });
		}));

		var disabledBtn = Plugins.uikit.createButton('Disabled', { style: 'primary', disabled: true });
		disabledBtn.style.margin = '3px';
		wrap.appendChild(disabledBtn);

		buttonsEl.innerHTML = '';
		buttonsEl.appendChild(wrap);
	}

	// ── Modals Tab ──────────────────────────────────────────────────────
	var modalsSlug = Plugins.uikit.addTab('Modals', { order: 900, activate: true, icon: starIcon });
	var modalsEl = Plugins.uikit.getTabEl(modalsSlug);
	if (modalsEl) {
		var wrap = document.createElement('div');

		wrap.appendChild(btn('Basic Modal', 'primary', function () {
			var m = Plugins.uikit.createModal('demo-basic', {
				title: 'Basic Modal',
				footer: true,
				width: '420px'
			});
			m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">This is a basic modal with a title bar, body content, and a footer.</p>';

			m.footerEl.innerHTML = '';
			m.footerEl.appendChild(Plugins.uikit.createButton('Close', {
				style: 'ghost',
				onClick: function () { m.close(); }
			}));

			m.open();
		}));

		wrap.appendChild(btn('Close Left', 'default', function () {
			var m = Plugins.uikit.createModal('demo-close-left', {
				title: 'Close Button on Left',
				closeButtonPosition: 'left',
				width: '380px'
			});
			m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">The close button is on the left side of the title bar.</p>';
			m.open();
		}));

		wrap.appendChild(btn('No Title Bar', 'default', function () {
			var m = Plugins.uikit.createModal('demo-no-title', {
				closeButton: true,
				closeButtonPosition: 'right',
				width: '350px'
			});
			m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">No title bar — close button floats in the corner.</p>';
			m.open();
		}));

		wrap.appendChild(btn('No Backdrop', 'default', function () {
			var m = Plugins.uikit.createModal('demo-floating', {
				title: 'Floating Modal',
				backdrop: false,
				width: '320px'
			});
			m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">This modal has no backdrop and floats over the page.</p>';
			m.open();
		}));

		wrap.appendChild(btn('Resizable', 'default', function () {
			var m = Plugins.uikit.createModal('demo-resizable', {
				title: 'Resizable Modal',
				resizable: true,
				width: '400px',
				height: '300px',
				minWidth: '250px',
				minHeight: '150px'
			});
			m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">Drag the bottom-right corner to resize this modal.</p>';
			m.open();
		}));

		wrap.appendChild(btn('Custom Border', 'default', function () {
			var m = Plugins.uikit.createModal('demo-border', {
				title: 'Custom Border',
				borderStyle: '2px solid #6f89ff',
				borderRadius: '16px',
				width: '380px'
			});
			m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">This modal has a custom blue border and larger radius.</p>';
			m.open();
		}));

		wrap.appendChild(btn('Lifecycle Hooks', 'default', function () {
			var m = Plugins.uikit.createModal('demo-hooks', {
				title: 'Lifecycle Hooks',
				width: '380px',
				onOpen: function () {
					console.log('[demo] onOpen fired');
					Plugins.uikit.toast('onOpen hook fired — check console', { type: 'info', timeout: 2000 });
				},
				onClose: function () {
					console.log('[demo] onClose fired');
					Plugins.uikit.toast('onClose hook fired — check console', { type: 'info', timeout: 2000 });
				}
			});
			m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">Open and close this modal to see lifecycle hooks in action (check the console).</p>';
			m.open();
		}));

		modalsEl.innerHTML = '';
		modalsEl.appendChild(wrap);
	}

	// ── Dialogs Tab ─────────────────────────────────────────────────────
	var dialogsSlug = Plugins.uikit.addTab('Dialogs', { order: 903 });
	var dialogsEl = Plugins.uikit.getTabEl(dialogsSlug);
	if (dialogsEl) {
		var wrap = document.createElement('div');

		wrap.appendChild(btn('info()', 'primary', async function () {
			await Plugins.uikit.info('The scan has completed successfully.', {
				title: 'Scan Complete'
			});
			Plugins.uikit.toast('info() resolved', { type: 'success', timeout: 2000 });
		}));

		wrap.appendChild(btn('question()', 'primary', async function () {
			var yes = await Plugins.uikit.question('Are you sure you want to delete this bookmark?', {
				title: 'Delete Bookmark',
				okLabel: 'Delete',
				cancelLabel: 'Keep'
			});
			Plugins.uikit.toast('You chose: ' + (yes ? 'Delete' : 'Keep'), {
				type: yes ? 'warning' : 'info',
				timeout: 3000
			});
		}));

		dialogsEl.innerHTML = '';
		dialogsEl.appendChild(wrap);
	}

	// ── Toasts Tab ──────────────────────────────────────────────────────
	var toastsSlug = Plugins.uikit.addTab('Toasts', { order: 904 });
	var toastsEl = Plugins.uikit.getTabEl(toastsSlug);
	if (toastsEl) {
		var wrap = document.createElement('div');

		wrap.appendChild(btn('Info Toast', 'default', function () {
			Plugins.uikit.toast('This is an info toast notification.');
		}));

		wrap.appendChild(btn('Success', 'default', function () {
			Plugins.uikit.toast('Operation completed.', { type: 'success' });
		}));

		wrap.appendChild(btn('Warning', 'default', function () {
			Plugins.uikit.toast('Signal strength is low.', { type: 'warning' });
		}));

		wrap.appendChild(btn('Error', 'default', function () {
			Plugins.uikit.toast('Connection lost!', { type: 'error' });
		}));

		wrap.appendChild(btn('With Title', 'default', function () {
			Plugins.uikit.toast('Received 42 new signals in the last scan cycle.', {
				type: 'success',
				title: 'Scan Results',
				timeout: 5000
			});
		}));

		wrap.appendChild(btn('Persistent (no timeout)', 'default', function () {
			Plugins.uikit.toast('This toast will not auto-dismiss. Close it with the × button.', {
				type: 'warning',
				title: 'Persistent',
				timeout: 0
			});
		}));

		wrap.appendChild(btn('Dismiss All', 'danger', function () {
			Plugins.uikit.dismissAllToasts();
		}));

		toastsEl.innerHTML = '';
		toastsEl.appendChild(wrap);
	}

	// ── Loading Tab ─────────────────────────────────────────────────────
	var loadingSlug = Plugins.uikit.addTab('Loading', { order: 905 });
	var loadingEl = Plugins.uikit.getTabEl(loadingSlug);
	if (loadingEl) {
		var wrap = document.createElement('div');

		wrap.appendChild(btn('Toggle Loading (2s)', 'primary', function () {
			Plugins.uikit.loading(loadingEl, true);
			setTimeout(function () {
				Plugins.uikit.loading(loadingEl, false);
				Plugins.uikit.toast('Loading finished.', { type: 'success', timeout: 2000 });
			}, 2000);
		}));

		wrap.appendChild(btn('Loading on Modal', 'default', function () {
			var m = Plugins.uikit.createModal('demo-loading', {
				title: 'Loading Demo',
				width: '380px',
				height: '200px'
			});
			m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">The loading spinner will appear over this content.</p>';
			m.open();
			Plugins.uikit.loading(m.contentEl, true);
			setTimeout(function () {
				Plugins.uikit.loading(m.contentEl, false);
			}, 2000);
		}));

		loadingEl.innerHTML = '';
		loadingEl.appendChild(wrap);
	}

	// ── Helpers Tab ─────────────────────────────────────────────────────
	var helpersSlug = Plugins.uikit.addTab('Helpers', { order: 906 });
	var helpersEl = Plugins.uikit.getTabEl(helpersSlug);
	if (helpersEl) {
		var uk = Plugins.uikit;

		// — el() —
		var elSection = uk.el('div', {
			cls: 'owrx-uikit__settings-section',
			children: [
				uk.el('div', { cls: 'owrx-uikit__settings-title', text: 'el()' }),
				uk.el('div', { cls: 'owrx-uikit__settings-label', text: 'DOM factory — creates an element with cls, text, style, on, children, parent in one call.' }),
				uk.el('div', {
					cls: 'owrx-uikit__settings-label',
					style: { marginTop: '6px', padding: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px' },
					html: 'This box was built with <code>Plugins.uikit.el()</code>.',
					on: { click: function () { uk.toast('el() box clicked', { type: 'info', timeout: 1500 }); } }
				})
			]
		});

		// — Icon builders & buildSvg() —
		var iconDefs = [
			{ fn: "iconArrow('up')",    icon: uk.iconArrow('up') },
			{ fn: "iconArrow('right')", icon: uk.iconArrow('right') },
			{ fn: "iconArrow('down')",  icon: uk.iconArrow('down') },
			{ fn: "iconArrow('left')",  icon: uk.iconArrow('left') },
			{ fn: 'iconCog()',           icon: uk.iconCog() },
			{ fn: 'iconChevron()',       icon: uk.iconChevron() },
			{ fn: 'iconHide()',          icon: uk.iconHide() },
			{ fn: 'iconClose()',         icon: uk.iconClose() },
			{ fn: 'iconPanel()',         icon: uk.iconPanel() }
		];

		var iconGrid = uk.el('div', {
			style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }
		});
		for (var i = 0; i < iconDefs.length; i++) {
			var def = iconDefs[i];
			uk.el('div', {
				style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: '68px' },
				parent: iconGrid,
				children: [
					def.icon,
					uk.el('code', { text: def.fn, style: { fontSize: '9px', opacity: '0.7', textAlign: 'center', whiteSpace: 'nowrap' } })
				]
			});
		}

		// Custom icon via buildSvg()
		var customSvg = uk.buildSvg('0 0 24 24', [
			'<circle cx="12" cy="12" r="5"/>',
			'<path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M18.36 5.64l-1.42 1.42M5.64 18.36l-1.42 1.42"/>'
		], 20);

		var iconsSection = uk.el('div', {
			cls: 'owrx-uikit__settings-section',
			children: [
				uk.el('div', { cls: 'owrx-uikit__settings-title', text: 'Icon Builders & buildSvg()' }),
				uk.el('div', { cls: 'owrx-uikit__settings-label', text: 'Built-in icons (16×16, iconPanel 24×24):' }),
				iconGrid,
				uk.el('div', { cls: 'owrx-uikit__settings-label', style: { marginTop: '10px' }, text: 'Custom icon via buildSvg():' }),
				uk.el('div', {
					style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' },
					children: [
						customSvg,
						uk.el('span', { cls: 'owrx-uikit__settings-label', html: "Sun icon — <code>buildSvg('0 0 24 24', [...paths], 20)</code>" })
					]
				})
			]
		});

		// — renderRadioGroup() —
		var radioResult = uk.el('div', { cls: 'owrx-uikit__settings-label', style: { marginTop: '4px' }, text: 'Selected: option-a' });
		var radioContainer = uk.el('div', { cls: 'owrx-uikit__settings-options' });
		uk.renderRadioGroup(radioContainer, 'helpers-demo-radio',
			['option-a', 'option-b', 'option-c'],
			'option-a',
			function (val) {
				radioResult.textContent = 'Selected: ' + val;
				uk.toast('Radio: ' + val, { type: 'info', timeout: 1500 });
			}
		);

		var radioSection = uk.el('div', {
			cls: 'owrx-uikit__settings-section',
			children: [
				uk.el('div', { cls: 'owrx-uikit__settings-title', text: 'renderRadioGroup()' }),
				uk.el('div', { cls: 'owrx-uikit__settings-label', text: 'Renders a group of styled radio buttons into a container.' }),
				radioContainer,
				radioResult
			]
		});

		// — createDualSlider() —
		var sliderLabel = uk.el('div', { cls: 'owrx-uikit__settings-label', text: 'Range: 20% – 80%' });
		var dualSlider = uk.createDualSlider({
			min: 0, max: 1, step: 0.05,
			lower: 0.2, upper: 0.8,
			onInput: function (lo, hi) {
				sliderLabel.textContent = 'Range: ' + Math.round(lo * 100) + '% – ' + Math.round(hi * 100) + '%';
			},
			onChange: function (lo, hi) {
				uk.toast('Range set: ' + Math.round(lo * 100) + '% – ' + Math.round(hi * 100) + '%', { type: 'success', timeout: 2000 });
			}
		});

		var sliderSection = uk.el('div', {
			cls: 'owrx-uikit__settings-section',
			children: [
				uk.el('div', { cls: 'owrx-uikit__settings-title', text: 'createDualSlider()' }),
				uk.el('div', { cls: 'owrx-uikit__settings-label', text: 'Dual-thumb range slider. Drag both thumbs to set a [lower, upper] range.' }),
				sliderLabel,
				dualSlider.el
			]
		});

		helpersEl.innerHTML = '';
		helpersEl.appendChild(elSection);
		helpersEl.appendChild(iconsSection);
		helpersEl.appendChild(radioSection);
		helpersEl.appendChild(sliderSection);
	}

	// ── Settings Tab ────────────────────────────────────────────────────
	var settingsSlug = Plugins.uikit.addSettingsTab('Demo', { order: 500 });
	var settingsEl = Plugins.uikit.getSettingsTabEl(settingsSlug);
	if (settingsEl) {
		var info = document.createElement('div');
		info.className = 'owrx-uikit__settings-section';
		info.innerHTML =
			'<div class="owrx-uikit__settings-title">Example UIKit Plugin</div>' +
			'<div class="owrx-uikit__settings-label">This tab was added by the <strong>example_uikit</strong> plugin using <code>Plugins.uikit.addSettingsTab()</code>.</div>' +
			'<div class="owrx-uikit__settings-label">Version: ' + Plugins.example_uikit._version + '</div>';
		settingsEl.appendChild(info);
	}

	return true;
};
