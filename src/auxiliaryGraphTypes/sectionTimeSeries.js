/**
 * Section Time Series Chart Component
 * 
 * Visualizes historical trade data for HS sections over time
 * Uses the modular sparksGraphFunctions library
 */

window.sectionTimeSeriesChart = (function() {
    // Cache for section data
    let sectionDataCache = null;
    
    /**
     * Create a time series chart showing HS sections by given metric
     * 
     * @param {string} containerId - ID of the container element to render the chart in
     * @param {string} metric - The metric to visualize ('impVal_section', 'expVal_section')
     * @param {number} numTop - Number of top sections to include (default: 0, which means all sections)
     * @param {Object} options - Additional options
     * @param {string} options.dataPath - Path to the data file (default: 'data/newTrade_data/chart_ready_hsSection_series.json')
     * @param {Function} options.onSuccess - Callback function when chart creation succeeds
     * @param {Function} options.onError - Callback function when chart creation fails
     */
    async function createChart(containerId, metric = 'impVal_section', numTop = 0, options = {}) {
        const defaultOptions = {
            dataPath: window.DataPaths.trade_data.hsSection_series,
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
            const sectionData = await loadSectionData(effectiveOptions.dataPath);
            
            // Get sections data based on numTop parameter (0 means all sections)
            const sectionsData = numTop > 0 
                ? getTopSectionsByMetric(sectionData, metric, numTop)
                : getAllSectionsByMetric(sectionData, metric);
            //console.log(`Sections for ${metric}:`, sectionsData.map(s => s.hs_section_title));
            
            // Get chart configuration from the configuration manager
            const chartConfig = window.chartUtils.getChartConfig('section', {
                metric: metric,
                numTop: numTop
            });
            
            // Initialize series array if not present
            if (!chartConfig.series) {
                chartConfig.series = [];
            }
            
            // Add axis labels if not present
            if (!chartConfig.xAxis) {
                chartConfig.xAxis = {};
            }
            if (!chartConfig.xAxis.title) {
                chartConfig.xAxis.title = 'Year';
            }
            
            if (!chartConfig.yAxis) {
                chartConfig.yAxis = {};
            }
            if (!chartConfig.yAxis.title) {
                const metricDisplay = sectionsData.length > 0 ? sectionsData[0].display_metric : 'Value';
                chartConfig.yAxis.title = metricDisplay;
            }
            
            // Add source and notes if not present
            if (!chartConfig.source) {
                chartConfig.source = `U.S. Census Bureau's USA Trade Online`;
            }
            
            // Get colors from configuration
            const colors = window.chartUtils.getChartColors();
            
            // Process each section's data into a series
            sectionsData.forEach((section, index) => {
                // Convert data into the expected format
                const validData = section.data
                    .filter(d => d.value !== null && d.value !== undefined && !isNaN(d.value))
                    .sort((a, b) => a.year - b.year);
                
                // Transform into x,y point format
                const seriesData = validData.map(d => ({
                    x: d.year,
                    y: d.value
                }));
                
                // Add tooltip configuration for proper formatting
                const tooltipFormatter = metric.includes('Share')
                    ? (value) => `${value.toFixed(1)}%`  // Just add % suffix for shares
                    : (value) => window.formatUtils.formatCurrency(value); // Use currency formatting for values
                
                // Only add series with valid data
                if (seriesData.length > 0) {
                    chartConfig.series.push({
                        name: section.hs_section_title,
                        color: colors[index % colors.length],
                        data: seriesData,
                        tooltipFormatter: tooltipFormatter
                    });
                }
            });
            
            // Update chart title and subtitle if needed
            if (!chartConfig.title) {
                const metricDisplay = sectionsData.length > 0 ? sectionsData[0].display_metric : 'Trade Value';
                chartConfig.title = `<b> Figure 1.</b>${metricDisplay} by HS Section (1992-2024)`;
            }
            
            if (!chartConfig.subtitle) {
                chartConfig.subtitle = numTop > 0 ? `Top ${numTop} HS Sections ranked by 2024 values.` : `All HS Sections`;
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
            console.error('Error creating section time series chart:', error);
            
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
     * Load HS section trade data from data file
     * 
     * @param {string} dataPath - Path to the data file
     * @returns {Array} Array of section data objects
     */
    async function loadSectionData(dataPath) {
        // Return cached data if available
        if (sectionDataCache) {
            return sectionDataCache;
        }
        
        // Load data from file
        const response = await fetch(dataPath);
        if (!response.ok) {
            throw new Error(`Failed to load trade data: ${response.status} ${response.statusText}`);
        }
        
        // Cache and return data
        sectionDataCache = await response.json();
        //console.log(`Loaded ${sectionDataCache.length} section data entries`);
        return sectionDataCache;
    }
    
    /**
     * Filter data to get top sections by a given metric
     * 
     * @param {Array} sectionData - Array of section data objects
     * @param {string} metric - The metric to filter by ('impVal_section', 'expVal_section', etc.)
     * @param {number} numTop - Number of top sections to include
     * @returns {Array} Array of filtered sections and their data
     */
    function getTopSectionsByMetric(sectionData, metric, numTop = 5) {
        // Filter data for the specified metric
        const metricData = sectionData.filter(d => d.metric === metric);
        
        // Calculate total value across all years for each section
        const sectionTotals = {};
        
        metricData.forEach(section => {
            // Skip sections with no data
            if (!section.data || section.data.length === 0) return;
            
            // Get the most recent year value that's not null
            const recentValues = section.data
                .filter(d => d.value !== null && d.value !== undefined)
                .sort((a, b) => b.year - a.year);
                
            if (recentValues.length > 0) {
                sectionTotals[section.hs_section] = {
                    hs_section_title: section.hs_section_title,
                    display_metric: section.display_metric,
                    value: recentValues[0].value,
                    data: section.data
                };
            }
        });
        
        // Sort sections by total value and get top N
        const sortedSections = Object.entries(sectionTotals)
            .sort((a, b) => b[1].value - a[1].value)
            .slice(0, numTop)
            .map(([hs_section, details]) => ({
                hs_section,
                hs_section_title: details.hs_section_title,
                display_metric: details.display_metric,
                data: details.data
            }));
            
        return sortedSections;
    }
    
    /**
     * Get all sections for a given metric
     * 
     * @param {Array} sectionData - Array of section data objects
     * @param {string} metric - The metric to filter by ('impVal_section', 'expVal_section', etc.)
     * @returns {Array} Array of all sections and their data, sorted by most recent value (descending)
     */
    function getAllSectionsByMetric(sectionData, metric) {
        // Filter data for the specified metric
        const metricData = sectionData.filter(d => d.metric === metric);
        
        // Organize data by section
        const sectionMap = {};
        
        metricData.forEach(section => {
            // Skip sections with no data
            if (!section.data || section.data.length === 0) return;
            
            // Find the most recent year's value
            const sortedData = [...section.data]
                .filter(d => d.value !== null && d.value !== undefined)
                .sort((a, b) => b.year - a.year);
            
            const mostRecentValue = sortedData.length > 0 ? sortedData[0].value : 0;
            
            sectionMap[section.hs_section] = {
                hs_section: section.hs_section,
                hs_section_title: section.hs_section_title,
                display_metric: section.display_metric,
                data: section.data,
                mostRecentValue: mostRecentValue
            };
        });
        
        // Convert to array and sort by most recent value (descending)
        const allSections = Object.values(sectionMap)
            .sort((a, b) => b.mostRecentValue - a.mostRecentValue);
            
        return allSections;
    }
    
    /**
     * Clear the data cache to force reloading
     */
    function clearCache() {
        sectionDataCache = null;
    }
    
    // Public API
    return {
        createChart,
        loadSectionData,
        getTopSectionsByMetric,
        clearCache
    };
})();