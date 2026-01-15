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
    linearity_hf: 1.0,         // Linearity correction factor for HF
    linearity_vhf: 1.0,        // Linearity correction factor for VHF
    s0_offset_hf: 0,           // S0 offset for HF
    s0_offset_vhf: 0,          // S0 offset for VHF
    hide_original: false,      // Set to true to hide the original S-meter
    show_text: true,           // Set to false to hide the text below the S-meter
    show_dbm: false,           // Show dBm value next to bar
    use_iaru_vhf: true,        // Set to true to use IARU VHF standard (S9 = -93dBm)
    smeter_delay: 500,         // Delay in ms to sync with audio
    smoothed_dbm: -999,        // Internal state for smoothing
    ui: {},                    // Cache for DOM elements
    last_fg_color: null,       // Cache for theme color detection

    // Helper: Get current band context (HF vs VHF) and calculated reference levels
    getBandContext: function() {
        var isVHF = (typeof window.center_freq !== 'undefined' && window.center_freq > 30000000);
        var lin = isVHF ? this.linearity_vhf : this.linearity_hf;
        var cal = isVHF ? this.calibration_offset_vhf : this.calibration_offset_hf;
        var s0_off = isVHF ? this.s0_offset_vhf : this.s0_offset_hf;
        var s9Ref = (isVHF && this.use_iaru_vhf) ? -93 : -73;
        
        var s0Ref = s9Ref - 54 + s0_off;
        // Safety: Ensure S0 is below S9 (min 9dB range)
        if (s0Ref >= s9Ref - 9) s0Ref = s9Ref - 9;

        return { isVHF: isVHF, lin: lin, cal: cal, s0_off: s0_off, s9Ref: s9Ref, s0Ref: s0Ref };
    },

    // Helper: Read raw signal level from OpenWebRX
    getRawSignalLevel: function() {
        if (typeof window.openwebrx !== 'undefined' && window.openwebrx.state && typeof window.openwebrx.state.s_meter_level !== 'undefined') {
            return window.openwebrx.state.s_meter_level;
        } else if (typeof window.smeter_level !== 'undefined' && window.smeter_level > 0) {
            return 10 * Math.log10(window.smeter_level);
        }
        return -999;
    },

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
                if (typeof s.linearity_hf !== 'undefined') this.linearity_hf = s.linearity_hf;
                if (typeof s.linearity_vhf !== 'undefined') this.linearity_vhf = s.linearity_vhf;
                if (typeof s.s0_offset_hf !== 'undefined') this.s0_offset_hf = s.s0_offset_hf;
                if (typeof s.s0_offset_vhf !== 'undefined') this.s0_offset_vhf = s.s0_offset_vhf;
                if (typeof s.use_iaru_vhf !== 'undefined') this.use_iaru_vhf = s.use_iaru_vhf;
                if (typeof s.show_dbm !== 'undefined') this.show_dbm = s.show_dbm;
                if (typeof s.hide_original !== 'undefined') this.hide_original = s.hide_original;
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
            linearity_hf: this.linearity_hf,
            linearity_vhf: this.linearity_vhf,
            s0_offset_hf: this.s0_offset_hf,
            s0_offset_vhf: this.s0_offset_vhf,
            use_iaru_vhf: this.use_iaru_vhf,
            show_dbm: this.show_dbm,
            hide_original: this.hide_original,
            smeter_delay: this.smeter_delay
        };
        localStorage.setItem('smeter_settings', JSON.stringify(settings));
    },

    exportSettings: function() {
        var settings = {
            calibration_offset_hf: this.calibration_offset_hf,
            calibration_offset_vhf: this.calibration_offset_vhf,
            linearity_hf: this.linearity_hf,
            linearity_vhf: this.linearity_vhf,
            s0_offset_hf: this.s0_offset_hf,
            s0_offset_vhf: this.s0_offset_vhf,
            use_iaru_vhf: this.use_iaru_vhf,
            show_dbm: this.show_dbm,
            hide_original: this.hide_original,
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
                    if (typeof s.linearity_hf === 'number') self.linearity_hf = s.linearity_hf;
                    if (typeof s.linearity_vhf === 'number') self.linearity_vhf = s.linearity_vhf;
                    if (typeof s.s0_offset_hf === 'number') self.s0_offset_hf = s.s0_offset_hf;
                    if (typeof s.s0_offset_vhf === 'number') self.s0_offset_vhf = s.s0_offset_vhf;
                    if (typeof s.use_iaru_vhf === 'boolean') self.use_iaru_vhf = s.use_iaru_vhf;
                    if (typeof s.show_dbm === 'boolean') self.show_dbm = s.show_dbm;
                    if (typeof s.hide_original === 'boolean') self.hide_original = s.hide_original;
                    if (typeof s.smeter_delay === 'number') self.smeter_delay = s.smeter_delay;
                    
                    self.saveSettings();
                    
                    // Update UI if menu is open
                    $('#smeter-cal-hf').val(self.calibration_offset_hf);
                    $('#smeter-cal-hf-val').text((self.calibration_offset_hf > 0 ? '+' : '') + self.calibration_offset_hf + ' dB');
                    $('#smeter-cal-vhf').val(self.calibration_offset_vhf);
                    $('#smeter-cal-vhf-val').text((self.calibration_offset_vhf > 0 ? '+' : '') + self.calibration_offset_vhf + ' dB');
                    var ctx = self.getBandContext();
                    $('#smeter-lin-val').text(ctx.lin.toFixed(4));
                    $('#smeter-s0-hf').val(self.s0_offset_hf);
                    $('#smeter-s0-hf-val').text((self.s0_offset_hf > 0 ? '+' : '') + self.s0_offset_hf + ' dB');
                    $('#smeter-s0-vhf').val(self.s0_offset_vhf);
                    $('#smeter-s0-vhf-val').text((self.s0_offset_vhf > 0 ? '+' : '') + self.s0_offset_vhf + ' dB');
                    $('#smeter-iaru-check').prop('checked', self.use_iaru_vhf);
                    $('#smeter-dbm-check').prop('checked', self.show_dbm);
                    $('#smeter-hide-check').prop('checked', self.hide_original);
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
        var ctx = this.getBandContext();
        var isVHF = ctx.isVHF;

        // Defaults
        var def_cal = 0;
        var def_lin = 1.0;
        var def_s0 = 0;

        // Check global config for overrides
        if (typeof window.smeter_config_global !== 'undefined') {
            var g = window.smeter_config_global;
            if (isVHF) {
                if (typeof g.calibration_offset_vhf !== 'undefined') def_cal = g.calibration_offset_vhf;
                if (typeof g.linearity_vhf !== 'undefined') def_lin = g.linearity_vhf;
                if (typeof g.s0_offset_vhf !== 'undefined') def_s0 = g.s0_offset_vhf;
            } else {
                if (typeof g.calibration_offset_hf !== 'undefined') def_cal = g.calibration_offset_hf;
                if (typeof g.linearity_hf !== 'undefined') def_lin = g.linearity_hf;
                if (typeof g.s0_offset_hf !== 'undefined') def_s0 = g.s0_offset_hf;
            }
        }

        // Apply defaults to current band
        if (isVHF) {
            this.calibration_offset_vhf = def_cal;
            this.linearity_vhf = def_lin;
            this.s0_offset_vhf = def_s0;
        } else {
            this.calibration_offset_hf = def_cal;
            this.linearity_hf = def_lin;
            this.s0_offset_hf = def_s0;
        }

        this.saveSettings();

        // Update UI
        var calSliderId = isVHF ? '#smeter-cal-vhf' : '#smeter-cal-hf';
        $(calSliderId).val(def_cal);
        $(calSliderId + '-val').text((def_cal > 0 ? '+' : '') + def_cal + ' dB');
        
        $('#smeter-lin-val').text(def_lin.toFixed(4));

        // Recalculate Green Sliders
        var p = this.getBandContext();
        var s0_in = Math.round((p.s0Ref - p.cal) / p.lin);
        var s9_in = Math.round((p.s9Ref - p.cal) / p.lin);
        var s9p60_in = Math.round(((p.s9Ref + 60) - p.cal) / p.lin);

        $('#smeter-s0-in').val(s0_in); $('#smeter-s0-in-val').text(s0_in + ' dBm');
        $('#smeter-s9-in').val(s9_in).attr('min', s0_in + 1); $('#smeter-s9-in-val').text(s9_in + ' dBm');
        $('#smeter-s9p60-in').val(s9p60_in).attr('min', s9_in + 1);
        $('#smeter-s9p60-in-val').text((s9p60_in > 0 ? '+' : '') + s9p60_in + ' dBm');

        if (this.refreshGraph) this.refreshGraph();
    },

    autoCalibrate: function(type, target) {
        var meas_dbm = 1000;
        var valid_found = false;

        // For S9 (Signal), prefer S-meter level (RMS) as we expect a carrier
        if (target === 's9') {
            meas_dbm = this.getRawSignalLevel();
            if (meas_dbm > -900) valid_found = true;
        }
        
        // For S0 (Noise), try to retrieve FFT data to find noise floor
        if (!valid_found) {
            var data = null;
            if (typeof window.fft_data !== 'undefined') data = window.fft_data;
            else if (typeof window.wf_data !== 'undefined') data = window.wf_data;
            else if (typeof window.openwebrx !== 'undefined') data = window.openwebrx.fft_data;

            if (data && data.length > 0) {
                var startIdx = Math.floor(data.length * 0.05);
                var endIdx = Math.ceil(data.length * 0.95);
                for (var i = startIdx; i < endIdx; i++) {
                    if (data[i] > -200 && data[i] < meas_dbm) {
                        meas_dbm = data[i];
                        valid_found = true;
                    }
                }
            }
            
            // Fallback to S-meter level if FFT failed
            if (!valid_found) {
                meas_dbm = this.getRawSignalLevel();
                if (meas_dbm > -900) valid_found = true;
            }
        }

        if (!valid_found || meas_dbm <= -200) {
            console.warn('[Smeter] Signal too low or invalid, aborting auto-cal.');
            return;
        }

        var ctx = this.getBandContext();
        // We assume the UI prevents clicking the wrong band button, so ctx corresponds to 'type'.
        var s9Ref = ctx.s9Ref;
        var lin = ctx.lin;
        var cal = ctx.cal;

        if (target === 's9') {
            // Calibrate S9: Pivot around S0.
            // We set the S9 Input Level to the measured value, keeping S0 Input Level fixed.
            // This adjusts Linearity and Calibration Offset internally.
            
            // Safety: Ensure measured S9 is above S0 (min 6dB distance)
            var s0_in = parseInt($('#smeter-s0-in').val());
            if (!isNaN(s0_in) && meas_dbm <= s0_in + 6) {
                console.warn('[Smeter] Signal too close to S0, aborting S9 auto-cal.');
                return;
            }
            
            // Update Green S9 Slider (triggers pivot logic in createUI)
            $('#smeter-s9-in').val(Math.round(meas_dbm)).trigger('input');
            
        } else {
            // Calibrate S0: Adjust S0 Offset so noise reads as S2
            var val = (meas_dbm * lin) + cal;
            var targetS0Ref = (9 * val - 2 * s9Ref) / 7;
            var defaultS0Ref = s9Ref - 54;
            var offset = Math.round(targetS0Ref - defaultS0Ref);
            
            if (offset < -90) offset = -90;
            if (offset > 36) {
                offset = 36;
                console.warn('[Smeter] Auto S0 clamped to +36dB to maintain minimum dynamic range.');
            }
            
            // Update S0 Input Slider (triggers updateParams)
            var newS0Ref = defaultS0Ref + offset;
            var newS0In = Math.round((newS0Ref - cal) / lin);
            $('#smeter-s0-in').val(newS0In).trigger('input');
        }
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
            <div id="smeter-panel" style="position: relative; margin-bottom: 8px; padding: 5px 15px 5px 15px; border: 1px solid transparent; border-radius: 4px; font-family: sans-serif; user-select: none; -webkit-user-select: none; cursor: pointer; display: flex; align-items: center;" title="Long press for settings">
                <div style="flex-grow: 1; position: relative;">
                    <div style="position: relative; height: 14px; font-size: 10px; margin-bottom: 2px;">${scaleHtml}</div>
                    <div id="smeter-bar-container" style="height: 8px; border: 1px solid rgba(0,0,0,0.5); border-radius: 2px; overflow: hidden; position: relative;">
                        <div id="smeter-bar-white" style="position: absolute; left: 0; top: 0; height: 100%; width: 0%;"></div>
                        <div id="smeter-bar-red" style="position: absolute; left: ${s9Pos}%; top: 0; height: 100%; background: #f44; width: 0%;"></div>
                    </div>
                </div>
                <div id="smeter-dbm-text" style="min-width: 45px; text-align: right; font-size: 11px; font-weight: bold; margin-left: 8px; display: none;"></div>
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
        this.ui.dbmText = $('#smeter-dbm-text');

        // Apply text visibility setting once
        if (!this.show_text) {
            this.ui.text.hide();
        }
        if (this.show_dbm) {
            this.ui.dbmText.show();
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

        var ctx = self.getBandContext();
        var isVHF = ctx.isVHF;

        // --- Live Graph ---
        var graphCanvas = document.createElement('canvas');
        graphCanvas.width = 220;
        graphCanvas.height = 150;
        graphCanvas.style.cssText = 'width: 100%; height: 150px; background: #222; border: 1px solid #444; border-bottom: none; display: block; box-sizing: border-box;';
        content.appendChild(graphCanvas);

        // Shared variables for graph state
        var s9Ref, stdS0, stdMax;
        var minDbIn = -220, maxDbIn = 100, rangeDbIn = 320;
        var paddingLeft = 30, graphW;
        var hoveredTooltip = null;
        var pointCoords = {};
        
        var dbToY = function(db) { return graphCanvas.height - ((db - minDbIn) / rangeDbIn) * graphCanvas.height; };
        var yToDb = function(y) { return minDbIn + ((graphCanvas.height - y) / graphCanvas.height) * rangeDbIn; };
        var stdToX = function(db) { return 0; }; // Placeholder, updated in updateGraph

        var updateGraph = function() {
            var ctx = graphCanvas.getContext('2d');
            var w = graphCanvas.width;
            var h = graphCanvas.height;
            ctx.clearRect(0, 0, w, h);
            
            var p = self.getBandContext();
            s9Ref = p.s9Ref;
            var s0Ref = p.s0Ref;
            
            // Fixed Scale for X-Axis (Standardized S-Meter)
            stdS0 = s9Ref - 54;
            stdMax = s9Ref + 60;
            
            // Update helpers
            graphW = w - paddingLeft;
            
            // Map standardized dB to X pixels
            stdToX = function(db) { return paddingLeft + ((db - (stdS0 - 5)) / (stdMax + 5 - (stdS0 - 5))) * graphW; };
            
            // Grid & Y-Axis Labels (Input dBm)
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.fillStyle = '#aaa';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            for (var d = minDbIn; d <= maxDbIn; d += 20) {
                var y = dbToY(d);
                ctx.moveTo(paddingLeft, y);
                ctx.lineTo(w, y);
                ctx.fillText(d, paddingLeft - 4, y);
            }
            ctx.stroke();
            
            // Horizontal Scale Line (S-Meter representation)
            var scaleY = h / 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.moveTo(paddingLeft, scaleY);
            ctx.lineTo(w, scaleY);
            ctx.stroke();
            
            // Ticks on Scale Line (S0-S9 and +dB)
            for (var i = 0; i <= 9; i++) { // S0-S9
                var db = stdS0 + i * 6;
                var x = stdToX(db);
                if (x >= paddingLeft && x <= w) { ctx.moveTo(x, scaleY - 2); ctx.lineTo(x, scaleY + 2); }
            }
            for (var i = 10; i <= 60; i += 10) { // +10 to +60
                var db = s9Ref + i;
                var x = stdToX(db);
                if (x >= paddingLeft && x <= w) { ctx.moveTo(x, scaleY - 2); ctx.lineTo(x, scaleY + 2); }
            }
            ctx.stroke();

            // S9 Line
            var xS9 = stdToX(s9Ref);
            ctx.strokeStyle = '#f44';
            ctx.beginPath(); ctx.moveTo(xS9, 0); ctx.lineTo(xS9, h); ctx.stroke();
            ctx.fillStyle = '#f44'; ctx.textAlign = 'left'; ctx.fillText('S9', xS9 + 2, 10);

            // S9+60 Line
            var xS9p60 = stdToX(s9Ref + 60);
            ctx.beginPath(); ctx.moveTo(xS9p60, 0); ctx.lineTo(xS9p60, h); ctx.stroke();
            ctx.textAlign = 'right'; ctx.fillText('+60', xS9p60 - 2, 10);

            // S0 Line
            var xS0 = stdToX(stdS0);
            ctx.strokeStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(xS0, 0); ctx.lineTo(xS0, h); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('S0', xS0 + 2, h - 10);

            // Curve
            ctx.strokeStyle = '#39FF14';
            ctx.lineWidth = 2;
            ctx.beginPath();
            var isDrawing = false;

            // Iterate over Input (Y-Axis) to calculate Output (X-Axis)
            for (var y = 0; y <= h; y+=2) {
                var inDb = minDbIn + (1 - y/h) * rangeDbIn;
                var calDb = (inDb * p.lin) + p.cal;
                
                // Map calibrated dB to Visual X (Standard Scale)
                var visualDb = calDb;
                
                if (calDb >= s9Ref) {
                    // 1:1 above S9 (Linear)
                } else {
                    // Map range [s0Ref, s9Ref] to [stdS0, s9Ref] for display
                    var ratio = (calDb - s0Ref) / (s9Ref - s0Ref);
                    visualDb = stdS0 + ratio * 54;
                }
                
                // Clip curve below S0 and above S9+60
                if (visualDb < stdS0 || visualDb > stdMax) {
                    isDrawing = false;
                    continue;
                }

                var x = stdToX(visualDb);
                
                if (!isDrawing) {
                    ctx.moveTo(x, y);
                    isDrawing = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            
            // Static Points (Visual feedback only)
            var s9_in_db = (s9Ref - p.cal) / p.lin;
            var s9p60_in_db = ((s9Ref + 60) - p.cal) / p.lin;
            var s0_in_db = (s0Ref - p.cal) / p.lin;
            
            
            var s9_y = dbToY(s9_in_db);
            var s0_y = dbToY(s0_in_db);
            var s9p60_y = dbToY(s9p60_in_db);

            // Draw small static dots
            ctx.fillStyle = '#f44';
            ctx.beginPath(); ctx.arc(xS9, s9_y, 3, 0, 2 * Math.PI); ctx.fill(); // S9
            var xS9p60 = stdToX(s9Ref + 60);
            ctx.beginPath(); ctx.arc(xS9p60, s9p60_y, 3, 0, 2 * Math.PI); ctx.fill(); // S9+60
            
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(xS0, s0_y, 3, 0, 2 * Math.PI); ctx.fill(); // S0

            // Axis Labels
            ctx.fillStyle = '#aaa';
            ctx.textAlign = 'right';
            ctx.fillText('dBm', paddingLeft - 2, 10);
        };
        setTimeout(updateGraph, 0);
        self.refreshGraph = updateGraph;

        // Cleanup listeners when menu is closed to avoid memory leaks
        menu.cleanup = function() {
            delete self.refreshGraph;
        };
        // -------------------------

        var createSlider = function(label, id, val, min, max, unit, disabled, step) {
            unit = unit || 'dB';
            step = step || 1;
            var div = document.createElement('div');
            div.style.marginBottom = '10px';
            if (disabled) {
                div.style.opacity = '0.4';
                div.style.pointerEvents = 'none';
            }
            var header = document.createElement('div');
            var sign = (val > 0 && unit !== 'x') ? '+' : '';
            header.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 12px;';
            header.innerHTML = '<span>' + label + '</span><span id="' + id + '-val">' + sign + val + ' ' + unit + '</span>';
            div.appendChild(header);
            var input = document.createElement('input');
            input.type = 'range';
            input.id = id;
            input.min = min;
            input.max = max;
            input.value = val;
            input.step = step;
            input.style.width = '100%';

            var updateTitle = function(v) { return (v > 0 && unit !== 'x' ? '+' : '') + v + ' ' + unit; };
            input.title = updateTitle(val);
            input.addEventListener('input', function() { 
                this.title = updateTitle(this.value);
                var valSpan = document.getElementById(id + '-val');
                if (valSpan) valSpan.textContent = updateTitle(this.value);
            });

            if (disabled) input.disabled = true;
            div.appendChild(input);
            return div;
        };

        // Add Sliders for Calibration Offset
        var calSlider1, calSlider2;
        if (isVHF) {
            calSlider1 = createSlider('Calibration Offset', 'smeter-cal-vhf', this.calibration_offset_vhf, -90, 90, 'dB');
            calSlider2 = createSlider('Calibration Offset (HF Inactive)', 'smeter-cal-hf', this.calibration_offset_hf, -90, 90, 'dB', true);
        } else {
            calSlider1 = createSlider('Calibration Offset', 'smeter-cal-hf', this.calibration_offset_hf, -90, 90, 'dB');
            calSlider2 = createSlider('Calibration Offset (VHF Inactive)', 'smeter-cal-vhf', this.calibration_offset_vhf, -90, 90, 'dB', true);
        }
        [calSlider1, calSlider2].forEach(function(s) {
            var input = s.querySelector('input');
            s.style.color = '#00BFFF'; // Bright Blue
            input.style.accentColor = '#00BFFF';
            input.style.filter = 'sepia(1) saturate(20) hue-rotate(190deg) brightness(1.2)';
        });
        content.appendChild(calSlider1);
        content.appendChild(calSlider2);
        var separator = document.createElement('hr');
        separator.style.cssText = 'border: none; border-top: 1px solid #444; margin: 15px 0;';
        content.appendChild(separator);

        // --- Helper to calculate current input levels ---
        var p = self.getBandContext();
        var s9_in = Math.round((p.s9Ref - p.cal) / p.lin);
        var s9p60_in = Math.round(((p.s9Ref + 60) - p.cal) / p.lin);
        var s0_in = Math.round((p.s0Ref - p.cal) / p.lin);

        // --- Create Sliders ---
        var s0Slider = createSlider('S0 Input Level', 'smeter-s0-in', s0_in, -160, -60, 'dBm');
        var s9Slider = createSlider('S9 Input Level', 'smeter-s9-in', s9_in, -120, -20, 'dBm');
        var s9p60Slider = createSlider('S9+60 Input Level', 'smeter-s9p60-in', s9p60_in, s9_in + 1, 100, 'dBm');

        [s0Slider, s9Slider, s9p60Slider].forEach(function(s) {
            var input = s.querySelector('input');
            s.style.color = '#39FF14'; // Green text
            input.style.accentColor = '#39FF14'; // Green track fill and thumb (modern browsers)
            // CSS filter to make thumb green in more browsers, similar to the yellow delay slider
            input.style.filter = 'sepia(1) saturate(20) hue-rotate(85deg) brightness(1.1)';
        });

        // Set initial dynamic constraints
        $(s9Slider).find('input').attr('min', s0_in + 1);

        content.appendChild(s0Slider);
        content.appendChild(s9Slider);
        content.appendChild(s9p60Slider);

        // Display calculated linearity
        var linDiv = document.createElement('div');
        linDiv.style.cssText = 'margin-bottom: 15px; font-size: 11px; color: #aaa; text-align: right; margin-top: -5px;';
        linDiv.innerHTML = 'Calculated Linearity: <span id="smeter-lin-val" style="color: #fff; font-weight: bold;">' + p.lin.toFixed(4) + '</span>';
        content.appendChild(linDiv);

        // --- Slider Event Handlers ---
        var updateParams = function(newLin, newCal, newS0Off) {
            var calChanged = newCal !== null;
            if (calChanged) {
                newCal = Math.round(newCal);
            }
            if (p.isVHF) {
                if (newLin !== null) self.linearity_vhf = newLin;
                if (calChanged) self.calibration_offset_vhf = newCal;
                if (newS0Off !== null) self.s0_offset_vhf = newS0Off;
            } else {
                if (newLin !== null) self.linearity_hf = newLin;
                if (calChanged) self.calibration_offset_hf = newCal;
                if (newS0Off !== null) self.s0_offset_hf = newS0Off;
            }
            p = self.getBandContext(); // Refresh local params
            $('#smeter-lin-val').text(p.lin.toFixed(4));

            // Update UI for calibration slider if it was changed indirectly
            if (calChanged) {
                var calSliderId = p.isVHF ? '#smeter-cal-vhf' : '#smeter-cal-hf';
                var calVal = p.isVHF ? self.calibration_offset_vhf : self.calibration_offset_hf;
                var slider = $(calSliderId);
                slider.val(calVal);
                $('#' + slider.attr('id') + '-val').text((calVal > 0 ? '+' : '') + calVal + ' dB');
                slider.attr('title', (calVal > 0 ? '+' : '') + calVal + ' dB');
            }

            updateGraph();
            self.saveSettings();
        };

        // Handler for the new blue calibration slider
        var activeCalSliderId = isVHF ? '#smeter-cal-vhf' : '#smeter-cal-hf';
        $(content).on('input', activeCalSliderId, function() {
            var newCal = parseInt($(this).val());
            
            // Update the model, save, and refresh graph
            updateParams(null, newCal, null);

            // Recalculate and update the green sliders' UI based on the new state
            var s0_in = Math.round((p.s0Ref - p.cal) / p.lin);
            var s9_in = Math.round((p.s9Ref - p.cal) / p.lin);
            var s9p60_in = Math.round(((p.s9Ref + 60) - p.cal) / p.lin);

            // Update UI for all green sliders
            $('#smeter-s0-in').val(s0_in); $('#smeter-s0-in-val').text(s0_in + ' dBm');
            $('#smeter-s9-in').val(s9_in).attr('min', s0_in + 1); $('#smeter-s9-in-val').text(s9_in + ' dBm');
            $('#smeter-s9p60-in').val(s9p60_in).attr('min', s9_in + 1);
            $('#smeter-s9p60-in-val').text((s9p60_in > 0 ? '+' : '') + s9p60_in + ' dBm');
        });

        $(content).on('input', '#smeter-s9-in', function() {
            var newS9In = parseInt($(this).val());
            // Pivot around S0: S0 input/output stays fixed
            var s0In = parseInt($('#smeter-s0-in').val());
            
            if (newS9In <= s0In) {
                newS9In = s0In + 1;
                $(this).val(newS9In);
                $('#smeter-s9-in-val').text(newS9In + ' dBm');
            }

            var diffIn = newS9In - s0In;
            if (diffIn < 1) diffIn = 1;
            
            var newLin = (p.s9Ref - p.s0Ref) / diffIn;
            var newCal = p.s0Ref - (s0In * newLin);
            
            updateParams(newLin, newCal, null);
            
            // Update dependent sliders
            var newS9p60In = Math.round(((p.s9Ref + 60) - newCal) / newLin);
            $('#smeter-s9p60-in').val(newS9p60In).attr('min', newS9In + 1);
            $('#smeter-s9p60-in-val').text((newS9p60In > 0 ? '+' : '') + newS9p60In + ' dBm');
        });

        $(content).on('input', '#smeter-s9p60-in', function() {
            var newS9p60In = parseInt($(this).val());
            var s0In = parseInt($('#smeter-s0-in').val());
            var diffIn = newS9p60In - s0In;
            if (diffIn < 1) diffIn = 1;
            
            var newLin = ((p.s9Ref + 60) - p.s0Ref) / diffIn;
            var newCal = p.s0Ref - (s0In * newLin);
            
            updateParams(newLin, newCal, null);
            
            var newS9In = Math.round((p.s9Ref - newCal) / newLin);
            $('#smeter-s9-in').val(newS9In);
            $('#smeter-s9-in-val').text(newS9In + ' dBm');
        });

        $(content).on('input', '#smeter-s0-in', function() {
            var newS0In = parseInt($(this).val());
            // Changing S0 input changes the S0 offset (shifting the scale)
            var newS0Out = newS0In * p.lin + p.cal;
            var newOffset = Math.round(newS0Out - (p.s9Ref - 54));
            
            updateParams(null, null, newOffset);
        });

        var createAutoRow = function(label, target) {
            var div = document.createElement('div');
            div.style.cssText = 'margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;';
            var span = document.createElement('span');
            span.textContent = label;
            div.appendChild(span);
            
            var grp = document.createElement('div');
            ['HF', 'VHF'].forEach(function(type) {
                var btn = document.createElement('button');
                btn.textContent = type;
                var disabled = (type === 'HF' && isVHF) || (type === 'VHF' && !isVHF);
                var bgColor = disabled ? '#444' : '#00BFFF';
                var textColor = disabled ? '#eee' : '#000';
                btn.style.cssText = 'padding: 2px 8px; margin-left: 5px; background: ' + bgColor + '; color: ' + textColor + '; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;';
                if (disabled) { btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'default'; }
                
                var tip = "";
                if (target === 's0') {
                    tip = "Auto-calibrate S0: Sets current noise floor to S2.";
                } else {
                    var ref = -73;
                    if (type === 'VHF' && self.use_iaru_vhf) ref = -93;
                    tip = "Auto-calibrate S9: Requires a steady signal of " + ref + " dBm.";
                }
                btn.title = tip;

                btn.onclick = function() {
                    var originalText = this.textContent;
                    this.textContent = '...';
                    self.autoCalibrate(type.toLowerCase(), target);
                    var b = this;
                    setTimeout(function() { b.textContent = originalText; }, 500);
                };
                grp.appendChild(btn);
            });
            div.appendChild(grp);
            return div;
        };

        content.appendChild(createAutoRow('Auto S0 (Noise):', 's0'));
        content.appendChild(createAutoRow('Auto S9 (Signal):', 's9'));

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

        var dbmDiv = document.createElement('div');
        dbmDiv.style.cssText = 'margin-bottom: 5px; display: flex; align-items: center;';
        var dbmLabel = document.createElement('label');
        dbmLabel.style.cssText = 'cursor: pointer; display: flex; align-items: center; margin-right: 15px;';
        dbmLabel.title = 'Displays the numeric signal level in dBm next to the S-meter bar.';
        var dbmCheck = document.createElement('input');
        dbmCheck.type = 'checkbox';
        dbmCheck.id = 'smeter-dbm-check';
        dbmCheck.checked = this.show_dbm;
        dbmCheck.style.marginRight = '5px';
        dbmLabel.appendChild(dbmCheck);
        dbmLabel.appendChild(document.createTextNode('Show dBm'));
        dbmDiv.appendChild(dbmLabel);

        var hideLabel = document.createElement('label');
        hideLabel.style.cssText = 'cursor: pointer; display: flex; align-items: center;';
        hideLabel.title = 'Hides the default OpenWebRX+ S-meter to save screen space.';
        var hideCheck = document.createElement('input');
        hideCheck.type = 'checkbox';
        hideCheck.id = 'smeter-hide-check';
        hideCheck.checked = this.hide_original;
        hideCheck.style.marginRight = '5px';
        hideLabel.appendChild(hideCheck);
        hideLabel.appendChild(document.createTextNode('Hide Original'));
        dbmDiv.appendChild(hideLabel);

        content.appendChild(dbmDiv);

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

        var btnCopy = document.createElement('button');
        btnCopy.textContent = 'Copy Config';
        btnCopy.style.cssText = 'padding: 3px 8px; background: #444; color: #eee; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;';
        btnCopy.onclick = function() {
            var cfg = "// Paste this into your init.js before Plugins.load('smeter')\n" +
                      "window.smeter_config_global = {\n" +
                      "    calibration_offset_hf: " + self.calibration_offset_hf + ",  // Calibration for HF (<30MHz) in dB\n" +
                      "    calibration_offset_vhf: " + self.calibration_offset_vhf + ", // Calibration for VHF/UHF (>30MHz) in dB\n" +
                      "    linearity_hf: " + self.linearity_hf + ",         // Linearity correction factor for HF\n" +
                      "    linearity_vhf: " + self.linearity_vhf + ",        // Linearity correction factor for VHF\n" +
                      "    s0_offset_hf: " + self.s0_offset_hf + ",           // S0 offset for HF\n" +
                      "    s0_offset_vhf: " + self.s0_offset_vhf + ",          // S0 offset for VHF\n" +
                      "    hide_original: " + self.hide_original + ",      // Set to true to hide the original S-meter\n" +
                      "    show_text: " + self.show_text + ",           // Set to false to hide the text below the S-meter\n" +
                      "    show_dbm: " + self.show_dbm + ",           // Show dBm value next to bar\n" +
                      "    use_iaru_vhf: " + self.use_iaru_vhf + ",        // Set to true to use IARU VHF standard (S9 = -93dBm)\n" +
                      "    smeter_delay: " + self.smeter_delay + "          // Delay in ms to sync with audio\n" +
                      "};";
            
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 10002; display: flex; justify-content: center; align-items: center;';
            
            var box = document.createElement('div');
            box.style.cssText = 'background: #222; border: 1px solid #444; padding: 15px; border-radius: 5px; width: 400px; max-width: 90%; color: #eee; font-family: sans-serif; box-shadow: 0 5px 15px rgba(0,0,0,0.5);';
            
            var title = document.createElement('div');
            title.textContent = 'Configuration for init.js';
            title.style.fontWeight = 'bold';
            title.style.marginBottom = '10px';
            title.style.borderBottom = '1px solid #444';
            title.style.paddingBottom = '5px';
            box.appendChild(title);
            
            var ta = document.createElement('textarea');
            ta.value = cfg;
            ta.style.cssText = 'width: 100%; height: 200px; background: #111; color: #0f0; border: 1px solid #444; font-family: monospace; font-size: 11px; padding: 5px; box-sizing: border-box; resize: none;';
            ta.readOnly = true;
            ta.onclick = function() { this.select(); };
            box.appendChild(ta);
            
            var closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = 'margin-top: 10px; padding: 5px 15px; background: #444; color: #eee; border: none; border-radius: 3px; cursor: pointer; float: right;';
            closeBtn.onclick = function() { overlay.remove(); };
            box.appendChild(closeBtn);
            
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            ta.select();
        };

        var defaultText = 'Default (' + (isVHF ? 'VHF' : 'HF') + ')';
        var btnDefault = document.createElement('button');
        btnDefault.textContent = defaultText;
        btnDefault.style.cssText = 'padding: 3px 8px; background: #d32f2f; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;';
        
        var resetTimer = null;
        btnDefault.onclick = function() { 
            if (this.textContent === 'Confirm?') {
                self.resetSettings();
                this.textContent = defaultText;
                if (resetTimer) clearTimeout(resetTimer);
            } else {
                var btn = this;
                btn.textContent = 'Confirm?';
                resetTimer = setTimeout(function() { btn.textContent = defaultText; }, 3000);
            }
        };

        btnDiv.appendChild(btnExport);
        btnDiv.appendChild(btnImport);
        btnDiv.appendChild(btnCopy);
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
        $('#smeter-iaru-check').on('change', function() {
            self.use_iaru_vhf = $(this).is(':checked');
            updateGraph();
            self.saveSettings();
        });
        $('#smeter-dbm-check').on('change', function() {
            self.show_dbm = $(this).is(':checked');
            if (self.show_dbm) self.ui.dbmText.show(); else self.ui.dbmText.hide();
            self.saveSettings();
        });
        $('#smeter-hide-check').on('change', function() {
            self.hide_original = $(this).is(':checked');
            self.saveSettings();
        });

        var closeHandler = function(e) {
            if (!menu.contains(e.target) && !$(e.target).closest('#smeter-panel').length) {
                if (menu.cleanup) menu.cleanup();
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
        if (document.hidden) return;

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

        var dbm = this.getRawSignalLevel();

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
            var ctx = this.getBandContext();
            dbm = (dbm * ctx.lin) + ctx.cal;
            
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
            if (this.show_dbm) this.ui.dbmText.text("");
            return;
        }

        var ctx = this.getBandContext();
        var s9Ref = ctx.s9Ref;
        var s0Ref = ctx.s0Ref;

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
        
        if (this.show_dbm) {
            this.ui.dbmText.text(dbm.toFixed(1) + ' dBm');
        }
    }
};
