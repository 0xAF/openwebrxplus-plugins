/*
 * ThumbTune plugin for OpenWebRX+
 * Minimalistic floating control panel optimized for one-finger tuning on mobile devices.
 *
 * Copyright (c) 2026 Denis Brekhov, UB1AON
 * Licensed under MIT
 */

// Create a namespace for our plugin
Plugins.thumbtune = Plugins.thumbtune || {};
Plugins.thumbtune._version = "2.0.0";

// Global configurations and state within the plugin
Plugins.thumbtune.config = {
    steps: [500, 1000, 10000, 25000, 50000, 100000],
    initialStepIdx: 1,
    updateInterval: 500,
    repeatDelay: 400,
    repeatRate: 120
};

Plugins.thumbtune.state = {
    currentStepIdx: Plugins.thumbtune.config.initialStepIdx,
    offset: { x: 0, y: 0 },
    initial: { x: 0, y: 0 },
    isUpdatingInternally: false,
    isEditing: false,
    editValue: ""
};

// Plugin utility helper functions
Plugins.thumbtune.utils = {
    getStepLabel: function (val) {
	return val >= 1000 ? (val / 1000) + ' kHz' : val + ' Hz';
    },
    formatFreq: function (hz) {
	var container = document.querySelector('.webrx-actual-freq');
	var readout = container && container.firstElementChild;
	if (readout && readout.textContent.trim()) return readout.textContent.trim();
	if (!Number.isFinite(hz) || hz <= 0) return '0 Hz';
	var exponent = Math.floor(Math.log10(hz) / 3) * 3;
	var units = { 0: 'Hz', 3: 'kHz', 6: 'MHz', 9: 'GHz', 12: 'THz' };
	var digits = Math.max(0, exponent - 2);
	return (hz / 10 ** exponent).toLocaleString(undefined, {
	    maximumFractionDigits: digits,
	    minimumFractionDigits: digits
	}) + ' ' + (units[exponent] || 'Hz');
    },
    getNativeFreq: function () {
	var container = document.querySelector('.webrx-actual-freq');
	if (!container) return 0;

	var jq = window.jQuery || window.$;
	var display = jq && jq(container).data('frequencyDisplay');
	if (display && Number.isFinite(display.frequency)) return display.frequency;

	// Older displays may not expose the frequency object; read the value and its unit together.
	var readout = container.firstElementChild;
	var valueElement = readout && readout.firstElementChild;
	var unitElement = valueElement && valueElement.nextElementSibling;
	if (!unitElement) return 0;
	var value = parseFloat(valueElement.textContent.trim().replace(',', '.'));
	var multipliers = { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9, THz: 1e12 };
	var multiplier = multipliers[unitElement.textContent.trim()];
	return Number.isFinite(value) && multiplier ? Math.round(value * multiplier) : 0;
    },
    setNativeFreq: function (hz) {
	var container = document.querySelector('.webrx-actual-freq');
	if (container) {
	    if (window.jQuery || window.$) {
		$(container).trigger('frequencychange', [hz]);
	    } else {
		container.dispatchEvent(new CustomEvent('frequencychange', { detail: hz }));
	    }
	}
    },
    parseInputFreq: function (str) {
	var val = parseFloat(str.replace(/\s+/g, '').replace(',', '.'));
	if (isNaN(val) || val <= 0) return null;
	return Math.round((val < 2000) ? val * 1000000 : val);
    },
    commitChange: function () {
	if (!Plugins.thumbtune.state.isEditing) return;
	var targetHz = Plugins.thumbtune.utils.parseInputFreq(Plugins.thumbtune.state.editValue);
	if (targetHz) Plugins.thumbtune.utils.setNativeFreq(targetHz);
	Plugins.thumbtune.utils.closeNumpad();
    },
    closeNumpad: function () {
	Plugins.thumbtune.state.isEditing = false;
	document.getElementById('owrx-thumbtune-numpad').style.display = 'none';
	document.getElementById('owrx-thumbtune-display').innerText = Plugins.thumbtune.utils.formatFreq(Plugins.thumbtune.utils.getNativeFreq());
    },
    updateDisplay: function () {
	var fDisp = document.getElementById('owrx-thumbtune-display');
	if (Plugins.thumbtune.state.editValue.length > 0) {
	    fDisp.innerHTML = Plugins.thumbtune.state.editValue + '<span class="owrx-tt-cursor">|</span>';
	} else {
	    fDisp.innerHTML = '<span class="owrx-tt-placeholder">' + Plugins.thumbtune.utils.formatFreq(Plugins.thumbtune.utils.getNativeFreq()) + '</span><span class="owrx-tt-cursor">|</span>';
	}
    }
};

// Mandatory plugin initialization function
Plugins.thumbtune.init = function () {
    if (!Plugins.isLoaded('utils', 0.6)) {
		console.warn('ThumbTune plugin requires utils plugin v0.6 or higher.');
        return false;
    }

    if (document.getElementById('owrx-thumbtune-container')) return true;

    var state = Plugins.thumbtune.state;
    var config = Plugins.thumbtune.config;
    var utils = Plugins.thumbtune.utils;

    // Create the main control panel container
    var container = document.createElement('div');
    container.id = 'owrx-thumbtune-container';

    // Configure auto-repeat functionality for button holding
    var activeInterval, activeTimeout;
    var clearRepeat = function () { clearTimeout(activeTimeout); clearInterval(activeInterval); };
    window.addEventListener('mouseup', clearRepeat);
    window.addEventListener('touchend', clearRepeat);
    window.addEventListener('blur', clearRepeat);

    var createBtn = function (text, classes, action, autoRepeat) {
	var btn = document.createElement('button');
	btn.className = classes;
	btn.innerHTML = text;

	var startAction = function (e) {
	    e.preventDefault();
	    e.stopPropagation();
	    action();
	    if (autoRepeat) {
		activeTimeout = setTimeout(function () {
		    activeInterval = setInterval(action, config.repeatRate);
		}, config.repeatDelay);
	    }
	};
	btn.addEventListener('mousedown', startAction);
	btn.addEventListener('touchstart', startAction, {passive: false});
	return btn;
    };

    // Intercept physical keyboard events during frequency input
    var globalKeyShield = function (e) {
	if (!state.isEditing || e.type !== 'keydown') return;
	if (/^[0-9.,]$/.test(e.key)) {
	    e.preventDefault(); e.stopPropagation();
	    if (state.editValue.length < 10) state.editValue += (e.key === ',' ? '.' : e.key);
	    utils.updateDisplay();
	} else if (e.key === 'Backspace') {
	    e.preventDefault(); e.stopPropagation();
	    state.editValue = state.editValue.slice(0, -1);
	    utils.updateDisplay();
	} else if (e.key === 'Enter') {
	    e.preventDefault(); e.stopPropagation(); utils.commitChange();
	} else if (e.key === 'Escape') {
	    e.preventDefault(); e.stopPropagation(); utils.closeNumpad();
	}
    };
    window.addEventListener('keydown', globalKeyShield, true);

    // Sync SDR profiles (Dropdown selection)
    var nativeSelect = document.getElementById('openwebrx-sdr-profiles-listbox');
    var customSelect = document.createElement('select');
    customSelect.className = 'owrx-tt-select';
    
    var syncOptions = function () {
	if (!nativeSelect || state.isUpdatingInternally) return;
	customSelect.innerHTML = '';
	Array.from(nativeSelect.options).forEach(function (o) {
	    customSelect.add(new Option(o.text, o.value, o.defaultSelected, o.selected));
	});
    };
    if (nativeSelect) {
	new MutationObserver(syncOptions).observe(nativeSelect, { childList: true });
	syncOptions();
    }
    customSelect.onchange = function () {
	if (!nativeSelect) return;
	state.isUpdatingInternally = true;
	nativeSelect.value = customSelect.value;
	if (typeof sdr_profile_changed === "function") sdr_profile_changed();
	nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
	setTimeout(function () { state.isUpdatingInternally = false; }, 800);
    };

    // Row 1: Display and Zoom controls (\u2013 is En dash)
    var row1 = document.createElement('div');
    row1.className = 'owrx-tt-row';
    
    var fDisp = document.createElement('div');
    fDisp.id = 'owrx-thumbtune-display';
    fDisp.className = 'owrx-tt-fdisp';
    
    var numpadPanel = document.createElement('div');
    numpadPanel.id = 'owrx-thumbtune-numpad';

    fDisp.onclick = function (e) {
	e.stopPropagation();
	if (state.isEditing) return;
	state.isEditing = true;
	state.editValue = "";
	utils.updateDisplay();
	numpadPanel.style.display = 'grid';
    };
    window.addEventListener('click', function (e) {
	if (state.isEditing && !container.contains(e.target)) utils.closeNumpad();
    });
    
    // Assemble the digital numpad panel (\u232B is Backspace icon)
    ['1','2','3','4','5','6','7','8','9','.','0','\u232B'].forEach(function (key) {
	var btn = createBtn(key, 'owrx-tt-btn owrx-tt-digit', function () {
	    if (key === '\u232B') state.editValue = state.editValue.slice(0, -1);
	    else if (state.editValue.length < 10) state.editValue += key;
	    utils.updateDisplay();
	});
	if (key === '\u232B') btn.style.color = 'rgba(255,255,255,0.4)';
	numpadPanel.appendChild(btn);
    });

    // Numpad action buttons (\u238B is Escape, \u23CE is Return)
    var actionsRow = document.createElement('div');
    actionsRow.style.cssText = 'grid-column: span 3; display: flex; gap: 12px; width: 100%; margin-top: 8px;';
    actionsRow.append(
	createBtn('\u238B', 'owrx-tt-btn owrx-tt-action owrx-tt-action-esc', utils.closeNumpad),
	createBtn('\u23CE', 'owrx-tt-btn owrx-tt-action owrx-tt-action-ent', utils.commitChange)
    );
    numpadPanel.appendChild(actionsRow);

    row1.append(
	createBtn('<svg viewBox="0 0 80 80"><use xlink:href="static/gfx/svg-defs.svg#zoom-out"></use></svg>', 'owrx-tt-btn owrx-tt-btn-zoom', function () { window.zoomOutOneStep?.(); }, true),
	fDisp,
	createBtn('<svg viewBox="0 0 80 80"><use xlink:href="static/gfx/svg-defs.svg#zoom-in"></use></svg>', 'owrx-tt-btn owrx-tt-btn-zoom', function () { window.zoomInOneStep?.(); }, true)
    );

    // Row 2: Frequency step configuration and tuning
    var row2 = document.createElement('div');
    row2.className = 'owrx-tt-row';
    
    var doTune = function (dir) {
	var s = document.querySelector('#openwebrx-prop-step, select[id*="step"]');
	var step = config.steps[state.currentStepIdx];
	var targetStep = String(step);
	if (!s || !Array.from(s.options).some(function (option) { return option.value === targetStep; })) {
	    var targetFreq = utils.getNativeFreq() + dir * step;
	    if (targetFreq > 0) utils.setNativeFreq(targetFreq);
	    return;
	}
	if (s.value !== targetStep) {
	    s.value = targetStep;
	    s.dispatchEvent(new Event('change'));
	}
	
	var b;
	if (dir > 0) {
	    b = document.querySelector('.openwebrx-tune-button[title*="up"]');
	} else {
	    b = document.querySelector('.openwebrx-tune-button[title*="down"]');
	}
	
	if (b) {
	    b.click();
	    var fDispEl = document.getElementById('owrx-thumbtune-display');
	    if (fDispEl && !state.isEditing) {
		fDispEl.innerText = utils.formatFreq(utils.getNativeFreq());
	    }
	}
    };
    
    var sBtn = createBtn(utils.getStepLabel(config.steps[state.currentStepIdx]), 'owrx-tt-btn owrx-tt-btn-step', function () {
	state.currentStepIdx = (state.currentStepIdx + 1) % config.steps.length;
	sBtn.innerText = utils.getStepLabel(config.steps[state.currentStepIdx]);
    });
    sBtn.style.cssText = 'background: rgba(255,255,255,0.08); font-size: 13px; font-weight: bold; height: 50px;';
    
    // \u276E and \u276F are single heavy chevrons
    row2.append(
	createBtn('\u276E', 'owrx-tt-btn owrx-tt-btn-step', function () { doTune(-1); }, true),
	sBtn,
	createBtn('\u276F', 'owrx-tt-btn owrx-tt-btn-step', function () { doTune(1); }, true)
    );

    // Row 3: Rapid frequency jumping
    var row3 = document.createElement('div');
    row3.className = 'owrx-tt-row';
    
    var doJump = function (dir) {
	window.jumpBySteps?.(dir);
	if (!state.isEditing) {
	    var fDispEl = document.getElementById('owrx-thumbtune-display');
	    if (fDispEl) fDispEl.innerText = utils.formatFreq(utils.getNativeFreq());
	}
    };

    row3.append(
	createBtn('\u276E\u276E', 'owrx-tt-btn owrx-tt-btn-jump', function () { doJump(-1); }, true),
	createBtn('\u276F\u276F', 'owrx-tt-btn owrx-tt-btn-jump', function () { doJump(1); }, true)
    );

    var updateJumpButtons = function () {
	var panel = typeof UI !== 'undefined' && typeof UI.getDemodulatorPanel === 'function'
	    ? UI.getDemodulatorPanel() : null;
	var key = panel && typeof panel.getMagicKey === 'function' ? panel.getMagicKey() : null;
	row3.style.display = key && typeof window.jumpBySteps === 'function' ? '' : 'none';
    };
    updateJumpButtons();
    setInterval(function () {
	if (!state.isEditing) fDisp.innerText = utils.formatFreq(utils.getNativeFreq());
	updateJumpButtons();
    }, config.updateInterval);

    container.append(customSelect, row1, numpadPanel, row2, row3);

    var nativeWindow = null;
    var nativeBody = null;
    if (typeof Plugins.addButton === 'function' &&
        typeof Plugins.addWindow === 'function' &&
        typeof Plugins.toggleWindow === 'function') {
        var launchButton = Plugins.addButton('thumbtune', 'ThumbTune', function () {
            clearRepeat();
            if (state.isEditing) utils.closeNumpad();
            Plugins.toggleWindow('thumbtune');
        });
        if (launchButton && launchButton.parentNode) {
            nativeWindow = Plugins.addWindow('thumbtune', 'ThumbTune');
            nativeBody = nativeWindow && nativeWindow.querySelector('.openwebrx-plugin-body');
            if (!nativeBody) launchButton.remove();
        }
    }

    if (nativeBody) {
        nativeWindow.style.width = nativeWindow.style.width || '300px';
        nativeWindow.style.height = 'auto';
        nativeWindow.style.maxWidth = 'calc(100vw - 20px)';
        nativeWindow.style.maxHeight = 'none';
        nativeWindow.style.backgroundColor = 'rgba(20, 20, 20, 0.5)';
        nativeWindow.style.backdropFilter = 'blur(20px)';
        nativeWindow.style.webkitBackdropFilter = 'blur(20px)';
        nativeWindow.style.transform = 'none';
        nativeWindow.style.left = nativeWindow.style.left || '20px';
        nativeWindow.style.top = nativeWindow.style.top || '20px';
        nativeBody.style.padding = '0';
        nativeBody.style.height = 'auto';
        nativeBody.style.overflowY = 'visible';
        nativeBody.style.minHeight = '0';
        nativeBody.appendChild(container);
        var resizeNativeWindow = function () {
            var header = nativeWindow.querySelector('.openwebrx-plugin-header');
            var windowStyle = window.getComputedStyle(nativeWindow);
            var borderHeight = parseFloat(windowStyle.borderTopWidth) + parseFloat(windowStyle.borderBottomWidth);
            var contentHeight = container.getBoundingClientRect().height;
            var height = Math.ceil((header ? header.getBoundingClientRect().height : 0) + contentHeight + borderHeight);
            if (height && Math.abs(nativeWindow.getBoundingClientRect().height - height) > 1) {
                nativeWindow.style.height = height + 'px';
            }
        };
        new ResizeObserver(resizeNativeWindow).observe(container);
        $(nativeWindow).find('.openwebrx-plugin-close').on('click.thumbtune touchend.thumbtune', function () {
            clearRepeat();
            if (state.isEditing) utils.closeNumpad();
        });
        Plugins.toggleWindow('thumbtune', true);
        resizeNativeWindow();
    } else {
        container.classList.add('owrx-tt-legacy');
        document.body.append(container);
    }

    // Older OpenWebRX+ versions keep the panel's own dragging behavior.
    if (!nativeBody) {
        var onDrag = function (e) {
            var cx = e.touches ? e.touches[0].clientX : e.clientX;
            var cy = e.touches ? e.touches[0].clientY : e.clientY;
            container.style.transform = 'translate3d(' + (cx - state.initial.x) + 'px, ' + (cy - state.initial.y) + 'px, 0)';
        };
        var stopDrag = function () {
            window.removeEventListener('mousemove', onDrag);
            window.removeEventListener('touchmove', onDrag);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('touchend', stopDrag);
        };
        var startDrag = function (e) {
            if (e.target.closest('button') || e.target.tagName === 'SELECT') return;
            var cx = e.touches ? e.touches[0].clientX : e.clientX;
            var cy = e.touches ? e.touches[0].clientY : e.clientY;
            var matrix = window.getComputedStyle(container).transform;
            if (matrix !== 'none') {
                var vals = matrix.split('(')[1].split(')')[0].split(',');
                state.offset.x = parseFloat(vals[4]);
                state.offset.y = parseFloat(vals[5]);
            }
            state.initial.x = cx - state.offset.x;
            state.initial.y = cy - state.offset.y;

            window.addEventListener('mousemove', onDrag);
            window.addEventListener('touchmove', onDrag, {passive: false});
            window.addEventListener('mouseup', stopDrag);
            window.addEventListener('touchend', stopDrag);
        };
        container.addEventListener('mousedown', startDrag);
        container.addEventListener('touchstart', startDrag, {passive: false});
        window.addEventListener('blur', stopDrag);
    }

    return true;
};
