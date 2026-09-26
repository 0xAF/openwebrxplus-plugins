// Antenna switch UI plugin for OpenWebRX+
// License: MIT
// Original Example File Copyright (c) 2023-2026 Stanislav Lechev [0xAF], LZ2SLL
// Modified by DL9UL to provide UI buttons used to call a WebAPI
// Re-written by Dimitar Milkov, LZ2DMV to a more optimized and clean state

Plugins.antenna_switcher.API_URL ??= `${window.location.origin}/antenna_switch`;
Plugins.antenna_switcher._version = 0.1;

// Init function of the plugin
Plugins.antenna_switcher.init = function () {

  let antennaNum = 0;
  const buttons = [];
  let activeAntenna = null;

  // Function to send a command via POST
  function sendCommand(command) {
    fetch(Plugins.antenna_switcher.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      const response = data.payload.response;
      const match = response.match(/^n:(\d)$/);
      if (match) {
        antennaNum = parseInt(match[1], 10);
        if (!buttonsCreated) createButtons();
      } else {
        updateButtonState(response);
      }
    })
    .catch(error => console.error('Error:', error));
  }

  // Function to update the button state based on the active antenna
  function updateButtonState(selectedAntenna) {
    // The initial status response may arrive before the antenna count.
    activeAntenna = String(selectedAntenna);
    buttons.forEach((button, index) => {
      button.classList.toggle('highlighted', (index + 1).toString() === activeAntenna);
    });
  }

  // Create buttons and add them to the container
  function createButtons() {
    let antSection;

    if (typeof Plugins.addSection === 'function' && document.getElementById('openwebrx-section-settings')) {
      // Preserve the old section state when upgrading, or show it by default.
      const sectionId = 'plugin-section-antenna_switcher';
      const expanded = LS.has(sectionId) ? LS.loadBool(sectionId) :
        (LS.has('openwebrx-section-ant') ? LS.loadBool('openwebrx-section-ant') : true);
      // addSection() returns the section content (OpenWebRX+ 1.2.125+)
      antSection = Plugins.addSection('antenna_switcher', 'Antenna');
      UI.toggleSection(antSection.previousElementSibling, expanded);
    } else {
      // OpenWebRX+ versions before the native section API.
      antSection = document.createElement('div');
      antSection.classList.add('openwebrx-section');

      const divider = document.createElement('div');
      divider.id = 'openwebrx-section-ant';
      divider.classList.add('openwebrx-section-divider');
      divider.onclick = () => UI.toggleSection(divider);
      divider.innerHTML = '&blacktriangledown;&nbsp;Antenna';

      const target = document.getElementById('openwebrx-section-modes');
      target.parentNode.insertBefore(divider, target);
      target.parentNode.insertBefore(antSection, target);
    }

    const antPanelLine = document.createElement('div');
    antPanelLine.classList.add('openwebrx-ant', 'openwebrx-panel-line');
    antSection.appendChild(antPanelLine);

    const antGrid = document.createElement('div');
    antGrid.classList.add('openwebrx-ant-grid');
    antPanelLine.appendChild(antGrid);

    for (let i = 1; i <= antennaNum; i++) {
      const button = createButton(i);
      buttons.push(button);
      antGrid.appendChild(button);
    }

    buttonsCreated = true;
    if (activeAntenna !== null) updateButtonState(activeAntenna);
  }

  function createButton(i) {
    const button = document.createElement('div');
    button.id = `owrx-ant-button-${i}`;
    button.classList.add('openwebrx-button');
    button.textContent = `ANT ${i}`;
    button.onclick = () => sendCommand(String(i));
    return button;
  }

  let buttonsCreated = false;

  sendCommand('n');
  sendCommand('s');

  setInterval(() => sendCommand('s'), 2000);

  return true;
};
