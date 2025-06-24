/**
 * Sparks Tooltip Manager
 * Centralized management of chart tooltips, formatting, and styles
 */

window.sparksTooltipManager = (function() {
    // Default tooltip styles
    const defaultStyles = {
        boxHeight: 30,
        boxPadding: 20,
        minWidth: 100,
        backgroundColor: 'var(--background-color)',
        textColor: 'var(--text-color)',
        fontSize: '12px',
        fontFamily: 'monospace',
        borderRadius: 4,
        opacity: 0.9
    };
    
    // Add document visibility listener to hide tooltips when tab changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            hideAllTooltips();
        }
    });
    
    // Add listeners for tab changes and navigation to ensure tooltips are cleaned up
    window.addEventListener('beforeunload', hideAllTooltips);
    
    // Listen for hash changes and history state changes (for SPA navigation)
    window.addEventListener('hashchange', hideAllTooltips);
    window.addEventListener('popstate', hideAllTooltips);
    
    // The MutationObserver was too aggressive - removing it for now as it might
    // be removing tooltips immediately after they're created

    // Default tooltip format template
    const DEFAULT_TOOLTIP_FORMAT = "{seriesName}: {formattedValue} ({xValue})";

    /**
     * Formats a value for display in tooltips
     * Centralizes all tooltip formatting logic in one place
     * 
     * @param {number} value - The value to format
     * @param {Object} options - Formatting options
     * @param {string} options.type - The type of value ('currency', 'percentage', etc.)
     * @param {boolean} options.useSuffix - Whether to use abbreviated suffixes (K, M, B)
     * @param {string} options.prefix - Prefix to add before the value (e.g., '$')
     * @param {string} options.suffix - Suffix to add after the value (e.g., '%')
     * @param {number} options.decimals - Number of decimal places to show
     * @returns {string} Formatted value as string
     */
    function formatTooltipValue(value, options = {}) {
        // Default options
        const defaultOptions = {
            type: 'number',
            useSuffix: false,
            prefix: '',
            suffix: '',
            decimals: 1,
            includePrefix: true
        };
        
        // Merge options with defaults
        const settings = { ...defaultOptions, ...options };
        
        // Handle invalid values
        if (value === null || value === undefined || isNaN(value)) {
            return `${settings.includePrefix ? settings.prefix : ''}0${settings.suffix}`;
        }
        
        let formattedValue;
        
        // Format based on type
        if (settings.type === 'currency') {
            // Use formatUtils if available
            if (window.formatUtils && window.formatUtils.formatCurrency) {
                // For currency values, don't include the prefix here if we're adding it separately
                formattedValue = window.formatUtils.formatCurrency(value, {
                    useSuffix: settings.useSuffix,
                    includePrefix: settings.includePrefix, // Only include $ if explicitly requested
                    decimals: settings.decimals
                });
            } else {
                // Basic fallback formatting
                formattedValue = settings.useSuffix 
                    ? formatWithSuffix(value, settings.decimals)
                    : value.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: settings.decimals
                    });
                
                // Add prefix if requested
                if (settings.includePrefix && settings.prefix) {
                    formattedValue = settings.prefix + formattedValue;
                }
            }
        } else if (settings.type === 'percentage') {
            // Format as percentage
            if (window.formatUtils && window.formatUtils.formatPercent) {
                // If values are already percentages (e.g., 4.5 = 4.5%)
                if (settings.valuesArePercentages) {
                    formattedValue = `${value.toFixed(settings.decimals)}%`;
                } else {
                    // If values are decimal (e.g., 0.045 = 4.5%)
                    formattedValue = window.formatUtils.formatPercent(value, settings.decimals);
                }
            } else {
                // Basic fallback formatting for percentages
                if (settings.valuesArePercentages) {
                    formattedValue = `${value.toFixed(settings.decimals)}%`;
                } else {
                    formattedValue = `${(value * 100).toFixed(settings.decimals)}%`;
                }
            }
        } else {
            // Format as plain number
            if (window.formatUtils && window.formatUtils.formatWithCommas) {
                formattedValue = window.formatUtils.formatWithCommas(value, settings.decimals);
            } else {
                formattedValue = value.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: settings.decimals
                });
            }
            
            // Add prefix and suffix for plain numbers
            if (settings.prefix && settings.includePrefix) {
                formattedValue = settings.prefix + formattedValue;
            }
            
            if (settings.suffix) {
                formattedValue = formattedValue + settings.suffix;
            }
        }
        
        return formattedValue;
    }
    
    /**
     * Basic helper to format a number with K, M, B suffixes
     * Used as fallback when formatUtils is not available
     * 
     * @param {number} value - The value to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted value with suffix
     */
    function formatWithSuffix(value, decimals = 1) {
        const absValue = Math.abs(value);
        let suffix = '';
        let divisor = 1;
        
        if (absValue >= 1e12) {
            divisor = 1e12;
            suffix = 'T';
        } else if (absValue >= 1e9) {
            divisor = 1e9;
            suffix = 'B';
        } else if (absValue >= 1e6) {
            divisor = 1e6;
            suffix = 'M';
        } else if (absValue >= 1e3) {
            divisor = 1e3;
            suffix = 'K';
        }
        
        return (value / divisor).toFixed(decimals) + suffix;
    }
    
    /**
     * Creates a tooltip formatter function based on chart configuration
     * 
     * @param {Object} config - Chart configuration
     * @returns {Function} Tooltip formatter function
     */
    function createTooltipFormatter(config) {
        // Determine value type from chart config
        let valueType = 'number';
        let valuesArePercentages = false;
        let prefix = '';
        let suffix = '';
        let decimals = 1;
        
        // Use explicit formatter setting if provided
        if (config.formatter) {
            if (config.formatter === 'currency') {
                valueType = 'currency';
                prefix = '$';
            } else if (config.formatter === 'percentage') {
                valueType = 'percentage';
                suffix = '%';
            }
        }
        
        // Check percentage configuration
        if (config.percentageConfig && config.percentageConfig.valuesArePercentages) {
            valuesArePercentages = true;
        }
        
        // Check y-axis title for clues if no explicit formatter
        if (!config.formatter && config.yAxis && config.yAxis.title) {
            const axisTitle = config.yAxis.title.toLowerCase();
            
            if (axisTitle.includes('currency') || axisTitle.includes('value') || 
                axisTitle.includes('usd') || axisTitle.includes('$')) {
                valueType = 'currency';
                prefix = '$';
            } else if (axisTitle.includes('percent') || axisTitle.includes('share') || 
                    axisTitle.includes('rate') || axisTitle.includes('%')) {
                valueType = 'percentage';
                suffix = '%';
            }
        }
        
        // Return formatter function
        return function(value) {
            return formatTooltipValue(value, {
                type: valueType,
                useSuffix: true, // Use K/M/B for currency in tooltips
                prefix: prefix,
                suffix: suffix,
                decimals: decimals,
                valuesArePercentages: valuesArePercentages
            });
        };
    }
    
    /**
     * Processes a tooltip format template, replacing placeholders with actual values
     * 
     * @param {string} formatTemplate - The template string with placeholders
     * @param {Object} values - Object containing values to insert
     * @returns {string} The processed template with all placeholders replaced
     */
    function processTooltipTemplate(formatTemplate, values) {
        // If no template is provided, use the default
        const template = formatTemplate || DEFAULT_TOOLTIP_FORMAT;
        
        // Now using formattedValue directly in the tooltip template
        
        // Replace all placeholders with their corresponding values
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            // Return the value if it exists in the values object, otherwise keep the placeholder
            return values[key] !== undefined ? values[key] : match;
        });
    }
    
    /**
     * Gets the tooltip format template from chart configuration
     * 
     * @param {Object} config - Chart configuration
     * @returns {string|null} Tooltip format template or null if not found
     */
    function getTooltipFormat(config) {
        // Check for direct tooltipFormat property
        if (config.tooltipFormat) {
            return config.tooltipFormat;
        }
        
        // Check in chartConfig centralized configuration
        if (window.sparksChartConfigManager && config.chartType && config.metric) {
            const metricInfo = window.sparksChartConfigManager.getMetricInfo(
                config.chartType, 
                config.metric
            );
            
            if (metricInfo && metricInfo.tooltipFormat) {
                return metricInfo.tooltipFormat;
            }
        }
        
        // No specific format found, will use default
        return null;
    }
    
    /**
     * Determines the format information (prefix, suffix, etc.) based on configuration
     * 
     * @param {Object} config - Chart configuration
     * @param {*} yValue - The Y value to help determine formatting
     * @returns {Object} Format information object with type, prefix, suffix
     */
    function determineFormatInfo(config, yValue) {
        let formatInfo = {
            type: 'number',
            prefix: '',
            suffix: '',
            decimals: 1,
            valuesArePercentages: false
        };
        
        // Use explicit formatter setting if provided
        if (config.formatter) {
            if (config.formatter === 'currency') {
                formatInfo.type = 'currency';
                formatInfo.prefix = '$';
            } else if (config.formatter === 'percentage') {
                formatInfo.type = 'percentage';
                formatInfo.suffix = '%';
            }
        }
        
        // Check percentage configuration
        if (config.percentageConfig && config.percentageConfig.valuesArePercentages) {
            formatInfo.valuesArePercentages = true;
        }
        
        // Check y-axis title for clues if no explicit formatter
        if (!config.formatter && config.yAxis && config.yAxis.title) {
            const axisTitle = config.yAxis.title.toLowerCase();
            
            if (axisTitle.includes('currency') || axisTitle.includes('value') || 
                axisTitle.includes('usd') || axisTitle.includes('$')) {
                formatInfo.type = 'currency';
                formatInfo.prefix = '$';
            } else if (axisTitle.includes('percent') || axisTitle.includes('share') || 
                    axisTitle.includes('rate') || axisTitle.includes('%')) {
                formatInfo.type = 'percentage';
                formatInfo.suffix = '%';
            }
        }
        
        return formatInfo;
    }
    
    /**
     * Creates a standard tooltip for chart elements
     * Centralized implementation to ensure consistent styling and behavior
     * 
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
    function createTooltip(tooltipsContainer, x, y, width, height, xValue, yValue, seriesName, color, config) {
        // Make sure tooltipsContainer exists
        if (!tooltipsContainer || !tooltipsContainer.parentNode) {
            console.error('Tooltip container not properly initialized');
            return null;
        }
        
        // Create tooltip group
        const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "g");
        tooltip.setAttribute('class', 'chart-tooltip');
        tooltip.setAttribute('opacity', '0');
        tooltip.setAttribute('pointer-events', 'none');
        
        // Get formatting information
        const formatInfo = determineFormatInfo(config, yValue);
        
        // Format the value
        let formattedValue;
        
        // Use explicit tooltip formatter if provided
        if (config.tooltipFormatter && typeof config.tooltipFormatter === 'function') {
            formattedValue = config.tooltipFormatter(yValue);
        } else {
            // Create and use a formatter based on chart config
            const formatter = createTooltipFormatter(config);
            formattedValue = formatter(yValue);
        }
        
        // Get tooltip format template from config
        const tooltipFormat = getTooltipFormat(config);
        
        // Process the tooltip template with actual values
        const tooltipContent = processTooltipTemplate(tooltipFormat, {
            seriesName: seriesName,
            xValue: xValue,
            value: formattedValue.replace(/[\$%]/g, ''), // Clean value without prefix/suffix
            rawValue: yValue,
            formattedValue: formattedValue, // Complete formatted value
            formatPrefix: formatInfo.type === 'currency' ? '$' : formatInfo.prefix,
            formatSuffix: formatInfo.type === 'percentage' ? '%' : formatInfo.suffix,
            valueType: formatInfo.type
        });
        
        // Calculate tooltip dimensions
        const textWidth = Math.max(tooltipContent.length * 7, defaultStyles.minWidth);
        const boxWidth = textWidth + defaultStyles.boxPadding;
        const boxHeight = defaultStyles.boxHeight;
        
        // Create tooltip background
        const tooltipBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        tooltipBg.setAttribute('rx', defaultStyles.borderRadius);
        tooltipBg.setAttribute('ry', defaultStyles.borderRadius);
        tooltipBg.setAttribute('fill', defaultStyles.backgroundColor);
        tooltipBg.setAttribute('stroke', color);
        tooltipBg.setAttribute('stroke-width', 1);
        tooltipBg.setAttribute('opacity', defaultStyles.opacity);
        tooltipBg.setAttribute('height', boxHeight);
        tooltipBg.setAttribute('width', boxWidth);
        
        // Calculate tooltip position (centered above element)
        const containerWidth = tooltipsContainer.closest('svg').clientWidth;
        
        // Position tooltip above the element and centered
        let tooltipX = x + (width / 2) - (boxWidth / 2);
        let tooltipY = y - boxHeight - 10;
        
        // Adjust if tooltip would go off the right edge
        if (tooltipX + boxWidth > containerWidth - 90) {
            tooltipX = containerWidth - boxWidth - 90;
        }
        
        // Adjust if tooltip would go off the left edge
        if (tooltipX < 10) {
            tooltipX = 10;
        }
        
        // Set tooltip position
        tooltipBg.setAttribute('x', tooltipX);
        tooltipBg.setAttribute('y', tooltipY);
        
        // Create tooltip text
        const tooltipText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tooltipText.setAttribute('x', tooltipX + (boxWidth / 2));
        tooltipText.setAttribute('y', tooltipY + (boxHeight / 2));
        tooltipText.setAttribute('text-anchor', 'middle');
        tooltipText.setAttribute('dominant-baseline', 'middle');
        tooltipText.setAttribute('font-family', defaultStyles.fontFamily);
        tooltipText.setAttribute('font-size', defaultStyles.fontSize);
        tooltipText.setAttribute('fill', defaultStyles.textColor);
        tooltipText.textContent = tooltipContent;
        
        // Add tooltip elements
        tooltip.appendChild(tooltipBg);
        tooltip.appendChild(tooltipText);
        
        // Add tooltip to container
        tooltipsContainer.appendChild(tooltip);
        
        return tooltip;
    }
    
    /**
     * Creates an animated line tooltip with connection line
     * Used specifically for line chart data points
     * 
     * @param {Object} point - The data point {x, y} 
     * @param {Object} displayPoint - The display coordinates {x, y}
     * @param {string} seriesName - Name of the series
     * @param {string} color - Color for the tooltip
     * @param {SVGElement} tooltipsContainer - Container for tooltips
     * @param {number} chartWidth - Width of the chart area
     * @param {Object} config - Chart configuration or options
     * @returns {SVGElement} The tooltip element
     */
    function createLineTooltip(point, displayPoint, seriesName, color, tooltipsContainer, chartWidth, config = {}) {
        // Create tooltip group
        const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "g");
        tooltip.setAttribute('class', 'chart-tooltip');
        tooltip.setAttribute('opacity', '0');
        tooltip.setAttribute('pointer-events', 'none');
        
        // Get formatting information
        const formatInfo = determineFormatInfo(config, point.y);
        
        // Get the valueFormatter from config if available
        const valueFormatter = config.valueFormatter || config.tooltipFormatter;
        
        // Format the value
        let formattedValue;
        if (valueFormatter && typeof valueFormatter === 'function') {
            // Use provided formatter
            formattedValue = valueFormatter(point.y);
        } else {
            // Use tooltip formatting based on determined type
            formattedValue = formatTooltipValue(point.y, {
                type: formatInfo.type,
                useSuffix: true,
                prefix: formatInfo.prefix,
                suffix: formatInfo.suffix,
                decimals: formatInfo.decimals,
                valuesArePercentages: formatInfo.valuesArePercentages
            });
        }
        
        // Get tooltip format template from config
        const tooltipFormat = config.tooltipFormat || getTooltipFormat(config);
        
        // Process the tooltip template with actual values
        const tooltipContent = processTooltipTemplate(tooltipFormat, {
            seriesName: seriesName,
            xValue: point.x,
            value: formattedValue.replace(/[\$%]/g, ''), // Clean value without prefix/suffix
            rawValue: point.y,
            formattedValue: formattedValue, // Complete formatted value
            formatPrefix: formatInfo.type === 'currency' ? '$' : formatInfo.prefix,
            formatSuffix: formatInfo.suffix,
            valueType: formatInfo.type
        });
        
        // Calculate tooltip dimensions
        const textWidth = Math.max(tooltipContent.length * 7, defaultStyles.minWidth);
        const boxWidth = textWidth + defaultStyles.boxPadding;
        const boxHeight = defaultStyles.boxHeight;
        
        // Tooltip background
        const tooltipBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        tooltipBg.setAttribute('rx', defaultStyles.borderRadius);
        tooltipBg.setAttribute('ry', defaultStyles.borderRadius);
        tooltipBg.setAttribute('fill', defaultStyles.backgroundColor);
        tooltipBg.setAttribute('stroke', color);
        tooltipBg.setAttribute('stroke-width', 1);
        tooltipBg.setAttribute('opacity', defaultStyles.opacity);
        tooltipBg.setAttribute('height', boxHeight);
        
        // Position the tooltip
        const pointX = displayPoint.x;
        let tooltipX = pointX + 10;
        let lineX2 = tooltipX;
        
        // Calculate if right-positioned tooltip would overflow
        if (pointX + boxWidth + 10 > chartWidth) {
            // Would overflow right edge, position to the left
            tooltipX = pointX - boxWidth - 10;
            lineX2 = tooltipX + boxWidth;
        } else {
            // Default positioning to the right
            tooltipX = pointX + 10;
            lineX2 = tooltipX;
        }
        
        // Set tooltip background position and size
        tooltipBg.setAttribute('x', tooltipX);
        tooltipBg.setAttribute('width', boxWidth);
        
        // Calculate Y position for vertically centered tooltip
        const tooltipY = displayPoint.y - (boxHeight / 2) - 10; // Position above the point
        tooltipBg.setAttribute('y', tooltipY);
        
        // Tooltip text
        const tooltipText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tooltipText.setAttribute('x', tooltipX + (boxWidth / 2)); // Center horizontally
        tooltipText.setAttribute('y', tooltipY + (boxHeight / 2)); // Center vertically
        tooltipText.setAttribute('text-anchor', 'middle'); // Horizontal centering
        tooltipText.setAttribute('dominant-baseline', 'middle'); // Vertical centering
        tooltipText.setAttribute('font-family', defaultStyles.fontFamily);
        tooltipText.setAttribute('font-size', defaultStyles.fontSize);
        tooltipText.setAttribute('fill', defaultStyles.textColor);
        tooltipText.textContent = tooltipContent;
        
        // Connecting line
        const tooltipLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        tooltipLine.setAttribute('x1', displayPoint.x);
        tooltipLine.setAttribute('y1', displayPoint.y);
        tooltipLine.setAttribute('x2', lineX2);
        tooltipLine.setAttribute('y2', tooltipY + (boxHeight / 2)); // Connect to middle of tooltip
        tooltipLine.setAttribute('stroke', color);
        tooltipLine.setAttribute('stroke-width', 1);
        
        // Add tooltip elements
        tooltip.appendChild(tooltipBg);
        tooltip.appendChild(tooltipLine);
        tooltip.appendChild(tooltipText);
        
        // Add tooltip to container
        tooltipsContainer.appendChild(tooltip);
        
        return tooltip;
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
     * Creates a DOM-based tooltip (especially for treemaps and complex visualizations)
     * This creates a div-based tooltip that floats over the visualization
     * with styling consistent with the standard SVG tooltips
     * 
     * @returns {Object} Tooltip API with show/hide/destroy methods
     */
    function createDOMTooltip(chartContainer = null) {
        // Create a tooltip div outside the SVG
        const tooltip = document.createElement('div');
        tooltip.className = 'sparks-dom-tooltip';
        
        // Apply consistent styling with the SVG tooltips
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = defaultStyles.backgroundColor;
        tooltip.style.color = defaultStyles.textColor;
        tooltip.style.padding = `${defaultStyles.boxPadding / 2}px`;
        tooltip.style.borderRadius = `${defaultStyles.borderRadius}px`;
        tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.25)';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.2s ease';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = '9999';
        tooltip.style.minWidth = '100px';
        tooltip.style.maxWidth = '250px';
        tooltip.style.visibility = 'hidden';
        tooltip.style.border = '1px solid var(--borderColor)';
        
        // Create or get global tooltip registry
        if (!window._sparksTooltipRegistry) {
            window._sparksTooltipRegistry = [];
        }
        
        // Add to tooltip registry for global tracking
        window._sparksTooltipRegistry.push(tooltip);
        
        // Store the associated chart container for reference during cleanup
        tooltip._associatedContainer = chartContainer;
        
        // Only append to the chart container, never to body
        if (chartContainer) {
            // Position relative to the container
            tooltip.style.position = 'absolute';
            chartContainer.appendChild(tooltip);
            //console.log("Tooltip added to chart container");
        } else {
            // Don't create tooltip if no container provided
            console.warn("No container provided for tooltip - tooltip creation skipped");
            // Return a dummy tooltip API that does nothing
            return {
                showTooltip: function() {},
                hideTooltip: function() {},
                destroy: function() {},
                _getTooltipElement: function() { return null; }
            };
        }
        
        return {
            // Track current element (mostly for cleanup)
            _currentElement: null,
            
            showTooltip: function(content, event) {
                // Get the target element
                const targetElement = event.target;
                
                // Make sure we still have a valid parent container
                if (!tooltip.parentNode) {
                    console.warn("Tooltip was detached from container. Re-attaching...");
                    // Try to re-attach to the associated container if available
                    if (tooltip._associatedContainer) {
                        tooltip._associatedContainer.appendChild(tooltip);
                    } else {
                        console.error("Cannot re-attach tooltip - no associated container");
                        return; // Skip showing tooltip
                    }
                }
                
                // Update content in all cases
                tooltip.innerHTML = content;
                
                // Always reposition the tooltip with the cursor
                // We don't use lastElement check here because we want it to track
                
                // Store current element just for cleanup tracking
                this._currentElement = targetElement;
                
                // Hide the tooltip initially while we calculate position
                tooltip.style.visibility = 'hidden';
                tooltip.style.opacity = '0';
                
                // Find the chart container to get center point
                // Use the container that the tooltip is attached to
                const chartContainer = tooltip.parentNode;
                if (!chartContainer) {
                    console.warn("Tooltip has no parent container - positioning skipped");
                    return;
                }
                
                // Measure tooltip dimensions off-screen first
                tooltip.style.left = '-9999px';
                tooltip.style.top = '-9999px';
                tooltip.style.visibility = 'visible';
                tooltip.style.opacity = '0';
                
                // Force layout calculation
                let tooltipWidth = tooltip.offsetWidth;
                let tooltipHeight = tooltip.offsetHeight;
                
                // Calculate position relative to container
                const parentRect = chartContainer.getBoundingClientRect();
                const relX = event.pageX - (parentRect.left + window.scrollX) + 5;
                const relY = event.pageY - (parentRect.top + window.scrollY) + 5;
                
                // Ensure tooltip stays within container bounds
                const chartWidth = parentRect.width;
                const chartHeight = parentRect.height;
                
                // Adjust if tooltip would extend beyond container
                let posX = relX;
                let posY = relY;
                
                if (relX + tooltipWidth > chartWidth - 5) {
                    posX = Math.max(5, relX - tooltipWidth - 10);
                }
                
                if (relY + tooltipHeight > chartHeight - 5) {
                    posY = Math.max(5, relY - tooltipHeight - 10);
                }
                
                tooltip.style.left = posX + 'px';
                tooltip.style.top = posY + 'px';
                tooltip.style.opacity = defaultStyles.opacity;
                
                // Get chart center coordinates
                const chartRect = chartContainer.getBoundingClientRect();
                const centerX = chartRect.left + (chartRect.width / 2);
                const centerY = chartRect.top + (chartRect.height / 2);
                
                // Determine which quadrant we're in
                const isWestHalf = event.clientX < centerX;
                const isNorthHalf = event.clientY < centerY;
                
                // First place the tooltip off-screen but with full width to measure
                tooltip.style.left = '-9999px';
                tooltip.style.top = '-9999px';
                tooltip.style.visibility = 'visible';
                tooltip.style.opacity = '0';
                
                // Force browser to render and calculate dimensions - reuse existing variables
                tooltipWidth = tooltip.offsetWidth;
                tooltipHeight = tooltip.offsetHeight;
                
                // Minimal offset from cursor for tight cursor following
                const offset = 5;
                
                // Calculate position relative to container instead of using page coordinates
                // This matches the successful approach in treemapFinal.js fallback
                const offsetX = event.pageX - (parentRect.left + window.scrollX);
                const offsetY = event.pageY - (parentRect.top + window.scrollY);
                
                // Add small offset for tooltip to not cover cursor
                let relativeX = offsetX + offset; 
                let relativeY = offsetY + offset;
                
                // Adjust position to stay within container
                if (relativeX + tooltipWidth > chartWidth - 10) {
                    relativeX = Math.max(5, offsetX - tooltipWidth - 10); // Position left of cursor, but within container
                }
                
                if (relativeY + tooltipHeight > chartHeight - 10) {
                    relativeY = Math.max(5, offsetY - tooltipHeight - 10); // Position above cursor, but within container
                }
                
                // Set final position (relative to container)
                let finalX = relativeX;
                let finalY = relativeY;
                
                // Now set the final position and make visible
                tooltip.style.left = finalX + 'px';
                tooltip.style.top = finalY + 'px';
                tooltip.style.opacity = defaultStyles.opacity;
                
                // Helper function to find the closest chart container
                function findNearestChartContainer(element) {
                    // Maximum levels to traverse up
                    const MAX_LEVELS = 10;
                    let currentElement = element;
                    let level = 0;
                    
                    // Look for chart container classes
                    while (currentElement && level < MAX_LEVELS) {
                        // Check for common chart container classes
                        if (currentElement.classList && 
                            (currentElement.classList.contains('chart-visualization') ||
                             currentElement.classList.contains('tariff-chart-container') ||
                             currentElement.classList.contains('chart-container') ||
                             currentElement.tagName === 'svg')) {
                            return currentElement;
                        }
                        
                        // Move up to parent
                        currentElement = currentElement.parentElement;
                        level++;
                    }
                    
                    // IMPORTANT: Don't return document.body - return null instead to prevent tooltips from being attached to body
                    return null;
                }
            },
            
            hideTooltip: function() {
                tooltip.style.opacity = '0';
                tooltip.style.visibility = 'hidden';
                this._currentElement = null; // Reset tracking
            },
            
            destroy: function() {
                // Check if tooltip is in document.body (most likely) or another parent
                if (tooltip.parentNode === document.body) {
                    document.body.removeChild(tooltip);
                    //console.log("tooltip destroyed from document.body");
                } else if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                    //console.log("tooltip destroyed from other container");
                }
                
                // Clear any references or event listeners
                tooltip.innerHTML = '';
                tooltip.style.opacity = '0';
                tooltip.style.visibility = 'hidden';
                
                // Remove from global registry if it exists
                if (window._sparksTooltipRegistry) {
                    const index = window._sparksTooltipRegistry.indexOf(tooltip);
                    if (index !== -1) {
                        window._sparksTooltipRegistry.splice(index, 1);
                    }
                }
                
                // Clear associated container reference
                tooltip._associatedContainer = null;
            },
            
            // Provide access to the tooltip element for styling
            _getTooltipElement: function() {
                return tooltip;
            }
        };
    }

    /**
     * Hide all tooltips in the document
     * This can be called when changing views or navigating away
     */
    function hideAllTooltips() {
        // Handle the global tooltip registry first (most reliable)
        if (window._sparksTooltipRegistry && window._sparksTooltipRegistry.length > 0) {
            //console.log(`Removing ${window._sparksTooltipRegistry.length} tooltips from registry`);
            
            // Create a copy of the array since we'll be modifying it during iteration
            const tooltipsToRemove = [...window._sparksTooltipRegistry];
            
            tooltipsToRemove.forEach(tooltip => {
                if (tooltip && tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            });
            
            // Clear the registry
            window._sparksTooltipRegistry = [];
        }
        
        // Handle any DOM-based tooltips that might not be in the registry
        document.querySelectorAll('.sparks-dom-tooltip, .treemap-tooltip').forEach(tooltip => {
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
            
            // Try to remove from DOM if possible
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
        
        // Hide all SVG tooltips
        document.querySelectorAll('.chart-tooltip').forEach(tooltip => {
            tooltip.setAttribute('opacity', '0');
        });
        
        // Handle legacy treemap tooltips tracking
        if (window._treemapTooltips && window._treemapTooltips.length > 0) {
            window._treemapTooltips.forEach(tooltip => {
                if (tooltip && tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            });
            window._treemapTooltips = [];
        }
        
        //console.log("All tooltips hidden and removed");
    }
    
    // Public API
    return {
        formatTooltipValue,
        createTooltipFormatter,
        createTooltip,
        createLineTooltip,
        createTooltipContainer,
        processTooltipTemplate,
        createDOMTooltip,  // Add the new DOM-based tooltip creator
        hideAllTooltips    // Add method to hide all tooltips
    };
})();