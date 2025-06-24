/**
 * Tariff Effects Treemap Module
 * 
 * Visualizes tariff effects using the optimized compressed treemap implementation.
 * This module serves as an adapter between the receipt data and the compressed treemap renderer.
 */

window.tariffEffectsTreemap = (function() {
    // Cache for loaded data
    let cachedData = {};
    
    /**
     * Applies household income to transform raw effects into dollar impacts
     * @param {Object} data - Treemap data structure
     * @param {number} householdIncome - The household income value to apply
     */
    function applyHouseholdIncome(data, householdIncome) {
        if (!data || !data.hierarchy || !data.hierarchy[0] || householdIncome <= 0) {
            console.error('Invalid data or household income for dollar impact transformation');
            return;
        }
        
        //console.log(`Applying household income of $${householdIncome.toLocaleString()} to treemap data`);
        
        // Function to recursively transform node values to dollar impacts
        function transformNode(node) {
            if (!node) return;
            
            // Store original value in metadata if not already present
            const originalValue = node[2];
            
            // Calculate dollar impact by multiplying effect by household income
            const dollarImpact = originalValue * householdIncome;
            
            // Update the node value to the dollar impact
            node[2] = dollarImpact;
            
            // Store original value in metadata
            if (data.metadata && data.metadata[node[0]]) {
                // Only store if not already present (to avoid overwriting)
                if (data.metadata[node[0]].originalValue === undefined) {
                    data.metadata[node[0]].originalValue = originalValue;
                }
                data.metadata[node[0]].value = dollarImpact;
            }
            
            // Transform children recursively
            if (node[3] && Array.isArray(node[3])) {
                node[3].forEach(childNode => transformNode(childNode));
            }
        }
        
        // Start transformation from the root node
        transformNode(data.hierarchy[0]);
        
        // Update the multi-year data structure if present
        if (data.effects && data.effects['2025'] && Array.isArray(data.effects['2025'])) {
            data.effects['2025'].forEach(rootNode => transformNode(rootNode));
        }
        
        ///console.log('Transformed treemap data to show dollar impacts');
    }

    /**
     * Transforms treemap data values to percentages
     * @param {Object} data - Treemap data structure
     * @param {number} totalValue - The total value to calculate percentages against
     */
    function transformToPercentages(data, totalValue) {
        if (!data || !data.hierarchy || !data.hierarchy[0] || totalValue <= 0) {
            console.error('Invalid data or total value for percentage transformation');
            return;
        }
        
        // Function to recursively transform node values to percentages
        function transformNode(node) {
            if (!node) return;
            
            // Convert value to percentage of total (0-100 scale)
            const originalValue = node[2];
            const percentValue = (originalValue / totalValue) * 100;
            
            // Store as full precision value - formatting will be handled by the valueFormatter
            node[2] = percentValue;
            
            // Store original value in metadata
            if (data.metadata && data.metadata[node[0]]) {
                data.metadata[node[0]].originalValue = originalValue;
            }
            
            // Transform children recursively
            if (node[3] && Array.isArray(node[3])) {
                node[3].forEach(childNode => transformNode(childNode));
            }
        }
        
        // Start transformation from the root node
        transformNode(data.hierarchy[0]);
        
        // Update metadata for the root node
        if (data.metadata && data.metadata['tariff_root']) {
            data.metadata['tariff_root'].originalValue = data.metadata['tariff_root'].value;
            data.metadata['tariff_root'].value = 100; // Root is 100% of total
        }
        
        //console.log('Transformed treemap data to show percentages');
    }

    /**
     * Create a tariff effects treemap visualization
     * 
     * @param {string} containerId - ID of the container element to render the chart in
     * @param {string} effectType - Type of effect to display ('direct', 'indirect', 'total', or 'combined')
     * @param {Object} options - Additional options
     * @param {boolean} options.showLabels - Whether to show labels on the treemap
     * @param {boolean} options.animate - Whether to animate the treemap
     * @param {string} options.title - Custom title for the chart
     * @param {string} options.subtitle - Custom subtitle for the chart
     * @param {string} options.preserveTitles - Whether to preserve titles during drill-down/up
     * @param {boolean} options.showPercentages - Whether to display percentage shares instead of absolute values
     * @param {number} options.totalEffectValue - Total effect value used for percentage calculations
     * @param {Function} options.onSuccess - Callback function when chart creation succeeds
     * @param {Function} options.onError - Callback function when chart creation fails
     */
    function createChart(containerId, effectType = 'total', options = {}) {
        const defaultOptions = {
            showLabels: true,
            animate: false, // Animation can cause issues with drilldown
            title: null,  // Default to auto-generated title
            subtitle: null, // Default to auto-generated subtitle
            preserveTitles: true, // Default to preserving titles during navigation
            showPercentages: false, // Default to showing absolute values
            totalEffectValue: null, // Total effect value for percentage calculations
            onSuccess: null,
            onError: null
        };
        
        // Merge defaults with provided options
        const chartOptions = {...defaultOptions, ...options};
        
        try {
            // Get chart container
            const chartContainer = document.getElementById(containerId);
            if (!chartContainer) {
                throw new Error(`Container with ID "${containerId}" not found`);
            }
            
            // Show loading indicator
            chartContainer.innerHTML = '<div class="loading-indicator">Processing tariff effect data...</div>';
            
            // Get the appropriate treemap data based on effect type
            let treemapData = cachedData[effectType];
            
            // If not cached, generate it
            if (!treemapData) {
                treemapData = window.TariffTreemapData.getTreemapDataFromWindow(effectType);
                
                if (!treemapData) {
                    throw new Error(`Tariff ${effectType} effect data not available. Please calculate tariff effects first.`);
                }
                
                // Cache for future use
                cachedData[effectType] = treemapData;
            }
            
            // Make a deep copy of the data to avoid modifying the cache
            treemapData = JSON.parse(JSON.stringify(treemapData));
            
            // Apply household income to transform the raw effects into dollar impacts
            if (chartOptions.householdIncome && typeof chartOptions.householdIncome === 'number') {
                applyHouseholdIncome(treemapData, chartOptions.householdIncome);
            }
            
            // If we're showing percentages and have a total effect value, transform the data
            if (chartOptions.showPercentages && chartOptions.totalEffectValue) {
                // Transform the hierarchy to show percentages
                transformToPercentages(treemapData, chartOptions.totalEffectValue);
            }
            
            // Generate chart titles based on effect type
            const titlePrefix = chartOptions.title || 'Tariff';
            const effectTitle = effectType.charAt(0).toUpperCase() + effectType.slice(1);
            const title = chartOptions.title || `${titlePrefix} ${effectTitle} Effects`;
            
            // Generate subtitle
            const subtitle = chartOptions.subtitle || 'Click on a sector to explore details';
            
            // Set appropriate value formatting based on display mode
            const valuePrefix = chartOptions.showPercentages ? (chartOptions.valuePrefix || '') : (chartOptions.valuePrefix || '');
            const valueSuffix = chartOptions.showPercentages ? (chartOptions.valueSuffix || '%') : (chartOptions.valueSuffix || '');
            
            // Prepare chart configuration
            const chartConfig = {
                title: title,
                subtitle: subtitle,
                chartType: 'Tariff Effects Treemap',
                showLabels: chartOptions.showLabels,
                showValues: true, // Explicitly set to show values
                animate: chartOptions.animate,
                height: chartOptions.height || 500,
                valuePrefix: valuePrefix,
                valueSuffix: valueSuffix,
                enableDrillDown: true,
                legendLevel: chartOptions.legendLevel || 1,
                preserveTitles: chartOptions.preserveTitles,
                note: chartOptions.note || 'Hover over a sector for details and click to drill down.',
                sourceNote: chartOptions.sourceNote || 'Tariff effect calculations by Federal Reserve Bank of Atlanta',
                year: '2025', // Use fixed year for data compatibility
                
                // Pass through showPercentages flag
                showPercentages: chartOptions.showPercentages,
                totalEffectValue: chartOptions.totalEffectValue,
                // Use custom formatter to show dollar values nicely
                valueFormatter: (value) => {
                    // Format as dollar values with appropriate scaling (K, M, etc.)
                    if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
                    if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
                    return value.toFixed(2);
                },
                tooltipFormatter: chartOptions.tooltipFormatter,
                
                // Set higher maxDepth to allow deeper drill-down
                maxDepth: chartOptions.maxDepth || 10, // Allow up to 10 levels of drill-down
                
                // Add drill-down manager options to allow more levels
                drillDownManagerOptions: chartOptions.drillDownManagerOptions || {
                    // Override the default drill-down levels (was only 3)
                    drillDownLevels: ['level0', 'level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'],
                    maxDrillLevel: 10, // Allow up to 10 levels of drill-down
                    disabledLevels: [] // No disabled levels
                },
                
                // The treemap data structure
                data: treemapData,
                // Add dataType to support the multi-year treemap renderer
                dataType: 'effects',
                // Add effectType to distinguish between different effect treemaps
                effectType: effectType,
                multiYearData: {
                    years: ['2025'],
                    effects: {
                        '2025': [treemapData.hierarchy[0]]
                    },
                    metadata: treemapData.metadata
                }
            };
            
            // Clear the container before rendering
            chartContainer.innerHTML = '';
            
            // Create the treemap using compressed treemap renderer
            if (window.sparksCompressedTreemap) {
                // Store the treemap data in an effect-specific global variable for inspection
                // This prevents cross-contamination between different effect treemaps
                window[`_lastTreemapData_${effectType}`] = treemapData;
                
                // For backwards compatibility, also store in the original variable
                // This ensures other components that might still be using the old variable name work
                window._lastTreemapData = treemapData;
                
                // Log the chart config for debugging
                /*
                console.log('Creating tariff effects treemap with config:', JSON.stringify({
                    chartType: chartConfig.chartType,
                    showValues: chartConfig.showValues,
                    householdIncome: chartConfig.householdIncome
                }));
                */
                // Create the actual treemap
                const treemap = window.sparksCompressedTreemap(containerId, chartConfig);
                
                // Add effect type to the root node if the treemap is created
                if (treemap && treemap.rootNode) {
                    // Store the effect type on the root node
                    //console.log(`Setting effect type ${effectType} on root node ${treemap.rootNode.id}`);
                    treemap.rootNode._effectType = effectType;
                    
                    // Also set it on immediate children
                    if (treemap.rootNode.children) {
                        treemap.rootNode.children.forEach(child => {
                            child._effectType = effectType;
                        });
                    }
                }
                
                // Call success callback if provided
                if (chartOptions.onSuccess && typeof chartOptions.onSuccess === 'function') {
                    chartOptions.onSuccess(chartConfig);
                }
            } else {
                throw new Error('Compressed treemap renderer not available');
            }
            
        } catch (error) {
            console.error('Error creating tariff effects treemap:', error);
            
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
     * Clear the data cache
     * @param {string} effectType - Optional effect type to clear ('direct', 'indirect', 'total')
     *                             If not provided, all caches will be cleared
     */
    function clearCache(effectType) {
        if (effectType) {
            // Clear specific effect type cache
            if (cachedData[effectType]) {
                delete cachedData[effectType];
            }
            
            // Also clear the corresponding global variable
            const globalVarName = `_lastTreemapData_${effectType}`;
            if (window[globalVarName]) {
                window[globalVarName] = null;
            }
        } else {
            // Clear all caches
            cachedData = {};
            
            // Clear all global variables
            ['direct', 'indirect', 'total', 'combined'].forEach(type => {
                const globalVarName = `_lastTreemapData_${type}`;
                if (window[globalVarName]) {
                    window[globalVarName] = null;
                }
            });
            
            // Also clear the legacy global variable
            if (window._lastTreemapData) {
                window._lastTreemapData = null;
            }
        }
    }
    
    // Public API
    return {
        createChart,
        clearCache
    };
})();