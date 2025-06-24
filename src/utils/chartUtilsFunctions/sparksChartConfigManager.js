/*
 * Sparks Chart Configuration Manager
 * Manages chart text content and configuration from centralized config files
 * Works alongside sparksStyleManager which handles the visual styling
 */

window.sparksChartConfigManager = (function() {
    // Default configuration to use if none is loaded
    let chartConfig = {
        chartTypes: {},
        formatters: {},
        colors: {
            default: ['var(--blue1)', 'var(--green1)', 'var(--yellow1)']
        }
    };
    
    /**
     * Load the chart configuration from a JSON file
     * 
     * @param {string} configPath - Path to the configuration file
     * @returns {Promise} - Promise that resolves when config is loaded
     */
    // Would this be better as a DataPath? 
    async function loadConfig(configPath = 'src/utils/chartConfig.json') {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                console.error(`Failed to load chart config: ${response.status} ${response.statusText}`);
                return false;
            }
            
            chartConfig = await response.json();
            //console.log('Chart configuration loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading chart configuration:', error);
            return false;
        }
    }
    
    /**
     * Get a complete chart configuration based on chart type, metric, and style
     * 
     * @param {string} chartType - Type of chart (e.g., 'country', 'industry')
     * @param {Object} options - Configuration options
     * @param {string} options.metric - Metric to display (e.g., 'impVal', 'impShare')
     * @param {number} options.numTop - Number of top items to display
     * @param {string} options.style - Style name to use for content variations (e.g., 'standard', 'chartWiz')
     * @returns {Object} Complete chart configuration
     */
    function getChartConfig(chartType, options = {}) {
        const defaultOptions = {
            metric: 'impVal',
            numTop: 5,
            style: window.sparksStyleManager ? window.sparksStyleManager.getActiveStyle() : 'standard'
        };
        
        // Merge default options with provided options
        const config = { ...defaultOptions, ...options };
        
        // Start with an empty configuration
        const chartConfiguration = {
            xAxis: { title: '', type: 'number' },
            yAxis: { title: '', type: 'number', min: 0 },
            series: [],
            legendConfig: {}
        };
        
        // Get chart type configuration
        const typeConfig = chartConfig.chartTypes && chartConfig.chartTypes[chartType];
        if (!typeConfig) {
            //console.warn(`No configuration found for chart type: ${chartType}`);
            return chartConfiguration;
        }
        
        // Special handling for chart types that have defaults and aggregation structure
        if (chartType === 'bilat-tariff-bar' || chartType === 'bilat-tariff-time-series') {
            // First, apply defaults if available
            if (typeConfig.defaults) {
                // Apply defaults to base configuration
                Object.entries(typeConfig.defaults).forEach(([key, value]) => {
                    if (key === 'xAxis' || key === 'yAxis' || key === 'barConfig' || key === 'percentageConfig' || key === 'margin') {
                        // Merge objects for nested configurations
                        chartConfiguration[key] = {...chartConfiguration[key], ...value};
                    } else if (key === 'svgHeight' || key === 'transform' || key === 'preserveXOrder' || key === 'postRender') {
                        // Always pass through critical layout properties
                        chartConfiguration[key] = value;
                        //console.log(`Setting critical layout property: ${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`);
                    } else if (key === 'legendLines') {
                        chartConfiguration.legendConfig.useLines = value === true || value === 'true';
                    } else if (key === 'legendItemsPerRow') {
                        chartConfiguration.legendConfig.itemsPerRow = parseInt(value, 10) || 2;
                    } else if (key === 'legendMaxRows') {
                        chartConfiguration.legendConfig.maxRows = parseInt(value, 10) || 1;
                    } else if (key === 'xAxisTitle') {
                        chartConfiguration.xAxis.title = value;
                    } else {
                        chartConfiguration[key] = value;
                    }
                });
                
                // Check if we have formatter in defaults and set up tooltip formatter
                if (typeConfig.defaults.formatter && chartConfig.formatters && 
                    chartConfig.formatters[typeConfig.defaults.formatter]) {
                    const formatterConfig = chartConfig.formatters[typeConfig.defaults.formatter];
                    chartConfiguration.tooltipFormatter = createFormatter(formatterConfig);
                }
            }
            
            // Then apply aggregation-specific config if available
            if (config.aggregation && typeConfig.aggregation && typeConfig.aggregation[config.aggregation]) {
                const aggregationConfig = typeConfig.aggregation[config.aggregation];
                
                // Apply aggregation specific config
                Object.entries(aggregationConfig).forEach(([key, value]) => {
                    if (key === 'xAxis' || key === 'yAxis') {
                        // Merge objects for nested configurations
                        chartConfiguration[key] = {...chartConfiguration[key], ...value};
                    } else if (key === 'postRender' && typeof value === 'object') {
                        // Merge postRender configuration
                        chartConfiguration.postRender = {...(chartConfiguration.postRender || {}), ...value};
                        //console.log(`Applied aggregation-specific postRender config: ${JSON.stringify(chartConfiguration.postRender)}`);
                    } else if (key === 'legendLines') {
                        chartConfiguration.legendConfig.useLines = value === true || value === 'true';
                    } else if (key === 'legendItemsPerRow') {
                        chartConfiguration.legendConfig.itemsPerRow = parseInt(value, 10) || 2;
                    } else if (key === 'legendMaxRows') {
                        chartConfiguration.legendConfig.maxRows = parseInt(value, 10) || 1;
                    } else if (key === 'xAxisTitle') {
                        chartConfiguration.xAxis.title = value;
                    } else {
                        chartConfiguration[key] = value;
                    }
                });
            }
            
            // Process any text content that might have placeholders
            Object.entries(chartConfiguration).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    // Replace country placeholder
                    if (config.country) {
                        chartConfiguration[key] = value.replace(/\{\{country\}\}/g, config.country);
                    }
                    
                    // Replace tariffMethod placeholder
                    if (config.tariffMethod) {
                        const formattedMethod = config.tariffMethod.replace('_', ' ');
                        chartConfiguration[key] = chartConfiguration[key].replace(/\{\{tariffMethod\}\}/g, formattedMethod);
                    }
                }
            });
            
            return chartConfiguration;
        }
        
        // Add defaults for the chart type (for regular charts)
        if (typeConfig.defaults) {
            Object.entries(typeConfig.defaults).forEach(([key, value]) => {
                // Handle special cases for legend configuration
                if (key === 'legendLines') {
                    chartConfiguration.legendConfig.useLines = value;
                } else if (key === 'legendItemsPerRow') {
                    chartConfiguration.legendConfig.itemsPerRow = value;
                } else if (key === 'legendMaxRows') {
                    chartConfiguration.legendConfig.maxRows = value;
                } else if (key === 'xAxisTitle') {
                    chartConfiguration.xAxis.title = value;
                } else {
                    chartConfiguration[key] = value;
                }
            });
        }
        
        // Add metric-specific configuration (for regular charts)
        const metricConfig = typeConfig.metrics && typeConfig.metrics[config.metric];
        if (metricConfig) {
            // Process titles with style variations
            const styleKey = `_${config.style}`;
            
            // Title - use style-specific title if available
            chartConfiguration.title = metricConfig[`title${styleKey}`] || metricConfig.title || '';
            
            // Y-axis title - use style-specific title if available
            chartConfiguration.yAxis.title = metricConfig[`yAxisTitle${styleKey}`] || metricConfig.yAxisTitle || '';
            
            // Note text - replace placeholders
            if (metricConfig.note) {
                chartConfiguration.note = metricConfig.note.replace(/\{\{numTop\}\}/g, config.numTop);
            }
            
            // Add formatter based on metric configuration
            if (metricConfig.formatter && chartConfig.formatters && chartConfig.formatters[metricConfig.formatter]) {
                const formatterConfig = chartConfig.formatters[metricConfig.formatter];
                
                chartConfiguration.tooltipFormatter = createFormatter(formatterConfig);
                
                // Add percentage configuration if applicable
                if (metricConfig.isPercentage) {
                    chartConfiguration.percentageConfig = {
                        valuesArePercentages: true
                    };
                }
            }
        }
        
        return chartConfiguration;
    }
    
    /**
     * Create a formatter function based on formatter configuration
     * 
     * @param {Object} formatterConfig - Formatter configuration
     * @returns {Function} Formatter function
     */
    function createFormatter(formatterConfig) {
        return function(value) {
            let formattedValue;
            
            // Use the appropriate formatter function
            if (formatterConfig.function === 'formatCurrency' && window.formatUtils) {
                // For currency formatter specifically, handle the prefix carefully:
                // If formatterConfig already has a prefix, let formatCurrency NOT add a prefix
                // Otherwise let formatCurrency add the prefix
                const shouldIncludePrefix = !formatterConfig.prefix;
                
                try {
                    // Check if value is a valid number before formatting
                    if (typeof value === 'number' && !isNaN(value)) {
                        formattedValue = window.formatUtils.formatCurrency(value, { 
                            includePrefix: shouldIncludePrefix
                        });
                    } else {
                        console.warn('Attempted to format non-number value as currency:', value);
                        formattedValue = 'N/A';
                    }
                } catch (e) {
                    console.warn('Error formatting currency:', e);
                    formattedValue = 'N/A';
                }
            } else if (formatterConfig.function === 'formatNumber') {
                // Simple number formatting with safety check
                try {
                    // Check if value is a valid number before using toFixed
                    if (typeof value === 'number' && !isNaN(value)) {
                        formattedValue = value.toFixed(formatterConfig.decimals);
                    } else {
                        console.warn('Attempted to format non-number value:', value);
                        formattedValue = 'N/A';
                    }
                } catch (e) {
                    console.warn('Error formatting number:', e);
                    formattedValue = 'N/A';
                }
            } else {
                // String formatting with safety check
                try {
                    if (value != null) {
                        formattedValue = value.toString();
                    } else {
                        formattedValue = 'N/A';
                    }
                } catch (e) {
                    console.warn('Error converting value to string:', e);
                    formattedValue = 'N/A';
                }
            }
            
            // Add prefix and suffix
            return `${formatterConfig.prefix || ''}${formattedValue}${formatterConfig.suffix || ''}`;
        };
    }
    
    /**
     * Get color array for chart series
     * 
     * @param {string} colorSet - Name of color set to use (default: 'default')
     * @returns {Array} Array of color values
     */
    function getColors(colorSet = 'default') {
        if (chartConfig.colors && chartConfig.colors[colorSet]) {
            return chartConfig.colors[colorSet];
        }
        return chartConfig.colors.default || [];
    }
    
    /**
     * Get information about a specific metric
     * 
     * @param {string} chartType - Chart type
     * @param {string} metricKey - The metric identifier
     * @param {string} style - Style name for content variations
     * @return {Object|null} Metric information or null if not found
     */
    function getMetricInfo(chartType, metricKey, style = window.sparksStyleManager?.getActiveStyle() || 'standard') {
        if (!chartConfig.chartTypes || !chartConfig.chartTypes[chartType] || 
            !chartConfig.chartTypes[chartType].metrics || !chartConfig.chartTypes[chartType].metrics[metricKey]) {
            return null;
        }
        
        const metricConfig = chartConfig.chartTypes[chartType].metrics[metricKey];
        const styleKey = `_${style}`;
        
        // Create a modified copy with style-specific titles
        return {
            ...metricConfig,
            title: metricConfig[`title${styleKey}`] || metricConfig.title,
            yAxisTitle: metricConfig[`yAxisTitle${styleKey}`] || metricConfig.yAxisTitle
        };
    }
    
    // Return the public API
    return {
        loadConfig,
        getChartConfig,
        getColors,
        getMetricInfo
    };
})();