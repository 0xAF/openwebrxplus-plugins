//set_waterfall_theme
Plugins.set_waterfall_theme.no_css = true;

Plugins.set_waterfall_theme_theme_value ??= '';
Plugins.set_waterfall_theme.theme_value ??= Plugins.set_waterfall_theme_theme_value;

const $listbox = $('#openwebrx-wf-themes-listbox');
const value = Plugins.set_waterfall_theme.theme_value;
const exists = $listbox.find('option').filter(function() {
    return $(this).val() === value;
}).length > 0;

if (exists) {
    $listbox.prop('value', value).change();
} else {
    console.error('set_waterfall_theme invalid theme value: ', value);
}
