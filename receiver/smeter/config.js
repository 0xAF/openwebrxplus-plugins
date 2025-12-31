/*
 * Configuration for the smeter plugin
 * Values can be adjusted here without modifying the main code.
 */

// Ensure the Plugins object exists
if (typeof Plugins === 'undefined') var Plugins = {};

Plugins.smeter_config = {
    calibration_offset_hf: 0,  // Calibration for HF (<30MHz) in dB
    calibration_offset_vhf: 0, // Calibration for VHF/UHF (>30MHz) in dB
    hide_original: false       // Set to true to hide the original S-meter
};
