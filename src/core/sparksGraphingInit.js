/**
 * Sparks Graphing Functions
 * Main module that initializes and coordinates the charting system
 */

// Sparks Graph Functions module
window.sparksGraphFunctions = (function() {
    // Private variables
    let currentChartConfig = null;
    
    // Initialize the component
    function initialize() {
        
        // Initialize style manager if available
        if (window.sparksStyleManager && window.sparksStyleManager.initialize) {
            window.sparksStyleManager.initialize();
        }
        
        // Initialize core module
        if (window.sparksGraphingCore && window.sparksGraphingCore.initialize) {
            window.sparksGraphingCore.initialize();
        } else {
            console.warn('Backward compatibility: Trying to initialize with chartCore');
            if (window.chartCore && window.chartCore.initialize) {
                window.chartCore.initialize();
            }
        }
    }
    
    /**
     * Creates a chart with sample data
     * @param {string} containerId - ID of the container element
     */
    function createSampleDataChart(containerId) {
        if (window.sparksGraphingCore && window.sparksGraphingCore.createSampleDataChart) {
            window.sparksGraphingCore.createSampleDataChart(containerId);
        } else if (window.chartCore && window.chartCore.createSampleDataChart) {
            // Backward compatibility
            window.chartCore.createSampleDataChart(containerId);
        } else {
            console.error('Graphing core module not available');
        }
    }
    
    /**
     * Toggle chart indicator visibility
     * @param {boolean} show - Whether to show or hide indicators
     */
    function toggleChartIndicator(show) {
        if (window.sparksGraphingCore && window.sparksGraphingCore.toggleChartIndicator) {
            window.sparksGraphingCore.toggleChartIndicator(show);
        } else if (window.chartCore && window.chartCore.toggleChartIndicator) {
            // Backward compatibility
            window.chartCore.toggleChartIndicator(show);
        } else {
            console.error('Graphing core module not available');
        }
    }
    
    // Create proxy functions for chart renderers
    // These will be overridden by the actual renderers when they load
    
    /**
     * Creates a line chart
     * @param {string} containerId - ID of the container element
     * @param {Object} config - Chart configuration
     */
    function sparksLineChart(containerId, config) {
        if (window.sparksLineChart) {
            window.sparksLineChart(containerId, config);
        } else {
            console.error('Line chart renderer not available');
            
            // Try to load the renderer
            const script = document.createElement('script');
            script.src = 'src/renderers/sparksLineChart.js';
            script.onload = () => {
                if (window.sparksLineChart) {
                    window.sparksLineChart(containerId, config);
                }
            };
            document.head.appendChild(script);
        }
    }
    
    /**
     * Creates a bar chart
     * @param {string} containerId - ID of the container element
     * @param {Object} config - Chart configuration
     */
    function sparksBarChart(containerId, config) {
        if (window.sparksBarChart) {
            window.sparksBarChart(containerId, config);
        } else {
            console.error('Bar chart renderer not available');
            
            // Try to load the renderer
            const script = document.createElement('script');
            script.src = 'src/renderers/sparksBarChart.js';
            script.onload = () => {
                if (window.sparksBarChart) {
                    window.sparksBarChart(containerId, config);
                }
            };
            document.head.appendChild(script);
        }
    }
    
    /**
     * Creates a tree map
     * @param {string} containerId - ID of the container element
     * @param {Object} config - Chart configuration
     */
    function sparksTreeMap(containerId, config) {
        if (window.sparksTreemapFinal && window.sparksTreemapFinal.sparksTreemap) {
            window.sparksTreemapFinal.sparksTreemap(containerId, config);
        } else {
            console.error('Tree map renderer not available');
            
            // Try to load the renderer
            const script = document.createElement('script');
            script.src = 'src/renderers/sparksTreemapFinal.js';
            script.onload = () => {
                if (window.sparksTreemapFinal && window.sparksTreemapFinal.sparksTreemap) {
                    window.sparksTreemapFinal.sparksTreemap(containerId, config);
                }
            };
            document.head.appendChild(script);
        }
    }
    
    // Public API
    return {
        initialize,
        sparksLineChart,
        sparksBarChart,
        sparksTreeMap,
        toggleChartIndicator
    };
})();

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.sparksGraphFunctions.initialize();
});