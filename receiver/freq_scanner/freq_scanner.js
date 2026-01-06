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
    tuning: false
};

$(document).ready(init_freq_scanner);

function init_freq_scanner() {
    load_blacklist();

    var container = document.querySelector('#openwebrx-panel-receiver');

    // Create "SCN" button if not already present
    if (!document.getElementById('openwebrx-btn-freq-scanner')) {
        var btn = document.createElement('button');
        btn.id = 'openwebrx-btn-freq-scanner';
        btn.textContent = 'Scan';
        btn.title = 'Short: Start/Stop | Long: Scan Options';
        
        btn.style.cssText = 'width: 50px; height: 34px; padding: 0; line-height: 28px; font-size: 13px; font-weight: 600; border: 3px solid #FF3939; background: #FF3939; color: white; cursor: pointer; border-radius: 5px; box-sizing: border-box; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;';
        
        // Long-Press Logic (Menu)
        var pressTimer;
        var longPressTriggered = false;
        var isCancelled = false;

        var startPress = function(e) {
            if (e.type === 'mousedown' && e.button !== 0) return; // Left click only
            if (btn.dataset.disabled === 'true') return;
            longPressTriggered = false;
            isCancelled = false;
            pressTimer = setTimeout(function() {
                longPressTriggered = true;
                pressTimer = null;
                var rect = btn.getBoundingClientRect();
                show_scan_menu(rect);
            }, 800); // 800ms press for menu
        };

        var endPress = function(e) {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            if (!longPressTriggered && !isCancelled) {
                toggle_scanner();
            }
        };

        var cancelPress = function() {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            isCancelled = true;
        };

        btn.addEventListener('mousedown', startPress);
        btn.addEventListener('mouseup', endPress);
        btn.addEventListener('mouseleave', cancelPress);
        btn.addEventListener('touchstart', startPress, {passive: true});
        btn.addEventListener('touchend', function(e) {
            e.preventDefault(); 
            endPress(e);
        });
        btn.addEventListener('touchmove', cancelPress, {passive: true});
        btn.addEventListener('touchcancel', cancelPress, {passive: true});
        
        if (container) {
            var title = document.createElement('div');
            title.id = 'openwebrx-section-scanner';
            title.className = 'openwebrx-section-divider';
            title.innerHTML = '&blacktriangledown;&nbsp;Scanner';
            title.onclick = function() {
                if ($(section).is(':visible')) {
                    $(section).slideUp(200);
                    title.innerHTML = '&blacktriangle;&nbsp;Scanner';
                    localStorage.setItem('openwebrx-section-scanner', 'false');
                } else {
                    $(section).slideDown(200);
                    title.innerHTML = '&blacktriangledown;&nbsp;Scanner';
                    localStorage.setItem('openwebrx-section-scanner', 'true');
                }
            };

            var section = document.createElement('div');
            section.className = 'openwebrx-section';

            // Restore section state
            if (localStorage.getItem('openwebrx-section-scanner') === 'false') {
                section.style.display = 'none';
                title.innerHTML = '&blacktriangle;&nbsp;Scanner';
            }

            var btnSkip = document.createElement('button');
            btnSkip.id = 'openwebrx-btn-freq-skip';
            btnSkip.textContent = 'Skip';
            btnSkip.title = 'Skip current frequency';
            btnSkip.disabled = true;
            btnSkip.style.cssText = 'width: 50px; height: 34px; padding: 0; line-height: 34px; font-size: 13px; font-weight: 600; border: none; background: #444; color: #aaa; cursor: default; border-radius: 5px; opacity: 0.5; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;';
            btnSkip.onclick = function() {
                if (scanner_state.running) {
                    if (scanner_state.timer) clearTimeout(scanner_state.timer);
                    scanner_move_next(true);
                    scan_loop();
                }
            };

            var btnBlock = document.createElement('button');
            btnBlock.id = 'openwebrx-btn-freq-block';
            btnBlock.textContent = 'Block';
            btnBlock.title = 'Block current frequency';
            btnBlock.style.cssText = 'width: 50px; height: 34px; padding: 0; line-height: 34px; font-size: 13px; font-weight: 600; border: none; background: #444; color: white; cursor: pointer; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;';
            btnBlock.onclick = function() { add_to_blacklist(); };

            var btnList = document.createElement('button');
            btnList.id = 'openwebrx-btn-freq-list';
            btnList.innerHTML = 'List &blacktriangle;';
            btnList.title = 'Blacklist Menu';
            btnList.style.cssText = 'width: 50px; height: 34px; padding: 0; line-height: 34px; font-size: 13px; font-weight: 600; border: none; background: #444; color: white; cursor: pointer; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: all 0.3s ease;';
            btnList.onclick = function() { show_blacklist_menu(this.getBoundingClientRect()); };

            var line = document.createElement('div');
            line.className = 'openwebrx-panel-line';
            line.style.display = 'flex';
            line.style.justifyContent = 'center';
            line.style.gap = '5px';
            line.appendChild(btn);
            line.appendChild(btnSkip);
            line.appendChild(btnBlock);
            line.appendChild(btnList);
            section.appendChild(line);

            // Try to insert before "Settings" section
            var settingsDivider = document.getElementById('openwebrx-section-settings');

            if (settingsDivider && settingsDivider.parentNode === container) {
                container.insertBefore(title, settingsDivider);
                container.insertBefore(section, settingsDivider);
            } else {
                container.appendChild(title);
                container.appendChild(section);
            }
        } else {
            // Fallback if panel is not found
            btn.style.position = 'fixed';
            document.body.appendChild(btn);
        }
    }

    // Install hook for modulation changes to show/hide button
    attempt_hook_openwebrx();

    // Polling as fallback if hooks don't work
    setInterval(check_modulation_mode, 500);
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
            original_setFrequency.apply(this, arguments);
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
        if (btn) {
            btn.textContent = 'Scan';
            btn.style.background = '#FF3939';
            btn.style.border = '3px solid #FF3939';
            btn.style.color = 'white';
        }
    }
    update_scanner_visibility(last_known_mode);
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
        { text: (scanner_state.scan_mode === 'CARRIER' ? '● ' : '○ ') + 'Normal (Carrier) ' + (SCANNER_CONFIG.delay_time / 1000) + 's', action: function() { scanner_state.scan_mode = 'CARRIER'; } },
        { text: '\u00A0\u00A0└ ' + (curr === def ? '● ' : '○ ') + 'Delay: Standard (' + (def / 1000) + 's)', action: function() { SCANNER_CONFIG.delay_time = def; } },
        { text: '\u00A0\u00A0└ ' + ((curr === 5000 && curr !== def) ? '● ' : '○ ') + 'Delay: 5s', action: function() { SCANNER_CONFIG.delay_time = 5000; } },
        { text: '\u00A0\u00A0└ ' + ((curr === 10000 && curr !== def) ? '● ' : '○ ') + 'Delay: 10s', action: function() { SCANNER_CONFIG.delay_time = 10000; } },
        { text: (scanner_state.scan_mode === 'STOP' ? '● ' : '○ ') + 'Stop on Signal', action: function() { scanner_state.scan_mode = 'STOP'; } },
        { text: (scanner_state.scan_mode === 'SAMPLE_10S' ? '● ' : '○ ') + '10s Sample', action: function() { scanner_state.scan_mode = 'SAMPLE_10S'; } },
        { text: (scanner_state.ignore_non_voice ? '☑ ' : '☐ ') + 'Filter: Only Analog (Bookmarks)', action: function() { scanner_state.ignore_non_voice = !scanner_state.ignore_non_voice; } }
    ];

    show_floating_menu(rect, items);
}

function show_blacklist_menu(rect) {
    var items = [
        { text: 'Release Frequency', action: remove_from_blacklist },
        { text: 'Clear Blacklist (' + scanner_state.blacklist.length + ')', action: clear_blacklist, borderTop: true },
        { text: 'Export Blacklist', action: export_blacklist },
        { text: 'Import Blacklist', action: import_blacklist }
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

function add_to_blacklist() {
    var freq = (typeof UI !== 'undefined' && UI.getFrequency) ? UI.getFrequency() : scanner_state.current_freq;
    
    if (!is_blacklisted(freq)) {
        scanner_state.blacklist.push(freq);
        localStorage.setItem('freq_scanner_blacklist', JSON.stringify(scanner_state.blacklist));
        console.log('[FreqScanner] Frequency ignored:', freq);
        
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

function remove_from_blacklist() {
    var freq = (typeof UI !== 'undefined' && UI.getFrequency) ? UI.getFrequency() : scanner_state.current_freq;
    var tolerance = get_tolerance();
    
    var initial_len = scanner_state.blacklist.length;
    scanner_state.blacklist = scanner_state.blacklist.filter(function(bf) {
        return Math.abs(freq - bf) > tolerance;
    });
    
    if (scanner_state.blacklist.length < initial_len) {
        localStorage.setItem('freq_scanner_blacklist', JSON.stringify(scanner_state.blacklist));
        console.log('[FreqScanner] Frequency removed from blacklist:', freq);
        
        var btn = document.getElementById('openwebrx-btn-freq-block');
        if (!btn) btn = document.getElementById('openwebrx-btn-freq-scanner');
        if (btn) {
            var originalText = btn.textContent;
            var originalColor = btn.style.color;
            btn.textContent = 'REM';
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

function export_blacklist() {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scanner_state.blacklist));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "freq_scanner_blacklist.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function import_blacklist() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var content = JSON.parse(e.target.result);
                if (Array.isArray(content)) {
                    scanner_state.blacklist = content;
                    localStorage.setItem('freq_scanner_blacklist', JSON.stringify(scanner_state.blacklist));
                    console.log('[FreqScanner] Blacklist imported:', content.length, 'entries');
                    
                    var btn = document.getElementById('openwebrx-btn-freq-scanner');
                    if (btn) {
                        var originalText = btn.textContent;
                        btn.textContent = 'IMP';
                        setTimeout(function() { btn.textContent = originalText; }, 1000);
                    }
                }
            } catch (err) {
                console.error('[FreqScanner] Error during import:', err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
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
        return Math.abs(f - bf) <= tolerance;
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
            var voice_modes = ['am', 'fm', 'nfm', 'lsb', 'usb'];
            if (voice_modes.indexOf(mod) === -1) {
                return true; // No voice modulation -> Ignore
            }

            // 2. Heuristic: Check name for NFM/FM
            // If user saved "D-STAR Repeater" as NFM, but the name reveals it
            if (mod === 'nfm' || mod === 'fm') {
                var digital_keywords = ['dstar', 'd-star', 'dmr', 'ysf', 'c4fm', 'fusion', 'p25', 'nxdn', 'tetra', 'pocsag', 'm17'];
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