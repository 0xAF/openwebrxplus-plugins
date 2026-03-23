/*
 * Plugin: example_uikit - Demo plugin showcasing all UIKit features
 *
 * This plugin is for developers. It demonstrates every UIKit API with
 * working, copy-paste-ready code. Enable it in init.js to explore.
 *
 * Dependencies: uikit >= 0.2
 * License: MIT
 */

Plugins.example_uikit = Plugins.example_uikit || {};
Plugins.example_uikit._version = 0.2;
Plugins.example_uikit.no_css = true;

Plugins.example_uikit.init = function () {
	if (!Plugins.isLoaded('uikit', 0.2)) {
		console.error('[example_uikit] requires uikit >= 0.2');
		return false;
	}

	// ── Panel Tab ────────────────────────────────────────────────────────
	// Adds a "Demo" tab to the UIKit panel with buttons for each feature.

	var slug = Plugins.uikit.addTab('Demo', {
		order: 900,
		activate: true,
		icon: Plugins.uikit.svgFromString(
			'<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01z" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
		)
	});
	var tabEl = Plugins.uikit.getTabEl(slug);
	if (!tabEl) return false;

	// Helper: create a styled button
	function btn(label, cls, onclick) {
		var b = document.createElement('button');
		b.type = 'button';
		b.className = 'owrx-uikit__btn ' + (cls || '');
		b.textContent = label;
		b.style.margin = '3px';
		b.addEventListener('click', onclick);
		return b;
	}

	// Section helper
	function section(title) {
		var h = document.createElement('div');
		h.style.cssText = 'font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9aa3b2;margin:10px 0 4px;';
		h.textContent = title;
		return h;
	}

	var wrap = document.createElement('div');

	// ── Modal demos ──────────────────────────────────────────────────────
	wrap.appendChild(section('Modals'));

	wrap.appendChild(btn('Basic Modal', 'owrx-uikit__btn--primary', function () {
		var m = Plugins.uikit.createModal('demo-basic', {
			title: 'Basic Modal',
			footer: true,
			width: '420px'
		});
		m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">This is a basic modal with a title bar, body content, and a footer.</p>';

		// Clear previous footer buttons
		m.footerEl.innerHTML = '';
		var closeBtn = document.createElement('button');
		closeBtn.type = 'button';
		closeBtn.className = 'owrx-uikit__btn owrx-uikit__btn--ghost';
		closeBtn.textContent = 'Close';
		closeBtn.addEventListener('click', function () { m.close(); });
		m.footerEl.appendChild(closeBtn);

		m.open();
	}));

	wrap.appendChild(btn('Close Left', '', function () {
		var m = Plugins.uikit.createModal('demo-close-left', {
			title: 'Close Button on Left',
			closeButtonPosition: 'left',
			width: '380px'
		});
		m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">The close button is on the left side of the title bar.</p>';
		m.open();
	}));

	wrap.appendChild(btn('No Title Bar', '', function () {
		var m = Plugins.uikit.createModal('demo-no-title', {
			closeButton: true,
			closeButtonPosition: 'right',
			width: '350px'
		});
		m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">No title bar — close button floats in the corner.</p>';
		m.open();
	}));

	wrap.appendChild(btn('No Backdrop', '', function () {
		var m = Plugins.uikit.createModal('demo-floating', {
			title: 'Floating Modal',
			backdrop: false,
			width: '320px'
		});
		m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">This modal has no backdrop and floats over the page.</p>';
		m.open();
	}));

	wrap.appendChild(btn('Resizable', '', function () {
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

	wrap.appendChild(btn('Custom Border', '', function () {
		var m = Plugins.uikit.createModal('demo-border', {
			title: 'Custom Border',
			borderStyle: '2px solid #6f89ff',
			borderRadius: '16px',
			width: '380px'
		});
		m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">This modal has a custom blue border and larger radius.</p>';
		m.open();
	}));

	wrap.appendChild(btn('Lifecycle Hooks', '', function () {
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
				// return false here to prevent closing
			}
		});
		m.contentEl.innerHTML = '<p class="owrx-uikit__pm-message">Open and close this modal to see lifecycle hooks in action (check the console).</p>';
		m.open();
	}));

	// ── Dialog demos ─────────────────────────────────────────────────────
	wrap.appendChild(section('Dialogs'));

	wrap.appendChild(btn('info()', 'owrx-uikit__btn--primary', async function () {
		await Plugins.uikit.info('The scan has completed successfully.', {
			title: 'Scan Complete'
		});
		Plugins.uikit.toast('info() resolved', { type: 'success', timeout: 2000 });
	}));

	wrap.appendChild(btn('question()', 'owrx-uikit__btn--primary', async function () {
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

	// ── Toast demos ──────────────────────────────────────────────────────
	wrap.appendChild(section('Toasts'));

	wrap.appendChild(btn('Info Toast', '', function () {
		Plugins.uikit.toast('This is an info toast notification.');
	}));

	wrap.appendChild(btn('Success', '', function () {
		Plugins.uikit.toast('Operation completed.', { type: 'success' });
	}));

	wrap.appendChild(btn('Warning', '', function () {
		Plugins.uikit.toast('Signal strength is low.', { type: 'warning' });
	}));

	wrap.appendChild(btn('Error', '', function () {
		Plugins.uikit.toast('Connection lost!', { type: 'error' });
	}));

	wrap.appendChild(btn('With Title', '', function () {
		Plugins.uikit.toast('Received 42 new signals in the last scan cycle.', {
			type: 'success',
			title: 'Scan Results',
			timeout: 5000
		});
	}));

	wrap.appendChild(btn('Persistent (no timeout)', '', function () {
		Plugins.uikit.toast('This toast will not auto-dismiss. Close it with the × button.', {
			type: 'warning',
			title: 'Persistent',
			timeout: 0
		});
	}));

	wrap.appendChild(btn('Dismiss All', 'owrx-uikit__btn--danger', function () {
		Plugins.uikit.dismissAllToasts();
	}));

	// ── Loading overlay demo ─────────────────────────────────────────────
	wrap.appendChild(section('Loading Overlay'));

	wrap.appendChild(btn('Toggle Loading (2s)', 'owrx-uikit__btn--primary', function () {
		Plugins.uikit.loading(tabEl, true);
		setTimeout(function () {
			Plugins.uikit.loading(tabEl, false);
			Plugins.uikit.toast('Loading finished.', { type: 'success', timeout: 2000 });
		}, 2000);
	}));

	wrap.appendChild(btn('Loading on Modal', '', function () {
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

	tabEl.innerHTML = '';
	tabEl.appendChild(wrap);

	// ── Settings Tab ─────────────────────────────────────────────────────
	// Adds a demo settings tab to show how plugins can extend settings.

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
