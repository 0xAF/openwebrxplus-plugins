Plugins.compact_analog_modes.no_css = true;

function doChanges() {

    // Find the modes grid element
    const modesGrid = document.querySelector('.openwebrx-modes-grid');

    // If the modes grid does not exist, stop execution
    if (!modesGrid) {
        return;
    }

    // Check if the select element is already created
    if (document.querySelector('.openwebrx-modes-select')) {
        return; // If it already exists, do nothing
    }

    // Find all mode buttons in the grid
    const modeButtons = modesGrid.querySelectorAll('.openwebrx-demodulator-button');

    // If there are no buttons, stop execution
    if (modeButtons.length === 0) {
        return;
    }

    // Create a <select> element for the dropdown menu
    const select = document.createElement('select');
    select.className = 'openwebrx-modes-select';


    // Add a default empty option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '';
    defaultOption.selected = true;
    defaultOption.disabled = true; // Make the option unselectable
    select.appendChild(defaultOption);

    // Create options for the dropdown menu based on the buttons
    modeButtons.forEach(button => {
        const option = document.createElement('option');
        option.value = button.dataset.modulation; // Use the "modulation" dataset value
        option.textContent = button.textContent.trim(); // Use the button's text
        select.appendChild(option);
    });

    // Create a new "ANALOG" button and add it after the grid
    const analogDiv = document.createElement('div');
    analogDiv.className = 'openwebrx-button openwebrx-demodulator-button openwebrx-button-dig';
    analogDiv.textContent = 'ANALOG';
    modesGrid.insertAdjacentElement('afterend', analogDiv);

    // Add the dropdown menu right after the "ANALOG" button
    analogDiv.insertAdjacentElement('afterend', select);

    // Hide the original modes grid
    modesGrid.style.display = 'none';

    // Add a click event to each button to handle selection
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove the highlighted class from all buttons
            modeButtons.forEach(btn => btn.classList.remove('highlighted'));
            // Add the highlighted class to the clicked button
            this.classList.add('highlighted');
            // Update the dropdown menu value
            select.value = this.dataset.modulation;
        });
    });

    // Variable to store the last valid selected value
    let lastValidValue = '';

    // Add a change event to the dropdown menu to handle changes
    select.addEventListener('change', function() {
        if (this.value) {
            // Save the valid value and simulate a click on the corresponding button
            lastValidValue = this.value;
            const targetButton = modesGrid.querySelector(`[data-modulation="${this.value}"]`);
            if (targetButton) {
                targetButton.click();
            }
        } else {
            // If the empty option is selected, restore the last valid value
            this.value = lastValidValue;
        }
    });

    // Create an observer to monitor class changes on the buttons
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const button = mutation.target;
                if (button.classList.contains('highlighted')) {
                    select.value = button.dataset.modulation;
                }
            }
        });

        // Check if no button is highlighted
        const anyHighlighted = Array.from(modeButtons).some(btn => btn.classList.contains('highlighted'));
        if (!anyHighlighted) {
            select.value = ''; // Select the empty option
        }
    });

    // Observe each button for class attribute changes
    modeButtons.forEach(button => {
        observer.observe(button, { attributes: true, attributeFilter: ['class'] });
    });

    // Set the initial value of the dropdown menu based on the highlighted button
    const highlighted = modesGrid.querySelector('.highlighted');
    if (highlighted) {
        select.value = highlighted.dataset.modulation;
    } else {
        select.value = ''; // If none are highlighted, select the empty option
    }
}

Plugins.compact_analog_modes.init = async function () {

    // Create an observer to monitor the addition of the modes grid
    const observer = new MutationObserver((mutationsList, observer) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const target = document.querySelector('.openwebrx-modes-grid');
                const buttons = target?.querySelectorAll('.openwebrx-demodulator-button');

                // If the grid and buttons are present, apply the changes
                if (target && buttons && buttons.length > 0) {
                    doChanges();
                    observer.disconnect(); // Stop observing
                }
            }
        }
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    return true;
}
