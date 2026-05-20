/*
 * ThumbTune plugin for OpenWebRX+
 * Minimalistic floating control panel optimized for one-finger tuning on mobile devices.
 * 
 * Copyright (c) 2026 Denis Brekhov, UB1AON
 * Licensed under MIT
 */

// Create a namespace for our plugin
Plugins.thumbtune = Plugins.thumbtune || {};
Plugins.thumbtune._version = 1.0;

// Global configurations and state within the plugin
Plugins.thumbtune.config = {
    steps: [500, 1000, 10000, 25000, 50000], // Added 10k step
    initialStepIdx: 1,                       // Start with the 1k step
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
	return val >= 1000 ? (val / 1000) + 'k' : val + 'H';
    },
    formatFreq: function (hz) {
	if (!hz) return "000.000.00"; 
	var mhz = (hz / 1000000).toFixed(6); 
	var p = mhz.split('.'); 
	return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "." + p[1]; 
    },
    getNativeFreq: function () {
	var digits = Array.from(document.querySelectorAll('.webrx-actual-freq .digit') || []);
	var freqStr = digits.map(function (d) { return d.innerText; }).join('');
	return parseInt(freqStr) || 0;
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
	    fDisp.innerHTML = '<span class="owrx-tt-placeholder">' + (Plugins.thumbtune.utils.getNativeFreq() / 1000000).toFixed(4) + '</span><span class="owrx-tt-cursor">|</span>';
	}
    }
};

// Mandatory plugin initialization function (OpenWebRX+ requirement)
Plugins.thumbtune.init = function () {
    // Check for base dependency on the utils plugin
    if (!Plugins.isLoaded('utils', 0.6)) {
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
	btn.innerText = text;
	
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

    // Row 1: Display and Zoom controls
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
    
    setInterval(function () { 
	if (!state.isEditing) fDisp.innerText = utils.formatFreq(utils.getNativeFreq()); 
    }, config.updateInterval); 

    // Assemble the digital numpad panel
    ['1','2','3','4','5','6','7','8','9','.','0','вЊ«'].forEach(function (key) {
	var btn = createBtn(key, 'owrx-tt-btn owrx-tt-digit', function () {
	    if (key === 'вЊ«') state.editValue = state.editValue.slice(0, -1);
	    else if (state.editValue.length < 10) state.editValue += key;
	    utils.updateDisplay();
	});
	if (key === 'вЊ«') btn.style.color = 'rgba(255,255,255,0.4)';
	numpadPanel.appendChild(btn);
    });

    // Numpad action buttons (Cancel / Apply)
    var actionsRow = document.createElement('div'); 
    actionsRow.style.cssText = 'grid-column: span 3; display: flex; gap: 12px; width: 100%; margin-top: 8px;';
    actionsRow.append(
	createBtn('вЋ‹', 'owrx-tt-btn owrx-tt-action owrx-tt-action-esc', utils.closeNumpad),
	createBtn('вЏЋ', 'owrx-tt-btn owrx-tt-action owrx-tt-action-ent', utils.commitChange)
    );
    numpadPanel.appendChild(actionsRow);

    row1.append( 
	createBtn('вЂ“', 'owrx-tt-btn owrx-tt-btn-zoom', function () { window.zoomOutOneStep?.(); }, true), 
	fDisp, 
	createBtn('+', 'owrx-tt-btn owrx-tt-btn-zoom', function () { window.zoomInOneStep?.(); }, true) 
    ); 

    // Row 2: Frequency step configuration and tuning
    var row2 = document.createElement('div'); 
    row2.className = 'owrx-tt-row';
    
    var doTune = function (dir) { 
	var s = document.querySelector('#openwebrx-prop-step, select[id*="step"]'); 
	if (s) { s.value = config.steps[state.currentStepIdx]; s.dispatchEvent(new Event('change')); } 
	
	var b;
	if (dir > 0) {
	    b = document.querySelector('.openwebrx-tune-button[title*="up"], .openwebrx-tune-button[title*="РІРІРµСЂС…"]');
	} else {
	    b = document.querySelector('.openwebrx-tune-button[title*="down"], .openwebrx-tune-button[title*="РІРЅРёР·"]');
	}
	if (b) b.click(); 
    }; 
    
    var sBtn = createBtn(utils.getStepLabel(config.steps[state.currentStepIdx]), 'owrx-tt-btn owrx-tt-btn-step', function () { 
	state.currentStepIdx = (state.currentStepIdx + 1) % config.steps.length; 
	sBtn.innerText = utils.getStepLabel(config.steps[state.currentStepIdx]); 
    }); 
    sBtn.style.cssText = 'background: rgba(255,255,255,0.08); font-size: 13px; font-weight: bold; height: 50px;';
    
    row2.append(
	createBtn('вќ®', 'owrx-tt-btn owrx-tt-btn-step', function () { doTune(-1); }, true), 
	sBtn, 
	createBtn('вќЇ', 'owrx-tt-btn owrx-tt-btn-step', function () { doTune(1); }, true)
    ); 

    // Row 3: Rapid frequency jumping
    var row3 = document.createElement('div'); 
    row3.className = 'owrx-tt-row';
    row3.append( 
	createBtn('вќ®вќ®', 'owrx-tt-btn owrx-tt-btn-jump', function () { window.jumpBySteps?.(-1); }, true), 
	createBtn('вќЇвќЇ', 'owrx-tt-btn owrx-tt-btn-jump', function () { window.jumpBySteps?.(1); }, true) 
    ); 

    container.append(customSelect, row1, numpadPanel, row2, row3); 
    document.body.append(container); 

    // Panel dragging logic (Zero CPU Idle performance optimization)
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

    return true;
};
