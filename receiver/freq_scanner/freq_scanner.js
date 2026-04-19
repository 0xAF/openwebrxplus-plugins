/**
 * Frequency Scanner Plugin for OpenWebRX+
 * Client-side implementation.
 * 
 * License: MIT
 * Copyright (c) 2026 DL1HQH
 */

var fs_SCANNER_CONFIG = {
    dwell_time: 400,
    delay_time: 2500,
    squelch_threshold: -45,
    audio_sync_delay: 1000,
    bookmark_tolerance: 4000
};
fs_SCANNER_CONFIG.default_delay_time = fs_SCANNER_CONFIG.delay_time;

var fs_scanner_state = {
    running: false,
    timer: null,
    current_freq: 0,
    start_freq: 0,
    end_freq: 0,
    blacklist: [],
    last_signal_time: 0,
    scan_mode: 'CARRIER',
    signal_start_time: 0,
    ignore_non_voice: true,
    original_center_freq: 0,
    tuning: false,
    show_blocked_ranges: false,
    block_color: 'rgba(255, 0, 0, 0.3)',
    modulation_timer: null,
    ignore_squelch: false,
    edit_mode: false,
    scan_logic: 'STANDARD',
    tuned_at: 0
};

var fs_scanner_ui = {
    toggleBtn: null,
    panel: null,
    dragHandle: null,
    infoDisplay: null,
    scanBtn: null,
    skipBtn: null,
    blockBtn: null,
    listBtn: null,
    visualizer: null,
    waterfallContainer: null,
    viewport: null
};

var fs_SCANNER_COLORS = [
    { name: 'Red', value: 'rgba(255, 0, 0, 0.3)' },
    { name: 'Orange', value: 'rgba(255, 165, 0, 0.3)' },
    { name: 'Yellow', value: 'rgba(255, 255, 0, 0.3)' },
    { name: 'Green', value: 'rgba(0, 255, 0, 0.3)' },
    { name: 'Blue', value: 'rgba(0, 0, 255, 0.3)' },
    { name: 'Purple', value: 'rgba(128, 0, 128, 0.3)' },
    { name: 'White', value: 'rgba(255, 255, 255, 0.3)' }
];

$(document).ready(fs_init_freq_scanner);

function fs_init_freq_scanner() {
    console.log('[freq_scanner] Plugin loaded and ready.');

    fs_load_blacklist();
    fs_load_settings();
    fs_inject_css();
    fs_create_ui();
    fs_cache_ui_elements();

    fs_attempt_hook_openwebrx();

    if (!fs_scanner_state.modulation_timer) {
        fs_scanner_state.modulation_timer = setInterval(function() {
            fs_check_modulation_mode();
            fs_update_scanner_theme();
        }, 1000);
    }
    
    fs_init_visualizer();
    fs_setup_block_dragging();
    fs_update_scanner_theme();
}

function fs_cache_ui_elements() {
    fs_scanner_ui.toggleBtn = document.getElementById('fs-toggle-btn');
    fs_scanner_ui.panel = document.getElementById('fs-floating-panel');
    fs_scanner_ui.dragHandle = document.getElementById('fs-drag-handle');
    fs_scanner_ui.infoDisplay = document.getElementById('fs-info-display');
    fs_scanner_ui.scanBtn = document.getElementById('fs-btn-scan');
    fs_scanner_ui.skipBtn = document.getElementById('fs-btn-skip');
    fs_scanner_ui.blockBtn = document.getElementById('fs-btn-block');
    fs_scanner_ui.listBtn = document.getElementById('fs-btn-list');
    fs_scanner_ui.visualizer = document.getElementById('fs-visualizer');
    fs_scanner_ui.waterfallContainer = fs_get_waterfall_container();
    if (fs_scanner_ui.waterfallContainer) {
        fs_scanner_ui.viewport = fs_scanner_ui.waterfallContainer.parentElement;
    }
}

function fs_inject_css() {
    if (!document.getElementById('fs-css')) {
        var style = document.createElement('style');
        style.id = 'fs-css';
        style.innerHTML = 
            '.fs-longpress { position: relative; }' +
            '.fs-longpress::after { content: ""; position: absolute; bottom: 2px; right: 2px; width: 0; height: 0; border-left: 6px solid transparent; border-bottom: 6px solid currentColor; opacity: 0.8; pointer-events: none; }' +
            '#fs-info-display { width: 100%; box-sizing: border-box; height: 64px; max-height: 64px; display: flex !important; align-items: center; justify-content: center; text-align: center; color: #aaa; font-weight: bold; font-size: 16px; margin: 5px 0 15px 0; white-space: normal; word-wrap: break-word; overflow: hidden; font-family: sans-serif; border-radius: 5px; line-height: 1.1; padding: 2px 10px; border: 1px solid transparent; background-color: #001a33 !important; position: relative; box-shadow: inset 3px 3px 8px rgba(0,0,0,0.8), 1px 1px 1px rgba(255,255,255,0.05); text-shadow: 2px 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5); transition: all 0.2s ease; cursor: default; }';
        document.head.appendChild(style);
    }
}

function fs_create_ui() {
    var container = document.querySelector('#openwebrx-panel-receiver');

    if (!fs_scanner_ui.toggleBtn) {
        var toggleBtn = document.createElement('div');
        toggleBtn.id = 'fs-toggle-btn';
        toggleBtn.textContent = 'SC';
        toggleBtn.title = 'Open Scanner Controls';
        toggleBtn.style.cssText = 'position: absolute; bottom: 3px; left: 4px; z-index: 99; font-size: 12px; font-weight: bold; color: #aaa; cursor: pointer; background: rgba(0,0,0,0.5); padding: 0px 4px; border-radius: 3px; border: 1px solid #666; user-select: none; line-height: 12px; transition: left 0.2s;';
        
        toggleBtn.onclick = function() {
            var panel = fs_scanner_ui.panel;
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
            fs_update_sca_button_state();
        };
        
        if (container) container.appendChild(toggleBtn);

        var fs_update_pos = function() {
            var btn = fs_scanner_ui.toggleBtn;
            if (!btn) return;
            var cont = container;
            if (!cont) return;

            var allButtons = Array.from(cont.querySelectorAll('div[id$="-toggle-btn"], div[id$="-btn"], div[id="openwebrx-clock-utc"]'))
                .filter(b => b.offsetParent !== null);

            allButtons.sort((a, b) => {
                if (a.id === 'openwebrx-clock-utc') return -1;
                if (b.id === 'openwebrx-clock-utc') return 1;
                return a.id.localeCompare(b.id);
            });

            var left = 4;
            for (var i = 0; i < allButtons.length; i++) {
                var currentBtn = allButtons[i];
                if (currentBtn.id === btn.id) {
                    break;
                }
                var rect = currentBtn.getBoundingClientRect();
                if (rect.width > 0) {
                    left += rect.width + 4;
                }
            }
            btn.style.left = left + 'px';
        };
        setInterval(fs_update_pos, 2000);
        fs_update_pos();
    }

    if (!fs_scanner_ui.panel) {
        var panel = document.createElement('div');
        panel.id = 'fs-floating-panel';
        panel.style.cssText = 'display: none; position: fixed; top: 150px; left: 10px; background: #000000; border: 1px solid var(--openwebrx-border-color, #666); border-radius: 5px; padding: 0; z-index: 10000; box-shadow: 0 0 10px rgba(0,0,0,0.5); font-family: sans-serif; width: 225px;';
        
        var dragHandle = document.createElement('div');
        dragHandle.id = 'fs-drag-handle';
        dragHandle.textContent = 'Frequency Scanner';
        dragHandle.style.cssText = 'height: 36px; line-height: 36px; font-size: 14px; text-align: center; cursor: move; border-radius: 5px 5px 0 0; width: 100%; user-select: none; border-bottom: 1px solid #555; background: #444; color: #ddd;';
        dragHandle.title = 'Drag to move';
        panel.appendChild(dragHandle);

        var isDragging = false;
        var dragOffsetX = 0;
        var dragOffsetY = 0;

        var startDrag = function(e) {
            isDragging = true;
            var clientX = e.clientX;
            var clientY = e.clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
            dragOffsetX = clientX - panel.offsetLeft;
            dragOffsetY = clientY - panel.offsetTop;
            e.preventDefault();
        };

        var doDrag = function(e) {
            if (isDragging) {
                var clientX = e.clientX;
                var clientY = e.clientY;
                if (e.touches && e.touches.length > 0) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                }
                panel.style.left = (clientX - dragOffsetX) + 'px';
                panel.style.top = (clientY - dragOffsetY) + 'px';
                if (e.type === 'touchmove') e.preventDefault();
            }
        };

        var stopDrag = function() { isDragging = false; };

        dragHandle.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);

        dragHandle.addEventListener('touchstart', startDrag, {passive: false});
        document.addEventListener('touchmove', doDrag, {passive: false});
        document.addEventListener('touchend', stopDrag);

        var content = document.createElement('div');
        content.style.padding = '5px';

        var infoDisplay = document.createElement('div');
        infoDisplay.id = 'fs-info-display';
        infoDisplay.textContent = 'Ready';
        content.appendChild(infoDisplay);

        var btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 5px;';

        var btn = document.createElement('button');
        btn.id = 'fs-btn-scan';
        btn.className = 'fs-longpress';
        btn.textContent = 'Scan';
        btn.title = 'Short: Start/Stop | Long: Scan Options';
        
        btn.style.cssText = 'width: 50px; height: 32px; padding: 0; line-height: 26px; font-size: 13px; font-weight: 600; border: 3px solid #FF3939; background: #FF3939; color: white; cursor: pointer; border-radius: 5px; box-sizing: border-box; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease; user-select: none; -webkit-user-select: none;';
        
        fs_setup_long_press(btn, function() {
            fs_toggle_scanner();
        }, function(rect) {
            fs_show_scan_menu(rect);
        });

        var btnSkip = document.createElement('button');
        btnSkip.id = 'fs-btn-skip';
        btnSkip.textContent = 'Skip';
        btnSkip.title = 'Skip current frequency';
        btnSkip.disabled = true;
        btnSkip.style.cssText = 'width: 50px; height: 32px; padding: 0; line-height: 32px; font-size: 13px; font-weight: 600; border: none; background: #444; color: #aaa; cursor: default; border-radius: 5px; opacity: 0.5; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease; user-select: none; -webkit-user-select: none;';
        btnSkip.onclick = function() {
            if (fs_scanner_state.running) {
                if (fs_scanner_state.timer) { clearTimeout(fs_scanner_state.timer); fs_scanner_state.timer = null; }
                fs_scanner_move_next(true);
                fs_scan_loop();
            }
        };

        var btnBlock = document.createElement('button');
        btnBlock.id = 'fs-btn-block';
        btnBlock.className = 'fs-longpress';
        btnBlock.textContent = 'Block';
        btnBlock.title = 'Short: Block Current | Long: Block Options';
        btnBlock.style.cssText = 'width: 50px; height: 32px; padding: 0; line-height: 32px; font-size: 13px; font-weight: 600; border: none; background: #444; color: white; cursor: pointer; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease; user-select: none; -webkit-user-select: none;';
        fs_setup_long_press(btnBlock, function() {
            fs_add_to_blacklist();
        }, function(rect) {
            fs_show_block_menu(rect);
        });

        var btnList = document.createElement('button');
        btnList.id = 'fs-btn-list';
        btnList.innerHTML = 'Setup';
        btnList.title = 'Scanner Setup / Blacklist';
        btnList.style.cssText = 'width: 50px; height: 32px; padding: 0; line-height: 32px; font-size: 13px; font-weight: 600; border: none; background: #444; color: white; cursor: pointer; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease; user-select: none; -webkit-user-select: none;';
        btnList.onclick = function() { fs_show_blacklist_menu(this.getBoundingClientRect()); };

        btnContainer.appendChild(btn);
        btnContainer.appendChild(btnSkip);
        btnContainer.appendChild(btnBlock);
        btnContainer.appendChild(btnList);
        
        content.appendChild(btnContainer);
        panel.appendChild(content);
        document.body.appendChild(panel);
    }
}

function fs_setup_long_press(element, onClick, onLongPress) {
    var pressTimer;
    var longPressTriggered = false;
    var isCancelled = false;
    var startX = 0;
    var startY = 0;

    var startPress = function(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;
        if (element.dataset.disabled === 'true') return;

        if (e.touches && e.touches.length > 0) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }

        longPressTriggered = false;
        isCancelled = false;
        pressTimer = setTimeout(function() {
            longPressTriggered = true;
            pressTimer = null;
            var rect = element.getBoundingClientRect();
            if (navigator.vibrate) navigator.vibrate(50);
            onLongPress(rect);
        }, 800);
    };

    var endPress = function(e) {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
        if (!longPressTriggered && !isCancelled) {
            onClick(e);
        }
    };

    var cancelPress = function(e) {
        if (e.type === 'touchmove' && e.touches && e.touches.length > 0) {
            var x = e.touches[0].clientX;
            var y = e.touches[0].clientY;
            if (Math.abs(x - startX) < 10 && Math.abs(y - startY) < 10) {
                return;
            }
        }

        if (e.target === element) {
            e.preventDefault();
        }

        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
        isCancelled = true;
    };

    element.addEventListener('mousedown', startPress);
    element.addEventListener('mouseup', endPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchstart', startPress, {passive: false});
    element.addEventListener('touchend', function(e) {
        e.preventDefault();
        endPress(e);
    });
    element.addEventListener('touchmove', cancelPress, {passive: false});
    element.addEventListener('touchcancel', cancelPress, {passive: false});

    element.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
}

var fs_hook_attempts = 0;
function fs_attempt_hook_openwebrx() {
    const hooks = [
        {
            obj: window, name: 'sdr_profile_changed',
            hook: (orig) => function() { if (fs_scanner_state.running) fs_set_scanner_active(false); return orig.apply(this, arguments); }
        },
        {
            obj: window, name: 'waterfall_add',
            hook: (orig) => function(data) { window.fs_wf_data = data; return orig.apply(this, arguments); }
        },
        {
            obj: typeof UI !== 'undefined' ? UI : null, name: 'viewChanged',
            hook: (orig) => function() { const r = orig.apply(this, arguments); fs_update_visualizer(); return r; }
        },
        {
            obj: typeof UI !== 'undefined' ? UI : null, name: 'setFrequency',
            hook: (orig) => function(freq) { if (fs_scanner_state.running && !fs_scanner_state.tuning && Math.abs(freq - fs_scanner_state.current_freq) > 10) fs_set_scanner_active(false); return orig.apply(this, arguments); }
        }
    ];

    let allHooked = true;
    hooks.forEach(h => {
        if (h.obj && typeof h.obj[h.name] === 'function' && !h.obj[h.name].fs_hooked) {
            const orig = h.obj[h.name];
            h.obj[h.name] = h.hook(orig);
            h.obj[h.name].fs_hooked = true;
        } else if (!h.obj || !h.obj[h.name]) allHooked = false;
    });

    if (!allHooked && fs_hook_attempts++ < 20) setTimeout(fs_attempt_hook_openwebrx, 500);
}

var fs_last_known_mode = '';
function fs_check_modulation_mode() {
    var mode = null;
    
    if (typeof UI !== 'undefined' && typeof UI.getModulation === 'function') {
        mode = UI.getModulation();
    }
    
    if (mode && mode !== fs_last_known_mode) {
        fs_last_known_mode = mode;
        fs_update_scanner_visibility(mode);
    } else if (!mode) {
        // Fallback if UI is not yet ready
        fs_update_scanner_visibility('nfm');
    }
}

function fs_update_scanner_visibility(mode) {
    var btn = fs_scanner_ui.scanBtn;
    var btnSkip = fs_scanner_ui.skipBtn;
    var btnBlock = fs_scanner_ui.blockBtn;
    var btnList = fs_scanner_ui.listBtn;
    if (!btn) return;

    var m = String(mode).toLowerCase();

    if (['nfm', 'am', 'fm', 'sam', 'usb', 'lsb', 'cw'].indexOf(m) !== -1) {
        delete btn.dataset.disabled;
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
        btn.title = 'Short: Start/Stop | Long: Scan Options';

        if (fs_scanner_state.running) {
            btn.style.background = '#39FF14';
            btn.style.borderColor = '#39FF14';
            btn.style.color = 'black';
        } else {
            btn.style.background = '#FF3939';
            btn.style.borderColor = '#FF3939';
            btn.style.color = 'white';
        }
        if (btnSkip) {
            if (fs_scanner_state.running) {
                btnSkip.disabled = false;
                btnSkip.style.background = '#2196F3';
                btnSkip.style.borderColor = '#2196F3';
                btnSkip.style.color = 'white';
                btnSkip.style.cursor = 'pointer';
                btnSkip.style.opacity = '1';
            } else {
                btnSkip.disabled = true;
                btnSkip.style.background = '#444';
                btnSkip.style.borderColor = '#444';
                btnSkip.style.color = '#aaa';
                btnSkip.style.cursor = 'default';
                btnSkip.style.opacity = '0.5';
            }
        }
        if (btnBlock) {
            btnBlock.disabled = false;
            btnBlock.style.opacity = '1';
            btnBlock.style.cursor = 'pointer';
            btnBlock.style.color = 'white';
        }
        if (btnList) {
            btnList.disabled = false;
            btnList.style.opacity = '1';
            btnList.style.cursor = 'pointer';
            btnList.style.color = 'white';
        }
    } else {
        if (fs_scanner_state.running) {
            fs_toggle_scanner();
        }
        btn.dataset.disabled = 'true';
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'not-allowed';
        btn.style.background = '#666';
        btn.style.borderColor = '#666';
        btn.style.color = '#ccc';
        btn.title = 'Scanner available for AM/FM only';
        if (btnSkip) {
            btnSkip.disabled = true;
            btnSkip.style.background = '#666';
            btnSkip.style.borderColor = '#666';
            btnSkip.style.color = '#ccc';
            btnSkip.style.cursor = 'not-allowed';
            btnSkip.style.opacity = '1';
        }
        if (btnBlock) {
            btnBlock.disabled = true;
            btnBlock.style.opacity = '0.5';
            btnBlock.style.cursor = 'not-allowed';
            btnBlock.style.color = '#aaa';
        }
        if (btnList) {
            btnList.disabled = true;
            btnList.style.opacity = '0.5';
            btnList.style.cursor = 'not-allowed';
            btnList.style.color = '#aaa';
        }
    }
    btn.style.display = 'block';
    if (btnSkip) btnSkip.style.display = 'block';
    if (btnBlock) btnBlock.style.display = 'block';
    if (btnList) btnList.style.display = 'block';
}

function fs_set_scanner_active(active) {
    var btn = fs_scanner_ui.scanBtn;
    if (active) {
        if (fs_scanner_state.edit_mode) {
            fs_scanner_state.edit_mode = false;
        }
        fs_start_fs_scanner();
        if (btn) {
            btn.textContent = 'Stop';
            btn.style.background = '#39FF14';
            btn.style.border = '3px solid #39FF14';
            btn.style.color = 'black';
        }
    } else {
        fs_stop_fs_scanner();
        fs_update_visualizer();
        fs_update_info_display(null);
        if (btn) {
            btn.textContent = 'Scan';
            btn.style.background = '#FF3939';
            btn.style.border = '3px solid #FF3939';
            btn.style.color = 'white';
        }
    }
    fs_update_scanner_visibility(fs_last_known_mode);

    fs_update_sca_button_state();
}

function fs_toggle_scanner() {
    fs_set_scanner_active(!fs_scanner_state.running);
}

function fs_start_fs_scanner() {
    fs_scanner_state.running = true;

    var center = window.center_freq || 0;
    var rate = window.bandwidth || 1000000;

    if (typeof center === 'undefined') {
        fs_stop_fs_scanner();
        return;
    }

    if (typeof rate === 'undefined') {
        rate = 1000000;
    }

    fs_scanner_state.original_center_freq = center;

    var bw = rate * 0.9;
    fs_scanner_state.start_freq = center - (bw / 2);
    fs_scanner_state.end_freq = center + (bw / 2);
    
    fs_scanner_state.current_freq = fs_scanner_state.start_freq;

    if (typeof UI !== 'undefined' && typeof UI.setFrequency === 'function') {
        fs_scanner_state.tuning = true;
        UI.setFrequency(fs_scanner_state.current_freq);
        fs_scanner_state.tuning = false;
        fs_scanner_state.tuned_at = Date.now();
    }
    fs_update_info_display(fs_scanner_state.current_freq);

    fs_scan_loop();
    fs_update_visualizer();
}

function fs_stop_fs_scanner() {
    fs_scanner_state.running = false;
    if (fs_scanner_state.timer) {
        clearTimeout(fs_scanner_state.timer);
        fs_scanner_state.timer = null;
    }
}

function fs_get_squelch_threshold(is_fft) {
    var t = fs_SCANNER_CONFIG.squelch_threshold;
    if (fs_scanner_state.ignore_squelch && fs_scanner_state.scan_logic === 'WIDTH') {
        t = -120; // Nur bei Width-Logik: Festen Schwellenwert nutzen (SNR-Logik übernimmt)
    } else {
        var slider = document.querySelector('#openwebrx-panel-receiver .openwebrx-squelch-slider');
        if (slider) t = parseFloat(slider.value);
    }
    if (is_fft) t -= 2.5; // Reduziert Differenz zwischen Suche und Squelch-Check
    return t;
}

/**
 * Ermittelt die aktuelle Filter-Bandbreite des Demodulators.
 */
function fs_get_current_filter_bw() {
    var filter_bw = 25000; // Fallback
    if (typeof UI !== 'undefined' && typeof UI.getDemodulator === 'function') {
        var demod = UI.getDemodulator();
        if (demod && typeof demod.getBandpass === 'function') {
            var bp = demod.getBandpass();
            filter_bw = Math.abs(bp.high_cut - bp.low_cut);
        }
    }
    return filter_bw;
}

function fs_scanner_move_next() {
    // Step ist nun das Doppelte der aktuellen Filter-Bandbreite
    var step = fs_get_current_filter_bw() * 2;
    
    var threshold = fs_get_squelch_threshold(true);
    var flat_bookmarks = fs_get_flat_bookmarks();
    var next_freq = fs_find_next_peak(fs_scanner_state.current_freq, step, threshold, flat_bookmarks);
    
    if (next_freq !== null) {
        fs_scanner_state.signal_start_time = 0;
        fs_scanner_state.last_signal_time = 0;
        fs_scanner_state.current_freq = next_freq;
        return true;
    } else {
        // Wenn kein Peak gefunden wurde, rücke vor.
        var range_size = fs_scanner_state.end_freq - fs_scanner_state.start_freq;
        var view_bw = (window.bandwidth || 1000000);
        
        if (range_size > view_bw * 1.2) {
            // Großer Suchbereich: Springe 80% der Sichtbreite weiter
            fs_scanner_state.current_freq += view_bw * 0.8;
        } else {
            // Kleiner Bereich: Nutze berechneten Step
            fs_scanner_state.current_freq += step;
            fs_scanner_state.signal_start_time = 0;
            fs_scanner_state.last_signal_time = 0;
        }

        if (fs_scanner_state.current_freq > fs_scanner_state.end_freq) {
            fs_scanner_state.current_freq = fs_scanner_state.start_freq;
        }
        return false;
    }
}

function fs_scan_loop() {
    if (!fs_scanner_state.running) return;

    if (typeof window.center_freq !== 'undefined' && fs_scanner_state.original_center_freq && Math.abs(window.center_freq - fs_scanner_state.original_center_freq) > 100) {
        // If the UI center frequency was manually shifted, stop the scanner.
        fs_set_scanner_active(false);
        return;
    }

    var flat_bookmarks = fs_get_flat_bookmarks();
    // Check blacklist, bookmarks and DC spike / center interference
    if (fs_is_ignored(fs_scanner_state.current_freq, flat_bookmarks)) {
        var is_peak = fs_scanner_move_next();
        if (is_peak) {
            if (typeof UI !== 'undefined' && typeof UI.setFrequency === 'function') {
                fs_scanner_state.tuning = true;
                UI.setFrequency(fs_scanner_state.current_freq);
                fs_scanner_state.tuning = false;
                fs_scanner_state.tuned_at = Date.now();
            }
        }
        fs_update_info_display(fs_scanner_state.current_freq);
        fs_scanner_state.timer = setTimeout(fs_scan_loop, is_peak ? 50 : 500);
        return;
    }

    fs_scanner_state.timer = setTimeout(function() {
        if (!fs_scanner_state.running) return;

        var has_signal = false;
        var threshold = fs_get_squelch_threshold(false); // No correction for S-Meter confirmation

        // Squelch hysteresis: lower threshold by 2dB if a signal was already locked
        if (fs_scanner_state.last_signal_time) threshold -= 2.0;

        if (fs_scanner_state.ignore_squelch && fs_scanner_state.scan_logic === 'WIDTH') {
            // In ignore_squelch + WIDTH mode, rely primarily on FFT logic for signal presence.
            has_signal = fs_check_current_signal_logic();
        } else {
            if (typeof window.smeter_level !== 'undefined') {
                var db = 10 * Math.log10(window.smeter_level);
                if (db >= threshold) has_signal = true;
            }

            if (has_signal && fs_scanner_state.scan_logic !== 'STANDARD' && !fs_check_current_signal_logic()) {
                has_signal = false;
            }
        }

        var time_on_freq = Date.now() - (fs_scanner_state.tuned_at || 0);
        var is_auto_width = (fs_scanner_state.ignore_squelch && fs_scanner_state.scan_logic === 'WIDTH');

        // 1. Ignore signals in the first 150ms (avoid stale S-meter cache), 
        // except in Auto-Width mode where FFT can be used immediately.
        if (has_signal && time_on_freq < 150 && !is_auto_width) {
            has_signal = false;
        }
        
        // 2. If no signal but recently tuned, wait for dwell time to expire.
        if (!has_signal && time_on_freq < fs_SCANNER_CONFIG.dwell_time && !fs_scanner_state.last_signal_time) {
            fs_update_info_display(fs_scanner_state.current_freq);
            fs_scanner_state.timer = setTimeout(fs_scan_loop, 100);
            return;
        }

        if (has_signal) {
            var btn = fs_scanner_ui.scanBtn;
            if (btn) btn.style.borderColor = '#FF0000';

            fs_fine_tune();
            
            fs_update_info_display(fs_scanner_state.current_freq);

            if (fs_scanner_state.scan_mode === 'STOP') {
                fs_set_scanner_active(false);
                return;
            }

            if (fs_scanner_state.scan_mode === 'SAMPLE_10S') {
                if (!fs_scanner_state.signal_start_time) {
                    fs_scanner_state.signal_start_time = Date.now();
                }
                if (Date.now() - fs_scanner_state.signal_start_time > 10000) {
                    fs_scanner_move_next();
                    fs_scan_loop();
                }
            }
            
            fs_scanner_state.last_signal_time = Date.now();
            fs_scanner_state.timer = setTimeout(fs_scan_loop, 200);
        } else {
            var btn = document.getElementById('fs-btn-scan');
            if (btn) btn.style.borderColor = '#39FF14';
            
            var delay_ms = fs_SCANNER_CONFIG.delay_time;
            var sync_ms = fs_SCANNER_CONFIG.audio_sync_delay || 0;

            if (fs_scanner_state.scan_mode === 'SAMPLE_10S') delay_ms = 0;

            var time_since_loss = Date.now() - fs_scanner_state.last_signal_time;

            if (fs_scanner_state.last_signal_time && (time_since_loss < delay_ms + sync_ms)) {
                fs_update_info_display(time_since_loss < sync_ms ? fs_scanner_state.current_freq : 'WAIT');
                fs_scanner_state.timer = setTimeout(fs_scan_loop, 200);
            } else {
                if (fs_scanner_move_next()) {
                    if (typeof UI !== 'undefined' && typeof UI.setFrequency === 'function') {
                        fs_scanner_state.tuning = true;
                        UI.setFrequency(fs_scanner_state.current_freq);
                        fs_scanner_state.tuning = false;
                    fs_scanner_state.tuned_at = Date.now();
                    }
                    fs_update_info_display(fs_scanner_state.current_freq); 
                    fs_scanner_state.timer = setTimeout(fs_scan_loop, 200); // Sprungrate bei Fehlversuchen verlangsamt
                } else {
                // Stay on frequency visually until a new peak is found
                    fs_scanner_state.timer = setTimeout(fs_scan_loop, 800); // Beruhigtes Warten bei leerem Band
                }
            }
        }
    }, fs_scanner_state.last_signal_time ? 200 : 10);
}

/**
 * Prüft, ob das aktuelle Signal auf der aktuellen Frequenz der gewählten Logik entspricht.
 * Ermöglicht sofortiges "Abspringen", wenn die Logik während des Empfangs geändert wird.
 */
function fs_check_current_signal_logic() {
    var logic = fs_scanner_state.scan_logic || 'STANDARD';
    if (logic === 'STANDARD') return true;
    if (!window.fs_wf_data || !window.fs_wf_data.length) return true;

    var center = window.center_freq;
    var bw = window.bandwidth;
    var data = window.fs_wf_data;
    var len = data.length;

    var idx = Math.floor((fs_scanner_state.current_freq - (center - bw / 2)) / bw * len);
    if (idx < 0 || idx >= len) return true;

    var threshold = fs_get_squelch_threshold(true);
    var val = data[idx];

    // Basic check: If center pixel is below noise floor, it's not a signal.
    if (val < threshold + 1.0) return false;

    // Dynamic threshold for blob analysis: measure width at -10dB from peak if squelch is ignored.
    var blob_threshold = (fs_scanner_state.ignore_squelch && fs_scanner_state.scan_logic === 'WIDTH') 
                         ? Math.max(threshold, val - 10) 
                         : threshold;

    var start_i = idx;
    while (start_i > 0 && data[start_i - 1] >= blob_threshold) start_i--;
    
    var max_v = -1000;
    var sum_v = 0;
    var count = 0;
    var end_i = idx;
    while (end_i < len && data[end_i] >= blob_threshold) {
        if (data[end_i] > max_v) max_v = data[end_i];
        sum_v += data[end_i];
        count++;
        end_i++;
    }
    var res = {
        width_hz: (end_i - start_i) * (bw / len),
        avg: count > 0 ? sum_v / count : threshold,
        peak_val: max_v
    };

    var min_snr = 2.5;
    if (fs_scanner_state.ignore_squelch && fs_scanner_state.scan_logic === 'WIDTH') {
        min_snr = 1.5; // Initial check for weak signals in Auto-Squelch mode
    }
    if (fs_scanner_state.last_signal_time || (Date.now() - fs_scanner_state.tuned_at < fs_SCANNER_CONFIG.dwell_time)) min_snr = 0.8;
    
    if (res.peak_val < threshold + min_snr) return false;

    if (logic === 'WIDTH') {
        var filter_bw = fs_get_current_filter_bw();
        
        // 1. Fit check: Is it within bandwidth limits?
        if (res.width_hz > filter_bw || res.width_hz < (filter_bw * 0.2)) return false;

        // 2. Peak structure analysis (Split-peak detection)
        var peaks = [];
        for (var i = start_i + 1; i < end_i - 1; i++) {
            if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
                if (data[i] > res.avg + 1.5) {
                    peaks.push({ idx: i, val: data[i] });
                }
            }
        }

        if (peaks.length >= 2) {
            for (var p = 0; p < peaks.length - 1; p++) {
                var p1 = peaks[p].idx;
                var p2 = peaks[p + 1].idx;
                var min_between = data[p1];
                for (var k = p1; k <= p2; k++) if (data[k] < min_between) min_between = data[k];
                // If there's a drop of at least 1.5dB between peaks, it's a valid signal.
                if (Math.min(peaks[p].val, peaks[p + 1].val) - min_between > 1.5) return true;
            }
        }

        // 3. Plateau detection (Shoulder Check)
        var shoulder_bins = Math.max(1, Math.floor((filter_bw * 0.45) / (bw / len)));
        var left_shoulder = data[Math.max(0, idx - shoulder_bins)] || threshold;
        var right_shoulder = data[Math.min(len - 1, idx + shoulder_bins)] || threshold;

        // Shoulder hysteresis logic
        var min_drop = 3.0;
        if (fs_scanner_state.ignore_squelch && fs_scanner_state.scan_logic === 'WIDTH') {
            min_drop = 2.0;
        }
        if (fs_scanner_state.last_signal_time || (Date.now() - fs_scanner_state.tuned_at < fs_SCANNER_CONFIG.dwell_time)) min_drop = 0.5;
        if (max_v - left_shoulder < min_drop && max_v - right_shoulder < min_drop) return false;
    }

    return true;
}

function fs_fine_tune() {
    if (!window.fs_wf_data || !window.fs_wf_data.length) return;
    if (typeof window.center_freq === 'undefined' || typeof window.bandwidth === 'undefined') return;
    
    var center = window.center_freq;
    var bw = window.bandwidth;
    var data = window.fs_wf_data;
    var len = data.length;
    
    var current_f = fs_scanner_state.current_freq;
    
    var freq_to_idx = function(f) {
        return Math.floor((f - (center - bw/2)) / bw * len);
    };
    
    var idx_to_freq = function(i) {
        return (center - bw/2) + (i / len) * bw;
    };

    var current_idx = freq_to_idx(current_f);
    if (current_idx < 0 || current_idx >= len) return;
    
    var search_hz = 3000; 
    var search_bins = Math.ceil((search_hz / bw) * len);
    
    var start_i = Math.max(0, current_idx - search_bins);
    var end_i = Math.min(len - 1, current_idx + search_bins);
    
    var max_v = -1000;
    var max_i = current_idx;
    
    for (var i = start_i; i <= end_i; i++) {
        if (data[i] > max_v) {
            max_v = data[i];
            max_i = i;
        }
    }
    
    if (max_i !== current_idx) {
        var new_freq = idx_to_freq(max_i);
        if (Math.abs(new_freq - current_f) > 50) {
            fs_scanner_state.current_freq = new_freq;
            if (typeof UI !== 'undefined' && typeof UI.setFrequency === 'function') {
                fs_scanner_state.tuning = true;
                UI.setFrequency(fs_scanner_state.current_freq);
                fs_scanner_state.tuning = false;
                fs_scanner_state.tuned_at = Date.now();
            }
        }
    }
}

function fs_find_next_peak(current_freq, step, threshold, cached_bookmarks) {
    if (!window.fs_wf_data || !window.fs_wf_data.length) return null;
    
    var center = window.center_freq;
    var bw = window.bandwidth;
    var data = window.fs_wf_data;
    var len = data.length;

    if (!bw || !len) return null;

    var freq_to_idx = function(f) {
        return Math.floor((f - (center - bw/2)) / bw * len);
    };
    
    var idx_to_freq = function(i) {
        return (center - bw/2) + (i / len) * bw;
    };

    var current_idx = freq_to_idx(current_freq);
    if (current_idx < 0) current_idx = 0;
    if (current_idx >= len) current_idx = len - 1;

    // 1. If currently on a signal, find its end first to avoid getting stuck.
    var search_start_idx = current_idx;
    if (data[current_idx] >= threshold) {
        while (search_start_idx < len && data[search_start_idx] >= threshold) {
            search_start_idx++;
        }
    }

    var skip_hz = Math.max(5000, step);
    var skip_bins = Math.ceil((skip_hz / bw) * len);
    search_start_idx = Math.min(len - 1, Math.max(search_start_idx, current_idx + skip_bins));

    var find_peak_and_end = function(start_i) {
        var max_v = -1000;
        var max_i = start_i;
        var sum_v = 0;
        var count = 0;
        var j = start_i;

        // Scan entire cluster above threshold
        while (j < len && data[j] >= threshold) {
            var val = data[j];
            sum_v += val;
            count++;
            if (val > max_v) {
                max_v = val;
                max_i = j;
            }
            j++;
        }
        
        return {
            peak_idx: max_i, 
            end_idx: j, 
            avg: count > 0 ? sum_v / count : threshold,
            peak_val: max_v
        };
    };

    for (var i = search_start_idx; i < len; i++) {
        if (data[i] >= threshold) {
            var res = find_peak_and_end(i);
            // SNR Check: Peak must be at least 1.5dB above the average signal level
            if (res.peak_val < res.avg + 1.5) { i = res.end_idx; continue; }
            
            var f = idx_to_freq(res.peak_idx);
            if (!fs_is_ignored(f, cached_bookmarks)) return f;
            i = res.end_idx;
        }
    }

    for (var i = 0; i < Math.max(0, current_idx - skip_bins); i++) {
        if (data[i] >= threshold) {
            var res = find_peak_and_end(i);
            var f = idx_to_freq(res.peak_idx);
            if (!fs_is_ignored(f, cached_bookmarks)) return f;
            i = res.end_idx;
        }
    }

    return null;
}

function fs_show_floating_menu(rect, items) {
    var existing = document.getElementById('fs-menu');
    if (existing) existing.remove();

    var menu = document.createElement('div');
    menu.id = 'fs-menu';
    
    var closeHandler;
    var closeMenu = function() {
        menu.remove();
        if (closeHandler) {
            document.removeEventListener('mousedown', closeHandler);
            document.removeEventListener('touchstart', closeHandler);
        }
    };

    menu.style.cssText = 'background: #222; border: 1px solid #444; color: #eee; z-index: 10001; border-radius: 4px; padding: 0; font-family: sans-serif; font-size: 13px; box-shadow: 0 2px 10px rgba(0,0,0,0.5); min-width: 150px; max-height: 90vh; overflow-y: auto;';

    items.forEach(function(itemData) {
        if (itemData.type === 'slider') {
            var div = document.createElement('div');
            div.style.cssText = 'padding: 8px 12px; border-top: 1px solid #444;';
            
            var label = document.createElement('div');
            label.style.fontSize = '12px';
            label.style.marginBottom = '4px';
            label.style.color = '#aaa';
            var unit = itemData.unit || '';
            label.textContent = itemData.label + ': ' + itemData.value + ' ' + unit;
            
            var input = document.createElement('input');
            input.type = 'range';
            input.min = itemData.min;
            input.max = itemData.max;
            input.step = itemData.step;
            input.value = itemData.value;
            input.style.width = '100%';
            input.style.cursor = 'pointer';
            input.style.accentColor = '#2196F3';
            
            input.oninput = function(e) {
                label.textContent = itemData.label + ': ' + this.value + ' ' + unit;
                itemData.onChange(this.value);
            };
            
            div.onclick = function(e) { e.stopPropagation(); };
            div.appendChild(label);
            div.appendChild(input);
            menu.appendChild(div);
        } else if (itemData.type === 'color_picker') {
            var div = document.createElement('div');
            div.style.cssText = 'padding: 8px 12px; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;';
            
            fs_SCANNER_COLORS.forEach(function(c) {
                var box = document.createElement('div');
                var isSelected = (c.value === fs_scanner_state.block_color);
                var colorOpaque = c.value.replace(/[\d.]+\)$/, '1)');
                
                box.title = c.name;
                box.style.cssText = 'width: 20px; height: 20px; background: ' + colorOpaque + '; border: 1px solid #555; cursor: pointer; border-radius: 3px; box-sizing: border-box;';
                
                if (isSelected) {
                    box.style.borderColor = '#fff';
                    box.style.boxShadow = '0 0 4px #fff';
                }
                
                box.onclick = function(e) {
                    e.stopPropagation();
                    fs_scanner_state.block_color = c.value;
                    fs_save_settings();
                    fs_update_visualizer();
                    closeMenu();
                };
                div.appendChild(box);
            });
            menu.appendChild(div);
        } else {
            var div = document.createElement('div');
            div.textContent = itemData.text;
            var disabled = !!itemData.disabled;
            div.style.cssText = 'padding: 8px 12px; white-space: nowrap;' + (itemData.borderTop ? ' border-top: 1px solid #444;' : '') +
                (disabled ? ' color: #666; cursor: not-allowed;' : ' cursor: pointer;');
            
            if (!disabled) {
                div.onmouseover = function() { this.style.background = '#444'; };
                div.onmouseout = function() { this.style.background = 'transparent'; };
                div.onclick = function(e) {
                    e.stopPropagation();
                    itemData.action();
                    closeMenu();
                };
            } else {
                div.onclick = function(e) { e.stopPropagation(); };
            }
            menu.appendChild(div);
        }
    });

    menu.style.visibility = 'hidden';
    menu.style.position = 'fixed';
    document.body.appendChild(menu);
    var menuWidth = menu.offsetWidth;
    var menuHeight = menu.offsetHeight;
    
    var left = rect.left;
    // If menu would go off-screen to the right, align its right edge with the button's right edge
    if (left + menuWidth > window.innerWidth - 5) {
        left = rect.right - menuWidth;
    }
    // Ensure it doesn't go off-screen to the left
    if (left < 5) {
        left = 5;
    }

    menu.style.left = left + 'px';

    if (rect.top < menuHeight + 5) {
        menu.style.top = rect.bottom + 'px';
    } else {
        menu.style.bottom = (window.innerHeight - rect.top) + 'px';
    }
    menu.style.visibility = 'visible';

    closeHandler = function(e) {
        if (!menu.contains(e.target)) {
            closeMenu();
        }
    };
    setTimeout(function() { 
        document.addEventListener('mousedown', closeHandler); 
        document.addEventListener('touchstart', closeHandler);
    }, 10);
}

function fs_show_scan_menu(rect) {
    var def = fs_SCANNER_CONFIG.default_delay_time;
    var curr = fs_SCANNER_CONFIG.delay_time;
    
    var items = [
        { text: (fs_scanner_state.scan_mode === 'CARRIER' ? '● ' : '○ ') + 'Normal (Carrier) ' + (fs_SCANNER_CONFIG.delay_time / 1000) + 's', action: function() { fs_scanner_state.scan_mode = 'CARRIER'; fs_save_settings(); } },
        { text: '\u00A0\u00A0└ ' + (curr === def ? '● ' : '○ ') + 'Delay: Standard (' + (def / 1000) + 's)', action: function() { fs_SCANNER_CONFIG.delay_time = def; fs_save_settings(); } },
        { text: '\u00A0\u00A0└ ' + ((curr === 5000 && curr !== def) ? '● ' : '○ ') + 'Delay: 5s', action: function() { fs_SCANNER_CONFIG.delay_time = 5000; fs_save_settings(); } },
        { text: '\u00A0\u00A0└ ' + ((curr === 10000 && curr !== def) ? '● ' : '○ ') + 'Delay: 10s', action: function() { fs_SCANNER_CONFIG.delay_time = 10000; fs_save_settings(); } },
        { 
            type: 'slider', 
            label: 'Dwell Time', 
            value: fs_SCANNER_CONFIG.dwell_time || 400, 
            min: 100, 
            max: 2000, 
            step: 50, 
            unit: 'ms',
            onChange: function(val) { 
                fs_SCANNER_CONFIG.dwell_time = parseInt(val); 
                fs_save_settings(); 
            } 
        },
        { text: (fs_scanner_state.scan_mode === 'STOP' ? '● ' : '○ ') + 'Stop on Signal', action: function() { fs_scanner_state.scan_mode = 'STOP'; fs_save_settings(); } },
        { text: (fs_scanner_state.scan_mode === 'SAMPLE_10S' ? '● ' : '○ ') + '10s Sample', action: function() { fs_scanner_state.scan_mode = 'SAMPLE_10S'; fs_save_settings(); } },
        { text: (fs_scanner_state.ignore_non_voice ? '☑ ' : '☐ ') + 'Filter: Only Analog (Bookmarks)', action: function() { fs_scanner_state.ignore_non_voice = !fs_scanner_state.ignore_non_voice; fs_save_settings(); } },
        { text: 'Detection Logic', borderTop: true, disabled: true, action: function() {} },
        { text: (fs_scanner_state.scan_logic === 'STANDARD' ? '● ' : '○ ') + 'Standard (Squelch)', action: function() { fs_scanner_state.scan_logic = 'STANDARD'; fs_save_settings(); } },
        { text: (fs_scanner_state.scan_logic === 'WIDTH' ? '● ' : '○ ') + 'Width Filter (<= Bandwidth)', action: function() { fs_scanner_state.scan_logic = 'WIDTH'; fs_save_settings(); } },
        { text: (fs_scanner_state.ignore_squelch ? '☑ ' : '☐ ') + 'Ignore Squelch Slider (Auto)', disabled: fs_scanner_state.scan_logic === 'STANDARD', action: function() { fs_scanner_state.ignore_squelch = !fs_scanner_state.ignore_squelch; fs_save_settings(); } }
    ];

    fs_show_floating_menu(rect, items);
}

function fs_show_block_menu(rect) {
    var items = [
        { text: 'Clear Visible Blocked Ranges', action: fs_clear_visible_blacklist },
        { text: 'Remove Blocked Range (Select on Waterfall)', action: fs_start_remove_range_selection, borderTop: true },
        { text: 'Block Range (Select on Waterfall)', action: fs_start_block_range_selection }
    ];
    fs_show_floating_menu(rect, items);
}

function fs_show_blacklist_menu(rect) {
    var items = [
        { text: (fs_scanner_state.show_blocked_ranges ? '☑ ' : '☐ ') + 'Always Show Blocked Ranges', action: function() { 
            fs_scanner_state.show_blocked_ranges = !fs_scanner_state.show_blocked_ranges;
            fs_update_visualizer();
            fs_save_settings();
        } },
        { text: (fs_scanner_state.edit_mode ? '☑ ' : '☐ ') + 'Edit Blocks (Move/Resize)', action: function() {
            fs_scanner_state.edit_mode = !fs_scanner_state.edit_mode;
            fs_update_sca_button_state();
            if (fs_scanner_state.edit_mode && typeof Plugins !== 'undefined' && Plugins.notify) Plugins.notify.show("Edit Mode: Drag blocks to move, edges to resize.");
        } },
        { type: 'color_picker' },
        { text: 'Export Plugin Settings', action: fs_export_settings, borderTop: true },
        { text: 'Import Plugin Settings', action: fs_import_settings },
        { text: 'Manage Blacklist', action: fs_edit_fs_blacklist },
        { text: 'Clear Blacklist (' + fs_scanner_state.blacklist.length + ')', action: fs_clear_blacklist },
        { 
            type: 'slider', 
            label: 'Audio Sync', 
            value: fs_SCANNER_CONFIG.audio_sync_delay || 0, 
            min: 0, 
            max: 2000, 
            step: 100, 
            unit: 'ms',
            onChange: function(val) { 
                fs_SCANNER_CONFIG.audio_sync_delay = parseInt(val); 
                fs_save_settings(); 
            } 
        },
        { 
            type: 'slider', 
            label: 'Bookmark Tolerance', 
            value: fs_SCANNER_CONFIG.bookmark_tolerance || 4000, 
            min: 500, 
            max: 15000, 
            step: 500, 
            unit: 'Hz',
            onChange: function(val) { 
                fs_SCANNER_CONFIG.bookmark_tolerance = parseInt(val); 
                fs_save_settings(); 
            } 
        }
    ];

    fs_show_floating_menu(rect, items);
}

function fs_load_blacklist() {
    try {
        var stored = localStorage.getItem('fs-scanner-blacklist');
        if (stored) fs_scanner_state.blacklist = JSON.parse(stored);
    } catch(e) {
    }
}

function fs_save_settings() {
    var settings = {
        dwell_time: fs_SCANNER_CONFIG.dwell_time,
        delay_time: fs_SCANNER_CONFIG.delay_time,
        audio_sync_delay: fs_SCANNER_CONFIG.audio_sync_delay,
        bookmark_tolerance: fs_SCANNER_CONFIG.bookmark_tolerance,
        scan_mode: fs_scanner_state.scan_mode,
        ignore_non_voice: fs_scanner_state.ignore_non_voice,
        show_blocked_ranges: fs_scanner_state.show_blocked_ranges,
        block_color: fs_scanner_state.block_color,
        scan_logic: fs_scanner_state.scan_logic,
        ignore_squelch: fs_scanner_state.ignore_squelch
    };
    localStorage.setItem('fs-scanner-settings', JSON.stringify(settings));
}

function fs_load_settings() {
    var stored = localStorage.getItem('fs-scanner-settings');
    if (stored) {
        try {
            var s = JSON.parse(stored);
            if (typeof s.dwell_time !== 'undefined') fs_SCANNER_CONFIG.dwell_time = s.dwell_time;
            if (typeof s.delay_time !== 'undefined') fs_SCANNER_CONFIG.delay_time = s.delay_time;
            if (typeof s.audio_sync_delay !== 'undefined') fs_SCANNER_CONFIG.audio_sync_delay = s.audio_sync_delay;
            if (typeof s.bookmark_tolerance !== 'undefined') fs_SCANNER_CONFIG.bookmark_tolerance = s.bookmark_tolerance;
            if (typeof s.scan_mode !== 'undefined') fs_scanner_state.scan_mode = s.scan_mode;
            if (typeof s.ignore_non_voice !== 'undefined') fs_scanner_state.ignore_non_voice = s.ignore_non_voice;
            if (typeof s.show_blocked_ranges !== 'undefined') fs_scanner_state.show_blocked_ranges = s.show_blocked_ranges;
            if (typeof s.block_color !== 'undefined') fs_scanner_state.block_color = s.block_color;
            
            if (typeof s.scan_logic !== 'undefined') {
                // Validation: Only allow STANDARD or WIDTH
                fs_scanner_state.scan_logic = (s.scan_logic === 'WIDTH') ? 'WIDTH' : 'STANDARD';
            }
            if (typeof s.ignore_squelch !== 'undefined') fs_scanner_state.ignore_squelch = s.ignore_squelch;
        } catch(e) {
        }
    } else {
        var storedColor = localStorage.getItem('fs-scanner-color');
        if (storedColor) fs_scanner_state.block_color = storedColor;
    }
}

function fs_export_settings() {
    var settings = {
        dwell_time: fs_SCANNER_CONFIG.dwell_time,
        delay_time: fs_SCANNER_CONFIG.delay_time,
        audio_sync_delay: fs_SCANNER_CONFIG.audio_sync_delay,
        bookmark_tolerance: fs_SCANNER_CONFIG.bookmark_tolerance,
        scan_mode: fs_scanner_state.scan_mode,
        ignore_non_voice: fs_scanner_state.ignore_non_voice,
        show_blocked_ranges: fs_scanner_state.show_blocked_ranges,
        block_color: fs_scanner_state.block_color,
        scan_logic: fs_scanner_state.scan_logic,
        ignore_squelch: fs_scanner_state.ignore_squelch,
        blacklist: fs_scanner_state.blacklist
    };
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "freq_scanner_settings.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function fs_import_settings() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var s = JSON.parse(e.target.result);
                
                if (!s || typeof s !== 'object' || Array.isArray(s)) {
                    throw new Error('Invalid format: Root must be an object.');
                }
                
                var validKeys = ['dwell_time', 'delay_time', 'audio_sync_delay', 'bookmark_tolerance', 'scan_mode', 'ignore_non_voice', 'show_blocked_ranges', 'block_color', 'blacklist', 'scan_logic', 'ignore_squelch'];
                if (!validKeys.some(function(k) { return k in s; })) {
                    throw new Error('No valid settings found. Is this a settings file?');
                }

                if (typeof s.delay_time !== 'undefined') fs_SCANNER_CONFIG.delay_time = s.delay_time;
                if (typeof s.audio_sync_delay !== 'undefined') fs_SCANNER_CONFIG.audio_sync_delay = s.audio_sync_delay;
                if (typeof s.bookmark_tolerance !== 'undefined') fs_SCANNER_CONFIG.bookmark_tolerance = s.bookmark_tolerance;
                if (typeof s.dwell_time !== 'undefined') fs_SCANNER_CONFIG.dwell_time = s.dwell_time;
                if (typeof s.scan_mode !== 'undefined') fs_scanner_state.scan_mode = s.scan_mode;
                if (typeof s.ignore_non_voice !== 'undefined') fs_scanner_state.ignore_non_voice = s.ignore_non_voice;
                if (typeof s.show_blocked_ranges !== 'undefined') fs_scanner_state.show_blocked_ranges = s.show_blocked_ranges;
                if (typeof s.block_color !== 'undefined') fs_scanner_state.block_color = s.block_color;
                if (typeof s.scan_logic !== 'undefined') fs_scanner_state.scan_logic = s.scan_logic;
                if (typeof s.ignore_squelch !== 'undefined') fs_scanner_state.ignore_squelch = s.ignore_squelch;
                
                if (typeof s.blacklist !== 'undefined' && Array.isArray(s.blacklist)) {
                    fs_scanner_state.blacklist = s.blacklist;
                    localStorage.setItem('fs-scanner-blacklist', JSON.stringify(fs_scanner_state.blacklist));
                }

                fs_save_settings();
                fs_update_visualizer();

                var btn = document.getElementById('fs-btn-list');
                if (btn) {
                    var originalText = btn.innerHTML;
                    btn.textContent = 'IMP';
                    setTimeout(function() { btn.innerHTML = originalText; }, 1000);
                }
            } catch (err) {
                alert('Import failed: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function fs_add_to_blacklist() {
    var overlay = fs_scanner_ui.viewport ? fs_scanner_ui.viewport.querySelector('#fs-overlay') : document.getElementById('fs-overlay');
    if (overlay) {
        if (overlay.cleanup) overlay.cleanup();
        overlay.remove();
        var btn = fs_scanner_ui.blockBtn;
        if (btn) {
            btn.textContent = 'Block';
            btn.style.color = 'white';
        }
        return;
    }

    var freq = (typeof UI !== 'undefined' && UI.getFrequency) ? UI.getFrequency() : fs_scanner_state.current_freq;
    freq = Math.round(freq / 100) * 100;
    
    if (!fs_is_blacklisted(freq)) {
        fs_scanner_state.blacklist.push(freq);
        localStorage.setItem('fs-scanner-blacklist', JSON.stringify(fs_scanner_state.blacklist));
        
        fs_update_visualizer();
        
        var btn = fs_scanner_ui.blockBtn;
        if (!btn) btn = fs_scanner_ui.scanBtn;
        if (btn) {
            var originalText = btn.textContent;
            var originalColor = btn.style.color;
            btn.textContent = 'BLK';
            btn.style.color = 'yellow';
            setTimeout(function() {
                btn.textContent = originalText;
                btn.style.color = originalColor;
            }, 1000);
        }
        
        if (fs_scanner_state.running) {
             if (fs_scanner_state.timer) clearTimeout(fs_scanner_state.timer);
             fs_scan_loop();
        }
    }
}

function fs_start_block_range_selection() {
    var btn = fs_scanner_ui.blockBtn;
    if (btn) {
        btn.textContent = 'Select';
        btn.style.color = 'yellow';
    }

    var strip = fs_scanner_ui.waterfallContainer;
    if (!strip || !strip.parentElement) return;
    var viewport = strip.parentElement;

    var existing = document.getElementById('fs-overlay');
    if (existing) {
        if (existing.cleanup) existing.cleanup();
        existing.remove();
    }

    var overlay = document.createElement('div');
    overlay.id = 'fs-overlay';
    overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; cursor: crosshair; touch-action: none;';

    var selection = document.createElement('div');
    selection.style.cssText = 'position: absolute; top: 0; height: 100%; background: rgba(255, 0, 0, 0.3); border-left: 1px solid red; border-right: 1px solid red; display: none; pointer-events: none;';
    overlay.appendChild(selection);

    viewport.appendChild(overlay);

    var startX = 0;
    var dragging = false;

    var getX = function(e) {
        if (e.touches && e.touches.length > 0) return e.touches[0].clientX;
        return e.clientX;
    };

    var mouseDownHandler = function(e) {
        var rect = overlay.getBoundingClientRect();
        startX = getX(e) - rect.left;
        dragging = true;
        selection.style.left = startX + 'px';
        selection.style.width = '0px';
        selection.style.display = 'block';
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    };

    var mouseMoveHandler = function(e) {
        if (!dragging) return;
        var rect = overlay.getBoundingClientRect();
        var currentX = getX(e) - rect.left;
        var w = Math.abs(currentX - startX);
        var l = Math.min(startX, currentX);
        selection.style.left = l + 'px';
        selection.style.width = w + 'px';
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    };

    var mouseUpHandler = function(e) {
        if (!dragging) return;
        dragging = false;
        
        var rect = overlay.getBoundingClientRect();
        var width = rect.width;
        var clientX = e.clientX;
        if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
        }
        
        var currentX = clientX - rect.left;
        
        if (currentX < 0) currentX = 0;
        if (currentX > width) currentX = width;
        
        var f1 = fs_map_x_to_freq(startX, width);
        var f2 = fs_map_x_to_freq(currentX, width);
        
        var min = Math.round(Math.min(f1, f2) / 100) * 100;
        var max = Math.round(Math.max(f1, f2) / 100) * 100;
        
        var ranges = [];
        var singles = [];
        
        fs_scanner_state.blacklist.forEach(function(entry) {
            if (typeof entry === 'number') {
                singles.push(entry);
            } else if (entry && typeof entry.start === 'number' && typeof entry.end === 'number') {
                ranges.push(entry);
            }
        });
        
        ranges.push({start: min, end: max});
        ranges.sort(function(a, b) { return a.start - b.start; });
        
        var merged = [];
        if (ranges.length > 0) {
            var current = ranges[0];
            for (var i = 1; i < ranges.length; i++) {
                var next = ranges[i];
                if (current.end >= next.start) {
                    current.end = Math.max(current.end, next.end);
                } else {
                    merged.push(current);
                    current = next;
                }
            }
            merged.push(current);
        }
        
        singles = singles.filter(function(f) {
            return !merged.some(function(r) { return f >= r.start && f <= r.end; });
        });
        
        fs_scanner_state.blacklist = singles.concat(merged);
        localStorage.setItem('fs-scanner-blacklist', JSON.stringify(fs_scanner_state.blacklist));
        
        fs_update_visualizer();
        
        if (fs_scanner_state.running) {
            if (fs_scanner_state.timer) clearTimeout(fs_scanner_state.timer);
            fs_scan_loop();
        }

        document.removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener('touchend', mouseUpHandler);
        overlay.remove();
        
        if (btn) {
            btn.textContent = 'BLK';
            setTimeout(function() {
                btn.textContent = 'Block';
                btn.style.color = 'white';
            }, 1000);
        }
    };
    
    overlay.cleanup = function() {
        document.removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener('touchend', mouseUpHandler);
        if (btn) {
            btn.textContent = 'Block';
            btn.style.color = 'white';
        }
    };

    overlay.addEventListener('mousedown', mouseDownHandler);
    overlay.addEventListener('mousemove', mouseMoveHandler);
    
    // Add Touch Listeners
    overlay.addEventListener('touchstart', mouseDownHandler, {passive: false});
    overlay.addEventListener('touchmove', mouseMoveHandler, {passive: false});
    
    document.addEventListener('mouseup', mouseUpHandler);
    document.addEventListener('touchend', mouseUpHandler);
}

function fs_start_remove_range_selection() {
    var btn = fs_scanner_ui.blockBtn;
    if (btn) {
        btn.textContent = 'Select';
        btn.style.color = 'yellow';
    }

    var strip = fs_scanner_ui.waterfallContainer;
    if (!strip || !strip.parentElement) return;
    var viewport = strip.parentElement;

    var existing = document.getElementById('fs-overlay');
    if (existing) {
        if (existing.cleanup) existing.cleanup();
        existing.remove();
    }

    var overlay = document.createElement('div');
    overlay.id = 'fs-overlay';
    overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; cursor: crosshair; touch-action: none;';
    
    viewport.appendChild(overlay);

    var clickHandler = function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        var rect = overlay.getBoundingClientRect();
        var clientX = e.clientX;
        if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
        }
        var x = clientX - rect.left;
        var width = rect.width;

        var freq = fs_map_x_to_freq(x, width);
        
        var initial_len = fs_scanner_state.blacklist.length;
        var tolerance = fs_get_tolerance();

        fs_scanner_state.blacklist = fs_scanner_state.blacklist.filter(function(bf) {
            if (typeof bf === 'number') {
                return Math.abs(freq - bf) > tolerance;
            } else if (bf && typeof bf.start === 'number' && typeof bf.end === 'number') {
                return !(freq >= bf.start && freq <= bf.end);
            }
            return true;
        });

        if (fs_scanner_state.blacklist.length < initial_len) {
            localStorage.setItem('fs-scanner-blacklist', JSON.stringify(fs_scanner_state.blacklist));
            fs_update_visualizer();
            
            if (btn) {
                btn.textContent = 'REM';
                setTimeout(function() {
                    btn.textContent = 'Block';
                    btn.style.color = 'white';
                }, 1000);
            }
        } else {
             if (btn) {
                btn.textContent = 'Block';
                btn.style.color = 'white';
            }
        }

        overlay.remove();
    };

    overlay.cleanup = function() {
        if (btn) {
            btn.textContent = 'Block';
            btn.style.color = 'white';
        }
    };

    overlay.addEventListener('mousedown', clickHandler);
    overlay.addEventListener('touchstart', clickHandler, {passive: false});
}

function fs_setup_block_dragging() {
    var strip = fs_scanner_ui.waterfallContainer;
    if (!strip || !strip.parentElement) return;
    var viewport = strip.parentElement;

    var dragIndex = -1;
    var dragOffsetFreq = 0;
    var isDragging = false;
    var dragMode = 'move';
    var edgePx = 8;

    var handleDown = function(e) {
        var isTouch = e.type === 'touchstart';
        if (!e.altKey && !fs_scanner_state.edit_mode) return;
        
        var rect = viewport.getBoundingClientRect();
        var clientX = isTouch ? e.touches[0].clientX : e.clientX;
        var x = clientX - rect.left;
        var range = fs_get_visible_freq_range();
        if (!range) return;
        var freq = fs_map_x_to_freq(x, rect.width);
        
        for (var i = 0; i < fs_scanner_state.blacklist.length; i++) {
            var entry = fs_scanner_state.blacklist[i];
            var start = (typeof entry === 'number') ? entry - fs_get_tolerance() : entry.start;
            var end = (typeof entry === 'number') ? entry + fs_get_tolerance() : entry.end;

            if (freq >= start && freq <= end) {
                dragIndex = i;
                isDragging = true;
                
                var x1 = fs_scale_px_from_freq(start, range, rect.width);
                var x2 = fs_scale_px_from_freq(end, range, rect.width);
                
                if (Math.abs(x - x1) < edgePx) {
                    dragMode = 'left';
                } else if (Math.abs(x - x2) < edgePx) {
                    dragMode = 'right';
                } else {
                    dragMode = 'move';
                    var center = (start + end) / 2;
                    dragOffsetFreq = freq - center;
                }
                
                e.preventDefault();
                e.stopPropagation();
                break;
            }
        }
    };

    var handleMove = function(e) {
        if (isDragging && dragIndex !== -1) {
            var isTouch = e.type === 'touchmove';
            var rect = viewport.getBoundingClientRect();
            var clientX = isTouch ? e.touches[0].clientX : e.clientX;
            var x = Math.max(0, Math.min(rect.width, clientX - rect.left));
            var freq = fs_map_x_to_freq(x, rect.width);
            
            var entry = fs_scanner_state.blacklist[dragIndex];
            
            if (dragMode !== 'move' && typeof entry === 'number') {
                var tol = fs_get_tolerance();
                entry = { start: entry - tol, end: entry + tol };
                fs_scanner_state.blacklist[dragIndex] = entry;
            }

            if (dragMode === 'left') {
                entry.start = Math.min(entry.end - 500, Math.round(freq / 100) * 100);
                viewport.style.cursor = 'col-resize';
            } else if (dragMode === 'right') {
                entry.end = Math.max(entry.start + 500, Math.round(freq / 100) * 100);
                viewport.style.cursor = 'col-resize';
            } else {
                var newCenter = freq - dragOffsetFreq;
                viewport.style.cursor = 'move';
                if (typeof entry === 'number') {
                    fs_scanner_state.blacklist[dragIndex] = Math.round(newCenter / 100) * 100;
                } else {
                    var width = entry.end - entry.start;
                    entry.start = Math.round((newCenter - width/2) / 100) * 100;
                    entry.end = entry.start + width;
                }
            }
            fs_update_visualizer();
            e.preventDefault();
        }
    };

    var handleUp = function() {
        if (isDragging) {
            isDragging = false;
            dragIndex = -1;
            dragMode = 'move';
            viewport.style.cursor = 'crosshair';
            localStorage.setItem('fs-scanner-blacklist', JSON.stringify(fs_scanner_state.blacklist));
        }
    };

    viewport.addEventListener('mousedown', handleDown, true);
    viewport.addEventListener('touchstart', handleDown, {passive: false, capture: true});
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, {passive: false});
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchend', handleUp);
}

function fs_map_x_to_freq(x, width) {
    var range = fs_get_visible_freq_range();
    if (range) {
        return range.start + (x / width) * (range.end - range.start);
    }
    return (typeof UI !== 'undefined' && UI.getFrequency) ? UI.getFrequency() : 0;
}

function fs_clear_visible_blacklist() {
    if (typeof fs_get_visible_freq_range !== 'function') return;
    var range = fs_get_visible_freq_range();
    if (!range) return;

    var initial_len = fs_scanner_state.blacklist.length;
    
    fs_scanner_state.blacklist = fs_scanner_state.blacklist.filter(function(entry) {
        if (typeof entry === 'number') {
            return entry < range.start || entry > range.end;
        } else if (entry && typeof entry.start === 'number' && typeof entry.end === 'number') {
            // Keep if range ends before view starts OR range starts after view ends
            return entry.end < range.start || entry.start > range.end;
        }
        return true;
    });

    if (fs_scanner_state.blacklist.length < initial_len) {
        localStorage.setItem('fs-scanner-blacklist', JSON.stringify(fs_scanner_state.blacklist));
        fs_update_visualizer();
        
        var btn = fs_scanner_ui.blockBtn;
        if (btn) {
            var originalText = btn.textContent;
            var originalColor = btn.style.color;
            btn.textContent = 'CLR';
            btn.style.color = 'yellow';
            setTimeout(function() {
                btn.textContent = originalText;
                btn.style.color = originalColor;
            }, 1000);
        }
    }
}

function fs_clear_blacklist() {
    fs_scanner_state.blacklist = [];
    localStorage.removeItem('fs-scanner-blacklist');
    
    fs_update_visualizer();
    
    // Visual feedback on button
    var btn = document.getElementById('fs-btn-scan');
    if (btn) {
        var originalText = btn.textContent;
        btn.textContent = 'CLR';
        setTimeout(function() {
            btn.textContent = originalText;
        }, 1000);
    }
}

function fs_edit_fs_blacklist() {
    var existing = document.getElementById('fs-edit-dialog');
    if (existing) existing.remove();

    var themeColor = fs_scanner_state.last_theme_color || '#444';

    var dialog = document.createElement('div');
    dialog.id = 'fs-edit-dialog';
    dialog.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #000; border: 1px solid ' + themeColor + '; color: #eee; z-index: 10002; padding: 20px; border-radius: 5px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 450px; max-width: 95%; max-height: 80vh; display: flex; flex-direction: column; font-family: sans-serif;';

    var title = document.createElement('h3');
    title.textContent = 'Manage Blacklist';
    title.style.cssText = 'margin: -20px -20px 15px -20px; padding: 12px 20px; background: ' + themeColor + '; color: #fff; font-size: 16px; font-weight: bold; border-bottom: 1px solid #555; border-radius: 4px 4px 0 0;';
    dialog.appendChild(title);

    var listContainer = document.createElement('div');
    listContainer.style.cssText = 'flex: 1; overflow-y: auto; margin-bottom: 10px; border: 1px solid ' + themeColor + '; background: #111; padding: 5px; min-height: 200px;';
    
    var currentList = fs_scanner_state.blacklist.slice();

    function renderList() {
        listContainer.innerHTML = '';
        if (currentList.length === 0) {
            var empty = document.createElement('div');
            empty.textContent = 'Blacklist is empty.';
            empty.style.padding = '10px';
            empty.style.color = '#aaa';
            empty.style.textAlign = 'center';
            listContainer.appendChild(empty);
            return;
        }

        currentList.forEach(function(entry, index) {
            var row = document.createElement('div');
            row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 5px; align-items: center; background: #444; padding: 8px; border-radius: 3px; justify-content: space-between;';
            
            var textDiv = document.createElement('div');
            textDiv.style.cssText = 'font-family: monospace; font-size: 13px;';
            
            if (typeof entry === 'number') {
                textDiv.textContent = 'Freq: ' + (entry / 1000) + ' kHz';
            } else if (entry && typeof entry.start === 'number' && typeof entry.end === 'number') {
                textDiv.textContent = 'Range: ' + (entry.start / 1000) + ' - ' + (entry.end / 1000) + ' kHz';
            } else {
                textDiv.textContent = 'Invalid Entry';
            }

            var btnDel = document.createElement('button');
            btnDel.textContent = 'Delete';
            btnDel.style.cssText = 'background: #d32f2f; color: white; border: none; cursor: pointer; padding: 5px 10px; border-radius: 3px; font-size: 12px;';
            btnDel.onclick = function() {
                currentList.splice(index, 1);
                renderList();
            };

            row.appendChild(textDiv);
            row.appendChild(btnDel);
            listContainer.appendChild(row);
        });
    }

    renderList();

    dialog.appendChild(listContainer);

    var btnContainer = document.createElement('div');
    btnContainer.style.textAlign = 'right';

    var btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancel';
    btnCancel.style.cssText = 'margin-right: 10px; padding: 5px 10px; background: #444; color: white; border: none; cursor: pointer; border-radius: 3px;';
    btnCancel.onclick = function() { dialog.remove(); };

    var btnSave = document.createElement('button');
    btnSave.textContent = 'Save';
    btnSave.style.cssText = 'padding: 5px 10px; background: #2196F3; color: white; border: none; cursor: pointer; border-radius: 3px;';
    btnSave.onclick = function() {
        fs_scanner_state.blacklist = currentList;
        localStorage.setItem('fs-scanner-blacklist', JSON.stringify(fs_scanner_state.blacklist));
        fs_update_visualizer();
        dialog.remove();
    };

    btnContainer.appendChild(btnCancel);
    btnContainer.appendChild(btnSave);
    dialog.appendChild(btnContainer);

    document.body.appendChild(dialog);
}

function fs_get_tolerance() {
    var tolerance = 5000;

    if (typeof UI !== 'undefined' && typeof UI.getDemodulator === 'function') {
        var demod = UI.getDemodulator();
        if (demod) {
            var low = 0, high = 0;
            if (typeof demod.getBandpass === 'function') {
                var bp = demod.getBandpass();
                low = bp.low_cut; high = bp.high_cut;
            } else if (typeof demod.low_cut !== 'undefined') {
                low = demod.low_cut; high = demod.high_cut;
            }
            var bw_radius = Math.max(Math.abs(low), Math.abs(high));
            if (bw_radius > 0) tolerance = bw_radius + 2500;
        }
    }
    return tolerance;
}

function fs_is_blacklisted(f) {
    var tolerance = fs_get_tolerance();
    
    return fs_scanner_state.blacklist.some(function(bf) {
        if (typeof bf === 'number') {
            return Math.abs(f - bf) <= tolerance;
        } else if (bf && typeof bf.start === 'number' && typeof bf.end === 'number') {
            return f >= bf.start && f <= bf.end;
        }
        return false;
    });
}

function fs_is_bookmark_ignored(f, cached_bookmarks) {
    if (!fs_scanner_state.ignore_non_voice) return false;

    var bookmarkArray = cached_bookmarks || fs_get_flat_bookmarks();
    if (!bookmarkArray || bookmarkArray.length === 0) return false;

    var tolerance = fs_get_tolerance() + 3000;

    return bookmarkArray.some(function(b) {
        if (b.frequency && Math.abs(f - b.frequency) <= tolerance) {
            var mod = (b.modulation || b.mode || '').toLowerCase();
            var name = (b.name || '').toLowerCase();

            var voice_modes = ['am', 'fm', 'nfm'];
            if (voice_modes.indexOf(mod) === -1) {
                return true;
            }

            if (mod === 'nfm' || mod === 'fm' || mod === 'am') {
                var digital_keywords = ['dstar', 'd-star', 'dmr', 'ysf', 'c4fm', 'fusion', 'p25', 'nxdn', 'tetra', 'pocsag', 'm17', 'acars', 'vdl', 'sita', 'arinc'];
                for (var i = 0; i < digital_keywords.length; i++) {
                    if (name.indexOf(digital_keywords[i]) !== -1) {
                        return true;
                    }
                }
            }
        }
        return false;
    });
}

function fs_is_ignored(f, cached_bookmarks) {
    if (fs_is_blacklisted(f) || fs_is_bookmark_ignored(f, cached_bookmarks)) return true;
    // DC Spike protection (Center frequency +/- 1.5kHz)
    if (typeof window.center_freq !== 'undefined' && Math.abs(f - window.center_freq) < 1500) return true;
    return false;
}

Plugins.freq_scanner = { no_css: true };

function fs_init_visualizer() {
    var strip = fs_scanner_ui.waterfallContainer;
    if (!strip) return;
    var viewport = fs_scanner_ui.viewport;
    
    if (!fs_scanner_ui.visualizer) {
        var canvas = document.createElement('canvas');
        canvas.id = 'fs-visualizer';
        canvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none !important; z-index: 0;';
        if (viewport) viewport.insertBefore(canvas, strip.nextSibling);
        fs_scanner_ui.visualizer = canvas;
    }
    
    if (typeof window.mkscale === 'function' && !window.mkscale.is_scanner_hooked) {
        var original_mkscale = window.mkscale;
        window.mkscale = function() {
            original_mkscale.apply(this, arguments);
            fs_update_visualizer();
        };
        window.mkscale.is_scanner_hooked = true;
    }
    
    window.addEventListener('resize', fs_update_visualizer);
    if (viewport) {
        const fs_force_update_handler = () => fs_update_visualizer();
        viewport.addEventListener('scroll', fs_force_update_handler, { passive: true });
        viewport.addEventListener('wheel', fs_force_update_handler, { passive: true });
        viewport.addEventListener('mouseup', fs_force_update_handler, { passive: true });
        viewport.addEventListener('touchend', fs_force_update_handler, { passive: true });
    }
    
    fs_update_visualizer();
}

var fs_visualizer_request_pending = false;
function fs_update_visualizer() {
    if (fs_visualizer_request_pending) return;
    fs_visualizer_request_pending = true;
    requestAnimationFrame(fs_update_visualizer_render);
}

function fs_update_visualizer_render() {
    fs_visualizer_request_pending = false;
    var cvs = fs_scanner_ui.visualizer;
    if (!cvs) return;
    
    var ctx = cvs.getContext('2d');
    var cw = cvs.clientWidth;
    var ch = cvs.clientHeight;

    if (cvs.width !== cw || cvs.height !== ch) {
        cvs.width = cw;
        cvs.height = ch;
    }

    ctx.clearRect(0, 0, cw, ch);
    
    if (!fs_scanner_state.running && !fs_scanner_state.show_blocked_ranges) return;
    
    var range = fs_get_visible_freq_range();
    if (!range) return;

    var width = (typeof window.waterfallWidth === 'function') ? window.waterfallWidth() : 0;
    if (!width && fs_scanner_ui.viewport) width = fs_scanner_ui.viewport.clientWidth;
    if (!width) return;
    
    var span = (typeof range.bw !== 'undefined') ? range.bw : (range.end - range.start);
    if (span <= 0) return;
    
    var px_per_hz = width / span;
    var tolerance = fs_get_tolerance();

    ctx.fillStyle = fs_scanner_state.block_color;
    var edgeColor = fs_scanner_state.block_color.replace(/[\d.]+\)$/, '0.6)');
    
    var blacklist = fs_scanner_state.blacklist;
    for (var i = 0; i < blacklist.length; i++) {
        var entry = blacklist[i];
        var start, end;
        if (typeof entry === 'number') {
            start = entry - tolerance;
            end = entry + tolerance;
        } else {
            start = entry.start;
            end = entry.end;
        }

        var x1 = (start - range.start) * px_per_hz;
        var x2 = (end - range.start) * px_per_hz;

        var drawX1 = Math.max(-10, x1);
        var drawX2 = Math.min(cw + 10, x2);
        var w = drawX2 - drawX1;

        if (w > 0) {
            ctx.fillRect(drawX1, 0, w, ch);
            
            var edgeW = 6;
            if (w > edgeW * 2) {
                ctx.fillStyle = edgeColor;
                ctx.fillRect(drawX1, 0, edgeW, ch);
                ctx.fillRect(drawX2 - edgeW, 0, edgeW, ch);
                ctx.fillStyle = fs_scanner_state.block_color;
            }
        }
    }
}

function fs_update_sca_button_state() {
    var btn = fs_scanner_ui.toggleBtn;
    var panel = fs_scanner_ui.panel;
    if (!btn || !panel) return;

    if (panel.style.display !== 'none' || fs_scanner_state.edit_mode) {
        btn.style.color = '#39FF14';
        btn.style.borderColor = fs_scanner_state.edit_mode ? 'yellow' : '#39FF14';
    } else {
        if (fs_scanner_state.running || fs_scanner_state.show_blocked_ranges) {
            btn.style.color = 'yellow';
            btn.style.borderColor = 'yellow';
        } else {
            btn.style.color = '#aaa';
            btn.style.borderColor = '#666';
        }
    }
}

function fs_find_bookmark(f) {
    var tolerance = fs_SCANNER_CONFIG.bookmark_tolerance || 4000; 
    var bookmarkArray = fs_get_flat_bookmarks();
    
    for (var i = 0; i < bookmarkArray.length; i++) {
        var bm = bookmarkArray[i];
        if (bm.frequency && Math.abs(f - bm.frequency) <= tolerance) {
            return bm;
        }
    }
    return null;
}

var fs_last_display_freq = null;
function fs_update_info_display(freq) {
    var disp = fs_scanner_ui.infoDisplay;
    if (!disp) return;

    if (fs_last_display_freq === freq && fs_scanner_state.running) return;
    fs_last_display_freq = freq;

    var neonColor = '#FF3939'; 

    if (!fs_scanner_state.running) {
        disp.innerHTML = 'Ready';
        disp.style.setProperty('color', '#aaa', 'important');
        disp.style.fontSize = '24px';
        disp.style.borderColor = 'transparent';
        disp.style.setProperty('background-color', '#001a33', 'important');
        fs_last_display_freq = null;
        return;
    }

    var displayFreq = freq;
    var isWait = false;

    if (freq === 'WAIT') {
        displayFreq = fs_scanner_state.current_freq;
        isWait = true;
    }

    if (!displayFreq) {
        if (disp.innerHTML !== 'Scanning...') {
            disp.innerHTML = 'Scanning...';
        }
        disp.style.fontSize = '24px';
        disp.style.setProperty('color', neonColor, 'important');
        disp.style.setProperty('background-color', '#001a33', 'important');
        disp.style.borderColor = 'transparent';
        return;
    }

    var text = (displayFreq / 1000000).toFixed(5) + ' MHz';
    var fontSize = '24px';

    var bm = fs_find_bookmark(displayFreq);
    if (bm) {
        text = bm.name;
        fontSize = '14px';
    }

    if (isWait) {
        text += '<span style="position: absolute; bottom: 1px; right: 3px; font-size: 9px; color: #fff; opacity: 0.7; line-height: 1;">wait</span>';
    }

    disp.innerHTML = text;
    disp.style.fontSize = fontSize;

    disp.style.setProperty('color', neonColor, 'important');
    disp.style.setProperty('background-color', '#001a33', 'important');
    disp.style.borderColor = 'transparent';
}

function fs_update_scanner_theme() {
    var parent = document.querySelector('#openwebrx-panel-receiver');
    if (!parent) return;
    
    var style = window.getComputedStyle(parent);
    var bg = style.backgroundColor;
    if (bg === fs_scanner_state.last_bg_computed) return;
    fs_scanner_state.last_bg_computed = bg;

    var parentBorderColor = style.borderTopColor || style.borderColor;
    
    var r = 87, g = 87, b = 87;
    var rgb = bg.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
        r = parseInt(rgb[0]); g = parseInt(rgb[1]); b = parseInt(rgb[2]);
    }

    var themeColor = 'rgb(' + r + ',' + g + ',' + b + ')';
    
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    
    var neonColor = '#00eaff';
    
    if (delta > 10) {
        var scale = 255 / (max || 1);
        var r_b = Math.min(255, Math.floor(r * scale));
        var g_b = Math.min(255, Math.floor(g * scale));
        var b_b = Math.min(255, Math.floor(b * scale));
        
        r_b = Math.floor(r_b + (255 - r_b) * 0.5);
        g_b = Math.floor(g_b + (255 - g_b) * 0.5);
        b_b = Math.floor(b_b + (255 - b_b) * 0.5);
        
        neonColor = 'rgb(' + r_b + ',' + g_b + ',' + b_b + ')';
    }
    
    fs_scanner_state.last_fg_color = neonColor;
    fs_scanner_state.last_theme_color = themeColor;

    var panel = fs_scanner_ui.panel;
    var handle = fs_scanner_ui.dragHandle;
    var info = fs_scanner_ui.infoDisplay;
    
    if (panel && handle) {
        if (parentBorderColor && parentBorderColor !== 'rgba(0, 0, 0, 0)' && parentBorderColor !== 'transparent') {
            panel.style.borderColor = parentBorderColor;
        } else {
            panel.style.borderColor = themeColor;
        }
        panel.style.backgroundColor = '#000000';
        
        handle.style.backgroundColor = themeColor;
        handle.style.borderBottom = '1px solid ' + themeColor;
        handle.style.color = '#fff';
    }
}

function fs_get_waterfall_container() {
    if (fs_scanner_ui.waterfallContainer) return fs_scanner_ui.waterfallContainer;
    var container = document.getElementById('webrx-canvas-container');
    if (!container) container = document.getElementById('openwebrx-waterfall-container');
    if (!container) container = document.getElementById('waterfall_container');
    if (!container) {
        var canvas = document.getElementById('waterfall_canvas');
        if (canvas) container = canvas.parentElement;
    }
    return container;
}

function fs_get_flat_bookmarks() {
    if (typeof bookmarks === 'undefined' || !bookmarks || !bookmarks.bookmarks) return [];
    var b = bookmarks.bookmarks;
    if (Array.isArray(b)) return b;
    if (typeof b === 'object' && b !== null) {
        var arr = [];
        Object.keys(b).forEach(function(key) {
            if (Array.isArray(b[key])) arr = arr.concat(b[key]);
        });
        return arr;
    }
    return [];
}

function fs_get_visible_freq_range() {
    if (typeof window.get_visible_freq_range === 'function') {
        var r = window.get_visible_freq_range();
        if (r && typeof r.start !== 'undefined') return r;
    }

    var strip = fs_scanner_ui.waterfallContainer;
    var viewport = fs_scanner_ui.viewport;
    if (!viewport) return null;

    if (typeof window.center_freq !== 'undefined' && typeof window.bandwidth !== 'undefined') {
        var startFreq = window.center_freq - window.bandwidth / 2;

        if (typeof window.zoom_offset_px !== 'undefined' && window.zoom_levels) {
            var ww = (typeof window.waterfallWidth === 'function') ? window.waterfallWidth() : viewport.clientWidth;
            var zoom = window.zoom_levels[window.zoom_level] || 1;
            var totalWidth = ww * zoom;
            return {
                start: startFreq + ((-window.zoom_offset_px) / totalWidth) * window.bandwidth,
                end: startFreq + ((-window.zoom_offset_px + ww) / totalWidth) * window.bandwidth
            };
        }

        var totalWidth = strip.scrollWidth || strip.clientWidth;
        return {
            start: startFreq + (viewport.scrollLeft / totalWidth) * window.bandwidth,
            end: startFreq + ((viewport.scrollLeft + viewport.clientWidth) / totalWidth) * window.bandwidth
        };
    }
    return null;
}

function fs_scale_px_from_freq(f, range, width) {
    if (!range) return 0;
    var span = (typeof range.bw !== 'undefined') ? range.bw : (range.end - range.start);
    if (span <= 0) return 0;
    return ((f - range.start) / span) * width;
}
