/**
 * Sparks Animation Utilities
 * Functions for creating animated chart elements
 * 
 * IMPORTANT IMPLEMENTATION NOTES:
 * 
 * Dashed Line Animation:
 * - Dashed lines are implemented using a clip path animation to maintain the drawing effect while
 *   showing the dash pattern during animation
 * - See the lineStyle parameter in drawAnimatedLineSeries for available dash patterns
 * - To use: Add a 'dashStyle' property to your series object (e.g., dashStyle: 'long-dash')
 * - Available patterns: 'solid', 'dashed', 'dotted', 'dash-dot', 'long-dash'
 * 
 * Scrolling Text Animation:
 * - Used for truncated labels to reveal full text on hover
 * - Automatically adds mouseenter/mouseleave listeners to SVG text elements
 * - Call setupScrollingTextAnimation() after chart is fully rendered
 */

window.sparksAnimationUtils = (function() {
    /**
     * Draws an animated line series with interactive data points and tooltips
     * 
     * @param {SVGElement} parentElement - The parent SVG element to append the line to
     * @param {Array<number>} xValues - Array of x-values (typically years or dates)
     * @param {Array<number>} yValues - Array of y-values corresponding to the x-values
     * @param {Function} xScale - Function to convert x-values to pixel coordinates
     * @param {Function} yScale - Function to convert y-values to pixel coordinates
     * @param {string} color - Color for the line and points (CSS color or variable)
     * @param {string} seriesName - Name of the series (for tooltips)
     * @param {string} [tooltipPrefix=''] - Prefix for tooltip values (e.g., '$')
     * @param {string} [tooltipSuffix=''] - Suffix for tooltip values (e.g., '%')
     * @param {number} chartWidth - Width of the chart for tooltip positioning
     * @param {SVGElement} tooltipsContainer - Container for tooltips
     * @param {Function} [valueFormatter=null] - Optional custom formatter for values
     * @param {Object} [config=null] - Configuration options including skipDots to hide points$', '€')
     * @param {string} [tooltipSuffix=''] - Suffix for tooltip values (e.g., '%', 'kg')
     * @param {number} chartWidth - Width of the chart for tooltip positioning
     * @param {SVGElement} tooltipsContainer - Container for tooltips (added last for z-index)
     * @param {Function} [valueFormatter=null] - Optional custom function to format values (takes value, returns string)
     * @param {Object} [config=null] - Optional chart configuration for advanced tooltip formatting
     *                                 Can include {skipDots: true} to render lines without data points
     */
    function drawAnimatedLineSeries(
        parentElement, 
        xValues, 
        yValues, 
        xScale, 
        yScale, 
        color, 
        seriesName,
        tooltipPrefix = '',
        tooltipSuffix = '', 
        chartWidth, 
        tooltipsContainer,
        valueFormatter = null,
        config = null, 
        lineStyle = 'solid'
    ) {
        // Check if we should skip rendering dots (but keep tooltips)
        const skipDots = config && config.skipDots === true;
        /*
        console.log(`sparksAnimationUtils: Drawing ${seriesName} with skipDots=${skipDots}`, 
            config ? `config.skipDots=${config.skipDots}` : 'config is null');*/
        // Always get the latest animation duration from both possible sources
        const animationDuration = window.chartAnimationDuration || window.chartSettings?.animationDuration || 0.8;
        
        // Use global settings or defaults for other properties
        // When skipDots is true, use radius 0 to effectively hide dots
        const pointRadius = skipDots ? 0 : (window.chartSettings?.pointRadius || 4);
        const pointHoverRadius = window.chartSettings?.pointHoverRadius || 6;
        const tooltipHeight = window.chartSettings?.tooltipHeight || 30;

        const dashPatterns = {
            solid: '0', 
            dashed: '8,8',      // Increased gap between dashes
            dotted: '2,6',      // Increased gap between dots
            'dash-dot': '8,8,2,8', // Wider pattern with more space
            'long-dash': '12,12' // New pattern with long dashes and gaps
        };
        const strokeDasharray = dashPatterns[lineStyle] || '';
        
        // Filter out null/undefined values
        const validPoints = [];
        for (let i = 0; i < xValues.length; i++) {
            if (yValues[i] !== null && yValues[i] !== undefined && !isNaN(yValues[i])) {
                validPoints.push({
                    x: xValues[i],
                    y: yValues[i]
                });
            }
        }
        
        if (validPoints.length < 2) {
            console.warn(`Not enough valid points to draw line for ${seriesName}`);
            return;
        }
        
        // Sort points by x-value to ensure proper line drawing
        validPoints.sort((a, b) => a.x - b.x);
        
        // First create the static line without animation (will be hidden)
        const staticLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let pathData = `M ${xScale(validPoints[0].x)} ${yScale(validPoints[0].y)}`;
        
        // Connect remaining points
        for (let i = 1; i < validPoints.length; i++) {
            pathData += ` L ${xScale(validPoints[i].x)} ${yScale(validPoints[i].y)}`;
        }
        
        staticLine.setAttribute('d', pathData);
        staticLine.setAttribute('fill', 'none');
        staticLine.setAttribute('stroke', color);
        staticLine.setAttribute('stroke-width', 3);
        staticLine.setAttribute('stroke-opacity', 0); // Make invisible
        parentElement.appendChild(staticLine);

        // Create a container for the animation
        const animationContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        animationContainer.setAttribute('class', 'animation-container');
        parentElement.appendChild(animationContainer);
        
        // Create animated path element
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', 3);
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('class', 'animated-path');
        // Add data-series attribute for highlighting
        path.setAttribute('data-series', seriesName);

        // Get the path length for animation
        const pathLength = path.getTotalLength ? path.getTotalLength() : 1000;
        
        // Handle animation differently based on line style
        if (lineStyle === 'solid') {
            // Simple animation for solid lines
            path.setAttribute('stroke-dasharray', pathLength);
            path.setAttribute('stroke-dashoffset', pathLength);
            // Use the global animation duration setting
            const lineDuration = window._chartAnimationDuration || 
                                window.chartAnimationDuration || 
                                animationDuration;
            path.style.transition = `stroke-dashoffset ${lineDuration}s ease-in-out`;
        } else {
            // For dashed lines, we'll use a different approach
            // First create a clip path that will reveal the line progressively
            const clipPathId = `clip-path-${seriesName.replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 9)}`;
            const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
            clipPath.setAttribute('id', clipPathId);
            
            // Create a rectangle that will widen progressively
            const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            clipRect.setAttribute('x', 0);
            clipRect.setAttribute('y', 0);
            clipRect.setAttribute('width', 0); // Start with zero width
            clipRect.setAttribute('height', '100%');
            clipPath.appendChild(clipRect);
            
            // Add the clip path to the DOM
            parentElement.appendChild(clipPath);
            
            // Apply the dash pattern immediately
            path.setAttribute('stroke-dasharray', dashPatterns[lineStyle]);
            
            // Apply the clip path
            path.setAttribute('clip-path', `url(#${clipPathId})`);
            
            // Animate the clip path instead of the dash offset
            setTimeout(() => {
                // Use the global animation duration setting
                const clipDuration = window._chartAnimationDuration || 
                                   window.chartAnimationDuration || 
                                   animationDuration;
                // Start animation
                clipRect.style.transition = `width ${clipDuration}s ease-in-out`;
                clipRect.setAttribute('width', '100%');
            }, 50);
        }
        
        animationContainer.appendChild(path);
        
        // Create points container 
        const pointsContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        pointsContainer.setAttribute('class', 'points-container');
        parentElement.appendChild(pointsContainer);
        
        // Add data points
        validPoints.forEach((point, index) => {
            // Variable to hold the circle reference (may or may not be created)
            let circle = null;
            let clipPathId = null;
            
            // Only create visible dots if skipDots is false
            //console.log(`Series ${seriesName}, point ${index}: skipDots=${skipDots}, will ${skipDots ? 'SKIP' : 'CREATE'} dot`);
            if (!skipDots) {
                // Create a circle
                circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute('cx', xScale(point.x));
                circle.setAttribute('cy', yScale(point.y));
                circle.setAttribute('r', pointRadius);
                circle.setAttribute('fill', color);
                circle.setAttribute('stroke', 'white');
                circle.setAttribute('stroke-width', 1);
                circle.setAttribute('class', 'data-point');
                // Add data-series attribute for highlighting
                circle.setAttribute('data-series', seriesName);
                
                // Create a clip path specifically for this point
                clipPathId = `clip-${seriesName.replace(/\s+/g, '-')}-${index}`;
                const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
                clipPath.setAttribute('id', clipPathId);
                
                // Create a circle for the clip path - initially zero radius
                const clipCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                clipCircle.setAttribute('cx', xScale(point.x));
                clipCircle.setAttribute('cy', yScale(point.y));
                clipCircle.setAttribute('r', 0); // Start with zero radius, will be animated
                clipPath.appendChild(clipCircle);
                
                // Add the clip path to SVG
                parentElement.appendChild(clipPath);
                
                // Apply clip path to the circle
                circle.setAttribute('clip-path', `url(#${clipPathId})`);
            }
            
            // Create tooltip using the tooltip manager if available
            let enhancedTooltip;
            
            if (window.sparksTooltipManager && typeof window.sparksTooltipManager.createLineTooltip === 'function') {
                // Use centralized tooltip manager for consistent formatting
                enhancedTooltip = window.sparksTooltipManager.createLineTooltip(
                    point, 
                    { x: xScale(point.x), y: yScale(point.y) }, 
                    seriesName, 
                    color, 
                    tooltipsContainer, 
                    chartWidth, 
                    { 
                        valueFormatter: valueFormatter,
                        tooltipFormat: config?.tooltipFormat,
                        chartType: config?.chartType,
                        metric: config?.metric,
                        formatter: config?.formatter,
                        percentageConfig: config?.percentageConfig,
                        yAxis: config?.yAxis
                    }
                );
            } else {
                // Legacy implementation for backward compatibility
                enhancedTooltip = document.createElementNS("http://www.w3.org/2000/svg", "g");
                enhancedTooltip.setAttribute('class', 'chart-tooltip');
                enhancedTooltip.setAttribute('opacity', '0');
                enhancedTooltip.setAttribute('pointer-events', 'none');
                
                // Tooltip background - with consistent dimensions
                const tooltipBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                const boxHeight = tooltipHeight;
                tooltipBg.setAttribute('height', boxHeight);
                tooltipBg.setAttribute('rx', 4);
                tooltipBg.setAttribute('ry', 4);
                tooltipBg.setAttribute('fill', 'var(--background-color)');
                tooltipBg.setAttribute('stroke', color);
                tooltipBg.setAttribute('stroke-width', 1);
                tooltipBg.setAttribute('opacity', 0.9);
                
                // Format the value using formatUtils if available, otherwise use basic formatting
                let formattedValue;
                if (valueFormatter && typeof valueFormatter === 'function') {
                    // IMPORTANT: For currency values, the tooltipFormatter may be adding the prefix
                    // In this case we DON'T want to add another $ from tooltipPrefix
                    formattedValue = valueFormatter(point.y);
                    
                    // After using the valueFormatter, clear the tooltipPrefix to prevent double prefix
                    if (tooltipPrefix === '$') {
                        tooltipPrefix = '';
                    }
                } else if (window.formatUtils) {
                    // Format based on the current format mode and value type
                    const formatMode = window.chartSettings.tooltipFormatMode || 'expanded';
                    // Check if this is a currency value - based on both prefix and tooltip context
                    const isCurrency = tooltipPrefix === '$' || 
                        (tooltipPrefix === '' && (seriesName.includes('currency') || 
                                                seriesName.includes('value') || 
                                                seriesName.toLowerCase().includes('usd')));
                    
                    // Special handling for percentage values in tariff charts
                    const isPercentage = tooltipSuffix === '%';
                    
                    if (isPercentage) {
                        // For tariff data, values are already in percentage form (e.g., 4.5 = 4.5%)
                        // Don't use formatPercent which might multiply by 100
                        formattedValue = `${point.y.toFixed(1)}%`;
                    } else if (formatMode === 'expanded') {
                        if (isCurrency) {
                            // For currency values, ALWAYS explicitly disable the prefix
                            formattedValue = window.formatUtils.formatCurrency(point.y, { 
                                useSuffix: false, 
                                includePrefix: false // Force disable prefix
                            });
                            
                            // Only add the prefix if explicitly passed as tooltipPrefix
                            if (tooltipPrefix) {
                                formattedValue = tooltipPrefix + formattedValue;
                            }
                        } else {
                            // Non-currency formatting
                            formattedValue = window.formatUtils.formatWithCommas(point.y, 2) + tooltipSuffix;
                        }
                    } else if (formatMode === 'abbreviated') {
                        if (isCurrency) {
                            // For currency values, ALWAYS explicitly disable the prefix
                            formattedValue = window.formatUtils.formatCurrency(point.y, { 
                                useSuffix: true, 
                                includePrefix: false // Force disable prefix
                            });
                            
                            // Only add the prefix if explicitly passed as tooltipPrefix
                            if (tooltipPrefix) {
                                formattedValue = tooltipPrefix + formattedValue;
                            }
                        } else {
                            // Non-currency formatting
                            formattedValue = window.formatUtils.formatLargeNumber(point.y) + tooltipSuffix;
                        }
                    } else if (formatMode === 'scientific') {
                        // Scientific notation for precise values
                        const scientificValue = point.y.toExponential(2);
                        formattedValue = tooltipPrefix + scientificValue + tooltipSuffix;
                    }
                } else {
                    // Fallback to basic formatting
                    const isPercentage = tooltipSuffix === '%';
                    if (isPercentage) {
                        // For percentage values including tariffs, just add % without multiplying
                        formattedValue = `${point.y.toFixed(1)}%`;
                    } else {
                        formattedValue = `${tooltipPrefix}${point.y.toFixed(2)}${tooltipSuffix}`;
                    }
                }
                
                // Get country name for the label
                let countryName;
                // Get year/x-value for the parenthetical note
                let yearOrXValue = point.x;
                
                // If this is a country chart (x is ISO code)
                if (typeof point.x === 'string' && point.x.length <= 3 && window.isoToCountryName) {
                    // Try to get country name from ISO code
                    countryName = window.isoToCountryName[point.x] || point.x;
                    
                    // For country charts, we need to find the year from seriesName
                    // The series name is often the year in time series charts
                    yearOrXValue = seriesName;
                } 
                // If this is a time series (x is year, seriesName is country)
                else if (typeof point.x === 'number' && seriesName) {
                    // Use the series name as the country
                    countryName = seriesName;
                    // X value is already the year
                    yearOrXValue = point.x;
                }
                // Fallback case
                else {
                    countryName = seriesName || "Value";
                    yearOrXValue = point.x;
                }
                
                // Format as "Country: VALUE (YEAR)"
                const tooltipContent = `${countryName}: ${formattedValue} (${yearOrXValue})`;
                
                // Calculate text width for the box - consider longer country names
                const textWidth = Math.max(tooltipContent.length * 7, 100); // Minimum width
                const boxPadding = 20;
                const boxWidth = textWidth + boxPadding;
                
                // Position the tooltip
                const pointX = xScale(point.x);
                let tooltipX = pointX + 10;
                let lineX2 = tooltipX;
                
                // More fluid tooltip positioning
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
                const tooltipY = yScale(point.y) - (boxHeight / 2) - 10; // Position above the point
                tooltipBg.setAttribute('y', tooltipY);
                
                // Tooltip text with direction of tariff - centered in the box both horizontally and vertically
                const tooltipText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                tooltipText.setAttribute('x', tooltipX + (boxWidth / 2)); // Center horizontally
                tooltipText.setAttribute('y', tooltipY + (boxHeight / 2)); // Center vertically
                tooltipText.setAttribute('text-anchor', 'middle'); // Horizontal centering
                tooltipText.setAttribute('dominant-baseline', 'middle'); // Vertical centering
                tooltipText.setAttribute('font-family', 'monospace');
                tooltipText.setAttribute('font-size', '12px');
                tooltipText.setAttribute('fill', 'var(--text-color)');
                tooltipText.textContent = tooltipContent;
                
                // Connecting line - adjusted for new tooltip position
                const tooltipLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                tooltipLine.setAttribute('x1', xScale(point.x));
                tooltipLine.setAttribute('y1', yScale(point.y));
                tooltipLine.setAttribute('x2', lineX2);
                tooltipLine.setAttribute('y2', tooltipY + (boxHeight / 2)); // Connect to middle of tooltip
                tooltipLine.setAttribute('stroke', color);
                tooltipLine.setAttribute('stroke-width', 1);
                
                
                // Add tooltip elements
                enhancedTooltip.appendChild(tooltipBg);
                enhancedTooltip.appendChild(tooltipLine);
                enhancedTooltip.appendChild(tooltipText);
            }
            
            // Add hover area (larger transparent circle)
            const hoverTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hoverTarget.setAttribute('cx', xScale(point.x));
            hoverTarget.setAttribute('cy', yScale(point.y));
            hoverTarget.setAttribute('r', 10);
            hoverTarget.setAttribute('fill', 'transparent');
            hoverTarget.setAttribute('class', 'hover-target');
            
            // Add hover effects
            hoverTarget.onmouseover = () => {
                // Only modify the circle if it exists (skipDots = false)
                if (circle) {
                    circle.setAttribute('r', pointHoverRadius);
                    circle.setAttribute('stroke-width', 2);
                }
                enhancedTooltip.setAttribute('opacity', '1');
            };
            
            hoverTarget.onmouseout = () => {
                // Only modify the circle if it exists (skipDots = false)
                if (circle) {
                    circle.setAttribute('r', pointRadius);
                    circle.setAttribute('stroke-width', 1);
                }
                enhancedTooltip.setAttribute('opacity', '0');
            };
            
            // Add circle and hover target to points container
            if (circle) {
                pointsContainer.appendChild(circle);
            }
            pointsContainer.appendChild(hoverTarget);
            
            // Add tooltip to separate tooltips container
            tooltipsContainer.appendChild(enhancedTooltip);
            
            // Only animate circles if they exist (skipDots = false)
            //console.log(`Series ${seriesName}, point ${index}: Animation decision: skipDots=${skipDots}, clipPathId=${clipPathId}, will ${(!skipDots && clipPathId) ? 'RUN' : 'SKIP'} animation`);
            if (!skipDots && clipPathId) {
                // Get the clip path element
                const clipPath = document.getElementById(clipPathId);
                if (clipPath) {
                    const clipCircle = clipPath.querySelector('circle');
                    if (clipCircle) {
                        // Animate clip paths to reveal points in sequence
                        setTimeout(() => {
                            // Use the global animation duration setting
                            const pointDuration = window._chartAnimationDuration || 
                                                window.chartAnimationDuration || 
                                                animationDuration;
                            
                            // Calculate when this point should appear - adding a slight delay after line reaches point
                            const pointPosition = index / (validPoints.length - 1); // 0 to 1
                            const pointAppearTime = pointPosition * pointDuration * 1000;
                            
                            // Scale delay based on animation duration
                            const baseDelay = Math.min(150, pointDuration * 200); 
                            // Use a fixed small delay for the last few points to ensure they animate
                            const delayAfterLine = (index >= validPoints.length - 3) ? baseDelay/3 : baseDelay; // Shorter delay for last few points
                            
                            // Schedule the point appearance
                            setTimeout(() => {
                                // Force a layout reflow before changing the radius to ensure animation triggers
                                clipCircle.getBoundingClientRect();
                                clipCircle.setAttribute('r', 10); // Make it larger than the point
                            }, pointAppearTime + delayAfterLine);
                        }, 50); // Same initial delay as line animation
                    }
                }
            }
        });
        
        // Trigger the line animation after a short delay
        setTimeout(() => {
            path.style.strokeDashoffset = '0';
        }, 50);
    }
    
    /**
     * Setup for truncated labels - this is a stub function that doesn't do anything
     * We're keeping it for API compatibility but not implementing any tooltip behavior
     * 
     * @param {string} containerId - ID of the chart container
     * @param {string} selector - CSS selector for x-axis tick labels
     */
    function setupScrollingTextAnimation(containerId, selector) {
        // This is intentionally left empty - we're not implementing tooltips for truncated labels
        //console.log('setupScrollingTextAnimation is disabled - labels will remain truncated without tooltips');
    }
    
    /**
     * Helper to parse rotation value from SVG transform attribute
     * @param {string} transform - The transform attribute value
     * @returns {number} The rotation angle in degrees, or 0 if not found
     */
    function parseTransformRotation(transform) {
        if (!transform) return 0;
        
        // Match rotate(...) in transform
        const match = transform.match(/rotate\(([^,)]+)/);
        if (match && match[1]) {
            return parseFloat(match[1]);
        }
        return 0;
    }
    
    /**
     * Animates a treemap visualization showing the squarification process
     * 
     * @param {Object} container - DOM container for the treemap
     * @param {Array} states - Array of layout states captured during squarification
     * @param {Object} options - Animation options
     * @param {Function} renderCallback - Function to render the final treemap
     * @returns {Promise} Promise that resolves when animation completes
     */
    function animateTreemapSquarification(container, states, options = {}, renderCallback) {
        return new Promise((resolve, reject) => {
            try {
                // Get animation duration from settings with priority:
                // 1. Use _chartAnimationDuration from devTools (most specific)
                // 2. Fall back to chartAnimationDuration (global setting)
                // 3. Fall back to chartSettings (legacy)
                // 4. Default to 0.8 seconds
                const animationDuration = window._chartAnimationDuration || 
                                          window.chartAnimationDuration || 
                                          window.chartSettings?.animationDuration || 0.8;
                
                //console.log("Treemap animation using duration:", animationDuration, "seconds");
                
                // Calculate frame delay to ensure total animation completes EXACTLY within the specified duration
                // Simple formula: frameDelay = totalDuration / numberOfFrames
                const calculatedFrameDelay = (animationDuration * 1000) / states.length;
                
                // Log information about exact timing
                //console.log(`Animation timing: ${states.length} frames at ${calculatedFrameDelay.toFixed(2)}ms delay = ${animationDuration}s total`);
                
                // If there are too many frames for smooth rendering at the target duration,
                // we can use frame skipping to maintain the time constraint while showing key states
                const skipFrames = calculatedFrameDelay < 5 && states.length > 60;
                
                if (skipFrames) {
                    //console.log(`Frame delay ${calculatedFrameDelay.toFixed(2)}ms is very small - will use frame skipping`);
                }
                
                // Calculate final frame delay to use - this ensures the TOTAL animation time matches
                // the specified duration, whether we're showing all frames or a subset
                let finalFrameDelay;
                if (calculatedFrameDelay < 5 && states.length > 60) {
                    // If we're using frame skipping, recalculate the delay based on the reduced frame count
                    const skipFactor = Math.ceil(5 / calculatedFrameDelay);
                    const expectedFrameCount = Math.ceil(states.length / skipFactor) + 
                                              states.filter(s => s.isDecisionPoint).length;
                    
                    // Ensure we hit the exact animation duration with the reduced frame count
                    finalFrameDelay = (animationDuration * 1000) / expectedFrameCount;
                } else {
                    // Use the original calculation for normal speeds
                    finalFrameDelay = calculatedFrameDelay;
                }
                
                // Get useCompactStyle option for consistent styling
                const useCompactStyle = options.useCompactStyle !== undefined ? 
                                       options.useCompactStyle : 
                                       false;
                
                // Default options
                const defaults = {
                    frameDelay: finalFrameDelay,
                    showAllStates: true,
                    skipAnimation: options.skipAnimation || false, // Skip animation entirely
                    useCompactStyle: useCompactStyle // Store for consistent styling
                };
                
                const settings = { ...defaults, ...options };
                
                // If animation is disabled, just call the final render
                if (settings.skipAnimation) {
                    if (typeof renderCallback === 'function') {
                        renderCallback();
                    }
                    resolve();
                    return;
                }
                
                // Create clear SVG for animation
                const svg = container.querySelector('svg');
                if (!svg) {
                    reject(new Error('SVG container not found'));
                    return;
                }
                
                // Get dimensions
                const width = svg.clientWidth;
                const height = svg.clientHeight;
                
                // Create temporary animation layer with the same transform as the chart area
                const animationLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
                animationLayer.setAttribute('class', 'treemap-animation-layer');
                
                // Find the chart area with transform to match positioning
                const chartArea = svg.querySelector('g');
                if (chartArea && chartArea.getAttribute('transform')) {
                    animationLayer.setAttribute('transform', chartArea.getAttribute('transform'));
                } else {
                    // Apply default margins if no transform found
                    animationLayer.setAttribute('transform', 'translate(20,20)');
                }
                
                svg.appendChild(animationLayer);
                
                // Determine whether to use all states or implement frame skipping
                let animationStates;
                
                // If we have very short frame delays (less than 5ms per frame),
                // we need to implement frame skipping to maintain the overall duration
                if (calculatedFrameDelay < 5 && states.length > 60) {
                    // Calculate how many frames to skip to achieve ~5ms per frame
                    const skipFactor = Math.ceil(5 / calculatedFrameDelay);
                    
                    // Filter states to reduce total frames
                    animationStates = states.filter((state, index) => {
                        // Always include first and last frames
                        if (index === 0 || index === states.length - 1) return true;
                        
                        // Always include decision points
                        if (state.isDecisionPoint) return true;
                        
                        // Include every Nth frame based on skip factor
                        return index % skipFactor === 0;
                    });
                    
                    //console.log(`Frame skipping: showing ${animationStates.length} of ${states.length} frames (skip factor: ${skipFactor})`);
                } else {
                    // For normal speeds, use all states
                    animationStates = states;
                    //console.log(`Animation: using all ${states.length} states with ${animationDuration}s duration`);
                }
                
                // Set up animation counter
                let currentFrame = 0;
                
                // Keep track of all rectangles we're displaying
                const allRects = new Map(); // Use Map to store rects by a unique identifier
                
                // Function to render a single animation frame
                function renderFrame() {
                    // Get current state
                    const state = animationStates[currentFrame];
                    
                    // Clear animation layer before first frame
                    if (currentFrame === 0) {
                        while (animationLayer.firstChild) {
                            animationLayer.removeChild(animationLayer.firstChild);
                        }
                    }
                    
                    // Add new rects from this state, but keep existing ones
                    if (state && state.rects) {
                        state.rects.forEach(rect => {
                            // Create a unique ID for this rectangle based on its properties
                            const rectId = `${rect.x}-${rect.y}-${rect.width}-${rect.height}-${rect.label || ''}`;
                            
                            // Only add if we haven't already added this rect and it has valid dimensions
                            if (!allRects.has(rectId) && 
                                !isNaN(rect.x) && !isNaN(rect.y) && 
                                !isNaN(rect.width) && !isNaN(rect.height) &&
                                rect.width > 0 && rect.height > 0) {
                                
                                const rectElement = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                                rectElement.setAttribute('x', rect.x);
                                rectElement.setAttribute('y', rect.y);
                                rectElement.setAttribute('width', rect.width);
                                rectElement.setAttribute('height', rect.height);
                                
                                // Use final color immediately, no yellow highlighting
                                rectElement.setAttribute('fill', rect.color || '#ccc');
                                
                                // Use the settings.useCompactStyle value for consistent styling
                                const useCompactStyle = settings.useCompactStyle;
                                
                                // Log the styling being used during animation
                                if (rect.label && rect.label.includes("Asia")) {
                                    //console.log(`Animation stroke style: useCompactStyle=${useCompactStyle}, stroke-width=${useCompactStyle ? '0.2' : '0.5'}`);
                                }
                                
                                rectElement.setAttribute('stroke', 'white');
                                rectElement.setAttribute('stroke-width', useCompactStyle ? '0.2' : '0.5');
                                rectElement.setAttribute('data-id', rectId);
                                
                                // Add opacity animation for new elements
                                rectElement.style.opacity = '0';
                                rectElement.style.transition = 'opacity 0.3s ease-in';
                                
                                animationLayer.appendChild(rectElement);
                                
                                // Add text labels to rectangles during animation using shared utility
                                if (rect.label) {
                                    // Calculate the text properties
                                    let textProps = null;
                                    
                                    // Transfer originalValue property if present in node data
                                    if (rect.originalValue !== undefined) {
                                        // Make sure this property is available for tooltip formatting
                                        rect._originalValue = rect.originalValue;
                                    }
                                    
                                    // First try to use the shared utility function
                                    if (window.sparksTreemapFinal && typeof window.sparksTreemapFinal.calculateTextProperties === 'function') {
                                        // Create a node-like object with name property for compatibility
                                        const nodeObj = { 
                                            name: rect.label, 
                                            value: rect.value || 0,
                                            originalValue: rect.originalValue,
                                            level: rect.level || 0
                                        };
                                        textProps = window.sparksTreemapFinal.calculateTextProperties(rect, nodeObj);
                                    } else {
                                        // Simple fallback if utility not available - only show text for larger rectangles
                                        if (rect.width > 40 && rect.height > 30) {
                                            textProps = {
                                                fontSize: 11,
                                                textContent: rect.label.length > 9 ? rect.label.substring(0, 6) + '...' : rect.label,
                                                x: rect.x + 4,
                                                y: rect.y + 4
                                            };
                                        }
                                    }
                                    
                                    // If we have valid text properties, create the text element
                                    if (textProps) {
                                        // Store text elements array for fade-in animation
                                        rect.textElements = [];
                                        
                                        // Check if textProps has textElements array (new format) or textContent (old format)
                                        if (textProps.textElements && Array.isArray(textProps.textElements) && textProps.textElements.length > 0) {
                                            // New format - multiple text elements
                                            textProps.textElements.forEach(element => {
                                                const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
                                                textElement.setAttribute('x', element.x);
                                                textElement.setAttribute('y', element.y);
                                                textElement.setAttribute('dominant-baseline', 'hanging');
                                                textElement.setAttribute('fill', 'white');
                                                textElement.setAttribute('font-size', `${element.fontSize}px`);
                                                textElement.setAttribute('class', 'treemap-label');
                                                textElement.textContent = element.text;
                                                
                                                // Set up fade-in animation
                                                textElement.style.opacity = '0';
                                                textElement.style.transition = 'opacity 0.3s ease-in';
                                                
                                                animationLayer.appendChild(textElement);
                                                
                                                // Store reference for fade-in animation
                                                rect.textElements.push(textElement);
                                            });
                                        } else {
                                            // Old format - single text element
                                            const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
                                            textElement.setAttribute('x', textProps.x);
                                            textElement.setAttribute('y', textProps.y);
                                            textElement.setAttribute('dominant-baseline', 'hanging');
                                            textElement.setAttribute('fill', 'white');
                                            textElement.setAttribute('font-size', `${textProps.fontSize}px`);
                                            textElement.setAttribute('class', 'treemap-label');
                                            textElement.textContent = textProps.textContent || rect.label;
                                            
                                            // Set up fade-in animation
                                            textElement.style.opacity = '0';
                                            textElement.style.transition = 'opacity 0.3s ease-in';
                                            
                                            animationLayer.appendChild(textElement);
                                            
                                            // Store reference for fade-in animation for backward compatibility
                                            rect.textElement = textElement;
                                            rect.textElements.push(textElement);
                                        }
                                    }
                                }
                                
                                // Add to our tracking map
                                allRects.set(rectId, {
                                    rect,
                                    element: rectElement
                                });
                                
                                // Fade in elements quickly to match the overall animation speed
                                // Faster animations = faster fade-ins
                                // Calculate fade duration as a fraction of the total animation time
                                // For N frames, each frame gets roughly 1/N of the total duration
                                const fadeInDuration = Math.max(30, Math.min(200, animationDuration * 100)); // ms
                                
                                // Apply transition duration
                                rectElement.style.transition = `opacity ${fadeInDuration}ms ease-in`;
                                // Handle both old and new text element storage
                                if (rect.textElements && rect.textElements.length > 0) {
                                    rect.textElements.forEach(textEl => {
                                        textEl.style.transition = `opacity ${fadeInDuration}ms ease-in`;
                                    });
                                } else if (rect.textElement) {
                                    rect.textElement.style.transition = `opacity ${fadeInDuration}ms ease-in`;
                                }
                                
                                setTimeout(() => {
                                    rectElement.style.opacity = '1';
                                    
                                    // Also fade in any associated text
                                    if (rect.textElements && rect.textElements.length > 0) {
                                        rect.textElements.forEach(textEl => {
                                            textEl.style.opacity = '1';
                                        });
                                    } else if (rect.textElement) {
                                        rect.textElement.style.opacity = '1';
                                    }
                                }, 10);
                            }
                        });
                    }
                    
                    // Move to next frame or end animation
                    currentFrame++;
                    
                    if (currentFrame < animationStates.length) {
                        // Schedule next frame
                        setTimeout(renderFrame, settings.frameDelay);
                    } else {                        
                        // Hide any visible tooltips when animation ends
                        hideAllVisibleTooltips();
                        
                        // Instead of removing immediately, fade out animation layer
                        animationLayer.style.transition = 'opacity 0.2s ease-out';
                        animationLayer.style.opacity = '0';
                        
                        // First render the final treemap while animation is still fading
                        if (typeof renderCallback === 'function') {
                            renderCallback();
                        }
                        
                        // Then remove animation layer after fade out
                        setTimeout(() => {
                            if (animationLayer.parentNode) {
                                animationLayer.remove();
                            }
                            // Hide tooltips again after final render to be safe
                            hideAllVisibleTooltips();
                        }, 200);
                        
                        // Resolve promise when done
                        resolve();
                    }
                }
                
                // Start animation
                renderFrame();
                
            } catch (error) {
                //onsole.error('Treemap animation error:', error);
                // Fallback to regular rendering on error
                if (typeof renderCallback === 'function') {
                    renderCallback();
                }
                reject(error);
            }
        });
    }

    /**
     * Helper function to hide all visible tooltips in the document
     * Used when transitioning between animation and final rendering
     */
    function hideAllVisibleTooltips() {
        // Use the modal's cleanup if available (keep it simple)
        if (window.sparksBarChartModal && typeof window.sparksBarChartModal.cleanupAllTooltips === 'function') {
            window.sparksBarChartModal.cleanupAllTooltips();
            return;
        }
                
        // Force-hide all tooltips (more aggressive approach)
        document.querySelectorAll('.treemap-tooltip').forEach(tooltip => {
            // Apply multiple hide techniques to ensure tooltips disappear
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
            tooltip.style.display = 'none';
            
            // Ensure the tooltip will reset on next hover
            setTimeout(() => {
                tooltip.style.display = ''; // Remove display:none to allow future showing
            }, 500);
        });
        
        // Reset highlight state if active
        if (window._treemapHighlightState) {
            window._treemapHighlightState = false;
            
            // Reset rectangle opacity
            document.querySelectorAll('rect.treemap-node').forEach(rect => {
                rect.style.opacity = '1';
            });
        }
    }

    // Public API
    return {
        drawAnimatedLineSeries,
        setupScrollingTextAnimation,
        animateTreemapSquarification
    };
})();