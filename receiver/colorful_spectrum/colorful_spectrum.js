/*
 * Plugin: Spectravue Style Spectrum Analyzer (with UI selection and opacity slider)
 * License: MIT
 */

Plugins.colorful_spectrum.no_css = true;

Plugins.colorful_spectrum.init = async function () {

  if (!Plugins.isLoaded('utils', 0.4)) {
    await Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/utils/utils.js');

    if (!Plugins.isLoaded('utils', 0.4)) {
      console.error('colorful_spectrum plugin depends on "utils >= 0.4".');
      return false;
    }
  }

  // --- CONFIGURATION ---
  const defaultColor = window.SpectrumDefaultColor || 'blue';

  // Set default opacity from init.js, fallback to 0.0
  const defaultOpacity = window.SpectrumBackgroundOpacity !== undefined ? window.SpectrumBackgroundOpacity : 0.0;

  // Define custom Spectravue palettes.
  const colorPalettes = {
    'waterfall': { dynamic: true },
    'blue': {
      stroke: "rgba(0, 255, 255, 1.0)",
      top:    "rgba(0, 255, 255, 0.7)",
      bottom: "rgba(0, 0, 150, 0.5)"
    },
    'red': {
      stroke: "rgba(255, 30, 30, 1.0)",
      top:    "rgba(255, 30, 30, 0.9)",
      bottom: "rgba(100, 0, 0, 0.5)"
    },
    'green': {
      stroke: "rgba(0, 255, 0, 1.0)",
      top:    "rgba(0, 255, 0, 0.9)",
      bottom: "rgba(0, 80, 0, 0.5)"
    },
    'yellow': {
      stroke: "rgba(255, 255, 0, 1.0)",
      top:    "rgba(255, 255, 0, 0.9)",
      bottom: "rgba(120, 120, 0, 0.5)"
    },
    'pink': {
      stroke: "rgba(255, 0, 150, 1.0)",
      top:    "rgba(255, 0, 150, 0.9)",
      bottom: "rgba(100, 0, 50, 0.5)"
    },
    'purple': {
      stroke: "rgba(180, 50, 255, 1.0)",
      top:    "rgba(180, 50, 255, 0.9)",
      bottom: "rgba(60, 0, 100, 0.5)"
    },
    'grey': {
      stroke: "rgba(220, 220, 220, 1.0)",
      top:    "rgba(180, 180, 180, 0.8)",
      bottom: "rgba(50, 50, 50, 0.5)"
    }
  };

  Plugins.utils.on_ready(function () {

    // --- 1. PRECISE UI INJECTION ---
    function injectUI() {
      if (document.getElementById('webrx-spectrum-color')) return;

      let waterfallSelect = null;
      let allSelects = document.querySelectorAll('select');

      for (let i = 0; i < allSelects.length; i++) {
        let text = allSelects[i].textContent || allSelects[i].innerText;
        if (text.includes('Turbo') && text.includes('Ocean') && text.includes('Eclipse')) {
          waterfallSelect = allSelects[i];
          break;
        }
      }

      if (!waterfallSelect) {
        setTimeout(injectUI, 500);
        return;
      }

      let wrapper = waterfallSelect.parentNode;
      let newWrapper = wrapper.cloneNode(true);

      wrapper.style.display = 'inline-flex';
      wrapper.style.verticalAlign = 'middle';

      newWrapper.style.display = 'inline-flex';
      newWrapper.style.verticalAlign = 'middle';
      newWrapper.style.marginLeft = '8px';
      newWrapper.style.width = '115px';
      newWrapper.style.position = 'relative';

      // Setup the Select Dropdown
      let clonedSelects = newWrapper.querySelectorAll('select');
      for (let j = 1; j < clonedSelects.length; j++) {
        clonedSelects[j].remove();
      }

      let spectrumSelect = clonedSelects[0];
      spectrumSelect.id = 'webrx-spectrum-color';
      spectrumSelect.title = 'Spectrum Fill Color';
      spectrumSelect.innerHTML = '';
      spectrumSelect.style.width = '100%';
      spectrumSelect.style.flex = '1';
      spectrumSelect.style.display = 'inline-block';
      spectrumSelect.style.marginLeft = '3px'; // Added spacing here

      try {
        let origStyle = window.getComputedStyle(waterfallSelect);
        const stylesToCopy = [
          'height', 'minHeight', 'maxHeight',
          'fontSize', 'fontFamily', 'fontWeight',
          'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
          'lineHeight', 'boxSizing', 'border', 'borderRadius'
        ];
        stylesToCopy.forEach(prop => {
          if(origStyle[prop]) spectrumSelect.style[prop] = origStyle[prop];
        });
      } catch(e) {
        console.warn("Colorful Spectrum: Could not copy styles perfectly", e);
      }

      for (const key in colorPalettes) {
        let opt = document.createElement('option');
        opt.value = key;
        opt.innerText = key.charAt(0).toUpperCase() + key.slice(1);
        spectrumSelect.appendChild(opt);
      }

      let savedColor = localStorage.getItem('owrx-spectrum-color') || defaultColor;
      spectrumSelect.value = savedColor;

      spectrumSelect.addEventListener('change', function(e) {
        localStorage.setItem('owrx-spectrum-color', e.target.value);
      });

      // Setup the Opacity Slider
      let opacitySlider = document.createElement('input');
      opacitySlider.type = 'range';
      opacitySlider.id = 'webrx-spectrum-opacity';
      opacitySlider.min = '0';
      opacitySlider.max = '1';
      opacitySlider.step = '0.05';
      opacitySlider.title = 'Background Darkness';
      opacitySlider.style.width = '100%';
      opacitySlider.style.flex = '1';
      opacitySlider.style.display = 'none'; // Hidden by default
      opacitySlider.style.verticalAlign = 'middle';
      opacitySlider.style.marginLeft = '3px'; // Added spacing here

      // Load saved opacity or fallback to the init.js default
      let savedOpacity = localStorage.getItem('owrx-spectrum-opacity');
      if (savedOpacity !== null) {
        window.SpectrumBackgroundOpacity = parseFloat(savedOpacity);
      } else {
        window.SpectrumBackgroundOpacity = defaultOpacity;
      }
      opacitySlider.value = window.SpectrumBackgroundOpacity;

      opacitySlider.addEventListener('input', function(e) {
        let val = parseFloat(e.target.value);
        window.SpectrumBackgroundOpacity = val;
        localStorage.setItem('owrx-spectrum-opacity', val);
      });

      newWrapper.appendChild(opacitySlider);

      // Setup the Droplet Toggle Button
      let isSliderVisible = false;
      Array.from(newWrapper.children).forEach(child => {
        if (child.tagName !== 'SELECT' && child.tagName !== 'INPUT') {
          child.style.transform = 'scaleX(-1)';
          child.style.cursor = 'pointer';
          child.title = 'Toggle Opacity Slider';

          child.addEventListener('click', function() {
            isSliderVisible = !isSliderVisible;
            if (isSliderVisible) {
              spectrumSelect.style.display = 'none';
              opacitySlider.style.display = 'inline-block';
              child.title = 'Back to Color Menu';
            } else {
              opacitySlider.style.display = 'none';
              spectrumSelect.style.display = 'inline-block';
              child.title = 'Toggle Opacity Slider';
            }
          });
        }
      });

      wrapper.parentNode.insertBefore(newWrapper, wrapper.nextSibling);
    }

    injectUI();

    // --- 2. SPECTRAVUE-STYLE DRAWING LOGIC ---
    Plugins.utils.wrap_func(
      'draw',
      function (orig, thisArg, args) { return true; },
                            function (res, thisArg, args) {
                              if (!thisArg.data) return;

                              var vis_freq = get_visible_freq_range();
                              var vis_start = 0.5 - (center_freq - vis_freq.start) / bandwidth;
                              var vis_end = 0.5 - (center_freq - vis_freq.end) / bandwidth;
                              var data_start = Math.round(fft_size * vis_start);
                              var data_end = Math.round(fft_size * vis_end);
                              var data_width = data_end - data_start;
                              var data_height = Math.abs(thisArg.max - thisArg.min);
                              var spec_width = thisArg.el.offsetWidth;
                              var spec_height = thisArg.el.offsetHeight;

                              var x_ratio = data_width / spec_width;
                              var y_ratio = spec_height / data_height;

                              let spectrumSelectUI = document.getElementById('webrx-spectrum-color');
                              let selectedColorMode = spectrumSelectUI ? spectrumSelectUI.value : defaultColor;

                              thisArg.ctx.clearRect(0, 0, spec_width, spec_height);

                              // Draw the configurable dark background pulling directly from the window variable
                              const bgOpacity = window.SpectrumBackgroundOpacity !== undefined ? window.SpectrumBackgroundOpacity : 0.0;
                              if (bgOpacity > 0) {
                                thisArg.ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity})`;
                                thisArg.ctx.fillRect(0, 0, spec_width, spec_height);
                              }

                              thisArg.ctx.save();
                              thisArg.ctx.beginPath();

                              for (var x = 0; x < spec_width; x++) {
                                var data_idx = data_start + ((x * x_ratio) | 0);

                                if (data_idx < 0) data_idx = 0;
                                if (data_idx >= thisArg.data.length) data_idx = thisArg.data.length - 1;

                                var data = thisArg.data[data_idx];
                                var y = (data - thisArg.min) * y_ratio;

                                if (x === 0) {
                                  thisArg.ctx.moveTo(x, spec_height - y);
                                } else {
                                  thisArg.ctx.lineTo(x, spec_height - y);
                                }
                              }

                              if (selectedColorMode === 'waterfall') {

                                var fillGradient = thisArg.ctx.createLinearGradient(0, 0, 0, spec_height);
                                var strokeGradient = thisArg.ctx.createLinearGradient(0, 0, 0, spec_height);

                                for (var i = 0; i <= 10; i++) {
                                  var step = i / 10;
                                  var signal = thisArg.max - (step * (thisArg.max - thisArg.min));
                                  var c = Waterfall.makeColor(signal);

                                  var fillAlpha = 0.8 - (0.4 * step);
                                  fillGradient.addColorStop(step, "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + fillAlpha + ")");
                                  strokeGradient.addColorStop(step, "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", 1.0)");
                                }

                                thisArg.ctx.lineWidth = 1.5;
                                thisArg.ctx.strokeStyle = strokeGradient;
                                thisArg.ctx.stroke();

                                thisArg.ctx.lineTo(spec_width, spec_height);
                                thisArg.ctx.lineTo(0, spec_height);
                                thisArg.ctx.closePath();

                                thisArg.ctx.fillStyle = fillGradient;
                                thisArg.ctx.fill();

                              } else {

                                let palette = colorPalettes[selectedColorMode] || colorPalettes['blue'];

                                thisArg.ctx.lineWidth = 1.5;
                                thisArg.ctx.strokeStyle = palette.stroke;
                                thisArg.ctx.stroke();

                                thisArg.ctx.lineTo(spec_width, spec_height);
                                thisArg.ctx.lineTo(0, spec_height);
                                thisArg.ctx.closePath();

                                var gradient = thisArg.ctx.createLinearGradient(0, 0, 0, spec_height);
                                gradient.addColorStop(0, palette.top);
                                gradient.addColorStop(1, palette.bottom);

                                thisArg.ctx.fillStyle = gradient;
                                thisArg.ctx.fill();
                              }

                              thisArg.ctx.restore();
                            },
                            spectrum
    );
  });

  return true;
}
