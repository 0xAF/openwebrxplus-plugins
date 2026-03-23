/*
 * example plugin, creating a new theme for OpenWebRx+
 *
 * License: MIT
 * Copyright (c) 2023 Stanislav Lechev [0xAF], LZ2SLL
 */

Plugins.example_theme.init = function () {
  // Add new entry in the Theme selectbox
  $('#openwebrx-themes-listbox').append(
    $('<option>').val(
      // give it a value. you will need this for the css styles
      "eye-piercer"
    ).text(
      // lets name it
      'Eye-Piercer'
    )
  );

  return true;
};
