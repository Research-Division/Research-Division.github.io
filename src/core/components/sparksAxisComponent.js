/**
 * Sparks Axis Component
 * Core component for calculating ranges, creating scales, and drawing axes for charts
 */

window.sparksAxisComponent = (function() {
    /**
     * Find min/max values for axes based on data
     * @param {Object} config - Chart configuration with series data
     * @return {Object} Min/max values for x and y axes
     */
    function calculateAxisRanges(config) {
        let xMin = Infinity;
        let xMax = -Infinity;
        let yMin = config.yAxis.min !== undefined ? config.yAxis.min : Infinity;
        let yMax = config.yAxis.max !== undefined ? config.yAxis.max : -Infinity;
        
        config.series.forEach(series => {
            series.data.forEach(point => {
                if (point.x < xMin) xMin = point.x;
                if (point.x > xMax) xMax = point.x;
                if (point.y < yMin && point.y !== null && point.y !== undefined) yMin = point.y;
                if (point.y > yMax && point.y !== null && point.y !== undefined) yMax = point.y;
            });
        });
        
        // Add padding to y-axis max for better visualization
        if (config.yAxis.max === undefined) {
            yMax = yMax * 1.1;
        }
        
        // Set min value to 0 if not explicitly set but close to zero
        if (config.yAxis.min === undefined && yMin > -0.1 * yMax) {
            yMin = 0;
        }
        
        return { xMin, xMax, yMin, yMax };
    }
    
    /**
     * Creates scale functions for x and y axes
     * @param {number} width - Chart width
     * @param {number} height - Chart height
     * @param {Object} ranges - Min/max values for axes
     * @param {Object} config - Chart configuration
     * @return {Object} Scale functions
     */
    function createScales(width, height, ranges, config) {
        const { xMin, xMax, yMin, yMax } = ranges;
        
        // Create different scale functions based on data type
        let xScale;
        
        // Check if x-axis is using string/categorical values
        if (config && config.xAxis && config.xAxis.type === 'string') {
            // For categorical data, need to create a mapping from values to positions
            let xValues = [];
            
            // Collect all unique x values from all series
            if (config.series) {
                config.series.forEach(series => {
                    if (series.data) {
                        series.data.forEach(point => {
                            if (!xValues.includes(point.x)) {
                                xValues.push(point.x);
                            }
                        });
                    }
                });
            }
            
            // Sort values or use provided order
            if (config.rawSectorOrder) {
                // Use the exact sector order provided
                xValues = [...config.rawSectorOrder];
            } else if (!config.preserveXOrder) {
                // Sort alphabetically if not using preserved order
                xValues.sort();
            }
            
            // Create mapping function
            xScale = x => {
                // Get the index of the value
                const index = xValues.indexOf(x);
                if (index === -1) return 0; // Return 0 if value not found
                
                // Calculate position based on index
                return width * (index / (xValues.length - 1 || 1));
            };
            
            // Store the mapping for later use
            const svg = document.querySelector(`#${config.containerId}-svg`);
            if (svg) {
                svg.dataset.xValues = JSON.stringify(xValues);
            }
        } else {
            // For numeric x values
            xScale = x => width * (x - xMin) / (xMax - xMin);
        }
        
        // Y scale is always numeric
        const yScale = y => height - (height * (y - yMin) / (yMax - yMin));
        
        return { xScale, yScale };
    }
    
    /**
     * Formats a y-axis label value using chart configuration
     * @param {number} value - The value to format
     * @param {Object} config - Chart configuration
     * @returns {string} Formatted label text
     */
    function formatYAxisLabel(value, config) {
        let labelText;
        
        // Check if formatUtils is available
        if (!window.formatUtils) {
            // Simple fallback if formatUtils is not available
            return value.toFixed(1);
        }
        
        // Special handling for trade_deficit metric which can have negative values
        // Format negative values as -$Value instead of $-Value
        if (config.metric === 'trade_deficit' && value < 0) {
            const absValue = Math.abs(value);
            const formattedAbs = window.formatUtils.formatCurrency(absValue, { 
                useSuffix: true, 
                includePrefix: true
            });
            return '-' + formattedAbs; // Correctly format negative values as -$Value
        }
        
        // Check if we have a formatter defined in the chart config
        let formatterName = null;
        if (config.formatter) {
            formatterName = config.formatter;
        } else if (config.metric && window.chartConfig?.chartTypes?.[config.chartType]?.metrics?.[config.metric]) {
            // Get formatter from metrics configuration
            formatterName = window.chartConfig.chartTypes[config.chartType].metrics[config.metric].formatter;
        }
        
        // If we have a valid formatter name and chartConfig.formatters exists
        if (formatterName && window.chartConfig?.formatters?.[formatterName]) {
            const formatterConfig = window.chartConfig.formatters[formatterName];
            
            // For y-axis labels, we want to use abbreviated formatting with currency symbol
            if (formatterConfig.function === 'formatCurrency') {
                // Use the prefix from formatterConfig for currency
                labelText = window.formatUtils.formatCurrency(value, { 
                    useSuffix: true, 
                    includePrefix: !!formatterConfig.prefix
                });
                
                // Only add prefix if it's defined and not already included
                if (formatterConfig.prefix && !labelText.startsWith(formatterConfig.prefix)) {
                    labelText = formatterConfig.prefix + labelText;
                }
            } else if (formatterConfig.function === 'formatNumber') {
                // Handle percentage and other number formats
                const valueText = value.toFixed(formatterConfig.decimals || 0);
                labelText = `${formatterConfig.prefix || ''}${valueText}${formatterConfig.suffix || ''}`;
            }
            
            return labelText;
        }
        
        // Fall back to default formatting if formatter wasn't found or applied
        const axisTitle = config.yAxis.title.toLowerCase();
        if (axisTitle.includes('balance') || // Added "balance" to catch trade balance specifically
           axisTitle.includes('currency') || axisTitle.includes('value') || 
           axisTitle.includes('usd') || axisTitle.includes('$')) {
            // Currency formatting
            // Handle negative values for trade balance
            if (value < 0 && axisTitle.includes('balance')) {
                const absValue = Math.abs(value);
                return '-' + window.formatUtils.formatCurrency(absValue, { useSuffix: true, decimals: 1 });
            } else {
                return window.formatUtils.formatCurrency(value, { useSuffix: true, decimals: 1 });
            }
        } else if (axisTitle.includes('percent') || axisTitle.includes('share') || 
                   axisTitle.includes('rate') || axisTitle.includes('%')) {
            // Percentage formatting
            // Special case for zero to avoid scientific notation
            if (value === 0) {
                return '0%';
            } else {
                // Check if percentage values are already in percentage form (config option)
                const valuesArePercentages = config.percentageConfig && config.percentageConfig.valuesArePercentages;
                
                if (valuesArePercentages) {
                    // Values are already in percentage form (4.5 = 4.5%)
                    return value.toFixed(1) + '%';
                } else {
                    // Values are in decimal form (0.045 = 4.5%)
                    return window.formatUtils.formatPercent(value, 1);
                }
            }
        } else {
            // General number formatting
            // Special case for zero to avoid scientific notation
            if (value === 0) {
                return '0';
            } else {
                return window.formatUtils.formatLargeNumber(value);
            }
        }
    }
    
    /**
     * Draws axes and grid lines
     * @param {SVGElement} chartArea - Chart SVG group element
     * @param {number} width - Chart width
     * @param {number} height - Chart height
     * @param {Object} ranges - Min/max values for axes
     * @param {Object} scales - Scale functions
     * @param {Object} config - Chart configuration
     */
    function drawAxes(chartArea, width, height, ranges, scales, config) {
        const { xMin, xMax, yMin, yMax } = ranges;
        const { xScale, yScale } = scales;
        
        // Draw x-axis
        const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
        xAxis.setAttribute('x1', 0);
        xAxis.setAttribute('y1', height);
        xAxis.setAttribute('x2', width);
        xAxis.setAttribute('y2', height);
        xAxis.setAttribute('stroke', 'var(--text-color)');
        xAxis.setAttribute('stroke-width', 2);
        chartArea.appendChild(xAxis);
        
        // Draw y-axis
        const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
        yAxis.setAttribute('x1', 0);
        yAxis.setAttribute('y1', 0);
        yAxis.setAttribute('x2', 0);
        yAxis.setAttribute('y2', height);
        yAxis.setAttribute('stroke', 'var(--text-color)');
        yAxis.setAttribute('stroke-width', 2);
        chartArea.appendChild(yAxis);
        
        // X-axis ticks and labels
        if (config.xAxis.type === 'string') {
            // For categorical/string x-axis
            
            // Get unique x values from all series
            let xValues = [];
            
            // Collect all unique x values from config
            config.series.forEach(series => {
                series.data.forEach(point => {
                    if (!xValues.includes(point.x)) {
                        xValues.push(point.x);
                    }
                });
            });
            
            // Sort values alphabetically
            xValues.sort();
            
            // Draw tick and label for each value
            xValues.forEach((value, index) => {
                // Calculate position - include special case for only one value
                const x = xValues.length === 1 ? width / 2 : width * (index / (xValues.length - 1));
                
                // Draw tick
                const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
                tick.setAttribute('x1', x);
                tick.setAttribute('y1', height);
                tick.setAttribute('x2', x);
                tick.setAttribute('y2', height + 6);
                tick.setAttribute('stroke', 'var(--text-color)');
                tick.setAttribute('stroke-width', 1);
                chartArea.appendChild(tick);
                
                // Draw label
                const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                label.setAttribute('x', x);
                label.setAttribute('y', height + 20);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('font-family', 'monospace');
                label.setAttribute('font-size', window.isMobileVersion ? '8px' : '12px');
                label.setAttribute('fill', 'var(--text-color)');
                
                // Truncate long text
                let labelText = value;
                if (labelText.length > 10) {
                    labelText = labelText.substr(0, 7) + '...';
                }
                
                label.textContent = labelText;
                
                // Rotate labels if there are many or on mobile
                if (xValues.length > 8 || (window.isMobileVersion && xValues.length > 4)) {
                    const rotationAngle = window.isMobileVersion ? -45 : -35;
                    label.setAttribute('transform', `rotate(${rotationAngle}, ${x}, ${height + 20})`);
                    label.setAttribute('text-anchor', 'end');
                    if (window.isMobileVersion) {
                        label.setAttribute('y', height + 15);  // Adjust y position for rotation on mobile
                    }
                }
                
                chartArea.appendChild(label);
                
                // Add vertical grid line
                const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                gridLine.setAttribute('x1', x);
                gridLine.setAttribute('y1', 0);
                gridLine.setAttribute('x2', x);
                gridLine.setAttribute('y2', height);
                gridLine.setAttribute('stroke', 'var(--text-color)');
                gridLine.setAttribute('stroke-opacity', '0.1');
                gridLine.setAttribute('stroke-width', 0.5);
                gridLine.setAttribute('stroke-dasharray', '4,4');
                chartArea.appendChild(gridLine);
            });
        } else {
            // For numeric x-axis
                        
            // Get unique x values from all series for alignment
            let xValues = [];
            
            // Collect all unique x values from all series
            if (config.series) {
                config.series.forEach(series => {
                    if (series.data) {
                        series.data.forEach(point => {
                            if (!xValues.includes(point.x)) {
                                xValues.push(point.x);
                            }
                        });
                    }
                });
            }
            
            // Sort x values numerically
            xValues.sort((a, b) => a - b);
            
            // Determine which x values to use as ticks
            let tickValues;
            
            // If we have too many data points, we need to select a reasonable number
            const maxTicks = 10;
            if (xValues.length <= maxTicks) {
                // Use all data points if we have a reasonable number
                tickValues = xValues;
            } else {
                // Select evenly distributed ticks from the data points
                const step = Math.max(1, Math.floor(xValues.length / maxTicks));
                tickValues = [];
                for (let i = 0; i < xValues.length; i += step) {
                    tickValues.push(xValues[i]);
                }
                // Always include the last value for better range representation
                if (!tickValues.includes(xValues[xValues.length - 1])) {
                    tickValues.push(xValues[xValues.length - 1]);
                }
            }
            
            // Create ticks for each selected value
            tickValues.forEach(value => {
                const x = xScale(value);
                
                // Draw tick
                const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
                tick.setAttribute('x1', x);
                tick.setAttribute('y1', height);
                tick.setAttribute('x2', x);
                tick.setAttribute('y2', height + 6);
                tick.setAttribute('stroke', 'var(--text-color)');
                tick.setAttribute('stroke-width', 1);
                chartArea.appendChild(tick);
                
                // Format label
                const labelText = Math.round(value).toString();
                
                // Draw label
                const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                label.setAttribute('x', x);
                label.setAttribute('y', height + 20);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('font-family', 'monospace');
                label.setAttribute('font-size', window.isMobileVersion ? '8px' : '12px');
                label.setAttribute('fill', 'var(--text-color)');
                label.textContent = labelText;
                
                // On mobile, rotate year labels if they are 4-digit years
                if (window.isMobileVersion && labelText.match(/^\d{4}$/)) {
                    label.setAttribute('transform', `rotate(-45, ${x}, ${height + 20})`);
                    label.setAttribute('text-anchor', 'end');
                    label.setAttribute('y', height + 15);  // Adjust y position for rotation
                }
                
                chartArea.appendChild(label);
                
                // Add vertical grid line
                const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                gridLine.setAttribute('x1', x);
                gridLine.setAttribute('y1', 0);
                gridLine.setAttribute('x2', x);
                gridLine.setAttribute('y2', height);
                gridLine.setAttribute('stroke', 'var(--text-color)');
                gridLine.setAttribute('stroke-opacity', '0.1');
                gridLine.setAttribute('stroke-width', 0.5);
                gridLine.setAttribute('stroke-dasharray', '4,4');
                chartArea.appendChild(gridLine);
            });
        }
        
        // Y-axis ticks and labels
        const yIsNumber = config.yAxis.type === 'number';
        const numTicks = 5;
        const valueStep = (yMax - yMin) / numTicks;
        
        for (let i = 0; i <= numTicks; i++) {
            const value = yMin + i * valueStep;
            const y = yScale(value);
            
            // Draw tick
            const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
            tick.setAttribute('x1', -6);
            tick.setAttribute('y1', y);
            tick.setAttribute('x2', 0);
            tick.setAttribute('y2', y);
            tick.setAttribute('stroke', 'var(--text-color)');
            tick.setAttribute('stroke-width', 1);
            chartArea.appendChild(tick);
            
            // Format label based on data type and axis title
            let labelText;
            if (yIsNumber) {
                // Use the shared formatting function
                labelText = formatYAxisLabel(value, config);
            } else {
                labelText = value.toString();
            }
            
            // Draw label
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute('x', -10);
            label.setAttribute('y', y + 4);
            label.setAttribute('text-anchor', 'end');
            label.setAttribute('font-family', 'monospace');
            label.setAttribute('font-size', window.isMobileVersion ? '8px' : '12px');
            label.setAttribute('fill', 'var(--text-color)');
            label.textContent = labelText;
            chartArea.appendChild(label);
            
            // Add horizontal grid line
            const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            gridLine.setAttribute('x1', 0);
            gridLine.setAttribute('y1', y);
            gridLine.setAttribute('x2', width);
            gridLine.setAttribute('y2', y);
            gridLine.setAttribute('stroke', 'var(--text-color)');
            gridLine.setAttribute('stroke-opacity', '0.1');
            gridLine.setAttribute('stroke-width', 0.5);
            gridLine.setAttribute('stroke-dasharray', '4,4');
            chartArea.appendChild(gridLine);
        }
        
        // Y-axis title
        const yAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
        yAxisTitle.setAttribute('transform', `translate(-70, ${height / 2}) rotate(-90)`);
        yAxisTitle.setAttribute('text-anchor', 'middle');
        yAxisTitle.setAttribute('font-family', 'monospace');
        yAxisTitle.setAttribute('font-size', '14px');
        yAxisTitle.setAttribute('fill', 'var(--text-color)');
        yAxisTitle.textContent = config.yAxis.title;
        chartArea.appendChild(yAxisTitle);
        
        // X-axis title - hide on mobile if it's "Year"
        if (!window.isMobileVersion || config.xAxis.title !== 'Year') {
            const xAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
            xAxisTitle.setAttribute('x', width / 2);
            xAxisTitle.setAttribute('y', height + 40);
            xAxisTitle.setAttribute('text-anchor', 'middle');
            xAxisTitle.setAttribute('font-family', 'monospace');
            xAxisTitle.setAttribute('font-size', '14px');
            xAxisTitle.setAttribute('fill', 'var(--text-color)');
            xAxisTitle.textContent = config.xAxis.title;
            chartArea.appendChild(xAxisTitle);
        }
    }
    
    /**
     * Draws axes specifically for bar charts with categorical data
     * @param {SVGElement} chartArea - Chart SVG group element
     * @param {number} width - Chart width
     * @param {number} height - Chart height
     * @param {Object} ranges - Min/max values for axes
     * @param {Object} scales - Scale functions
     * @param {Object} config - Chart configuration
     */
    function drawCategoricalAxes(chartArea, width, height, ranges, scales, config) {
        const { xMin, xMax, yMin, yMax } = ranges;
        const { xScale, yScale } = scales;
        
        // Draw y-axis
        const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
        yAxis.setAttribute('x1', 0);
        yAxis.setAttribute('y1', 0);
        yAxis.setAttribute('x2', 0);
        yAxis.setAttribute('y2', height);
        yAxis.setAttribute('stroke', 'var(--text-color)');
        yAxis.setAttribute('stroke-width', 2);
        chartArea.appendChild(yAxis);
        
        // X-axis for categorical data
        let xValues = [];
        
        // Handle case where dataset might not be set yet
        try {
            const svg = chartArea.closest('svg');
            if (svg && svg.dataset && svg.dataset.xValues) {
                xValues = JSON.parse(svg.dataset.xValues);
            } else {
                // Collect all unique x values from all series if not in dataset
                config.series.forEach(series => {
                    series.data.forEach(point => {
                        if (!xValues.includes(point.x)) {
                            xValues.push(point.x);
                        }
                    });
                });
                // Handle category ordering - check for preserved ordering or raw sector order
                if (config.rawSectorOrder) {
                    // Use the exact ordered categories provided
                    xValues = [...config.rawSectorOrder];
                } else if (!config.preserveXOrder) {
                    // Sort alphabetically only if preserveXOrder flag is not set
                    xValues.sort();
                } else {
                }
            }
        } catch (e) {
            console.error('Error parsing xValues:', e);
            
            // Fallback - collect from series data
            xValues = [];
            config.series.forEach(series => {
                series.data.forEach(point => {
                    if (!xValues.includes(point.x)) {
                        xValues.push(point.x);
                    }
                });
            });
            // Use rawSectorOrder if available, or respect preserveXOrder flag in fallback case
            if (config.rawSectorOrder) {
                xValues = [...config.rawSectorOrder];
            } else if (!config.preserveXOrder) {
                xValues.sort();
            }
        }
        
        xValues.forEach((value, index) => {
            const x = (width * (index + 0.5)) / xValues.length;
            
            // Draw tick mark for x-axis
            const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
            tick.setAttribute('x1', x);
            tick.setAttribute('y1', height);
            tick.setAttribute('x2', x);
            tick.setAttribute('y2', height + 6);
            tick.setAttribute('stroke', 'var(--text-color)');
            tick.setAttribute('stroke-width', 1);
            tick.setAttribute('class', 'x-axis-tick'); // Add class for styling
            chartArea.appendChild(tick);
            
            // Draw label
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute('x', x);
            label.setAttribute('y', height + 25);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('font-family', 'monospace');
            label.setAttribute('font-size', window.isMobileVersion ? '8px' : '12px');
            label.setAttribute('fill', 'var(--text-color)');
            label.setAttribute('class', 'tick-label tick-label-x'); // Add classes for styling
            
            // Store original full text before truncating
            const originalText = value;
            
            // Truncate long text without storing the original
            let labelText = originalText;
            const maxLength = window.isMobileVersion ? 10 : 14;
            if (labelText.length > maxLength) {
                labelText = labelText.substring(0, maxLength - 3) + '...';
            }
            
            label.textContent = labelText;
            
            // Rotate labels if there are many categories or on mobile
            if (xValues.length > 8 || (window.isMobileVersion && xValues.length > 4)) {
                const rotationAngle = window.isMobileVersion ? -45 : -35;
                const yOffset = window.isMobileVersion ? 15 : 10;
                label.setAttribute('transform', `rotate(${rotationAngle}, ${x}, ${height + yOffset})`);
                label.setAttribute('y', height + 20);
                label.setAttribute('text-anchor', 'end');
            }
            
            chartArea.appendChild(label);
            
            // Add vertical grid line
            const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            gridLine.setAttribute('x1', x);
            gridLine.setAttribute('y1', 0);
            gridLine.setAttribute('x2', x);
            gridLine.setAttribute('y2', height);
            gridLine.setAttribute('stroke', 'var(--text-color)');
            gridLine.setAttribute('stroke-opacity', '0.1');
            gridLine.setAttribute('stroke-width', 0.5);
            gridLine.setAttribute('stroke-dasharray', '4,4');
            chartArea.appendChild(gridLine);
        });
        
        // Y-axis ticks and labels
        const yIsNumber = config.yAxis.type === 'number';
        const numTicks = 5;
        const valueStep = (yMax - yMin) / numTicks;
        
        for (let i = 0; i <= numTicks; i++) {
            const value = yMin + i * valueStep;
            const y = yScale(value);
            
            // Draw tick
            const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
            tick.setAttribute('x1', -6);
            tick.setAttribute('y1', y);
            tick.setAttribute('x2', 0);
            tick.setAttribute('y2', y);
            tick.setAttribute('stroke', 'var(--text-color)');
            tick.setAttribute('stroke-width', 1);
            chartArea.appendChild(tick);
            
            // Format label based on data type and axis title
            let labelText;
            if (yIsNumber) {
                // Use the shared formatting function
                labelText = formatYAxisLabel(value, config);
            } else {
                labelText = value.toString();
            }
            
            // Draw label
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute('x', -10);
            label.setAttribute('y', y + 4);
            label.setAttribute('text-anchor', 'end');
            label.setAttribute('font-family', 'monospace');
            label.setAttribute('font-size', window.isMobileVersion ? '8px' : '12px');
            label.setAttribute('fill', 'var(--text-color)');
            label.textContent = labelText;
            chartArea.appendChild(label);
            
            // Add horizontal grid line
            const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            gridLine.setAttribute('x1', 0);
            gridLine.setAttribute('y1', y);
            gridLine.setAttribute('x2', width);
            gridLine.setAttribute('y2', y);
            gridLine.setAttribute('stroke', 'var(--text-color)');
            gridLine.setAttribute('stroke-opacity', '0.1');
            gridLine.setAttribute('stroke-width', 0.5);
            gridLine.setAttribute('stroke-dasharray', '4,4');
            chartArea.appendChild(gridLine);
        }
        
        // Y-axis title
        const yAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
        yAxisTitle.setAttribute('transform', `translate(-70, ${height / 2}) rotate(-90)`);
        yAxisTitle.setAttribute('text-anchor', 'middle');
        yAxisTitle.setAttribute('font-family', 'monospace');
        yAxisTitle.setAttribute('font-size', '14px');
        yAxisTitle.setAttribute('fill', 'var(--text-color)');
        yAxisTitle.textContent = config.yAxis.title;
        chartArea.appendChild(yAxisTitle);
        
        // X-axis title - hide on mobile if it's "Year"
        if (!window.isMobileVersion || config.xAxis.title !== 'Year') {
            const xAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
            xAxisTitle.setAttribute('x', width / 2);
            xAxisTitle.setAttribute('y', height + 60); // Positioned lower for bar charts with category labels
            xAxisTitle.setAttribute('text-anchor', 'middle');
            xAxisTitle.setAttribute('font-family', 'monospace');
            xAxisTitle.setAttribute('font-size', '14px');
            xAxisTitle.setAttribute('fill', 'var(--text-color)');
            xAxisTitle.textContent = config.xAxis.title;
            chartArea.appendChild(xAxisTitle);
        }
        
        // DO NOT draw the x-axis line here anymore - we'll do it at the very end to ensure it's on top
    }
    
    /**
     * Draws just the x-axis line for bar charts
     * This should be called at the end of the chart creation process to ensure the line is drawn on top
     * @param {SVGElement} chartArea - Chart SVG group element
     * @param {number} width - Chart width
     * @param {number} height - Chart height
     */
    function drawXAxisLine(chartArea, width, height) {
        // Remove any existing x-axis line first to prevent duplication
        const existingAxis = chartArea.querySelector('.x-axis-line');
        if (existingAxis) {
            existingAxis.parentNode.removeChild(existingAxis);
        }
        
        // Draw the x-axis line on top of everything else
        const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
        xAxis.setAttribute('x1', 0);
        xAxis.setAttribute('y1', height);
        xAxis.setAttribute('x2', width);
        xAxis.setAttribute('y2', height);
        xAxis.setAttribute('stroke', 'var(--text-color)');
        xAxis.setAttribute('stroke-width', 2);
        xAxis.setAttribute('class', 'x-axis-line');
        chartArea.appendChild(xAxis);
    }
    
    // Public API
    return {
        calculateAxisRanges,
        createScales,
        drawAxes,
        drawCategoricalAxes,
        drawXAxisLine
    };
})();