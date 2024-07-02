/*
 * Plugin: Make the 'Hold mouse wheel down to tune' option checked by default.
 * Allows you to zoom into the waterfall with the mouse scroll.
 *
 * By default, the state of this checkbox is stored in localStorage in your browser.
 * If you often delete your browser's cache and localStorage contents, this plugin might be useful.
 *
 * License: Apache License 2.0
 * Copyright (c) 2024 Dimitar Milkov, LZ2DMV
 */

Plugins.tune_checkbox.no_css = true;

$('#openwebrx-wheel-checkbox').prop('checked', true).change();
