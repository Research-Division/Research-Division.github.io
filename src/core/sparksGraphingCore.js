/**
 * Sparks Graphing Core Functionality
 * Coordinator for modular chart components
 */

// Sparks Graphing Core module
window.sparksGraphingCore = (function() {
    // Private state and utility variables
    let isInitialized = false;
    
    /**
     * Initializes the core chart functionality and sub-modules
     * @throws {Error} If required dependencies are missing
     */
    function initialize() {        
        // Prevent multiple initializations
        if (isInitialized) {
            return;
        }
        
        // Set up event listeners for global chart events
        document.addEventListener('tooltipFormatChanged', handleTooltipFormatChange);
        
        // Initialize sub-modules
        if (window.sparksDecorationComponent && window.sparksDecorationComponent.initialize) {
            window.sparksDecorationComponent.initialize();
        } else {
            console.warn('Decoration component not available for initialization');
        }
        
        isInitialized = true;
    }
    
    /**
     * Handles tooltip format change events
     * @param {CustomEvent} event - The tooltipFormatChanged event
     */
    function handleTooltipFormatChange(event) {
        // Could trigger chart redraw or other actions here
    }
    
    // CSS loading function removed per request
    
    // Helper function to find the correct component
    function getComponent(newName, oldName) {
        return window[newName] || window[oldName];
    }
    
    // Public API - expose functions from all modules
    return {
        // Initialize
        initialize,
        
        // From axis component
        calculateAxisRanges: function(config) {
            const axisModule = getComponent('sparksAxisComponent', 'sparksAxisUtils');
            return axisModule.calculateAxisRanges(config);
        },
        createScales: function(width, height, ranges, config) {
            const axisModule = getComponent('sparksAxisComponent', 'sparksAxisUtils');
            return axisModule.createScales(width, height, ranges, config);
        },
        drawAxes: function(chartArea, width, height, ranges, scales, config) {
            const axisModule = getComponent('sparksAxisComponent', 'sparksAxisUtils');
            axisModule.drawAxes(chartArea, width, height, ranges, scales, config);
        },
        drawCategoricalAxes: function(chartArea, width, height, ranges, scales, config) {
            const axisModule = getComponent('sparksAxisComponent', 'sparksAxisUtils');
            axisModule.drawCategoricalAxes(chartArea, width, height, ranges, scales, config);
        },
        drawXAxisLine: function(chartArea, width, height) {
            const axisModule = getComponent('sparksAxisComponent', 'sparksAxisUtils');
            axisModule.drawXAxisLine(chartArea, width, height);
        },
        
        // From UI component
        createChartContainer: function(containerId, config) {
            const uiModule = getComponent('sparksUIComponent', 'sparksUIUtils');
            return uiModule.createChartContainer(containerId, config);
        },
        createChartTooltip: function(tooltipsContainer, x, y, width, height, xValue, yValue, seriesName, color, config) {
            const uiModule = getComponent('sparksUIComponent', 'sparksUIUtils');
            return uiModule.createChartTooltip(tooltipsContainer, x, y, width, height, xValue, yValue, seriesName, color, config);
        },
        createLegend: function(containerId, config) {
            const uiModule = getComponent('sparksUIComponent', 'sparksUIUtils');
            uiModule.createLegend(containerId, config);
        },
        applyChartStyle: function(containerId) {
            const uiModule = getComponent('sparksUIComponent', 'sparksUIUtils');
            uiModule.applyChartStyle(containerId);
        },
        
        // Color management - primarily from sparksColorUtils, falling back to decoration component
        getColorForIndex: function(index) {
            // Try to use sparksColorUtils directly
            if (window.sparksColorUtils && window.sparksColorUtils.getChartColor) {
                return window.sparksColorUtils.getChartColor(index);
            }
            
            // Fall back to decoration component for backward compatibility
            const decorationModule = getComponent('sparksDecorationComponent', 'sparksDecorationUtils');
            return decorationModule.getColorForIndex(index);
        },
        addChartIndicator: function(containerId, chartType) {
            const decorationModule = getComponent('sparksDecorationComponent', 'sparksDecorationUtils');
            decorationModule.addChartIndicator(containerId, chartType);
        },
        toggleChartIndicator: function(show) {
            const decorationModule = getComponent('sparksDecorationComponent', 'sparksDecorationUtils');
            decorationModule.toggleChartIndicator(show);
        },
        
        // From data component
        fetchWithCache: async function(url) {
            const dataModule = getComponent('sparksDataComponent', 'sparksDataUtils');
            return dataModule.fetchWithCache(url);
        }
    };
})();