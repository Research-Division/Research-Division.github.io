/*
 * Chart Utilities
 * Facade for accessing modular chart utility functions
 */

// Global chart settings
window.chartSettings = {
    // Animation duration in seconds
    animationDuration: window.chartAnimationDuration || 0.8,
    // Point styles
    pointRadius: 4,
    pointHoverRadius: 6,
    // Tooltip settings
    tooltipHeight: 30,
    tooltipPadding: 20,
    // Number format mode for tooltips (expanded, abbreviated, or scientific)
    tooltipFormatMode: 'expanded'
};

// Global format toggle for chart tooltips
window.toggleTooltipFormat = function(newMode) {
    // Valid modes: 'expanded', 'abbreviated', 'scientific'
    if (['expanded', 'abbreviated', 'scientific'].includes(newMode)) {
        window.chartSettings.tooltipFormatMode = newMode;
        
        // Dispatch a custom event that charts can listen for
        const event = new CustomEvent('tooltipFormatChanged', { 
            detail: { formatMode: newMode } 
        });
        document.dispatchEvent(event);
        
        return true;
    }
    return false;
};

// Ensure chartAnimationDuration and chartSettings are in sync
window.chartAnimationDuration = window.chartSettings.animationDuration;

// Create a facade that provides access to all chart utilities from one place
window.chartUtils = (function() {
    // Define module paths for easy maintenance
    const MODULE_PATHS = {
        animation: 'sparksAnimationUtils',
        create: 'sparksCreateChartUtils',
        color: 'sparksColorUtils',
        update: 'sparksUpdateChartUtils',
        config: 'sparksChartConfigManager',
        tooltip: 'sparksTooltipManager'
    };
    
    // Check if required modules are loaded
    function ensureModulesLoaded() {
        const requiredModules = Object.values(MODULE_PATHS);
        const missingModules = requiredModules.filter(module => !window[module]);
        
        if (missingModules.length > 0) {
            console.error(`Missing required modules: ${missingModules.join(', ')}`);
            console.error('Make sure to include the required module scripts in the correct order.');
            return false;
        }
        
        return true;
    }
    
    // Return the facade object with references to all utility functions
    return {
        // Animation utilities
        drawAnimatedLineSeries: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.animation].drawAnimatedLineSeries(...args);
        },
        
        // UI creation utilities
        createScale: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.create].createScale(...args);
        },
        
        createTooltipContainer: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.create].createTooltipContainer(...args);
        },
        
        createFormatToggle: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.create].createFormatToggle(...args);
        },
        
        createInteractiveLegend: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.create].createInteractiveLegend(...args);
        },
        
        // Color utilities
        updateChartHighlighting: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.color].updateChartHighlighting(...args);
        },
        
        getChartColor: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.color].getChartColor(...args);
        },
        
        getBilatColor: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.color].getBilatColor(...args);
        },
        
        // Chart update utilities
        updateChart: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.update].updateChart(...args);
        },
        
        registerChartType: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.update].registerChartType(...args);
        },
        
        getMetricInfo: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.update].getMetricInfo(...args);
        },
        
        getChartConfigForMetric: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.update].getChartConfigForMetric(...args);
        },
        
        showPlaceholder: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.update].showPlaceholder(...args);
        },
        
        // Chart configuration utilities
        loadChartConfig: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.config].loadConfig(...args);
        },
        
        getChartConfig: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.config].getChartConfig(...args);
        },
        
        getChartColors: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.config].getColors(...args);
        },
        
        getMetricInfo: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.config].getMetricInfo(...args);
        },
        
        ensureConfigLoaded: async function() {
            if (!ensureModulesLoaded()) return false;
            
            // Only load if we haven't already loaded
            if (!window.chartConfig) {
                //console.log('Loading chart configuration via ConfigManager');
                try {
                    await window[MODULE_PATHS.config].loadConfig();
                    return true;
                } catch (error) {
                    console.error('Failed to load chart configuration:', error);
                    return false;
                }
            }
            
            return true;
        },
        
        // Style management functions - delegated to sparksStyleManager
        setActiveStyle: function(...args) {
            return window.sparksStyleManager ? window.sparksStyleManager.setActiveStyle(...args) : false;
        },
        
        getActiveStyle: function() {
            return window.sparksStyleManager ? window.sparksStyleManager.getActiveStyle() : 'standard';
        },
        
        // Tooltip management functions
        formatTooltipValue: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.tooltip] ? window[MODULE_PATHS.tooltip].formatTooltipValue(...args) : null;
        },
        
        createTooltipFormatter: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.tooltip] ? window[MODULE_PATHS.tooltip].createTooltipFormatter(...args) : null;
        },
        
        createTooltip: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.tooltip] ? window[MODULE_PATHS.tooltip].createTooltip(...args) : null;
        },
        
        createLineTooltip: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.tooltip] ? window[MODULE_PATHS.tooltip].createLineTooltip(...args) : null;
        },
        
        processTooltipTemplate: function(...args) {
            if (!ensureModulesLoaded()) return null;
            return window[MODULE_PATHS.tooltip] ? window[MODULE_PATHS.tooltip].processTooltipTemplate(...args) : null;
        }
    };
})();