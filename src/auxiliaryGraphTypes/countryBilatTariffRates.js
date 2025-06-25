/**
 * Country Bilateral Tariff Rates Chart Component
 * 
 * Visualizes historical bilateral tariff rates between US and another country
 * Uses the modular sparksGraphFunctions library
 */

window.countryBilatTariffRates = (function() {
    // Cache for tariff data
    let cachedTariffData = null;
    
    /**
     * Create a time series chart showing bilateral tariff rates between US and a country
     * 
     * @param {string} containerId - ID of the container element to render the chart in
     * @param {Object} config - Configuration object
     * @param {string} config.country - ISO code of the country to visualize (default: 'CHN')
     * @param {string} config.tariffMethod - Method for tariff calculation ('unweighted', 'weighted', 'unweighted_winsorized', 'weighted_winsorized', 'statutory_tariffs')
     * @param {boolean} config.showUSTariffs - Whether to show US tariffs on the country (default: true)
     * @param {boolean} config.showCountryTariffs - Whether to show country tariffs on US (default: true)
     * @param {Object} options - Additional options
     * @param {string} options.dataPath - Path to the data file (default: 'data/tariff_data/bilateral_tariffs/all_countries_tariffs.json')
     * @param {Function} options.onSuccess - Callback function when chart creation succeeds
     * @param {Function} options.onError - Callback function when chart creation fails
     */
    async function createChart(containerId, config = {}, options = {}) {
        const defaultConfig = {
            country: 'CHN',
            countryName: 'China',
            tariffMethod: 'unweighted',
            showUSTariffs: true,
            showCountryTariffs: true
        };
        
        const defaultOptions = {
            dataPath: window.DataPaths.bilateral_tariffs.all_countries,
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
            
            // If neither toggle is checked, show placeholder
            if (!effectiveConfig.showUSTariffs && !effectiveConfig.showCountryTariffs) {
                chartContainer.innerHTML = '<div class="visualization-placeholder">Enable at least one data series to view</div>';
                return;
            }
            
            // Show loading state
            chartContainer.innerHTML = '<div class="visualization-placeholder">Loading tariff data...</div>';
            
            // Load data for selected country
            const tariffData = await loadCountryTariffData(
                effectiveConfig.country, 
                effectiveOptions.dataPath
            );
            
            if (!tariffData) {
                chartContainer.innerHTML = `<div class="visualization-placeholder">No tariff data available for ${effectiveConfig.countryName}</div>`;
                return;
            }
            
            // Process the data according to selected tariff method
            const processedData = processTariffData(tariffData, effectiveConfig.tariffMethod);
            
            // Format the data for sparksLineChart
            const series = [];
            
            if (effectiveConfig.showUSTariffs) {
                // Create series for US tariffs
                const usTariffData = [];
                processedData.years.forEach((year, index) => {
                    const value = processedData.usTariffs[index];
                    if (value !== null && value !== undefined) {
                        usTariffData.push({
                            x: year,
                            y: value
                        });
                    }
                });
                
                if (usTariffData.length > 0) {
                    series.push({
                        name: `US Tariffs on ${effectiveConfig.countryName}`,
                        data: usTariffData,
                        color: 'var(--primary, #0066cc)' // Use primary color for US
                    });
                }
            }
            
            if (effectiveConfig.showCountryTariffs) {
                // Create series for country tariffs
                const countryTariffData = [];
                processedData.years.forEach((year, index) => {
                    const value = processedData.countryTariffs[index];
                    if (value !== null && value !== undefined) {
                        countryTariffData.push({
                            x: year,
                            y: value
                        });
                    }
                });
                
                if (countryTariffData.length > 0) {
                    series.push({
                        name: `${effectiveConfig.countryName} Tariffs on US`,
                        data: countryTariffData,
                        color: 'var(--excellenceOrange, #ff9900)' // Use excellenceOrange for other country
                    });
                }
            }
            
            // Hide placeholder
            chartContainer.innerHTML = '';
            
            // If we have no series data, show message
            if (series.length === 0) {
                chartContainer.innerHTML = '<div class="visualization-placeholder">No tariff data available for the selected options</div>';
                return;
            }
            
            // Get tariff method description for the subtitle
            const tariffMethodDescription = getTariffMethodDescription(effectiveConfig.tariffMethod);
            
            // Create chart configuration for sparksLineChart
            const chartConfig = {
                title: `<strong>Figure 1. </strong>   Bilateral  Tariff Rates: US and ${effectiveConfig.countryName}`,
                subtitle: `This chart shows the ${effectiveConfig.showUSTariffs && effectiveConfig.showCountryTariffs ? 'reciprocal' : ''} 
                tariff rates ${effectiveConfig.showUSTariffs ? 'imposed by the US on ' + effectiveConfig.countryName : ''} 
                ${effectiveConfig.showUSTariffs && effectiveConfig.showCountryTariffs ? 'and' : ''} 
                ${effectiveConfig.showCountryTariffs ? 'imposed by ' + effectiveConfig.countryName + ' on the US' : ''} 
                over time using the ${tariffMethodDescription} measurement.`,
                chartType: 'bilat-tariff',
                xAxis: {
                    title: 'Year',
                    type: 'number'
                },
                yAxis: {
                    title: 'Tariff Rate (%)',
                    type: 'number',
                    min: 0
                },
                series: series,
                tooltipFormatter: (value) => {
                    return `${value.toFixed(1)}%`;
                },
                percentageConfig: {
                    valuesArePercentages: true
                },
                legendConfig: {
                    useLines: true,
                    itemsPerRow: 2,
                    maxRows: 1
                },
                sourceNote: "Global Tariff Database (Teti 2024)"
            };
            
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
            console.error('Error creating bilateral tariff rates chart:', error);
            
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
     * Helper function to get description of tariff method
     * 
     * @param {string} method - The tariff calculation method
     * @returns {string} Human-readable description
     */
    function getTariffMethodDescription(method) {
        // Return human-readable description
        switch (method) {
            case 'unweighted':
                return 'unweighted average';
            case 'weighted':
                return 'trade-weighted average';
            case 'unweighted_winsorized':
                return 'unweighted winsorized average';
            case 'weighted_winsorized':
                return 'trade-weighted winsorized average';
            case 'statutory_tariffs':
                return 'statutory tariff';
            default:
                return 'average';
        }
    }
    
    /**
     * Process the tariff data according to the selected method
     * 
     * @param {Object} data - The raw tariff data
     * @param {string} method - The tariff calculation method
     * @returns {Object} Processed data for charting
     */
    function processTariffData(data, method) {
        // Extract the relevant tariff series based on the method
        let years = [];
        let usTariffs = [];
        let countryTariffs = [];
        
        if (data && data.years && data.us_tariffs_on_country && data.country_tariffs_on_us) {
            years = data.years;
            
            // Get the tariff values for each year
            const usTariffsObj = data.us_tariffs_on_country[method] || {};
            const countryTariffsObj = data.country_tariffs_on_us[method] || {};
            
            // Convert to arrays maintaining the same order as years
            years.forEach(year => {
                const yearStr = year.toString();
                
                // Convert to percentages and handle null/undefined values
                const usTariff = usTariffsObj[yearStr];
                const countryTariff = countryTariffsObj[yearStr];
                
                // Add to arrays, converting to percentages and handling nulls
                usTariffs.push(usTariff !== null && usTariff !== undefined ? usTariff : null);
                countryTariffs.push(countryTariff !== null && countryTariff !== undefined ? countryTariff : null);
            });
        }
        
        // Format dates as YYYY for display
        const formattedDates = years.map(year => year.toString());
        
        return {
            usTariffs: usTariffs,
            countryTariffs: countryTariffs,
            dates: formattedDates,
            years: years
        };
    }
    
    /**
     * Function to load bilateral tariff data for a specific country
     * 
     * @param {string} countryCode - ISO code of the country
     * @param {string} dataPath - Path to the data file
     * @returns {Object} Country tariff data
     */
    async function loadCountryTariffData(countryCode, dataPath) {
        try {
            // First try to get data from cached tariff data
            if (cachedTariffData && cachedTariffData[countryCode]) {
                return cachedTariffData[countryCode];
            }
            
            // Otherwise, attempt to load the data from the server
            const response = await fetch(dataPath);
            if (!response.ok) {
                throw new Error(`Failed to load tariff data: ${response.status} ${response.statusText}`);
            }
            
            cachedTariffData = await response.json();
            if (cachedTariffData && cachedTariffData[countryCode]) {
                return cachedTariffData[countryCode];
            } else {
                console.warn(`Country ${countryCode} not found in tariff data`);
                return null;
            }
        } catch (error) {
            console.error('Error loading country tariff data:', error);
            return null;
        }
    }
    
    /**
     * Clear the data cache to force reloading
     */
    function clearCache() {
        cachedTariffData = null;
    }
    
    // Public API
    return {
        createChart,
        loadCountryTariffData,
        clearCache
    };
})();