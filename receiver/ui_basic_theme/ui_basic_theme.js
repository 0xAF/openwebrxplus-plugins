/*
 * Plugin: ui_basic_theme - Dark theme matching uikit's original built-in colors
 *
 * License: MIT
 * Copyright (c) 2024 Stanislav Lechev [0xAF], LZ2SLL
 */

Plugins.ui_basic_theme = Plugins.ui_basic_theme || {};
Plugins.ui_basic_theme._version = 0.1;

Plugins.ui_basic_theme.init = function () {
	$('#openwebrx-themes-listbox').append(
		$('<option>').val('ui-basic').text('UI Basic')
	);

	return true;
};
