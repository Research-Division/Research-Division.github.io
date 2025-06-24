/**
 * Sparks Bar Chart Renderer
 * Renders bar charts using the core chart functionality
 */

// Sparks Bar Chart function
window.sparksBarChart = function(containerId, config) {
    try {
        
        // Add containerId to config for reference
        config.containerId = containerId;
        
        // Create chart container and get dimensions
        // Support both new and old API names for backward compatibility
        const coreModule = window.sparksGraphingCore || window.chartCore;
        
        const chart = coreModule.createChartContainer(containerId, config);
        if (!chart) {
            // Handle error or schedule retry
            setTimeout(() => {
                window.sparksBarChart(containerId, config);
            }, 100);
            return;
        }
        
        const { svg, chartArea, tooltipsContainer, width, height } = chart;
        
        // Calculate axis ranges
        const ranges = coreModule.calculateAxisRanges(config);
        
        // Create scale functions - pass the config for string-based x-axis
        const scales = coreModule.createScales(width, height, ranges, config);
        const { xScale, yScale } = scales;
        
        // Draw Y axis and grid lines using core function
        coreModule.drawCategoricalAxes(chartArea, width, height, ranges, scales, config);
        
        // Get bar chart specific configuration or use defaults
        const barConfig = config.barConfig || {};
        const groupPadding = barConfig.groupPadding !== undefined ? barConfig.groupPadding : 0.1;
        const barPadding = barConfig.barPadding !== undefined ? barConfig.barPadding : 0.05;
        
        // For categorical data on x-axis
        let xMapping = {};
        let xValues = [];
        
        if (config.xAxis.type === 'string') {
            // Get unique x values across all series
            config.series.forEach(series => {
                series.data.forEach(point => {
                    if (!xValues.includes(point.x)) {
                        xValues.push(point.x);
                    }
                });
            });
            
            // Determine the ordering of x-axis values
            if (config.rawSectorOrder) {
                // Use the exact sector order provided in the configuration
                // This ensures consistency between data and axes
                xValues = [...config.rawSectorOrder];
            } else if (!config.preserveXOrder) {
                // Sort alphabetically only if preserve order flag is not set
                xValues.sort();
            } else {
            }
            
            // Create a mapping from x value to index
            xValues.forEach((value, index) => {
                xMapping[value] = index;
            });
            
            // Store the mapping and values for later use
            if (svg) {
                svg.dataset.xValues = JSON.stringify(xValues);
                svg.dataset.xMapping = JSON.stringify(xMapping);
            }
        } else {
            // For numeric x values, just sort and make unique
            xValues = [...new Set(config.series.flatMap(s => s.data.map(d => d.x)))].sort((a, b) => a - b);
        }
        
        // Calculate bar width based on number of series and x scale
        const numSeries = config.series.length;
        const numGroups = xValues.length;
        const groupWidth = (width / numGroups) * (1 - groupPadding);
        const barWidth = groupWidth / numSeries * (1 - barPadding * (numSeries - 1));
        
        // Draw bars for each series
        config.series.forEach((series, seriesIndex) => {
            // Create a group for this series
            const seriesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            seriesGroup.setAttribute('class', 'bar-series');
            seriesGroup.setAttribute('data-series', series.name);
            chartArea.appendChild(seriesGroup);
            
            // Process data for this series - use the core module with proper name detection
            const coreModule = window.sparksGraphingCore || window.chartCore;
            const seriesColor = series.color || coreModule.getColorForIndex(seriesIndex);
            
            // Create data mapping for easier access
            const dataMap = {};
            series.data.forEach(point => {
                dataMap[point.x] = point.y;
            });
            
            // Draw a bar for each x value
            xValues.forEach((xValue, xIndex) => {
                // Get y value from the data map, or 0 if not present
                const yValue = dataMap[xValue] !== undefined ? dataMap[xValue] : 0;
                
                // Skip if no data
                if (yValue === null || yValue === undefined) return;
                
                // Calculate bar position
                let x;
                
                if (config.xAxis.type === 'string') {
                    // For categorical data
                    let xIndex = 0;
                    try {
                        if (svg && svg.dataset && svg.dataset.xMapping) {
                            const xMapping = JSON.parse(svg.dataset.xMapping);
                            xIndex = xMapping[xValue] || 0;
                        } else {
                            // Find the index in the xValues array
                            xIndex = xValues.indexOf(xValue);
                            if (xIndex === -1) xIndex = 0;
                        }
                    } catch (e) {
                        console.error('Error parsing xMapping:', e);
                        // Fallback to finding index
                        xIndex = xValues.indexOf(xValue);
                        if (xIndex === -1) xIndex = 0;
                    }
                    
                    const groupPosition = (width * (xIndex + 0.5)) / xValues.length;
                    // Position the bar within its group
                    x = groupPosition - (groupWidth / 2) + (seriesIndex * barWidth * (1 + barPadding));
                } else {
                    // For numeric data
                    const { xMin, xMax } = ranges;
                    const groupPosition = width * (xValue - xMin) / (xMax - xMin);
                    x = groupPosition - (groupWidth / 2) + (seriesIndex * barWidth * (1 + barPadding));
                }
                
                // Calculate y position and height
                const y = yScale(yValue);
                const barHeight = yScale(0) - y;
                
                // Ensure minimum visibility for very small values
                const finalBarHeight = (barHeight < 1 && yValue > 0) ? 1 : barHeight;
                
                // Create bar element
                const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                bar.setAttribute('x', x);
                bar.setAttribute('y', y);
                bar.setAttribute('width', barWidth);
                bar.setAttribute('height', finalBarHeight);
                bar.setAttribute('fill', seriesColor);
                bar.setAttribute('class', 'data-bar');
                bar.setAttribute('data-series', series.name);
                bar.setAttribute('data-value', yValue);
                bar.setAttribute('data-category', xValue);
                bar.setAttribute('data-original-fill', seriesColor); // Store original color
                bar.setAttribute('data-xvalue', xValue);
                bar.setAttribute('data-yvalue', yValue);
                
                // Add rounded corners for aesthetics
                bar.setAttribute('rx', 1);
                bar.setAttribute('ry', 1);
                
                // Apply bar outline style if enabled
                if (window.useBarOutlineStyle) {
                    bar.setAttribute('stroke', seriesColor);
                    bar.setAttribute('stroke-width', '1.5');
                    bar.setAttribute('fill-opacity', '0.5');
                }
                
                // Set initial state for animation - transparent and zero height
                bar.setAttribute('opacity', '0');
                
                // Store original height and y-position for animation
                bar.setAttribute('data-final-height', finalBarHeight);
                bar.setAttribute('data-final-y', y);
                
                // Position at the bottom with zero height for vertical growth animation
                bar.setAttribute('height', '0');
                bar.setAttribute('y', yScale(0));
                
                // Add to series group
                seriesGroup.appendChild(bar);
                
                // Create hover target rectangle for tooltip interactivity
                const hoverTarget = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                hoverTarget.setAttribute('x', x);
                hoverTarget.setAttribute('y', yScale(0)); // Start at bottom for animation
                hoverTarget.setAttribute('width', barWidth);
                hoverTarget.setAttribute('height', 0); // Start with zero height
                hoverTarget.setAttribute('fill', 'transparent');
                hoverTarget.setAttribute('class', 'hover-target');
                hoverTarget.setAttribute('data-series', series.name);
                hoverTarget.setAttribute('data-final-y', y);
                hoverTarget.setAttribute('data-final-height', finalBarHeight);
                chartArea.appendChild(hoverTarget);
                
                // Create tooltip using core function
                const tooltip = coreModule.createChartTooltip(
                    tooltipsContainer, x, y, barWidth, finalBarHeight, 
                    xValue, yValue, series.name, seriesColor, config
                );
                
                // Add hover effect to show tooltip
                if (tooltip) {
                    // Set up hover interactions
                    hoverTarget.onmouseover = () => {
                        // Show tooltip
                        tooltip.setAttribute('opacity', '1');
                        
                        // Add highlight to hover target
                        hoverTarget.setAttribute('stroke', seriesColor);
                        hoverTarget.setAttribute('stroke-width', '2');
                        
                        // Also highlight the bar if using outline style
                        if (window.useBarOutlineStyle) {
                            bar.setAttribute('data-prev-stroke-width', bar.getAttribute('stroke-width') || '1.5');
                            bar.setAttribute('stroke-width', '2.5');
                            bar.setAttribute('fill-opacity', '0.65');
                        }
                    };
                    
                    hoverTarget.onmouseout = () => {
                        // Hide tooltip
                        tooltip.setAttribute('opacity', '0');
                        
                        // Remove highlight
                        hoverTarget.removeAttribute('stroke');
                        hoverTarget.removeAttribute('stroke-width');
                        
                        // Reset bar style
                        if (window.useBarOutlineStyle) {
                            const prevStrokeWidth = bar.getAttribute('data-prev-stroke-width');
                            if (prevStrokeWidth) {
                                bar.setAttribute('stroke-width', prevStrokeWidth);
                            }
                            bar.setAttribute('fill-opacity', '0.5');
                        }
                    };
                }
                
                // Schedule animation with staggered timing
                setTimeout(() => {
                    // Get the current animation duration from the global settings
                    const duration = window.chartSettings ? window.chartSettings.animationDuration : 
                                    (window.chartAnimationDuration || 0.8);
                    
                    // Apply transition for both opacity and position/size properties
                    bar.style.transition = `opacity ${duration * 0.5}s ease-in-out, 
                                          height ${duration}s ease-out,
                                          y ${duration}s ease-out`;
                    
                    // Animate to full opacity
                    bar.setAttribute('opacity', '1');
                    
                    // Animate to final height and position
                    bar.setAttribute('height', bar.getAttribute('data-final-height'));
                    bar.setAttribute('y', bar.getAttribute('data-final-y'));
                    
                    // Animate the hover target for this bar
                    const hoverTarget = chartArea.querySelector(`.hover-target[x="${x}"][width="${barWidth}"][data-series="${series.name}"]`);
                    if (hoverTarget) {
                        // Apply the same animation to the hover target
                        hoverTarget.style.transition = `y ${duration}s ease-out, height ${duration}s ease-out`;
                        hoverTarget.setAttribute('y', bar.getAttribute('data-final-y'));
                        hoverTarget.setAttribute('height', bar.getAttribute('data-final-height'));
                    }
                }, 50 + (xIndex * 30) + (seriesIndex * 20));
            });
        });
        
        // Create interactive legend
        coreModule.createLegend(containerId, config);
        
        // Apply any chart styling
        coreModule.applyChartStyle(containerId);
        
        // Add chart type indicator
        coreModule.addChartIndicator(containerId, 'Bar Chart');
        
        // Draw the X-axis line last to ensure it's on top of all bars
        coreModule.drawXAxisLine(chartArea, width, height);
        
        // Remove and re-append the tooltip container LAST for proper z-index
        if (tooltipsContainer.parentNode) {
            tooltipsContainer.parentNode.removeChild(tooltipsContainer);
        }
        chartArea.appendChild(tooltipsContainer);
        
    } catch (error) {
        console.error('Error creating Sparks Bar Chart:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="visualization-placeholder">Error creating chart: ${error.message}</div>`;
        }
    }
};

// Note: The tooltip and axis drawing functions have been moved to sparksGraphingCore.js (formerly chartCore.js)
// and are now available as window.sparksGraphingCore.createChartTooltip and window.sparksGraphingCore.drawCategoricalAxes

// Register with sparksGraphFunctions if it exists
if (window.sparksGraphFunctions) {
    window.sparksGraphFunctions.sparksBarChart = window.sparksBarChart;
}