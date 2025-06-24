/**
 * Country Bilateral Trade Relations Chart Component
 * 
 * Visualizes historical bilateral trade (imports and exports) between US and another country
 * Uses the modular sparksGraphFunctions library
 */

window.countryBilatTradeRelats = (function() {
    // Cache for trade data
    let cachedTradeData = null;
    
    /**
     * Create a time series chart showing bilateral trade relations between US and a country
     * 
     * @param {string} containerId - ID of the container element to render the chart in
     * @param {Object} config - Configuration object
     * @param {string} config.selectedCountry - ISO code of the country to visualize (default: 'CHN')
     * @param {string} config.selectedCountryName - Display name of the country (default: 'China')
     * @param {boolean} config.isShare - Whether to show trade shares instead of values (default: false)
     * @param {Object} options - Additional options
     * @param {string} options.dataPath - Path to the data file (default: 'data/trade_data/chart_ready_country_series.json')
     * @param {Function} options.onSuccess - Callback function when chart creation succeeds
     * @param {Function} options.onError - Callback function when chart creation fails
     */
    async function createChart(containerId, config = {}, options = {}) {
        const defaultConfig = {
            selectedCountry: 'CHN',
            selectedCountryName: 'China',
            isShare: false
        };
        
        const defaultOptions = {
            dataPath: window.DataPaths.trade_data.country_series,
            onSuccess: null,
            onError: null
        };
        
        const effectiveConfig = {...defaultConfig, ...config};
        const effectiveOptions = {...defaultOptions, ...options};
        
        try {
            // Get chart container
            const chartContainer = document.getElementById(containerId);
            if (!chartContainer) {
                throw new Error(`Container with ID "${containerId}" not found`);
            }
            
            // Clear the container
            chartContainer.innerHTML = '';
            
            // If no country is selected, show placeholder
            if (!effectiveConfig.selectedCountry) {
                chartContainer.innerHTML = '<div class="visualization-placeholder">Please select a country to view bilateral trade data.</div>';
                return;
            }
            
            // Show loading state
            chartContainer.innerHTML = '<div class="visualization-placeholder">Loading bilateral trade data...</div>';
            
            // Determine metrics based on isShare flag
            const importMetric = effectiveConfig.isShare ? 'impShare' : 'impVal';
            const exportMetric = effectiveConfig.isShare ? 'expShare' : 'expVal';
            
            // Load data
            try {
                // Load trade data
                const allData = await loadTradeData(effectiveOptions.dataPath);
                
                if (!allData) {
                    throw new Error('Failed to load trade data');
                }
                
                // Find import data for selected country
                const importData = allData.find(d => 
                    d.metric === importMetric && d.iso3 === effectiveConfig.selectedCountry
                );
                
                // Find export data for selected country
                const exportData = allData.find(d => 
                    d.metric === exportMetric && d.iso3 === effectiveConfig.selectedCountry
                );
                
                if (!importData || !exportData) {
                    chartContainer.innerHTML = `<div class="visualization-placeholder">No bilateral trade data available for ${effectiveConfig.selectedCountryName}.</div>`;
                    return;
                }
                
                // Format data for sparksLineChart
                const series = [];
                
                // Process import data
                if (importData && importData.data) {
                    const importSeries = processTradeData(importData.data);
                    
                    if (importSeries.length > 0) {
                        series.push({
                            name: `Imports from ${effectiveConfig.selectedCountryName}`,
                            data: importSeries,
                            color: 'var(--excellenceOrange, #ff9900)'  // Use excellenceOrange for imports
                        });
                    }
                }
                
                // Process export data
                if (exportData && exportData.data) {
                    const exportSeries = processTradeData(exportData.data);
                    
                    if (exportSeries.length > 0) {
                        series.push({
                            name: `Exports to ${effectiveConfig.selectedCountryName}`,
                            data: exportSeries,
                            color: 'var(--primary, #0066cc)'  // Use primary color for exports
                        });
                    }
                }
                
                // Hide loading state
                chartContainer.innerHTML = '';
                
                // If we have no series data, show message
                if (series.length === 0) {
                    chartContainer.innerHTML = `<div class="visualization-placeholder">No bilateral trade data available for ${effectiveConfig.selectedCountryName}.</div>`;
                    return;
                }
                
                // Create chart configuration
                const chartConfig = createChartConfig(effectiveConfig, series);
                
                // Pass skipDots option from effectiveOptions to chartConfig
                if (effectiveOptions.skipDots !== undefined) {
                    chartConfig.skipDots = effectiveOptions.skipDots;
                }
                
                // Create chart using sparksLineChart
                if (window.sparksGraphFunctions && window.sparksGraphFunctions.sparksLineChart) {
                    window.sparksGraphFunctions.sparksLineChart(containerId, chartConfig);
                } else if (window.sparksLineChart) {
                    window.sparksLineChart(containerId, chartConfig);
                } else {
                    throw new Error('sparksLineChart function not available');
                }
                
                // Call success callback if provided
                if (typeof effectiveOptions.onSuccess === 'function') {
                    effectiveOptions.onSuccess(chartConfig);
                }
                
                return chartConfig;
                
            } catch (error) {
                console.error('Error loading or processing trade data:', error);
                chartContainer.innerHTML = `<div class="visualization-placeholder">Error loading data: ${error.message}</div>`;
                
                // Call error callback if provided
                if (typeof effectiveOptions.onError === 'function') {
                    effectiveOptions.onError(error);
                }
                
                return null;
            }
            
        } catch (error) {
            console.error('Error creating bilateral trade chart:', error);
            
            // Show error message in container
            try {
                const chartContainer = document.getElementById(containerId);
                if (chartContainer) {
                    chartContainer.innerHTML = `
                        <div class="chart-error">
                            <h3>Error Creating Chart</h3>
                            <p>${error.message}</p>
                        </div>
                    `;
                }
            } catch (displayError) {
                console.error('Error displaying error message:', displayError);
            }
            
            // Call error callback if provided
            if (typeof effectiveOptions.onError === 'function') {
                effectiveOptions.onError(error);
            }
            
            return null;
        }
    }
    
    /**
     * Process trade data into format expected by chart
     * 
     * @param {Array} data - Array of trade data points (year/value pairs)
     * @returns {Array} Formatted data for chart
     */
    function processTradeData(data) {
        const processedData = [];
        
        // Filter valid points and convert to x,y format
        data.forEach(point => {
            if (point.value !== null && point.value !== undefined) {
                processedData.push({
                    x: point.year,
                    y: point.value
                });
            }
        });
        
        // Sort by year to ensure proper line drawing
        processedData.sort((a, b) => a.x - b.x);
        
        return processedData;
    }
    
    /**
     * Create chart configuration based on settings
     * 
     * @param {Object} config - User configuration
     * @param {Array} series - Series data for the chart
     * @returns {Object} Chart configuration
     */
    function createChartConfig(config, series) {
        const isShare = config.isShare;
        
        // Determine the metric based on isShare flag
        const metric = isShare ? 'share' : 'value';
        
        // Create tooltip formatter function consistent with other chart types
        const tooltipFormatter = isShare
            ? (value) => `${value.toFixed(1)}%`  // Format percentage values
            : (value) => window.formatUtils && window.formatUtils.formatCurrency
                ? window.formatUtils.formatCurrency(value, { useSuffix: true })  // Use abbreviated format (K/M/B)
                : `$${value.toLocaleString()}`;  // Fallback
        
        return {
            title: `<strong>Figure 1.</strong> Bilateral Trade with ${config.selectedCountryName}`,
            subtitle: `This chart shows the historical ${isShare ? 'trade shares' : 'trade values'} between the US and ${config.selectedCountryName}. Import values as appraised by U.S. Customs, excluding import duties, freight, and insurance for general imports. Export values defined as the total value of the goods for export at the U.S. port of export`,
            chartType: 'bilat-trade',
            metric: metric,  // Set the metric to connect with chartConfig.json configuration
            xAxis: {
                title: 'Year',
                type: 'number'
            },
            yAxis: {
                title: isShare ? 'Trade Share (%)' : 'Trade Value (USD)',
                type: 'number',
                min: 0
            },
            series: series,
            tooltipFormatter: tooltipFormatter,  // Add explicit tooltip formatter
            percentageConfig: {
                valuesArePercentages: isShare
            },
            formatter: isShare ? 'percentage' : 'currency',  // Specify the formatter to use
            legendConfig: {
                useLines: true,
                itemsPerRow: 2,
                maxRows: 1
            },
            sourceNote: "US Census Bureau's USA Trade Online"
        };
    }
    
    /**
     * Load trade data from the specified path
     * 
     * @param {string} dataPath - Path to the data file
     * @returns {Promise<Array>} Promise resolving to an array of trade data
     */
    async function loadTradeData(dataPath) {
        try {
            // Return cached data if available
            if (cachedTradeData) {
                return cachedTradeData;
            }
            
            // Otherwise, attempt to load the data from the server
            const response = await fetch(dataPath);
            if (!response.ok) {
                throw new Error(`Failed to load trade data: ${response.status} ${response.statusText}`);
            }
            
            cachedTradeData = await response.json();
            return cachedTradeData;
        } catch (error) {
            console.error('Error loading trade data:', error);
            return null;
        }
    }
    
    /**
     * Clear the data cache to force reloading
     */
    function clearCache() {
        cachedTradeData = null;
    }
    
    // Public API
    return {
        createChart,
        loadTradeData,
        clearCache
    };
})();