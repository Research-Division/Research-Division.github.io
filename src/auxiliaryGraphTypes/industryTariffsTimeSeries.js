/**
 * Industry Tariffs Time Series Chart Module
 * 
 * Visualizes bilateral tariff rates by industry classification over time using line charts
 * Uses the modular sparksGraphFunctions library
 */

window.industryTariffsTimeSeries = (function() {
    // Cache for tariff data by aggregation type and method
    const cachedTariffData = {
        section: {},
        isic: {},
        gtap: {}
    };
    
    // Available aggregation types
    const AGGREGATION_TYPES = ['section', 'isic', 'gtap'];
    
    // Available tariff calculation methods
    const TARIFF_METHODS = ['simple', 'weighted', 'winsorized', 'weighted_winsorized','statutory'];
    
    // Industry-based color system - single color per industry from Whitney's palette
    const INDUSTRY_COLORS = [
        'var(--blue1)',        // #3581b4 - Blue
        'var(--orange1)',      // #ca590c - Orange
        'var(--green1)',       // #7fac1c - Green
        'var(--blue2)',        // #56bfd6 - Light blue
        'var(--teal1)',        // #53c49f - Teal
        'var(--pink1)',        // #d34682 - Pink
        'var(--purple1)',      // #4a3e8e - Purple
        'var(--yellow1)',      // #f3bb00 - Yellow
        'var(--maroon1)',      // #580d10 - Maroon
        'var(--blue3)',        // #006278 - Deep blue
        'var(--green2)',       // #385100 - Dark green
        'var(--gray1)'         // #414141 - Gray
    ];
    
    /**
     * Create an industry tariffs time series chart
     * 
     * @param {string} containerId - ID of the container element to render the chart in
     * @param {Object} params - Parameters for the chart
     * @param {string} params.country - ISO3 code of the country to display
     * @param {string} params.countryName - Name of the country to display
     * @param {string} params.aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @param {string} params.tariffMethod - Tariff calculation method ('simple', 'weighted', etc.)
     * @param {string[]} params.selectedSectors - Array of sector names to include (if empty, all sectors are included)
     * @param {boolean} params.showUSTariffs - Whether to show US tariffs on the country
     * @param {boolean} params.showCountryTariffs - Whether to show country tariffs on the US
     * @param {Object} options - Additional options
     * @param {Function} options.onSuccess - Callback function when chart creation succeeds
     * @param {Function} options.onError - Callback function when chart creation fails
     */
    async function createChart(containerId, params, options = {}) {
        const defaultParams = {
            country: '',
            countryName: '',
            aggregation: 'section',
            tariffMethod: 'simple',
            selectedSectors: [],
            showUSTariffs: true,
            showCountryTariffs: true
        };
        
        const defaultOptions = {
            onSuccess: null,
            onError: null
        };
        
        // Merge defaults with provided parameters
        const chartParams = {...defaultParams, ...params};
        const chartOptions = {...defaultOptions, ...options};
        
        try {
            // Validate parameters
            if (!chartParams.country) {
                throw new Error('Country code is required');
            }
            
            if (!AGGREGATION_TYPES.includes(chartParams.aggregation)) {
                throw new Error(`Invalid aggregation type: ${chartParams.aggregation}`);
            }
            
            if (!TARIFF_METHODS.includes(chartParams.tariffMethod)) {
                throw new Error(`Invalid tariff method: ${chartParams.tariffMethod}`);
            }
            
            // Get chart container
            const chartContainer = document.getElementById(containerId);
            if (!chartContainer) {
                throw new Error(`Container with ID "${containerId}" not found`);
            }
            
            // Display loading message
            chartContainer.innerHTML = '<div class="chart-loading">Loading industry tariff data...</div>';
            
            // Ensure chart configuration is loaded
            await loadChartConfig();
            
            // Load the tariff data
            const tariffData = await loadTariffData(chartParams.aggregation, chartParams.tariffMethod);
            
            // Check if data exists for the selected country
            if (!tariffData[chartParams.country]) {
                throw new Error(`No tariff data available for ${chartParams.countryName || chartParams.country} with method ${chartParams.tariffMethod}`);
            }
            
            // Get the country data
            const countryData = tariffData[chartParams.country];
            
            // Check if sector data exists
            if (!countryData.sector_data) {
                throw new Error(`No sectoral tariff data available for ${chartParams.countryName || chartParams.country} with method ${chartParams.tariffMethod}`);
            }
            
            // Get list of years with data
            const years = countryData.years || [];
            if (years.length === 0) {
                throw new Error(`No time series data available for ${chartParams.countryName || chartParams.country}`);
            }
            
            // Store the skipDots option for later use in chart configuration
            if (chartOptions.skipDots !== undefined) {
                chartParams.skipDots = chartOptions.skipDots;
            }
            
            // Convert sector data into time series format
            const sectorTimeSeries = processSectorTimeSeries(countryData, chartParams.selectedSectors);
            
            // Create series for the line chart based on user preferences
            const series = [];
            
            // Check if we're in pair-comparison mode or all-sectors mode
            const pairMode = chartParams.displayMode === 'pairs';
            
            // Handle pair-comparison mode (default)
            if (pairMode || chartParams.displayMode === undefined) {
                // Get the sectors that should be displayed in pairs
                const sectorsToShow = chartParams.selectedSectors && chartParams.selectedSectors.length > 0 
                    ? chartParams.selectedSectors 
                    : sectorTimeSeries.sectors.slice(0, 1); // Default to first sector if none selected
                
                // Add paired series for each selected sector
                sectorsToShow.forEach((sector, index) => {
                    // Get industry color for this sector - same color for both US and country
                    const industryColor = INDUSTRY_COLORS[index % INDUSTRY_COLORS.length];
                    
                    // Add US -> Country tariff series if enabled
                    if (chartParams.showUSTariffs && 
                        sectorTimeSeries.usTariffs[sector] && 
                        sectorTimeSeries.usTariffs[sector].length > 0) {
                        series.push({
                            name: `US tariffs on ${sector}`,
                            data: sectorTimeSeries.usTariffs[sector],
                            // Same color as country, differentiate by line style
                            color: industryColor,
                            dashStyle: 'solid',       // Solid line for US
                            legendGroup: sector       // Group in legend by sector
                        });
                    }
                    
                    // Add Country -> US tariff series if enabled
                    if (chartParams.showCountryTariffs && 
                        sectorTimeSeries.countryTariffs[sector] && 
                        sectorTimeSeries.countryTariffs[sector].length > 0) {
                        series.push({
                            name: `${chartParams.countryName || chartParams.country} tariffs on ${sector}`,
                            data: sectorTimeSeries.countryTariffs[sector],
                            // Same color as US, differentiate by line style
                            color: industryColor,
                            dashStyle: 'long-dash',   // Long dash pattern for country tariffs
                            legendGroup: sector       // Group in legend by sector
                        });
                    }
                });
            } 
            // Handle all-sectors mode (legacy behavior)
            else {
                // Add all sectors in pairs to maintain color consistency
                sectorTimeSeries.sectors.forEach((sector, index) => {
                    // Get industry color for this sector - same color for both US and country
                    const industryColor = INDUSTRY_COLORS[index % INDUSTRY_COLORS.length];
                    
                    // Add US -> Country tariff series if enabled for this sector
                    if (chartParams.showUSTariffs && 
                        sectorTimeSeries.usTariffs[sector] && 
                        sectorTimeSeries.usTariffs[sector].length > 0) {
                        series.push({
                            name: `US tariffs on ${sector}`,
                            data: sectorTimeSeries.usTariffs[sector],
                            // Same color as country, differentiate by line style
                            color: industryColor,
                            dashStyle: 'solid',     // Solid line for US
                            legendGroup: sector     // Group in legend by sector
                        });
                    }
                    
                    // Add Country -> US tariff series if enabled for this sector
                    if (chartParams.showCountryTariffs && 
                        sectorTimeSeries.countryTariffs[sector] && 
                        sectorTimeSeries.countryTariffs[sector].length > 0) {
                        series.push({
                            name: `${chartParams.countryName || chartParams.country} tariffs on ${sector}`,
                            data: sectorTimeSeries.countryTariffs[sector],
                            // Same color as US, differentiate by line style
                            color: industryColor,
                            dashStyle: 'long-dash', // Long dash pattern for country tariffs
                            legendGroup: sector     // Group in legend by sector
                        });
                    }
                });
            }
            
            // If no series were created, show error
            if (series.length === 0) {
                throw new Error('No valid tariff data available for the selected sectors');
            }
            
            // Get configuration from chartUtils with all settings from chartConfig.json
            // Try to get from the bilat-tariff-time-series chart type if it exists
            let chartConfig = window.chartUtils?.getChartConfig('bilat-tariff-time-series', {
                aggregation: chartParams.aggregation,
                country: chartParams.countryName || chartParams.country,
                tariffMethod: chartParams.tariffMethod
            });
            
            // If not found, fall back to bilat-tariff (used for other tariff charts)
            if (!chartConfig) {
                chartConfig = window.chartUtils?.getChartConfig('bilat-tariff', {
                    aggregation: chartParams.aggregation,
                    country: chartParams.countryName || chartParams.country,
                    tariffMethod: chartParams.tariffMethod
                });
            }
            
            // Fallback to minimal hardcoded values only if chartUtils not available
            if (!chartConfig) {
                console.warn('Chart configuration not available, using fallback values');
                chartConfig = {
                    title: `Industry Tariff Rates Over Time`,
                    yAxisTitle: "Tariff Rate (%)",
                    xAxisTitle: "Year",
                    note: `Bilateral tariff rates between the US and ${chartParams.countryName || chartParams.country} by ${getAggregationTitle(chartParams.aggregation)}`,
                    source: "Feodora Teti's Global Tariff Database (v_beta1-2024-12) from Teti (2024)"
                };
            }

            // Process placeholders in any string properties
            Object.entries(chartConfig).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    chartConfig[key] = value
                        .replace(/\{\{country\}\}/g, chartParams.countryName || chartParams.country)
                        .replace(/\{\{tariffMethod\}\}/g, formatMethodName(chartParams.tariffMethod));
                }
            });
            
            // Update title for pair comparison mode
            if (chartParams.displayMode === 'pairs' && chartParams.selectedSectors && chartParams.selectedSectors.length > 0) {
                // Add sector information to title
                const sectorsList = chartParams.selectedSectors.join(', ');
                if (chartConfig.title) {
                    //chartConfig.title = `${chartConfig.title}: ${sectorsList}`;
                }
                
                // Add comparison note
                if (chartConfig.note) {
                    chartConfig.note += ` Solid lines US tariff rates and dashed lines ${chartParams.countryName || chartParams.country} tariff rates. `;
                }
            }
            
            // Add custom legend configuration to group by industry instead of showing every series
            chartConfig.legendConfig = {
                // Group by industry (one entry per industry, not per series)
                groupBy: 'legendGroup',
                // Format legend labels to show industry name only once with dash types for distinction
                labelFormatter: (seriesName, series) => {
                    // Extract sector name from series
                    const sector = series.legendGroup || seriesName.split(' on ')[1];
                    // Return just the sector name (the legend color will represent the industry)
                    return sector;
                },
                // Add a note to explain the dash patterns
                note: `Solid line: US tariffs. Dashed line: ${chartParams.countryName || chartParams.country} tariffs.`,
                // Style options
                itemsPerRow: 2,
                maxRows: 6
            };
            
            // Add the data series
            chartConfig.series = series;
            
            // Add tooltip formatter for percentage values if not defined in config
            if (!chartConfig.tooltipFormatter) {
                chartConfig.tooltipFormatter = value => `${value.toFixed(1)}%`;
            }
            
            // Ensure percentageConfig exists for proper handling of percentages
            if (!chartConfig.percentageConfig) {
                chartConfig.percentageConfig = {
                    valuesArePercentages: true
                };
            }
            
            // Add the data series to the chart config
            chartConfig.series = series;
            
            // Transfer skipDots option from chartParams to chartConfig if it was set
            if (chartParams.skipDots !== undefined) {
                chartConfig.skipDots = chartParams.skipDots;
            }
            
            // Create the line chart
            if (!window.sparksLineChart) {
                throw new Error('sparksLineChart function not available');
            }
            
            window.sparksLineChart(containerId, chartConfig);
            
            // Call success callback if provided
            if (typeof chartOptions.onSuccess === 'function') {
                chartOptions.onSuccess(chartConfig);
            }
            
            return chartConfig;
        } catch (error) {
            console.error('Error creating industry tariffs time series chart:', error);
            
            // Show error message in container
            try {
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = `
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
            if (typeof chartOptions.onError === 'function') {
                chartOptions.onError(error);
            }
            
            return null;
        }
    }
    
    /**
     * Process sector data into time series format
     * 
     * @param {Object} countryData - Data for a single country
     * @param {Array} selectedSectors - Array of sector names to include (if empty, all sectors are included)
     * @returns {Object} Object with usTariffs and countryTariffs time series
     */
    function processSectorTimeSeries(countryData, selectedSectors = []) {
        const sectorData = countryData.sector_data || {};
        const years = countryData.years || [];
        
        // Get the list of sectors from the first year with sector data
        let sectorNames = [];
        for (const year in sectorData) {
            const yearSectors = Object.keys(sectorData[year]);
            if (yearSectors.length > 0) {
                sectorNames = yearSectors;
                break;
            }
        }
        
        // Filter sectors if selection is provided
        if (selectedSectors && selectedSectors.length > 0) {
            sectorNames = sectorNames.filter(sector => selectedSectors.includes(sector));
        }
        
        // Sort sectors by code if available
        const sortedSectors = sectorNames.map(name => {
            // Try to find the code in any year's data
            for (const year in sectorData) {
                if (sectorData[year][name] && sectorData[year][name].code !== undefined) {
                    return { name, code: sectorData[year][name].code || 0 };
                }
            }
            return { name, code: 0 };
        }).sort((a, b) => a.code - b.code).map(s => s.name);
        
        // Initialize result containers
        const usTariffs = {};
        const countryTariffs = {};
        
        // Initialize time series for each sector
        sortedSectors.forEach(sector => {
            usTariffs[sector] = [];
            countryTariffs[sector] = [];
        });
        
        // Populate time series data
        years.forEach(year => {
            const yearData = sectorData[year.toString()];
            if (!yearData) return;
            
            sortedSectors.forEach(sector => {
                const sectorInfo = yearData[sector];
                if (!sectorInfo) return;
                
                // Add US to country tariff if available
                if (sectorInfo.us_to_country !== undefined && sectorInfo.us_to_country !== null) {
                    usTariffs[sector].push({
                        x: year,
                        y: sectorInfo.us_to_country
                    });
                }
                
                // Add country to US tariff if available
                if (sectorInfo.country_to_us !== undefined && sectorInfo.country_to_us !== null) {
                    countryTariffs[sector].push({
                        x: year,
                        y: sectorInfo.country_to_us
                    });
                }
            });
        });
        
        // Filter out sectors with no data
        const validSectors = sortedSectors.filter(sector => 
            usTariffs[sector].length > 0 || countryTariffs[sector].length > 0
        );
        
        return {
            sectors: validSectors,
            usTariffs,
            countryTariffs
        };
    }
    
    /**
     * Load tariff data for a specific aggregation and method
     * 
     * @param {string} aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @param {string} method - Tariff calculation method ('simple', 'weighted', etc.)
     * @returns {Object} Tariff data
     */
    async function loadTariffData(aggregation, method) {
        // Check if we already have this data cached
        if (cachedTariffData[aggregation] && cachedTariffData[aggregation][method]) {
            //console.log(`Using cached data for ${aggregation}/${method}`);
            return cachedTariffData[aggregation][method];
        }
        
        // Otherwise fetch it
        //console.log(`Fetching data from bilateral_tariffs/${aggregation}/${method}.json`);
        const response = await fetch(DataPaths.bilateral_tariffs[aggregation][method]);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${aggregation}/${method} tariff data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the data by both aggregation and method
        if (!cachedTariffData[aggregation]) {
            cachedTariffData[aggregation] = {};
        }
        cachedTariffData[aggregation][method] = data;
        //console.log(`Cached tariff data for ${aggregation}/${method}`);
        
        return data;
    }
    
    /**
     * Load chart configuration if not already loaded
     * @returns {Promise} Promise that resolves when config is loaded
     */
    async function loadChartConfig() {
        if (window.sparksChartConfigManager && !window.chartConfig) {
            //console.log('Loading chart configuration for industry tariffs time series chart');
            return window.sparksChartConfigManager.loadConfig();
        }
        return Promise.resolve(true);
    }
    
    /**
     * Get sectors from the tariff data for a specific country
     * 
     * @param {string} aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @param {string} method - Tariff calculation method ('simple', 'weighted', etc.)
     * @param {string} countryCode - Country code to get sectors for
     * @returns {Array} Array of sector objects with code and name
     */
    async function getSectors(aggregation, method, countryCode) {
        // Check if data is loaded
        try {
            const data = await loadTariffData(aggregation, method);
            
            // Check if country exists
            if (!data[countryCode] || !data[countryCode].sector_data) {
                return [];
            }
            
            // Get the sectors from the first year with data
            const sectorData = data[countryCode].sector_data;
            const years = Object.keys(sectorData);
            
            if (years.length === 0) {
                return [];
            }
            
            const firstYearWithData = years[0];
            const sectorNames = Object.keys(sectorData[firstYearWithData]);
            
            // Extract sector info with codes
            return sectorNames.map(name => {
                const sectorInfo = sectorData[firstYearWithData][name];
                return {
                    name: name,
                    code: sectorInfo.code || 0
                };
            }).sort((a, b) => a.code - b.code);
            
        } catch (error) {
            console.error('Error getting sectors:', error);
            return [];
        }
    }
    
    /**
     * Format the tariff method name for display
     * @param {string} method - Tariff calculation method ('simple', 'weighted', etc.)
     * @returns {string} Formatted method name
     */
    function formatMethodName(method) {
        switch(method) {
            case 'simple': return 'simple average';
            case 'weighted': return 'trade-weighted average';
            case 'winsorized': return 'winsorized average';
            case 'weighted_winsorized': return 'trade-weighted winsorized average';
            case 'statutory': return 'statutory tariff';
            default: return method;
        }
    }
    
    /**
     * Get the title for an aggregation type
     * @param {string} aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @returns {string} Formatted aggregation title
     */
    function getAggregationTitle(aggregation) {
        switch(aggregation) {
            case 'section': return 'Product Category';
            case 'isic': return 'Industry Classification';
            case 'gtap': return 'GTAP Sector';
            default: return aggregation;
        }
    }
    
    /**
     * Get countries from the tariff data
     * 
     * @param {string} aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @param {string} method - Tariff calculation method ('simple', 'weighted', etc.)
     * @returns {Array} Array of country objects with code and name
     */
    async function getCountries(aggregation = 'section', method = 'simple') {
        try {
            // Load data if not already loaded
            const data = await loadTariffData(aggregation, method);
            
            // Get country codes from the data
            return Object.keys(data).map(code => ({
                code,
                name: data[code].name || code
            }));
        } catch (error) {
            console.error('Error getting countries:', error);
            return [];
        }
    }
    
    /**
     * Clear the data cache to force reloading
     */
    function clearCache() {
        Object.keys(cachedTariffData).forEach(key => {
            cachedTariffData[key] = {};
        });
    }
    
    /**
     * Get available years from the tariff data for a specific country
     * 
     * @param {string} aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @param {string} method - Tariff calculation method ('simple', 'weighted', etc.)
     * @param {string} countryCode - Country code to get years for
     * @returns {Array} Array of available years
     */
    async function getYearsForCountry(aggregation, method, countryCode) {
        try {
            const data = await loadTariffData(aggregation, method);
            
            // Check if country exists
            if (!data[countryCode]) {
                return [];
            }
            
            // Return years from the country data
            return data[countryCode].years || [];
        } catch (error) {
            console.error('Error getting years for country:', error);
            return [];
        }
    }
    
    // Public API
    return {
        createChart,
        loadTariffData,
        getSectors,
        getCountries,
        getYearsForCountry,
        clearCache,
        AGGREGATION_TYPES,
        TARIFF_METHODS
    };
})();