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
    hide_original: false,      // Set to true to hide the original S-meter
    show_text: true,           // Set to false to hide the text below the S-meter
    ui: {},                    // Cache for DOM elements

    init: function() {
        // Load configuration dynamically
        this.loadConfig();

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

    createUI: function() {
        // Generate scale: Range -127dBm (S0) to -13dBm (S9+60) -> Span 114dB
        var scaleHtml = '';
        
        // S-levels 1 to 9 (White)
        for (var s = 1; s <= 9; s++) {
            var db = -127 + (s * 6);
            var pct = ((db + 127) / 114) * 100;
            // Label only for odd numbers (1, 3, 5, 7, 9)
            if (s % 2 !== 0) {
                scaleHtml += '<div style="position: absolute; left: ' + pct + '%; transform: translateX(-50%); color: #fff;">' + s + '</div>';
            }
            scaleHtml += '<div style="position: absolute; left: ' + pct + '%; bottom: -2px; width: 1px; height: 4px; background: #fff;"></div>';
        }

        // dB over S9: 10, 20, 30, 40, 50, 60 (Red)
        for (var over = 10; over <= 60; over += 10) {
            var db = -73 + over;
            var pct = ((db + 127) / 114) * 100;
            // Label only for 20, 40, 60
            if (over % 20 === 0) {
                scaleHtml += '<div style="position: absolute; left: ' + pct + '%; transform: translateX(-50%); color: #f44;">+' + over + '</div>';
            }
            scaleHtml += '<div style="position: absolute; left: ' + pct + '%; bottom: -2px; width: 1px; height: 4px; background: #f44;"></div>';
        }

        var s9Pos = ((-73 + 127) / 114) * 100;

        var html = `
            <div id="smeter-panel" style="margin-bottom: 10px; padding: 5px 15px; background: #000; border: 1px solid #444; border-radius: 4px; color: #fff; font-family: sans-serif;">
                <div style="position: relative; height: 14px; font-size: 10px; margin-bottom: 2px;">${scaleHtml}</div>
                <div style="background: #222; height: 8px; border: 1px solid #000; border-radius: 2px; overflow: hidden; position: relative;">
                    <div id="smeter-bar-white" style="position: absolute; left: 0; top: 0; height: 100%; background: #fff; width: 0%; transition: width 0.1s;"></div>
                    <div id="smeter-bar-red" style="position: absolute; left: ${s9Pos}%; top: 0; height: 100%; background: #f44; width: 0%; transition: width 0.1s;"></div>
                </div>
                <div id="smeter-text" style="font-size: 12px; margin-top: 2px; text-align: center;"></div>
            </div>
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
    },

    update: function() {
        // Enforce hiding or showing of original S-meter
        if (this.hide_original) {
            if ($('#smeter-hide-css').length === 0) {
                $('head').append('<style id="smeter-hide-css">#openwebrx-smeter, #openwebrx-smeter-db, #openwebrx-smeter-container { display: none !important; }</style>');
            }
        } else {
            if ($('#smeter-hide-css').length > 0) {
                $('#smeter-hide-css').remove();
                $('#openwebrx-smeter, #openwebrx-smeter-db, #openwebrx-smeter-container').css('display', '');
            }
        }

        var dbm = -999;

        // 1. Primary Source: Check global variable (OpenWebRX Standard/Plus)
        if (dbm <= -900) {
            if (typeof window.smeter_level !== 'undefined' && window.smeter_level > 0) {
                dbm = 10 * Math.log10(window.smeter_level); // OpenWebRX Standard (Linear)
            }
            else if (typeof window.openwebrx !== 'undefined' && window.openwebrx.state && typeof window.openwebrx.state.s_meter_level !== 'undefined') {
                dbm = window.openwebrx.state.s_meter_level;
            }
        }

        // Apply calibration (only if valid data is present)
        if (dbm > -900) {
            if (typeof window.center_freq !== 'undefined' && window.center_freq > 30000000) {
                dbm += this.calibration_offset_vhf;
            } else {
                dbm += this.calibration_offset_hf;
            }
        }

        this.render(dbm);
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
        if (typeof window.center_freq !== 'undefined' && window.center_freq > 30000000) {
            s9Ref = -93;
        }
        var s0Ref = s9Ref - 54; // S0 is 54dB below S9

        // Conversion from dBm to S-units
        // 1 S-unit = 6dB
        
        var sVal = Math.floor((dbm - s0Ref) / 6);
        if (sVal < 0) sVal = 0;
        var sText = "S" + sVal;
        
        if (sVal > 9) {
             var over = Math.round(dbm - s9Ref);
             sText = "S9" + (over > 0 ? "+" + over : "");
        }

        var widthPercent = 0;
        
        // Simple visualization logic
        var minDbm = s0Ref;
        var maxDbm = s9Ref + 60; // S9+60dB
        var s9Dbm = s9Ref;
        
        var range = maxDbm - minDbm;
        var current = dbm - minDbm;
        if (current < 0) current = 0;
        
        widthPercent = (current / range) * 100;
        if (widthPercent > 100) widthPercent = 100;

        // Split bar into white (up to S9) and red (above S9)
        var s9Percent = ((s9Dbm - minDbm) / range) * 100; // approx. 47.37%
        
        var whiteW = Math.min(widthPercent, s9Percent);
        var redW = (widthPercent > s9Percent) ? (widthPercent - s9Percent) : 0;

        this.ui.barWhite.css('width', whiteW + '%');
        this.ui.barRed.css('width', redW + '%');
        this.ui.text.text(sText + ' (' + dbm.toFixed(1) + ' dBm)');
    }
};
