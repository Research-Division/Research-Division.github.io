/**
 * customReceiptOrder.js - Custom ordering functionality for receipt items
 * 
 * This module provides functions to sort the receipt items by value or alphabetically
 * and handles the dropdown UI for selecting sort options.
 */

var CustomReceiptOrder = (function() {
    // Current sort order
    let currentSortOrder = 'value'; // Default sort order

    /**
     * Initialize the custom receipt order dropdown
     * Adds a dropdown button next to the date to select sort order
     */
    function initialize() {
        //console.log('Initializing CustomReceiptOrder module - Debug Version');
        
        // Create the sort order dropdown
        const dateLine = document.querySelector('.receipt-date-line');
        if (!dateLine) {
            console.error('Date line not found in receipt');
            return;
        }
        
        // Create container for the dropdown
        const sortContainer = document.createElement('div');
        sortContainer.className = 'receipt-sort-container';
        
        // Create the label
        const sortLabel = document.createElement('span');
        sortLabel.textContent = 'Sort by: ';
        sortLabel.className = 'sort-label';
        
        // Create a country-dropdown-toggle style span for the dropdown
        const dropdownToggle = document.createElement('span');
        dropdownToggle.className = 'sort-dropdown-toggle';
        
        // Add the current selection text
        const sortSelection = document.createElement('span');
        sortSelection.className = 'sort-selection sort-value';
        sortSelection.textContent = 'Value';
        
        // Add dropdown arrow icon (matching the trade area charts style)
        const dropdownIcon = document.createElement('img');
        dropdownIcon.src = DataPaths.assets.fontawesome.chevronDownSolid;
        dropdownIcon.alt = 'Sort options';
        dropdownIcon.className = 'dropdown-icon';
        
        // Assemble the toggle
        dropdownToggle.appendChild(sortSelection);
        dropdownToggle.appendChild(dropdownIcon);
        
        // Create the dropdown container (will be absolutely positioned)
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'sort-dropdown-container';
        
        // Create dropdown content in style of trade area charts
        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'sort-dropdown-content';
        
        // Create dropdown options
        const options = [
            { value: 'value', text: 'Value' },
            { value: 'alphabetical', text: 'Alphabetical' }
        ];
        
        options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'sort-option';
            optionElement.setAttribute('data-sort', option.value);
            optionElement.textContent = option.text;
            
            // Highlight the current selection
            if (option.value === currentSortOrder) {
                optionElement.classList.add('selected');
            }
            
            // Add click handler
            optionElement.addEventListener('click', function(e) {
                e.stopPropagation();
                const sortValue = this.getAttribute('data-sort');
                setSortOrder(sortValue);
                sortSelection.textContent = this.textContent;
                
                // Update color based on sort option
                if (sortValue === 'value') {
                    sortSelection.classList.remove('sort-alphabetical');
                    sortSelection.classList.add('sort-value');
                } else {
                    sortSelection.classList.remove('sort-value');
                    sortSelection.classList.add('sort-alphabetical');
                }
                
                dropdownContainer.classList.remove('active');
                dropdownToggle.classList.remove('active');
                
                // Apply the sort to the current receipt
                applySortToReceipt();
                
                // Remove selected class from all options
                document.querySelectorAll('.sort-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to this option
                this.classList.add('selected');
            });
            
            dropdownContent.appendChild(optionElement);
        });
        
        // Toggle dropdown on toggle click
        dropdownToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Toggle the active class on the dropdown
            dropdownContainer.classList.toggle('active');
            this.classList.toggle('active');
            
            // Rotate the icon when active
            if (this.classList.contains('active')) {
                dropdownIcon.style.transform = 'rotate(180deg)';
            } else {
                dropdownIcon.style.transform = '';
            }
            
            // Ensure dropdown is visible when active
            //console.log('Dropdown toggled, active:', dropdownContainer.classList.contains('active'));
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function() {
            dropdownContainer.classList.remove('active');
            dropdownToggle.classList.remove('active');
            dropdownIcon.style.transform = '';
        });
        
        // Assemble the dropdown
        dropdownContainer.appendChild(dropdownContent);
        
        // Add the elements to the container
        sortContainer.appendChild(sortLabel);
        sortContainer.appendChild(dropdownToggle);
        sortContainer.appendChild(dropdownContainer);
        
        // Add the container to the date line
        dateLine.appendChild(sortContainer);
        
        //console.log('CustomReceiptOrder module initialized');
    }
    
    /**
     * Set the current sort order
     * @param {string} order - The sort order ('value' or 'alphabetical')
     */
    function setSortOrder(order) {
        if (order !== 'value' && order !== 'alphabetical') {
            console.error('Invalid sort order:', order);
            return;
        }
        
        currentSortOrder = order;
        //console.log('Sort order set to:', order);
    }
    
    /**
     * Apply the current sort order to the receipt
     */
    function applySortToReceipt() {
        // Get all receipt items
        const receiptItemsDiv = document.getElementById('receipt-items');
        if (!receiptItemsDiv) {
            console.error('Receipt items container not found');
            return;
        }
        
        // Get all receipt items
        const items = Array.from(receiptItemsDiv.querySelectorAll('.receipt-item'));
        if (items.length === 0) {
            //console.log('No receipt items to sort');
            return;
        }
        
        //console.log(`Sorting ${items.length} receipt items by ${currentSortOrder}`);
        
        // For value sorting, we should use the calculation results when possible
        if (currentSortOrder === 'value' && window.TariffCalculations) {
            try {
                const results = window.TariffCalculations.getMostRecentResults();
                if (results && results.length > 0) {
                    // Create a map of ISO codes to their effects for fast lookup
                    const effectMap = {};
                    results.forEach(result => {
                        effectMap[result.isoCode] = result.totalSum || 0;
                    });
                    
                    // Sort items by using the effect values from the calculation results
                    items.sort((a, b) => {
                        // Extract ISO codes from the items' IDs
                        const isoA = a.id.replace('receipt-item-', '');
                        const isoB = b.id.replace('receipt-item-', '');
                        
                        // Get effects from the map, defaulting to 0 if not found
                        const effectA = effectMap[isoA] || 0;
                        const effectB = effectMap[isoB] || 0;
                        
                        // Sort in descending order
                        return effectB - effectA;
                    });
                    
                    // Re-append items in the new order
                    items.forEach(item => {
                        receiptItemsDiv.appendChild(item);
                    });
                    
                    //console.log('Receipt items sorted by calculation results');
                    return;
                }
            } catch (error) {
                console.error('Error sorting by calculation results:', error);
            }
        }
        
        // Fallback to parsing values from the DOM if no calculation results or using alphabetical sort
        items.sort((a, b) => {
            if (currentSortOrder === 'value') {
                // Sort by value (numeric)
                const valueA = parseValueFromItem(a);
                const valueB = parseValueFromItem(b);
                return valueB - valueA; // Descending order
            } else {
                // Sort alphabetically by country name
                const nameA = getCountryNameFromItem(a);
                const nameB = getCountryNameFromItem(b);
                return nameA.localeCompare(nameB); // Ascending order
            }
        });
        
        // Re-append items in the new order
        items.forEach(item => {
            receiptItemsDiv.appendChild(item);
        });
        
        //console.log('Receipt items sorted using DOM values');
    }
    
    /**
     * Extract the numeric value from a receipt item
     * @param {HTMLElement} item - The receipt item element
     * @returns {number} - The numeric value
     */
    function parseValueFromItem(item) {
        // Get the value from the right column
        const valueText = item.querySelector('div:last-child span').textContent;
        
        // Parse the value
        const valueStr = valueText.replace('%', '').replace(/,/g, '');
        const value = parseFloat(valueStr);
        
        return isNaN(value) ? 0 : value;
    }
    
    /**
     * Extract the country name from a receipt item
     * @param {HTMLElement} item - The receipt item element
     * @returns {string} - The country name
     */
    function getCountryNameFromItem(item) {
        // Get the country name from the clickable span
        const countryElement = item.querySelector('.country-row-title .clickable');
        return countryElement ? countryElement.textContent : '';
    }
    
    /**
     * Sort an array of selectedISOs based on the current sort order
     * This is used when building the receipt from scratch
     * @param {Array} selectedISOs - Array of ISO codes
     * @returns {Array} - Sorted array of ISO codes
     */
    function sortSelectedISOs(selectedISOs) {
        if (!selectedISOs || selectedISOs.length === 0) {
            return selectedISOs;
        }
        
        //console.log(`Sorting ${selectedISOs.length} ISO codes by ${currentSortOrder}`);
        
        // For 'value' sort, we need to look at the calculation results
        if (currentSortOrder === 'value' && window.TariffCalculations) {
            const results = window.TariffCalculations.getMostRecentResults();
            if (!results || results.length === 0) {
                //console.log('No calculation results available for sorting');
                return selectedISOs;
            }
            
            // Create a map of ISO codes to their effect values
            const isoToEffect = {};
            results.forEach(result => {
                isoToEffect[result.isoCode] = result.totalSum || 0;
            });
            
            // Sort the ISO codes by their effect values
            return [...selectedISOs].sort((a, b) => {
                const effectA = isoToEffect[a] || 0;
                const effectB = isoToEffect[b] || 0;
                return effectB - effectA; // Descending order
            });
        } 
        // For 'alphabetical' sort, we need to look at the country names
        else if (currentSortOrder === 'alphabetical' && window.isoToCountryName) {
            return [...selectedISOs].sort((a, b) => {
                const nameA = window.isoToCountryName[a] || a;
                const nameB = window.isoToCountryName[b] || b;
                return nameA.localeCompare(nameB); // Ascending order
            });
        }
        
        // If we can't sort, return the original array
        return selectedISOs;
    }
    
    /**
     * Get the current sort order
     * @returns {string} - The current sort order
     */
    function getCurrentSortOrder() {
        return currentSortOrder;
    }
    
    // Public API
    return {
        initialize,
        setSortOrder,
        applySortToReceipt,
        sortSelectedISOs,
        getCurrentSortOrder
    };
})();

// Make the module available globally
window.CustomReceiptOrder = CustomReceiptOrder;