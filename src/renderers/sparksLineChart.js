/**
 * Sparks Line Chart Renderer
 * Renders line charts using the core chart functionality
 */

// Sparks Line Chart function
window.sparksLineChart = function(containerId, config) {
    try {
        
        // Add containerId to config for reference
        config.containerId = containerId;
        
        // Create chart container and get dimensions
        // Support both new and old API names for backward compatibility
        const coreModule = window.sparksGraphingCore || window.chartCore;
        
        const chart = coreModule.createChartContainer(containerId, config);
        if (!chart) {
            // Check if container still exists before scheduling retry
            const container = document.getElementById(containerId);
            if (!container || container.offsetParent === null) {
                // Container is either removed or hidden, don't retry
                return;
            }
            
            // Limit retries to prevent infinite loops
            if (!config._retryCount) {
                config._retryCount = 1;
            } else {
                config._retryCount++;
                if (config._retryCount > 5) {
                    console.warn(`Exceeded maximum retries (5) for chart ${containerId}, canceling chart creation`);
                    return;
                }
            }
            
            // Handle error or schedule retry with timeout tracking
            const timeoutId = setTimeout(() => {
                window.sparksLineChart(containerId, config);
            }, 100);
            
            // Store timeout ID for potential cleanup
            if (!window._chartTimeouts) window._chartTimeouts = [];
            window._chartTimeouts.push(timeoutId);
            return;
        }
        
        const { chartArea, tooltipsContainer, width, height } = chart;
        
        // Calculate axis ranges
        const ranges = coreModule.calculateAxisRanges(config);
        
        // Create scale functions - pass the config for string-based x-axis
        const scales = coreModule.createScales(width, height, ranges, config);
        const { xScale, yScale } = scales;
        
        // Draw axes and grid
        coreModule.drawAxes(chartArea, width, height, ranges, scales, config);
        
        // Draw lines for each series
        config.series.forEach((series, seriesIndex) => {
            // Sort data points by x-value to ensure proper line drawing
            series.data.sort((a, b) => a.x - b.x);
            
            // Extract x and y values
            const xValues = series.data.map(point => point.x);
            const yValues = series.data.map(point => point.y);
            
            // Get the color for this series
            const color = series.color || coreModule.getColorForIndex(seriesIndex);
            
            // Use chartUtils to draw animated line series
            // Check for dashStyle property and pass it to the animation function
            const dashStyle = series.dashStyle || 'solid';
            
            // Use sparksAnimationUtils if available, otherwise fall back to legacy chartUtils
            const animationUtils = window.sparksAnimationUtils || window.chartUtils;
            
            // Create a custom config for this series, ensuring skipDots is passed through
            const seriesConfig = { ...config };
            // Add skipDots from the main config if it exists
            if (config.skipDots !== undefined) {
                seriesConfig.skipDots = config.skipDots;
            }
            
            animationUtils.drawAnimatedLineSeries(
                chartArea,
                xValues,
                yValues,
                xScale,
                yScale,
                color,
                series.name,
                '', // Tooltip prefix is handled by formatter
                '', // Tooltip suffix is handled by formatter
                width,
                tooltipsContainer,
                config.tooltipFormatter, // Pass custom formatter if provided
                seriesConfig, // Pass enhanced config with explicit skipDots setting
                dashStyle // Pass the dash style if specified
            );
        });
        
        // Create interactive legend
        coreModule.createLegend(containerId, config);
        
        // Apply any chart styling
        coreModule.applyChartStyle(containerId);
        
        // Add chart type indicator
        coreModule.addChartIndicator(containerId, 'Line Chart');
        
        // Remove and re-append the tooltip container LAST for proper z-index
        if (tooltipsContainer.parentNode) {
            tooltipsContainer.parentNode.removeChild(tooltipsContainer);
        }
        chartArea.appendChild(tooltipsContainer);
        
    } catch (error) {
        console.error('Error creating Sparks Line Chart:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `<div class="visualization-placeholder">Error creating chart: ${error.message}</div>`;
        }
    }
};

// Register with sparksGraphFunctions if it exists
if (window.sparksGraphFunctions) {
    window.sparksGraphFunctions.sparksLineChart = window.sparksLineChart;
}