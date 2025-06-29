/**
 * Sparks UI Component
 * Core component for creating tooltips, legends, and applying chart styles
 */

window.sparksUIComponent = (function() {
    /**
     * Calculates balanced margins for charts with horizontal y-axis titles
     * @returns {Object} Margin object with top, right, bottom, left properties
     */
    function calculateBalancedMargins() {
        // Start with default margins
        const margins = { top: 30, right: 50, bottom: 40, left: 100 };
        
        // Adjust margins for mobile
        if (window.isMobileVersion) {
            // Reduce margins on mobile for more chart space
            margins.top = 20;
            margins.right = 20;  // Significantly reduce right margin on mobile
            margins.bottom = 50;  // Increase bottom margin for rotated labels
            margins.left = 80;   // Slightly reduce left margin
        }
        
        // Adjust for horizontal y-axis title if applicable
        if (window.sparksStyleManager) {
            const activeStyle = window.sparksStyleManager.getActiveStyle();
            const styleConfig = window.sparksStyleManager.getStyleConfig(activeStyle);
            
            if (styleConfig && 
                styleConfig.properties && 
                styleConfig.properties.yAxis && 
                styleConfig.properties.yAxis.titlePosition === 'horizontal') {
                
                // Calculate margins that ensure y-axis labels are visible
                const yAxisLabelWidth = 60;  // Typical width for values like "$592.4B"
                const yAxisTickMarkWidth = 5;
                const leftPadding = 10;
                
                // Set balanced margins
                margins.left = yAxisLabelWidth + yAxisTickMarkWidth + leftPadding;
                margins.right = window.isMobileVersion ? 20 : margins.left;  // Keep mobile right margin small
            }
        }
        
        return margins;
    }
    /**
     * Creates a chart container with standard layout
     * @param {string} containerId - ID of the container element
     * @param {Object} config - Chart configuration
     * @return {Object} Container elements and dimensions
     */
    function createChartContainer(containerId, config) {
        //console.log(`Creating chart container for ${containerId}`);
        
        // Get container element
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID '${containerId}' not found`);
            return null;
        }
        
        // Make sure container has proper dimensions
        if (container.clientWidth <= 0) {
            //console.warn(`Container ${containerId} has zero width, waiting for layout...`);
            // Add a placeholder with dimensions until the container is ready
            container.innerHTML = '<div class="visualization-placeholder">Preparing chart...</div>';
            return null;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Determine initial style (center title by default, will be adjusted by applyChartStyle if needed)
        const titleStyle = window.useChartWizStyle ? 'text-align: left;' : 'text-align: center; font-weight: bold;';
        // Notes always left-aligned regardless of style
        // Use padding instead of margin to maintain alignment with chart content
        const notesStyle = 'text-align: left; padding-left: 10px; margin-top: 10px; font-size: 12px; color: var(--alt-text-color);';
        
        // Use standard SVG height for consistency
        const svgHeight = 400;
        
        // Create chart structure
        const chartHTML = `
            <div class="tariff-chart-container">
                <div class="chart-title" style="${titleStyle}${window.isMobileVersion ? ' font-size: 14px;' : ''}">${config.title}</div>
                <div class="chart-visualization">
                    <svg id="${containerId}-svg" width="100%" height="${svgHeight}"></svg>
                </div>
                <div class="chart-visualization-container">
                    <div id="${containerId}-legend" class="chart-legend"></div>
                </div>
                <div class="chart-notes" style="${notesStyle}">
                    ${config.note || config.subtitle ? `<p><strong>Note:</strong> ${config.note || config.subtitle}</p>` : ''}
                    ${config.source || config.sourceNote ? `<p><strong>Source:</strong> ${config.source || config.sourceNote}</p>` : ''}
                </div>
            </div>
        `;
        
        container.innerHTML = chartHTML;
        
        // Get SVG element
        const svg = document.getElementById(`${containerId}-svg`);
        if (!svg) {
            console.error('SVG element not found after creating chart HTML');
            return null;
        }
        
        // Set chart dimensions with appropriate margins
        const margin = calculateBalancedMargins();
        
        //console.log(`Using margins: top=${margin.top}, right=${margin.right}, bottom=${margin.bottom}, left=${margin.left}`);
        
        const width = svg.clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
        
        // Make sure we have valid width and height
        if (width <= 0 || height <= 0) {
            console.warn('Invalid chart dimensions:', { width, height });
            return null;
        }
        
        // Create chart area
        const chartArea = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        // Use custom transform if provided in config, otherwise use calculated margins
        if (config && config.transform) {
            chartArea.setAttribute('transform', config.transform);
        } else {
            chartArea.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        }
        
        svg.appendChild(chartArea);
        
        // Store margins on the SVG element for other functions to access
        svg.__chartMargins = {...margin};
        
        // Create tooltip container
        const tooltipsContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        tooltipsContainer.setAttribute('class', 'tooltips-container');
        chartArea.appendChild(tooltipsContainer);
        
        // Return container elements and dimensions
        return {
            container,
            svg,
            chartArea,
            tooltipsContainer,
            width,
            height,
            margin
        };
    }
    
    /**
     * Creates a generic tooltip for chart elements
     * @param {SVGElement} tooltipsContainer - Container for tooltips
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width of the element (for positioning)
     * @param {number} height - Height of the element (for positioning)
     * @param {*} xValue - X-axis value
     * @param {*} yValue - Y-axis value
     * @param {string} seriesName - Series name
     * @param {string} color - Element color
     * @param {Object} config - Chart configuration
     * @returns {SVGElement} The tooltip element
     */
    function createChartTooltip(tooltipsContainer, x, y, width, height, xValue, yValue, seriesName, color, config) {
        // Make sure tooltipsContainer exists and is in the DOM
        if (!tooltipsContainer || !tooltipsContainer.parentNode) {
            console.error('Tooltip container not properly initialized');
            return null;
        }
        
        // Use sparksTooltipManager if available
        if (window.sparksTooltipManager && typeof window.sparksTooltipManager.createTooltip === 'function') {
            return window.sparksTooltipManager.createTooltip(
                tooltipsContainer, x, y, width, height, xValue, yValue, seriesName, color, config
            );
        }
        
        // Fallback to legacy implementation if tooltip manager not available
        // Create enhanced tooltip elements that will show on hover
        const enhancedTooltip = document.createElementNS("http://www.w3.org/2000/svg", "g");
        enhancedTooltip.setAttribute('class', 'chart-tooltip');
        enhancedTooltip.setAttribute('opacity', '0');
        enhancedTooltip.setAttribute('pointer-events', 'none');
        
        // Format the value using tooltipFormatter if provided
        let formattedValue;
        if (config.tooltipFormatter && typeof config.tooltipFormatter === 'function') {
            formattedValue = config.tooltipFormatter(yValue);
        } else if (window.formatUtils) {
            // Default formatting based on axis title
            const axisTitle = config.yAxis.title ? config.yAxis.title.toLowerCase() : '';
            if (axisTitle.includes('currency') || axisTitle.includes('value') || 
                axisTitle.includes('usd') || axisTitle.includes('$')) {
                // Include prefix for currency values, this is the main formatter
                formattedValue = window.formatUtils.formatCurrency(yValue, { includePrefix: true });
            } else if (axisTitle.includes('percent') || axisTitle.includes('share') || 
                    axisTitle.includes('rate') || axisTitle.includes('%')) {
                // Check if percentage values are already in percentage form (config option)
                const valuesArePercentages = config.percentageConfig && config.percentageConfig.valuesArePercentages;
                
                if (valuesArePercentages) {
                    // Values are already in percentage form (4.5 = 4.5%)
                    formattedValue = yValue.toFixed(1) + '%';
                } else {
                    // Values are in decimal form (0.045 = 4.5%)
                    formattedValue = window.formatUtils.formatPercent(yValue);
                }
            } else {
                formattedValue = window.formatUtils.formatWithCommas(yValue);
            }
        } else {
            // Basic formatting
            formattedValue = yValue.toFixed(2);
        }
        
        // Create tooltip content: "Series: Value (X-value)"
        const tooltipContent = `${seriesName}: ${formattedValue} (${xValue})`;
        
        // Calculate text width for the box
        const textWidth = Math.max(tooltipContent.length * 7, 100); // Minimum width
        const boxPadding = 20;
        const boxWidth = textWidth + boxPadding;
        const boxHeight = 30;
        
        // Tooltip background - with consistent dimensions
        const tooltipBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        tooltipBg.setAttribute('rx', 4);
        tooltipBg.setAttribute('ry', 4);
        tooltipBg.setAttribute('fill', 'var(--background-color)');
        tooltipBg.setAttribute('stroke', color);
        tooltipBg.setAttribute('stroke-width', 1);
        tooltipBg.setAttribute('opacity', 0.9);
        
        // Calculate tooltip position
        const containerWidth = tooltipsContainer.closest('svg').clientWidth;
        
        // Position tooltip above the element and centered
        let tooltipX = x + (width / 2) - (boxWidth / 2);
        let tooltipY = y - boxHeight - 10;
        
        // Adjust if tooltip would go off the right edge
        if (tooltipX + boxWidth > containerWidth - 10) {
            tooltipX = containerWidth - boxWidth - 10;
        }
        
        // Adjust if tooltip would go off the left edge
        if (tooltipX < 10) {
            tooltipX = 10;
        }
        
        // Set tooltip position and size
        tooltipBg.setAttribute('x', tooltipX);
        tooltipBg.setAttribute('y', tooltipY);
        tooltipBg.setAttribute('width', boxWidth);
        tooltipBg.setAttribute('height', boxHeight);
        
        // Tooltip text - centered in the box
        const tooltipText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tooltipText.setAttribute('x', tooltipX + (boxWidth / 2));
        tooltipText.setAttribute('y', tooltipY + (boxHeight / 2));
        tooltipText.setAttribute('text-anchor', 'middle');
        tooltipText.setAttribute('dominant-baseline', 'middle');
        tooltipText.setAttribute('font-size', '12px');
        tooltipText.setAttribute('fill', 'var(--text-color)');
        tooltipText.textContent = tooltipContent;
        
        // Add tooltip elements
        enhancedTooltip.appendChild(tooltipBg);
        enhancedTooltip.appendChild(tooltipText);
        
        // Add tooltip to container
        tooltipsContainer.appendChild(enhancedTooltip);
        
        return enhancedTooltip;
    }
    
    /**
     * Creates a legend for the chart
     * This is a facade function that delegates to sparksCreateChartUtils.createInteractiveLegend when available,
     * with a fallback implementation for when the utility module is not available.
     * 
     * @param {string} containerId - ID of the container element
     * @param {Object} config - Chart configuration
     * @param {Array} config.series - Chart series data
     * @param {Object} config.legendConfig - Legend configuration options
     * @param {boolean} config.legendConfig.useLines - Whether to use lines instead of squares for legend items
     * @param {number} config.legendConfig.itemsPerRow - Number of items per row in the legend
     * @param {number} config.legendConfig.maxRows - Maximum number of rows to display in the legend
     */
    function createLegend(containerId, config) {
        const legendElement = document.getElementById(`${containerId}-legend`);
        if (!legendElement) {
            console.error('Legend element not found');
            return;
        }
        
        // Clear the legend container
        legendElement.innerHTML = '';
        
        // Format the data for the interactive legend
        const legendItems = config.series.map((series, index) => {
            // Get the color using core module if possible, otherwise try decoration component
            const coreModule = window.sparksGraphingCore || window.chartCore;
            const color = series.color || 
                           (coreModule && coreModule.getColorForIndex ? 
                            coreModule.getColorForIndex(index) : 
                            (window.sparksColorUtils ? 
                             window.sparksColorUtils.getChartColor(index) : 
                             'var(--blue1)'));
                             
            return {
                name: series.name,
                color: color
            };
        });
        
        // Create the row container for legend items
        const rowContainer = document.createElement('div');
        rowContainer.className = 'legend-rows';
        rowContainer.style.display = 'flex';
        rowContainer.style.flexDirection = 'column';
        rowContainer.style.alignItems = 'center';
        rowContainer.style.width = '100%';
        
        // Check if we should adjust legend position based on margins
        if (window.sparksStyleManager) {
            const activeStyle = window.sparksStyleManager.getActiveStyle();
            const styleConfig = window.sparksStyleManager.getStyleConfig(activeStyle);
            
            if (styleConfig && 
                styleConfig.properties && 
                styleConfig.properties.yAxis && 
                styleConfig.properties.yAxis.titlePosition === 'horizontal') {
                
                // For horizontal y-axis title styles, ensure the legend is aligned with the chart content
                const svg = document.getElementById(`${containerId}-svg`);
                if (svg && svg.__chartMargins) {
                    // For legend alignment, we use the actual SVG margins that were applied
                    // No need to calculate offset since we're now using balanced margins
                    
                    // For safety, add a small adjustment based on the alignment specified in style
                    const activeStyle = window.sparksStyleManager.getActiveStyle();
                    const styleConfig = window.sparksStyleManager.getStyleConfig(activeStyle);
                    
                    if (styleConfig && styleConfig.properties && styleConfig.properties.legend) {
                        const legendAlign = styleConfig.properties.legend.align;
                        
                        // Always use center alignment for consistency regardless of style
                        rowContainer.style.alignItems = 'center';
                    }
                }
            }
        }
        
        legendElement.appendChild(rowContainer);
        
        // Check if we have access to the interactive legend implementation
        const hasInteractiveLegend = 
            (window.chartUtils && window.chartUtils.createInteractiveLegend) ||
            (window.sparksCreateChartUtils && window.sparksCreateChartUtils.createInteractiveLegend);
            
        if (hasInteractiveLegend) {
            // Get legend config or use defaults
            const legendConfig = config.legendConfig || {};
            
            // Get the appropriate implementation
            const createInteractiveLegendFn = 
                (window.sparksCreateChartUtils && window.sparksCreateChartUtils.createInteractiveLegend) || 
                window.chartUtils.createInteractiveLegend;
            
            // Get the appropriate chart highlighting function
            const updateChartHighlightingFn = 
                (window.sparksColorUtils && window.sparksColorUtils.updateChartHighlighting) ||
                (window.chartUtils && window.chartUtils.updateChartHighlighting);
            
            // Common options for interactive legend
            const legendOptions = {
                dimOpacity: 0.25,
                itemClass: 'legend-item',
                useLines: legendConfig.useLines || false,
                itemsPerRow: legendConfig.itemsPerRow || 5,
                maxRows: legendConfig.maxRows || 2,
                // Always center align items for consistency
                centerItems: true,
                // Set width to 100% to prevent overflow outside of chart boundaries
                width: '100%',
                // Adjust legend spacing for better readability in the time series charts
                flexWrap: 'wrap',
                // First check for explicit legend offset, then use transform as fallback
                offsetLeft: (legendConfig.offsetLeft !== undefined) ? legendConfig.offsetLeft : 
                    (config.transform && config.transform.includes('translate') ? 
                        parseInt(config.transform.match(/translate\((\d+)/)?.[1] || 100) : 100)
            };
            
            // Only add highlight handler if we have the update function
            if (updateChartHighlightingFn) {
                legendOptions.onHighlight = (highlightedItems) => {
                    // Update chart highlighting
                    updateChartHighlightingFn(
                        `#${containerId}-svg`, 
                        highlightedItems,
                        {
                            seriesSelector: '.animated-path, .data-bar',
                            pointSelector: '.data-point',
                            getSeriesName: (el) => el.getAttribute('data-series'),
                            dimOpacity: 0.15 // Make dimmed items very faint but still visible
                        }
                    );
                };
            }
            
            // Create the interactive legend with the row container
            const legendController = createInteractiveLegendFn(
                rowContainer,
                legendItems,
                legendOptions
            );
            
            // Store legend controller for potential later use
            window[`${containerId}LegendController`] = legendController;
        } 
        // Fallback to non-interactive legend if chartUtils not available
        else {
            // Get legend config if available
            const legendConfig = config.legendConfig || {};
            
            // First check for explicit legend offset setting
            let legendOffset;
            if (legendConfig.offsetLeft !== undefined) {
                legendOffset = legendConfig.offsetLeft;
            } 
            // Otherwise try to extract from transform
            else if (config.transform && config.transform.includes('translate')) {
                try {
                    const match = config.transform.match(/translate\((\d+)/);
                    if (match && match[1]) {
                        legendOffset = parseInt(match[1]);
                    }
                } catch (e) {
                    console.log('Could not parse transform for legend positioning');
                    legendOffset = 100; // Default fallback
                }
            } else {
                legendOffset = 100; // Default value if no transform found
            }
            
            // Apply the offset
            if (legendOffset !== undefined) {
                legendContainer.style.width = `calc(100% - ${legendOffset}px)`;
                legendContainer.style.marginLeft = `${legendOffset}px`;
                legendContainer.style.boxSizing = 'border-box';
            }
            
            // Group items into rows
            const itemsPerRow = (config.legendConfig && config.legendConfig.itemsPerRow) || 5;
            const rows = [];
            let currentRow = [];
            
            legendItems.forEach((item, i) => {
                // Add item to current row
                currentRow.push(item);
                
                // If we've reached max items or this is the last item, add the row
                if (currentRow.length === itemsPerRow || i === legendItems.length - 1) {
                    rows.push([...currentRow]);
                    currentRow = [];
                }
            });
            
            // Create HTML for each row of items
            rows.forEach(row => {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'legend-row';
                rowDiv.style.display = 'flex';
                // Use center for the row itself
                rowDiv.style.justifyContent = 'center';
                rowDiv.style.width = '100%';
                rowDiv.style.gap = '25px'; // Use same gap as interactive legend
                rowDiv.style.marginBottom = '12px'; // Use same margin as interactive legend
                
                row.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'legend-item';
                    itemDiv.style.display = 'flex';
                    itemDiv.style.alignItems = 'center';
                    itemDiv.style.justifyContent = 'flex-start';
                    itemDiv.style.textAlign = 'left';
                    
                    const colorSpan = document.createElement('span');
                    colorSpan.className = 'legend-color';
                    colorSpan.style.display = 'inline-block';
                    colorSpan.style.width = '10px';
                    colorSpan.style.height = '10px';
                    colorSpan.style.backgroundColor = item.color;
                    colorSpan.style.marginRight = '2px';
                    
                    const textSpan = document.createElement('span');
                    textSpan.className = 'legend-text';
                    textSpan.textContent = item.name;
                    
                    itemDiv.appendChild(colorSpan);
                    itemDiv.appendChild(textSpan);
                    rowDiv.appendChild(itemDiv);
                });
                
                rowContainer.appendChild(rowDiv);
            });
        }
    }
    
    /**
     * Applies the current style to a chart using the Style Manager
     * @param {string} containerId - ID of the container element
     */
    function applyChartStyle(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Use the Style Manager if available
        if (window.sparksStyleManager) {
            window.sparksStyleManager.applyStyleToChart(container);
            
            // After style is applied, check if we need to adjust chart positioning
            const svg = container.querySelector('svg');
            if (svg && svg.__chartMargins) {
                const activeStyle = window.sparksStyleManager.getActiveStyle();
                const styleConfig = window.sparksStyleManager.getStyleConfig(activeStyle);
                
                // If the style uses horizontal y-axis title, ensure chart is centered
                if (styleConfig && 
                    styleConfig.properties && 
                    styleConfig.properties.yAxis && 
                    styleConfig.properties.yAxis.titlePosition === 'horizontal') {
                    
                    // Adjust chart translation for proper centering, but only if needed
                    const chartArea = svg.querySelector('g');
                    if (chartArea) {
                        // Get current margins and calculate what they should be
                        const oldMargins = {...svg.__chartMargins};
                        const newMargins = calculateBalancedMargins();
                        
                        // Only update if margins actually need to change - prevents infinite adjustments
                        if (oldMargins.left !== newMargins.left || 
                            oldMargins.top !== newMargins.top) {
                            
                            // Apply the new calculated margins
                            svg.__chartMargins = newMargins;
                            
                            // Update chart area position
                            chartArea.setAttribute('transform', 
                                `translate(${svg.__chartMargins.left},${svg.__chartMargins.top})`);
                                
                            console.log(`Adjusting chart position for style ${activeStyle}. ` +
                                        `Left margin: ${oldMargins.left} → ${svg.__chartMargins.left}`);
                        }
                    }
                }
            }
        } 
        // Backward compatibility - use old styling approaches
        else if (window.useChartWizStyle && window.applyChartWizStyleToNewChart) {
            window.applyChartWizStyleToNewChart(container);
        } 
        // Fallback to basic styling
        else {
            applyBasicStyle(container);
        }
    }
    
    /**
     * Applies basic styling as a fallback when Style Manager is not available
     * @param {HTMLElement} container - The chart container element
     */
    function applyBasicStyle(container) {
        // Center the chart title
        const titleElement = container.querySelector('.chart-title');
        if (titleElement) {
            titleElement.style.textAlign = 'center';
            titleElement.style.fontWeight = 'bold';
            titleElement.style.marginBottom = '15px';
            titleElement.style.fontSize = '18px';
        }
        
        // Center the legend
        const legendElement = container.querySelector('.chart-legend');
        if (legendElement) {
            legendElement.style.display = 'flex';
            legendElement.style.justifyContent = 'center';
            legendElement.style.flexWrap = 'wrap';
            legendElement.style.marginTop = '15px';
        }
        
        // Style notes
        const notesElement = container.querySelector('.chart-notes');
        if (notesElement) {
            notesElement.style.textAlign = 'center';
            notesElement.style.fontSize = '12px';
            notesElement.style.color = 'var(--alt-text-color)';
            notesElement.style.marginTop = '10px';
        }
    }
    
    // Public API
    return {
        createChartContainer,
        createChartTooltip,
        createLegend,
        applyChartStyle,
        calculateBalancedMargins
    };
})();