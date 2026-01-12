/*
 * Plugin: smeter - Replaces the original S-meter with a new one.
 *
 *
 * License: MIT
 * Copyright (c) 2025 DL1HQH
 */

// Create namespace for the plugin to avoid conflicts
Plugins.smeter = {
    no_css: true,  // do not load CSS for this plugin
    calibration_offset_hf: 0,  // Calibration for HF (<30MHz) in dB
    calibration_offset_vhf: 0, // Calibration for VHF/UHF (>30MHz) in dB
    s0_offset_hf: 0,           // S0 offset for HF
    s0_offset_vhf: 0,          // S0 offset for VHF
    hide_original: false,      // Set to true to hide the original S-meter
    show_text: true,           // Set to false to hide the text below the S-meter
    use_iaru_vhf: true,        // Set to true to use IARU VHF standard (S9 = -93dBm)
    smeter_delay: 0,           // Delay in ms to sync with audio
    smoothed_dbm: -999,        // Internal state for smoothing
    ui: {},                    // Cache for DOM elements
    last_fg_color: null,       // Cache for theme color detection

    init: function() {
        // Load configuration dynamically
        // 1. Load global config (defaults)
        this.loadConfig();
        // 2. Load user settings from browser cache (overwrites global config)
        // This ensures that user settings are preferred over global defaults.
        this.loadSettings();

        this.createUI();

        // Starts the update loop (e.g. every 100ms)
        setInterval(this.update.bind(this), 100);

        return true; // Important: Return value for the plugin loader
    },

    loadConfig: function() {
        // Check for global configuration immediately (e.g. defined in init.js)
        if (typeof window.smeter_config_global !== 'undefined') {
            var config = window.smeter_config_global;
            for (var key in config) {
                this[key] = config[key];
            }
        }
    },

    loadSettings: function() {
        var stored = localStorage.getItem('smeter_settings');
        if (stored) {
            try {
                var s = JSON.parse(stored);
                if (typeof s.calibration_offset_hf !== 'undefined') this.calibration_offset_hf = s.calibration_offset_hf;
                if (typeof s.calibration_offset_vhf !== 'undefined') this.calibration_offset_vhf = s.calibration_offset_vhf;
                if (typeof s.s0_offset_hf !== 'undefined') this.s0_offset_hf = s.s0_offset_hf;
                if (typeof s.s0_offset_vhf !== 'undefined') this.s0_offset_vhf = s.s0_offset_vhf;
                if (typeof s.use_iaru_vhf !== 'undefined') this.use_iaru_vhf = s.use_iaru_vhf;
                if (typeof s.smeter_delay !== 'undefined') this.smeter_delay = s.smeter_delay;
            } catch(e) {
                console.error('[Smeter] Error loading settings', e);
            }
        }
    },

    saveSettings: function() {
        var settings = {
            calibration_offset_hf: this.calibration_offset_hf,
            calibration_offset_vhf: this.calibration_offset_vhf,
            s0_offset_hf: this.s0_offset_hf,
            s0_offset_vhf: this.s0_offset_vhf,
            use_iaru_vhf: this.use_iaru_vhf,
            smeter_delay: this.smeter_delay
        };
        localStorage.setItem('smeter_settings', JSON.stringify(settings));
    },

    exportSettings: function() {
        var settings = {
            calibration_offset_hf: this.calibration_offset_hf,
            calibration_offset_vhf: this.calibration_offset_vhf,
            s0_offset_hf: this.s0_offset_hf,
            s0_offset_vhf: this.s0_offset_vhf,
            use_iaru_vhf: this.use_iaru_vhf,
            smeter_delay: this.smeter_delay
        };
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings));
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "smeter_settings.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    importSettings: function() {
        var self = this;
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
                    if (!s || typeof s !== 'object') {
                        throw new Error("Invalid JSON format");
                    }
                    if (typeof s.calibration_offset_hf === 'number') self.calibration_offset_hf = s.calibration_offset_hf;
                    if (typeof s.calibration_offset_vhf === 'number') self.calibration_offset_vhf = s.calibration_offset_vhf;
                    if (typeof s.s0_offset_hf === 'number') self.s0_offset_hf = s.s0_offset_hf;
                    if (typeof s.s0_offset_vhf === 'number') self.s0_offset_vhf = s.s0_offset_vhf;
                    if (typeof s.use_iaru_vhf === 'boolean') self.use_iaru_vhf = s.use_iaru_vhf;
                    if (typeof s.smeter_delay === 'number') self.smeter_delay = s.smeter_delay;
                    
                    self.saveSettings();
                    
                    // Update UI if menu is open
                    $('#smeter-cal-hf').val(self.calibration_offset_hf);
                    $('#smeter-cal-hf-val').text((self.calibration_offset_hf > 0 ? '+' : '') + self.calibration_offset_hf + ' dB');
                    $('#smeter-cal-vhf').val(self.calibration_offset_vhf);
                    $('#smeter-cal-vhf-val').text((self.calibration_offset_vhf > 0 ? '+' : '') + self.calibration_offset_vhf + ' dB');
                    $('#smeter-s0-hf').val(self.s0_offset_hf);
                    $('#smeter-s0-hf-val').text((self.s0_offset_hf > 0 ? '+' : '') + self.s0_offset_hf + ' dB');
                    $('#smeter-s0-vhf').val(self.s0_offset_vhf);
                    $('#smeter-s0-vhf-val').text((self.s0_offset_vhf > 0 ? '+' : '') + self.s0_offset_vhf + ' dB');
                    $('#smeter-iaru-check').prop('checked', self.use_iaru_vhf);
                    $('#smeter-delay').val(self.smeter_delay);
                    $('#smeter-delay-val').text((self.smeter_delay > 0 ? '+' : '') + self.smeter_delay + ' ms');
                } catch(err) {
                    console.error('[Smeter] Import failed', err);
                    alert('Import failed: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    resetSettings: function() {
        // 1. Reset to hardcoded defaults
        this.calibration_offset_hf = 0;
        this.calibration_offset_vhf = 0;
        this.s0_offset_hf = 0;
        this.s0_offset_vhf = 0;
        this.use_iaru_vhf = true;
        this.smeter_delay = 0;

        // 2. Re-apply global config if present
        this.loadConfig();

        // 3. Clear local storage
        localStorage.removeItem('smeter_settings');

        // 4. Update UI
        $('#smeter-cal-hf').val(this.calibration_offset_hf).trigger('input');
        $('#smeter-cal-vhf').val(this.calibration_offset_vhf).trigger('input');
        $('#smeter-s0-hf').val(this.s0_offset_hf).trigger('input');
        $('#smeter-s0-vhf').val(this.s0_offset_vhf).trigger('input');
        $('#smeter-iaru-check').prop('checked', this.use_iaru_vhf);
        $('#smeter-delay').val(this.smeter_delay).trigger('input');
    },

    autoCalibrateS0: function(type) {
        // 1. Try to retrieve FFT data (Waterfall) - preferred method
        var data = null;
        if (typeof window.fft_data !== 'undefined') {
            data = window.fft_data;
        } else if (typeof window.wf_data !== 'undefined') {
            data = window.wf_data;
        } else if (typeof window.openwebrx !== 'undefined' && window.openwebrx.fft_data) {
            data = window.openwebrx.fft_data;
        }

        var min_dbm = 1000;
        var valid_found = false;

        if (data && data.length > 0) {
            // Ignore edges (5%) to avoid filter rolloff
            var startIdx = Math.floor(data.length * 0.05);
            var endIdx = Math.ceil(data.length * 0.95);
            
            for (var i = startIdx; i < endIdx; i++) {
                // Filter out -Infinity and extremely low noise floor artifacts
                if (data[i] > -200 && data[i] < min_dbm) {
                    min_dbm = data[i];
                    valid_found = true;
                }
            }
        }

        // 2. Fallback: Use current S-meter level if FFT is unavailable or invalid
        if (!valid_found) {
            var raw_dbm = -999;
            if (typeof window.openwebrx !== 'undefined' && window.openwebrx.state && typeof window.openwebrx.state.s_meter_level !== 'undefined') {
                raw_dbm = window.openwebrx.state.s_meter_level;
            } else if (typeof window.smeter_level !== 'undefined' && window.smeter_level > 0) {
                raw_dbm = 10 * Math.log10(window.smeter_level);
            }

            if (raw_dbm > -900) {
                min_dbm = raw_dbm;
                valid_found = true;
            }
        }
        
        if (!valid_found) {
            console.warn('[Smeter] Signal too low or invalid (all < -200dBm), aborting.');
            return;
        }

        if (type === 'hf') {
            // Target: Make current noise (min_dbm + cal) read as S2
            // S9 = -73dBm.
            // Formula derived: s0Ref = (9 * val - 2 * s9Ref) / 7
            // offset = s0Ref - (s9Ref - 54)
            
            var s9Ref = -73;
            var val = min_dbm + this.calibration_offset_hf;
            var targetS0Ref = (9 * val - 2 * s9Ref) / 7;
            var defaultS0Ref = s9Ref - 54;
            var offset = Math.round(targetS0Ref - defaultS0Ref);
            
            if (offset < -60) offset = -60;
            
            // Safety clamp: Ensure S0 remains at least 18dB below S9 (min 3 S-units dynamic range)
            // Otherwise the scale becomes too compressed or inverted.
            // Max offset = (s9Ref - 18) - (s9Ref - 54) = 36 dB
            if (offset > 36) {
                offset = 36;
                console.warn('[Smeter] Auto S0 clamped to +36dB to maintain minimum dynamic range.');
            }
            
            this.s0_offset_hf = offset;
            $('#smeter-s0-hf').val(offset).trigger('input');
        } else {
            var s9Ref = this.use_iaru_vhf ? -93 : -73;
            // Target: Make current noise (min_dbm + cal) read as S2
            // Formula derived: s0Ref = (9 * val - 2 * s9Ref) / 7
            var val = min_dbm + this.calibration_offset_vhf;
            var targetS0Ref = (9 * val - 2 * s9Ref) / 7;
            var defaultS0Ref = s9Ref - 54;
            var offset = Math.round(targetS0Ref - defaultS0Ref);
            
            if (offset < -60) offset = -60;
            
            // Safety clamp for VHF as well
            if (offset > 36) {
                offset = 36;
                console.warn('[Smeter] Auto S0 clamped to +36dB to maintain minimum dynamic range.');
            }
            
            this.s0_offset_vhf = offset;
            $('#smeter-s0-vhf').val(offset).trigger('input');
        }
        this.saveSettings();
    },

    createUI: function() {
        // Generate scale: Range -127dBm (S0) to -13dBm (S9+60) -> Span 114dB
        var scaleHtml = '';
        
        // S-levels 1 to 9 (White)
        for (var s = 1; s <= 9; s++) {
            var db = -127 + (s * 6);
            var pct = ((db + 127) / 114) * 100;
            // Label only for odd numbers (1, 3, 5, 7, 9)
            if (s % 2 !== 0) {
                scaleHtml += '<div class="smeter-tick-label" style="position: absolute; left: ' + pct + '%; transform: translateX(-50%); font-weight: bold;">' + s + '</div>';
            }
            scaleHtml += '<div class="smeter-tick-mark" style="position: absolute; left: ' + pct + '%; bottom: -2px; width: 1px; height: 4px;"></div>';
        }

        // dB over S9: 10, 20, 30, 40, 50, 60 (Red)
        for (var over = 10; over <= 60; over += 10) {
            var db = -73 + over;
            var pct = ((db + 127) / 114) * 100;
            // Label only for 20, 40, 60
            if (over % 20 === 0) {
                scaleHtml += '<div style="position: absolute; left: ' + pct + '%; transform: translateX(-50%); color: #f44; font-weight: bold;">+' + over + '</div>';
            }
            scaleHtml += '<div style="position: absolute; left: ' + pct + '%; bottom: -2px; width: 1px; height: 4px; background: #f44;"></div>';
        }

        var s9Pos = ((-73 + 127) / 114) * 100;

        var html = `
            <style id="smeter-theme-style"></style>
            <div id="smeter-panel" style="position: relative; margin-bottom: 8px; padding: 5px 15px 5px 15px; border: 1px solid transparent; border-radius: 4px; font-family: sans-serif; user-select: none; -webkit-user-select: none; cursor: pointer;" title="Long press for settings">
                <div style="position: relative; height: 14px; font-size: 10px; margin-bottom: 2px;">${scaleHtml}</div>
                <div id="smeter-bar-container" style="height: 8px; border: 1px solid rgba(0,0,0,0.5); border-radius: 2px; overflow: hidden; position: relative;">
                    <div id="smeter-bar-white" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%;"></div>
                    <div id="smeter-bar-red" style="position: absolute; left: ${s9Pos}%; top: 0; height: 100%; background: #f44; width: 0%;"></div>
                </div>
            </div>
            <div id="smeter-text" style="position: absolute; bottom: 4px; right: 4px; width: 65px; text-align: left; font-size: 12px; font-weight: bold; color: white; pointer-events: none; z-index: 99; white-space: nowrap;"></div>
        `;

        // Try to embed the panel into the receiver area (#openwebrx-panel-receiver)
        var target = $('#openwebrx-panel-receiver');
        if (target.length) {
            // ADJUST POSITION HERE:
            // target.append(html) -> Adds it at the BOTTOM of the panel
            // target.prepend(html) -> Adds it at the TOP of the panel
            target.append(html); // append adds it at the end (bottom)
        }

        // Cache UI elements to avoid repeated DOM queries in the update loop
        this.ui.barWhite = $('#smeter-bar-white');
        this.ui.barRed = $('#smeter-bar-red');
        this.ui.text = $('#smeter-text');

        // Apply text visibility setting once
        if (!this.show_text) {
            this.ui.text.hide();
        }

        // Event listeners
        var self = this;
        var pressTimer;
        var startX = 0, startY = 0;

        // Long press to open settings
        $('#smeter-panel').on('mousedown touchstart', function(e) {
            if (e.type === 'mousedown' && e.button !== 0) return;
            
            if (e.type === 'touchstart' && e.originalEvent.touches.length > 0) {
                startX = e.originalEvent.touches[0].clientX;
                startY = e.originalEvent.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            var el = this;
            pressTimer = setTimeout(function() {
                var rect = el.getBoundingClientRect();
                self.show_settings_menu(rect);
            }, 800);
        }).on('mouseup touchend mouseleave touchcancel', function() {
            clearTimeout(pressTimer);
        }).on('touchmove', function(e) {
            if (e.originalEvent.touches.length > 0) {
                var x = e.originalEvent.touches[0].clientX;
                var y = e.originalEvent.touches[0].clientY;
                if (Math.abs(x - startX) > 10 || Math.abs(y - startY) > 10) {
                    clearTimeout(pressTimer);
                }
            }
        }).on('contextmenu', function() { return false; });
    },

    updateTheme: function() {
        var $parent = $('#openwebrx-panel-receiver');
        var fgColor = $parent.css('color') || '#fff';

        if (this.last_fg_color === fgColor) return;
        this.last_fg_color = fgColor;

        // Detect light/dark theme based on text brightness
        var rgb = fgColor.match(/\d+/g);
        var isDarkTheme = true;
        if (rgb && rgb.length === 3) {
            var brightness = (parseInt(rgb[0])*299 + parseInt(rgb[1])*587 + parseInt(rgb[2])*114) / 1000;
            if (brightness < 128) isDarkTheme = false;
        }

        var panelBg = isDarkTheme ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
        var barContainerBg = isDarkTheme ? '#222' : '#ddd';

        var css = '#smeter-panel { color: ' + fgColor + '; background: ' + panelBg + '; border-color: ' + fgColor + '; }' +
                  '.smeter-tick-label { color: ' + fgColor + '; }' +
                  '.smeter-tick-mark { background-color: ' + fgColor + '; }' +
                  '#smeter-bar-container { background: ' + barContainerBg + '; border-color: ' + fgColor + '; }' +
                  '#smeter-bar-white { background-color: ' + fgColor + '; }';

        $('#smeter-theme-style').text(css);
    },

    show_settings_menu: function(rect) {
        $('#smeter-floating-menu').remove();
        var self = this;

        var menu = document.createElement('div');
        menu.id = 'smeter-floating-menu';
        
        var right = window.innerWidth - rect.right;
        if (right < 5) right = 5;
        
        // Smart positioning: Open upwards if space permits, otherwise downwards
        var posStyle = '';
        if (rect.top > 300) {
             var bottom = window.innerHeight - rect.top + 2;
             posStyle = 'bottom: ' + bottom + 'px;';
        } else {
             var top = rect.bottom + 2;
             posStyle = 'top: ' + top + 'px;';
        }
        
        menu.style.cssText = 'position: fixed; right: ' + right + 'px; ' + posStyle + ' background: #222; border: 1px solid #444; color: #eee; z-index: 10001; border-radius: 4px; padding: 0; font-family: sans-serif; font-size: 13px; box-shadow: 0 2px 10px rgba(0,0,0,0.5); min-width: 220px;';

        var content = document.createElement('div');
        content.style.padding = '10px';
        
        var title = document.createElement('div');
        title.textContent = 'S-Meter Settings';
        title.style.cssText = 'font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 5px;';
        content.appendChild(title);

        var isVHF = false;
        if (typeof window.center_freq !== 'undefined' && window.center_freq > 30000000) {
            isVHF = true;
        }

        var createSlider = function(label, id, val, min, max, unit, disabled) {
            unit = unit || 'dB';
            var div = document.createElement('div');
            div.style.marginBottom = '10px';
            if (disabled) {
                div.style.opacity = '0.4';
                div.style.pointerEvents = 'none';
            }
            var header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 12px;';
            header.innerHTML = '<span>' + label + '</span><span id="' + id + '-val">' + (val > 0 ? '+' : '') + val + ' ' + unit + '</span>';
            div.appendChild(header);
            var input = document.createElement('input');
            input.type = 'range';
            input.id = id;
            input.min = min;
            input.max = max;
            input.value = val;
            input.style.width = '100%';
            if (disabled) input.disabled = true;
            div.appendChild(input);
            return div;
        };

        content.appendChild(createSlider('HF Calibration (S9)', 'smeter-cal-hf', this.calibration_offset_hf, -60, 60, 'dB', isVHF));
        content.appendChild(createSlider('HF S0 Level', 'smeter-s0-hf', this.s0_offset_hf, -60, 60, 'dB', isVHF));
        content.appendChild(createSlider('VHF Calibration (S9)', 'smeter-cal-vhf', this.calibration_offset_vhf, -60, 60, 'dB', !isVHF));
        content.appendChild(createSlider('VHF S0 Level', 'smeter-s0-vhf', this.s0_offset_vhf, -60, 60, 'dB', !isVHF));

        var autoDiv = document.createElement('div');
        autoDiv.style.cssText = 'margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;';
        
        var autoLabel = document.createElement('span');
        autoLabel.textContent = 'Auto S0:';
        autoDiv.appendChild(autoLabel);

        var btnGroup = document.createElement('div');
        ['HF', 'VHF'].forEach(function(type) {
            var btn = document.createElement('button');
            btn.textContent = type;
            btn.style.cssText = 'padding: 2px 8px; margin-left: 5px; background: #444; color: #eee; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;';
            
            var disabled = (type === 'HF' && isVHF) || (type === 'VHF' && !isVHF);
            if (disabled) {
                btn.disabled = true;
                btn.style.opacity = '0.4';
                btn.style.cursor = 'default';
            }
            
            btn.onclick = function() { 
                var originalText = this.textContent;
                this.textContent = '...';
                self.autoCalibrateS0(type.toLowerCase()); 
                var b = this;
                setTimeout(function() { b.textContent = originalText; }, 500);
            };
            btnGroup.appendChild(btn);
        });
        autoDiv.appendChild(btnGroup);
        content.appendChild(autoDiv);

        var checkDiv = document.createElement('div');
        checkDiv.style.marginBottom = '5px';
        if (!isVHF) {
            checkDiv.style.opacity = '0.4';
            checkDiv.style.pointerEvents = 'none';
        }
        var label = document.createElement('label');
        label.style.cssText = 'cursor: pointer; display: flex; align-items: center;';
        var check = document.createElement('input');
        check.type = 'checkbox';
        check.id = 'smeter-iaru-check';
        check.checked = this.use_iaru_vhf;
        if (!isVHF) check.disabled = true;
        check.style.marginRight = '5px';
        label.appendChild(check);
        label.appendChild(document.createTextNode('IARU VHF Standard'));
        checkDiv.appendChild(label);
        content.appendChild(checkDiv);

        // Yellow slider for Time Sync at the bottom
        var delaySlider = createSlider('Sync Delay (+/-)', 'smeter-delay', this.smeter_delay, -500, 2000, 'ms');
        delaySlider.style.color = '#ffeb3b';
        var dsInput = delaySlider.querySelector('input');
        dsInput.style.accentColor = '#ffeb3b';
        dsInput.style.filter = 'sepia(1) saturate(5) hue-rotate(5deg)';
        content.appendChild(delaySlider);

        var btnDiv = document.createElement('div');
        btnDiv.style.cssText = 'margin-top: 10px; border-top: 1px solid #444; padding-top: 5px; display: flex; justify-content: space-between;';
        
        var btnExport = document.createElement('button');
        btnExport.textContent = 'Export';
        btnExport.style.cssText = 'padding: 3px 8px; background: #444; color: #eee; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;';
        btnExport.onclick = function() { self.exportSettings(); };
        
        var btnImport = document.createElement('button');
        btnImport.textContent = 'Import';
        btnImport.style.cssText = 'padding: 3px 8px; background: #444; color: #eee; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;';
        btnImport.onclick = function() { self.importSettings(); };

        var btnDefault = document.createElement('button');
        btnDefault.textContent = 'Default';
        btnDefault.style.cssText = 'padding: 3px 8px; background: #d32f2f; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;';
        
        var resetTimer = null;
        btnDefault.onclick = function() { 
            if (this.textContent === 'Confirm?') {
                self.resetSettings();
                this.textContent = 'Default';
                if (resetTimer) clearTimeout(resetTimer);
            } else {
                var btn = this;
                btn.textContent = 'Confirm?';
                resetTimer = setTimeout(function() { btn.textContent = 'Default'; }, 3000);
            }
        };

        btnDiv.appendChild(btnExport);
        btnDiv.appendChild(btnImport);
        btnDiv.appendChild(btnDefault);
        content.appendChild(btnDiv);

        menu.appendChild(content);
        document.body.appendChild(menu);

        $('#smeter-delay').on('input', function() {
            self.smeter_delay = parseInt($(this).val());
            $('#smeter-delay-val').text((self.smeter_delay > 0 ? '+' : '') + self.smeter_delay + ' ms');
        }).on('change', function() {
            self.saveSettings();
        });
        $('#smeter-cal-hf').on('input', function() {
            self.calibration_offset_hf = parseInt($(this).val());
            $('#smeter-cal-hf-val').text((self.calibration_offset_hf > 0 ? '+' : '') + self.calibration_offset_hf + ' dB');
        }).on('change', function() {
            self.saveSettings();
        });
        $('#smeter-cal-vhf').on('input', function() {
            self.calibration_offset_vhf = parseInt($(this).val());
            $('#smeter-cal-vhf-val').text((self.calibration_offset_vhf > 0 ? '+' : '') + self.calibration_offset_vhf + ' dB');
        }).on('change', function() {
            self.saveSettings();
        });
        $('#smeter-s0-hf').on('input', function() {
            self.s0_offset_hf = parseInt($(this).val());
            $('#smeter-s0-hf-val').text((self.s0_offset_hf > 0 ? '+' : '') + self.s0_offset_hf + ' dB');
        }).on('change', function() {
            self.saveSettings();
        });
        $('#smeter-s0-vhf').on('input', function() {
            self.s0_offset_vhf = parseInt($(this).val());
            $('#smeter-s0-vhf-val').text((self.s0_offset_vhf > 0 ? '+' : '') + self.s0_offset_vhf + ' dB');
        }).on('change', function() {
            self.saveSettings();
        });
        $('#smeter-iaru-check').on('change', function() {
            self.use_iaru_vhf = $(this).is(':checked');
            self.saveSettings();
        });

        var closeHandler = function(e) {
            if (!menu.contains(e.target) && !$(e.target).closest('#smeter-panel').length) {
                menu.remove();
                document.removeEventListener('mousedown', closeHandler);
                document.removeEventListener('touchstart', closeHandler);
            }
        };
        setTimeout(function() {
            document.addEventListener('mousedown', closeHandler);
            document.addEventListener('touchstart', closeHandler);
        }, 10);
    },

    update: function() {
        this.updateTheme();

        // Enforce hiding or showing of original S-meter
        if (this.hide_original) {
            if ($('#smeter-hide-css').length === 0) {
                $('head').append('<style id="smeter-hide-css">#openwebrx-smeter, #openwebrx-smeter-db, #openwebrx-smeter-container { display: none !important; } #openwebrx-clock-utc { position: absolute !important; bottom: 4px !important; left: 4px !important; right: auto !important; top: auto !important; z-index: 99; font-size: 12px !important; pointer-events: none; color: white !important; font-weight: bold !important; }</style>');
            }
        } else {
            if ($('#smeter-hide-css').length > 0) {
                $('#smeter-hide-css').remove();
                $('#openwebrx-smeter, #openwebrx-smeter-db, #openwebrx-smeter-container, #openwebrx-clock-utc').css('display', '');
            }
        }

        var dbm = -999;

        // 1. Primary Source: Check global variable (OpenWebRX Standard/Plus)
        if (dbm <= -900) {
            if (typeof window.openwebrx !== 'undefined' && window.openwebrx.state && typeof window.openwebrx.state.s_meter_level !== 'undefined') {
                dbm = window.openwebrx.state.s_meter_level;
            }
            else if (typeof window.smeter_level !== 'undefined' && window.smeter_level > 0) {
                dbm = 10 * Math.log10(window.smeter_level); // OpenWebRX Standard (Linear)
            }
        }

        // Buffering for Delay
        if (!this.smeter_buffer) this.smeter_buffer = [];
        var now = Date.now();
        this.smeter_buffer.push({t: now, v: dbm});
        
        // Keep buffer clean (max 5 seconds)
        while(this.smeter_buffer.length > 0 && this.smeter_buffer[0].t < now - 5000) {
            this.smeter_buffer.shift();
        }

        // Apply Delay if set
        if (this.smeter_delay > 0) {
            var target = now - this.smeter_delay;
            for (var i = this.smeter_buffer.length - 1; i >= 0; i--) {
                if (this.smeter_buffer[i].t <= target) {
                    dbm = this.smeter_buffer[i].v;
                    break;
                }
            }
        }

        // Apply calibration (only if valid data is present)
        if (dbm > -900) {
            if (typeof window.center_freq !== 'undefined' && window.center_freq > 30000000) {
                dbm += this.calibration_offset_vhf;
            } else {
                dbm += this.calibration_offset_hf;
            }

            // Smoothing (Exponential Moving Average)
            if (this.smoothed_dbm < -900) {
                this.smoothed_dbm = dbm;
            } else {
                // Weight 0.5 for new value for "slightly smoother" feel
                this.smoothed_dbm = (this.smoothed_dbm * 0.5) + (dbm * 0.5);
            }
        } else {
            this.smoothed_dbm = dbm;
        }

        this.render(this.smoothed_dbm);
    },

    render: function(dbm) {
        // If we still have the start value, show "WAIT"
        if (dbm <= -900) {
            this.ui.text.text("WAIT...");
            this.ui.barWhite.css('width', '0%');
            this.ui.barRed.css('width', '0%');
            return;
        }

        // Determine S9 reference based on frequency
        // HF (<30MHz): S9 = -73dBm, VHF/UHF (>30MHz): S9 = -93dBm
        var s9Ref = -73;
        if (this.use_iaru_vhf && typeof window.center_freq !== 'undefined' && window.center_freq > 30000000) {
            s9Ref = -93;
        }
        
        // Calculate S0 reference (Start of scale)
        // Standard is 54dB dynamic range (6dB per S-unit)
        var s0Ref = s9Ref - 54;
        
        // Apply user offset to S0 (shifting the start point)
        if (typeof window.center_freq !== 'undefined' && window.center_freq > 30000000) {
            s0Ref += this.s0_offset_vhf;
        } else {
            s0Ref += this.s0_offset_hf;
        }
        
        // Safety: Ensure S0 is below S9 (min 9dB range)
        if (s0Ref >= s9Ref - 9) s0Ref = s9Ref - 9;

        var sRange = s9Ref - s0Ref;
        var sStep = sRange / 9;

        var sVal = 0;
        var sText = "";
        
        if (dbm < s9Ref) {
             sVal = Math.floor((dbm - s0Ref) / sStep);
             if (sVal < 0) sVal = 0;
             sText = "S" + sVal;
        } else {
             var over = Math.round(dbm - s9Ref);
             sText = "S9" + (over > 0 ? "+" + over + "dB" : "");
        }

        // Calculate Bar Width
        // Visual constants from createUI (Standard HF layout for the background ticks)
        // -127 (S0) to -13 (S9+60). S9 is -73.
        var visS0 = -127;
        var visS9 = -73;
        var visMax = -13;
        var visTotal = visMax - visS0; // 114
        
        var s9Pos = ((visS9 - visS0) / visTotal) * 100; // ~47.37%

        var widthPercent = 0;

        if (dbm < s9Ref) {
            // Map [s0Ref, s9Ref] to [0, s9Pos]
            var pct = (dbm - s0Ref) / (s9Ref - s0Ref);
            if (pct < 0) pct = 0;
            widthPercent = pct * s9Pos;
        } else {
            // Map [s9Ref, s9Ref+60] to [s9Pos, 100]
            var pct = (dbm - s9Ref) / 60;
            if (pct > 1) pct = 1;
            widthPercent = s9Pos + (pct * (100 - s9Pos));
        }

        // Split bar into white (up to S9) and red (above S9)
        var whiteW = widthPercent;
        var redW = (widthPercent > s9Pos) ? (widthPercent - s9Pos) : 0;

        this.ui.barWhite.css('width', whiteW + '%');
        this.ui.barRed.css('width', redW + '%');
        this.ui.text.text(sText);
    }
};
