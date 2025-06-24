/**
 * countrySelection.js - Country selection modal for tariff application
 * 
 * This module handles selecting countries by continent and applying tariffs to the selected countries.
 * It integrates with the ProductTariffModal to select tariffs and the global tariff functionality to apply them.
 */

var CountrySelectionModal = (function() {
    // Module state
    let selectedISOs = [];
    let isoToCountryName = {};
    let continentData = {};

    /**
     * Initialize the country selection modal
     * @returns {Promise<boolean>} A promise that resolves to true when initialization is complete
     */
    async function initialize() {
        try {
            // Load country data from the continent mapping file
            const response = await fetch(DataPaths.meta.country_continent);
            if (!response.ok) {
                throw new Error(`Failed to load country data: ${response.status}`);
            }
            
            continentData = await response.json();
            
            // Load modal HTML template
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) {
                console.error("Modal container not found");
                return false;
            }
            
            // Create the country selection modal HTML
            const modalHtml = `
                <div id="modal-country-selection" class="modal">
                    <div class="modal-content bilateral-modal">
                        <button class="modal-close"><img src="assets/fontawesome/xmark.svg" alt="Close" class="close-icon"></button>
                        <div class="modal-header">
                            <h2>Select Countries for Tariff Application</h2>
                            <div class="separator"></div>
                            <p>
                                <strong>How to use this page:</strong>
                            </p>
                            <ol style="text-align: left; margin-top: 5px; padding-left: 20px;">
                                <li>Click the <strong>▶</strong> next to a continent to see its countries</li>
                                <li>Select one or more countries by checking the boxes</li>
                                <li>Click the "Continue to Tariff Selection" button when done</li>
                            </ol>
                            <p style="margin-top: 5px; font-size: 0.9em;">
                                <em>Tip: Check a continent box to select all countries in that continent</em>
                            </p>
                            <div class="separator"></div>
                            <div style="display: flex; justify-content: center; margin-top: 10px;">
                                <button id="select-all-countries" class="receipt-btn">Select All Countries</button>
                                <button id="clear-all-countries" class="receipt-btn" style="margin-left: 10px;">Clear Selection</button>
                            </div>
                        </div>
                        <div class="modal-body">
                            <div style="display: flex; justify-content: center; margin: 10px 0;">
                                <input type="text" id="country-search-input" placeholder="Search for a country..."
                                    style="width: 100%; max-width: 300px; padding: 8px; border: 1px solid var(--borderColor); background-color: var(--background-color); color: var(--text-color); border-radius: var(--borderRadius);">
                            </div>
                            
                            <!-- Selected countries counter -->
                            <div id="selected-counter" style="text-align: center; margin: 10px 0; font-weight: bold;">
                                0 countries selected
                            </div>
                            
                            <!-- This is where the collapsible country list will be injected -->
                            <div id="continent-list"></div>
                        </div>
                        <div class="modal-footer">
                            <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                                <button id="continue-to-tariff" class="receipt-btn" style="font-size: 1.05em; padding: 10px 20px;">
                                    Continue to Tariff Selection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal HTML to the container
            modalContainer.innerHTML += modalHtml;
            
            // We won't add custom CSS here as we'll use the existing styles from modal.css
            // These styles already have proper dark mode support with CSS variables
            
            // Initialize the UI with country data
            initializeUI();
            
            // Set up event listeners
            setupEventListeners();
            
            return true;
        } catch (error) {
            console.error('Error initializing country selection modal:', error);
            return false;
        }
    }
    
    /**
     * Set up event listeners for the modal
     */
    function setupEventListeners() {
        // Handle modal close button - use event delegation
        document.addEventListener('click', function(e) {
            if (e.target && e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal && modal.id === 'modal-country-selection') {
                    closeModal();
                }
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                const modal = document.getElementById('modal-country-selection');
                if (modal && modal.style.display !== 'none') {
                    closeModal();
                }
            }
        });
        
        // We've moved keyboard handling directly to each checkbox
        // No need for global event delegation for Enter key
        
        // Select all countries button
        const selectAllBtn = document.getElementById('select-all-countries');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', selectAllCountries);
        }
        
        // Clear all countries button
        const clearAllBtn = document.getElementById('clear-all-countries');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', clearAllCountries);
        }
        
        // Continue to tariff selection button
        const continueBtn = document.getElementById('continue-to-tariff');
        if (continueBtn) {
            continueBtn.addEventListener('click', continueToTariffSelection);
        }
        
        // Search functionality
        const searchInput = document.getElementById('country-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', handleSearch);
            
            // Add Enter key functionality
            searchInput.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' && selectedISOs.length > 0) {
                    event.preventDefault();
                    continueToTariffSelection();
                }
            });
        }
    }
    
    /**
     * Initialize the UI with country data
     */
    function initializeUI() {
        renderContinents(continentData);
        updateSelectedCounter();
    }
    
    /**
     * Render the continent blocks with countries
     */
    function renderContinents(data) {
        const container = document.getElementById('continent-list');
        if (!container) return;
        
        container.innerHTML = ''; // Clear previous content
        
        Object.keys(data).forEach(continent => {
            const countries = data[continent];
            
            // Create a container for the continent block
            const block = document.createElement('div');
            block.classList.add('continent-block');
            
            // Create the header with toggle icon, continent name, and checkbox
            const header = document.createElement('div');
            header.classList.add('continent-header');
            
            const toggleIcon = document.createElement('span');
            toggleIcon.classList.add('toggle-icon');
            toggleIcon.innerHTML = '<img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-icon-img">'; // Initially collapsed
            
            const titleSpan = document.createElement('span');
            titleSpan.classList.add('title');
            titleSpan.textContent = continent;
            
            const continentCheckbox = document.createElement('input');
            continentCheckbox.type = 'checkbox';
            continentCheckbox.classList.add('continent-select');
            continentCheckbox.style.marginRight = '25px'; // Add right margin to prevent being cut off
            continentCheckbox.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Check the current state to determine action
                const isChecking = continentCheckbox.checked;
                
                // Get all country checkboxes in this continent
                const countryCheckboxes = countryList.querySelectorAll('input[type="checkbox"]');
                
                // Update each country checkbox
                countryCheckboxes.forEach(checkbox => {
                    // Only update if the state is different
                    if (checkbox.checked !== isChecking) {
                        checkbox.checked = isChecking;
                        
                        // Get the ISO code from the data attribute
                        const isoCode = checkbox.getAttribute('data-iso');
                        
                        // Update selectedISOs array accordingly
                        if (isChecking) {
                            addISO(isoCode);
                        } else {
                            removeISO(isoCode);
                        }
                    }
                });
                
                updateSelectedCounter();
            });
            
            header.appendChild(toggleIcon);
            header.appendChild(titleSpan);
            
            // Create a container for the checkbox to position it properly
            const checkboxContainer = document.createElement('div');
            checkboxContainer.style.marginLeft = 'auto'; // Push to the right
            checkboxContainer.style.marginRight = '15px'; // Space from the right edge
            checkboxContainer.appendChild(continentCheckbox);
            header.appendChild(checkboxContainer);
            
            // Create the collapsible country list
            const countryList = document.createElement('ul');
            countryList.classList.add('country-list');
            countryList.style.display = 'none'; // Initially collapsed
            
            // Add click handler for continent header to toggle visibility
            header.addEventListener('click', function(e) {
                if (e.target.tagName.toLowerCase() !== 'input') {
                    if (countryList.style.display === 'none') {
                        countryList.style.display = 'block';
                        toggleIcon.innerHTML = '<img src="assets/fontawesome/chevron-down-solid.svg" alt="Collapse" class="toggle-icon-img">';
                    } else {
                        countryList.style.display = 'none';
                        toggleIcon.innerHTML = '<img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-icon-img">';
                    }
                }
            });
            
            block.appendChild(header);
            
            // Add countries to the list
            countries.forEach(country => {
                const li = document.createElement('li');
                li.classList.add('country-item');
                
                const countryCheckbox = document.createElement('input');
                countryCheckbox.type = 'checkbox';
                
                // Handle special case for countries with array values
                const isoCode = Array.isArray(country.ISO_A3) ? country.ISO_A3[0] : country.ISO_A3;
                const countryName = Array.isArray(country.country) ? country.country[0] : country.country;
                
                // Store country name to ISO mapping
                isoToCountryName[isoCode] = countryName;
                
                // Set data attribute for later reference
                countryCheckbox.setAttribute('data-iso', isoCode);
                
                // Check if this country is already selected
                if (selectedISOs.includes(isoCode)) {
                    countryCheckbox.checked = true;
                }
                
                // Add unique ID for label association
                const checkboxId = `country-checkbox-${isoCode}`;
                countryCheckbox.id = checkboxId;
                
                // Add keydown listener for Enter key to handle keyboard accessibility
                countryCheckbox.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        //console.log('Enter pressed on checkbox, simulating click');
                        e.preventDefault();
                        // Simply simulate a click on the checkbox
                        this.click();
                    }
                });
                
                // Add event listener for checkbox changes
                countryCheckbox.addEventListener('change', function() {
                    //console.log('Checkbox change event fired, checked:', this.checked);
                    if (this.checked) {
                        addISO(isoCode);
                    } else {
                        removeISO(isoCode);
                    }
                    
                    // Update continent checkbox state based on all country checkboxes
                    const allChecked = Array.from(countryList.querySelectorAll('input[type="checkbox"]'))
                        .every(cb => cb.checked);
                    const anyChecked = Array.from(countryList.querySelectorAll('input[type="checkbox"]'))
                        .some(cb => cb.checked);
                    
                    continentCheckbox.checked = allChecked;
                    continentCheckbox.indeterminate = anyChecked && !allChecked;
                    
                    updateSelectedCounter();
                });
                
                const label = document.createElement('label');
                label.textContent = countryName;
                // Associate with checkbox for better accessibility
                label.setAttribute('for', checkboxId);
                
                li.appendChild(countryCheckbox);
                li.appendChild(label);
                countryList.appendChild(li);
            });
            
            block.appendChild(countryList);
            container.appendChild(block);
        });
    }
    
    /**
     * Add an ISO code to the selected list
     */
    function addISO(isoCode) {
        if (!selectedISOs.includes(isoCode)) {
            selectedISOs.push(isoCode);
        }
    }
    
    /**
     * Remove an ISO code from the selected list
     */
    function removeISO(isoCode) {
        selectedISOs = selectedISOs.filter(iso => iso !== isoCode);
    }
    
    /**
     * Select all countries
     */
    function selectAllCountries() {
        // Find all country checkboxes
        const countryCheckboxes = document.querySelectorAll('.country-item input[type="checkbox"]');
        
        // Check each one and add to selectedISOs
        countryCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            const isoCode = checkbox.getAttribute('data-iso');
            addISO(isoCode);
        });
        
        // Check all continent checkboxes
        const continentCheckboxes = document.querySelectorAll('.continent-select');
        continentCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            checkbox.indeterminate = false;
        });
        
        updateSelectedCounter();
    }
    
    /**
     * Clear all country selections
     */
    function clearAllCountries() {
        // Find all country checkboxes
        const countryCheckboxes = document.querySelectorAll('.country-item input[type="checkbox"]');
        
        // Uncheck each one
        countryCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Uncheck all continent checkboxes
        const continentCheckboxes = document.querySelectorAll('.continent-select');
        continentCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.indeterminate = false;
        });
        
        // Clear the selectedISOs array
        selectedISOs = [];
        
        updateSelectedCounter();
    }
    
    /**
     * Handle search input
     */
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        if (!searchTerm) {
            // If search is cleared, show all continents with original data
            renderContinents(continentData);
            return;
        }
        
        // Filter the continent data based on the search term
        let filteredData = {};
        
        Object.keys(continentData).forEach(continent => {
            const filteredCountries = continentData[continent].filter(country => {
                // Access the correct property - country.country instead of country.name
                const countryName = Array.isArray(country.country) ? country.country[0] : country.country;
                return countryName && countryName.toLowerCase().includes(searchTerm);
            });
            
            if (filteredCountries.length > 0) {
                filteredData[continent] = filteredCountries;
            }
        });
        
        // Render the filtered data
        renderContinents(filteredData);
        
        // Expand all continents that have matching countries
        document.querySelectorAll('.continent-header').forEach(header => {
            const countryList = header.nextElementSibling;
            if (countryList && countryList.children.length > 0) {
                countryList.style.display = 'block';
                const toggleIcon = header.querySelector('.toggle-icon');
                if (toggleIcon) {
                    toggleIcon.innerHTML = '<img src="assets/fontawesome/chevron-down-solid.svg" alt="Collapse" class="toggle-icon-img">';
                }
            }
        });
    }
    
    /**
     * Update the selected countries counter
     */
    function updateSelectedCounter() {
        const counter = document.getElementById('selected-counter');
        if (counter) {
            counter.textContent = `${selectedISOs.length} countries selected`;
            
            // Update the continue button state
            const continueBtn = document.getElementById('continue-to-tariff');
            if (continueBtn) {
                if (selectedISOs.length > 0) {
                    continueBtn.removeAttribute('disabled');
                    continueBtn.style.opacity = '1';
                } else {
                    continueBtn.setAttribute('disabled', 'true');
                    continueBtn.style.opacity = '0.5';
                }
            }
        }
    }
    
    /**
     * Continue to tariff selection
     */
    function continueToTariffSelection() {
        //console.log('=== CONTINUE TO TARIFF SELECTION ===');
        //console.log('Initial selectedISOs:', JSON.stringify(selectedISOs));
        
        if (selectedISOs.length === 0) {
            alert('Please select at least one country before continuing.');
            return;
        }
        
        // Create a permanent copy of the selected ISOs before any other operations
        const permanentIsoCopy = [...selectedISOs];
        //console.log('Created permanent ISO copy:', JSON.stringify(permanentIsoCopy));
        
        // Store in window for debugging
        window.debugSelectedISOs = permanentIsoCopy;
        
        // Close the country selection modal
        closeModal();
        
        //console.log('After closeModal, selectedISOs:', JSON.stringify(selectedISOs));
        
        // Check if ProductTariffModal is available
        if (window.ProductTariffModal && typeof window.ProductTariffModal.openModal === 'function') {
            // Initialize if needed
            if (window.initializeProductTariffModal) {
                window.initializeProductTariffModal();
            }
            
            
            // Create a new multi-country submission handler that uses the permanent copy
            const multiCountrySubmitHandler = function(tariffData) {

                
                // Force the isoList in tariffData to use our permanent copy
                tariffData.isoList = permanentIsoCopy;
                
                // Force the iso_list in case it's set differently
                if (!tariffData.iso_list) {
                    tariffData.iso_list = permanentIsoCopy;
                }
                
                //console.log('Final tariffData.isoList:', JSON.stringify(tariffData.isoList));
                
                // Call the handler with our permanent copy
                handleSelectedCountryTariffSubmit(tariffData, permanentIsoCopy);
            };
            
            // Open the product tariff modal with special handling for the selected countries
            // Use 'global' submission mode like the global tariff implementation, since it's working
            window.ProductTariffModal.openModal(permanentIsoCopy[0] || 'WLD', { 
                useOriginalCurrentMode: false,
                isGlobalTariff: true,
                isoList: permanentIsoCopy, // Use the permanent copy
                submissionMode: 'global', // Use global mode like the working implementation
                onSubmit: multiCountrySubmitHandler
            });
            
            //console.log('After openModal, selectedISOs:', JSON.stringify(selectedISOs));
            //console.log('Permanent copy is still:', JSON.stringify(permanentIsoCopy));
        } else {
            alert('Product tariff modal not available. Please try again later.');
        }
    }
    
    /**
     * Handle tariff submission for selected countries
     */
    function handleSelectedCountryTariffSubmit(tariffData, isoList) {
        // Check if we have the necessary data
        if (!tariffData || !tariffData.currentVector) {
            console.error('No tariff data available');
            alert('Error: Cannot process tariffs - missing required tariff data');
            return;
        }
        
        // Verify we have valid ISO list
        if (!isoList || isoList.length === 0) {
            console.error('No countries selected for tariff application');
            alert('Error: No countries selected. Please select at least one country.');
            return;
        }
        
        //console.log(`Preparing to process tariffs for ${isoList.length} countries:`, isoList);
        
        // Use the MDS helper functions to process the tariffs
        if (window.MdsHelperFunctions && window.TariffCalculations) {
            // Process the tariffs for multiple countries
            //console.log(`Processing tariffs for countries:`, isoList);
            window.MdsHelperFunctions.processMultiCountryTariffs(tariffData.currentVector, isoList)
                .then(processedTariffData => {
                    // Verify the processed data before continuing
                    const processedList = processedTariffData ? processedTariffData.iso_list : [];
                    /*console.log('Processed multi-country tariff data:', {
                        iso_list: processedList,
                        original_selection: isoList,
                        missing: isoList.filter(iso => !processedList.includes(iso))
                    });*/
                    
                    // Send to TariffCalculations for final processing
                    if (processedTariffData && processedTariffData.iso_list.length > 0) {
                        // Add submissionMode to ensure proper handling
                        processedTariffData.submissionMode = 'multi-country';
                        
                        return window.TariffCalculations.processTariffData(processedTariffData);
                    } else {
                        console.error('No valid tariff data generated for any country');
                        alert('Error: Could not apply tariffs to any of the selected countries. Please try again with different countries.');
                        return Promise.reject(new Error('No valid tariff data generated'));
                    }
                })
                .then(success => {
                    if (success) {
                        //console.log('Successfully processed multi-country tariffs');
                        
                        // Update receipt display
                        if (window.ReceiptModule && typeof window.ReceiptModule.updateReceiptDisplay === 'function') {
                            window.ReceiptModule.updateReceiptDisplay();
                        }
                        
                        // Update map colors
                        if (typeof window.updateMapColors === 'function') {
                            window.updateMapColors();
                        }
                    } else {
                        console.error('Failed to process multi-country tariffs');
                        alert('Error: Failed to process tariffs. Please try again.');
                    }
                })
                .catch(error => {
                    console.error('Error processing multi-country tariffs:', error);
                    alert('Error: ' + error.message);
                });
        } else {
            console.error('MDS helper functions or TariffCalculations not available');
            alert('Error: Required modules not properly initialized. Please try again later.');
        }
    }
    
    /**
     * Open the country selection modal
     */
    function openModal() {
        // First, check if a modal with this ID already exists
        let modal = document.getElementById('modal-country-selection');
        
        // If the modal exists, remove it to ensure we start fresh
        if (modal) {
            //console.log("Existing modal found, removing to reinitialize...");
            modal.parentNode.removeChild(modal);
            modal = null;
        }
        
        // Reset internal state
        selectedISOs = [];
        
        // Initialize a fresh modal
        if (!modal) {
            //console.log("Modal not found or was removed, initializing...");
            initialize().then(() => {
                //console.log("Initialization complete, opening modal...");
                
                // Get the newly created modal
                const newModal = document.getElementById('modal-country-selection');
                if (newModal) {
                    // Show the modal
                    newModal.style.display = 'flex';
                    newModal.style.alignItems = 'center';
                    newModal.style.justifyContent = 'center';
                    
                    // Reset selected count display
                    updateSelectedCounter();
                } else {
                    console.error("Failed to create modal");
                }
            });
            return;
        }
        
        // If we get here, we have an existing modal
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        
        // Reset selected count display
        updateSelectedCounter();
    }
    
    /**
     * Close the country selection modal
     */
    function closeModal() {
        const modal = document.getElementById('modal-country-selection');
        if (modal) {
            modal.style.display = 'none';
            
            // Reset the selected ISOs when closing to prevent issues when reopening
            selectedISOs = [];
            
            // Reset any UI state that might be persisting
            const continentCheckboxes = document.querySelectorAll('.continent-select');
            continentCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                checkbox.indeterminate = false;
            });
            
            const countryCheckboxes = document.querySelectorAll('.country-item input[type="checkbox"]');
            countryCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            // Update counter if it exists
            updateSelectedCounter();
        }
    }
    
    /**
     * Get the list of selected ISO codes
     */
    function getSelectedISOs() {
        return [...selectedISOs]; // Return a copy to prevent external modification
    }
    
    // Initialize on demand, not immediately
    
    // Public API
    return {
        initialize,
        openModal,
        closeModal,
        getSelectedISOs
    };
})();

// Define a global function to open the country selection modal
window.openCountrySelectionModal = function() {
    //console.log('Opening country selection modal');
    
    // Check for existing modals and remove them first
    const existingModals = document.querySelectorAll('.modal');
    existingModals.forEach(modal => {
        // Check if this is our modal or a different one
        if (modal.id === 'modal-country-selection') {
            //console.log('Found existing country selection modal, removing it before reopening');
            modal.parentNode.removeChild(modal);
        }
    });
    
    // Initialize if needed
    if (CountrySelectionModal) {
        // Force re-initialization to ensure a clean state
        CountrySelectionModal.initialize().then(() => {
            CountrySelectionModal.openModal();
        });
    } else {
        alert('Country selection modal not available. Please try again later.');
    }
};