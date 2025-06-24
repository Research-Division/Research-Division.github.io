/**
 * Section Bilateral Trade Chart Component
 * 
 * Visualizes bilateral trade (imports and exports) for a specific HS section between US and another country
 * Uses the modular sparksGraphFunctions library
 */

window.sectionBilateralTradeChart = (function() {
    // Cache for section trade data
    let cachedSectionTradeData = null;
    
    /**
     * Create a time series chart showing bilateral trade for a specific HS section between US and a country
     * 
     * @param {string} containerId - ID of the container element to render the chart in
     * @param {string} country - ISO3 code of the country to display
     * @param {string} countryName - Display name of the country
     * @param {string} hsSection - HS section number/code
     * @param {Object} options - Additional options
     * @param {string} options.dataPath - Path to the data file (default: 'data/newTrade_data/chart_ready_country_hsSection_series.json')
     * @param {Function} options.onSuccess - Callback function when chart creation succeeds
     * @param {Function} options.onError - Callback function when chart creation fails
     */
    async function createChart(containerId, country, countryName, hsSection, options = {}) {
        const defaultOptions = {
            dataPath: window.DataPaths.trade_data.country_section_series,
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
            
            // If no country or HS section is selected, show placeholder
            if (!country || !hsSection) {
                chartContainer.innerHTML = '<div class="visualization-placeholder">Please select a country and HS section to view bilateral trade data.</div>';
                return;
            }
            console.log(hsSection)
            // Show loading state
            chartContainer.innerHTML = '<div class="visualization-placeholder">Loading HS section bilateral trade data...</div>';
            
            // Load data
            try {
                // Load trade data
                const allData = await loadSectionTradeData(effectiveOptions.dataPath);
                
                if (!allData) {
                    throw new Error('Failed to load HS section trade data');
                }
                
                // Find import data for selected country and section
                const importData = allData.find(d => 
                    d.metric === 'impVal_section' && 
                    d.iso3 === country && 
                    d.hs_section === hsSection
                );
                
                // Find export data for selected country and section
                const exportData = allData.find(d => 
                    d.metric === 'expVal_section' && 
                    d.iso3 === country && 
                    d.hs_section === hsSection
                );
                
                // Get section title from either import or export data
                const sectionTitle = (importData && importData.hs_section_title) || 
                                    (exportData && exportData.hs_section_title) || 
                                    `HS Section ${hsSection}`;
                
                if (!importData && !exportData) {
                    chartContainer.innerHTML = `<div class="visualization-placeholder">No bilateral trade data available for ${countryName}, HS section ${hsSection} (${sectionTitle}).</div>`;
                    return;
                }
                
                // Format data for sparksLineChart
                const series = [];
                
                // Process import data
                if (importData && importData.data) {
                    const importSeries = processTradeData(importData.data);
                    
                    if (importSeries.length > 0) {
                        series.push({
                            name: `Imports from ${countryName}`,
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
                            name: `Exports to ${countryName}`,
                            data: exportSeries,
                            color: 'var(--primary, #0066cc)'  // Use primary color for exports
                        });
                    }
                }
                
                // Hide loading state
                chartContainer.innerHTML = '';
                
                // If we have no series data, show message
                if (series.length === 0) {
                    chartContainer.innerHTML = `<div class="visualization-placeholder">No bilateral trade data available for ${countryName}, HS section ${hsSection} (${sectionTitle}).</div>`;
                    return;
                }
                
                // Create chart configuration
                const chartConfig = createChartConfig(country, countryName, sectionTitle, series);
                
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
                console.error('Error loading or processing section trade data:', error);
                chartContainer.innerHTML = `<div class="visualization-placeholder">Error loading data: ${error.message}</div>`;
                
                // Call error callback if provided
                if (typeof effectiveOptions.onError === 'function') {
                    effectiveOptions.onError(error);
                }
                
                return null;
            }
            
        } catch (error) {
            console.error('Error creating section bilateral trade chart:', error);
            
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
     * @param {string} country - ISO3 code of the country
     * @param {string} countryName - Display name of the country
     * @param {string} sectionTitle - HS section title
     * @param {Array} series - Series data for the chart
     * @returns {Object} Chart configuration
     */
    function createChartConfig(country, countryName, sectionTitle, series) {
        // Create tooltip formatter function consistent with other chart types
        const tooltipFormatter = (value) => window.formatUtils && window.formatUtils.formatCurrency
            ? window.formatUtils.formatCurrency(value, { useSuffix: true })  // Use abbreviated format (K/M/B)
            : `$${value.toLocaleString()}`;  // Fallback
        
        return {
            title: `<b> Figure 4.</b> Bilateral Trade of ${sectionTitle}: U.S. and ${countryName}`,
            subtitle: `This chart shows US imports from and exports to ${countryName} for ${sectionTitle} products. Import values as appraised by U.S. Customs, excluding import duties, freight, and insurance for general imports. Export values defined as the total value of the goods for export at the U.S. port of export.`,
            chartType: 'section-bilat-trade',
            metric: 'value',  // Set the metric to connect with chartConfig.json configuration
            xAxis: {
                title: 'Year',
                type: 'number'
            },
            yAxis: {
                title: 'Trade Value (USD)',
                type: 'number',
                min: 0
            },
            series: series,
            tooltipFormatter: tooltipFormatter,  // Add explicit tooltip formatter
            formatter: 'currency',  // Specify the formatter to use
            legendConfig: {
                useLines: true,
                itemsPerRow: 2,
                maxRows: 1
            },
            sourceNote: "US Census Bureau's USA Trade Online"
        };
    }
    
    /**
     * Load HS section trade data from the specified path
     * 
     * @param {string} dataPath - Path to the data file
     * @returns {Promise<Array>} Promise resolving to an array of section trade data
     */
    async function loadSectionTradeData(dataPath) {
        try {
            // Return cached data if available
            if (cachedSectionTradeData) {
                return cachedSectionTradeData;
            }
            
            // Otherwise, attempt to load the data from the server
            const response = await fetch(dataPath);
            if (!response.ok) {
                throw new Error(`Failed to load section trade data: ${response.status} ${response.statusText}`);
            }
            
            cachedSectionTradeData = await response.json();
            //console.log(`Loaded ${cachedSectionTradeData.length} section trade data entries`);
            return cachedSectionTradeData;
        } catch (error) {
            console.error('Error loading section trade data:', error);
            return null;
        }
    }
    
    /**
     * Get all available HS sections from the data
     * 
     * @returns {Promise<Array>} Promise resolving to an array of HS section objects
     */
    async function getAvailableSections(dataPath = window.DataPaths.trade_data.country_section_series) {
        try {
            const data = await loadSectionTradeData(dataPath);
            if (!data) return [];
            
            // Extract unique sections with their titles
            const sectionsMap = {};
            
            data.forEach(entry => {
                if (entry.hs_section && entry.hs_section_title) {
                    sectionsMap[entry.hs_section] = entry.hs_section_title;
                }
            });
            
            // Convert to array of objects
            return Object.entries(sectionsMap)
                .map(([code, title]) => ({ code, title }))
                .sort((a, b) => {
                    // Try to sort numerically first
                    const numA = parseInt(a.code);
                    const numB = parseInt(b.code);
                    
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    
                    // Fall back to string comparison
                    return a.code.localeCompare(b.code);
                });
        } catch (error) {
            console.error('Error getting available sections:', error);
            return [];
        }
    }
    
    /**
     * Clear the data cache to force reloading
     */
    function clearCache() {
        cachedSectionTradeData = null;
    }
    
    // Public API
    return {
        createChart,
        loadSectionTradeData,
        getAvailableSections,
        clearCache
    };
})();