/**
 * Sparks Create Chart Utilities
 * Functions for creating chart components and UI elements
 */

window.sparksCreateChartUtils = (function() {
    /**
     * Creates axis scales for a chart
     * 
     * @param {Array<number>} data - Array of data values to scale
     * @param {number} minOutput - Minimum output value (usually 0 for y-axis)
     * @param {number} maxOutput - Maximum output value (usually chart height or width)
     * @param {number} padding - Optional padding to add to min/max
     * @returns {Object} Object with scale function and axis limits
     */
    function createScale(data, minOutput, maxOutput, padding = 0) {
        // Filter out invalid values
        const validData = data.filter(val => val !== null && val !== undefined && !isNaN(val));
        
        if (validData.length === 0) {
            return {
                scale: () => minOutput,
                min: 0,
                max: 1
            };
        }
        
        const minData = Math.min(...validData);
        const maxData = Math.max(...validData);
        
        // Add padding to data range
        const paddedMin = minData - padding;
        const paddedMax = maxData + padding;
        const dataRange = paddedMax - paddedMin;
        
        // Create scale function
        const scale = value => {
            if (dataRange === 0) return (minOutput + maxOutput) / 2;
            return minOutput + (maxOutput - minOutput) * ((value - paddedMin) / dataRange);
        };
        
        return {
            scale,
            min: paddedMin,
            max: paddedMax
        };
    }

    /**
     * Creates a tooltip container that will be positioned on top of all chart elements
     * 
     * @param {SVGElement} parentElement - The parent SVG element
     * @returns {SVGElement} The tooltip container
     */
    function createTooltipContainer(parentElement) {
        const tooltipsContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        tooltipsContainer.setAttribute('class', 'tooltips-container');
        return tooltipsContainer;
    }

    /**
     * Creates a format toggle UI element for switching between different number formats
     * 
     * @param {HTMLElement} parentElement - The parent element to append the toggle to
     * @param {Object} options - Options for the toggle
     * @param {string} options.position - Position of the toggle ('top-right', 'top-left', etc.)
     * @returns {HTMLElement} The toggle container
     */
    function createFormatToggle(parentElement, options = {}) {
        const container = document.createElement('div');
        container.className = 'chart-format-toggle';
        container.style.position = 'absolute';
        
        // Position the toggle
        if (options.position === 'top-right') {
            container.style.top = '10px';
            container.style.right = '10px';
        } else if (options.position === 'top-left') {
            container.style.top = '10px';
            container.style.left = '10px';
        } else {
            // Default to top-right
            container.style.top = '10px';
            container.style.right = '10px';
        }
        
        // Create the toggle buttons
        const formats = [
            { id: 'expanded', label: 'Full Numbers', title: 'Show full numbers with commas' },
            { id: 'abbreviated', label: 'Abbreviated (K/M/B)', title: 'Show abbreviated numbers with K, M, B suffixes' },
            { id: 'scientific', label: 'Scientific', title: 'Show numbers in scientific notation' }
        ];
        
        const currentMode = window.chartSettings.tooltipFormatMode || 'expanded';
        
        // Create a select dropdown
        const select = document.createElement('select');
        select.className = 'format-select';
        select.title = 'Change number format in tooltips';
        
        formats.forEach(format => {
            const option = document.createElement('option');
            option.value = format.id;
            option.textContent = format.label;
            option.title = format.title;
            if (format.id === currentMode) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Add event listener
        select.addEventListener('change', function() {
            window.toggleTooltipFormat(this.value);
        });
        
        // Create a label
        const label = document.createElement('label');
        label.textContent = 'Format: ';
        label.appendChild(select);
        
        container.appendChild(label);
        parentElement.appendChild(container);
        
        return container;
    }

    /**
     * Creates an advanced interactive legend that allows highlighting/dimming series on click
     * This is the primary legend implementation used by sparksUIComponent.createLegend
     * 
     * @param {HTMLElement} legendContainer - Container element for the legend
     * @param {Array} items - Array of legend items with name and color properties
     * @param {Object} options - Configuration options
     * @param {Function} options.onHighlight - Callback when highlighting changes (receives highlighted series)
     * @param {number} options.dimOpacity - Opacity for dimmed items (default: 0.25)
     * @param {string} options.itemClass - CSS class for legend items (default: 'legend-item')
     * @param {number} options.itemsPerRow - Number of items per row (default: 5)
     * @param {number} options.maxRows - Maximum number of rows to display (default: 2)
     * @param {boolean} options.useLines - Use lines instead of squares for swatches (default: false)
     * @param {boolean} options.centerItems - Center align items within rows (default: true)
     * @returns {Object} Legend controller with methods to programmatically control highlighting
     */
    function createInteractiveLegend(legendContainer, items, options = {}) {
        // Default options
        const defaultOptions = {
            dimOpacity: 0.25,
            itemClass: 'legend-item',
            onHighlight: null,
            itemsPerRow: 5,
            maxRows: 2,
            useLines: false,
            centerItems: true,
            offsetLeft: 100 // Match the typical chart area transform offset
        };
        
        // Merge with user options
        const settings = { ...defaultOptions, ...options };
        
        // Clear existing legend content
        if (legendContainer) {
            legendContainer.innerHTML = '';
        } else {
            console.error('Legend container is not a valid DOM element');
            return null;
        }
        
        // State tracking
        const state = {
            items: items,
            highlightedItems: [], // Empty means all are visible
            allItems: items.map(item => item.name || item.id)
        };
        
        // Group items into rows
        const rows = [];
        let currentRow = [];
        
        items.forEach((item, index) => {
            // Add item to current row
            currentRow.push(item);
            
            // If row is full or this is the last item, add the row to rows array
            if (currentRow.length === settings.itemsPerRow || index === items.length - 1) {
                rows.push([...currentRow]);
                currentRow = [];
                
                // Limit to maxRows
                if (rows.length >= settings.maxRows) {
                    // If we exceed maxRows, truncate items
                    return;
                }
            }
        });
        
        // Set legend container position
        if (settings.offsetLeft) {
            legendContainer.style.width = `calc(100% - ${settings.offsetLeft}px)`;
            legendContainer.style.marginLeft = `${settings.offsetLeft}px`;
            legendContainer.style.boxSizing = 'border-box';
        }
        
        // Create row divs for layout
        rows.forEach(rowItems => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'legend-row';
            rowDiv.style.display = 'flex';
            rowDiv.style.justifyContent = 'center'; // Center items within the offset container
            rowDiv.style.flexWrap = 'nowrap'; // Prevent row wrapping
            rowDiv.style.gap = '25px'; // Slightly more space between items
            rowDiv.style.marginBottom = '12px'; // More space between rows for wrapped text
            
            // Create items in this row
            rowItems.forEach((item, index) => {
                const legendItem = document.createElement('div');
                legendItem.className = settings.itemClass;
                legendItem.style.display = 'flex';
                legendItem.style.alignItems = 'center';
                legendItem.style.justifyContent = 'flex-start';
                legendItem.style.textAlign = 'left';
                legendItem.style.cursor = 'pointer';
                
                // Color indicator - either line or square based on settings
                const colorIndicator = document.createElement('span');
                
                if (settings.useLines) {
                    // Create line style color indicator
                    colorIndicator.style.display = 'inline-block';
                    colorIndicator.style.width = '16px';
                    colorIndicator.style.height = '3px';
                    colorIndicator.style.backgroundColor = item.color;
                    colorIndicator.style.marginRight = '2px';
                } else {
                    // Create square style color indicator
                    colorIndicator.style.display = 'inline-block';
                    colorIndicator.style.width = '10px';
                    colorIndicator.style.height = '10px';
                    colorIndicator.style.backgroundColor = item.color;
                    colorIndicator.style.borderRadius = '2px';
                    colorIndicator.style.marginRight = '2px';
                    colorIndicator.style.border = 'none';
                }
                
                colorIndicator.style.transition = 'opacity 0.2s ease';
                
                // Text label
                const label = document.createElement('span');
                label.textContent = item.name || `Series ${index + 1}`;
                label.style.transition = 'opacity 0.2s ease';
                label.style.fontSize = '13px';
                label.style.width = '120px'; // Fixed width for consistency
                label.style.whiteSpace = 'normal'; // Allow text to wrap
                label.style.lineHeight = '1.2'; // Tighter line height for wrapped text
                
                // Store item data
                legendItem.dataset.itemIndex = index;
                legendItem.dataset.itemName = item.name || `Series ${index + 1}`;
                
                // Append to legend item
                legendItem.appendChild(colorIndicator);
                legendItem.appendChild(label);
                
                // Add tooltips on hover
                legendItem.setAttribute('title', 'Click to highlight.');
                
                // Click handler for highlighting
                legendItem.addEventListener('click', function(event) {
                    const name = this.dataset.itemName;
                    
                    // Check if Shift key is pressed (exclusive highlight)
                    if (event.shiftKey) {
                        // If only this item is highlighted and shift is pressed, reset
                        if (state.highlightedItems.length === 1 && state.highlightedItems[0] === name) {
                            state.highlightedItems = [];
                        } else {
                            // Highlight only this item
                            state.highlightedItems = [name];
                        }
                    } else {
                        // Regular click (toggle this item)
                        const index = state.highlightedItems.indexOf(name);
                        
                        if (index === -1) {
                            // Item not highlighted, add it
                            state.highlightedItems.push(name);
                        } else {
                            // Item already highlighted, remove it
                            state.highlightedItems.splice(index, 1);
                        }
                        
                        // If all items are highlighted, reset to empty (meaning no filtering)
                        if (state.highlightedItems.length === state.allItems.length) {
                            state.highlightedItems = [];
                        }
                    }
                    
                    // Update visual appearance
                    updateLegendAppearance();
                    
                    // Call callback with current state
                    if (typeof settings.onHighlight === 'function') {
                        settings.onHighlight(state.highlightedItems);
                    }
                });
                
                // Append to row
                rowDiv.appendChild(legendItem);
            });
            
            // Append row to container
            legendContainer.appendChild(rowDiv);
        });
        
        // Function to update the visual appearance of legend items
        function updateLegendAppearance() {
            const legendItems = legendContainer.querySelectorAll(`.${settings.itemClass}`);
            
            // If no items are highlighted, show all as fully visible
            const noHighlights = state.highlightedItems.length === 0;
            
            legendItems.forEach(item => {
                const name = item.dataset.itemName;
                const isHighlighted = noHighlights || state.highlightedItems.includes(name);
                
                // Update opacity of the color indicator and text
                const colorIndicator = item.querySelector('span:first-child');
                const label = item.querySelector('span:last-child');
                
                if (colorIndicator && label) {
                    colorIndicator.style.opacity = isHighlighted ? 1 : settings.dimOpacity;
                    label.style.opacity = isHighlighted ? 1 : settings.dimOpacity;
                }
            });
        }
        
        // Return controller object with methods to control the legend
        return {
            // Highlight specific series
            highlight: function(seriesNames) {
                if (!Array.isArray(seriesNames)) {
                    seriesNames = [seriesNames];
                }
                state.highlightedItems = seriesNames;
                updateLegendAppearance();
                
                if (typeof settings.onHighlight === 'function') {
                    settings.onHighlight(state.highlightedItems);
                }
            },
            
            // Reset to show all series
            resetHighlight: function() {
                state.highlightedItems = [];
                updateLegendAppearance();
                
                if (typeof settings.onHighlight === 'function') {
                    settings.onHighlight([]);
                }
            },
            
            // Get current state
            getHighlightedItems: function() {
                return [...state.highlightedItems];
            }
        };
    }
    
    // Public API
    return {
        createScale,
        createTooltipContainer,
        createFormatToggle,
        createInteractiveLegend
    };
})();