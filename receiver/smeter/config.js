/*
 * Configuration for the smeter plugin
 */

window.smeter_config_global = {
    calibration_offset_hf: -40,  // Calibration for HF (<30MHz) in dB
    calibration_offset_vhf: -10, // Calibration for VHF/UHF (>30MHz) in dB
    hide_original: true,        // Set to true to hide the original S-meter
    show_text: true             // Set to false to hide the text below the S-meter
};
