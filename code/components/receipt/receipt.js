document.addEventListener("DOMContentLoaded", function () {
    // First load the receipt HTML structure using DataPaths
    fetch(DataPaths.components.receipt.container)
        .then(response => response.text())
        .then(html => {
            document.getElementById("receipt-section-plhld").innerHTML = html;
            
            // Update the date on the receipt with the current date
            updateReceiptDate();
            
            // Add click handler for the "Total Price Effect" text
            setTimeout(() => {
                const totalPriceEffectText = document.getElementById('total-price-effect-text');
                if (totalPriceEffectText) {
                    totalPriceEffectText.addEventListener('click', function() {
                        //console.log('======= EFFECT VECTORS =======');
                        //console.log('Direct Effect Vector:', window.totalDirectEffectVector);
                        //console.log('Indirect Effect Vector:', window.totalIndirectEffectVector);
                        //console.log('Total Effect Vector:', window.totalTotalEffectVector);
                        
                        // Use the Aggregations module to process the vector
                        if (!window.Aggregations) {
                            console.warn('Aggregations module not loaded. Loading the script...');
                            
                            // Load the Aggregations module if not already loaded
                            const script = document.createElement('script');
                            script.src = 'code/components/calculations/aggregations.js';
                            script.onload = function() {
                                //console.log('Aggregations module loaded successfully');
                                processVectorWithAggregations();
                            };
                            script.onerror = function() {
                                console.warn('Failed to load Aggregations module');
                                //alert('Could not load aggregations module. Please try again later.');
                            };
                            document.head.appendChild(script);
                        } else {
                            processVectorWithAggregations();
                        }
                        
                        // Function to process the vector using the Aggregations module
                        function processVectorWithAggregations() {
                            // Create an array to hold all the promises
                            const aggregationPromises = [];
                            
                            // Process Direct Effect Vector
                            if (window.totalDirectEffectVector && window.totalDirectEffectVector.length > 0) {
                                const directPromise = window.Aggregations.aggregateVector(window.totalDirectEffectVector, {
                                    addAdjustments: true,
                                    adjustmentLayers: [0, 1, 2, 3, 4]
                                })
                                .then(result => {
                                    const { layerAggregations, layerVectors } = result;
                                    
                                    //console.log('Direct Effect Layer Aggregations:', layerAggregations);
                                    
                                    // Store results for other components to use
                                    window.nipaDirectLayerAggregations = layerAggregations;
                                    window.nipaDirectLayerVectors = layerVectors;
                                })
                                .catch(error => console.error('Error aggregating direct effects:', error));
                                
                                aggregationPromises.push(directPromise);
                            }
                            
                            // Process Indirect Effect Vector
                            if (window.totalIndirectEffectVector && window.totalIndirectEffectVector.length > 0) {
                                const indirectPromise = window.Aggregations.aggregateVector(window.totalIndirectEffectVector, {
                                    addAdjustments: true,
                                    adjustmentLayers: [0, 1, 2, 3, 4]
                                })
                                .then(result => {
                                    //console.log('Indirect Effect Aggregations:', result.layerAggregations);
                                    window.nipaIndirectLayerAggregations = result.layerAggregations;
                                    window.nipaIndirectLayerVectors = result.layerVectors;
                                })
                                .catch(error => console.error('Error aggregating indirect effects:', error));
                                
                                aggregationPromises.push(indirectPromise);
                            }
                            
                            // Process Total Effect Vector
                            if (window.totalTotalEffectVector && window.totalTotalEffectVector.length > 0) {
                                const totalPromise = window.Aggregations.aggregateVector(window.totalTotalEffectVector, {
                                    addAdjustments: true,
                                    adjustmentLayers: [0, 1, 2, 3, 4]
                                })
                                .then(result => {
                                   //console.log('Total Effect Aggregations:', result.layerAggregations);
                                    window.nipaTotalLayerAggregations = result.layerAggregations;
                                    window.nipaTotalLayerVectors = result.layerVectors;
                                })
                                .catch(error => console.error('Error aggregating total effects:', error));
                                
                                aggregationPromises.push(totalPromise);
                            }
                            
                            // Wait for all aggregations to complete, then show the panel
                            Promise.all(aggregationPromises)
                                .then(() => {
                                    
                                    // Show the tariff effects panel
                                    if (window.tariffEffectsPanel) {
                                        window.tariffEffectsPanel.showPanel();
                                    } else {
                                        console.error('Tariff effects panel not available');
                                        
                                        // Fallback to loading the dependencies and showing the original modal
                                        loadTreemapDependencies().then(() => {
                                            showTreemapModal();
                                        }).catch(err => {
                                            console.error('Error loading treemap dependencies:', err);
                                        });
                                    }
                                })
                                .catch(error => {
                                    console.error('Error in aggregations:', error);
                                });
                        }
                        
                        // Log the length of vectors if available
                        /*
                        if (window.totalDirectEffectVector) {
                            console.log('Vector length:', window.totalDirectEffectVector.length);
                        }
                        
                        // Log the sum of each vector (should match the displayed totals)
                        if (window.totalDirectEffectVector) {
                            const directSum = window.totalDirectEffectVector.reduce((sum, val) => sum + val, 0);
                            console.log('Sum of Direct Effects:', directSum, 'or', (directSum * 100).toFixed(2) + '%');
                        }
                        
                        if (window.totalIndirectEffectVector) {
                            const indirectSum = window.totalIndirectEffectVector.reduce((sum, val) => sum + val, 0);
                            console.log('Sum of Indirect Effects:', indirectSum, 'or', (indirectSum * 100).toFixed(2) + '%');
                        }
                        
                        if (window.totalTotalEffectVector) {
                            const totalSum = window.totalTotalEffectVector.reduce((sum, val) => sum + val, 0);
                            console.log('Sum of Total Effects:', totalSum, 'or', (totalSum * 100).toFixed(2) + '%');
                        }
                        
                        console.log('=============================');
                        */
                        // We'll show the tariff effects panel AFTER data processing is complete
                        // This happens in the processVectorWithAggregations function
                    });
                }
                
                // Function to load all necessary treemap dependencies
                function loadTreemapDependencies() {
                    return new Promise((resolve, reject) => {
                        const dependencies = [
                            // Core dependencies first
                            'src/utils/dataUtils/CompressedTreemap/metadataProvider.js',
                            'src/utils/dataUtils/CompressedTreemap/treemapNode.js',
                            'src/utils/dataUtils/CompressedTreemap/compressedDataAdapter.js',
                            'src/utils/dataUtils/CompressedTreemap/treemapLayout.js',
                            'src/utils/dataUtils/CompressedTreemap/treemapRenderer.js',
                            'src/utils/dataUtils/CompressedTreemap/index.js',
                            'src/renderers/sparksCompressedTreemap.js',
                            // Then our new modules
                            'src/dataAux/tariffTreemapData.js',
                            'src/auxiliaryGraphTypes/tariffEffectsTreemap.js'
                        ];
                        
                        // Counter to track loaded scripts
                        let loadedCount = 0;
                        let hasError = false;
                        
                        dependencies.forEach(scriptPath => {
                            // Check if script already loaded by looking for key elements
                            if ((scriptPath.includes('metadataProvider') && window.CompressedTreemap?.MetadataProvider) ||
                                (scriptPath.includes('treemapNode') && window.CompressedTreemap?.TreemapNode) ||
                                (scriptPath.includes('tariffTreemapData') && window.TariffTreemapData) ||
                                (scriptPath.includes('tariffEffectsTreemap') && window.tariffEffectsTreemap)) {
                                
                                loadedCount++;
                                if (loadedCount === dependencies.length) resolve();
                                return;
                            }
                            
                            const script = document.createElement('script');
                            script.src = scriptPath;
                            
                            script.onload = function() {
                                loadedCount++;
                                if (loadedCount === dependencies.length && !hasError) {
                                    resolve();
                                }
                            };
                            
                            script.onerror = function() {
                                console.error(`Failed to load script: ${scriptPath}`);
                                hasError = true;
                                reject(new Error(`Failed to load ${scriptPath}`));
                            };
                            
                            document.head.appendChild(script);
                        });
                    });
                }
                
                // Function to show the treemap modal
                function showTreemapModal() {
                    // Create modal container if it doesn't exist
                    let modal = document.getElementById('tariff-treemap-modal');
                    if (!modal) {
                        modal = document.createElement('div');
                        modal.id = 'tariff-treemap-modal';
                        modal.className = 'modal';
                        modal.style.display = 'none';
                        modal.style.position = 'fixed';
                        modal.style.top = '0';
                        modal.style.left = '0';
                        modal.style.width = '100%';
                        modal.style.height = '100%';
                        modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
                        modal.style.zIndex = '1000';
                        
                        // Create modal content
                        const modalContent = document.createElement('div');
                        modalContent.className = 'modal-content';
                        modalContent.style.backgroundColor = '#fff';
                        modalContent.style.margin = '5% auto';
                        modalContent.style.padding = '20px';
                        modalContent.style.width = '90%';
                        modalContent.style.maxWidth = '1000px';
                        modalContent.style.borderRadius = '5px';
                        modalContent.style.position = 'relative';
                        modalContent.style.maxHeight = '85vh';
                        modalContent.style.overflow = 'auto';
                        
                        // Create close button
                        const closeBtn = document.createElement('span');
                        closeBtn.className = 'close-btn';
                        closeBtn.innerHTML = '&times;';
                        closeBtn.style.position = 'absolute';
                        closeBtn.style.top = '10px';
                        closeBtn.style.right = '15px';
                        closeBtn.style.fontSize = '24px';
                        closeBtn.style.fontWeight = 'bold';
                        closeBtn.style.cursor = 'pointer';
                        closeBtn.onclick = function() {
                            modal.style.display = 'none';
                        };
                        
                        // Create title
                        const title = document.createElement('h2');
                        title.textContent = 'Tariff Effects Visualization';
                        title.style.marginTop = '0';
                        title.style.marginBottom = '20px';
                        
                        // Create tabs for different effect types
                        const tabContainer = document.createElement('div');
                        tabContainer.className = 'tab-container';
                        tabContainer.style.marginBottom = '20px';
                        
                        const tabs = ['Total', 'Direct', 'Indirect', 'Combined'];
                        tabs.forEach(tabName => {
                            const tab = document.createElement('button');
                            tab.textContent = `${tabName} Effects`;
                            tab.className = 'effect-tab';
                            tab.dataset.effectType = tabName.toLowerCase();
                            tab.style.padding = '8px 16px';
                            tab.style.marginRight = '10px';
                            tab.style.border = '1px solid #ccc';
                            tab.style.borderRadius = '4px';
                            tab.style.backgroundColor = '#f8f9fa';
                            tab.style.cursor = 'pointer';
                            
                            // Active tab style
                            if (tabName === 'Total') {
                                tab.style.backgroundColor = '#007bff';
                                tab.style.color = 'white';
                                tab.style.borderColor = '#007bff';
                            }
                            
                            tab.onclick = function() {
                                // Update active tab styling
                                document.querySelectorAll('.effect-tab').forEach(t => {
                                    t.style.backgroundColor = '#f8f9fa';
                                    t.style.color = 'black';
                                    t.style.borderColor = '#ccc';
                                });
                                tab.style.backgroundColor = '#007bff';
                                tab.style.color = 'white';
                                tab.style.borderColor = '#007bff';
                                
                                // Create the treemap for the selected effect type
                                createTreemap(tab.dataset.effectType);
                            };
                            
                            tabContainer.appendChild(tab);
                        });
                        
                        // Create container for the treemap
                        const treemapContainer = document.createElement('div');
                        treemapContainer.id = 'tariff-treemap-container';
                        treemapContainer.style.height = '500px';
                        treemapContainer.style.border = '1px solid #e9ecef';
                        treemapContainer.style.borderRadius = '4px';
                        
                        // Assemble modal content
                        modalContent.appendChild(closeBtn);
                        modalContent.appendChild(title);
                        modalContent.appendChild(tabContainer);
                        modalContent.appendChild(treemapContainer);
                        
                        // Add modal content to modal
                        modal.appendChild(modalContent);
                        
                        // Add modal to document
                        document.body.appendChild(modal);
                        
                        // Close modal when clicking outside
                        window.onclick = function(event) {
                            if (event.target === modal) {
                                modal.style.display = 'none';
                            }
                        };
                    }
                    
                    // Display the modal
                    modal.style.display = 'block';
                    
                    // Create the treemap
                    createTreemap('total');
                }
                
                // Function to create the treemap
                function createTreemap(effectType) {
                    if (!window.tariffEffectsTreemap) {
                        console.error('Treemap component not loaded');
                        return;
                    }
                    
                    // Clear previous content
                    const container = document.getElementById('tariff-treemap-container');
                    if (container) {
                        container.innerHTML = '<div class="loading-indicator">Loading tariff effect treemap...</div>';
                    }
                    
                    // Ensure we have the aggregated data
                    if (effectType === 'direct' && !window.nipaDirectLayerAggregations) {
                        container.innerHTML = '<div class="error-message">Direct effect data not available. Please try again.</div>';
                        return;
                    }
                    
                    if (effectType === 'indirect' && !window.nipaIndirectLayerAggregations) {
                        container.innerHTML = '<div class="error-message">Indirect effect data not available. Please try again.</div>';
                        return;
                    }
                    
                    if (effectType === 'total' && !window.nipaTotalLayerAggregations) {
                        container.innerHTML = '<div class="error-message">Total effect data not available. Please try again.</div>';
                        return;
                    }
                    
                    if (effectType === 'combined' && (!window.nipaDirectLayerAggregations || !window.nipaIndirectLayerAggregations)) {
                        container.innerHTML = '<div class="error-message">Direct and indirect effect data required for combined view. Please try again.</div>';
                        return;
                    }
                    
                    // Create the treemap
                    window.tariffEffectsTreemap.createChart('tariff-treemap-container', effectType, {
                        title: `Tariff ${effectType.charAt(0).toUpperCase() + effectType.slice(1)} Effects`,
                        onSuccess: function() {
                        },
                        onError: function(error) {
                            console.error(`Error creating ${effectType} treemap:`, error);
                            container.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
                        }
                    });
                }
            }, 500);
            
            // Load the customReceiptOrder.js script
            const script = document.createElement('script');
            script.src = 'code/components/receipt/customReceiptOrder.js';
            script.onload = function() {
                // Initialize the custom receipt order dropdown after loading
                if (window.CustomReceiptOrder && typeof window.CustomReceiptOrder.initialize === 'function') {
                    window.CustomReceiptOrder.initialize();
                }
            };
            document.head.appendChild(script);
            if (!window.isoToCountryName || Object.keys(window.isoToCountryName).length < 100) {
                
                // Pre-load country mappings if they weren't loaded already
                fetch(DataPaths.meta.country_continent)
                    .then(response => response.json())
                    .then(data => {
                        // Ensure the variable exists
                        window.isoToCountryName = window.isoToCountryName || {};
                        
                        // Build a complete country name mapping
                        let countryCount = 0;
                        Object.keys(data).forEach(continent => {
                            data[continent].forEach(country => {
                                const isoCode = Array.isArray(country.ISO_A3) ? country.ISO_A3[0] : country.ISO_A3;
                                const countryName = Array.isArray(country.country) ? country.country[0] : country.country;
                                
                                // Add to the global map
                                if (isoCode && countryName) {
                                    window.isoToCountryName[isoCode] = countryName;
                                    countryCount++;
                                }
                            });
                        });
                        
                        //console.log(`Pre-populated ${countryCount} country name mappings from receipt initialization`);
                    })
                    .catch(error => console.error("Error loading country mappings:", error));
            } else {
                //console.log("Country mappings already loaded:", Object.keys(window.isoToCountryName).length, "countries");
            }
            
            // Set up the global row input handler
            setTimeout(() => {
                const globalInput = document.getElementById('global-row-input');
                const toggleIcon = document.getElementById('global-toggle-icon');
                
                // Ensure global row has the same toggle behavior as other rows
                if (toggleIcon) {
                    // Remove any existing click handlers first
                    const newToggleIcon = toggleIcon.cloneNode(true);
                    toggleIcon.parentNode.replaceChild(newToggleIcon, toggleIcon);
                    
                    // Add click handler to the new toggle icon
                    newToggleIcon.addEventListener('click', function() {
                        const effectsDetail = document.getElementById('global-effects-detail');
                        if (effectsDetail) {
                            const isHidden = effectsDetail.style.display === 'none';
                            effectsDetail.style.display = isHidden ? 'block' : 'none';
                            
                            // Toggle between plus and minus icons
                            const plusIcon = newToggleIcon.querySelector('.toggle-plus');
                            const minusIcon = newToggleIcon.querySelector('.toggle-minus');
                            
                            if (plusIcon && minusIcon) {
                                plusIcon.style.display = isHidden ? 'none' : 'inline';
                                minusIcon.style.display = isHidden ? 'inline' : 'none';
                            }
                        }
                    });
                }
                
                if (globalInput) {
                    // Function to handle input submit (on enter or blur)
                    function handleInputSubmit() {
                        // When the global tariff input changes, calculate and apply Rest of World tariffs
                        const tariffValue = parseFloat(globalInput.value) || 0;
                        
                        // Get toggle enabled state from global setting
                        const toggleEnabled = window.effectDetailsToggleEnabled !== undefined ? 
                                            window.effectDetailsToggleEnabled : true;
                        
                        // Show/hide the toggle icon based on whether there's a tariff value AND toggle is enabled
                        const toggleIcon = document.getElementById('global-toggle-icon');
                        if (toggleIcon) {
                            if (toggleEnabled) {
                                toggleIcon.style.display = tariffValue > 0 ? 'inline' : 'none';
                                // Default to collapsed state when tariff is added
                                // Using the same chevron image toggle pattern as other rows
                                const plusIcon = toggleIcon.querySelector('.toggle-plus');
                                const minusIcon = toggleIcon.querySelector('.toggle-minus');
                                if (plusIcon && minusIcon) {
                                    plusIcon.style.display = 'inline';
                                    minusIcon.style.display = 'none';
                                }
                            } else {
                                // Hide toggle icon if toggle feature is disabled
                                toggleIcon.style.display = 'none';
                            }
                        }
                        
                        // Handle effects detail visibility
                        const effectsDetail = document.getElementById('global-effects-detail');
                        if (effectsDetail) {
                            if (toggleEnabled) {
                                // When toggle is enabled, hide details by default
                                effectsDetail.style.display = 'none';
                            } else {
                                // When toggle is disabled, always show details if there's a tariff
                                effectsDetail.style.display = tariffValue > 0 ? 'block' : 'none';
                            }
                            
                            // But ensure the details are calculated and ready even if hidden
                            if (tariffValue === 0) {
                                toggleIcon.style.display = 'none';
                            }
                        }
                        
                        // Make sure country mappings are loaded before calculating global tariff
                        if (tariffValue > 0 && window.isoToCountryName && Object.keys(window.isoToCountryName).length < 100) {
                            //console.log("Country mappings not fully loaded yet, loading them before calculating global tariff...");
                            
                            // Fetch and populate mappings first, then calculate effects
                            fetch(DataPaths.meta.country_continent)
                                .then(response => response.json())
                                .then(data => {
                                    Object.keys(data).forEach(continent => {
                                        data[continent].forEach(country => {
                                            const isoCode = Array.isArray(country.ISO_A3) ? country.ISO_A3[0] : country.ISO_A3;
                                            const countryName = Array.isArray(country.country) ? country.country[0] : country.country;
                                            
                                            if (isoCode && countryName) {
                                                window.isoToCountryName[isoCode] = countryName;
                                            }
                                        });
                                    });
                                    
                                    //console.log(`Pre-populated country mappings before global tariff, now calculating effects...`);
                                    // Now calculate the effects after mappings are loaded
                                    calculateRestOfWorldEffects(tariffValue); // Already in percentages. 
                                })
                                .catch(error => {
                                    console.error("Error loading country mappings:", error);
                                    // Fall back to calculating effects even without mappings
                                    calculateRestOfWorldEffects(tariffValue);
                                });
                        } else {
                            // Calculate the effects for rest of world countries if mappings already loaded
                            calculateRestOfWorldEffects(tariffValue); // Already in percentages
                        }
                    }
                    
                    // Listen for the Enter key
                    globalInput.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            handleInputSubmit();
                        }
                    });
                    
                    // Listen for blur event (when focus leaves the input)
                    globalInput.addEventListener('blur', handleInputSubmit);
                }
                
                // Listen for calculation events from TariffCalculations
                document.addEventListener('calculationComplete', function(event) {
                    updateReceiptDisplay();
                });
                
                document.addEventListener('calculationsCleared', function() {
                    // Pass fromEvent=true to prevent infinite recursion
                    clearCountries(true);
                });
                
                document.addEventListener('calculationRemoved', function(event) {
                    // Update receipt display which will check if any countries remain
                    updateReceiptDisplay();
                });
                
                // After receipt HTML is loaded, initialize the correct view
                selectCountryReceiptPrompt([]);
            }, 100);
        })
        .catch(error => console.error("Error loading receipt:", error));
});

function selectCountryReceiptPrompt(selectedISOs) {
    setTimeout(() => {
        // Get DOM elements with null checks
        const placeholder = document.getElementById('placeholder-message');
        const receipt_totals = document.getElementById('receipt_totals');
        const receiptItems = document.getElementById('receipt-items');
        
        // If any elements are missing, the DOM isn't ready yet
        if (!placeholder || !receipt_totals || !receiptItems) {
            //console.warn("Receipt elements not found, trying again in 100ms");
            // Try again in 100ms
            setTimeout(() => selectCountryReceiptPrompt(selectedISOs), 100);
            return;
        }
        
        // Check if we actually have any countries to display
        // First check TariffCalculations for results
        let hasCountries = false;
        
        if (window.TariffCalculations) {
            const results = window.TariffCalculations.getMostRecentResults();
            hasCountries = results && results.length > 0;
        }
        
        // If no countries in TariffCalculations, check selectedISOs array
        if (!hasCountries) {
            hasCountries = selectedISOs && selectedISOs.length > 0;
        }
        
        if (!hasCountries) {
            // Load placeholder message with buttons using DataPaths
            fetch(DataPaths.components.receipt.placeholder)
                .then(response => response.text())
                .then(html => {
                    placeholder.innerHTML = html;
                    placeholder.style.display = 'block';
                    receiptItems.innerHTML = '';
                    receipt_totals.style.display = 'none';
                })
                .catch(error => console.error("Error loading placeholder:", error));
        } else {
            // Hide placeholder, show receipt content
            placeholder.style.display = 'none';
            receipt_totals.style.display = 'block';
            
            // If we got here via TariffCalculations, we need to update the selectedISOs array
            if (window.TariffCalculations) {
                const results = window.TariffCalculations.getMostRecentResults();
                if (results && results.length > 0) {
                    const isoList = results.map(result => result.isoCode);
                    updateReceipt(isoList);
                    return;
                }
            }
            
            // Otherwise, use the passed selectedISOs
            updateReceipt(selectedISOs);
        }
    }, 100);
}

function updateReceipt(selectedISOs) {
    //console.log("Updating receipt with ISOs:", selectedISOs);
    
    // Filter out 'WLD' and 'WRLD' from the selected ISOs
    selectedISOs = selectedISOs.filter(iso => iso !== 'WLD' && iso !== 'WRLD');
    
    if (selectedISOs.length === 0) {
        // No countries selected, just show the placeholder
        return;
    }
    
    // Apply sorting if CustomReceiptOrder is available
    if (window.CustomReceiptOrder && typeof window.CustomReceiptOrder.sortSelectedISOs === 'function') {
        selectedISOs = window.CustomReceiptOrder.sortSelectedISOs(selectedISOs);
    }
    
    try {
        // Always clear the receipt items container first
        const receiptItemsDiv = document.getElementById('receipt-items');
        if (receiptItemsDiv) {
            receiptItemsDiv.innerHTML = '';
        } else {
            console.error('Receipt items container not found!');
            return; // Exit if we can't find the container
        }
        
        let subtotal = 0;
        let subtotalDirectEffect = 0;
        let subtotalIndirectEffect = 0;
        
        // Arrays to store summed effect vectors
        let subtotalDirectEffectVector = null;
        let subtotalIndirectEffectVector = null;
        let subtotalTotalEffectVector = null;
        
        // First create the receipt with what we know
        selectedISOs.forEach(iso => {
            // Make sure we have a country name (at minimum the ISO code)
            let countryName = window.isoToCountryName ? window.isoToCountryName[iso] : iso;
            
            // Double-check if mapping is missing, try to get it from backup sources
            if (!countryName || countryName === iso) {
                
                // Try to get country name from TariffCalculations data if available
                if (window.TariffCalculations && 
                    window.TariffCalculations.currentTariffData && 
                    window.TariffCalculations.currentTariffData.countryNames && 
                    window.TariffCalculations.currentTariffData.countryNames[iso]) {
                    
                    countryName = window.TariffCalculations.currentTariffData.countryNames[iso];
                    
                    // Save it to the global mapping for future use
                    if (window.isoToCountryName) {
                        window.isoToCountryName[iso] = countryName;
                    }
                } else if (window.detailedEffectsData && window.detailedEffectsData[iso] && 
                    window.detailedEffectsData[iso].countryName && 
                    window.detailedEffectsData[iso].countryName !== iso) {
                    
                    countryName = window.detailedEffectsData[iso].countryName;
                    
                    // Save it to the global mapping for future use
                    if (window.isoToCountryName) {
                        window.isoToCountryName[iso] = countryName;
                    }
                } else if (window.countryDataModule && window.countryDataModule.getCountryData) {
                    // Try to load from country data module as a last attempt
                    
                    // Use Promise to handle async function inline
                    try {
                        // Use setTimeout and fetch immediately
                        window.countryDataModule.getCountryData(iso)
                            .then(countryData => {
                                if (countryData && countryData.name) {
                                    // Update the country name in the DOM after it's ready
                                    const countryElement = document.querySelector(`#receipt-item-${iso} .country-row-title .clickable[data-iso="${iso}"]`);
                                    if (countryElement) {
                                        countryElement.textContent = countryData.name;
                                    }
                                    // Also save to global mapping
                                    if (window.isoToCountryName) {
                                        window.isoToCountryName[iso] = countryData.name;
                                    }
                                }
                            })
                            .catch(err => {
                            });
                    } catch (e) {
                    }
                    
                    // Fallback to ISO code initially, will be updated when data is loaded
                    countryName = iso;
                } else {
                    // Ultimate fallback to ISO code if no name found anywhere
                    countryName = iso;
                }
            }
            
            // Store the country name
            if (!window.selectedCountries) window.selectedCountries = {};
            window.selectedCountries[iso] = countryName;
            
            // Get calculation results from TariffCalculations module
            let directEffect = 0;
            let indirectEffect = 0;
            let totalEffect = 0;
            
            // Try to get values from TariffCalculations module first
            if (window.TariffCalculations) {
                const results = window.TariffCalculations.getMostRecentResults();
                const countryResult = results.find(r => r.isoCode === iso);
                
                if (countryResult) {
                    directEffect = countryResult.directSum || 0;
                    indirectEffect = countryResult.indirectSum || 0;
                    totalEffect = countryResult.totalSum || 0;
                    
                    // Add to subtotal direct and indirect effects
                    subtotalDirectEffect += directEffect;
                    subtotalIndirectEffect += indirectEffect;
                    
                    // Accumulate effect vectors if available
                    if (countryResult.directEffectVector) {
                        if (!subtotalDirectEffectVector) {
                            // Initialize the array with the first country's values
                            subtotalDirectEffectVector = [...countryResult.directEffectVector];
                        } else {
                            // Add each element to the running sum
                            countryResult.directEffectVector.forEach((value, i) => {
                                subtotalDirectEffectVector[i] = (subtotalDirectEffectVector[i] || 0) + value;
                            });
                        }
                    }
                    
                    if (countryResult.indirectEffectVector) {
                        if (!subtotalIndirectEffectVector) {
                            // Initialize the array with the first country's values
                            subtotalIndirectEffectVector = [...countryResult.indirectEffectVector];
                        } else {
                            // Add each element to the running sum
                            countryResult.indirectEffectVector.forEach((value, i) => {
                                subtotalIndirectEffectVector[i] = (subtotalIndirectEffectVector[i] || 0) + value;
                            });
                        }
                    }
                    
                    if (countryResult.totalEffectVector) {
                        if (!subtotalTotalEffectVector) {
                            // Initialize the array with the first country's values
                            subtotalTotalEffectVector = [...countryResult.totalEffectVector];
                        } else {
                            // Add each element to the running sum
                            countryResult.totalEffectVector.forEach((value, i) => {
                                subtotalTotalEffectVector[i] = (subtotalTotalEffectVector[i] || 0) + value;
                            });
                        }
                    }
                    
                    // Store the direct effect in case needed elsewhere
                    if (!window.selectedDirectEffects) window.selectedDirectEffects = {};
                    window.selectedDirectEffects[iso] = directEffect;
                }
            } else {
                // Fallback to the old implementation
                directEffect = window.selectedDirectEffects ? (window.selectedDirectEffects[iso] || 0) : 0;
                indirectEffect = 0;
                totalEffect = directEffect + indirectEffect;
            }
            
            // Add to the subtotal
            subtotal += totalEffect;
            
            // Create the receipt item element
            const lineItemDiv = document.createElement('div');
            lineItemDiv.className = 'receipt-item';
            lineItemDiv.id = `receipt-item-${iso}`;
            
            // Create a unique ID for this country's effects detail
            const effectsDetailId = `effects-detail-${iso}`;
            
            // Render the receipt item with clickable country name and toggle
            lineItemDiv.innerHTML = `
                <div class="receipt-item-left">
                    <button class="remove-btn" onclick="removeCountry('${iso}')">
                        <img src="${DataPaths.assets.fontawesome.trashSolid}" alt="Remove" class="trash-icon">
                    </button>
                    <div>
                        <div class="country-row-title">
                            <span class="clickable" data-iso="${iso}" onclick="zoomToCountry('${iso}')">${countryName}</span>
                            <span class="clickable effects-summary-btn" data-iso="${iso}" onclick="showSummaryEffects('${iso}')" title="Show effects summary">
                                <img src="assets/fontawesome/chart-line-solid.svg" alt="Effects" class="effects-icon" style="width: 14px; height: 14px; margin-left: 5px; color:var(--text-color);">
                            </span>
                            <span class="toggle-icon country-toggle receipt-chevron" data-target="${effectsDetailId}">
                                <img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-plus">
                                <img src="assets/fontawesome/chevron-down-solid.svg" alt="Collapse" class="toggle-minus" style="display: none;">
                            </span>
                        </div>
                        <div id="${effectsDetailId}" class="country-effects-detail" style="display: none; margin-top: -14px">
                            <span> <br>
                                <span class="effect-label">Direct Effect: </span><span class="effect-value">${formatEffectValue(directEffect)}</span><br>
                                <span class="effect-label">Indirect Effect: </span><span class="effect-value">${formatEffectValue(indirectEffect)}</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div>
                    <span>${formatEffectValue(totalEffect)}</span>
                </div>
            `;
            receiptItemsDiv.appendChild(lineItemDiv);
        });
        
        // Update totals - subtotal is already in decimal form, but direct/indirect need conversion
        document.getElementById('subtotal-value').textContent = formatEffectValue(subtotal);
        document.getElementById('subtotal-direct-effect').textContent = formatEffectValue(subtotalDirectEffect);
        document.getElementById('subtotal-indirect-effect').textContent = formatEffectValue(subtotalIndirectEffect);
        
        /*Log the subtotal values to debug
        console.log('Subtotal values:', {
            total: subtotal,
            direct: subtotalDirectEffect,
            indirect: subtotalIndirectEffect
        });*/
        
        // Store the subtotal vectors in global variables for future use
        window.subtotalDirectEffectVector = subtotalDirectEffectVector;
        window.subtotalIndirectEffectVector = subtotalIndirectEffectVector;
        window.subtotalTotalEffectVector = subtotalTotalEffectVector;
        
        // Update the total effect (includes rest of world)
        updateTotalEffect(subtotalDirectEffect, subtotalIndirectEffect);
        
        // Update map colors based on country effects
        updateMapColors();
        
        // Set up the country toggle handlers
        setupCountryToggles();
        
        // Apply sorting to the receipt if the module is available
        if (window.CustomReceiptOrder && typeof window.CustomReceiptOrder.applySortToReceipt === 'function') {
            window.CustomReceiptOrder.applySortToReceipt();
        }
    } catch (error) {
        console.error("Error rendering receipt:", error);
    }
}

// Helper function to format effect values using formatUtils if available
function formatEffectValue(value) {
    if (window.formatUtils && typeof window.formatUtils.formatPercent === 'function') {
        // Use 2 decimal places as originally implemented
        return window.formatUtils.formatPercent(value, 2);
    }
    // Fallback to original implementation with 2 decimal places
    return (value * 100).toFixed(2) + '%';
}

// Function to update the receipt display when calculation results change
function updateReceiptDisplay() {
    
    if (!window.TariffCalculations) {
        console.error('TariffCalculations module not found');
        return;
    }
    
    try {
        // Get the most recent calculation results
        const results = window.TariffCalculations.getMostRecentResults();
        
        if (!results || results.length === 0) {
            // Reset map colors when no results are available
            if (window.resetMapColors) {
                window.resetMapColors();
            }
            
            // Clear everything including subtotal and total effects
            window.selectedISOs = [];
            clearCountries();
            return;
        }
        
        // Extract ISO codes from results, filtering out 'WLD' and 'WRLD'
        const isoList = results
            .filter(result => result.isoCode !== 'WLD' && result.isoCode !== 'WRLD')
            .map(result => result.isoCode);
        
        // Update global selectedISOs array, making sure to use a new array instance
        // This ensures that any references to the old array won't cause issues
        window.selectedISOs = [...isoList];
        
        // Hide placeholder message and show receipt totals section
        const placeholder = document.getElementById('placeholder-message');
        const receipt_totals = document.getElementById('receipt_totals');
        
        if (placeholder && receipt_totals) {
            placeholder.style.display = 'none';
            receipt_totals.style.display = 'block';
        }
        
        // First clear the receipt items container
        const receiptItemsContainer = document.getElementById('receipt-items');
        if (receiptItemsContainer) {
            receiptItemsContainer.innerHTML = '';
        }
        
        // Then update the receipt with fresh data
        updateReceipt(isoList);
    } catch (error) {
        console.error('Error updating receipt display:', error);
    }
}

function updateTotalEffect(subtotalDirectEffect, subtotalIndirectEffect) {
    // Calculate total effect from subtotal and rest of world
    const subtotalValueText = document.getElementById('subtotal-value').textContent || '0%';
    const globalValueText = document.getElementById('global-row-value').textContent || '0%';
    
    // Parse the percentage values using formatUtils if available
    let subtotalValue, globalValue;
    
    if (window.formatUtils && typeof window.formatUtils.parseFormattedNumber === 'function') {
        // Parse as percentages (returns decimal values like 0.0123)
        subtotalValue = window.formatUtils.parseFormattedNumber(subtotalValueText, true);
        globalValue = window.formatUtils.parseFormattedNumber(globalValueText, true);
        
        // Convert to percentage for display (multiply by 100)
        subtotalValue = subtotalValue * 100;
        globalValue = globalValue * 100;
    } else {
        // Fallback to basic parsing
        // Remove % sign and any commas, then parse
        subtotalValue = parseFloat(subtotalValueText.replace('%', '').replace(/,/g, ''));
        globalValue = parseFloat(globalValueText.replace('%', '').replace(/,/g, ''));
        
        // If parsing failed, use 0
        if (isNaN(subtotalValue)) subtotalValue = 0;
        if (isNaN(globalValue)) globalValue = 0;
    }
    
    // Get direct and indirect effects for the global tariff (rest of world)
    const globalDirectValueText = document.getElementById('global-direct-effect').textContent || '0%';
    const globalIndirectValueText = document.getElementById('global-indirect-effect').textContent || '0%';
    
    // Parse global direct and indirect effects
    let globalDirectValue, globalIndirectValue;
    
    if (window.formatUtils && typeof window.formatUtils.parseFormattedNumber === 'function') {
        globalDirectValue = window.formatUtils.parseFormattedNumber(globalDirectValueText, true);
        globalIndirectValue = window.formatUtils.parseFormattedNumber(globalIndirectValueText, true);
    } else {
        globalDirectValue = parseFloat(globalDirectValueText.replace('%', '').replace(/,/g, '')) / 100;
        globalIndirectValue = parseFloat(globalIndirectValueText.replace('%', '').replace(/,/g, '')) / 100;
        
        if (isNaN(globalDirectValue)) globalDirectValue = 0;
        if (isNaN(globalIndirectValue)) globalIndirectValue = 0;
    }
    
    // If subtotalDirectEffect and subtotalIndirectEffect were not provided, try to extract them
    if (subtotalDirectEffect === undefined || subtotalIndirectEffect === undefined) {
        const subtotalDirectValueText = document.getElementById('subtotal-direct-effect').textContent || '0%';
        const subtotalIndirectValueText = document.getElementById('subtotal-indirect-effect').textContent || '0%';
        
        if (window.formatUtils && typeof window.formatUtils.parseFormattedNumber === 'function') {
            subtotalDirectEffect = window.formatUtils.parseFormattedNumber(subtotalDirectValueText, true);
            subtotalIndirectEffect = window.formatUtils.parseFormattedNumber(subtotalIndirectValueText, true);
        } else {
            subtotalDirectEffect = parseFloat(subtotalDirectValueText.replace('%', '').replace(/,/g, '')) / 100;
            subtotalIndirectEffect = parseFloat(subtotalIndirectValueText.replace('%', '').replace(/,/g, '')) / 100;
            
            if (isNaN(subtotalDirectEffect)) subtotalDirectEffect = 0;
            if (isNaN(subtotalIndirectEffect)) subtotalIndirectEffect = 0;
        }
    }
    
    // Log the values to ensure they're correct
    /*
    console.log('Direct effect values:', {
        subtotal: subtotalDirectEffect,
        global: globalDirectValue
    });
    console.log('Indirect effect values:', {
        subtotal: subtotalIndirectEffect,
        global: globalIndirectValue
    });
    */

    // Calculate total direct and indirect effects
    const totalDirectEffect = (subtotalDirectEffect || 0) + (globalDirectValue || 0);
    const totalIndirectEffect = (subtotalIndirectEffect || 0) + (globalIndirectValue || 0);
    
    // Calculate total effect - ensure both values are in the same format (percentage)
    // The direct and indirect effects are in decimal form, so we need to keep everything consistent
    const totalEffect = totalDirectEffect + totalIndirectEffect;
    
    // Log the calculated total effects
    /*
    console.log('Total effect calculated:', {
        directTotal: totalDirectEffect,
        indirectTotal: totalIndirectEffect,
        combinedTotal: totalEffect,
        usingComponents: true,
        oldCalculation: subtotalValue + globalValue
    });
    */
    // Update the UI - keep all values in decimal form when using formatEffectValue
    document.getElementById('total-effect').textContent = formatEffectValue(totalEffect);
    document.getElementById('total-direct-effect').textContent = formatEffectValue(totalDirectEffect);
    document.getElementById('total-indirect-effect').textContent = formatEffectValue(totalIndirectEffect);
    
    // Combine effect vectors for global (rest of world) and subtotal
    // This combines both the countries in the receipt and the rest of world effects
    if (window.subtotalDirectEffectVector && window.globalDirectEffectVector) {
        window.totalDirectEffectVector = window.subtotalDirectEffectVector.map((value, i) => {
            return value + (window.globalDirectEffectVector[i] || 0);
        });
    } else {
        window.totalDirectEffectVector = window.subtotalDirectEffectVector || window.globalDirectEffectVector;
    }
    
    if (window.subtotalIndirectEffectVector && window.globalIndirectEffectVector) {
        window.totalIndirectEffectVector = window.subtotalIndirectEffectVector.map((value, i) => {
            return value + (window.globalIndirectEffectVector[i] || 0);
        });
    } else {
        window.totalIndirectEffectVector = window.subtotalIndirectEffectVector || window.globalIndirectEffectVector;
    }
    
    if (window.subtotalTotalEffectVector && window.globalTotalEffectVector) {
        window.totalTotalEffectVector = window.subtotalTotalEffectVector.map((value, i) => {
            return value + (window.globalTotalEffectVector[i] || 0);
        });
    } else {
        window.totalTotalEffectVector = window.subtotalTotalEffectVector || window.globalTotalEffectVector;
    }
    
    
    // Store the total effect as a decimal (not percentage) for color calculations
    window.totalPriceEffect = totalEffect / 100;
    
    
    // Add the Rest of World effect if it exists (for logging purposes)
    const restOfWorldEffect = window.restOfWorldEffect || 0;
}

// Use the global getColorForPriceEffect from map.js instead of duplicating the function
// This follows the code organization principle in CLAUDE.md - map coloring functions should be in map.js

// Call the global updateMapColors function from map.js
function updateMapColors() {
    
    // Call the global implementation if available
    if (window.updateMapColors) {
        window.updateMapColors();
    } else {
        console.error("Global updateMapColors function not found. Map colors may not be updated correctly.");
    } // I think I like the new version better?? a pain to implement but oh well 
}

// Make removeCountry globally available for the receipt delete buttons
window.removeCountry = function(iso) {
    
    // Remove the country from calculation results
    if (window.TariffCalculations) {
        // Check if there is a method to remove a specific ISO
        if (typeof window.TariffCalculations.removeCountryResult === 'function') {
            // If the method exists, use it to remove the country
            const wasRemoved = window.TariffCalculations.removeCountryResult(iso);
            
            // Also ensure we remove the country from selectedISOs
            window.selectedISOs = window.selectedISOs.filter(item => item !== iso);
            
            // Check if this was the last country
            if (!window.selectedISOs || window.selectedISOs.length === 0) {
                clearCountries();
                
                // Force update map colors
                if (typeof updateMapColors === 'function') {
                    updateMapColors();
                }
                return;
            }
            
            // Update receipt display for remaining countries
            updateReceiptDisplay();
            
            // Force update map colors
            if (typeof updateMapColors === 'function') {
                updateMapColors();
            }
            
            return; // Early return as updateReceiptDisplay will handle everything else
        }
        
        // Fallback: Get current results and update UI without the removed country
        const results = window.TariffCalculations.getMostRecentResults();
        const filteredResults = results.filter(result => result.isoCode !== iso);
        
        if (results.length !== filteredResults.length) {
            
            // Remove the country from selection
            window.selectedISOs = window.selectedISOs.filter(item => item !== iso);
            
            // If no countries left, clear calculations and show placeholder
            if (!window.selectedISOs || window.selectedISOs.length === 0) {
                
                // Clear calculation results to ensure they don't reappear
                if (window.TariffCalculations && typeof window.TariffCalculations.clearScenarioResults === 'function') {
                    window.TariffCalculations.clearScenarioResults();
                }
                
                // Full cleanup - reset all values and display placeholder
                clearCountries();
                return;
            }
            
            // Re-render the receipt with the remaining countries
            updateReceipt(window.selectedISOs);
            updateTotalEffect();
            updateMapColors();
            return;
        }
    }
    
    // Fallback to the old implementation if TariffCalculations doesn't handle it
    
    // Remove the country from selection (using the function from countryList.js)
    if (typeof removeISO === 'function') {
        removeISO(iso);
    } else {
        // Fallback if removeISO isn't available
        window.selectedISOs = window.selectedISOs.filter(item => item !== iso);
    }
    
    // Also remove from stored effects
    if (window.selectedDirectEffects && iso in window.selectedDirectEffects) {
        delete window.selectedDirectEffects[iso];
    }
    
    // Remove from the receipt visually - directly remove the element
    const receiptItem = document.getElementById(`receipt-item-${iso}`);
    if (receiptItem) {
        receiptItem.remove();
    } else {
        console.warn(`Receipt item for ${iso} not found`);
    }
    
    // Recalculate the subtotal from all remaining countries
    let subtotal = 0;
    if (window.TariffCalculations) {
        // Get updated results after removal
        const results = window.TariffCalculations.getMostRecentResults();
        results.forEach(result => {
            subtotal += result.totalSum || 0;
        });
    } else if (window.selectedISOs && window.selectedDirectEffects) {
        // Fallback to old implementation
        window.selectedISOs.forEach(iso => {
            const directEffect = window.selectedDirectEffects[iso] || 0;
            subtotal += directEffect;
        });
    }
    
    // Update the subtotal display
    document.getElementById('subtotal-value').textContent = formatEffectValue(subtotal);
    
    // Check if this was the last country before trying to update effects
    if (!window.selectedISOs || window.selectedISOs.length === 0) {
        clearCountries();
        return; // Exit early to avoid unnecessary calculations
    }
    
    // Update the total effect only if we still have countries
    updateTotalEffect();
    
    // Double-check after updateTotalEffect (it might have changed the state)
    if (!window.selectedISOs || window.selectedISOs.length === 0) {
        clearCountries();
    } else {
        // Force refresh of the receipt items to ensure UI is up-to-date
        const receiptItemsContainer = document.getElementById('receipt-items');
        if (receiptItemsContainer) {
            // Rebuild receipt items from scratch based on selectedISOs
            receiptItemsContainer.innerHTML = '';
            updateReceipt(window.selectedISOs);
        }
        
        // Make sure the receipt is visible (not the placeholder)
        const placeholder = document.getElementById('placeholder-message');
        const receipt_totals = document.getElementById('receipt_totals');
        
        if (placeholder && receipt_totals) {
            placeholder.style.display = 'none';
            receipt_totals.style.display = 'block';
        }
    }
    
    // Force update map colors
    updateMapColors();
    
    // Apply sorting to the receipt if the module is available
    if (window.CustomReceiptOrder && typeof window.CustomReceiptOrder.applySortToReceipt === 'function') {
        window.CustomReceiptOrder.applySortToReceipt();
    }
}

// Make clearCountries globally available
window.clearCountries = function(fromEvent = false) {
    // Clear calculations data if the module is available
    if (window.TariffCalculations) {
        // Only call clearScenarioResults if not already being called from an event
        // This prevents infinite recursion
        if (!fromEvent && typeof window.TariffCalculations.clearScenarioResults === 'function') {
            // Pass a flag to prevent event dispatch if needed
            window.TariffCalculations.clearScenarioResults(true); // true = skipEvent
        }
        
        // Double check and explicitly clear the currentTariffData properties
        // This is an extra safety measure to ensure all data is cleared
        if (window.TariffCalculations.currentTariffData) {
            window.TariffCalculations.currentTariffData = {
                iso_list: [],
                bea_codes: window.TariffCalculations.customBEAOrder || [],
                tau_c: [],
                tauCForCalculations: {},
                importWeighted: false,
                countryNames: {},
                sectionTariffs: {},
                tariffSource: 'unknown',
                tariffMetadata: {}
            };
        }
    }
    
    // CRITICAL: Clear tariff data from all modules
    
    // 1. Clear the TariffPropagator instance data
    if (window.tariffPropagator && typeof window.tariffPropagator.clearAllData === 'function') {
        console.log('Clearing tariffPropagator data');
        window.tariffPropagator.clearAllData();
    } else if (window.TariffPropagation && typeof window.TariffPropagation.prototype.clearAllData === 'function') {
        // If we have the class but not an instance, create a temporary instance and clear it
        console.log('Creating temporary tariffPropagator instance to clear data');
        window.tariffPropagator = new window.TariffPropagation();
        window.tariffPropagator.clearAllData();
    }
    
    // 2. Clear the ProductTariffModal data
    if (window.ProductTariffModal && typeof window.ProductTariffModal.clearAllTariffData === 'function') {
        console.log('Clearing ProductTariffModal data');
        window.ProductTariffModal.clearAllTariffData();
    }
    
    // Clear global tracking variables
    window.selectedISOs = [];
    window.selectedTariffs = {};
    window.selectedCountries = {};
    window.selectedDirectEffects = {};
    window.totalPriceEffect = 0;
    window.detailedEffectsData = {};
    window.restOfWorldDetailedEffects = {};
    
    // Reset Rest of World calculation
    document.getElementById('global-row-input').value = "0.00";
    document.getElementById('global-row-value').textContent = formatEffectValue(0);
    document.getElementById('global-direct-effect').textContent = formatEffectValue(0);
    document.getElementById('global-indirect-effect').textContent = formatEffectValue(0);
    document.getElementById('global-effects-detail').style.display = 'none';
    
    // Reset subtotal section
    document.getElementById('subtotal-value').textContent = formatEffectValue(0);
    document.getElementById('subtotal-direct-effect').textContent = formatEffectValue(0);
    document.getElementById('subtotal-indirect-effect').textContent = formatEffectValue(0);
    document.getElementById('subtotal-effects-detail').style.display = 'none';
    
    // Reset total effect section
    document.getElementById('total-effect').textContent = formatEffectValue(0);
    document.getElementById('total-direct-effect').textContent = formatEffectValue(0);
    document.getElementById('total-indirect-effect').textContent = formatEffectValue(0);
    document.getElementById('total-effects-detail').style.display = 'none';
    
    // Clear effect vectors
    window.subtotalDirectEffectVector = null;
    window.subtotalIndirectEffectVector = null;
    window.subtotalTotalEffectVector = null;
    window.totalDirectEffectVector = null;
    window.totalIndirectEffectVector = null;
    window.totalTotalEffectVector = null;
    window.globalDirectEffectVector = null;
    window.globalIndirectEffectVector = null;
    window.globalTotalEffectVector = null;
    
    // Clear receipt items
    const receiptItemsDiv = document.getElementById('receipt-items');
    if (receiptItemsDiv) {
        receiptItemsDiv.innerHTML = '';
    }
    
    // Hide the toggle icon when clearing
    const toggleIcon = document.getElementById('global-toggle-icon');
    if (toggleIcon) {
        toggleIcon.style.display = 'none';
        toggleIcon.textContent = '►';
    }
    
    window.restOfWorldEffect = 0;
    selectCountryReceiptPrompt(window.selectedISOs);
    resetMapColors();
}

// Function to calculate effects for Rest of World countries
async function calculateRestOfWorldEffects(tariffValue) {
    // Even if tariff is zero, we'll run the normal calculation flow
    // The calculations will produce zero effects for zero tariffs automatically

    try {
        // Load MDS helper functions if not already loaded
        if (!window.MdsHelperFunctions) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'code/components/tariffModals/productList/MDS_helper_functions.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
        
        // Get all available country ISO codes using EXACTLY the same method as globalTariff.js
        let allISOs = [];
        try {
            // Use the country_continent data which is the same source as in globalTariff.js
            const response = await fetch(DataPaths.meta.country_continent);
            if (response.ok) {
                const continentData = await response.json();
                
                // Extract ISO codes from continents data
                Object.keys(continentData).forEach(continent => {
                    continentData[continent].forEach(country => {
                        const isoCode = Array.isArray(country.ISO_A3) ? country.ISO_A3[0] : country.ISO_A3;
                        if (isoCode && !allISOs.includes(isoCode) && isoCode !== 'WLD' && isoCode !== 'WRLD') {
                            allISOs.push(isoCode);
                        }
                    });
                });
                
                // Log detailed country information
            } else {
                console.error('Failed to load country data for Rest of World calculation');
                throw new Error('Could not load country data');
            }
        } catch (error) {
            console.error('Error loading country ISO list for Rest of World:', error);
            throw error; // Don't continue if we can't get the proper country list
        }
        
        
        // Store the original countries from TariffCalculations
        if (window.TariffCalculations) {
            const results = window.TariffCalculations.getMostRecentResults();
            if (results && results.length > 0) {
                // We only want the countries that are not from previous Rest of World calculations
                // Filter out any countries that were added during a previous Rest of World calculation
                const originalCountries = results.filter(result => {
                    // Check if this was from a direct country selection (not a Rest of World calculation)
                    // We're looking for countries that were explicitly added by the user
                    const isOriginalCountry = !result.isRestOfWorld; // If this flag exists and is true, it's a RoW country
                    return isOriginalCountry;
                });
                
                const isoList = originalCountries.map(result => result.isoCode);
                
                // Use the original countries only
                if (isoList.length > 0) {
                    selectedISOs = isoList;
                }
            }
        }
        
        // Filter out countries that are already in the receipt
        const restOfWorldISOs = allISOs.filter(iso => !selectedISOs.includes(iso));
        
        // Log the Rest of World countries
        
        // If there are no Rest of World countries left, display a message and exit
        if (restOfWorldISOs.length === 0) {
            document.getElementById('global-row-value').textContent = formatEffectValue(0);
            document.getElementById('global-direct-effect').textContent = formatEffectValue(0);
            document.getElementById('global-indirect-effect').textContent = formatEffectValue(0);
            window.restOfWorldEffect = 0;
            updateTotalEffect();
            updateMapColors();
            return;
        }
        
        
        // First, make sure we have all country names mapped from continent data if needed
        try {
            // Ensure isoToCountryName is initialized
            window.isoToCountryName = window.isoToCountryName || {};
            
            // Check if we need to populate the mapping (if it's empty or has very few entries)
            const currentMappingSize = Object.keys(window.isoToCountryName).length;
            
            // If the mapping seems incomplete, fetch country names from country_continent data
            if (currentMappingSize < 100) { // Most datasets have >200 countries
                const response = await fetch(DataPaths.meta.country_continent);
                const continentsData = await response.json();
                
                // Populate country names from continents data
                for (const continent in continentsData) {
                    for (const country of continentsData[continent]) {
                        const isoCode = Array.isArray(country.ISO_A3) ? country.ISO_A3[0] : country.ISO_A3;
                        const countryName = Array.isArray(country.country) ? country.country[0] : country.country;
                        if (isoCode && countryName) {
                            // Store in global mapping for use in receipt
                            isoToCountryName[isoCode] = countryName;
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error loading country names:", error);
        }
        
        // Create a tariff vector for the specified tariff value
        // This will be a 21-element vector with the same tariff for all sections
        const tariffVector = {};
        
        // Load tariff propagator if not already loaded
        if (!window.tariffPropagator) {
            // Need to load the tariff propagator and section mapping
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'code/components/tariffModals/productList/tariffs/simpleTariffPropagation.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            
            // Wait for it to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Get the section to HS4 mapping from the tariff propagator
        const sectionToHs4Mapping = window.tariffPropagator ? window.tariffPropagator.sectionToHs4Mapping : {};
        
        // Create a vector with the tariff value for all 21 sections (1-indexed)
        for (let i = 1; i <= 21; i++) {
            tariffVector[i] = tariffValue;
        }
        
        // Process multiple countries in parallel for performance
        const results = [];
        const batchSize = 10; // Process countries in batches to avoid overwhelming the browser
        
        // Process the rest of world countries in batches
        for (let i = 0; i < restOfWorldISOs.length; i += batchSize) {
            // Get a batch of rest of world countries - these should all be countries NOT in the receipt
            const batch = restOfWorldISOs.slice(i, i + batchSize);
            
            // Double-check that none of these countries are in the receipt
            const selectedISOsSet = new Set(selectedISOs);
            const filteredBatch = batch.filter(iso => !selectedISOsSet.has(iso));
            
            // Log any discrepancies
            if (filteredBatch.length !== batch.length) {
                console.warn(`Filtered out ${batch.length - filteredBatch.length} countries that were already in the receipt`);
            }
            
            // Skip this batch if it's empty after filtering
            if (filteredBatch.length === 0) {
                continue;
            }
            
            // Process the tariff data for this batch using the filtered batch
            try {
                // Using MdsHelperFunctions to process the tariffs with import weighting
                const tariffData = await window.MdsHelperFunctions.processMultiCountryTariffs(tariffVector, filteredBatch);
                
                // Create a completely separate instance of the calculations 
                // to avoid any interference with the main receipt
                
                // Make a deep copy of the selectedISOs before we do anything
                const originalSelectedISOs = [...window.selectedISOs];
                
                // Create a completely separate TariffCalculations call
                // This is for Rest of World only - we don't render these in the receipt
                const restOfWorldTariffData = await window.MdsHelperFunctions.processMultiCountryTariffs(
                    tariffVector, 
                    batch
                );
                
                // We need to run this through TariffCalculations, but it must NOT affect the receipt
                if (window.TariffCalculations) {
                    // Store local reference to the current user selection of countries
                    // These should NOT be changed by our Rest of World calculation
                    const savedScenarioResults = [...window.TariffCalculations.getScenarioResults()];
                    
                    // Create a temporary function for processing without triggering the event
                    const processTariffDataSilently = async (data) => {
                        // Override dispatch temporarily
                        const originalDispatch = document.dispatchEvent;
                        document.dispatchEvent = (event) => {
                            if (event.type === 'calculationComplete') return true;
                            return originalDispatch.call(document, event);
                        };
                        
                        try {
                            // Clear any existing results to avoid mixing
                            //window.TariffCalculations.clearScenarioResults();
                            
                            // Process the data
                            await window.TariffCalculations.processTariffData(restOfWorldTariffData);
                            
                            // Get the results but ONLY for the rest of world countries
                            const allResults = window.TariffCalculations.getMostRecentResults();
                            
                            // Filter to include ONLY the countries that are in our filtered batch
                            const restResults = allResults.filter(result => 
                                filteredBatch.includes(result.isoCode)
                            );
                            
                            // Log what we're adding to ensure we're getting the right countries
                            
                            // Mark each result as a Rest of World calculation so we can filter it out next time
                            restResults.forEach(result => {
                                result.isRestOfWorld = true; // Add this flag to identify Rest of World countries
                            });
                            
                            // Add to our local results array
                            results.push(...restResults);
                        } finally {
                            // Restore the original dispatch function
                            document.dispatchEvent = originalDispatch;
                            
                            // Clear any state we might have created
                            //window.TariffCalculations.clearScenarioResults();
                            
                            // Restore the original scenarioResults
                            savedScenarioResults.forEach(result => {
                                window.TariffCalculations.getScenarioResults().push(result);
                            });
                            
                            // Double-check the selectedISOs is restored
                            //window.selectedISOs = originalSelectedISOs;
                        }
                    };
                    
                    // Run our silent processor
                    await processTariffDataSilently(restOfWorldTariffData);
                }
            } catch (error) {
                console.error(`Error processing batch ${i}-${i+batchSize}:`, error);
            }
        }
        
        // Calculate total direct effect
        let totalDirectEffect = 0;
        let totalIndirectEffect = 0;
        
        // Sum up the effects from all countries
        results.forEach(result => {
            totalDirectEffect += result.directSum || 0;
            totalIndirectEffect += result.indirectSum || 0;
        });
        
        // Initialize effect vectors
        let globalDirectEffectVector = null;
        let globalIndirectEffectVector = null;
        let globalTotalEffectVector = null;
        
        // Combine effect vectors from all countries
        results.forEach(result => {
            if (result.directEffectVector) {
                if (!globalDirectEffectVector) {
                    globalDirectEffectVector = [...result.directEffectVector];
                } else {
                    result.directEffectVector.forEach((value, i) => {
                        globalDirectEffectVector[i] = (globalDirectEffectVector[i] || 0) + value;
                    });
                }
            }
            
            if (result.indirectEffectVector) {
                if (!globalIndirectEffectVector) {
                    globalIndirectEffectVector = [...result.indirectEffectVector];
                } else {
                    result.indirectEffectVector.forEach((value, i) => {
                        globalIndirectEffectVector[i] = (globalIndirectEffectVector[i] || 0) + value;
                    });
                }
            }
            
            if (result.totalEffectVector) {
                if (!globalTotalEffectVector) {
                    globalTotalEffectVector = [...result.totalEffectVector];
                } else {
                    result.totalEffectVector.forEach((value, i) => {
                        globalTotalEffectVector[i] = (globalTotalEffectVector[i] || 0) + value;
                    });
                }
            }
        });
        
        // Store the results globally
        window.globalDirectEffectVector = globalDirectEffectVector;
        window.globalIndirectEffectVector = globalIndirectEffectVector;
        window.globalTotalEffectVector = globalTotalEffectVector;
        window.restOfWorldEffect = totalDirectEffect + totalIndirectEffect;
        window.restOfWorldDetailedEffects = results.reduce((obj, result) => {
            obj[result.isoCode] = result;
            return obj;
        }, {});
        
        // Before updating UI, ensure we have country names for all countries
        // Add a log to help debug where mappings might be missing
        let missingMappings = [];
        for (const iso of restOfWorldISOs) {
            if (!isoToCountryName[iso]) {
                missingMappings.push(iso);
            }
        }
        
        if (missingMappings.length > 0) {
            console.warn(`Missing country name mappings for ${missingMappings.length} ISO codes:`, missingMappings);
            
            // Try to populate any missing mappings from country data
            for (const iso of missingMappings) {
                if (window.countryDataModule && window.countryDataModule.getCountryData) {
                    try {
                        const countryData = await countryDataModule.getCountryData(iso);
                        if (countryData && countryData.name) {
                            isoToCountryName[iso] = countryData.name;
                        }
                    } catch (e) {
                        console.error(`Failed to get data for ${iso}:`, e);
                    }
                }
            }
        } else {
        }
        
        // Store effect vectors for Rest of World
        if (results && results.length > 0) {
            // Get a sample result to access the effect vectors
            const sampleResult = results[0];
            
            // Initialize effect vectors if needed
            window.globalDirectEffectVector = new Array(sampleResult.directEffectVector ? sampleResult.directEffectVector.length : 0).fill(0);
            window.globalIndirectEffectVector = new Array(sampleResult.indirectEffectVector ? sampleResult.indirectEffectVector.length : 0).fill(0);
            window.globalTotalEffectVector = new Array(sampleResult.totalEffectVector ? sampleResult.totalEffectVector.length : 0).fill(0);
            
            // Sum up effect vectors from all Rest of World countries
            results.forEach(result => {
                if (result.directEffectVector) {
                    result.directEffectVector.forEach((value, i) => {
                        window.globalDirectEffectVector[i] = (window.globalDirectEffectVector[i] || 0) + value;
                    });
                }
                
                if (result.indirectEffectVector) {
                    result.indirectEffectVector.forEach((value, i) => {
                        window.globalIndirectEffectVector[i] = (window.globalIndirectEffectVector[i] || 0) + value;
                    });
                }
                
                if (result.totalEffectVector) {
                    result.totalEffectVector.forEach((value, i) => {
                        window.globalTotalEffectVector[i] = (window.globalTotalEffectVector[i] || 0) + value;
                    });
                }
            });
        }
        
        // Log the calculated Rest of World effects before updating UI
        /*
        console.log("Rest of World effects calculated:", {
            directEffect: totalDirectEffect,
            indirectEffect: totalIndirectEffect,
            totalEffect: totalDirectEffect + totalIndirectEffect
        });
        */
        // Update the UI with the results (already in decimal form, so no need to divide by 100)
        document.getElementById('global-row-value').textContent = formatEffectValue(totalDirectEffect + totalIndirectEffect);
        document.getElementById('global-direct-effect').textContent = formatEffectValue(totalDirectEffect);
        document.getElementById('global-indirect-effect').textContent = formatEffectValue(totalIndirectEffect);
        
        // Update the total effect and map colors
        updateTotalEffect();
        updateMapColors();
        
        // Make sure toggle functionality is set up
        setupCountryToggles();
        
    } catch (error) {
        console.error("Error calculating Rest of World effects:", error);
        document.getElementById('global-row-value').textContent = "Error";
    }
}

// Use the global resetMapColors function from map.js
function resetMapColors() {
    
    // Call the global implementation if available
    if (window.resetMapColors) {
        window.resetMapColors();
    } else {
        console.error("Global resetMapColors function not found. Map colors may not be reset correctly.");
    }
}



// Function to update the receipt date with the current date
// These functions are no longer needed

// Function to set up toggle icons for country effect details
function setupCountryToggles() {
    // Remove existing listeners first by cloning and replacing nodes
    // This prevents duplicate event listeners if the receipt is updated multiple times
    const toggleIcons = document.querySelectorAll('.toggle-icon');
    toggleIcons.forEach(icon => {
        // Clone the node to remove all event listeners
        const newIcon = icon.cloneNode(true);
        icon.parentNode.replaceChild(newIcon, icon);
    });
    
    // Get toggle enabled state from global setting
    const toggleEnabled = window.effectDetailsToggleEnabled !== undefined ? 
                        window.effectDetailsToggleEnabled : true;
    
    // Apply initial state based on toggle setting
    document.querySelectorAll('.toggle-icon').forEach(icon => {
        // Set visibility of toggle icons
        icon.style.display = toggleEnabled ? '' : 'none';
        
        // Set visibility of the details section
        const targetId = icon.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.style.display = toggleEnabled ? 'none' : 'block';
        }
        
        // Add click event listeners if toggle is enabled
        if (toggleEnabled) {
            icon.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const isHidden = targetElement.style.display === 'none';
                    targetElement.style.display = isHidden ? 'block' : 'none';
                    
                    // Toggle between plus and minus icons
                    const plusIcon = this.querySelector('.toggle-plus');
                    const minusIcon = this.querySelector('.toggle-minus');
                    
                    if (plusIcon && minusIcon) {
                        plusIcon.style.display = isHidden ? 'none' : 'inline';
                        minusIcon.style.display = isHidden ? 'inline' : 'none';
                    }
                }
            });
        }
    });
}

// Function to update effect details display based on toggle setting
// This is called when the toggle setting changes in devTools
window.updateEffectDetailsDisplay = function() {
    const toggleEnabled = window.effectDetailsToggleEnabled !== undefined ? 
                        window.effectDetailsToggleEnabled : true;
    
    // Update global toggle icon
    const globalToggleIcon = document.getElementById('global-toggle-icon');
    if (globalToggleIcon) {
        // Only show if toggle is enabled AND there's a tariff value
        const tariffValue = parseFloat(document.getElementById('global-row-input').value) || 0;
        globalToggleIcon.style.display = toggleEnabled && tariffValue > 0 ? 'inline' : 'none';
        
        // Reset to plus icon when toggle setting changes
        const plusIcon = globalToggleIcon.querySelector('.toggle-plus');
        const minusIcon = globalToggleIcon.querySelector('.toggle-minus');
        if (plusIcon && minusIcon) {
            plusIcon.style.display = 'inline';
            minusIcon.style.display = 'none';
        }
    }
    
    // Update global effects detail
    const globalEffectsDetail = document.getElementById('global-effects-detail');
    if (globalEffectsDetail) {
        // If toggle is disabled, always show details if there's a tariff
        const tariffValue = parseFloat(document.getElementById('global-row-input').value) || 0;
        if (!toggleEnabled && tariffValue > 0) {
            globalEffectsDetail.style.display = 'block';
        }
    }
    
    // Update country toggles (be specific to avoid affecting UI toggles)
    document.querySelectorAll('.country-row-title .toggle-icon').forEach(icon => {
        icon.style.display = toggleEnabled ? '' : 'none';
    });
    
    // Update country effect details
    document.querySelectorAll('.country-effects-detail').forEach(detail => {
        detail.style.display = toggleEnabled ? 'none' : 'block';
    });
    
    // Re-setup country toggles to ensure they have the correct event listeners
    setupCountryToggles();
}

function updateReceiptDate() {
    // Get current date
    const today = new Date();
    
    // Format the date as MM-DD-YYYY
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${month}-${day}-${year}`;
    
    // Find the date element and update it
    const dateElement = document.getElementById('receipt-date');
    if (dateElement) {
        dateElement.textContent = formattedDate;
    }
}
// Function to show summary effects modal for a country
function showSummaryEffects(iso) {    
    // Check if we have the tariffComparisonChart module
    if (typeof window.tariffComparisonChart === 'undefined' || !window.tariffComparisonChart) {
        
        // Create a script element to load the module
        const script = document.createElement('script');
        script.src = 'combined_charts/tariff_comparison_chart.js';
        script.onload = function() {
            // Try again after loading
            setTimeout(() => showSummaryEffects(iso), 100);
        };
        script.onerror = function() {
            console.error('Failed to load tariff comparison chart module');
            alert('Could not load tariff comparison chart. Please try again later.');
        };
        document.head.appendChild(script);
        return;
    }
    
    // Open the tariff comparison modal for this country
    window.tariffComparisonChart.open(iso);
}

// Create a ReceiptModule to expose functions globally
window.ReceiptModule = {
    updateReceiptDisplay: updateReceiptDisplay,
    clearReceipt: window.clearCountries,
    formatEffectValue: formatEffectValue
};