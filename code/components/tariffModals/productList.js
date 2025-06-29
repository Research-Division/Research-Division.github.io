/**
 * productList.js - Country-specific product tariff modal
 * 
 * This file manages the product-level tariff editor modal for a specific country.
 * It allows users to edit tariffs at the section, chapter, and HS4 level with bidirectional
 * propagation of changes.
 */


// Create a namespace for the module
var ProductTariffModal = (function() {
    // Module state
    let selectedCountry = null;
    let sectionToHs4Mapping = {};
    let sectionWeights = {};
    let beaSectionWeights = {};
    let beaImportWeights = {};
    let bilateralTariffs = {};
    let sectionIdToName = {};
    let currentPassThroughRate = 1.0; // Default 100%
    let showOriginalAndCurrentTariffs = true; // Toggle between tariff modes - default to original/current mode
    let isGlobalTariff = false; // Whether this is a global tariff application
    let submissionMode = 'country'; // Explicit submission mode: 'country' or 'global'
    let onSubmitCallback = null; // Custom callback for when tariffs are submitted
    
    // Store the expanded state of sections and chapters
    let expandedSections = new Set();
    let expandedChapters = new Set();
    
    // The tariff propagator instance
    let tariffPropagator = null;
    
    // Flag to indicate if data needs reloading after clearing
    let needsDataReload = false;
    
    /**
     * Initialize the product tariff modal
     * @returns {Promise<boolean>} A promise that resolves to true when initialization is complete
     */
    async function initialize() {
        try {
            // Load modal HTML template
            const modalContainer = document.getElementById('modal-container');
            if (!modalContainer) {
                console.error("Modal container not found");
                return false;
            }
            
            // Fetch HTML from the simple_tariff_integration.html file using DataPaths
            const response = await fetch(DataPaths.components.tariffModals.productList);
            if (!response.ok) {
                throw new Error(`Failed to load product tariff modal HTML: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Extract the modal HTML (between comments or specific div)
            const modalHtml = extractModalHtml(html);
            
            // Add modal HTML to the container
            if (modalHtml) {
                // Append to modal container
                modalContainer.innerHTML += modalHtml;
                
                // Add any missing CSS classes needed for the product tariff modal
                const styleElement = document.createElement('style');
                styleElement.textContent = `'`;
                document.head.appendChild(styleElement);
            }
            
            
            // Load required data for tariff propagation
            await Promise.all([
                loadJSON(DataPaths.meta.section_to_chapters).then(data => {
                    console.log('hs4 loaded');
                    sectionToHs4Mapping = data;
                }),
                loadJSON(DataPaths.calculations.hs_section_weights).then(data => {
                    console.log('section weights loaded');
                    sectionWeights = data;
                }),
                loadJSON(DataPaths.calculations.bea_section_weights).then(data => {
                    console.log('bea section weights loaded');
                    beaSectionWeights = data;
                }),
                loadJSON(DataPaths.calculations.importVector).then(data => {
                    console.log('bea import weights loaded');
                    beaImportWeights = data;
                }),
                loadJSON(DataPaths.bilateral_tariffs.section.statutory).then(data => {
                    bilateralTariffs = data;
                    // Create mapping between section IDs and names
                    if (Object.keys(bilateralTariffs).length > 0) {
                        const anySample = Object.values(bilateralTariffs)[0];
                        if (anySample && anySample.sectors) {
                            sectionIdToName = {};
                            anySample.sectors.forEach(s => {
                                if (s.code && s.name) {
                                    sectionIdToName[s.code.toString()] = s.name;
                                }
                            });
                        }
                    }
                })
            ]);
            
            
            // Initialize the tariff propagator and wait for it to complete
            await initializeTariffPropagator();
            
            // Set up event listeners
            setupEventListeners();
            
            return true;
        } catch (error) {
            console.error('Error initializing product tariff modal:', error);
            return false;
        }
    }
    
    /**
     * Reload all data files - used after clearing to ensure fresh data
     * @returns {Promise<void>} A promise that resolves when all data is loaded
     */
    async function reloadAllData() {
        console.log('ProductTariffModal: Reloading all data...');
        
        // Load required data for tariff propagation
        await Promise.all([
            loadJSON(DataPaths.meta.section_to_chapters).then(data => {
                console.log('hs4 reloaded');
                sectionToHs4Mapping = data;
            }),
            loadJSON(DataPaths.calculations.hs_section_weights).then(data => {
                console.log('section weights reloaded');
                sectionWeights = data;
            }),
            loadJSON(DataPaths.calculations.bea_section_weights).then(data => {
                console.log('bea section weights reloaded');
                beaSectionWeights = data;
            }),
            loadJSON(DataPaths.calculations.importVector).then(data => {
                console.log('bea import weights reloaded');
                beaImportWeights = data;
            }),
            loadJSON(DataPaths.bilateral_tariffs.section.statutory).then(data => {
                bilateralTariffs = data;
                // Create mapping between section IDs and names
                if (Object.keys(bilateralTariffs).length > 0) {
                    const anySample = Object.values(bilateralTariffs)[0];
                    if (anySample && anySample.sectors) {
                        sectionIdToName = {};
                        anySample.sectors.forEach(s => {
                            if (s.code && s.name) {
                                sectionIdToName[s.code.toString()] = s.name;
                            }
                        });
                    }
                }
            })
        ]);
        
        // Reset the needs reload flag
        needsDataReload = false;
        
        console.log('ProductTariffModal: Data reload complete');
    }
    
    /**
     * Extract modal HTML from the full HTML file
     */
    function extractModalHtml(html) {
        // Look for the modal div
        const modalRegex = /<div id="modal-product-list" class="modal"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
        const match = html.match(modalRegex);
        
        if (match && match[0]) {
            // Modify the HTML to add proper styling and remove onclick that causes errors
            let modifiedHtml = match[0]
                .replace('class="modal-content"', 'class="modal-content bilateral-modal"')
                .replace('onclick="closeModal(\'modal-product-list\')"', '')
                // Add chart container before the modal footer
                .replace('<div class="modal-footer">', 
                    `<div id="tariff-chart-container" style="width: 100%; height: 300px; margin: 10px 0 0 0; padding: 0 20px;"></div>
                    <div class="dashed-separator"></div>
                    <div class="modal-footer solid-bg">`)
                // Update the footer button style for better visibility
                .replace('<button id="tariffSubmit" class="receipt-btn">',
                    '<button id="tariffSubmit" class="receipt-btn" style="font-size: 0.95em; padding: 10px 24px;">');
                
            return modifiedHtml;
        }
        
        console.error("Could not extract modal HTML");
        return null;
    }
    
    /**
     * Initialize the tariff propagator
     * @returns {Promise<void>} A promise that resolves when the tariff propagator is initialized
     */
    async function initializeTariffPropagator() {
        try {
            // Use the TariffPropagation class directly (now it's a global variable due to IIFE)
            if (typeof window.TariffPropagation !== 'function') {
                console.error("TariffPropagation class not found. Make sure simpleTariffPropagation.js is loaded.");
                throw new Error("TariffPropagation class not found");
            }
            
            tariffPropagator = new TariffPropagation();
            
            // Initialize the tariff propagator with our data
            tariffPropagator.initialize({
                sectionToHs4Mapping,
                sectionWeights,
                beaSectionWeights,
                beaImportWeights,
                getTariffOriginalData
            });
            
        } catch (error) {
            console.error("Failed to initialize tariff propagation:", error);
            throw error; // Re-throw to be caught by the calling function
        }
    }
    
    /**
     * Setup event listeners for the modal
     */
    function setupEventListeners() {
        // Close modal button - use event delegation for dynamic elements
        document.addEventListener('click', function(e) {
            // Handle modal close button
            if (e.target && e.target.classList.contains('modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    // For global tariff (WLD), ensure it's removed from selectedISOs
                    if (selectedCountry === 'WLD' && window.selectedISOs) {
                        window.selectedISOs = window.selectedISOs.filter(iso => iso !== 'WLD');
                    }
                    
                    // Force reset of all state variables
                    isGlobalTariff = false;
                    submissionMode = 'country';
                    onSubmitCallback = null;
                    
                    // Close the modal with forced reset
                    closeModal(modal.id, true);
                }
            }
            
            // Handle submit button using event delegation
            if (e.target && (e.target.id === 'tariffSubmit' || 
                (e.target.tagName === 'BUTTON' && e.target.textContent.includes('Submit')))) {
                handleTariffSubmit();
            }
            
            // Handle toggle mode button using event delegation
            if (e.target && e.target.id === 'toggle-mode-btn') {
                toggleInputMode();
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                const modal = document.getElementById('modal-product-list');
                if (modal && modal.style.display !== 'none') {
                    // For global tariff (WLD), ensure it's removed from selectedISOs
                    if (selectedCountry === 'WLD' && window.selectedISOs) {
                        window.selectedISOs = window.selectedISOs.filter(iso => iso !== 'WLD');
                    }
                    
                    // Force reset of all state variables
                    isGlobalTariff = false;
                    submissionMode = 'country';
                    onSubmitCallback = null;
                    
                    // Close the modal with forced reset
                    closeModal('modal-product-list', true);
                }
            }
        });
        
        // For backward compatibility, also add direct listeners if the elements exist now
        // These may be redundant but ensure existing code paths still work
        const toggleModeBtn = document.getElementById('toggle-mode-btn');
        if (toggleModeBtn) {
            // Remove any existing listeners to prevent duplicates
            toggleModeBtn.removeEventListener('click', toggleInputMode);
            toggleModeBtn.addEventListener('click', toggleInputMode);
        }
        
        // Add submit button event listener
        const submitBtn = document.getElementById('tariffSubmit');
        if (submitBtn) {
            // Remove any existing listeners to prevent duplicates
            submitBtn.removeEventListener('click', handleTariffSubmit);
            
            // Add with specific context information to help with debugging
            const boundHandleTariffSubmit = function(e) {
                handleTariffSubmit(e);
            };
            
            // Store the function reference for later cleanup
            submitBtn._boundHandleTariffSubmit = boundHandleTariffSubmit;
            submitBtn.addEventListener('click', boundHandleTariffSubmit);
            
            // Add a direct onclick attribute as a fallback
            submitBtn.setAttribute('onclick', 'if(window.ProductTariffModal) window.ProductTariffModal.handleTariffSubmit()');
        }
        
        // Add event listener for tariff-all-input
        const allTariffInput = document.getElementById('tariff-all-input');
        if (allTariffInput) {
            // Remove any existing listeners to prevent duplicates
            if (allTariffInput._boundChangeHandler) {
                allTariffInput.removeEventListener('change', allTariffInput._boundChangeHandler);
            }
            
            // Add focus event listener for warning popup
            allTariffInput.addEventListener('focus', function() {
                // Check if warning popup already exists
                let warningPopup = document.getElementById('all-tariff-warning-popup');
                if (!warningPopup) {
                    // Create warning popup
                    warningPopup = document.createElement('div');
                    warningPopup.id = 'all-tariff-warning-popup';
                    warningPopup.style.cssText = `
                        position: absolute;
                        background: var(--background-color, white);
                        border: 2px solid var(--warning, #f0ad4e);
                        border-radius: 4px;
                        padding: 10px 15px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                        font-size: 14px;
                        font-family: var(--font-family-monospace);
                        color: var(--text-color);
                        z-index: 10000;
                        max-width: 300px;
                        pointer-events: none;
                    `;
                    warningPopup.innerHTML = `
                        <div style="display: flex; align-items: flex-start; gap: 8px;">
                            <span style="color: var(--warning, #f0ad4e); font-weight: bold;">⚠</span>
                            <span>Changing this value will override all current industry-level tariff values. Make sure this is what you want before proceeding.</span>
                        </div>
                    `;
                    
                    // Position the popup above the input
                    const rect = allTariffInput.getBoundingClientRect();
                    const modalRect = allTariffInput.closest('.modal-content').getBoundingClientRect();
                    warningPopup.style.left = (rect.left - modalRect.left) + 'px';
                    warningPopup.style.top = (rect.top - modalRect.top - 80) + 'px';
                    
                    // Add to modal content
                    allTariffInput.closest('.modal-content').appendChild(warningPopup);
                    
                    // Remove popup when input loses focus
                    allTariffInput.addEventListener('blur', function() {
                        setTimeout(() => {
                            if (warningPopup && warningPopup.parentNode) {
                                warningPopup.parentNode.removeChild(warningPopup);
                            }
                        }, 200);
                    }, { once: true });
                }
            });
            
            // Create bound handler for the change event
            const boundChangeHandler = function(e) {
                const value = parseFloat(e.target.value) || 0;
                
                // Update global pass-through rate from the input
                const passThroughInput = document.getElementById('tariff-all-passthrough');
                if (passThroughInput) {
                    currentPassThroughRate = (parseFloat(passThroughInput.value) || 100) / 100;
                }
                
                // Update all section values based on the mode
                if (value >= 0 && selectedCountry && tariffPropagator) {
                    Object.keys(sectionToHs4Mapping).forEach(sectionId => {
                        if (showOriginalAndCurrentTariffs) {
                            // In original/current mode: current = original + (additional × pass-through)
                            const originalValue = tariffPropagator.getTariffValue('section', sectionId, null, null, selectedCountry, 'original');
                            const newValue = originalValue + (value * currentPassThroughRate);
                            tariffPropagator.updateTariff('section', sectionId, null, null, newValue, selectedCountry, 'current');
                        } else {
                            // In tariff-change mode: value = additional × pass-through
                            tariffPropagator.updateTariff('section', sectionId, null, null, value * currentPassThroughRate, selectedCountry);
                        }
                    });
                    
                    // Refresh the hierarchical view to show the updated values
                    buildHierarchicalView();
                }
            };
            
            // Store the function reference for later cleanup
            allTariffInput._boundChangeHandler = boundChangeHandler;
            allTariffInput.addEventListener('change', boundChangeHandler);
        }
    }
    
    /**
     * Helper function to load JSON data
     */
    async function loadJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error loading ${url}:`, error);
            throw error;
        }
    }
    
    /**
     * Get original tariff data for a section
     */
    function getTariffOriginalData(countryIso, sectionId) {
        if (!bilateralTariffs || !bilateralTariffs[countryIso]) {
            return { usTariff: 0 };
        }
        
        // Get section name from the sectionIdToName mapping
        const sectionName = sectionIdToName[sectionId];
        
        // If no section name, log error and return 0
        if (!sectionName) {
            console.error(`No section name found for ID: ${sectionId}`);
            return { usTariff: 0 };
        }
        
        // Get tariff year (default to 2021)
        const tariffYear = 2021;
        
        // Get sector data
        if (bilateralTariffs[countryIso].sector_data && 
            bilateralTariffs[countryIso].sector_data[tariffYear] && 
            bilateralTariffs[countryIso].sector_data[tariffYear][sectionName]) {
            
            const tariffValue = bilateralTariffs[countryIso].sector_data[tariffYear][sectionName].us_to_country || 0;
            return { 
                code: parseInt(sectionId, 10),
                usTariff: tariffValue
            };
        }
        
        return { usTariff: 0 };
    }
    
    /**
     * Open the product tariff modal for a specific country
     * @param {string} countryIso - The ISO code of the country
     * @param {Object} options - Optional settings for the modal
     * @param {boolean} options.useOriginalCurrentMode - Whether to use original/current mode (true) or tariff change mode (false)
     * @param {boolean} options.isGlobalTariff - Whether this is a global tariff application
     * @param {Function} options.onSubmit - Callback function to call when tariffs are submitted
     */
    async function openModal(countryIso, options = {}) {
        // Clean up any existing event listeners first to prevent duplicates
        cleanupEventListeners();
        
        // Reset state variables to prevent issues from previous modal opens
        isGlobalTariff = false;
        onSubmitCallback = null;
        
        // Apply options if provided
        if (options.useOriginalCurrentMode !== undefined) {
            showOriginalAndCurrentTariffs = options.useOriginalCurrentMode;
        }
        
        // Set global tariff flag
        isGlobalTariff = options.isGlobalTariff === true;
        
        // Store explicit submission mode if provided
        submissionMode = options.submissionMode || 'country'; // Default to country-specific
        
        // Set custom submit callback if provided
        onSubmitCallback = typeof options.onSubmit === 'function' ? options.onSubmit : null;
        
        // Check if we need to reload data after clearing
        if (needsDataReload) {
            console.log('ProductTariffModal: Data reload needed, reloading...');
            try {
                await reloadAllData();
                // Reinitialize the tariff propagator with fresh data
                await initializeTariffPropagator();
            } catch (error) {
                console.error("Failed to reload data:", error);
                alert("Failed to reload tariff data. Please refresh the page and try again.");
                return;
            }
        }
        
        // Ensure calculation data is loaded first
        if (window.TariffCalculations && typeof window.TariffCalculations.loadCalculationsData === 'function') {
            try {
                // Preload calculation data with persist flag to cache the matrices
                await window.TariffCalculations.loadCalculationsData({ persist: true });
            } catch (err) {
                console.warn("Failed to preload calculation data:", err);
                // Continue anyway, as we'll show an error in the UI if needed
            }
        }
        
        // First initialize if not already done
        if (!document.getElementById('modal-product-list')) {
            try {
                await initialize();
                // After initialization complete, call openModal again with same options
                openModal(countryIso, options);
                return;
            } catch (error) {
                console.error("Failed to initialize product list modal:", error);
                alert("Failed to initialize the tariff selection. Please try again.");
                return;
            }
        }
        
        // Set the selected country
        selectedCountry = countryIso;
        
        const modal = document.getElementById('modal-product-list');
        if (!modal) {
            console.error("Product tariff modal not found in DOM");
            return;
        }
        
        // Update modal title to show the country name or indicate global tariffs
        let titleText;
        if (isGlobalTariff) {
            titleText = 'Global Tariff Application';
        } else {
            const countryName = window.isoToCountryName ? window.isoToCountryName[countryIso] : countryIso;
            titleText = `Product Tariffs for ${countryName}`;
        }
        
        const modalTitle = modal.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = titleText;
        }
        
        // Fix closeModal call on the modal close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.removeAttribute('onclick');
            closeBtn.addEventListener('click', () => closeModal('modal-product-list'));
        }
        
        // Check if tariff propagator is initialized
        if (!tariffPropagator) {
            // Show loading message in the tree container
            const treeContainer = document.getElementById('tariff-tree');
            if (treeContainer) {
                treeContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Loading tariff data...</p>';
            }
            
            // Open the modal to show the loading message
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            
            // Initialize tariff propagator and then update the view
            initializeTariffPropagator().then(() => {
                // Pre-calculate weights for the country
                tariffPropagator.preCalculateWeights(countryIso);
                
                // Initialize current tariffs from original tariffs if needed
                if (showOriginalAndCurrentTariffs) {
                    
                    // Check if we have original tariffs
                    if (tariffPropagator.originalTariffs && tariffPropagator.originalTariffs[countryIso]) {
                        // Initialize current tariffs container if it doesn't exist
                        if (!tariffPropagator.currentTariffs) {
                            tariffPropagator.currentTariffs = {};
                        }
                        if (!tariffPropagator.currentTariffs[countryIso]) {
                            tariffPropagator.currentTariffs[countryIso] = {};
                        }
                        
                        // Copy original tariffs to current tariffs for all keys
                        Object.keys(tariffPropagator.originalTariffs[countryIso]).forEach(key => {
                            const originalValue = tariffPropagator.originalTariffs[countryIso][key];
                            if (originalValue !== undefined && originalValue > 0) {
                                tariffPropagator.currentTariffs[countryIso][key] = originalValue;
                            }
                        });
                    }
                }
                
                // Build the hierarchical view
                buildHierarchicalView();
            }).catch(error => {
                console.error("Failed to initialize tariff propagator:", error);
                const treeContainer = document.getElementById('tariff-tree');
                if (treeContainer) {
                    treeContainer.innerHTML = '<p style="text-align:center; padding: 20px; color: red;">Failed to load tariff data. Please try again.</p>';
                }
            });
            return;
        }
        
        // Pre-calculate weights for the country
        tariffPropagator.preCalculateWeights(countryIso);
        
        // Initialize current tariffs from original tariffs if needed
        if (showOriginalAndCurrentTariffs) {
            
            // Check if we have original tariffs
            if (tariffPropagator.originalTariffs && tariffPropagator.originalTariffs[countryIso]) {
                // Initialize current tariffs container if it doesn't exist
                if (!tariffPropagator.currentTariffs) {
                    tariffPropagator.currentTariffs = {};
                }
                if (!tariffPropagator.currentTariffs[countryIso]) {
                    tariffPropagator.currentTariffs[countryIso] = {};
                }
                
                // Copy original tariffs to current tariffs for all keys
                Object.keys(tariffPropagator.originalTariffs[countryIso]).forEach(key => {
                    const originalValue = tariffPropagator.originalTariffs[countryIso][key];
                    if (originalValue !== undefined && originalValue > 0) {
                        tariffPropagator.currentTariffs[countryIso][key] = originalValue;
                    }
                });
            }
        }
        
        // Build the hierarchical view
        buildHierarchicalView();
        
        // Reset the all-industry tariff input field to 0
        const allTariffInput = document.getElementById('tariff-all-input');
        if (allTariffInput) {
            allTariffInput.value = "0";
            
            // Ensure event listener is attached after modal is shown
            if (!allTariffInput._boundChangeHandler) {
                // Add focus event listener for warning popup
                allTariffInput.addEventListener('focus', function() {
                    // Check if warning popup already exists
                    let warningPopup = document.getElementById('all-tariff-warning-popup');
                    if (!warningPopup) {
                        // Create warning popup
                        warningPopup = document.createElement('div');
                        warningPopup.id = 'all-tariff-warning-popup';
                        warningPopup.style.cssText = `
                            position: absolute;
                            background: var(--background-color, white);
                            border: 2px solid var(--warning, #f0ad4e);
                            border-radius: 4px;
                            padding: 10px 15px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                            font-size: 14px;
                            font-family: var(--font-family-monospace);
                            color: var(--text-color);
                            z-index: 10000;
                            max-width: 300px;
                            pointer-events: none;
                        `;
                        warningPopup.innerHTML = `
                            <div style="display: flex; align-items: flex-start; gap: 8px;">
                                <span style="color: var(--warning, #f0ad4e); font-weight: bold;">⚠</span>
                                <span>Changing this value will override all current industry-level tariff values. Make sure this is what you want before proceeding.</span>
                            </div>
                        `;
                        
                        // Position the popup above the input
                        const rect = allTariffInput.getBoundingClientRect();
                        const modalRect = allTariffInput.closest('.modal-content').getBoundingClientRect();
                        warningPopup.style.left = (rect.left - modalRect.left) + 'px';
                        warningPopup.style.top = (rect.top - modalRect.top - 80) + 'px';
                        
                        // Add to modal content
                        allTariffInput.closest('.modal-content').appendChild(warningPopup);
                        
                        // Remove popup when input loses focus
                        allTariffInput.addEventListener('blur', function() {
                            setTimeout(() => {
                                if (warningPopup && warningPopup.parentNode) {
                                    warningPopup.parentNode.removeChild(warningPopup);
                                }
                            }, 200);
                        }, { once: true });
                    }
                });
                
                const boundChangeHandler = function(e) {
                    const value = parseFloat(e.target.value) || 0;
                    
                    // Update global pass-through rate from the input
                    const passThroughInput = document.getElementById('tariff-all-passthrough');
                    if (passThroughInput) {
                        currentPassThroughRate = (parseFloat(passThroughInput.value) || 100) / 100;
                    }
                    
                    // Update all section values based on the mode
                    if (value >= 0 && selectedCountry && tariffPropagator) {
                        Object.keys(sectionToHs4Mapping).forEach(sectionId => {
                            if (showOriginalAndCurrentTariffs) {
                                // In original/current mode: current = original + (additional × pass-through)
                                const originalValue = tariffPropagator.getTariffValue('section', sectionId, null, null, selectedCountry, 'original');
                                const newValue = originalValue + (value * currentPassThroughRate);
                                tariffPropagator.updateTariff('section', sectionId, null, null, newValue, selectedCountry, 'current');
                            } else {
                                // In tariff-change mode: value = additional × pass-through
                                tariffPropagator.updateTariff('section', sectionId, null, null, value * currentPassThroughRate, selectedCountry);
                            }
                        });
                        
                        // Refresh the hierarchical view to show the updated values
                        buildHierarchicalView();
                    }
                };
                
                allTariffInput._boundChangeHandler = boundChangeHandler;
                allTariffInput.addEventListener('change', boundChangeHandler);
            }
        }
        
        // Fix modal positioning styles
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
    }
    
    /**
     * Close the product tariff modal and clean up event listeners
     * @param {string} modalId - ID of the modal to close
     * @param {boolean} forceReset - Whether to force reset of all state (default: false)
     */
    // Track if we're in the process of submitting tariffs
    let isSubmittingTariff = false;
    
    function closeModal(modalId, forceReset = false) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            
            // For global tariff (WLD), ensure it's removed from selectedISOs
            if (selectedCountry === 'WLD' && window.selectedISOs) {
                window.selectedISOs = window.selectedISOs.filter(iso => iso !== 'WLD');
            }
            
            // IMPORTANT: Clear any unsaved product tariff data when closing without submitting
            if (!isSubmittingTariff && tariffPropagator && selectedCountry) {
                // console.log('[TARIFF_VECTOR_DEBUG] Clearing unsaved product tariff data for', selectedCountry);
                
                // Clear currentTariffs for this country
                if (tariffPropagator.currentTariffs && tariffPropagator.currentTariffs[selectedCountry]) {
                    delete tariffPropagator.currentTariffs[selectedCountry];
                }
                
                // Also clear any pending calculations in the currentTariffData
                if (window.TariffCalculations && window.TariffCalculations.currentTariffData) {
                    const tariffData = window.TariffCalculations.currentTariffData;
                    
                    // Remove this country from any pending calculations
                    if (tariffData.tauCForCalculations && tariffData.tauCForCalculations[selectedCountry]) {
                        delete tariffData.tauCForCalculations[selectedCountry];
                    }
                }
            }
            
            // If called with forceReset=true or this isn't a global tariff, do full cleanup
            if (forceReset || !isGlobalTariff) {
                // Full cleanup with state reset
                cleanupEventListeners(true);
            } else if (submissionMode !== 'global') {
                // Not global submission mode, do full cleanup
                cleanupEventListeners(true);
            } else {
                // Just cleanup direct button listeners without resetting state
                cleanupDirectButtonListeners();
            }
            
            // Reset submission flag
            isSubmittingTariff = false;
        }
    }
    
    /**
     * Clean up just the direct button listeners without resetting state
     */
    function cleanupDirectButtonListeners() {
        // Clean up submit button listener
        const submitBtn = document.getElementById('tariffSubmit');
        if (submitBtn) {
            // Remove the bound handler if it exists
            if (submitBtn._boundHandleTariffSubmit) {
                submitBtn.removeEventListener('click', submitBtn._boundHandleTariffSubmit);
                delete submitBtn._boundHandleTariffSubmit;
            }
            
            // Also try to remove the generic handler
            submitBtn.removeEventListener('click', handleTariffSubmit);
            
        }
        
        // Clean up toggle mode button listener
        const toggleModeBtn = document.getElementById('toggle-mode-btn');
        if (toggleModeBtn) {
            toggleModeBtn.removeEventListener('click', toggleInputMode);
        }
        
        // Clean up all-industry tariff input listener
        const allTariffInput = document.getElementById('tariff-all-input');
        if (allTariffInput && allTariffInput._boundChangeHandler) {
            allTariffInput.removeEventListener('change', allTariffInput._boundChangeHandler);
            delete allTariffInput._boundChangeHandler;
        }
    }
    
    /**
     * Clean up event listeners to prevent issues when reopening modals
     * @param {boolean} resetState - Whether to reset global state variables (default: true)
     */
    function cleanupEventListeners(resetState = true) {
        // Clean up all button listeners
        cleanupDirectButtonListeners();
        
        // Clear onclick attribute from submit button
        const submitBtn = document.getElementById('tariffSubmit');
        if (submitBtn) {
            submitBtn.removeAttribute('onclick');
        }
        
        // Reset global state variables if requested
        if (resetState) {
            // Only reset these values if we're not in the middle of a global tariff operation
            isGlobalTariff = false;
            onSubmitCallback = null;
            submissionMode = 'country'; // Reset to default country mode
        }
        
        // Log the current state after cleanup
    }
    
    /**
     * Toggle between tariff modes (tariff change vs original/current)
     */
    function toggleInputMode() {
        showOriginalAndCurrentTariffs = !showOriginalAndCurrentTariffs;
        
        // Update the toggle button text
        const toggleBtn = document.getElementById('toggle-mode-btn');
        if (toggleBtn) {
            toggleBtn.textContent = showOriginalAndCurrentTariffs ? 
                'Switch to Tariff Change Mode' : 'Switch to Original/Current Mode';
        }
        
        // If switching to original/current mode, initialize current tariffs to match original tariffs
        if (showOriginalAndCurrentTariffs && selectedCountry && tariffPropagator) {
            
            // Get all section, chapter, and HS4 tariffs from original to initialize current
            if (tariffPropagator.originalTariffs[selectedCountry]) {
                if (!tariffPropagator.currentTariffs[selectedCountry]) {
                    tariffPropagator.currentTariffs[selectedCountry] = {};
                }
                
                // Copy original tariffs to current for all levels
                Object.keys(tariffPropagator.originalTariffs[selectedCountry]).forEach(key => {
                    const originalValue = tariffPropagator.originalTariffs[selectedCountry][key];
                    if (originalValue !== undefined) {
                        tariffPropagator.currentTariffs[selectedCountry][key] = originalValue;
                    }
                });
            }
        }
        
        // Rebuild the hierarchical view
        buildHierarchicalView();
    }
    
    /**
     * Build the hierarchical tariff view
     */
    function buildHierarchicalView() {
        const treeContainer = document.getElementById('tariff-tree');
        if (!treeContainer) {
            console.error("Element with id 'tariff-tree' not found.");
            return;
        }
        
        // Clear the container
        treeContainer.innerHTML = '';
        
        // Skip if no country selected
        if (!selectedCountry) {
            treeContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Please select a country first.</p>';
            return;
        }
        
        // Skip if no tariff propagator
        if (!tariffPropagator) {
            treeContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Loading tariff system...</p>';
            return;
        }
        
        // Skip if no hierarchical structure or if it needs reloading
        if (!sectionToHs4Mapping || Object.keys(sectionToHs4Mapping).length === 0 || needsDataReload) {
            treeContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Loading hierarchical structure...</p>';
            // If needsDataReload is true, we should not continue
            if (needsDataReload) {
                console.log('ProductTariffModal: Data needs reloading, skipping build');
            }
            return;
        }
        
        
        // Add each section to the tree
        for (const sectionId in sectionToHs4Mapping) {
            const section = sectionToHs4Mapping[sectionId];
            
            // Create section item
            const sectionItem = document.createElement('div');
            sectionItem.className = 'section-item collapsible';
            
            // Get current tariff value for this section
            const sectionTariff = tariffPropagator.getTariffValue('section', sectionId, null, null, selectedCountry);
            
            // Check if directly set
            const isDirectlySet = tariffPropagator.isDirectlySet('section', sectionId, null, null, selectedCountry);
            
            // Create section header with indicators
            const titleDiv = document.createElement('div');
            titleDiv.className = 'item-title';
            titleDiv.style.fontSize = '0.9em';
            
            titleDiv.innerHTML = `
                <span class="toggle-icon"><img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-icon-img" style="width: 12px; height: 12px;"></span> 
                <strong>Section ${sectionId}:</strong> ${section.title}
                ${sectionTariff > 0 ? `<span class="tariff-badge">Effective Tariff - ${sectionTariff.toFixed(2)}%</span>` : ''}
            `;
            
            // Add section header to section item
            sectionItem.appendChild(titleDiv);
            
            // Create tariff inputs for the section
            const tariffContainer = createTariffContainer(sectionId);
            sectionItem.appendChild(tariffContainer);
            
            // Create container for chapters
            const chaptersContainer = document.createElement('div');
            chaptersContainer.className = 'chapter-container';
            chaptersContainer.style.display = 'none'; // Start collapsed
            
            // Add chapters to the section
            for (const chapterId in section.chapters) {
                const chapter = section.chapters[chapterId];
                
                // Create chapter item
                const chapterItem = document.createElement('div');
                chapterItem.className = 'chapter-item collapsible';
                
                // Get current tariff value for this chapter
                const chapterTariff = tariffPropagator.getTariffValue('chapter', sectionId, chapterId, null, selectedCountry);
                
                // Check if directly set
                const isChapterDirectlySet = tariffPropagator.isDirectlySet('chapter', sectionId, chapterId, null, selectedCountry);
                
                // Create chapter header with indicators
                const chapterTitleDiv = document.createElement('div');
                chapterTitleDiv.className = 'item-title';
                chapterTitleDiv.style.fontSize = '0.9em';
                
                // Zero-pad chapter ID to ensure it has at least 2 digits
                const paddedChapterId = chapterId.padStart(2, '0');
                
                chapterTitleDiv.innerHTML = `
                    <span class="toggle-icon"><img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-icon-img" style="width: 12px; height: 12px;"></span> 
                    <strong>Chapter ${paddedChapterId}:</strong> ${chapter.short || chapter.title}
                    ${chapterTariff > 0 ? `<span class="tariff-badge">Effective Tariff - ${chapterTariff.toFixed(2)}%</span>` : ''}
                `;
                
                // Add chapter header to chapter item
                chapterItem.appendChild(chapterTitleDiv);
                
                // Create tariff inputs for the chapter
                const chapterTariffContainer = createTariffContainer(`${sectionId}_${chapterId}`);
                chapterItem.appendChild(chapterTariffContainer);
                
                // Create container for HS4 codes
                const hs4Container = document.createElement('div');
                hs4Container.className = 'hs4-container';
                hs4Container.style.display = 'none'; // Start collapsed
                
                // Add HS4 codes to the chapter
                if (chapter.subcategories) {
                    for (const hs4Code in chapter.subcategories) {
                        const hs4 = chapter.subcategories[hs4Code];
                        if (!hs4) {
                            continue;
                        }
                        
                        // Create HS4 item
                        const hs4Item = document.createElement('div');
                        hs4Item.className = 'hs4-item';
                        
                        // Get current tariff value for this HS4 code
                        const hs4Tariff = tariffPropagator.getTariffValue('hs4', sectionId, chapterId, hs4Code, selectedCountry);
                        
                        // Check if directly set
                        const isHs4DirectlySet = tariffPropagator.isDirectlySet('hs4', sectionId, chapterId, hs4Code, selectedCountry);
                        
                        // Create HS4 header with indicators
                        const hs4TitleDiv = document.createElement('div');
                        hs4TitleDiv.className = 'item-title';
                        hs4TitleDiv.style.fontSize = '0.9em';
                        
                        // Create the description with name property
                        let description = hs4.description || '';
                        let nameText = '';
                        if (hs4.name) {
                            nameText = ` - ${hs4.name}`;
                        }
                        
                        // Zero-pad HS4 code to ensure it has 4 digits
                        const paddedHs4Code = hs4Code.padStart(4, '0');
                        
                        hs4TitleDiv.innerHTML = `
                            <strong>${paddedHs4Code}:</strong> ${description}${nameText}
                            ${hs4Tariff > 0 ? `<span class="tariff-badge">Effective Tariff - ${hs4Tariff.toFixed(2)}%</span>` : ''}
                        `;
                        
                        // Add HS4 header to HS4 item
                        hs4Item.appendChild(hs4TitleDiv);
                        
                        // Create tariff inputs for the HS4 code
                        const hs4TariffContainer = createTariffContainer(`${sectionId}_${chapterId}_${hs4Code}`);
                        hs4Item.appendChild(hs4TariffContainer);
                        
                        // Add HS4 item to HS4 container
                        hs4Container.appendChild(hs4Item);
                    }
                }
                
                // Add click handler for chapter toggle
                chapterTitleDiv.addEventListener('click', function(e) {
                    if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                        e.stopPropagation();
                        toggleContainer(chapterItem, hs4Container);
                    }
                });
                
                // Make the entire chapter item clickable, not just the title
                chapterItem.addEventListener('click', function(e) {
                    // Only handle clicks directly on the container, not on child elements
                    if (e.target === this && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                        e.stopPropagation();
                        toggleContainer(chapterItem, hs4Container);
                    }
                });
                
                // Add chapter and its HS4 container to chapters container
                chaptersContainer.appendChild(chapterItem);
                chaptersContainer.appendChild(hs4Container);
            }
            
            // Add click handler for section toggle
            titleDiv.addEventListener('click', function(e) {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                    toggleContainer(sectionItem, chaptersContainer);
                }
            });
            
            // Make the entire section item clickable, not just the title
            sectionItem.addEventListener('click', function(e) {
                // Only handle clicks directly on the container, not on child elements
                if (e.target === this && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                    e.stopPropagation();
                    toggleContainer(sectionItem, chaptersContainer);
                }
            });
            
            // Add section and its chapters container to tree
            treeContainer.appendChild(sectionItem);
            treeContainer.appendChild(chaptersContainer);
        }
        
        // Restore expanded sections and chapters
        restoreExpandedState();
    }
    
    /**
     * Create a tariff container with input fields for a node
     */
    function createTariffContainer(nodeId) {
        // Create the tariff container
        const tariffContainer = document.createElement('div');
        tariffContainer.classList.add('tariff-container');
        
        if (showOriginalAndCurrentTariffs) {
            // --- ORIGINAL TARIFF INPUT ---
            const originalTariffRow = document.createElement('div');
            originalTariffRow.classList.add('popup-row-modal');
            
            const originalTariffLabel = document.createElement('label');
            originalTariffLabel.setAttribute('for', 'originalTariffInput_' + nodeId);
            originalTariffLabel.textContent = "Original Tariff:";
            originalTariffLabel.style.fontSize = "0.9em";
            
            const originalTariffInputGroup = document.createElement('div');
            originalTariffInputGroup.classList.add('input-group');
            
            const originalTariffInput = document.createElement('input');
            originalTariffInput.type = 'number';
            originalTariffInput.classList.add('popup-input', 'percent', 'original-tariff');
            originalTariffInput.step = 0.1;
            originalTariffInput.min = 0;
            originalTariffInput.max = 100;
            
            // Get original tariff value
            let originalValue = 0;
            const nodeParts = nodeId.split('_');
            if (nodeParts.length === 1) {
                // Section
                originalValue = tariffPropagator.getTariffValue('section', nodeParts[0], null, null, selectedCountry, 'original');
            } else if (nodeParts.length === 2) {
                // Chapter
                originalValue = tariffPropagator.getTariffValue('chapter', nodeParts[0], nodeParts[1], null, selectedCountry, 'original');
            } else if (nodeParts.length === 3) {
                // HS4
                originalValue = tariffPropagator.getTariffValue('hs4', nodeParts[0], nodeParts[1], nodeParts[2], selectedCountry, 'original');
            }
            
            originalTariffInput.value = originalValue.toFixed(2);
            originalTariffInput.id = 'originalTariffInput_' + nodeId;
            
            // Handle original tariff changes
            originalTariffInput.addEventListener('change', function() {
                if (!tariffPropagator) return;
                
                const value = parseFloat(this.value) || 0;
                const parts = nodeId.split('_');
                
                // Use the tariff propagator to update original tariffs with the correct tariff type
                if (parts.length === 1) {
                    // This is a section
                    tariffPropagator.updateTariff('section', parts[0], null, null, value, selectedCountry, 'original');
                } else if (parts.length === 2) {
                    // This is a chapter
                    tariffPropagator.updateTariff('chapter', parts[0], parts[1], null, value, selectedCountry, 'original');
                } else if (parts.length === 3) {
                    // This is an HS4 code
                    tariffPropagator.updateTariff('hs4', parts[0], parts[1], parts[2], value, selectedCountry, 'original');
                }
                
                // Log current tariff vectors
                logTariffVectors(selectedCountry);
                
                // Refresh the view
                buildHierarchicalView();
            });
            
            const originalTariffPercentSymbol = document.createElement('span');
            originalTariffPercentSymbol.classList.add('percent-symbol');
            originalTariffPercentSymbol.textContent = '%';
            
            originalTariffInputGroup.appendChild(originalTariffInput);
            originalTariffInputGroup.appendChild(originalTariffPercentSymbol);
            
            originalTariffRow.appendChild(originalTariffLabel);
            originalTariffRow.appendChild(originalTariffInputGroup);
            
            // --- CURRENT TARIFF INPUT ---
            const currentTariffRow = document.createElement('div');
            currentTariffRow.classList.add('popup-row-modal');
            
            const currentTariffLabel = document.createElement('label');
            currentTariffLabel.setAttribute('for', 'currentTariffInput_' + nodeId);
            currentTariffLabel.textContent = "Current Tariff:";
            currentTariffLabel.style.fontSize = "0.9em";
            
            const currentTariffInputGroup = document.createElement('div');
            currentTariffInputGroup.classList.add('input-group');
            
            const currentTariffInput = document.createElement('input');
            currentTariffInput.type = 'number';
            currentTariffInput.classList.add('popup-input', 'percent', 'current-tariff');
            currentTariffInput.step = 0.1;
            currentTariffInput.min = 0;
            currentTariffInput.max = 100;
            
            // Get current tariff value
            let currentValue = originalValue; // Default to original value
            
            // Reuse nodeParts from above
            if (nodeParts.length === 1) {
                // Section
                const sectionCurrentValue = tariffPropagator.getTariffValue('section', nodeParts[0], null, null, selectedCountry, 'current');
                // Use original value if current is 0 or undefined
                currentValue = (sectionCurrentValue > 0) ? sectionCurrentValue : originalValue;
            } else if (nodeParts.length === 2) {
                // Chapter
                const chapterCurrentValue = tariffPropagator.getTariffValue('chapter', nodeParts[0], nodeParts[1], null, selectedCountry, 'current');
                // Use original value if current is 0 or undefined
                currentValue = (chapterCurrentValue > 0) ? chapterCurrentValue : originalValue;
            } else if (nodeParts.length === 3) {
                // HS4
                const hs4CurrentValue = tariffPropagator.getTariffValue('hs4', nodeParts[0], nodeParts[1], nodeParts[2], selectedCountry, 'current');
                // Use original value if current is 0 or undefined
                currentValue = (hs4CurrentValue > 0) ? hs4CurrentValue : originalValue;
            }
            
            currentTariffInput.value = currentValue.toFixed(2);
            currentTariffInput.id = 'currentTariffInput_' + nodeId;
            
            // Handle current tariff changes with propagation
            currentTariffInput.addEventListener('change', function() {
                if (!tariffPropagator) return;
                
                const value = parseFloat(this.value) || 0;
                const parts = nodeId.split('_');
                
                if (parts.length === 1) {
                    // This is a section
                    tariffPropagator.updateTariff('section', parts[0], null, null, value, selectedCountry, 'current');
                } else if (parts.length === 2) {
                    // This is a chapter
                    tariffPropagator.updateTariff('chapter', parts[0], parts[1], null, value, selectedCountry, 'current');
                } else if (parts.length === 3) {
                    // This is an HS4 code
                    tariffPropagator.updateTariff('hs4', parts[0], parts[1], parts[2], value, selectedCountry, 'current');
                }
                
                // Log current tariff vectors
                logTariffVectors(selectedCountry);
                
                // Refresh the hierarchical view to show propagated changes
                buildHierarchicalView();
            });
            
            const currentTariffPercentSymbol = document.createElement('span');
            currentTariffPercentSymbol.classList.add('percent-symbol');
            currentTariffPercentSymbol.textContent = '%';
            
            currentTariffInputGroup.appendChild(currentTariffInput);
            currentTariffInputGroup.appendChild(currentTariffPercentSymbol);
            
            currentTariffRow.appendChild(currentTariffLabel);
            currentTariffRow.appendChild(currentTariffInputGroup);
            
            // Append both rows to the tariff container
            tariffContainer.appendChild(originalTariffRow);
            tariffContainer.appendChild(currentTariffRow);
        } else {
            // --- TARIFF CHANGE INPUT ---
            const newTariffRow = document.createElement('div');
            newTariffRow.classList.add('popup-row-modal');
            
            const newTariffLabel = document.createElement('label');
            newTariffLabel.setAttribute('for', 'newTariffInput_' + nodeId);
            newTariffLabel.textContent = "Additional Tariffs:";
            newTariffLabel.style.fontSize = "0.9em";
            
            const newTariffInputGroup = document.createElement('div');
            newTariffInputGroup.classList.add('input-group');
            
            const newTariffInput = document.createElement('input');
            newTariffInput.type = 'number';
            newTariffInput.classList.add('popup-input', 'percent', 'tariff-change');
            newTariffInput.step = 5;
            newTariffInput.min = 0;
            newTariffInput.max = 100;
            
            // Get current tariff value
            let tariffChangeValue = 0;
            const parts = nodeId.split('_');
            if (parts.length === 1) {
                // Section
                tariffChangeValue = tariffPropagator.getTariffValue('section', parts[0], null, null, selectedCountry);
            } else if (parts.length === 2) {
                // Chapter
                tariffChangeValue = tariffPropagator.getTariffValue('chapter', parts[0], parts[1], null, selectedCountry);
            } else if (parts.length === 3) {
                // HS4
                tariffChangeValue = tariffPropagator.getTariffValue('hs4', parts[0], parts[1], parts[2], selectedCountry);
            }
            
            newTariffInput.value = tariffChangeValue.toFixed(2);
            newTariffInput.id = 'newTariffInput_' + nodeId;
            
            // Handle tariff changes with propagation
            newTariffInput.addEventListener('change', function() {
                if (!tariffPropagator) return;
                
                const value = parseFloat(this.value) || 0;
                const passThroughValue = currentPassThroughRate;
                const parts = nodeId.split('_');
                
                // Handle based on the current mode
                if (showOriginalAndCurrentTariffs) {
                    // In Original/Current mode, add to the original value
                    if (parts.length === 1) {
                        // This is a section
                        const originalValue = tariffPropagator.getTariffValue('section', parts[0], null, null, selectedCountry, 'original');
                        const newValue = originalValue + (value * passThroughValue);
                        tariffPropagator.updateTariff('section', parts[0], null, null, newValue, selectedCountry, 'current');
                    } else if (parts.length === 2) {
                        // This is a chapter
                        const originalValue = tariffPropagator.getTariffValue('chapter', parts[0], parts[1], null, selectedCountry, 'original');
                        const newValue = originalValue + (value * passThroughValue);
                        tariffPropagator.updateTariff('chapter', parts[0], parts[1], null, newValue, selectedCountry, 'current');
                    } else if (parts.length === 3) {
                        // This is an HS4 code
                        const originalValue = tariffPropagator.getTariffValue('hs4', parts[0], parts[1], parts[2], selectedCountry, 'original');
                        const newValue = originalValue + (value * passThroughValue);
                        tariffPropagator.updateTariff('hs4', parts[0], parts[1], parts[2], newValue, selectedCountry, 'current');
                    }
                } else {
                    // In Tariff Change mode, use the value directly
                    if (parts.length === 1) {
                        // This is a section
                        tariffPropagator.updateTariff('section', parts[0], null, null, value * passThroughValue, selectedCountry);
                    } else if (parts.length === 2) {
                        // This is a chapter
                        tariffPropagator.updateTariff('chapter', parts[0], parts[1], null, value * passThroughValue, selectedCountry);
                    } else if (parts.length === 3) {
                        // This is an HS4 code
                        tariffPropagator.updateTariff('hs4', parts[0], parts[1], parts[2], value * passThroughValue, selectedCountry);
                    }
                }
                
                // Log current tariff vectors
                logTariffVectors(selectedCountry);
                
                // Refresh the hierarchical view to show propagated changes
                buildHierarchicalView();
            });
            
            const newTariffPercentSymbol = document.createElement('span');
            newTariffPercentSymbol.classList.add('percent-symbol');
            newTariffPercentSymbol.textContent = '%';
            
            newTariffInputGroup.appendChild(newTariffInput);
            newTariffInputGroup.appendChild(newTariffPercentSymbol);
            
            newTariffRow.appendChild(newTariffLabel);
            newTariffRow.appendChild(newTariffInputGroup);
            
            // --- Pass-Through Popup Row ---
            const passThroughRow = document.createElement('div');
            passThroughRow.classList.add('popup-row-modal');
            
            const passThroughLabel = document.createElement('label');
            passThroughLabel.setAttribute('for', 'passThroughInput_' + nodeId);
            passThroughLabel.textContent = "Pass Through:";
            passThroughLabel.style.fontSize = "0.9em";
            
            const passThroughInputGroup = document.createElement('div');
            passThroughInputGroup.classList.add('input-group');
            
            const passThroughInput = document.createElement('input');
            passThroughInput.type = 'number';
            passThroughInput.classList.add('popup-input', 'percent', 'pass-through');
            passThroughInput.step = 10;
            passThroughInput.min = 0;
            passThroughInput.max = 100;
            passThroughInput.value = (currentPassThroughRate * 100).toFixed(0);
            passThroughInput.id = 'passThroughInput_' + nodeId;
            
            // Update the pass-through rate
            passThroughInput.addEventListener('change', function() {
                const value = parseFloat(this.value) || 0;
                currentPassThroughRate = value / 100;
            });
            
            const passThroughPercentSymbol = document.createElement('span');
            passThroughPercentSymbol.classList.add('percent-symbol');
            passThroughPercentSymbol.textContent = '%';
            
            passThroughInputGroup.appendChild(passThroughInput);
            passThroughInputGroup.appendChild(passThroughPercentSymbol);
            
            passThroughRow.appendChild(passThroughLabel);
            passThroughRow.appendChild(passThroughInputGroup);
            
            // Append both popup rows to the tariff container
            tariffContainer.appendChild(newTariffRow);
            tariffContainer.appendChild(passThroughRow);
        }
        
        return tariffContainer;
    }
    
    /**
     * Toggle visibility of a container element
     */
    function toggleContainer(headerElement, containerElement) {
        const isVisible = containerElement.style.display === 'block';
        containerElement.style.display = isVisible ? 'none' : 'block';
        
        // Update toggle icon
        const toggleIcon = headerElement.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.innerHTML = isVisible ? 
                '<img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-icon-img">' : 
                '<img src="assets/fontawesome/chevron-down-solid.svg" alt="Collapse" class="toggle-icon-img">';
        }
        
        // Save the expanded state
        saveExpandedState();
    }
    
    /**
     * Save the expanded state of sections and chapters
     */
    function saveExpandedState() {
        expandedSections.clear();
        expandedChapters.clear();
        
        // Save expanded sections
        document.querySelectorAll('.section-item').forEach((sectionItem, index) => {
            const container = document.querySelectorAll('.chapter-container')[index];
            if (container && container.style.display === 'block') {
                expandedSections.add(index);
            }
        });
        
        // Save expanded chapters
        document.querySelectorAll('.chapter-item').forEach((chapterItem, index) => {
            const container = document.querySelectorAll('.hs4-container')[index];
            if (container && container.style.display === 'block') {
                expandedChapters.add(index);
            }
        });
    }
    
    /**
     * Restore the expanded state of sections and chapters
     */
    function restoreExpandedState() {
        // Restore expanded sections
        document.querySelectorAll('.section-item').forEach((sectionItem, index) => {
            if (expandedSections.has(index)) {
                const container = document.querySelectorAll('.chapter-container')[index];
                if (container) {
                    container.style.display = 'block';
                    const toggleIcon = sectionItem.querySelector('.toggle-icon');
                    if (toggleIcon) toggleIcon.innerHTML = '<img src="assets/fontawesome/chevron-down-solid.svg" alt="Collapse" class="toggle-icon-img">';
                }
            }
        });
        
        // Restore expanded chapters
        document.querySelectorAll('.chapter-item').forEach((chapterItem, index) => {
            if (expandedChapters.has(index)) {
                const container = document.querySelectorAll('.hs4-container')[index];
                if (container) {
                    container.style.display = 'block';
                    const toggleIcon = chapterItem.querySelector('.toggle-icon');
                    if (toggleIcon) toggleIcon.innerHTML = '<img src="assets/fontawesome/chevron-down-solid.svg" alt="Collapse" class="toggle-icon-img">';
                }
            }
        });
    }
    
    /**
     * Log the original and current tariff vectors for a country and update the chart
     * @param {string} countryIso - The ISO code of the country
     * @returns {Object|null} An object containing the vectors or null if not available
     */
    function logTariffVectors(countryIso) {
        if (!tariffPropagator || !countryIso) return null;
        
        // Create vectors of length 21 (fixed length matching number of sections)
        const vectorLength = 21;
        let originalVector = new Array(vectorLength).fill(0);
        let currentVector = new Array(vectorLength).fill(0);
        let categoryNames = new Array(vectorLength).fill('');
        
        // Get the sections
        const sections = Object.keys(sectionToHs4Mapping);
        
        // Ensure we always return full-length vectors (all 21 sections)
        for (let i = 0; i < vectorLength; i++) {
            // Map section index to sectionId (account for 1-indexed sections)
            const sectionId = (i + 1).toString();
            
            // Get original tariff value (default to 0 if not found)
            const originalValue = tariffPropagator.getTariffValue('section', sectionId, null, null, countryIso, 'original') || 0;
            originalVector[i] = originalValue;
            
            // Get current tariff value (default to original value if not set)
            let currentValue = tariffPropagator.getTariffValue('section', sectionId, null, null, countryIso, 'current');
            // If current value is not set, use the original value (unchanged)
            if (currentValue === undefined || currentValue === null || currentValue === 0) {
                currentValue = originalValue;
            }
            currentVector[i] = currentValue;
            
            // Set category name
            categoryNames[i] = `Section ${sectionId}`;
        }
        
        // For debugging in global tariff mode
        if (countryIso === 'WLD' || isGlobalTariff) {
            
            
            // Check for non-zero values to highlight where we have changes
            const nonZeroIndices = currentVector
                .map((val, idx) => Math.abs(val - originalVector[idx]) > 0.001 ? idx : -1)
                .filter(idx => idx >= 0);
                
            if (nonZeroIndices.length > 0) {

            } else {
            }
        }
        
        // Return the vectors for use in other functions
        return {
            originalVector,
            currentVector,
            categoryNames
        };
    }
    
    /**
     * Update the tariff bar chart visualization
     * @param {Array<number>} originalVector - Vector of original tariff values
     * @param {Array<number>} currentVector - Vector of current tariff values
     * @param {Array<string>} categoryNames - Names of the categories (sections)
     * @param {string} countryIso - ISO code of the country
     */
    function updateTariffChart(originalVector, currentVector, categoryNames, countryIso) {
        // RENDERING DISABLED FOR NOW
        //console.log('Original vector:', originalVector);
        //console.log('Current vector:', currentVector);
        
        // Get the chart container and clear it
        const chartContainer = document.getElementById('tariff-chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--darkGray);">Chart visualization temporarily disabled</div>';
        }
        
        /* DISABLED CHART RENDERING - KEEPING CODE FOR FUTURE USE
        // Check if barChartDataUtils is available
        if (!window.barChartDataUtils || typeof window.barChartDataUtils.createBarChartData !== 'function') {
            console.warn('barChartDataUtils not available for chart creation');
            return;
        }
        
        // Check if sparksBarChart is available
        if (!window.sparksBarChart) {
            console.warn('sparksBarChart not available for rendering');
            return;
        }
        
        // Get the chart container
        const chartContainer = document.getElementById('tariff-chart-container');
        if (!chartContainer) {
            console.warn('Chart container not found');
            return;
        }
        
        // Use original percentage values (no division by 100)
        // Use all categories to maintain proper order (don't filter out zeros)
        const chartData = window.barChartDataUtils.createBarChartData(
            originalVector,
            currentVector,
            categoryNames,
            'Original Tariffs',
            'Current Tariffs'
        );
        
        // Use FRBA color palette
        chartData.series[0].color = 'var(--blue1)'; // Original tariffs
        chartData.series[1].color = 'var(--orange1)'; // Current tariffs
        
        // Add additional configuration
        const chartConfig = {
            ...chartData,
            title: `Tariff Comparison for ${countryIso}`,
            subtitle: 'Original vs Current Tariffs by Section',
            yAxis: {
                title: 'Tariff Rate (%)',
                min: 0,
                max: Math.max(...originalVector, ...currentVector) * 1.1, // 10% headroom
                tickFormatter: function(value) {
                    return value.toFixed(1); // Format y-axis labels with just 1 decimal place
                }
            },
            // Format tooltip values to show percentage sign (no division)
            tooltipValueFormatter: function(value) {
                return value.toFixed(1) + '%';
            },
            legend: {
                enabled: true,
                position: 'bottom'
            },
            animation: {
                enabled: true,
                duration: 500
            },
            preserveXOrder: true // Ensure categories are shown in the original order
        };
        
        // Clear previous chart
        chartContainer.innerHTML = '';
        
        // Create the chart
        window.sparksBarChart('tariff-chart-container', chartConfig);
        */
    }
    
    /**
     * Handle tariff submission
     */
    function handleTariffSubmit() {
        // Set the submission flag to prevent clearing data when submitting
        isSubmittingTariff = true;
        // console.log('[TARIFF_VECTOR_DEBUG] Starting tariff submission, isSubmittingTariff =', isSubmittingTariff);
        
        // Validate that we have a current country
        if (!selectedCountry) {
            alert('Please select a country first.');
            isSubmittingTariff = false; // Reset flag on error
            return;
        }
        
        if (!tariffPropagator) {
            alert('Tariff system not ready. Please try again.');
            isSubmittingTariff = false; // Reset flag on error
            return;
        }
        
        // Add additional check for global tariff state to prevent issues
        if (selectedCountry === 'WLD' && !isGlobalTariff) {
            console.warn('Global tariff submission attempted without proper global tariff flag');
            // Set it correctly to ensure the rest of the function works
            isGlobalTariff = true;
        }
        
        try {
            // For global tariff debugging - log the current tariff state before any processing
            
            // Get the all-industry tariff and pass-through values from the top inputs
            const allTariffInput = document.getElementById('tariff-all-input');
            const allPassThroughInput = document.getElementById('tariff-all-passthrough');
            
            if (allTariffInput && allPassThroughInput) {
                const tariffValue = parseFloat(allTariffInput.value) || 0;
                const passThroughValue = parseFloat(allPassThroughInput.value) || 100;
                
                // Store current pass-through rate (as a decimal)
                currentPassThroughRate = passThroughValue / 100;
                
                // The all-industry tariff is now applied directly to sections when the input changes,
                // so we don't need to apply it again here during submission.
                // The tariffPropagator already has all the section values set correctly.
            }
            
            // For global tariff debugging - log after applying all-industry tariff
            
            
            // Generate tariff data from the tariff propagator
            const tariffData = tariffPropagator.generateTariffData(selectedCountry);
            
            // Mark this data as coming from the product tariff modal
            tariffData.tariffSource = 'productTariffModal';
            tariffData.useSectionTariffsFallback = true; // Product tariffs should use section tariffs
            
            // Add debug to trace the call stack for product tariff calculation
            console.log('[TARIFF_VECTOR_DEBUG] Generating product tariff calculation, call stack:', 
                new Error('Call stack trace').stack);
            
            // Add pass-through rate to the tariff data
            tariffData.passThroughRate = currentPassThroughRate;
            
            // Log the final tariff vectors before submission and get the vectors
            const vectors = logTariffVectors(selectedCountry);
            
            // Add the vectors to the tariff data for global tariff application
            if (vectors) {
                tariffData.originalVector = vectors.originalVector;
                tariffData.currentVector = vectors.currentVector;
                tariffData.categoryNames = vectors.categoryNames;
            }
            
            
            // Close the modal
            closeModal('modal-product-list');
            
            // Save references to the state variables before we reset them
            const currentSubmissionMode = submissionMode; // Explicit flag
            const savedCallback = onSubmitCallback;
            
            // Reset global state variables immediately to avoid issues with subsequent operations
            // Store in local variables first to use in this function
            const modeBefore = submissionMode;
            
            // Reset all state variables
            isGlobalTariff = false;
            onSubmitCallback = null;
            submissionMode = 'country'; // Reset to default
            
            
            // Use the explicit submission mode to determine which code path to execute
            if ((currentSubmissionMode === 'global' || currentSubmissionMode === 'multi-country') && savedCallback) {
                
                // Call the callback with tariff data
                savedCallback(tariffData);
            } else {
                
                // Process the tariff data normally for a single country
                //onsole.log(tariffData);
                processTariffData(tariffData);
            }
            
        } catch (error) {
            console.error('Error submitting tariffs:', error);
            alert(`Error submitting tariffs: ${error.message}`);
        }
    }
    
    /**
     * Process the tariff data
     */
    async function processTariffData(tariffData) {
        try {
            // Log the tariff data for debugging
            //console.log('Processing tariff data:', tariffData);
            
            // Apply import weighting if we have MdsHelperFunctions and sectionTariffs
            if (window.MdsHelperFunctions && 
                typeof window.MdsHelperFunctions.calculateBeaTariffs === 'function' && 
                tariffData.sectionTariffs && 
                tariffData.iso_list && 
                tariffData.iso_list.length > 0) {
                
                // Use the same custom BEA order as in MdsHelperFunctions.js for consistency
                const customBEAOrder = [
                '111', '112', '113FF', '211', '212', '213', '2211', '2212NW', '23EH', '23MR', '23OC', '23OR', '23OT', '23PC', '23SF', '23TH', '321', '327', '3311IS', '3313NF', '332', '33311', '33312', '33313', '3332OM', '3341', '3342', '3344', '3345', '334X', '335', '336111', '336112', '33612', '3362BP', '3364', '3365AO', '337', '3391', '3399', '311', '3121', '3122', '313TT', '315AL', '322', '323', '324', '3251', '3252', '3254', '325X', '326', '4231', '4234', '4236', '4238', '423X', '4242', '4244', '4247', '424X', '425', '42ID', '441', '445', '452', '444', '446', '447', '448', '454', '4A0X', '481', '482', '483', '484', '485', '486', '48A', '492', '493', '5111', '5112', '512', '515', '5171', '5172', '5174OT', '518', '519', '521CI', '523', '524113', '5241X', '5242', '525', 'HSO', 'HST', 'ORE', '532RL', '5411', '5415', '5412', '5413', '5416', '5417', '5418', '541X', '55', '5613', '5617', '561X', '562', '61', '6211', '6212', '6213', '6214', '6215OH', '622', '623', '624', '711AS', '713', '721', '722', '811', '812', '813', '814', 'GFGD', 'GFGN', 'GFE', 'GSLGE', 'GSLGH', 'GSLGO', 'GSLE', 'Used', 'Other'
                ];
                
                // Use the exact same BEA codes in the exact same order
                const beaCodes = customBEAOrder;
                
                // Load cached data to get beaImportWeights
                const cachedData = await window.MdsHelperFunctions.loadAllData();
                const beaImportWeights = cachedData.beaImportWeights;
                
                // Create arrays to store import-weighted vectors for all countries
                const allWeightedVectors = [];
                const tauCForCalculations = {};
                
                // Process each country in the iso_list
                for (let i = 0; i < tariffData.iso_list.length; i++) {
                    const countryCode = tariffData.iso_list[i];
                    //console.log('Applying import weighting for country:', countryCode);
                    
                    // Get the section tariffs for the country
                    const sectionTariffs = tariffData.sectionTariffs[countryCode]?.current;
                    //console.log('Section tariffs for country:', sectionTariffs);
                    
                    if (sectionTariffs) {
                        // Apply import weighting by calculating BEA tariffs
                        const importWeightedTariffs = await window.MdsHelperFunctions.calculateBeaTariffs(
                            sectionTariffs, 
                            countryCode
                        );
                        
                        // Get original BEA tariffs
                        const originalBeaTariffs = await window.MdsHelperFunctions.calculateOriginalBeaTariffs(
                            countryCode
                        );
                        
                        // Calculate percent changes for tau_c vector
                        const percentChangeVector = [];
                        beaCodes.forEach(beaCode => {
                            const originalTariff = originalBeaTariffs[beaCode] || 0;
                            const currentTariff = importWeightedTariffs[beaCode] || 0;
                            
                            // Calculate percent change
                            let percentChange = 0;
                            if (originalTariff !== 0 || currentTariff !== 0) {
                                percentChange = (currentTariff - originalTariff) / (100 + originalTariff);
                            }
                            
                            // CRITICAL: Apply import weighting just like in processMultiCountryTariffs
                            if (beaImportWeights && beaImportWeights[countryCode] && 
                                beaImportWeights[countryCode][beaCode] !== undefined) {
                                percentChange *= beaImportWeights[countryCode][beaCode];
                            }
                            
                            percentChangeVector.push(percentChange);
                        });
                        
                        // Add the weighted vector for this country
                        allWeightedVectors.push(percentChangeVector);
                        tauCForCalculations[countryCode] = percentChangeVector;
                        
                        // Log the 21-item tariff vector for tracking
                        console.log('[TARIFF_VECTOR_DEBUG] productTariffBtn created vector:', {
                            countryCode,
                            vector: percentChangeVector,
                            source: 'productTariffModal'
                        });
                        
                        //console.log(`Applied import weighting successfully for ${countryCode}`);
                    }
                }
                
                // Update the tariff data with import-weighted values for all countries
                if (allWeightedVectors.length > 0) {
                    tariffData.bea_codes = beaCodes;
                    tariffData.tau_c = allWeightedVectors;
                    tariffData.tauCForCalculations = tauCForCalculations;
                    tariffData.importWeighted = true;
                    
                    //console.log('Applied import weighting successfully for all countries');
                }
            }
            
            // Check if TariffCalculations is available
            if (window.TariffCalculations && typeof window.TariffCalculations.processTariffData === 'function') {
            window.TariffCalculations.processTariffData(tariffData)
                .then(success => {
                    if (success) {
                        
                        // Update receipt display
                        if (window.ReceiptModule && typeof window.ReceiptModule.updateReceiptDisplay === 'function') {
                            window.ReceiptModule.updateReceiptDisplay();
                        }
                        
                        // Update map colors
                        if (typeof window.updateMapColors === 'function') {
                            window.updateMapColors();
                        }
                    } else {
                        console.error('Failed to process tariff data');
                        //alert('Error: Failed to process tariff data');
                    }
                })
                .catch(error => {
                    console.error('Error processing tariff data:', error);
                    //alert(`Error processing tariff data: ${error.message}`);
                });
        } else {
            console.error('TariffCalculations module not available');
            //alert('Error: TariffCalculations module not available');
        }
        } catch (error) {
            console.error('Error applying import weighting:', error);
            
            // Fall back to basic tariff processing
            if (window.TariffCalculations && typeof window.TariffCalculations.processTariffData === 'function') {
                window.TariffCalculations.processTariffData(tariffData)
                    .then(success => {
                        if (success) {
                            // Update UI
                            if (window.ReceiptModule && typeof window.ReceiptModule.updateReceiptDisplay === 'function') {
                                window.ReceiptModule.updateReceiptDisplay();
                            }
                            if (typeof window.updateMapColors === 'function') {
                                window.updateMapColors();
                            }
                        }
                    });
            }
        }
    }
    
    // Initialize the module when the document is loaded
    // Don't initialize on DOM content loaded - initialize on demand
    // document.addEventListener('DOMContentLoaded', initialize);
    
    /**
     * Clear all tariff data - used when resetting the application state
     */
    function clearAllTariffData() {
        // Reset all module state
        selectedCountry = null;
        sectionToHs4Mapping = {};
        sectionWeights = {};
        beaSectionWeights = {};
        beaImportWeights = {};
        bilateralTariffs = {};
        sectionIdToName = {};
        currentPassThroughRate = 1.0;
        showOriginalAndCurrentTariffs = true;
        isGlobalTariff = false;
        submissionMode = 'country';
        onSubmitCallback = null;
        
        // Clear expanded state
        expandedSections = new Set();
        expandedChapters = new Set();
        
        // Clear the tariff propagator if it exists
        if (tariffPropagator && typeof tariffPropagator.clearAllData === 'function') {
            tariffPropagator.clearAllData();
        }
        
        // Set flag to force data reload on next open
        needsDataReload = true;
        
        //console.log('ProductTariffModal: Cleared all tariff data');
    }
    
    // Public API
    return {
        openModal,
        closeModal,
        initialize,
        handleTariffSubmit,
        clearAllTariffData // Add the clear method to public API
    };
})();

// Define an initialization function to be called when needed
function initializeModule() {
    // Expose the module globally
    window.ProductTariffModal = ProductTariffModal;
}

// Instead of immediate initialization, we'll expose a delayed initialization function
window.initializeProductTariffModal = initializeModule;