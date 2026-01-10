Plugins.show_band_plan.no_css = true;

$(document).ready(function () {
    setTimeout(function () {
        $('#openwebrx-bandplan-checkbox').prop('checked', true).change();
    }, 5000);
});