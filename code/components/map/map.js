/*
Description: Here we deal with all the map related listeners and calls to other scripts to process the information.

3-22-2025 
Michael Dwight Sparks
*/

// Function to zoom to a specific country by ISO code
function zoomToCountry(isoCode) {
    if (!window.geojsonLayer) {
        console.error("GeoJSON layer not initialized yet");
        return;
    }
    
    let found = false;
    
    // Find the country layer by ISO code
    window.geojsonLayer.eachLayer(function(layer) {
        if (layer.feature && layer.feature.properties && layer.feature.properties.ISO_A3 === isoCode) {
            // Get the bounds of the country polygon
            const bounds = layer.getBounds();
            
            // Zoom to the country with some padding
            map.fitBounds(bounds, {
                padding: [20, 20],
                maxZoom: 6  // Limit how far we zoom in
            });
            
            found = true;
        }
    });
    
    if (!found) {
        console.warn(`Country with ISO code ${isoCode} not found in the map data`);
    }
}

// Make the function globally available
window.zoomToCountry = zoomToCountry;

// Initialize the leaflet map
const map = L.map("map-section", {
    center: [20, 0], // roughly center on the globe
    maxZoom: 18,
    minZoom: 3,
    zoom : 12, 
    preferCanvas: true,
    noClip: true,
    maxBounds:[
        [-120, -180],
        [120, 180]
    ],
    attributionControl: false,
    maxBoundsViscosity: 0.0,
}).setView([25, 6], 3);

// Initialize GeoJson Map layer
// Store the layer reference for later updates (make it globally accessible)
window.geojsonLayer = null;
const colorSchemes = {
    light: {
        border: '#888888',
        fill: '#eaeaea'
    },
    dark: {
        border: '#888888', // lighter gray for dark mode
        fill: '#444' // or whatever gray you choose
    }
};

// FRBA color palette
const frbaColors = {
    RED: [147, 21, 27],
    BLUE: [0, 76, 127],
    FUCHSIA: [139, 27, 75],
    INDIGO: [74, 62, 142], 
    GREEN: [0, 85, 58],
    EXCELLENCE_ORANGE: [122, 54, 7],
    // Original effect colors
    ORANGE: [202, 89, 12],
    TEAL: [86, 191, 214]
};

// Function to update map colors
function updateMapColors(mode) {
    const colors = colorSchemes[mode];
    
    // Update the geojson layer
    if (window.geojsonLayer) {
        window.geojsonLayer.setStyle({
            color: colors.border,
            fillColor: colors.fill,
            fillOpacity: 1,
            weight: 1
        });
    }
    
    // Update ocean color (assuming you have a way to set map background)
    // This depends on your map setup - might be CSS or map options
}

// Function to get the current mode from dark mode toggle
function getCurrentMode() {
    // Check if body has dark_theme class
    return document.body.classList.contains('dark_theme') ? 'dark' : 'light';
}

// Helper function to convert hex color to RGB array
function hexToRgb(hex) {
    try {
        // Handle null or undefined
        if (!hex) {
            console.error("Invalid hex color: null or undefined");
            return [128, 128, 128]; // Default to mid-gray if color is invalid
        }
        
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Ensure we have a valid hex color
        if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
            console.error("Invalid hex color format:", hex);
            return [128, 128, 128]; // Default to mid-gray if format is invalid
        }
        
        // Parse the hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        return [r, g, b];
    } catch (error) {
        console.error("Error parsing hex color:", error);
        return [128, 128, 128]; // Default to mid-gray in case of any errors
    }
}

// Helper function to blend two colors based on intensity
function blendColors(baseColor, effectColor, intensity) {
    // Determine if we're in dark mode
    const isDarkMode = getCurrentMode() === 'dark';
    
    // For dark mode, we may need to boost intensity for better visibility
    const adjustedIntensity = isDarkMode ? Math.min(1, intensity * 1.5) : intensity;
    
    return [
        Math.round(baseColor[0] * (1 - adjustedIntensity) + effectColor[0] * adjustedIntensity),
        Math.round(baseColor[1] * (1 - adjustedIntensity) + effectColor[1] * adjustedIntensity),
        Math.round(baseColor[2] * (1 - adjustedIntensity) + effectColor[2] * adjustedIntensity)
    ];
}

// Your existing fetch code becomes:
fetch(DataPaths.geography.map)
.then((res) => res.json())
.then((geojsonData) => {
    const currentMode = getCurrentMode(); // Get mode from body class
    const colors = colorSchemes[currentMode];
    
    window.geojsonLayer = L.geoJSON(geojsonData, {
        noClip: true,
        style: function(feature) {
            return {
                color: colors.border,
                fillColor: colors.fill,
                fillOpacity: 1,
                weight: 1
            };
        },
        onEachFeature: function(feature, layer){
            layer.on("click", (e) => handleCountryClick(feature, e));
        }
    }).addTo(map);
});


// Handle country click event
async function handleCountryClick(feature, e) {
    if (!feature || !feature.properties || !feature.properties.ISO_A3) {
        console.error("No country data found.");
        alert("Error: Missing country ISO_A3 code.");
        return;
    }
    
    const isoCode = feature.properties.ISO_A3;
    const countryName = feature.properties.ADMIN;
    
    // Store country name for later use
    if (!window.isoToCountryName) {
        window.isoToCountryName = {};
    }
    window.isoToCountryName[isoCode] = countryName;
    
    console.log(`Country clicked: ${countryName} (${isoCode})`);
    
    try {
        // Get current tariff data for this country
        let currentTariff = 0;
        let defaultPassThrough = 100;
        
        // Try to load current tariff from base_tariff.json
        try {
            const tariffResponse = await fetch(DataPaths.bilateral_tariffs.basic_tariffs);
            const baseTariffs = await tariffResponse.json();
            const countryTariffs = baseTariffs[isoCode] || null;
            // Construct correct falsy-ness tester before setting tariffs. 
            const hasW = countryTariffs[0] != null && countryTariffs[1] != null;
            const statutory_weighted = hasW
                ? Math.min(countryTariffs[0], countryTariffs[1])
                : undefined;

            const hasU = countryTariffs[2] != null && countryTariffs[3] != null;
            const statutory_unweighted = hasU
                ? Math.min(countryTariffs[2], countryTariffs[3])
                : undefined;

            if (baseTariffs && baseTariffs[isoCode]) {
                currentTariff = statutory_weighted 
                                ?? statutory_unweighted 
                                ?? 0.0;
                //console.log(countryTariffs, statutory_weighted, statutory_unweighted);
            }
        } catch (tariffError) {
            console.warn('Error loading base tariff data:', tariffError);
        }
        
        // Load the popup template
        const popupResponse = await fetch(DataPaths.components.map.tariffPopup);
        if (!popupResponse.ok) {
            throw new Error("Failed to load popup template");
        }
        
        let popupTemplate = await popupResponse.text();
        
        // Replace template variables
        popupTemplate = popupTemplate
            .replace(/{{countryName}}/g, countryName)
            .replace(/{{countryIso}}/g, isoCode)
            .replace(/{{currentTariffPercent}}/g, currentTariff.toFixed(2))
            .replace(/{{defaultPassThrough}}/g, defaultPassThrough.toFixed(2))
            .replace(/{{chartLineIcon}}/g, DataPaths.assets.fontawesome.chartLineSolid);
        
        // Remove any existing popups and tooltips
        map.closePopup();
        // Remove any tooltips that might be open
        removeAllTooltips();
        // Default offdset: [0, -7]
        // Uposide down offset: [0, 390]
        // Create and show the popup
        const popup = L.popup({offset:[0,0]})
            .setLatLng(e.latlng)
            .setContent(popupTemplate)
            .openOn(map);
        
        // Set up event handlers after popup is created
        setTimeout(() => {
            // Add help tooltip functionality
            attachTooltip();
            
            // Add button event handlers
            attachPopupHandlers(isoCode, countryName, currentTariff);
            
            // Add click handler for country name
            const countryNameElement = document.querySelector('.country-name-clickable');
            if (countryNameElement) {
                countryNameElement.addEventListener('click', function() {
                    // Close the popup
                    map.closePopup();
                    
                    // Open the multi-chart panel for this country
                    if (window.multiChartPanel) {
                        window.multiChartPanel.updateCountry(isoCode, countryName);
                        window.multiChartPanel.showPanel();
                    } else {
                        console.error('multiChartPanel not available');
                    }
                });
            }
        }, 0);
    } catch (err) {
        console.error("Error handling country click:", err);
        alert("Error: Could not load country data. Please try again.");
    }
}

// Attach help tooltip to the popup
function attachTooltip() {
    const helpIcon = document.getElementById("help-icon-container");
    if (!helpIcon) return;
    
    // Remove any existing event listeners to prevent duplicates
    const oldHelpIcon = helpIcon.cloneNode(true);
    helpIcon.parentNode.replaceChild(oldHelpIcon, helpIcon);
    
    // Get the new reference
    const newHelpIcon = document.getElementById("help-icon-container");
    
    // Track if tooltip is already open
    let tooltipActive = false;
    
    newHelpIcon.addEventListener("mouseover", async function(event) {
        // Prevent multiple tooltips
        if (tooltipActive) return;
        
        try {
            // First remove any existing tooltips
            removeAllTooltips();
            
            // Flag that tooltip is active
            tooltipActive = true;
            
            // Load the tooltip template
            const response = await fetch(DataPaths.components.map.tariffTooltip);
            if (!response.ok) {
                throw new Error("Failed to load tooltip template");
            }
            
            let tooltipHtml = await response.text();
            
            // Create tooltip element
            const tooltip = document.createElement("div");
            tooltip.classList.add("custom-tooltip");
            tooltip.id = "map-help-tooltip"; // Add an ID for easier reference
            tooltip.innerHTML = tooltipHtml;
            document.body.appendChild(tooltip);
            
            // Position the tooltip
            const iconRect = event.target.getBoundingClientRect();
            tooltip.style.left = `${iconRect.right + 5}px`;
            tooltip.style.top = `${iconRect.top}px`;
            
            // Add hover tracking to remove tooltip when not needed
            tooltip.addEventListener("mouseenter", () => {
                tooltip.isHovered = true;
            });
            
            tooltip.addEventListener("mouseleave", () => {
                tooltip.isHovered = false;
                setTimeout(() => {
                    if (!tooltip.isHovered && !newHelpIcon.isHovered) {
                        tooltip.remove();
                        tooltipActive = false;
                    }
                }, 300);
            });
            
            newHelpIcon.isHovered = true;
            newHelpIcon.addEventListener("mouseleave", () => {
                newHelpIcon.isHovered = false;
                setTimeout(() => {
                    if (!tooltip.isHovered && !newHelpIcon.isHovered) {
                        tooltip.remove();
                        tooltipActive = false;
                    }
                }, 300);
            });
            
            // Update tooltip position on mouse move
            event.target.addEventListener("mousemove", (e) => {
                tooltip.style.top = `${e.pageY + 10}px`;
                tooltip.style.left = `${e.pageX + 10}px`;
            });
            
            // Clean up tooltips when the map is clicked
            map.addEventListener('click', function onMapClick() {
                removeAllTooltips();
                tooltipActive = false;
                map.removeEventListener('click', onMapClick);
            });
            
            // Clean up tooltips when popup is closed
            map.on('popupclose', function() {
                removeAllTooltips();
                tooltipActive = false;
            });
        } catch (error) {
            console.error("Error loading tooltip:", error);
            tooltipActive = false;
        }
    });
}

// Attach event handlers to popup buttons
function attachPopupHandlers(isoCode, countryName, currentTariff) {
    // Handle the Apply Tariff button
    const submitBtn = document.getElementById("tariffSubmit");
    if (submitBtn) {
        // Add Enter key functionality to popup inputs
        const popupInputs = document.querySelectorAll('.popup-input');
        popupInputs.forEach(input => {
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    console.log('Enter key pressed in map popup input, clicking submit button');
                    submitBtn.click();
                }
            });
        });
        
        // Add click handler
        submitBtn.addEventListener("click", function() {
            // Get input values
            const currentTariffValue = parseFloat(document.getElementById("currentTariffInput").value || 0);
            const newTariffValue = parseFloat(document.getElementById("newTariffInput").value || 0);
            const passThroughValue = parseFloat(document.getElementById("passThroughInput").value || 0);
            
            // Validate inputs
            if (isNaN(newTariffValue) || isNaN(passThroughValue)) {
                alert("Please enter valid numeric values for tariff and pass-through rate.");
                return;
            }
            
            // If no change in tariff, just close the popup
            if (currentTariffValue === newTariffValue) {
                map.closePopup();
                return;
            }
            
            // Close the popup
            map.closePopup();
            
            // Add country to selected countries if not already there
            if (!window.selectedISOs) {
                window.selectedISOs = [];
            }
            
            if (!window.selectedISOs.includes(isoCode)) {
                if (typeof window.addISO === 'function') {
                    window.addISO(isoCode);
                } else {
                    window.selectedISOs.push(isoCode);
                }
            }
            
            // Normalize by the trade share... 


            // Create tariff data object for calculations
            const tariffData = {
                iso_list: [isoCode],
                bea_codes: window.TariffCalculations ? window.TariffCalculations.customBEAOrder : [],
                tau_c: [],
                tauCForCalculations: {},
                importWeighted: true, // Using import weighting
                countryNames: { [isoCode]: countryName },
                sectionTariffs: {}, // Add section tariffs
                tariffSource: 'uniformPopup', // Flag indicating tariffs were applied uniformly via popup
                tariffMetadata: { // Additional metadata about this tariff change
                    originalValue: currentTariffValue,
                    newValue: newTariffValue,
                    passThroughRate: passThroughValue,
                    applyMethod: 'uniform'
                }
            };
            
            // Create section tariffs object for the country
            tariffData.sectionTariffs[isoCode] = {
                original: {},
                current: {}
            };
            
            // Try to get all section IDs from tariffPropagator if available
            const sectionIds = window.tariffPropagator && window.tariffPropagator.sectionToHs4Mapping 
                ? Object.keys(window.tariffPropagator.sectionToHs4Mapping)
                : Array.from({length: 21}, (_, i) => String(i + 1)); // Fallback to sections 1-21
            
            // Populate section tariffs with the current values
            sectionIds.forEach(sectionId => {
                // Original tariff value
                tariffData.sectionTariffs[isoCode].original[sectionId] = currentTariffValue;
                
                // Current (new) tariff value
                tariffData.sectionTariffs[isoCode].current[sectionId] = newTariffValue;
            });
            
            // Create a vector with tariff changes
            const tariffChangeVector = [];
            const customBEAOrder = window.TariffCalculations ? window.TariffCalculations.customBEAOrder : [];
            
            // Convert percentages to decimal and calculate change with formula: (Current - Original) / (100 + Original)
            const originalDecimal = currentTariffValue / 100;
            const currentDecimal = newTariffValue / 100;
            const passThrough = passThroughValue / 100;
            
            // Apply the formula with pass-through rate
            const effectiveChange = ((currentDecimal - originalDecimal) / (1 + originalDecimal)) * passThrough;
            
            // Fill the vector with the same value for all codes
            if (customBEAOrder && customBEAOrder.length > 0) {
                for (let i = 0; i < customBEAOrder.length; i++) {
                    tariffChangeVector.push(effectiveChange);
                }
                
                // Use an async IIFE to allow await syntax
                (async () => {
                    try {
                        // Check if TariffPreCalculations is available
                        if (!window.TariffPreCalculations || typeof window.TariffPreCalculations.tradeWeightTariffVector !== 'function') {
                            throw new Error('TariffPreCalculations module not available');
                        }
                        
                        console.log('Applying import weighting to tariff vector');
                        
                        // Get trade-weighted tariff vector
                        const weightedVector = await window.TariffPreCalculations.tradeWeightTariffVector(
                            isoCode,
                            tariffChangeVector,
                            customBEAOrder
                        );
                        
                        console.log('Tariff vector successfully weighted by imports');
                        
                        // Add to tariff data
                        tariffData.tau_c = [weightedVector];
                        tariffData.tauCForCalculations[isoCode] = weightedVector;
                        
                        // Check if TariffCalculations is available
                        if (!window.TariffCalculations || typeof window.TariffCalculations.processTariffData !== 'function') {
                            throw new Error('TariffCalculations module not available');
                        }
                        
                        // Process the tariff data
                        const success = await window.TariffCalculations.processTariffData(tariffData);
                        
                        if (success) {
                            //console.log('Map tariff applied successfully with import weighting');
                            
                            // Update receipt display
                            if (window.ReceiptModule && typeof window.ReceiptModule.updateReceiptDisplay === 'function') {
                                window.ReceiptModule.updateReceiptDisplay();
                            }
                            
                            // Update map colors
                            if (typeof updateMapColors === 'function') {
                                updateMapColors();
                            }
                        } else {
                            throw new Error('Failed to process tariff data');
                        }
                    } catch (error) {
                        console.error('Error:', error.message);
                        alert(`Error: ${error.message}. Please try again.`);
                    }
                })();
            } else {
                console.error('No BEA codes available for tariff vector');
                alert('Error: Could not create tariff vector. Please try again.');
            }
        });
    }
    
    // Handle the Product-Specific Tariff button
    const productTariffBtn = document.getElementById("productTariffBtn");
    if (productTariffBtn) {
        productTariffBtn.addEventListener("click", function() {
            // Add country to selected countries if not already there
            if (!window.selectedISOs) {
                window.selectedISOs = [];
            }
            
            if (!window.selectedISOs.includes(isoCode)) {
                if (typeof window.addISO === 'function') {
                    window.addISO(isoCode);
                } else {
                    window.selectedISOs.push(isoCode);
                }
                
                // Store country name
                if (!window.isoToCountryName) {
                    window.isoToCountryName = {};
                }
                window.isoToCountryName[isoCode] = countryName;
            }
            
            // Close the popup
            map.closePopup();
            
            // Initialize ProductTariffModal if needed
            if (window.initializeProductTariffModal && typeof window.initializeProductTariffModal === 'function') {
                window.initializeProductTariffModal();
            }
            
            // Open the product tariff modal for this country
            if (window.ProductTariffModal && typeof window.ProductTariffModal.openModal === 'function') {
                // Pass true to use original/current mode (showing original tariffs)
                window.ProductTariffModal.openModal(isoCode, { useOriginalCurrentMode: true });
            } else {
                console.error("ProductTariffModal not available");
                
                // Fall back to old tariff modals if available
                if (window.tariffModals && typeof window.tariffModals.goToNextStep === 'function') {
                    // Use false to indicate we're not coming from country search
                    window.tariffModals.goToNextStep(false);
                    
                    // Update modal title after a short delay
                    setTimeout(() => {
                        const modalTitle = document.querySelector("#modal-product-list .modal-header h2");
                        if (modalTitle) {
                            modalTitle.textContent = `Product Tariffs for ${countryName}`;
                        }
                    }, 100);
                }
            }
        });
    }
}

// Function to update map colors based on calculation results
function updateMapColors() {
    //console.log("Updating map colors based on calculation results");
    
    // Check if geojsonLayer exists
    if (!window.geojsonLayer) {
        console.warn("No geojsonLayer found for color updates");
        return;
    }
    
    // Get calculation results
    const results = window.TariffCalculations ? window.TariffCalculations.getMostRecentResults() : [];
    if (!results || results.length === 0) {
        //console.log("No calculation results to show on map");
        resetMapColors();
        return;
    }
    
    // Calculate total effect for normalization
    let totalEffect = 0;
    results.forEach(result => {
        totalEffect += result.totalSum || 0;
    });
    
    //console.log(`Total effect for map coloring: ${totalEffect}`);
    
    // Update colors for countries with results
    geojsonLayer.eachLayer(function(layer) {
        if (!layer.feature || !layer.feature.properties || !layer.feature.properties.ISO_A3) return;
        
        const isoCode = layer.feature.properties.ISO_A3;
        
        // Find result for this country
        const countryResult = results.find(r => r.isoCode === isoCode);
        
        if (countryResult) {
            // Get country's effect
            const effect = countryResult.totalSum || 0;
            
            // Determine color based on effect
            const currentMode = getCurrentMode();
            const colors = colorSchemes[currentMode];
            
            // Debug log for dark mode
            if (currentMode === 'dark') {
                console.log('Dark mode active, using colors:', colors);
            }
            
            let fillColor = colors.fill; // Default to theme color
            let fillOpacity = 1;
            
            if (effect > 0) {
                // Use a simple power scale with exponent 0.3 (cube root is 0.33)
                // This enhances small values more than square root (0.5)
                const ratio = effect / (totalEffect || 0.000001);
                const intensity = Math.min(1, Math.pow(ratio, 0.3));
                
                // RGB values for effect color and base color
                const effectRGB = frbaColors.BLUE; // Use Blue for all effects
                const baseRGB = hexToRgb(colors.fill);
                
                // Always blend colors, with stronger effects getting more of the effect color
                const blendedColor = blendColors(baseRGB, effectRGB, intensity);
                fillColor = `rgb(${blendedColor[0]}, ${blendedColor[1]}, ${blendedColor[2]})`;
            } else if (effect < 0) {
                // Use a simple power scale with exponent 0.3 (cube root is 0.33)
                const ratio = Math.abs(effect) / (Math.abs(totalEffect) || 0.000001);
                const intensity = Math.min(1, Math.pow(ratio, 0.3));
                
                // RGB values for effect color and base color
                const effectRGB = frbaColors.FUCHSIA; // Use Blue for negative effects
                const baseRGB = hexToRgb(colors.fill);
                
                // Always blend colors, with stronger effects getting more of the effect color
                const blendedColor = blendColors(baseRGB, effectRGB, intensity);
                fillColor = `rgb(${blendedColor[0]}, ${blendedColor[1]}, ${blendedColor[2]})`;
            }
            
            // Apply styling
            layer.setStyle({
                fillColor: fillColor,
                fillOpacity: fillOpacity,
                weight: 1,
                color: "#6F6F6F"
            });
            
            //console.log(`Colored ${isoCode} with ${fillColor} (effect: ${effect})`);
        } else {
            // Reset countries without results
            resetCountryColor(layer);
        }
    });
}

// Reset a single country's color to default
function resetCountryColor(layer) {
    const currentMode = getCurrentMode();
    const colors = colorSchemes[currentMode];
    
    layer.setStyle({
        fillColor: colors.fill,
        fillOpacity: 1,
        weight: 1,
        color: colors.border
    });
}

// Reset all map colors to default
function resetMapColors() {
    if (!window.geojsonLayer) return;
    
    geojsonLayer.eachLayer(function(layer) {
        resetCountryColor(layer);
    });
}

// Make map functions globally available
window.updateMapColors = updateMapColors;
window.resetMapColors = resetMapColors;

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    //console.log("Map module initialized");
    
    // Remove automatic initialization of ProductTariffModal
    // We'll initialize it only when needed
    
    // Listen for dark mode changes
    document.addEventListener('DOMClassChange', function(e) {
        if (e.detail && e.detail.className === 'dark_theme') {
            const currentMode = getCurrentMode();
            const colors = colorSchemes[currentMode];
            
            // Update the map colors if the geojsonLayer exists
            if (window.geojsonLayer) {
                window.geojsonLayer.setStyle({
                    color: colors.border,
                    fillColor: colors.fill,
                    fillOpacity: 1,
                    weight: 1
                });
                
                // Also re-apply any calculation-based coloring
                if (window.TariffCalculations && 
                    window.TariffCalculations.getMostRecentResults && 
                    window.TariffCalculations.getMostRecentResults().length > 0) {
                    updateMapColors();
                }
            }
        }
    });
    
    // Create a MutationObserver to watch for dark mode class changes
    const bodyObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                // Dispatch custom event when body class changes
                const event = new CustomEvent('DOMClassChange', {
                    detail: { 
                        className: 'dark_theme',
                        added: document.body.classList.contains('dark_theme')
                    }
                });
                document.dispatchEvent(event);
            }
        });
    });
    
    // Start observing the body element for class changes
    bodyObserver.observe(document.body, { attributes: true });
});

// Function to remove all tooltips from the document
function removeAllTooltips() {
    const tooltips = document.querySelectorAll('.custom-tooltip');
    tooltips.forEach(tooltip => {
        tooltip.remove();
    });
}

// Make the function globally available
window.removeAllTooltips = removeAllTooltips;