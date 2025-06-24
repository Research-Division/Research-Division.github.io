/**
 * Industry Tariffs Bar Chart Module
 * 
 * Visualizes bilateral tariff rates by industry classification using bar charts
 * Uses the modular sparksGraphFunctions library
 */

window.industryTariffsBarChart = (function() {
    // Cache for tariff data by aggregation type and method
    const cachedTariffData = {
        section: {},
        isic: {},
        gtap: {}
    };
    
    // Available aggregation types
    const AGGREGATION_TYPES = ['section', 'isic', 'gtap'];
    
    // Available tariff calculation methods
    const TARIFF_METHODS = ['simple', 'weighted', 'winsorized', 'weighted_winsorized', 'statutory'];
    
    /**
     * Create an industry tariffs bar chart
     * 
     * @param {string} containerId - ID of the container element to render the chart in
     * @param {Object} params - Parameters for the chart
     * @param {string} params.country - ISO3 code of the country to display
     * @param {string} params.countryName - Name of the country to display
     * @param {string} params.aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @param {string} params.tariffMethod - Tariff calculation method ('simple', 'weighted', etc.)
     * @param {string} params.year - Year to display data for (e.g. '2021')
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
            year: '2021',
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
            
            // Check if sector data exists for the selected year
            const countryData = tariffData[chartParams.country];
            if (!countryData.sector_data || !countryData.sector_data[chartParams.year]) {
                throw new Error(`No sectoral tariff data available for ${chartParams.countryName || chartParams.country} in ${chartParams.year} with method ${chartParams.tariffMethod}`);
            }
            
            // Get sector data for the selected year
            const sectorData = countryData.sector_data[chartParams.year];
            
            // Format data for the bar chart
            const series = [];
            
            // Get colors from the utility module if available
            let usTariffColor = 'var(--blue1)';
            let countryTariffColor = 'var(--orange1)';
            
            // Try to use bilatColor from sparksColorUtils if available
            if (window.sparksColorUtils && window.sparksColorUtils.getBilatColor) {
                usTariffColor = window.sparksColorUtils.getBilatColor(0);
                countryTariffColor = window.sparksColorUtils.getBilatColor(1);
            } else if (window.chartUtils && window.chartUtils.getBilatColor) {
                // Fall back to chartUtils if needed
                usTariffColor = window.chartUtils.getBilatColor(0);
                countryTariffColor = window.chartUtils.getBilatColor(1);
            }
            
            // Add US tariffs on country series if enabled
            if (chartParams.showUSTariffs) {
                series.push({
                    name: `US Tariffs on ${chartParams.countryName || chartParams.country}`,
                    data: [],
                    color: usTariffColor
                });
            }
            
            // Add country tariffs on US series if enabled
            if (chartParams.showCountryTariffs) {
                series.push({
                    name: `${chartParams.countryName || chartParams.country} Tariffs on US`,
                    data: [],
                    color: countryTariffColor
                });
            }
            
            // If no series are enabled, show message
            if (series.length === 0) {
                throw new Error('Please enable at least one tariff series to display');
            }
            
            // Get sector names and sort by code
            const sectors = Object.keys(sectorData)
                .map(name => ({ 
                    name, 
                    code: sectorData[name].code || 0 
                }))
                .sort((a, b) => a.code - b.code)
                .map(s => s.name);
            
            // Populate data for each sector
            sectors.forEach(sector => {
                const sectorInfo = sectorData[sector];
                
                // Add US to country tariff if series exists
                if (chartParams.showUSTariffs && sectorInfo.us_to_country !== undefined && sectorInfo.us_to_country !== null) {
                    series[0].data.push({
                        x: sector,
                        y: sectorInfo.us_to_country
                    });
                }
                
                // Add country to US tariff if series exists
                if (chartParams.showCountryTariffs && sectorInfo.country_to_us !== undefined && sectorInfo.country_to_us !== null) {
                    const seriesIndex = chartParams.showUSTariffs ? 1 : 0;
                    series[seriesIndex].data.push({
                        x: sector,
                        y: sectorInfo.country_to_us
                    });
                }
            });
            
            // Ensure each series has data
            series.forEach(series => {
                if (series.data.length === 0) {
                    throw new Error(`No ${series.name} data available for the selected parameters`);
                }
            });
            
            // Get configuration from chartUtils with all settings from chartConfig.json
            const chartConfig = window.chartUtils?.getChartConfig('bilat-tariff-bar', {
                aggregation: chartParams.aggregation,
                country: chartParams.countryName || chartParams.country,
                year: chartParams.year,
                // Allow layout manager to optimize the chart
                layout: 'industry-tariffs' 
            });
            
            // Fallback to minimal hardcoded values only if chartUtils not available
            if (!chartConfig) {
                console.warn('Chart configuration not available, using fallback values');
                chartConfig = {
                    title: `<strong>Figure 2</strong>Bilateral Tariff Rates by ${getAggregationTitle(chartParams.aggregation)} (${chartParams.year})`,
                    note: `Tariffs between the US and ${chartParams.countryName || chartParams.country} using ${formatMethodName(chartParams.tariffMethod)} calculation`,
                    source: "Feodora Teti's Global Tariff Database (v_beta1-2024-12) from Teti (2024)"
                };
            }
            
            // Process placeholders in any string properties
            Object.entries(chartConfig).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    chartConfig[key] = value
                        .replace(/\{\{country\}\}/g, chartParams.countryName || chartParams.country)
                        .replace(/\{\{year\}\}/g, chartParams.year);
                }
            });
            
            // Only add the dynamic data series - everything else should come from config
            chartConfig.series = series;
            
            // Add tooltip formatter for percentage values if not defined in config
            if (!chartConfig.tooltipFormatter) {
                chartConfig.tooltipFormatter = value => `${value.toFixed(1)}%`;
            }
            
            // We must keep some renderer-specific properties if they're not in config
            if (!chartConfig.preserveXOrder) {
                chartConfig.preserveXOrder = true;
            }
            
            // Pass the exact sector order to ensure perfect alignment between bars and labels
            chartConfig.rawSectorOrder = sectors;
            
            // Add critical layout properties if they're missing - 
            // these should come from chartConfig.json, but provide fallbacks
            if (!chartConfig.svgHeight) {
                chartConfig.svgHeight = 400; // Default SVG height if not specified
                ////console.log('Using default svgHeight: 400');
            }
            
            if (!chartConfig.transform) {
                chartConfig.transform = 'translate(100,30)'; // Default transform if not specified
                //console.log('Using default transform: translate(100,30)');
            }
            
            if (!chartConfig.margin || !chartConfig.margin.bottom) {
                chartConfig.margin = chartConfig.margin || {};
                chartConfig.margin.bottom = 120; // Default bottom margin for angled labels
                ////console.log('Using default margin.bottom: 120');
            }
            
            /**
             * Add post-render configuration if missing
             * Post-render configuration controls layout adjustments that are applied
             * after the chart is initially rendered. This helps fix issues with
             * label spacing, chart positioning, etc.
             * 
             * The following properties can be configured:
             * - enabled: boolean - whether to apply post-render adjustments
             * - bottomSpaceHeight: string - CSS height value for space below the chart
             * - applyTransform: boolean - whether to apply the transform attribute
             * - enforceHeight: boolean - whether to set the SVG height explicitly
             * 
             * These values can be set in chartConfig.json for different aggregation types
             */
            if (!chartConfig.postRender) {
                chartConfig.postRender = {
                    enabled: true,
                    bottomSpaceHeight: '40px',
                    applyTransform: true,
                    enforceHeight: true
                };
                //console.log('Using default post-render configuration');
            }
            
            // Ensure container has proper class and styling
            const container = document.getElementById(containerId);
            if (container) {
                // Add container class if needed
                if (!container.querySelector('.tariff-chart-container')) {
                    container.classList.add('tariff-bar-chart-container');
                }
            }
            
            // Create the bar chart - height and other styling comes from config
            if (!window.sparksBarChart) {
                throw new Error('sparksBarChart function not available');
            }
            
            // Log the configuration for debugging
            /*console.log('Industry tariff bar chart config:', { 
                preserveXOrder: chartConfig.preserveXOrder,
                formatter: chartConfig.formatter,
                percentageConfig: chartConfig.percentageConfig,
                transform: chartConfig.transform,
                svgHeight: chartConfig.svgHeight,
                margin: chartConfig.margin,
                series: chartConfig.series.length + ' items'
            });*/
            
            window.sparksBarChart(containerId, chartConfig);
            
            // Apply post-render adjustments based on chart configuration
            const svgElement = document.getElementById(`${containerId}-svg`);
            
            // Check if post-render adjustments are enabled in the config
            if (svgElement && chartConfig.postRender && chartConfig.postRender.enabled) {
                const postRenderConfig = chartConfig.postRender;
                
                // 1. Set SVG height if configured
                if (postRenderConfig.enforceHeight && chartConfig.svgHeight) {
                    svgElement.setAttribute('height', chartConfig.svgHeight.toString());
                    //console.log(`Setting SVG height to ${chartConfig.svgHeight}`);
                }
                
                // 2. Add bottom space for angled labels if configured
                if (postRenderConfig.bottomSpaceHeight) {
                    const bottomSpace = document.createElement('div');
                    bottomSpace.className = 'chart-bottom-space';
                    bottomSpace.style.height = postRenderConfig.bottomSpaceHeight; // This height still needs to be dynamic
                    
                    // Insert the extra space before the legend
                    const legendContainer = container.querySelector('.chart-visualization-container');
                    if (legendContainer && legendContainer.parentNode) {
                        legendContainer.parentNode.insertBefore(bottomSpace, legendContainer);
                    }
                    //console.log(`Added bottom space: ${postRenderConfig.bottomSpaceHeight}`);
                }
                
                // 3. Enforce transform if configured
                if (postRenderConfig.applyTransform && chartConfig.transform) {
                    const chartArea = svgElement.querySelector('g');
                    if (chartArea) {
                        chartArea.setAttribute('transform', chartConfig.transform);
                        //console.log(`Applied transform: ${chartConfig.transform}`);
                    }
                }
                
                //console.log('Applied post-render adjustments based on configuration');
            }
            
            // We're no longer using tooltip animation for truncated labels
            // No special handling needed for truncated labels - they will remain truncated
            
            // Call success callback if provided
            if (typeof chartOptions.onSuccess === 'function') {
                chartOptions.onSuccess(chartConfig);
            }
            
            return chartConfig;
            
        } catch (error) {
            console.error('Error creating industry tariffs chart:', error);
            
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
     * Load tariff data for a specific aggregation and method
     * 
     * @param {string} aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @param {string} method - Tariff calculation method ('simple', 'weighted', etc., 'statutory')
     * @returns {Object} Tariff data
     */
    async function loadTariffData(aggregation, method) {
        // Check if we already have this data cached
        if (cachedTariffData[aggregation] && cachedTariffData[aggregation][method]) {
            //console.log(`Using cached data for ${aggregation}/${method}`);
            return cachedTariffData[aggregation][method];
        }
        
        // Get path directly from DataPaths
        const dataPath = DataPaths.bilateral_tariffs[aggregation][method];
        //console.log(`Fetching data using DataPaths: ${dataPath}`);
        
        const response = await fetch(dataPath);
        
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
            //console.log('Loading chart configuration for industry tariffs chart');
            return window.sparksChartConfigManager.loadConfig();
        }
        return Promise.resolve(true);
    }
    
    /**
     * Load all tariff data for all aggregation types and methods
     * 
     * @returns {Promise} Promise that resolves when all data is loaded
     */
    async function loadAllTariffData() {
        // Load data for each aggregation type with simple method first (most commonly used)
        const aggTypePromises = AGGREGATION_TYPES.map(aggType => {
            // Default to the simple tariff type initially
            const defaultMethod = 'simple';
            
            // Skip if already loaded
            if (cachedTariffData[aggType] && cachedTariffData[aggType][defaultMethod]) {
                //console.log(`Using cached ${aggType}/${defaultMethod} data`);
                return Promise.resolve();
            }
            
            // Fetch the default data
            return fetch(`data/tariff_data/bilateral_tariffs/${aggType}/${defaultMethod}.json`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load ${aggType}/${defaultMethod} tariff data`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Make sure the nested structure exists
                    if (!cachedTariffData[aggType]) {
                        cachedTariffData[aggType] = {};
                    }
                    
                    // Store data by method
                    cachedTariffData[aggType][defaultMethod] = data;
                    //console.log(`Loaded industry tariff data for ${aggType}/${defaultMethod}`);
                })
                .catch(error => {
                    console.error(`Error loading ${aggType}/simple tariff data:`, error);
                    if (!cachedTariffData[aggType]) {
                        cachedTariffData[aggType] = {};
                    }
                });
        });
        
        // Wait for all data to be loaded
        return Promise.all(aggTypePromises);
    }
    
    /**
     * Get countries from the tariff data
     * 
     * @param {string} aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @param {string} method - Tariff calculation method ('simple', 'weighted', etc.)
     * @returns {Array} Array of country objects with code and name
     */
    function getCountries(aggregation = 'section', method = 'simple') {
        // Check if data is loaded
        if (!cachedTariffData[aggregation] || !cachedTariffData[aggregation][method]) {
            console.warn(`No data loaded for ${aggregation}/${method}`);
            return [];
        }
        
        // Get country codes from the data
        const data = cachedTariffData[aggregation][method];
        return Object.keys(data).map(code => ({
            code,
            name: data[code].name || code
        }));
    }
    
    /**
     * Get available years from the tariff data
     * 
     * @param {string} aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @param {string} method - Tariff calculation method ('simple', 'weighted', etc.)
     * @returns {Array} Array of available years
     */
    function getAvailableYears(aggregation = 'section', method = 'simple') {
        // Check if data is loaded
        if (!cachedTariffData[aggregation] || !cachedTariffData[aggregation][method]) {
            console.warn(`No data loaded for ${aggregation}/${method}`);
            return [];
        }
        
        // Get years from the first country with data
        const data = cachedTariffData[aggregation][method];
        const countries = Object.keys(data);
        
        if (countries.length === 0) {
            return [];
        }
        
        // Use the first country that has years data
        for (const country of countries) {
            if (data[country] && data[country].years) {
                return data[country].years;
            }
        }
        
        return [];
    }
    
    /**
     * Format the tariff method name for display
     * @deprecated Should be handled through chartConfig.json in future
     * @param {string} method - Tariff calculation method ('simple', 'weighted', etc.)
     * @returns {string} Formatted method name
     */
    function formatMethodName(method) {
        switch(method) {
            case 'simple': return 'simple average';
            case 'weighted': return 'trade-weighted average';
            case 'winsorized': return 'winsorized average';
            case 'weighted_winsorized': return 'trade-weighted winsorized average';
            case 'statutory': return 'statutory rate';
            default: return method;
        }
    }
    
    /**
     * Get the title for an aggregation type
     * @deprecated Should be handled through chartConfig.json in future
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
     * Get the x-axis title for an aggregation type
     * @deprecated Should be handled through chartConfig.json in future
     * @param {string} aggregation - Aggregation type ('section', 'isic', 'gtap')
     * @returns {string} Formatted x-axis title
     */
    function getAggregationAxisTitle(aggregation) {
        switch(aggregation) {
            case 'section': return 'Product Category';
            case 'isic': return 'Industry';
            case 'gtap': return 'Sector';
            default: return 'Category';
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
    
    // Public API
    return {
        createChart,
        loadTariffData,
        loadAllTariffData,
        loadChartConfig,
        getCountries,
        getAvailableYears,
        clearCache
    };
})();