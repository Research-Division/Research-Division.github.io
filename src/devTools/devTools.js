/*
Description: IIFE encapsulated code for the devTools Modal.
*/

// Handles all the events for the devTools Modal.
var devTools = (function(){
    // Private variables
    let effectDetailsToggleEnabled = true; // Default to enabled
    let darkModeEnabled = false; // Default to light mode
    
    // Initialize toggle icon style
    window._toggleIconStyle = 'chevron'; // Default to chevron icons
    
    // Animation duration for charts (in seconds)
    window._chartAnimationDuration = 0.8; // Default animation duration
    

    // Private functions
    function openDevToolsModal(){
        fetch(DataPaths.devTools.main)
        .then(response => response.text())
        .then(html=> {
            document.getElementById('modal-container').innerHTML = html;
            
            // Set initial checkbox states based on current settings
            setTimeout(() => {
                // Set effect details toggle state
                const effectsToggle = document.getElementById('effects-toggle');
                if (effectsToggle) {
                    effectsToggle.checked = effectDetailsToggleEnabled;
                }
                
                // Set dark mode toggle state
                const darkModeToggle = document.getElementById('dark-mode-toggle');
                if (darkModeToggle) {
                    darkModeToggle.checked = darkModeEnabled;
                }
                
                // Set receipt toggle state
                const receiptToggle = document.getElementById('receipt-toggle');
                if (receiptToggle) {
                    receiptToggle.checked = receiptToggleEnabled;
                }
                
                // Set toggle icon style state
                const chevronToggle = document.getElementById('chevron-toggle');
                const plusToggle = document.getElementById('plus-toggle');
                
                if (chevronToggle && plusToggle) {
                    if (window._toggleIconStyle === 'chevron') {
                        chevronToggle.classList.add('active');
                        plusToggle.classList.remove('active');
                    } else {
                        chevronToggle.classList.remove('active');
                        plusToggle.classList.add('active');
                    }
                }
                
                // Set animation duration slider value
                const animationDurationSlider = document.getElementById('chart-animation-duration');
                const animationDurationDisplay = document.getElementById('animation-duration-display');
                if (animationDurationSlider && animationDurationDisplay) {
                    // Set the value and text display
                    animationDurationSlider.value = window._chartAnimationDuration;
                    animationDurationDisplay.textContent = window._chartAnimationDuration + 's';
                    
                    // Also update the slider's gradient to match the current value
                    const min = parseFloat(animationDurationSlider.min) || 0.2;
                    const max = parseFloat(animationDurationSlider.max) || 3.0;
                    const currentValue = parseFloat(window._chartAnimationDuration);
                    const valuePercent = ((currentValue - min) / (max - min)) * 100;
                    
                    const isDarkMode = document.body.classList.contains('dark_theme');
                    const borderColor = isDarkMode ? '#444' : '#a0a0a0';
                    animationDurationSlider.style.background = `linear-gradient(to right, #009EC1 0%, #009EC1 ${valuePercent}%, ${borderColor} ${valuePercent}%, ${borderColor} 100%)`;
                }
                
                // Set lightning bolt toggle state
                const lightningBoltToggle = document.getElementById('lightning-bolt-toggle');
                if (lightningBoltToggle) {
                    const showLightningBolt = window.showLightningBolt !== undefined ? window.showLightningBolt : true;
                    lightningBoltToggle.checked = showLightningBolt;
                }
                
                // Set bar outline style toggle state
                const barOutlineToggle = document.getElementById('bar-outline-toggle');
                if (barOutlineToggle) {
                    const useBarOutline = window.useBarOutlineStyle !== undefined ? window.useBarOutlineStyle : false;
                    barOutlineToggle.checked = useBarOutline;
                }
                
                // Set Chart Wiz Style toggle state
                const chartWizStyleToggle = document.getElementById('chart-wiz-style-toggle');
                if (chartWizStyleToggle) {
                    const useChartWizStyle = window.useChartWizStyle !== undefined ? window.useChartWizStyle : false;
                    chartWizStyleToggle.checked = useChartWizStyle;
                }
                
                // Set animation style radio buttons based on current settings
                const animationStyleRadios = document.getElementsByName('animation-style');
                if (animationStyleRadios && animationStyleRadios.length > 0) {
                    const currentStyle = window.chartAnimationStyle || 'smooth';
                    animationStyleRadios.forEach(radio => {
                        radio.checked = (radio.value === currentStyle);
                    });
                }
                
                // Set point style radio buttons based on current settings
                const pointStyleRadios = document.getElementsByName('point-style');
                if (pointStyleRadios && pointStyleRadios.length > 0) {
                    const currentPointStyle = window.chartPointStyle || 'circle';
                    pointStyleRadios.forEach(radio => {
                        radio.checked = (radio.value === currentPointStyle);
                    });
                }
            }, 100);
        })
        .catch(error => {
            console.error('Error loading modal:', error);
        });
    }
    
    function closeModal(){
        const modal = document.getElementById('modal');
        if (modal){
            modal.style.display = 'none';
        }
    }


    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modal = document.getElementById('modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });
    
    function toggleDarkMode(isDark){
        // Store the state
        darkModeEnabled = isDark;
        
        // Apply dark mode
        if (isDark){
            document.body.classList.add('dark_theme');
        } else{
            document.body.classList.remove('dark_theme');
        }
    }
    
    // Keep track of receipt toggle state
    let receiptToggleEnabled = false; // Default to disabled
    
    function toggleReceipt(ReceiptTog){
        // Store the state
        receiptToggleEnabled = ReceiptTog;
        
        const placeholder = document.getElementById('placeholder-message');
        const receipt_totals = document.getElementById('receipt_totals');
        
        if (ReceiptTog){
            placeholder.style.display= 'none';
            receipt_totals.style.display = 'block';
            
            // Add example countries to the receipt
            addExampleCountriesToReceipt();
        } else{
            placeholder.style.display= 'block';
            receipt_totals.style.display = 'none';
            
            // Clear any example countries
            clearExampleCountries();
        }
    }
    
    // Function to add example countries to the receipt
    function addExampleCountriesToReceipt() {
        try {
            // Get the receipt items container
            const receiptItems = document.getElementById('receipt-items');
            if (!receiptItems) return;
            
            // Clear existing items
            receiptItems.innerHTML = '';
            
            // Create example countries
            const exampleCountries = [
                { name: 'EXAMPLE 1', effect: 0.015 },
                { name: 'EXAMPLE 2', effect: 0.025 },
                { name: 'EXAMPLE 3', effect: -0.005 }
            ];
            
            // Add each example country to the receipt
            exampleCountries.forEach((country, index) => {
                // Create unique IDs for this example
                const iso = `EX${index + 1}`;
                const effectsDetailId = `effects-detail-${iso}`;
                
                // Calculate direct and indirect effects
                const directEffect = country.effect * 0.7; // 70% of total effect
                const indirectEffect = country.effect * 0.3; // 30% of total effect
                
                // Create the receipt item element
                const lineItemDiv = document.createElement('div');
                lineItemDiv.className = 'receipt-item example-receipt-item';
                lineItemDiv.id = `receipt-item-${iso}`;
                
                // Build the HTML for the item

                lineItemDiv.innerHTML = `
                    <div class="receipt-item-left">
                        <button class="remove-btn" onclick="removeExampleCountry('${iso}')">
                            <img src="assets/fontawesome/trash-solid.svg" alt="Remove" class="trash-icon">
                        </button>
                        <div>
                            <div class="country-row-title">
                                                            <span>${country.name}</span>

                            <span class="clickable effects-summary-btn" data-iso="${iso}" onclick="showSummaryEffects('${iso}')" title="Show effects summary">
                                <img src="assets/fontawesome/chart-line-solid.svg" alt="Effects" class="effects-icon" style="width: 14px; height: 14px; margin-left: 5px; color:var(--text-color);">
                            </span>
                                <span class="toggle-icon country-toggle" data-target="${effectsDetailId}">
                                    <img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-plus">
                                    <img src="assets/fontawesome/chevron-down-solid.svg" alt="Collapse" class="toggle-minus" style="display: none;">
                                </span>
                            </div>
                            <div id="${effectsDetailId}" class="country-effects-detail" style="display: none; margin-top: -14px">
                                <span> <br>
                                    <span class="effect-label">Direct Effect: </span><span class="effect-value">${(directEffect * 100).toFixed(2)}%</span><br>
                                    <span class="effect-label">Indirect Effect: </span><span class="effect-value">${(indirectEffect * 100).toFixed(2)}%</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <span>${(country.effect * 100).toFixed(2)}%</span>
                    </div>
                `;
                
                // Add to the receipt
                receiptItems.appendChild(lineItemDiv);
            });
            
            // Calculate subtotal
            let subtotal = exampleCountries.reduce((sum, country) => sum + country.effect, 0);
            
            // Update subtotal display
            const subtotalValue = document.getElementById('subtotal-value');
            if (subtotalValue) {
                subtotalValue.textContent = `${(subtotal * 100).toFixed(2)}%`;
            }
            
            // Update global row value (rest of world)
            const globalRowValue = document.getElementById('global-row-value');
            if (globalRowValue) {
                const globalEffect = 0.01; // 1% example global effect
                globalRowValue.textContent = `${(globalEffect * 100).toFixed(2)}%`;
                
                // Update global direct and indirect effects
                const globalDirectEffect = document.getElementById('global-direct-effect');
                const globalIndirectEffect = document.getElementById('global-indirect-effect');
                
                if (globalDirectEffect) globalDirectEffect.textContent = `${(globalEffect * 0.8 * 100).toFixed(2)}%`;
                if (globalIndirectEffect) globalIndirectEffect.textContent = `${(globalEffect * 0.2 * 100).toFixed(2)}%`;
                
                // Show the global toggle icon
                const globalToggleIcon = document.getElementById('global-toggle-icon');
                if (globalToggleIcon) {
                    globalToggleIcon.style.display = 'inline';
                }
            }
            
            // Update total effect
            const totalEffect = subtotal + 0.01; // Add global effect
            const totalEffectElement = document.getElementById('total-effect');
            if (totalEffectElement) {
                totalEffectElement.textContent = `${(totalEffect * 100).toFixed(2)}%`;
            }
            
            // Set up the toggle functionality
            setupExampleToggles();
            
        } catch (error) {
            console.error('Error adding example countries to receipt:', error);
        }
    }
    
    // Function to set up toggle icons for example countries
    function setupExampleToggles() {
        try {
            // Find all country toggles
            const toggleIcons = document.querySelectorAll('.country-toggle');
            
            // Add click handlers to the toggle icons
            toggleIcons.forEach(icon => {
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
            });
            
            // Set up global toggle icon
            const globalToggleIcon = document.getElementById('global-toggle-icon');
            if (globalToggleIcon) {
                globalToggleIcon.addEventListener('click', function() {
                    const effectsDetail = document.getElementById('global-effects-detail');
                    if (effectsDetail) {
                        const isHidden = effectsDetail.style.display === 'none';
                        effectsDetail.style.display = isHidden ? 'block' : 'none';
                        
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
        } catch (error) {
            console.error('Error setting up example toggles:', error);
        }
    }
    
    // Function to clear example countries
    function clearExampleCountries() {
        try {
            // Clear receipt items
            const receiptItems = document.getElementById('receipt-items');
            if (receiptItems) {
                receiptItems.innerHTML = '';
            }
            
            // Reset subtotal
            const subtotalValue = document.getElementById('subtotal-value');
            if (subtotalValue) {
                subtotalValue.textContent = '0.00%';
            }
            
            // Reset global row
            const globalRowValue = document.getElementById('global-row-value');
            if (globalRowValue) {
                globalRowValue.textContent = '0.00%';
            }
            
            // Reset global effects
            const globalDirectEffect = document.getElementById('global-direct-effect');
            const globalIndirectEffect = document.getElementById('global-indirect-effect');
            
            if (globalDirectEffect) globalDirectEffect.textContent = '0.00%';
            if (globalIndirectEffect) globalIndirectEffect.textContent = '0.00%';
            
            // Hide global toggle icon
            const globalToggleIcon = document.getElementById('global-toggle-icon');
            if (globalToggleIcon) {
                globalToggleIcon.style.display = 'none';
            }
            
            // Reset total effect
            const totalEffectElement = document.getElementById('total-effect');
            if (totalEffectElement) {
                totalEffectElement.textContent = '0.00%';
            }
        } catch (error) {
            console.error('Error clearing example countries:', error);
        }
    }
    
    function toggleEffectDetails(isEnabled) {
        effectDetailsToggleEnabled = isEnabled;
        
        // Store the setting globally so other components can access it
        window.effectDetailsToggleEnabled = isEnabled;
        
        // Update UI based on the setting - be more specific with selectors to avoid affecting UI toggles
        if (isEnabled) {
            // Toggle mode: Hide details by default, show toggle arrows
            document.querySelectorAll('.country-row-title .toggle-icon, #global-toggle-icon').forEach(icon => {
                icon.style.display = '';
            });
            
            document.querySelectorAll('.country-effects-detail, #global-effects-detail').forEach(detail => {
                detail.style.display = 'none';
            });
        } else {
            // Always visible mode: Show details, hide toggle arrows
            document.querySelectorAll('.country-row-title .toggle-icon, #global-toggle-icon').forEach(icon => {
                icon.style.display = 'none';
            });
            
            document.querySelectorAll('.country-effects-detail, #global-effects-detail').forEach(detail => {
                detail.style.display = 'block';
            });
        }
        
        // Update any existing and future receipt items
        if (typeof updateEffectDetailsDisplay === 'function') {
            updateEffectDetailsDisplay();
        }
        
        // Update example countries if they exist
        if (receiptToggleEnabled) {
            // Find all example country toggles
            const exampleToggles = document.querySelectorAll('.example-receipt-item .toggle-icon');
            exampleToggles.forEach(toggle => {
                toggle.style.display = isEnabled ? '' : 'none';
            });
            
            // Find all example country details
            const exampleDetails = document.querySelectorAll('.example-receipt-item .country-effects-detail');
            exampleDetails.forEach(detail => {
                detail.style.display = isEnabled ? 'none' : 'block';
            });
        }
    }
    
    // Initialize global settings
    window.effectDetailsToggleEnabled = effectDetailsToggleEnabled;
    
    // Check initial dark mode state based on body class
    function checkInitialDarkMode() {
        if (document.body.classList.contains('dark_theme')) {
            darkModeEnabled = true;
        }
    }
    
    // Check receipt visibility on load
    function checkInitialReceiptState() {
        // We need to wait for the DOM to be fully loaded
        setTimeout(() => {
            const receipt_totals = document.getElementById('receipt_totals');
            if (receipt_totals && receipt_totals.style.display === 'block') {
                receiptToggleEnabled = true;
            }
        }, 500);
    }
    
    // Function to create toggle switches instead of checkboxes
    function setupToggleSwitches() {
        // Initialize bar highlight color dropdown
        const barHighlightColorSelect = document.getElementById('bar-highlight-color');
        if (barHighlightColorSelect) {
            // Set initial value based on global setting
            if (window.barHighlightColor) {
                if (window.barHighlightColor === 'plot-color') {
                    barHighlightColorSelect.value = 'plot-color';
                } else {
                    // Extract CSS variable name from the value
                    const match = window.barHighlightColor.match(/var\((.*?)\)/);
                    if (match && match[1]) {
                        barHighlightColorSelect.value = match[1];
                    } else {
                        barHighlightColorSelect.value = '--blue1'; // Default
                    }
                }
            }
            
            // Initialize color preview with a gradient for plot-color
            if (barHighlightColorSelect.value === 'plot-color') {
                const colorPreview = document.getElementById('highlight-color-preview');
                if (colorPreview) {
                    // Show a gradient of colors to indicate "match plot color"
                    colorPreview.style.background = 'linear-gradient(to right, var(--blue1), var(--green1), var(--orange1))';
                    colorPreview.style.border = '1px solid #ccc';
                }
            } else {
                setBarHighlightColor(barHighlightColorSelect.value);
            }
        }
        
        // Replace checkboxes with toggle switches
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            // Skip if this checkbox is already in a toggle switch
            if (checkbox.closest('.toggle-switch')) return;
            
            const id = checkbox.id;
            const isChecked = checkbox.checked;
            const parentElement = checkbox.parentElement;
            
            // Get the onclick handler before we remove the checkbox
            let onclickHandler = null;
            if (checkbox.hasAttribute('onclick')) {
                onclickHandler = checkbox.getAttribute('onclick');
            }
            
            // Create the toggle switch container
            const toggleSwitch = document.createElement('label');
            toggleSwitch.className = 'toggle-switch';
            toggleSwitch.setAttribute('for', id);
            
            // Create the hidden input that maintains the functionality
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'checkbox';
            hiddenInput.id = id;
            hiddenInput.checked = isChecked;
            
            // Copy all event listeners and attributes
            for (const attr of checkbox.attributes) {
                if (attr.name !== 'id' && attr.name !== 'type' && attr.name !== 'checked') {
                    hiddenInput.setAttribute(attr.name, attr.value);
                }
            }
            
            // Re-apply the onclick handler directly (crucial for our toggle functionality)
            if (onclickHandler) {
                hiddenInput.setAttribute('onclick', onclickHandler);
            }
            
            // Create the toggle icon element
            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'toggle-icon';
            
            // Create the toggle image
            const toggleImg = document.createElement('img');
            toggleImg.src = isChecked 
                ? 'assets/fontawesome/toggle-on-solid.svg' 
                : 'assets/fontawesome/toggle-off-solid.svg';
            toggleImg.alt = isChecked ? 'Enabled' : 'Disabled';
            
            // Add the elements together
            toggleIcon.appendChild(toggleImg);
            toggleSwitch.appendChild(hiddenInput);
            toggleSwitch.appendChild(toggleIcon);
            
            // Set up event listener to update the image when toggled
            hiddenInput.addEventListener('change', function() {
                toggleImg.src = this.checked 
                    ? 'assets/fontawesome/toggle-on-solid.svg' 
                    : 'assets/fontawesome/toggle-off-solid.svg';
                toggleImg.alt = this.checked ? 'Enabled' : 'Disabled';
            });
            
            // Create a new div structure to ensure we don't lose event handlers
            if (parentElement.tagName.toLowerCase() === 'div' && parentElement.classList.contains('dev-option')) {
                // Get the label text
                const labelElement = parentElement.querySelector('label');
                const labelText = labelElement ? labelElement.textContent : '';
                const labelFor = labelElement ? labelElement.getAttribute('for') : '';
                
                // Create new label element
                const newLabel = document.createElement('label');
                newLabel.textContent = labelText;
                newLabel.setAttribute('for', labelFor || id);
                
                // Clear the parent div but do not delete it
                parentElement.innerHTML = '';
                
                // Add the label and toggle switch
                parentElement.appendChild(newLabel);
                parentElement.appendChild(toggleSwitch);
            } else {
                // Simple replacement
                checkbox.replaceWith(toggleSwitch);
            }
        });
    }
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', function() {
        checkInitialDarkMode();
        checkInitialReceiptState();
        
        // Add CSS for lightning bolt icons in the visualizations
        const style = document.createElement('style');
        style.textContent = `
            /* Lightning bolts in charts and visualizations */
            .sparks-lightning-bolt {
                display: inline-block;
                vertical-align: middle;
                width: 14px;
                height: 14px;
                margin-left: 3px;
                filter: invert(80%) sepia(42%) saturate(845%) hue-rotate(359deg) brightness(103%) contrast(103%);
            }
        `;
        document.head.appendChild(style);
        
        // Add global removeExampleCountry function
        window.removeExampleCountry = function(iso) {
            // Remove the example country from the receipt
            const countryItem = document.getElementById(`receipt-item-${iso}`);
            if (countryItem) {
                countryItem.remove();
            }
            
            // Recalculate subtotal based on remaining examples
            let subtotal = 0;
            const exampleItems = document.querySelectorAll('.example-receipt-item');
            exampleItems.forEach(item => {
                const effectText = item.querySelector('div > span').textContent;
                const effect = parseFloat(effectText) / 100;
                if (!isNaN(effect)) {
                    subtotal += effect;
                }
            });
            
            // Update subtotal
            const subtotalValue = document.getElementById('subtotal-value');
            if (subtotalValue) {
                subtotalValue.textContent = `${(subtotal * 100).toFixed(2)}%`;
            }
            
            // Update total with global effect
            const globalEffectText = document.getElementById('global-row-value').textContent;
            const globalEffect = parseFloat(globalEffectText) / 100;
            
            const totalEffect = subtotal + (isNaN(globalEffect) ? 0 : globalEffect);
            const totalEffectElement = document.getElementById('total-effect');
            if (totalEffectElement) {
                totalEffectElement.textContent = `${(totalEffect * 100).toFixed(2)}%`;
            }
            
            // If all examples are removed, go back to placeholder
            if (exampleItems.length === 0) {
                if (receiptToggleEnabled) {
                    // Just add examples back
                    addExampleCountriesToReceipt();
                }
            }
        };
    });
    
    // Modify the openDevToolsModal function to set up toggle switches
    const originalOpenDevToolsModal = openDevToolsModal;
    openDevToolsModal = function() {
        originalOpenDevToolsModal();
        
        // Wait for the modal to be added to the DOM
        setTimeout(function() {
            setupToggleSwitches();           
            // Add event listener for bar outline style toggle
            const barOutlineToggle = document.getElementById('bar-outline-toggle');
            if (barOutlineToggle) {
                barOutlineToggle.addEventListener('change', function() {
                    toggleBarOutlineStyle(this.checked);
                });
            }
        }, 200);
    };
    
    // Function to toggle between chevron and plus icons
    function toggleIconStyle(style) {
        // Update the internal variable
        window._toggleIconStyle = style;
        
        // Store the setting globally
        window.toggleIconStyle = style;
        
        // Update button states
        const chevronToggle = document.getElementById('chevron-toggle');
        const plusToggle = document.getElementById('plus-toggle');
        
        if (chevronToggle && plusToggle) {
            if (style === 'chevron') {
                chevronToggle.classList.add('active');
                plusToggle.classList.remove('active');
            } else {
                chevronToggle.classList.remove('active');
                plusToggle.classList.add('active');
            }
        }
        
        // Update the icons in the receipt
        updateToggleIcons();
    }
    
    // Function to update toggle icons based on selected style
    function updateToggleIcons() {
        const isChevron = window._toggleIconStyle === 'chevron';
        
        // Update all toggle icons with the appropriate image
        const expandImgSrc = isChevron ? 'assets/fontawesome/chevron-right-solid.svg' : 'assets/fontawesome/plus-solid.svg';
        const collapseImgSrc = isChevron ? 'assets/fontawesome/chevron-down-solid.svg' : 'assets/fontawesome/minus-solid.svg';
        
        // Update all toggle plus icons
        document.querySelectorAll('.toggle-plus').forEach(img => {
            img.src = expandImgSrc;
        });
        
        // Update all toggle minus icons
        document.querySelectorAll('.toggle-minus').forEach(img => {
            img.src = collapseImgSrc;
        });
    }
    
    // Function to update chart animation duration
    function updateAnimationDuration(value) {
        // Parse and validate the value
        const duration = parseFloat(value);
        
        if (!isNaN(duration) && duration >= 0.1) {
            // Update the global variable
            window._chartAnimationDuration = duration;
            window.chartAnimationDuration = duration;
        }
    }
    
    // Animation style (smooth or typewriter)
    let _animationStyle = 'smooth';
    
    // Set the animation style
    function setAnimationStyle(style) {
        // Validate input
        if (style !== 'smooth' && style !== 'typewriter') {
            console.warn('Invalid animation style:', style);
            return;
        }
        
        // Update the internal variable
        _animationStyle = style;
        
        // Store the setting globally
        window.chartAnimationStyle = style;
        
    }
    
    // Point style (circle or square)
    let _pointStyle = 'circle';
    
    // Set the point style
    function setPointStyle(style) {
        // Validate input
        if (style !== 'circle' && style !== 'square') {
            console.warn('Invalid point style:', style);
            return;
        }
        
        // Update the internal variable
        _pointStyle = style;
        
        // Store the setting globally
        window.chartPointStyle = style;
        
    }
    
    // Initialize global settings
    window.toggleIconStyle = window._toggleIconStyle;
    window.chartAnimationDuration = window._chartAnimationDuration;
    window.chartAnimationStyle = _animationStyle;
    window.chartPointStyle = _pointStyle;
    
    // Add a hook for applying current chart style to new charts
    window.applyChartStyleToNewChart = function(chartContainer) {
        // Use a small delay to ensure the chart is fully rendered
        setTimeout(() => {
            // Apply the currently active style configuration to this new chart
            applyStyleConfigToChart(chartContainer);
        }, 100);
    };
    
    // Legacy function name for backward compatibility
    window.applyChartWizStyleToNewChart = window.applyChartStyleToNewChart;
    
    // Apply the current style configuration to a specific chart
    function applyStyleConfigToChart(chartContainer) {
        if (!chartContainer) return;
        
        // Get the chart container elements
        const chartTitle = chartContainer.querySelector('.chart-title');
        const chartVisualization = chartContainer.querySelector('.chart-visualization');
        if (!chartTitle || !chartVisualization) return;
        
        // Apply title alignment based on config
        if (window.chartStyleConfig.active.title.align === 'left') {
            chartTitle.style.textAlign = 'left';
            chartTitle.style.paddingLeft = window.chartStyleConfig.active.title.padding;
        } else {
            chartTitle.style.textAlign = 'center';
            chartTitle.style.paddingLeft = '0px';
        }
        
        // Process y-axis title based on configuration
        const svgYAxisTitle = chartVisualization.querySelector('svg g text[transform*="rotate(-90)"]');
        
        if (svgYAxisTitle) {
            // Handle vertical/rotated title visibility
            if (window.chartStyleConfig.active.yAxis.titlePosition === 'horizontal') {
                // When using horizontal title, hide the rotated one (but keep it accessible)
                svgYAxisTitle.style.opacity = '0';
                
                // Get or create horizontal title
                let horizontalYTitle = chartContainer.querySelector('.chart-y-title-horizontal');
                const yAxisTitleText = svgYAxisTitle.textContent || '';
                
                if (!horizontalYTitle && yAxisTitleText) {
                    // Create horizontal title
                    horizontalYTitle = document.createElement('div');
                    horizontalYTitle.className = 'chart-y-title-horizontal';
                    horizontalYTitle.textContent = yAxisTitleText;
                    
                    // Insert after chart title
                    chartTitle.parentNode.insertBefore(horizontalYTitle, chartTitle.nextSibling);
                } else if (horizontalYTitle) {
                    // Update existing horizontal title
                    horizontalYTitle.textContent = yAxisTitleText;
                    horizontalYTitle.style.display = 'block';
                }
            } else {
                // Using vertical title, show/hide based on config
                svgYAxisTitle.style.opacity = window.chartStyleConfig.active.yAxis.titleVisible ? '1' : '0';
                
                // Hide horizontal title if it exists
                const horizontalYTitle = chartContainer.querySelector('.chart-y-title-horizontal');
                if (horizontalYTitle) {
                    horizontalYTitle.style.display = 'none';
                }
            }
        }
        
        // Handle axis lines and ticks
        // Y-axis line
        const yAxisLines = chartVisualization.querySelectorAll('svg g line[x1="0"][x2="0"]');
        yAxisLines.forEach(line => {
            line.classList.add('y-axis-line');
            line.style.stroke = window.chartStyleConfig.active.yAxis.lineVisible 
                ? window.chartStyleConfig.active.yAxis.color 
                : 'transparent';
        });
        
        // Y-axis ticks
        const yTicks = chartVisualization.querySelectorAll('svg g line[x1^="-"][x2="0"][y1][y2]');
        yTicks.forEach(tick => {
            tick.classList.add('y-tick');
            tick.style.stroke = window.chartStyleConfig.active.yAxis.ticksVisible 
                ? window.chartStyleConfig.active.yAxis.color 
                : 'transparent';
        });
        
        // X-axis ticks
        const xTicks = chartVisualization.querySelectorAll('svg g line[y1][y2][x1="x2"]');
        xTicks.forEach(tick => {
            tick.classList.add('x-tick');
            tick.style.stroke = window.chartStyleConfig.active.xAxis.ticksVisible 
                ? window.chartStyleConfig.active.xAxis.color 
                : 'transparent';
        });
    }

    // Simplified function to toggle lightning bolt visibility
    function toggleLightningBolt(isEnabled) {
        // Store the setting globally
        window.showLightningBolt = isEnabled;
        
        console.log('Lightning bolt visibility set to:', isEnabled);
        
        // Update any lightning bolt icons in the visualization
        const lightningBoltIcons = document.querySelectorAll('.sparks-lightning-bolt');
        lightningBoltIcons.forEach(icon => {
            icon.style.display = isEnabled ? 'inline-block' : 'none';
        });
    }
    
    // Initialize global lightning bolt setting
    window.showLightningBolt = false; // Default to visible
    
    // Expose the function globally as well
    window.toggleLightningBolt = toggleLightningBolt;
    
    // The testTreemapDrillDown function has been moved to testFunctions.js
    
    // Bar highlight color setting
    window.barHighlightColor = 'plot-color'; // Default to match plot color
    
    // Function to set bar highlight color
    function setBarHighlightColor(colorValue) {
        // Handle "plot-color" special value
        if (colorValue === 'plot-color') {
            window.barHighlightColor = 'plot-color';
            
            // Update the color preview to show multiple colors
            const colorPreview = document.getElementById('highlight-color-preview');
            if (colorPreview) {
                // Show a gradient of colors to indicate "match plot color"
                colorPreview.style.background = 'linear-gradient(to right, var(--blue1), var(--green1), var(--orange1))';
                colorPreview.style.border = '1px solid #ccc';
            }
        } else {
            // Set to the selected CSS variable
            window.barHighlightColor = `var(${colorValue})`;
            
            // Update the color preview
            const colorPreview = document.getElementById('highlight-color-preview');
            if (colorPreview) {
                colorPreview.style.background = window.barHighlightColor;
                colorPreview.style.border = 'none';
            }
        }
    }
    
    // Bar outline style setting
    window.useBarOutlineStyle = false; // Default to false
    
    // Function to toggle bar outline style
    function toggleBarOutlineStyle(enabled) {
        // Store the setting globally
        window.useBarOutlineStyle = enabled;
        
        // Find all existing bars and update their style
        document.querySelectorAll('.data-bar').forEach(bar => {
            if (enabled) {
                const fillColor = bar.getAttribute('fill');
                // Save original fill for later restoration if needed
                bar.setAttribute('data-original-fill', fillColor);
                
                // Apply outline style: stroke with the original color, lighter fill
                bar.setAttribute('stroke', fillColor);
                bar.setAttribute('stroke-width', '1.5');
                
                // Make the fill a lighter version of the same color
                // Using opacity is a simple way to achieve this
                bar.setAttribute('fill-opacity', '0.5');
            } else {
                // Restore original style
                const originalFill = bar.getAttribute('data-original-fill');
                if (originalFill) {
                    bar.setAttribute('fill', originalFill);
                }
                bar.removeAttribute('stroke');
                bar.removeAttribute('stroke-width');
                bar.removeAttribute('fill-opacity');
            }
        });
    }
    
    // Chart Style Configuration System
    // Define a global chart style configuration object that can be modified
    window.chartStyleConfig = {
        // Default standard chart style
        standard: {
            yAxis: {
                visible: true,
                position: 'left',       // 'left' or 'none'
                titlePosition: 'rotate', // 'rotate' (vertical) or 'horizontal'
                titleVisible: true,
                ticksVisible: true,
                lineVisible: true,
                color: 'var(--text-color)'
            },
            xAxis: {
                visible: true,
                position: 'bottom',    // 'bottom' or 'none'
                ticksVisible: true,
                lineVisible: true,
                color: 'var(--text-color)'
            },
            title: {
                align: 'center',        // 'center' or 'left'
                padding: '0px'
            },
            gridLines: {
                visible: true,
                style: 'dashed',       // 'dashed' or 'solid'
                opacity: 0.2
            }
        },
        
        // Chart Wiz style configuration
        chartWiz: {
            yAxis: {
                visible: true,
                position: 'none',      // Hide the y-axis line
                titlePosition: 'horizontal',
                titleVisible: true,
                ticksVisible: false,
                lineVisible: false,
                color: 'var(--text-color)'
            },
            xAxis: {
                visible: true,
                position: 'bottom',
                ticksVisible: true,    // Keep x-axis ticks
                lineVisible: true,     // Keep x-axis line
                color: 'var(--text-color)'
            },
            title: {
                align: 'left',
                padding: '10px'
            },
            gridLines: {
                visible: true,
                style: 'dashed',
                opacity: 0.2
            }
        },
        
        // Current active configuration (starts with standard)
        active: {}
    };
    
    // Initialize with standard configuration
    window.chartStyleConfig.active = JSON.parse(JSON.stringify(window.chartStyleConfig.standard));
    
    // Chart Wiz Style setting
    window.useChartWizStyle = false; // Default to false
    
    
    function toggleConsumerBasket(){
        window.usePriceBasket = enabled;
        
        if (enabled){
            // change the data_paths.js basket: {current: consumer }
        } else{
            // change the data_paths.js basket: {current: total}
        }

    }

    // Function to toggle Chart Wiz Style
    function toggleChartWizStyle(enabled) {
        // Store the setting globally
        window.useChartWizStyle = enabled;
        
        // Update the active configuration based on the selected style
        if (enabled) {
            // Switch to Chart Wiz style
            window.chartStyleConfig.active = JSON.parse(JSON.stringify(window.chartStyleConfig.chartWiz));
            document.body.classList.add('chart-wiz-mode');
        } else {
            // Switch back to standard style
            window.chartStyleConfig.active = JSON.parse(JSON.stringify(window.chartStyleConfig.standard));
            document.body.classList.remove('chart-wiz-mode');
        }
        
        // Add CSS for the chart styles if it doesn't exist yet
        let chartStyleElement = document.getElementById('chart-styles');
        if (!chartStyleElement) {
            chartStyleElement = document.createElement('style');
            chartStyleElement.id = 'chart-styles';
            document.head.appendChild(chartStyleElement);
            
            // Define base styles that apply regardless of chart style
            chartStyleElement.textContent = `
                /* Base chart styles */
                .chart-y-title-horizontal {
                    display: none; /* Hidden by default, shown when needed */
                    text-align: left;
                    padding-left: 10px;
                    font-weight: normal;
                    margin-top: -10px;
                    font-family: monospace;
                    font-size: 14px;
                    color: var(--text-color);
                }
                
                /* Chart Wiz specific styles */
                body.chart-wiz-mode .chart-title {
                    text-align: left;
                    padding-left: 10px;
                }
                
                body.chart-wiz-mode .chart-y-title-horizontal {
                    display: block;
                }
                
                /* Don't use display:none on SVG elements, as it can prevent JavaScript from accessing their attributes */
                body.chart-wiz-mode .chart-visualization svg g text[transform*="rotate(-90)"] {
                    opacity: 0; /* Hide but keep accessible for dimension calculations */
                }
            `;
        }
        
        // Apply changes to existing charts
        updateExistingChartsWithCurrentStyle();
        
        // Dispatch a custom event to notify style checkers about the change
        const event = new CustomEvent('chartWizStyleChanged', { 
            detail: { 
                enabled: enabled,
                config: window.chartStyleConfig.active
            } 
        });
        document.dispatchEvent(event);
        
        // Return the current active configuration for use in charts
        return window.chartStyleConfig.active;
    }
    
    // Helper function to get the current chart style configuration
    window.getChartStyleConfig = function() {
        return window.chartStyleConfig.active;
    };
    
    // Helper function to update existing charts with current style
    function updateExistingChartsWithCurrentStyle() {
        // Process all chart visualizations
        document.querySelectorAll('.chart-visualization').forEach(chartVisualization => {
            const chartContainer = chartVisualization.closest('.tariff-chart-container');
            if (chartContainer) {
                // Use our centralized function to apply styles
                applyStyleConfigToChart(chartContainer);
            }
        });
    }
    

    // Expose public functions
    return{ 
        open: openDevToolsModal,
        close: closeModal,
        toggleDark: toggleDarkMode,
        toggleReceipt: toggleReceipt,
        toggleEffectDetails: toggleEffectDetails,
        toggleIconStyle: toggleIconStyle,
        updateAnimationDuration: updateAnimationDuration,
        setAnimationStyle: setAnimationStyle,
        setPointStyle: setPointStyle,
        toggleLightningBolt: toggleLightningBolt,
        setBarHighlightColor: setBarHighlightColor,
        toggleBarOutlineStyle: toggleBarOutlineStyle,
        toggleChartWizStyle: toggleChartWizStyle,
    };
})();