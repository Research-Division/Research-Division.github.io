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
    
    // Chart Wiz Style setting
    window.useChartWizStyle = false; // Default to false
    
    // Function to toggle Chart Wiz Style
    function toggleChartWizStyle(enabled) {
        // Store the setting globally for backward compatibility
        window.useChartWizStyle = enabled;
        //console.log('Chart Wiz Style set to:', enabled);
        
        // Use the new Style Manager if available
        if (window.sparksStyleManager) {
            window.sparksStyleManager.toggleChartWizStyle(enabled);
            return;
        }
        
        // Fallback to old implementation for backward compatibility
        
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
    
    // Legacy function name for backward compatibility
    window.applyChartWizStyleToNewChart = function(chartContainer) {
        // Use a small delay to ensure the chart is fully rendered
        setTimeout(() => {
            // Apply the currently active style configuration to this new chart
            applyStyleConfigToChart(chartContainer);
        }, 100);
    };
    
    // Expose public functions
    return { 
        toggleChartWizStyle: toggleChartWizStyle,
        applyStyleToChart: applyStyleConfigToChart
    };
})();