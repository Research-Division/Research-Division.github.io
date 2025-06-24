/**
 * Compressed Country Treemap Module
 * 
 * Visualizes trade data using the optimized compressed treemap implementation.
 * This module serves as an adapter between the modal UI and the compressed treemap renderer.
 */

window.compressedCountryTreemap = (function() {
    // Cache for loaded data
    let cachedData = null;
    
    /**
     * Create a compressed treemap visualization
     * 
     * @param {string} containerId - ID of the container element to render the chart in
     * @param {Object} params - Parameters for the chart
     * @param {string} params.dataType - Type of data to display ('imports' or 'exports')
     * @param {boolean} params.showLabels - Whether to show labels on the treemap
     * @param {boolean} params.animate - Whether to animate the treemap
     * @param {string} params.year - Year to display (for multi-year data)
     * @param {string} params.title - Custom title for the chart
     * @param {string} params.subtitle - Custom subtitle for the chart
     * @param {string} params.preserveTitles - Whether to preserve titles during drill-down/up
     * @param {Object} options - Additional options
     * @param {Function} options.onSuccess - Callback function when chart creation succeeds
     * @param {Function} options.onError - Callback function when chart creation fails
     */
    async function createChart(containerId, params = {}, options = {}) {
        const defaultParams = {
            dataType: 'imports',
            showLabels: true,
            animate: true,
            year: '2023', // Default to most recent year
            title: null,  // Default to auto-generated title
            subtitle: null, // Default to auto-generated subtitle
            preserveTitles: true // Default to preserving titles during navigation
        };
        
        const defaultOptions = {
            onSuccess: null,
            onError: null
        };
        
        // Merge defaults with provided parameters
        const chartParams = {...defaultParams, ...params};
        const chartOptions = {...defaultOptions, ...options};
        
        try {
            // Get chart container
            const chartContainer = document.getElementById(containerId);
            if (!chartContainer) {
                throw new Error(`Container with ID "${containerId}" not found`);
            }
            
            // Show loading indicator
            chartContainer.innerHTML = '<div class="loading-indicator">Loading multi-year trade data...</div>';
            
            // Load the data
            const data = await loadData();
            
            // Prepare chart configuration
            const dataType = chartParams.dataType;
            const year = chartParams.year;
            const goodsType = dataType === 'exports' ? 'Exports' : 'Imports';
            
            // Add empty metadata object if not present - this is required by the CompressedTreemap
            if (!data.metadata) {
                data.metadata = {};
            }
            
            // Use custom title if provided, otherwise generate default
            const title = chartParams.title || `World ${goodsType} (${year})`;
            
            // Use custom subtitle if provided, otherwise use default
            const subtitle = chartParams.subtitle || 'Click on a region to explore details';
            
            const chartConfig = {
                title: title,
                subtitle: subtitle,
                multiYearData: data,
                chartType: 'Compressed Country Treemap',
                showLabels: chartParams.showLabels,
                // Disable animation completely to ensure drilldown works properly
                animate: false, // Must be false for drilldown to work properly
                dataType: dataType,
                year: year,
                // Visual settings
                height: 500,
                valuePrefix: '$',
                enableDrillDown: true,
                legendLevel: 1,
                preserveTitles: chartParams.preserveTitles, // Pass through the preserveTitles option
                note: ` Country level ${goodsType} in ${year}. Import values as appraised by U.S. Customs, excluding import duties, freight, and insurance for general imports. Export values defined as the total value of the goods for export at the U.S. port of export.`,
                source: `US Census Bureau's USA Trade Online` , 
            };
            
            // Clear the container before rendering
            chartContainer.innerHTML = '';
            
            // Create the treemap using compressed treemap renderer
            if (window.sparksCompressedTreemap) {
                window.sparksCompressedTreemap(containerId, chartConfig);
                
                // Call success callback if provided
                if (chartOptions.onSuccess && typeof chartOptions.onSuccess === 'function') {
                    chartOptions.onSuccess();
                }
            } else {
                throw new Error('Compressed treemap renderer not available');
            }
            
        } catch (error) {
            console.error('Error creating compressed country treemap:', error);
            
            // Display error in container
            const chartContainer = document.getElementById(containerId);
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="chart-error">
                        <h3>Error creating chart</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
            
            // Call error callback if provided
            if (chartOptions.onError && typeof chartOptions.onError === 'function') {
                chartOptions.onError(error);
            }
        }
    }
    
    /**
     * Load the multi-year trade data
     * Uses caching to prevent redundant fetches
     * 
     * @returns {Promise<Object>} The loaded data
     */
    async function loadData() {
        // Use cached data if available
        if (cachedData) {
            return cachedData;
        }
        
        try {
            // Path to the multi-year trade data
            const dataUrl = window.DataPaths.trade_data.multi_year.short_hs_trade;
            
            // Use the sparksDataComponent if available for consistent data loading
            if (window.sparksGraphingCore && window.sparksGraphingCore.fetchWithCache) {
                // Use the core's fetchWithCache method
                cachedData = await window.sparksGraphingCore.fetchWithCache(dataUrl);
                return cachedData;
            }
            
            // Or try direct component access
            if (window.sparksDataComponent && window.sparksDataComponent.fetchData) {
                cachedData = await window.sparksDataComponent.fetchData(dataUrl);
                return cachedData;
            }
            
            // Fallback to direct fetch if component not available
            const response = await fetch(dataUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
            }
            
            cachedData = await response.json();
            return cachedData;
            
        } catch (error) {
            console.error('Error loading multi-year trade data:', error);
            throw error;
        }
    }
    
    /**
     * Clear the data cache
     */
    function clearCache() {
        cachedData = null;
    }
    
    // Public API
    return {
        createChart,
        clearCache
    };
})();