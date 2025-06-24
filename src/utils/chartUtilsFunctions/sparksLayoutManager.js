/**
 * Sparks Layout Manager
 * Handles dynamic layout calculations for chart components
 * 
 * This component calculates appropriate dimensions, margins, and positioning
 * for chart elements based on content and configuration.
 */

window.sparksLayoutManager = (function() {
    // Default chart dimensions
    const DEFAULT_DIMENSIONS = {
        minHeight: 300,
        minWidth: 400,
        aspectRatio: 0.75, // height:width ratio (4:3)
        margins: {
            top: 30,
            right: 50,
            bottom: 50,
            left: 80
        },
        axisProportions: {
            xAxis: 0.15, // x-axis takes 15% of total height
            yAxis: 0.12  // y-axis takes 12% of total width
        }
    };

    /**
     * Calculate content-aware SVG dimensions based on chart configuration
     * @param {Object} config - Chart configuration
     * @param {HTMLElement} container - Container element
     * @returns {Object} Dimensions object with width, height, viewBox
     */
    function calculateSVGDimensions(config, container) {
        // Get container width
        const containerWidth = container.clientWidth || DEFAULT_DIMENSIONS.minWidth;
        
        // Calculate base height using aspect ratio
        let baseHeight = Math.max(
            DEFAULT_DIMENSIONS.minHeight,
            containerWidth * DEFAULT_DIMENSIONS.aspectRatio
        );
        
        // Dynamic adjustment for specific chart types
        if (config.type === 'bar' && config.xAxis && config.xAxis.labelAngle) {
            // Add extra height for rotated x-axis labels
            const angle = Math.abs(config.xAxis.labelAngle);
            const extraHeight = calculateRotatedLabelHeight(config, angle);
            baseHeight += extraHeight;
        }
        
        // Ensure minimum height
        const height = Math.max(baseHeight, DEFAULT_DIMENSIONS.minHeight);
        
        // Calculate viewBox for resolution independence
        const viewBox = `0 0 ${containerWidth} ${height}`;
        
        return {
            width: containerWidth,
            height: height,
            viewBox: viewBox
        };
    }
    
    /**
     * Calculate the height needed for rotated labels
     * @param {Object} config - Chart configuration
     * @param {number} angle - Rotation angle in degrees
     * @returns {number} Extra height needed
     */
    function calculateRotatedLabelHeight(config, angle) {
        // Get approximate maximum label length
        let maxLabelLength = 10; // Default assumption
        
        // Try to calculate from actual data if available
        if (config.series && config.series.length > 0) {
            const allLabels = config.series.flatMap(s => 
                s.data.map(d => String(d.x))
            );
            
            if (allLabels.length > 0) {
                maxLabelLength = Math.max(...allLabels.map(l => l.length));
                // Cap at reasonable length
                maxLabelLength = Math.min(maxLabelLength, 20);
            }
        }
        
        // Average character width in pixels (approximate)
        const charWidth = 8;
        // Font size (approximate)
        const fontSize = 12;
        
        // Calculate additional height needed for rotated text
        // Using trigonometry to calculate vertical space needed
        const radians = angle * Math.PI / 180;
        const labelWidth = maxLabelLength * charWidth;
        const rotatedHeight = Math.sin(radians) * labelWidth;
        
        // Add buffer for readability
        return rotatedHeight + (fontSize * 2);
    }
    
    /**
     * Calculate appropriate margins based on chart content and configuration
     * @param {Object} config - Chart configuration
     * @param {HTMLElement} container - Container element
     * @returns {Object} Margins object with top, right, bottom, left
     */
    function calculateMargins(config, container) {
        // Start with default margins
        const margins = { ...DEFAULT_DIMENSIONS.margins };
        
        // Width-based calculations
        const containerWidth = container.clientWidth || DEFAULT_DIMENSIONS.minWidth;
        
        // 1. Adjust for axis titles
        if (config.yAxis && config.yAxis.title) {
            // Check if using horizontal y-axis title
            if (config.yAxis.titlePosition === 'horizontal') {
                margins.left = Math.max(margins.left, containerWidth * DEFAULT_DIMENSIONS.axisProportions.yAxis);
                // Balance right margin for centering
                margins.right = margins.left;
            } else {
                // For rotated titles, add space based on title length
                const titleLength = config.yAxis.title.length || 10;
                const additionalMargin = Math.min(titleLength * 2, 40);
                margins.left += additionalMargin;
            }
        }
        
        // 2. Adjust for x-axis title
        if (config.xAxis && config.xAxis.title) {
            margins.bottom += 25; // Standard space for axis title
        }
        
        // 3. Adjust for rotated x-axis labels
        if (config.xAxis && config.xAxis.labelAngle) {
            const angle = Math.abs(config.xAxis.labelAngle);
            const extraHeight = calculateRotatedLabelHeight(config, angle);
            margins.bottom += extraHeight;
        }
        
        // 4. Adjust for axis label formats (e.g., currency with long numbers)
        if (config.yAxis && 
            (config.yAxis.title && 
             (config.yAxis.title.toLowerCase().includes('currency') || 
              config.yAxis.title.toLowerCase().includes('value')))) {
            margins.left += 20; // Add space for currency symbols and long numbers
        }
        
        // 5. Ensure minimum margins for readability
        margins.top = Math.max(margins.top, 20);
        margins.right = Math.max(margins.right, 20);
        margins.bottom = Math.max(margins.bottom, 40);
        margins.left = Math.max(margins.left, 50);
        
        return margins;
    }
    
    /**
     * Calculate appropriate transform for the chart area
     * @param {Object} config - Chart configuration
     * @param {Object} margins - Calculated margins
     * @returns {string} SVG transform attribute value
     */
    function calculateTransform(config, margins) {
        // By default, use margin-based transform
        let transform = `translate(${margins.left},${margins.top})`;
        
        // Special case for specific chart types
        if (config.type === 'bar' && config.xAxis && config.xAxis.labelAngle) {
            // For bar charts with rotated labels, use a more aggressive transform
            // to ensure labels have enough space
            const leftAdjustment = Math.max(margins.left, 100);
            transform = `translate(${leftAdjustment},30)`;
        }
        
        // Override with custom transform if explicitly provided
        if (config.transform) {
            transform = config.transform;
        }
        
        return transform;
    }
    
    /**
     * Apply layout calculations to chart configuration
     * @param {Object} config - Chart configuration
     * @param {HTMLElement} container - Container element
     * @returns {Object} Enhanced configuration with layout properties
     */
    function applyLayoutCalculations(config, container) {
        // Clone the config to avoid modifying the original
        const enhancedConfig = { ...config };
        
        // Calculate SVG dimensions
        const dimensions = calculateSVGDimensions(config, container);
        enhancedConfig.dimensions = dimensions;
        
        // Calculate margins
        const margins = calculateMargins(config, container);
        enhancedConfig.margin = margins;
        
        // Calculate transform
        const transform = calculateTransform(config, margins);
        enhancedConfig.transform = transform;
        
        // Calculate chart area dimensions
        enhancedConfig.chartArea = {
            width: dimensions.width - margins.left - margins.right,
            height: dimensions.height - margins.top - margins.bottom
        };
        
        return enhancedConfig;
    }
    
    /**
     * Calculate optimal label angle based on number of labels and available width
     * @param {number} numLabels - Number of x-axis labels
     * @param {number} availableWidth - Available width for the x-axis
     * @returns {number} Recommended label angle in degrees (negative for clockwise)
     */
    function calculateOptimalLabelAngle(numLabels, availableWidth) {
        // Estimate average label width
        const avgLabelWidth = 80; // pixels
        
        // Calculate approximate width needed for horizontal labels
        const totalLabelWidth = numLabels * avgLabelWidth;
        
        // If labels fit horizontally, no rotation needed
        if (totalLabelWidth <= availableWidth) {
            return 0;
        }
        
        // Calculate rotation based on available space
        const ratio = availableWidth / totalLabelWidth;
        
        // Map ratio to angles:
        // ratio 1.0 = 0° (horizontal)
        // ratio 0.5 = -35° (angled)
        // ratio 0.25 or less = -90° (vertical)
        if (ratio < 0.25) {
            return -90; // Vertical labels
        } else if (ratio < 0.5) {
            return -45; // More angled
        } else if (ratio < 0.8) {
            return -35; // Standard angle for moderate crowding
        } else if (ratio < 1.0) {
            return -20; // Slight angle for minor crowding
        }
        
        return 0; // Default to horizontal
    }
    
    /**
     * Create a responsive container for a chart
     * @param {string} containerId - ID of the container element
     * @param {Object} config - Chart configuration
     * @returns {Object} Container elements and dimensions
     */
    function createResponsiveChartContainer(containerId, config) {
        // Get container element
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID '${containerId}' not found`);
            return null;
        }
        
        // Apply layout calculations
        const enhancedConfig = applyLayoutCalculations(config, container);
        
        // Create chart structure with calculated dimensions
        const chartHTML = `
            <div class="tariff-chart-container">
                <div class="chart-title">${enhancedConfig.title || ''}</div>
                <div class="chart-visualization">
                    <svg id="${containerId}-svg" width="100%" height="${enhancedConfig.dimensions.height}" viewBox="${enhancedConfig.dimensions.viewBox}"></svg>
                </div>
                <div class="chart-visualization-container">
                    <div id="${containerId}-legend" class="chart-legend"></div>
                </div>
                <div class="chart-notes">
                    ${enhancedConfig.note ? `<p><strong>Note:</strong> ${enhancedConfig.note}</p>` : ''}
                    ${enhancedConfig.source ? `<p><strong>Source:</strong> ${enhancedConfig.source}</p>` : ''}
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
        
        // Create chart area with calculated transform
        const chartArea = document.createElementNS("http://www.w3.org/2000/svg", "g");
        chartArea.setAttribute('transform', enhancedConfig.transform);
        svg.appendChild(chartArea);
        
        // Store margins on the SVG element for other functions to access
        svg.__chartMargins = enhancedConfig.margin;
        
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
            width: enhancedConfig.chartArea.width,
            height: enhancedConfig.chartArea.height,
            margin: enhancedConfig.margin,
            config: enhancedConfig
        };
    }
    
    /**
     * Dynamically adjust chart for mobile devices
     * @param {Object} config - Chart configuration
     * @returns {Object} Modified config for mobile devices
     */
    function optimizeForMobile(config) {
        // Clone the config to avoid modifying the original
        const mobileConfig = { ...config };
        
        // Check if we're on a mobile device
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // Simplify legend for mobile
            if (!mobileConfig.legendConfig) {
                mobileConfig.legendConfig = {};
            }
            mobileConfig.legendConfig.itemsPerRow = 1;
            mobileConfig.legendConfig.maxRows = 4;
            
            // Increase font size for better touchability
            if (!mobileConfig.fontSizes) {
                mobileConfig.fontSizes = {};
            }
            mobileConfig.fontSizes.labels = 14;
            mobileConfig.fontSizes.title = 16;
            
            // Force vertical x-axis labels on very small screens
            if (window.innerWidth < 480 && mobileConfig.xAxis) {
                mobileConfig.xAxis.labelAngle = -90;
            }
            
            // Adjust margins for mobile
            if (!mobileConfig.margin) {
                mobileConfig.margin = {};
            }
            mobileConfig.margin.bottom = 100; // More space for vertical labels
        }
        
        return mobileConfig;
    }

    // Public API
    return {
        calculateSVGDimensions,
        calculateMargins,
        calculateTransform,
        applyLayoutCalculations,
        calculateOptimalLabelAngle,
        createResponsiveChartContainer,
        optimizeForMobile
    };
})();