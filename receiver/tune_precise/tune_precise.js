Plugins.tune_precise.no_css = true;

Plugins.tune_precise.init = async function () {
    $(".webrx-mouse-freq").after(`
        <div id="id-step-freq" style="padding-bottom: 4px; padding-top: 4px;">
            <img style="padding-right: 2px;" id="id-step-0" 
                src="/static/plugins/receiver/tune_precise/gfx/openwebrx-stepdn-20.png" 
                onclick="window.freqstep(0)" title="-1kHz">
            <img style="padding-right: 2px;" id="id-step-1" 
                src="/static/plugins/receiver/tune_precise/gfx/openwebrx-stepdn-18.png" 
                onclick="window.freqstep(1)" title="-100Hz">
            <img style="padding-right: 2px;" id="id-step-2" 
                src="/static/plugins/receiver/tune_precise/gfx/openwebrx-stepdn-16.png" 
                onclick="window.freqstep(2)" title="-10Hz">
            <img style="padding-right: 2px; margin-left: 6px;" id="id-step-3" 
                src="/static/plugins/receiver/tune_precise/gfx/openwebrx-stepup-16.png" 
                onclick="window.freqstep(3)" title="+10Hz">
            <img style="padding-right: 2px;" id="id-step-4" 
                src="/static/plugins/receiver/tune_precise/gfx/openwebrx-stepup-18.png" 
                onclick="window.freqstep(4)" title="+100Hz">
            <img style="padding-right: 2px;" id="id-step-5" 
                src="/static/plugins/receiver/tune_precise/gfx/openwebrx-stepup-20.png" 
                onclick="window.freqstep(5)" title="+1kHz">
        </div>   
    `);

    function toggleStepHz() {
        if (StepHz === 1000) {
            StepHz = 5000;
            document.getElementById("stepchangeHz").innerHTML = "5";
            document.getElementById("stepchangeHz").style.backgroundColor = "#04AA6D";
        } else if (StepHz === 5000) {
            StepHz = 9000;
            document.getElementById("stepchangeHz").innerHTML = "9";
            document.getElementById("stepchangeHz").style.backgroundColor = "blue";
        } else if (StepHz === 9000) {
            StepHz = 1000;
            document.getElementById("stepchangeHz").innerHTML = "1";
            document.getElementById("stepchangeHz").style.backgroundColor = "red";
        }
    }

    window.freqstep = function (step) {
        let stepValue = 0;

        switch (step) {
            case 0: stepValue = -1000; break;
            case 1: stepValue = -100; break;
            case 2: stepValue = -10; break;
            case 3: stepValue = 10; break;
            case 4: stepValue = 100; break;
            case 5: stepValue = 1000; break;
            default: stepValue = 0;
        }

        let offsetFreq = $("#openwebrx-panel-receiver").demodulatorPanel()
            .getDemodulator().get_offset_frequency();
        let absoluteFreq = offsetFreq + center_freq;
        let newFreq = 0;

        if (Math.abs(stepValue) > 100) {
            let remainder = absoluteFreq - 1000 * Math.trunc(absoluteFreq / 1000);
            if (remainder > 0) {
                newFreq = stepValue < 0 ? offsetFreq - remainder : offsetFreq + (1000 - remainder);
            } else {
                newFreq = 1000 * Math.round((offsetFreq + stepValue) / 1000);
            }
        } else {
            newFreq = offsetFreq + stepValue;
        }

        if (newFreq !== offsetFreq) {
            $("#openwebrx-panel-receiver").demodulatorPanel()
                .getDemodulator().set_offset_frequency(newFreq);
            absoluteFreq = newFreq + center_freq;
            let visibleRange = get_visible_freq_range();

            if (stepValue > 0) {
                let rightShift = visibleRange.end - visibleRange.center;
                if ((absoluteFreq - visibleRange.center) / rightShift > 0.7 && canRight()) {
                    // Can move right
                }
            } else {
                let leftShift = visibleRange.center - visibleRange.start;
                if ((visibleRange.center - absoluteFreq) / leftShift > 0.7 && canLeft()) {
                    // Can move left
                }
            }
        }
    };

    return true;
};