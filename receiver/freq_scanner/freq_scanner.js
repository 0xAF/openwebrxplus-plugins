/**
 * Frequency Scanner Plugin for OpenWebRX+
 * Client-side implementation.
 * 
 * License: MIT
 * Copyright (c) 2025 DL1HQH
 */

// --- CONFIGURATION ---
var SCANNER_CONFIG = {
    // Fallback step size in Hz (used if no system step size is found)
    step_size: 12500,
    
    // Wait time on a frequency in milliseconds (Scan speed)
    dwell_time: 100,
    
    // Wait time after signal loss in milliseconds (Hang Time)
    delay_time: 2500,
    
    // Squelch threshold in dB (used if no system squelch status is available)
    squelch_threshold: -45
};
// ---------------------
SCANNER_CONFIG.default_delay_time = SCANNER_CONFIG.delay_time;

var scanner_state = {
    running: false,
    timer: null,
    current_freq: 0,
    start_freq: 0,
    end_freq: 0,
    blacklist: [],
    last_signal_time: 0,
    scan_mode: 'CARRIER', // 'CARRIER', 'STOP', 'SAMPLE_10S'
    signal_start_time: 0,
    ignore_non_voice: true,
    original_center_freq: 0,
    tuning: false,
    show_blocked_ranges: false,
    block_color: 'rgba(255, 0, 0, 0.3)',
    modulation_timer: null
};

var SCANNER_COLORS = [
    { name: 'Red', value: 'rgba(255, 0, 0, 0.3)' },
    { name: 'Orange', value: 'rgba(255, 165, 0, 0.3)' },
    { name: 'Yellow', value: 'rgba(255, 255, 0, 0.3)' },
    { name: 'Green', value: 'rgba(0, 255, 0, 0.3)' },
    { name: 'Blue', value: 'rgba(0, 0, 255, 0.3)' },
    { name: 'Purple', value: 'rgba(128, 0, 128, 0.3)' },
    { name: 'White', value: 'rgba(255, 255, 255, 0.3)' }
];

$(document).ready(init_freq_scanner);

function init_freq_scanner() {
    load_blacklist();
    load_settings();
    inject_css();
    create_ui();

    // Install hook for modulation changes to show/hide button
    attempt_hook_openwebrx();

    // Polling as fallback if hooks don't work
    if (!scanner_state.modulation_timer) {
        scanner_state.modulation_timer = setInterval(check_modulation_mode, 500);
    }
    
    init_visualizer();
}

function inject_css() {
    // Inject CSS for long-press indicator
    if (!document.getElementById('freq-scanner-css')) {
        var style = document.createElement('style');
        style.id = 'freq-scanner-css';
        style.innerHTML = 
            '.freq-scanner-longpress { position: relative; }' +
            '.freq-scanner-longpress::after { content: ""; position: absolute; bottom: 2px; right: 2px; width: 0; height: 0; border-left: 6px solid transparent; border-bottom: 6px solid currentColor; opacity: 0.8; pointer-events: none; }';
        document.head.appendChild(style);
    }
}

function create_ui() {
    var container = document.querySelector('#openwebrx-panel-receiver');

    // Create Toggle Button (SCA)
    if (!document.getElementById('freq-scanner-toggle-btn')) {
        var toggleBtn = document.createElement('div');
        toggleBtn.id = 'freq-scanner-toggle-btn';
        toggleBtn.textContent = 'SCA';
        toggleBtn.title = 'Open Scanner Controls';
        toggleBtn.style.cssText = 'position: absolute; bottom: 3px; left: 4px; z-index: 99; font-size: 12px; font-weight: bold; color: #aaa; cursor: pointer; background: rgba(0,0,0,0.5); padding: 0px 4px; border-radius: 3px; border: 1px solid #666; user-select: none; line-height: 12px; transition: left 0.2s;';
        
        toggleBtn.onclick = function() {
            var panel = document.getElementById('freq-scanner-floating-panel');
            if (panel.style.display === 'none') {
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
            update_sca_button_state();
        };
        
        if (container) container.appendChild(toggleBtn);

        // Auto-positioning logic
        var update_sca_pos = function() {
            var btn = document.getElementById('freq-scanner-toggle-btn');
            if (!btn) return;
            var cont = document.querySelector('#openwebrx-panel-receiver');
            if (!cont) return;
            
            var left = 4;
            var clock = document.getElementById('openwebrx-clock-utc');
            if (clock && clock.offsetParent) {
                var r1 = cont.getBoundingClientRect();
                var r2 = clock.getBoundingClientRect();
                // Check if clock is at bottom-left (approx)
                if (r2.bottom > r1.bottom - 40 && r2.left < r1.left + 50) {
                    left = (r2.right - r1.left) + 8;
                }
            }
            btn.style.left = left + 'px';
        };
        setInterval(update_sca_pos, 1000);
        update_sca_pos();
    }

    // Create Floating Panel with Buttons
    if (!document.getElementById('freq-scanner-floating-panel')) {
        var panel = document.createElement('div');
        panel.id = 'freq-scanner-floating-panel';
        panel.style.cssText = 'display: none; position: fixed; top: 150px; left: 10px; background: rgba(30,30,30,0.95); border: 1px solid #666; border-radius: 5px; padding: 0; z-index: 10000; box-shadow: 0 0 10px rgba(0,0,0,0.5); font-family: sans-serif;';
        
        var dragHandle = document.createElement('div');
        dragHandle.textContent = 'Frequency Scanner';
        dragHandle.style.cssText = 'height: 18px; line-height: 18px; font-size: 11px; color: #ddd; text-align: center; background: #444; cursor: move; border-radius: 5px 5px 0 0; width: 100%; border-bottom: 1px solid #555; user-select: none;';
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

        var btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 5px;';

        var btn = document.createElement('button');
        btn.id = 'openwebrx-btn-freq-scanner';
        btn.className = 'freq-scanner-longpress';
        btn.textContent = 'Scan';
        btn.title = 'Short: Start/Stop | Long: Scan Options';
        
        btn.style.cssText = 'width: 50px; height: 26px; padding: 0; line-height: 20px; font-size: 13px; font-weight: 600; border: 3px solid #FF3939; background: #FF3939; color: white; cursor: pointer; border-radius: 5px; box-sizing: border-box; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;';
        
        setup_long_press(btn, function() {
            toggle_scanner();
        }, function(rect) {
            show_scan_menu(rect);
        });

        var btnSkip = document.createElement('button');
        btnSkip.id = 'openwebrx-btn-freq-skip';
        btnSkip.textContent = 'Skip';
        btnSkip.title = 'Skip current frequency';
        btnSkip.disabled = true;
        btnSkip.style.cssText = 'width: 50px; height: 26px; padding: 0; line-height: 26px; font-size: 13px; font-weight: 600; border: none; background: #444; color: #aaa; cursor: default; border-radius: 5px; opacity: 0.5; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;';
        btnSkip.onclick = function() {
            if (scanner_state.running) {
                if (scanner_state.timer) clearTimeout(scanner_state.timer);
                scanner_move_next(true);
                scan_loop();
            }
        };

        var btnBlock = document.createElement('button');
        btnBlock.id = 'openwebrx-btn-freq-block';
        btnBlock.className = 'freq-scanner-longpress';
        btnBlock.textContent = 'Block';
        btnBlock.title = 'Short: Block Current | Long: Block Options';
        btnBlock.style.cssText = 'width: 50px; height: 26px; padding: 0; line-height: 26px; font-size: 13px; font-weight: 600; border: none; background: #444; color: white; cursor: pointer; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;';
        setup_long_press(btnBlock, function() {
            add_to_blacklist();
        }, function(rect) {
            show_block_menu(rect);
        });

        var btnList = document.createElement('button');
        btnList.id = 'openwebrx-btn-freq-list';
        btnList.innerHTML = 'Setup';
        btnList.title = 'Scanner Setup / Blacklist';
        btnList.style.cssText = 'width: 50px; height: 26px; padding: 0; line-height: 26px; font-size: 13px; font-weight: 600; border: none; background: #444; color: white; cursor: pointer; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;';
        btnList.onclick = function() { show_blacklist_menu(this.getBoundingClientRect()); };

        btnContainer.appendChild(btn);
        btnContainer.appendChild(btnSkip);
        btnContainer.appendChild(btnBlock);
        btnContainer.appendChild(btnList);
        
        content.appendChild(btnContainer);
        panel.appendChild(content);
        document.body.appendChild(panel);
    }
}

function setup_long_press(element, onClick, onLongPress) {
    var pressTimer;
    var longPressTriggered = false;
    var isCancelled = false;
    var startX = 0;
    var startY = 0;

    var startPress = function(e) {
        if (e.type === 'mousedown' && e.button !== 0) return; // Left click only
        if (element.dataset.disabled === 'true') return;
        
        if (e.touches && e.touches.length > 0) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
        
        longPressTriggered = false;
        isCancelled = false;
        pressTimer = setTimeout(function() {
            longPressTriggered = true;
            pressTimer = null;
            var rect = element.getBoundingClientRect();
            if (navigator.vibrate) navigator.vibrate(50);
            onLongPress(rect);
        }, 800); // 800ms press for menu
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
        // Allow small movement on touch (jitter tolerance)
        if (e.type === 'touchmove' && e.touches && e.touches.length > 0) {
            var x = e.touches[0].clientX;
            var y = e.touches[0].clientY;
            if (Math.abs(x - startX) < 10 && Math.abs(y - startY) < 10) {
                return;
            }
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
    element.addEventListener('touchstart', startPress, {passive: true});
    element.addEventListener('touchend', function(e) {
        e.preventDefault(); 
        endPress(e);
    });
    element.addEventListener('touchmove', cancelPress, {passive: true});
    element.addEventListener('touchcancel', cancelPress, {passive: true});
    
    // Prevent native context menu on long press
    element.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
}

var hook_attempts = 0;
function attempt_hook_openwebrx() {
    var hooked = false;

    // Hook sdr_profile_changed to stop scanner on profile switch
    if (typeof window.sdr_profile_changed === 'function' && !window.sdr_profile_changed.is_scanner_hooked) {
        var original_sdr_profile_changed = window.sdr_profile_changed;
        window.sdr_profile_changed = function() {
            if (scanner_state.running) {
                set_scanner_active(false);
            }
            return original_sdr_profile_changed.apply(this, arguments);
        };
        window.sdr_profile_changed.is_scanner_hooked = true;
        hooked = true; // Hook successful
    }

    // Hook UI.setFrequency to detect manual tuning (e.g. waterfall click)
    if (typeof UI !== 'undefined' && typeof UI.setFrequency === 'function' && !UI.setFrequency.is_scanner_hooked) {
        var original_setFrequency = UI.setFrequency;
        UI.setFrequency = function(freq) {
            // If it was a manual tune while scanning...
            if (scanner_state.running && !scanner_state.tuning) {
                if (Math.abs(freq - scanner_state.current_freq) > 10) {
                    set_scanner_active(false);
                }
            }
            return original_setFrequency.apply(this, arguments);
        };
        UI.setFrequency.is_scanner_hooked = true;
        hooked = true;
    }
    
    hook_attempts++;
    if (!hooked && hook_attempts < 20) {
        // Retry if OpenWebRX is not loaded yet
        setTimeout(attempt_hook_openwebrx, 500);
    }
}

var last_known_mode = '';
function check_modulation_mode() {
    var mode = null;
    
    // This method has proven to be the most reliable.
    if (typeof UI !== 'undefined' && UI.getDemodulator) {
        var demod = UI.getDemodulator();
        if (demod && typeof demod.get_modulation === 'function') {
            mode = demod.get_modulation();
        }
    }
    
    if (mode && mode !== last_known_mode) {
        last_known_mode = mode;
        update_scanner_visibility(mode);
    }
}

function update_scanner_visibility(mode) {
    var btn = document.getElementById('openwebrx-btn-freq-scanner');
    var btnSkip = document.getElementById('openwebrx-btn-freq-skip');
    var btnBlock = document.getElementById('openwebrx-btn-freq-block');
    var btnList = document.getElementById('openwebrx-btn-freq-list');
    if (!btn) return;

    var m = String(mode).toLowerCase();

    if (m === 'nfm' || m === 'am' || m === 'fm') {
        delete btn.dataset.disabled;
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
        btn.title = 'Short: Start/Stop | Long: Scan Options';

        if (scanner_state.running) {
            btn.style.background = '#39FF14';
            btn.style.borderColor = '#39FF14';
            btn.style.color = 'black';
        } else {
            btn.style.background = '#FF3939';
            btn.style.borderColor = '#FF3939';
            btn.style.color = 'white';
        }
        if (btnSkip) {
            if (scanner_state.running) {
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
        if (scanner_state.running) {
            toggle_scanner(); // Stops the scanner cleanly if running
        }
        btn.dataset.disabled = 'true';
        btn.disabled = false; // Keep active for tooltip
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

function set_scanner_active(active) {
    var btn = document.getElementById('openwebrx-btn-freq-scanner');
    if (active) {
        start_scanner();
        if (btn) {
            btn.textContent = 'Stop';
            btn.style.background = '#39FF14';
            btn.style.border = '3px solid #39FF14';
            btn.style.color = 'black';
        }
    } else {
        stop_scanner();
        update_visualizer();
        if (btn) {
            btn.textContent = 'Scan';
            btn.style.background = '#FF3939';
            btn.style.border = '3px solid #FF3939';
            btn.style.color = 'white';
        }
    }
    update_scanner_visibility(last_known_mode);

    update_sca_button_state();
}

function toggle_scanner() {
    set_scanner_active(!scanner_state.running);
}

function start_scanner() {
    scanner_state.running = true;
    
    // Determine frequency range based on current profile (visible range)
    var center;
    // Determined from openwebrx.js (global variable)
    if (typeof window.center_freq !== 'undefined') {
        center = window.center_freq;
    }

    var rate;
    // Determined from openwebrx.js (global variable 'bandwidth')
    if (typeof window.bandwidth !== 'undefined') {
        rate = window.bandwidth;
    }
    
    if (typeof center === 'undefined') {
        console.error('[FreqScanner] Center frequency not found.');
        stop_scanner();
        return;
    }

    if (typeof rate === 'undefined') {
        console.warn('[FreqScanner] Sample rate not found, using fallback (1 MHz).');
        rate = 1000000;
    }

    scanner_state.original_center_freq = center;
    
    // We use 90% of bandwidth to avoid edge areas
    var bw = rate * 0.9;
    scanner_state.start_freq = center - (bw / 2);
    scanner_state.end_freq = center + (bw / 2);
    
    scanner_state.current_freq = scanner_state.start_freq;

    console.log('[FreqScanner] Starting scan:', scanner_state.start_freq, '-', scanner_state.end_freq);
    scan_loop();
    update_visualizer();
}

function stop_scanner() {
    scanner_state.running = false;
    if (scanner_state.timer) {
        clearTimeout(scanner_state.timer);
        scanner_state.timer = null;
    }
}

function get_squelch_threshold() {
    var t = SCANNER_CONFIG.squelch_threshold;
    var slider = document.querySelector('#openwebrx-panel-receiver .openwebrx-squelch-slider');
    if (slider) t = parseFloat(slider.value);
    return t;
}

function scanner_move_next(force_min_step) {
    scanner_state.signal_start_time = 0; // Reset timer for TIME mode
    scanner_state.last_signal_time = 0;  // Reset delay timer

    var step = SCANNER_CONFIG.step_size;
    if (typeof window.tuning_step !== 'undefined') step = window.tuning_step;
    
    // Ensure minimum skip of 12.5kHz only if forced (manual skip)
    if (force_min_step && step < 12500) step = 12500;
    
    var threshold = get_squelch_threshold();
    var next_freq = find_next_peak(scanner_state.current_freq, step, threshold);
    
    if (next_freq !== null) {
        scanner_state.current_freq = next_freq;
    } else {
        var safety = 0;
        do {
            scanner_state.current_freq += step;
            if (scanner_state.current_freq > scanner_state.end_freq) {
                scanner_state.current_freq = scanner_state.start_freq;
            }
            safety++;
        } while (is_ignored(scanner_state.current_freq) && safety < 1000);
    }
}

function scan_loop() {
    if (!scanner_state.running) return;

    // Safety check: Center frequency changed? (e.g. by profile switch)
    if (typeof window.center_freq !== 'undefined' && scanner_state.original_center_freq && Math.abs(window.center_freq - scanner_state.original_center_freq) > 100) {
        console.log('[FreqScanner] Center frequency changed, stopping scanner.');
        set_scanner_active(false);
        return;
    }

    // 1. Check if current frequency is blacklisted (e.g. just added)
    if (is_ignored(scanner_state.current_freq)) {
        scanner_move_next();
        scanner_state.timer = setTimeout(scan_loop, 5);
        return;
    }

    // Set frequency
    if (typeof UI !== 'undefined' && typeof UI.setFrequency === 'function') {
        scanner_state.tuning = true;
        UI.setFrequency(scanner_state.current_freq);
        scanner_state.tuning = false;
    }

    // Wait and check signal
    scanner_state.timer = setTimeout(function() {
        if (!scanner_state.running) return;

        // Check if squelch is open (signal present)
        var has_signal = false;
        var threshold = get_squelch_threshold();

        // Determined from openwebrx.js: Comparison of smeter_level with slider
        if (typeof window.smeter_level !== 'undefined') {
            var db = 10 * Math.log10(window.smeter_level);
            if (db >= threshold) has_signal = true;
        }

        if (has_signal) {
            var btn = document.getElementById('openwebrx-btn-freq-scanner');
            if (btn) btn.style.borderColor = '#FF0000';

            // Try to center the signal
            fine_tune();

            // --- MODE LOGIC ---
            
            // Mode 1: Stop on found
            if (scanner_state.scan_mode === 'STOP') {
                set_scanner_active(false);
                return;
            }

            // Mode 3: 10s Sample
            if (scanner_state.scan_mode === 'SAMPLE_10S') {
                if (!scanner_state.signal_start_time) {
                    scanner_state.signal_start_time = Date.now();
                }
                // If longer than 10s on signal -> Continue
                if (Date.now() - scanner_state.signal_start_time > 10000) {
                    scanner_move_next();
                    scan_loop();
                    return;
                }
            }
            
            // Standard (Carrier): Stay as long as signal is present
            scanner_state.last_signal_time = Date.now();
            // Signal present: Wait briefly and check again
            scanner_state.timer = setTimeout(scan_loop, 200);
        } else {
            var btn = document.getElementById('openwebrx-btn-freq-scanner');
            if (btn) btn.style.borderColor = '#39FF14';

            // No signal: Check delay
            var delay_ms = SCANNER_CONFIG.delay_time;
            if (scanner_state.scan_mode === 'SAMPLE_10S') delay_ms = 0;

            if (scanner_state.last_signal_time && (Date.now() - scanner_state.last_signal_time < delay_ms)) {
                // We are still in the delay phase
                scanner_state.timer = setTimeout(scan_loop, 200);
            } else {
                // Delay expired or never had signal -> Continue
                scanner_move_next();
                scan_loop();
            }
        }
    }, SCANNER_CONFIG.dwell_time);
}

function fine_tune() {
    if (!window.wf_data || !window.wf_data.length) return;
    if (typeof window.center_freq === 'undefined' || typeof window.bandwidth === 'undefined') return;
    
    var center = window.center_freq;
    var bw = window.bandwidth;
    var data = window.wf_data;
    var len = data.length;
    
    var current_f = scanner_state.current_freq;
    
    var freq_to_idx = function(f) {
        return Math.floor((f - (center - bw/2)) / bw * len);
    };
    
    var idx_to_freq = function(i) {
        return (center - bw/2) + (i / len) * bw;
    };

    var current_idx = freq_to_idx(current_f);
    
    // Search +/- 3kHz
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
            scanner_state.current_freq = new_freq;
            if (typeof UI !== 'undefined' && typeof UI.setFrequency === 'function') {
                scanner_state.tuning = true;
                UI.setFrequency(scanner_state.current_freq);
                scanner_state.tuning = false;
            }
        }
    }
}

function find_next_peak(current_freq, step, threshold) {
    if (!window.wf_data || !window.wf_data.length) return null;
    
    var center = window.center_freq;
    var bw = window.bandwidth;
    var data = window.wf_data;
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

    // Skip the range of the current signal (at least 1 step)
    var skip_bins = Math.ceil((step / bw) * len);
    if (skip_bins < 1) skip_bins = 1;

    // Search window for peak (e.g. 15 kHz)
    var search_hz = 15000;
    var search_bins = Math.ceil((search_hz / bw) * len);

    var start_idx = current_idx + skip_bins;
    
    var find_peak_and_end = function(start_i) {
        var max_v = -1000;
        var max_i = start_i;
        var limit = Math.min(len, start_i + search_bins);
        var end_i = start_i;
        
        for (var j = start_i; j < limit; j++) {
            if (data[j] < threshold) {
                end_i = j;
                break;
            }
            end_i = j;
            if (data[j] > max_v) {
                max_v = data[j];
                max_i = j;
            }
        }
        return {peak_idx: max_i, end_idx: end_i};
    };
    
    // 1. Search forward to the end
    for (var i = start_idx; i < len; i++) {
        if (data[i] >= threshold) {
            var res = find_peak_and_end(i);
            var f = idx_to_freq(res.peak_idx);
            if (!is_ignored(f)) return f;
            i = res.end_idx;
        }
    }
    
    // 2. Search from the beginning to the current position (Wrap-around)
    for (var i = 0; i < current_idx; i++) {
        if (data[i] >= threshold) {
            var res = find_peak_and_end(i);
            var f = idx_to_freq(res.peak_idx);
            if (!is_ignored(f)) return f;
            i = res.end_idx;
        }
    }
    
    return null;
}

// --- BLACKLIST FUNCTIONS ---

function show_floating_menu(rect, items) {
    // Remove old menu if present
    var existing = document.getElementById('freq-scanner-menu');
    if (existing) existing.remove();

    var menu = document.createElement('div');
    menu.id = 'freq-scanner-menu';
    
    // Align right to the button
    var right = window.innerWidth - rect.right;
    var bottom = window.innerHeight - rect.top;
    menu.style.cssText = 'position: fixed; right: ' + right + 'px; bottom: ' + bottom + 'px; background: #222; border: 1px solid #444; color: #eee; z-index: 10001; border-radius: 4px; padding: 0; font-family: sans-serif; font-size: 13px; box-shadow: 0 2px 10px rgba(0,0,0,0.5); min-width: 150px;';

    var closeHandler;
    var closeMenu = function() {
        menu.remove();
        if (closeHandler) {
            document.removeEventListener('mousedown', closeHandler);
            document.removeEventListener('touchstart', closeHandler);
        }
    };

    items.forEach(function(itemData) {
        var div = document.createElement('div');
        div.textContent = itemData.text;
        div.style.cssText = 'padding: 8px 12px; cursor: pointer; white-space: nowrap;' + (itemData.borderTop ? ' border-top: 1px solid #444;' : '');
        div.onmouseover = function() { this.style.background = '#444'; };
        div.onmouseout = function() { this.style.background = 'transparent'; };
        div.onclick = function(e) {
            e.stopPropagation();
            itemData.action();
            closeMenu();
        };
        menu.appendChild(div);
    });

    // Close on click outside
    closeHandler = function(e) {
        if (!menu.contains(e.target)) {
            closeMenu();
        }
    };
    setTimeout(function() { 
        document.addEventListener('mousedown', closeHandler); 
        document.addEventListener('touchstart', closeHandler);
    }, 10);
    document.body.appendChild(menu);
}

function show_scan_menu(rect) {
    var def = SCANNER_CONFIG.default_delay_time;
    var curr = SCANNER_CONFIG.delay_time;
    
    var items = [
        { text: (scanner_state.scan_mode === 'CARRIER' ? '● ' : '○ ') + 'Normal (Carrier) ' + (SCANNER_CONFIG.delay_time / 1000) + 's', action: function() { scanner_state.scan_mode = 'CARRIER'; save_settings(); } },
        { text: '\u00A0\u00A0└ ' + (curr === def ? '● ' : '○ ') + 'Delay: Standard (' + (def / 1000) + 's)', action: function() { SCANNER_CONFIG.delay_time = def; save_settings(); } },
        { text: '\u00A0\u00A0└ ' + ((curr === 5000 && curr !== def) ? '● ' : '○ ') + 'Delay: 5s', action: function() { SCANNER_CONFIG.delay_time = 5000; save_settings(); } },
        { text: '\u00A0\u00A0└ ' + ((curr === 10000 && curr !== def) ? '● ' : '○ ') + 'Delay: 10s', action: function() { SCANNER_CONFIG.delay_time = 10000; save_settings(); } },
        { text: (scanner_state.scan_mode === 'STOP' ? '● ' : '○ ') + 'Stop on Signal', action: function() { scanner_state.scan_mode = 'STOP'; save_settings(); } },
        { text: (scanner_state.scan_mode === 'SAMPLE_10S' ? '● ' : '○ ') + '10s Sample', action: function() { scanner_state.scan_mode = 'SAMPLE_10S'; save_settings(); } },
        { text: (scanner_state.ignore_non_voice ? '☑ ' : '☐ ') + 'Filter: Only Analog (Bookmarks)', action: function() { scanner_state.ignore_non_voice = !scanner_state.ignore_non_voice; save_settings(); } }
    ];

    show_floating_menu(rect, items);
}

function show_block_menu(rect) {
    var items = [
        { text: (scanner_state.show_blocked_ranges ? '☑ ' : '☐ ') + 'Always Show Blocked Ranges', action: function() { 
            scanner_state.show_blocked_ranges = !scanner_state.show_blocked_ranges;
            update_visualizer();
            save_settings();
        } },
        { text: 'Color: ' + get_color_name(scanner_state.block_color), action: cycle_block_color },
        { text: 'Clear Visible Blocked Ranges', action: clear_visible_blacklist, borderTop: true },
        { text: 'Remove Blocked Range (Select on Waterfall)', action: start_remove_range_selection, borderTop: true },
        { text: 'Block Range (Select on Waterfall)', action: start_block_range_selection }
    ];
    show_floating_menu(rect, items);
}

function get_color_name(c) {
    for (var i = 0; i < SCANNER_COLORS.length; i++) {
        if (SCANNER_COLORS[i].value === c) {
            return SCANNER_COLORS[i].name;
        }
    }
    return 'Custom';
}

function cycle_block_color() {
    var idx = -1;
    for (var i = 0; i < SCANNER_COLORS.length; i++) {
        if (SCANNER_COLORS[i].value === scanner_state.block_color) {
            idx = i;
            break;
        }
    }
    
    var nextIdx = (idx + 1) % SCANNER_COLORS.length;
    var next = SCANNER_COLORS[nextIdx].value;
    
    scanner_state.block_color = next;
    save_settings();
    update_visualizer();
}

function show_blacklist_menu(rect) {
    var items = [
        { text: 'Export Plugin Settings', action: export_settings },
        { text: 'Import Plugin Settings', action: import_settings },
        { text: 'Manage Blacklist', action: edit_blacklist },
        { text: 'Clear Blacklist (' + scanner_state.blacklist.length + ')', action: clear_blacklist }
    ];

    show_floating_menu(rect, items);
}

function load_blacklist() {
    try {
        var stored = localStorage.getItem('freq_scanner_blacklist');
        if (stored) scanner_state.blacklist = JSON.parse(stored);
    } catch(e) {
        console.error('[FreqScanner] Error loading blacklist', e);
    }
}

function save_settings() {
    var settings = {
        delay_time: SCANNER_CONFIG.delay_time,
        scan_mode: scanner_state.scan_mode,
        ignore_non_voice: scanner_state.ignore_non_voice,
        show_blocked_ranges: scanner_state.show_blocked_ranges,
        block_color: scanner_state.block_color
    };
    localStorage.setItem('freq_scanner_settings', JSON.stringify(settings));
}

function load_settings() {
    var stored = localStorage.getItem('freq_scanner_settings');
    if (stored) {
        try {
            var s = JSON.parse(stored);
            if (typeof s.delay_time !== 'undefined') SCANNER_CONFIG.delay_time = s.delay_time;
            if (typeof s.scan_mode !== 'undefined') scanner_state.scan_mode = s.scan_mode;
            if (typeof s.ignore_non_voice !== 'undefined') scanner_state.ignore_non_voice = s.ignore_non_voice;
            if (typeof s.show_blocked_ranges !== 'undefined') scanner_state.show_blocked_ranges = s.show_blocked_ranges;
            if (typeof s.block_color !== 'undefined') scanner_state.block_color = s.block_color;
        } catch(e) {
            console.error('[FreqScanner] Error loading settings', e);
        }
    } else {
        // Migration: Check for legacy color setting
        var storedColor = localStorage.getItem('freq_scanner_color');
        if (storedColor) scanner_state.block_color = storedColor;
    }
}

function export_settings() {
    var settings = {
        delay_time: SCANNER_CONFIG.delay_time,
        scan_mode: scanner_state.scan_mode,
        ignore_non_voice: scanner_state.ignore_non_voice,
        show_blocked_ranges: scanner_state.show_blocked_ranges,
        block_color: scanner_state.block_color,
        blacklist: scanner_state.blacklist
    };
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "freq_scanner_settings.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function import_settings() {
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
                
                var validKeys = ['delay_time', 'scan_mode', 'ignore_non_voice', 'show_blocked_ranges', 'block_color', 'blacklist'];
                if (!validKeys.some(function(k) { return k in s; })) {
                    throw new Error('No valid settings found. Is this a settings file?');
                }

                if (typeof s.delay_time !== 'undefined') SCANNER_CONFIG.delay_time = s.delay_time;
                if (typeof s.scan_mode !== 'undefined') scanner_state.scan_mode = s.scan_mode;
                if (typeof s.ignore_non_voice !== 'undefined') scanner_state.ignore_non_voice = s.ignore_non_voice;
                if (typeof s.show_blocked_ranges !== 'undefined') scanner_state.show_blocked_ranges = s.show_blocked_ranges;
                if (typeof s.block_color !== 'undefined') scanner_state.block_color = s.block_color;
                
                if (typeof s.blacklist !== 'undefined' && Array.isArray(s.blacklist)) {
                    scanner_state.blacklist = s.blacklist;
                    localStorage.setItem('freq_scanner_blacklist', JSON.stringify(scanner_state.blacklist));
                }
                
                save_settings();
                update_visualizer();
                
                var btn = document.getElementById('openwebrx-btn-freq-list');
                if (btn) {
                    var originalText = btn.innerHTML;
                    btn.textContent = 'IMP';
                    setTimeout(function() { btn.innerHTML = originalText; }, 1000);
                }
            } catch (err) {
                console.error('[FreqScanner] Error during settings import:', err);
                alert('Import failed: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function add_to_blacklist() {
    // Check if we are in selection mode (overlay exists) -> Cancel it
    var overlay = document.getElementById('freq-scanner-overlay');
    if (overlay) {
        if (overlay.cleanup) overlay.cleanup();
        overlay.remove();
        var btn = document.getElementById('openwebrx-btn-freq-block');
        if (btn) {
            btn.textContent = 'Block';
            btn.style.color = 'white';
        }
        return;
    }

    var freq = (typeof UI !== 'undefined' && UI.getFrequency) ? UI.getFrequency() : scanner_state.current_freq;
    freq = Math.round(freq / 100) * 100;
    
    if (!is_blacklisted(freq)) {
        scanner_state.blacklist.push(freq);
        localStorage.setItem('freq_scanner_blacklist', JSON.stringify(scanner_state.blacklist));
        console.log('[FreqScanner] Frequency ignored:', freq);
        
        update_visualizer();
        
        // Visual feedback on button
        var btn = document.getElementById('openwebrx-btn-freq-block');
        if (!btn) btn = document.getElementById('openwebrx-btn-freq-scanner');
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
        
        // If scanner is running, skip immediately
        if (scanner_state.running) {
             if (scanner_state.timer) clearTimeout(scanner_state.timer);
             scan_loop();
        }
    }
}

function start_block_range_selection() {
    var btn = document.getElementById('openwebrx-btn-freq-block');
    if (btn) {
        btn.textContent = 'Select';
        btn.style.color = 'yellow';
    }

    // Try to find the container using the ID from openwebrx.css
    var container = document.getElementById('webrx-canvas-container');
    // Fallback strategies to find the waterfall container
    if (!container) container = document.getElementById('openwebrx-waterfall-container');
    if (!container) container = document.getElementById('waterfall_container');
    if (!container) {
        var canvas = document.getElementById('waterfall_canvas');
        if (canvas) container = canvas.parentElement;
    }
    
    if (!container) return;

    // Remove existing overlay if present
    var existing = document.getElementById('freq-scanner-overlay');
    if (existing) {
        if (existing.cleanup) existing.cleanup();
        existing.remove();
    }

    var overlay = document.createElement('div');
    overlay.id = 'freq-scanner-overlay';
    // Use max z-index and touch-action: none to prevent scrolling/zooming gestures
    overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; cursor: crosshair; touch-action: none;';

    var selection = document.createElement('div');
    selection.style.cssText = 'position: absolute; top: 0; height: 100%; background: rgba(255, 0, 0, 0.3); border-left: 1px solid red; border-right: 1px solid red; display: none; pointer-events: none;';
    overlay.appendChild(selection);

    container.appendChild(overlay);

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
        // Handle touchend where touches is empty, use changedTouches
        var clientX = e.clientX;
        if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
        }
        
        var currentX = clientX - rect.left;
        
        // Clamp to edges
        if (currentX < 0) currentX = 0;
        if (currentX > width) currentX = width;
        
        var f1 = map_x_to_freq(startX, width);
        var f2 = map_x_to_freq(currentX, width);
        
        var min = Math.round(Math.min(f1, f2) / 100) * 100;
        var max = Math.round(Math.max(f1, f2) / 100) * 100;
        
        // Merge overlapping ranges
        var ranges = [];
        var singles = [];
        
        scanner_state.blacklist.forEach(function(entry) {
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
        
        // Filter singles covered by merged ranges
        singles = singles.filter(function(f) {
            return !merged.some(function(r) { return f >= r.start && f <= r.end; });
        });
        
        scanner_state.blacklist = singles.concat(merged);
        localStorage.setItem('freq_scanner_blacklist', JSON.stringify(scanner_state.blacklist));
        console.log('[FreqScanner] Range blocked (merged):', min, max);
        
        update_visualizer();
        
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
    
    // Attach cleanup for external cancellation
    overlay.cleanup = function() {
        document.removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener('touchend', mouseUpHandler);
    };

    overlay.addEventListener('mousedown', mouseDownHandler);
    overlay.addEventListener('mousemove', mouseMoveHandler);
    
    // Add Touch Listeners
    overlay.addEventListener('touchstart', mouseDownHandler, {passive: false});
    overlay.addEventListener('touchmove', mouseMoveHandler, {passive: false});
    
    document.addEventListener('mouseup', mouseUpHandler);
    document.addEventListener('touchend', mouseUpHandler);
}

function start_remove_range_selection() {
    var btn = document.getElementById('openwebrx-btn-freq-block');
    if (btn) {
        btn.textContent = 'Select';
        btn.style.color = 'yellow';
    }

    var container = document.getElementById('webrx-canvas-container');
    if (!container) container = document.getElementById('openwebrx-waterfall-container');
    if (!container) container = document.getElementById('waterfall_container');
    if (!container) {
        var canvas = document.getElementById('waterfall_canvas');
        if (canvas) container = canvas.parentElement;
    }
    
    if (!container) return;

    var existing = document.getElementById('freq-scanner-overlay');
    if (existing) {
        if (existing.cleanup) existing.cleanup();
        existing.remove();
    }

    var overlay = document.createElement('div');
    overlay.id = 'freq-scanner-overlay';
    overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; cursor: crosshair; touch-action: none;';
    
    container.appendChild(overlay);

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

        var freq = map_x_to_freq(x, width);
        
        var initial_len = scanner_state.blacklist.length;
        var tolerance = get_tolerance();

        scanner_state.blacklist = scanner_state.blacklist.filter(function(bf) {
            if (typeof bf === 'number') {
                return Math.abs(freq - bf) > tolerance;
            } else if (bf && typeof bf.start === 'number' && typeof bf.end === 'number') {
                return !(freq >= bf.start && freq <= bf.end);
            }
            return true;
        });

        if (scanner_state.blacklist.length < initial_len) {
            localStorage.setItem('freq_scanner_blacklist', JSON.stringify(scanner_state.blacklist));
            console.log('[FreqScanner] Removed blocked item at:', freq);
            update_visualizer();
            
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

    overlay.addEventListener('mousedown', clickHandler);
    overlay.addEventListener('touchstart', clickHandler, {passive: false});
}

function map_x_to_freq(x, width) {
    if (typeof window.center_freq !== 'undefined' && typeof window.bandwidth !== 'undefined') {
        var start_f = window.center_freq - (window.bandwidth / 2);
        return start_f + (x / width) * window.bandwidth;
    }
    return 0;
}

function clear_visible_blacklist() {
    if (typeof get_visible_freq_range !== 'function') return;
    var range = get_visible_freq_range();
    if (!range) return;

    var initial_len = scanner_state.blacklist.length;
    
    scanner_state.blacklist = scanner_state.blacklist.filter(function(entry) {
        // Keep entries that are strictly outside the visible range
        if (typeof entry === 'number') {
            return entry < range.start || entry > range.end;
        } else if (entry && typeof entry.start === 'number' && typeof entry.end === 'number') {
            // Keep if range ends before view starts OR range starts after view ends
            return entry.end < range.start || entry.start > range.end;
        }
        return true;
    });

    if (scanner_state.blacklist.length < initial_len) {
        localStorage.setItem('freq_scanner_blacklist', JSON.stringify(scanner_state.blacklist));
        console.log('[FreqScanner] Cleared visible blacklist entries.');
        update_visualizer();
        
        var btn = document.getElementById('openwebrx-btn-freq-block');
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

function clear_blacklist() {
    scanner_state.blacklist = [];
    localStorage.removeItem('freq_scanner_blacklist');
    console.log('[FreqScanner] Blacklist cleared.');
    
    update_visualizer();
    
    // Visual feedback on button
    var btn = document.getElementById('openwebrx-btn-freq-scanner');
    if (btn) {
        var originalText = btn.textContent;
        btn.textContent = 'CLR';
        setTimeout(function() {
            btn.textContent = originalText;
        }, 1000);
    }
}

function edit_blacklist() {
    var existing = document.getElementById('freq-scanner-edit-dialog');
    if (existing) existing.remove();

    var dialog = document.createElement('div');
    dialog.id = 'freq-scanner-edit-dialog';
    dialog.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #222; border: 1px solid #444; color: #eee; z-index: 10002; padding: 20px; border-radius: 5px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 450px; max-width: 95%; max-height: 80vh; display: flex; flex-direction: column; font-family: sans-serif;';

    var title = document.createElement('h3');
    title.textContent = 'Manage Blacklist';
    title.style.marginTop = '0';
    dialog.appendChild(title);

    var listContainer = document.createElement('div');
    listContainer.style.cssText = 'flex: 1; overflow-y: auto; margin-bottom: 10px; border: 1px solid #444; background: #333; padding: 5px; min-height: 200px;';
    
    // Copy current blacklist to temporary array
    var currentList = scanner_state.blacklist.slice();

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
        scanner_state.blacklist = currentList;
        localStorage.setItem('freq_scanner_blacklist', JSON.stringify(scanner_state.blacklist));
        console.log('[FreqScanner] Blacklist updated manually:', currentList.length, 'entries');
        update_visualizer();
        dialog.remove();
    };

    btnContainer.appendChild(btnCancel);
    btnContainer.appendChild(btnSave);
    dialog.appendChild(btnContainer);

    document.body.appendChild(dialog);
}

function get_tolerance() {
    var tolerance = 5000; // Default Fallback

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

function is_blacklisted(f) {
    var tolerance = get_tolerance();
    
    return scanner_state.blacklist.some(function(bf) {
        if (typeof bf === 'number') {
            return Math.abs(f - bf) <= tolerance;
        } else if (bf && typeof bf.start === 'number' && typeof bf.end === 'number') {
            return f >= bf.start && f <= bf.end;
        }
        return false;
    });
}

function is_bookmark_ignored(f) {
    if (!scanner_state.ignore_non_voice) return false;
    if (typeof bookmarks === 'undefined' || !bookmarks || !bookmarks.bookmarks) return false;

    // Calculate tolerance (analogous to is_blacklisted)
    var tolerance = get_tolerance() + 3000; // Increased tolerance for bookmarks (e.g. DMR/YSF edges)

    var bookmarkArray = [];
    if (typeof bookmarks !== 'undefined' && bookmarks && bookmarks.bookmarks) {
        var b = bookmarks.bookmarks;
        if (Array.isArray(b)) {
            bookmarkArray = b;
        } else if (typeof b === 'object' && b !== null) {
            // Bookmarks are grouped by source (server, local, etc.) -> Flatten
            Object.keys(b).forEach(function(key) {
                if (Array.isArray(b[key])) {
                    bookmarkArray = bookmarkArray.concat(b[key]);
                }
            });
        }
    }
    
    if (bookmarkArray.length === 0) return false;

    // Check if a bookmark is nearby that is NOT AM/FM/NFM/SSB
    return bookmarkArray.some(function(b) {
        if (b.frequency && Math.abs(f - b.frequency) <= tolerance) {
            var mod = (b.modulation || b.mode || '').toLowerCase();
            var name = (b.name || '').toLowerCase();

            // 1. Whitelist for voice modulations
            // Everything else (dstar, dmr, cw, digi-modes) is ignored
            var voice_modes = ['am', 'fm', 'nfm'];
            if (voice_modes.indexOf(mod) === -1) {
                return true; // No voice modulation -> Ignore
            }

            // 2. Heuristic: Check name for NFM/FM/AM
            // If user saved "D-STAR Repeater" as NFM, but the name reveals it
            if (mod === 'nfm' || mod === 'fm' || mod === 'am') {
                var digital_keywords = ['dstar', 'd-star', 'dmr', 'ysf', 'c4fm', 'fusion', 'p25', 'nxdn', 'tetra', 'pocsag', 'm17', 'acars', 'vdl', 'sita', 'arinc'];
                for (var i = 0; i < digital_keywords.length; i++) {
                    if (name.indexOf(digital_keywords[i]) !== -1) {
                        return true; // Name suggests digital -> Ignore
                    }
                }
            }
        }
        return false;
    });
}

function is_ignored(f) {
    return is_blacklisted(f) || is_bookmark_ignored(f);
}

// Plugin registration
Plugins.freq_scanner = { no_css: true };

function init_visualizer() {
    // Find the waterfall viewport (parent of the moving strip)
    var strip = document.getElementById('webrx-canvas-container');
    if (!strip) return;
    var viewport = strip.parentElement;
    
    if (!document.getElementById('freq-scanner-visualizer')) {
        var canvas = document.createElement('canvas');
        canvas.id = 'freq-scanner-visualizer';
        canvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none !important; z-index: 0;';
        viewport.insertBefore(canvas, strip.nextSibling);
    }
    
    // Hook mkscale to redraw when view changes
    if (typeof window.mkscale === 'function' && !window.mkscale.is_scanner_hooked) {
        var original_mkscale = window.mkscale;
        window.mkscale = function() {
            original_mkscale.apply(this, arguments);
            update_visualizer();
        };
        window.mkscale.is_scanner_hooked = true;
    }
    
    // Initial draw
    update_visualizer();
}

function update_visualizer() {
    var cvs = document.getElementById('freq-scanner-visualizer');
    if (!cvs) return;
    
    var ctx = cvs.getContext('2d');
    // Resize canvas to match display size (viewport)
    var rect = cvs.getBoundingClientRect();
    if (cvs.width !== rect.width || cvs.height !== rect.height) {
        cvs.width = rect.width;
        cvs.height = rect.height;
    }
    
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    
    if (!scanner_state.running && !scanner_state.show_blocked_ranges) return;
    
    if (typeof get_visible_freq_range !== 'function') return;
    var range = get_visible_freq_range();
    if (!range) return;
    
    ctx.fillStyle = scanner_state.block_color;
    
    scanner_state.blacklist.forEach(function(entry) {
        var start, end;
        if (typeof entry === 'number') {
            var tol = get_tolerance();
            start = entry - tol;
            end = entry + tol;
        } else {
            start = entry.start;
            end = entry.end;
        }
        
        var x1 = scale_px_from_freq(start, range);
        var x2 = scale_px_from_freq(end, range);
        var w = x2 - x1;
        if (w < 1) w = 1;
        
        ctx.fillRect(x1, 0, w, cvs.height);
    });
}

function update_sca_button_state() {
    var btn = document.getElementById('freq-scanner-toggle-btn');
    var panel = document.getElementById('freq-scanner-floating-panel');
    if (!btn || !panel) return;

    if (panel.style.display !== 'none') {
        btn.style.color = '#39FF14';
        btn.style.borderColor = '#39FF14';
    } else {
        if (scanner_state.running) {
            btn.style.color = 'yellow';
            btn.style.borderColor = 'yellow';
        } else {
            btn.style.color = '#aaa';
            btn.style.borderColor = '#666';
        }
    }
}
