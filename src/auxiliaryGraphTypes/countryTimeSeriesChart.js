/**
 * Country Time Series Chart Component
 * 
 * Visualizes historical trade data for countries over time
 * Uses the modular sparksGraphFunctions library
 */

window.countryTimeSeriesChart = (function() {
    // Cache for country data
    let countryDataCache = null;
    
    /**
     * Create a time series chart showing top countries by given metric
     * 
     * @param {string} containerId - ID of the container element to render the chart in
     * @param {string} metric - The metric to visualize ('impVal', 'impShare', 'expVal', 'expShare', 'trade_deficit')
     * @param {number} numTop - Number of top countries to include (default: 5)
     * @param {Object} options - Additional options
     * @param {string} options.dataPath - Path to the data file (default: 'data/trade_data/chart_ready_country_series.json')
     * @param {Function} options.onSuccess - Callback function when chart creation succeeds
     * @param {Function} options.onError - Callback function when chart creation fails
     */
    async function createChart(containerId, metric = 'impVal', numTop = 5, options = {}) {
        const defaultOptions = {
            dataPath: window.DataPaths.trade_data.country_series,
            onSuccess: null,
            onError: null
        };
        
        const effectiveOptions = {...defaultOptions, ...options};
        
        try {
            // Get chart container
            const chartContainer = document.getElementById(containerId);
            if (!chartContainer) {
                throw new Error(`Container with ID "${containerId}" not found`);
            }
            
            // Clear the container
            chartContainer.innerHTML = '';
            
            // Load data if not already cached
            const countryData = await loadCountryData(effectiveOptions.dataPath);
            
            // Get top countries data with the specified number
            const topCountriesData = getTopCountriesByMetric(countryData, metric, numTop);
            
            // Get chart configuration from the configuration manager
            const chartConfig = window.chartUtils.getChartConfig('country', {
                metric: metric,
                numTop: numTop
            });
            
            // Initialize series array if not present
            if (!chartConfig.series) {
                chartConfig.series = [];
            }
            
            // Get colors from configuration
            const colors = window.chartUtils.getChartColors();
            
            // Process each country's data into a series
            topCountriesData.forEach((country, index) => {
                // Convert data into the expected format
                const validData = country.data
                    .filter(d => d.value !== null && d.value !== undefined && !isNaN(d.value))
                    .sort((a, b) => a.year - b.year);
                
                // Transform into x,y point format
                const seriesData = validData.map(d => ({
                    x: d.year,
                    y: d.value
                }));
                
                // Add tooltip configuration for proper formatting
                const tooltipFormatter = metric === 'impShare' || metric === 'expShare'
                    ? (value) => `${value.toFixed(1)}%`  // Just add % suffix for shares
                    : (value) => window.formatUtils.formatCurrency(value); // Use currency formatting for values
                
                // Only add series with valid data
                if (seriesData.length > 0) {
                    chartConfig.series.push({
                        name: country.country,
                        color: colors[index % colors.length],
                        data: seriesData,
                        tooltipFormatter: tooltipFormatter
                    });
                }
            });
            
            // Pass skipDots option from effectiveOptions to chartConfig
            if (effectiveOptions.skipDots !== undefined) {
                chartConfig.skipDots = effectiveOptions.skipDots;
            }
            
            // Create the chart using our library
            if (window.sparksGraphFunctions && window.sparksGraphFunctions.sparksLineChart) {
                window.sparksGraphFunctions.sparksLineChart(containerId, chartConfig);
            } else if (window.sparksLineChart) {
                window.sparksLineChart(containerId, chartConfig);
            } else {
                throw new Error('Line chart renderer not available');
            }
            
            // Call success callback if provided
            if (typeof effectiveOptions.onSuccess === 'function') {
                effectiveOptions.onSuccess(chartConfig);
            }
            
            return chartConfig;
        } catch (error) {
            console.error('Error creating country time series chart:', error);
            
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
     * Load country trade data from data file
     * 
     * @param {string} dataPath - Path to the data file
     * @returns {Array} Array of country data objects
     */
    async function loadCountryData(dataPath) {
        // Return cached data if available
        if (countryDataCache) {
            return countryDataCache;
        }
        
        // Load data from file
        const response = await fetch(dataPath);
        if (!response.ok) {
            throw new Error(`Failed to load trade data: ${response.status} ${response.statusText}`);
        }
        
        // Cache and return data
        countryDataCache = await response.json();
        return countryDataCache;
    }
    
    /**
     * Filter data to get top countries by a given metric
     * 
     * @param {Array} countryData - Array of country data objects
     * @param {string} metric - The metric to filter by ('impVal', 'impShare', etc.)
     * @param {number} numTop - Number of top countries to include
     * @returns {Array} Array of filtered countries and their data
     */
    function getTopCountriesByMetric(countryData, metric, numTop = 5) {
        // Filter data for the specified metric
        const metricData = countryData.filter(d => d.metric === metric);
        
        // Calculate total value across all years for each country
        const countryTotals = {};
        
        metricData.forEach(country => {
            // Skip countries with no data
            if (!country.data || country.data.length === 0) return;
            
            // Get the most recent year value that's not null
            const recentValues = country.data
                .filter(d => d.value !== null && d.value !== undefined)
                .sort((a, b) => b.year - a.year);
                
            if (recentValues.length > 0) {
                countryTotals[country.country] = {
                    iso3: country.iso3,
                    value: recentValues[0].value,
                    data: country.data
                };
            }
        });
        
        // Sort countries by total value and get top N
        const sortedCountries = Object.entries(countryTotals)
            .sort((a, b) => b[1].value - a[1].value)
            .slice(0, numTop)
            .map(([country, details]) => ({
                country,
                iso3: details.iso3,
                data: details.data
            }));
            
        return sortedCountries;
    }
    
    /**
     * Clear the data cache to force reloading
     */
    function clearCache() {
        countryDataCache = null;
    }
    
    // Public API
    return {
        createChart,
        loadCountryData,
        getTopCountriesByMetric,
        clearCache
    };
})();