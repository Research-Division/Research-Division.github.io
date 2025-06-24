/*
 * Sparks Update Chart Utilities
 * Provides a generalized framework for updating charts with new data or settings
 */

window.sparksUpdateChartUtils = (function() {
    // Registry to store chart update handlers by type
    const chartUpdateRegistry = {};
    
    // Default configuration values
    const DEFAULT_CONFIG = {
        metric: 'impVal',
        numTop: 5,
        chartContainer: 'chart-container'
    };
    
    // REMOVED: Hardcoded metric info has been moved to chartConfig.json
    // The getMetricInfo function now uses the ChartConfigManager
    
    /**
     * Core function to update a chart based on chart type and configuration
     * 
     * @param {string} chartType - The type of chart to update
     * @param {Object} config - Configuration parameters
     * @param {string} config.metric - Data metric to display (impVal, impShare, etc.)
     * @param {number} config.numTop - Number of top items to display
     * @param {string} config.chartContainer - ID of container element
     * @param {Object} config.styles - Chart style configuration
     * @return {boolean} Success status
     */
    function updateChart(chartType, config = {}) {
        // Merge default config with provided config
        const effectiveConfig = {
            ...DEFAULT_CONFIG,
            ...config
        };
        
        //console.log(`Updating ${chartType} chart with metric: ${effectiveConfig.metric}`);
        
        // Clear any existing placeholder
        const placeholder = document.getElementById('visualization-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Get the registered update handler for this chart type
        const updateHandler = chartUpdateRegistry[chartType];
        
        if (updateHandler) {
            try {
                // Call the registered handler with the configuration
                updateHandler(effectiveConfig);
                return true;
            } catch (error) {
                console.error(`Error updating ${chartType} chart:`, error);
                showPlaceholder(`Error updating chart: ${error.message}`);
                return false;
            }
        } else {
            console.error(`No update handler registered for chart type: ${chartType}`);
            showPlaceholder(`Chart type not supported: ${chartType}`);
            return false;
        }
    }
    
    /**
     * Register a new chart update handler
     * 
     * @param {string} chartType - Type identifier for the chart
     * @param {Function} handler - Handler function to call with config when updating
     */
    function registerChartType(chartType, handler) {
        if (typeof handler !== 'function') {
            console.error('Chart update handler must be a function');
            return false;
        }
        
        chartUpdateRegistry[chartType] = handler;
        //console.log(`Registered update handler for chart type: ${chartType}`);
        return true;
    }
    
    /**
     * Show a placeholder message in the visualization container
     * 
     * @param {string} message - Message to display
     */
    function showPlaceholder(message) {
        const placeholder = document.getElementById('visualization-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
            placeholder.textContent = message;
        }
    }
    
    /**
     * Get information about a specific metric
     * This function now uses the ChartConfigManager to get metric information
     * 
     * @param {string} metricKey - The metric identifier
     * @param {string} chartType - The chart type (default: 'country')
     * @return {Object|null} Metric information or null if not found
     */
    function getMetricInfo(metricKey, chartType = 'country') {
        // First try to use the ChartConfigManager
        if (window.sparksChartConfigManager && window.sparksChartConfigManager.getMetricInfo) {
            const metricInfo = window.sparksChartConfigManager.getMetricInfo(chartType, metricKey);
            if (metricInfo) {
                // Transform to the expected format for backward compatibility
                return {
                    label: metricInfo.label || metricKey,
                    yAxisTitle: metricInfo.yAxisTitle || '',
                    formatter: createFormatterFunction(metricInfo.formatter),
                    isPercentage: metricInfo.isPercentage === true
                };
            }
        }
        
        // Fallback for backward compatibility - use hardcoded defaults
        console.warn(`Metric ${metricKey} not found in configuration, using defaults`);
        
        // Return simple defaults based on metric name patterns
        if (metricKey.includes('Share') || metricKey.includes('share')) {
            return {
                label: metricKey,
                yAxisTitle: `${metricKey} (%)`,
                formatter: value => `${value.toFixed(1)}%`,
                isPercentage: true
            };
        } else {
            return {
                label: metricKey,
                yAxisTitle: metricKey,
                formatter: value => window.formatUtils ? window.formatUtils.formatNumber(value) : value.toString(),
                isPercentage: false
            };
        }
    }
    
    /**
     * Creates a formatter function based on formatter type
     * 
     * @param {string} formatterType - Type of formatter ('currency', 'percentage', etc.)
     * @return {Function} Formatter function
     */
    function createFormatterFunction(formatterType) {
        if (!formatterType) return value => value.toString();
        
        switch(formatterType) {
            case 'currency':
                return value => window.formatUtils ? window.formatUtils.formatCurrency(value) : value.toString();
                
            case 'percentage':
                return value => `${parseFloat(value).toFixed(1)}%`;
                
            case 'number':
                return value => window.formatUtils ? window.formatUtils.formatNumber(value) : value.toString();
                
            default:
                // If it's not a known formatter type, assume it's custom and return identity
                return value => value.toString();
        }
    }
    
    /**
     * Get a chart configuration object with the correct metric formatting
     * This function now tries to use the ChartConfigManager first for better configuration
     * 
     * @param {string} metric - The metric to use
     * @param {Object} baseConfig - Base configuration to extend
     * @param {string} chartType - The chart type (default: 'country')
     * @return {Object} Extended configuration with metric-specific settings
     */
    function getChartConfigForMetric(metric, baseConfig = {}, chartType = 'country') {
        // Try to use ChartConfigManager first if available - it handles all the config inheritance
        if (window.sparksChartConfigManager && window.sparksChartConfigManager.getChartConfig) {
            try {
                const chartConfig = window.sparksChartConfigManager.getChartConfig(chartType, {
                    metric: metric,
                    // Maintain any other options from baseConfig
                    ...baseConfig
                });
                
                if (chartConfig) {
                    //console.log(`Using ChartConfigManager for ${chartType} chart with metric ${metric}`);
                    return chartConfig;
                }
            } catch (error) {
                console.warn(`Error getting chart config from manager: ${error.message}`);
                // Continue with fallback approach
            }
        }
        
        // Legacy fallback approach using local getMetricInfo
        //console.log(`Using legacy approach for chart configuration for ${metric}`);
        const metricInfo = getMetricInfo(metric, chartType);
        if (!metricInfo) {
            console.warn(`Unknown metric: ${metric}, using default formatting`);
            return baseConfig;
        }
        
        // Create a deep copy of the base config
        const config = JSON.parse(JSON.stringify(baseConfig));
        
        // Update with metric-specific settings
        if (!config.yAxis) {
            config.yAxis = {};
        }
        
        config.yAxis.title = metricInfo.yAxisTitle;
        
        // Add percentage configuration if applicable
        if (metricInfo.isPercentage) {
            config.percentageConfig = {
                valuesArePercentages: true
            };
        }
        
        // Add tooltip formatter
        config.tooltipFormatter = metricInfo.formatter;
        
        return config;
    }
    
    // Return the public API
    return {
        updateChart,
        registerChartType,
        getMetricInfo,
        getChartConfigForMetric,
        showPlaceholder
    };
})();