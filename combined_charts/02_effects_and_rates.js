/**
 * Tariff Effects Explorer Panel
 * 
 * This file implements a panel for visualizing tariff effects across 
 * different economic sectors using treemap visualizations.
 */

// Immediately load section mapping to ensure it's available for treemap
(function loadSectionMappingImmediately() {
    try {
        //console.log('Loading section mapping in 02_effects_and_rates.js');
        const xhr = new XMLHttpRequest();
        xhr.open('GET', DataPaths.meta.section_to_chapters, false); // Synchronous
        xhr.send(null);
        
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            window.sectionToChaptersMapping = data;
            //console.log('Section mapping loaded:', Object.keys(data).length, 'sections available');
        }
    } catch (error) {
        console.error('Error loading section mapping:', error);
    }
})();

window.tariffEffectsPanel = (function() {
    // Flag to track if the panel has been initialized
    let isInitialized = false;
    let isVisible = false;
    
    // Track if treemap dependencies are loaded
    let treemapDependenciesLoaded = false;
    
    /**
     * Initialize the panel structure
     */
    function initialize() {
        if (isInitialized) return;
        
        //console.log('Initializing tariff effects panel');
        
        // Create panel container if it doesn't exist
        createPanelContainer();
        
        // Load treemap dependencies
        loadTreemapDependencies();
        
        isInitialized = true;
    }
    
    /**
     * Load all necessary treemap dependencies
     */
    function loadTreemapDependencies() {
        if (treemapDependenciesLoaded || window.tariffEffectsTreemap) {
            //console.log('Treemap dependencies already loaded');
            treemapDependenciesLoaded = true;
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            //console.log('Loading treemap dependencies');
            
            const dependencies = [
                // Core dependencies first
                'src/utils/dataUtils/CompressedTreemap/metadataProvider.js',
                'src/utils/dataUtils/CompressedTreemap/treemapNode.js',
                'src/utils/dataUtils/CompressedTreemap/compressedDataAdapter.js',
                'src/utils/dataUtils/CompressedTreemap/treemapLayout.js',
                'src/utils/dataUtils/CompressedTreemap/treemapRenderer.js',
                'src/utils/dataUtils/CompressedTreemap/drillDownManager.js',
                'src/renderers/sparksCompressedTreemap.js',
                // Then our new modules
                'src/dataAux/tariffTreemapData.js',
                'src/auxiliaryGraphTypes/tariffEffectsTreemap.js'
            ];
            
            // Counter to track loaded scripts
            let loadedCount = 0;
            
            // Function to load a script
            function loadScript(src) {
                return new Promise((resolveScript, rejectScript) => {
                    // Check if script is already loaded
                    if (document.querySelector(`script[src="${src}"]`)) {
                        //console.log(`Script already loaded: ${src}`);
                        resolveScript();
                        return;
                    }
                    
                    const script = document.createElement('script');
                    script.src = src;
                    script.async = false; // Load in order
                    
                    script.onload = () => {
                        //console.log(`Loaded script: ${src}`);
                        resolveScript();
                    };
                    
                    script.onerror = () => {
                        console.error(`Error loading script: ${src}`);
                        rejectScript(new Error(`Failed to load ${src}`));
                    };
                    
                    document.head.appendChild(script);
                });
            }
            
            // Load scripts sequentially to respect dependencies
            dependencies.reduce((p, script) => 
                p.then(() => loadScript(script)), Promise.resolve())
                .then(() => {
                    //console.log('All treemap dependencies loaded successfully');
                    treemapDependenciesLoaded = true;
                    resolve();
                })
                .catch(error => {
                    console.error('Error loading treemap dependencies:', error);
                    reject(error);
                });
        });
    }
    
    /**
     * Create the panel container and add it to the DOM
     */
    function createPanelContainer() {
        // Check if the container already exists
        if (document.getElementById('tariff-effects-panel-container')) {
            return;
        }
        
        // Create the panel container
        const panelContainer = document.createElement('div');
        panelContainer.id = 'tariff-effects-panel-container';
        panelContainer.className = 'multi-chart-panel-container'; // Reuse the same class for consistent styling
        panelContainer.style.display = 'none'; // Hidden by default
        
        // Fetch the HTML content from the external file
        fetch(DataPaths.charts.effectsAndRates)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load HTML template: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                // Insert the HTML content
                panelContainer.innerHTML = html;
                
                // Add the panel to the body
                document.body.appendChild(panelContainer);
                
                // Set up event listeners
                setupEventListeners(panelContainer);
            })
            .catch(error => {
                console.error('Error loading tariff effects panel:', error);
            });
    }
    
    /**
     * Set up event listeners for the panel
     * @param {HTMLElement} container - The panel container
     */
    function setupEventListeners(container) {
        // Close button
        const closeButton = container.querySelector('#panel-close-button');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                hidePanel();
            });
        }

        // Reset treemap buttons
        const resetTotalButton = container.querySelector('#reset-treemap-button-total');
        if (resetTotalButton) {
            resetTotalButton.addEventListener('click', function() {
                //console.log('Resetting total effects treemap to initial state');
                createTreemap('total');
            });
        }

        const resetDirectButton = container.querySelector('#reset-treemap-button-direct');
        if (resetDirectButton) {
            resetDirectButton.addEventListener('click', function() {
                //console.log('Resetting direct effects treemap to initial state');
                createTreemap('direct');
            });
        }

        const resetIndirectButton = container.querySelector('#reset-treemap-button-indirect');
        if (resetIndirectButton) {
            resetIndirectButton.addEventListener('click', function() {
                //console.log('Resetting indirect effects treemap to initial state');
                createTreemap('indirect');
            });
        }
        
        // Setup tab switching event listeners
        const totalEffectsTab = container.querySelector('#total-effects-tab');
        if (totalEffectsTab) {
            totalEffectsTab.addEventListener('click', function() {
                switchToTab('total-effects');
            });
        }
        
        const directEffectsTab = container.querySelector('#direct-effects-tab');
        if (directEffectsTab) {
            directEffectsTab.addEventListener('click', function() {
                switchToTab('direct-effects');
            });
        }
        
        const indirectEffectsTab = container.querySelector('#indirect-effects-tab');
        if (indirectEffectsTab) {
            indirectEffectsTab.addEventListener('click', function() {
                switchToTab('indirect-effects');
            });
        }
    }
    
    /**
     * Show the panel and create treemap for the active tab
     */
    function showPanel() {
        // Make sure the panel is initialized
        if (!isInitialized) {
            initialize();
        }
        
        // Check if panel container exists
        const panelContainer = document.getElementById('tariff-effects-panel-container');
        if (!panelContainer) {
            console.error('Tariff effects panel container not found');
            return;
        }
        
        // Show the panel
        panelContainer.style.display = 'block';
        isVisible = true;
        
        // First, clear all data caches to ensure a fresh start
        clearAllDataCaches();
        
        // Make sure treemap dependencies are loaded before creating treemaps
        loadTreemapDependencies()
            .then(() => {
                // Create treemap for the active tab only
                createAllTreemaps();
            })
            .catch(error => {
                console.error('Error loading treemap dependencies:', error);
            });
    }
    
    /**
     * Hide the panel
     */
    function hidePanel() {
        const panelContainer = document.getElementById('tariff-effects-panel-container');
        if (panelContainer) {
            // Clean up any tooltips before hiding the panel
            const globalTooltip = document.getElementById('treemap-tooltip-container');
            if (globalTooltip) {
                globalTooltip.style.visibility = 'hidden';
                // Completely remove tooltip from DOM for complete cleanup
                if (globalTooltip.parentNode) {
                    globalTooltip.parentNode.removeChild(globalTooltip);
                }
            }
            
            panelContainer.style.display = 'none';
        }
        isVisible = false;
        
        // Clear all chart data caches when hiding panel
        clearAllDataCaches();
    }
    
    /**
     * Clear all data caches to free memory
     */
    function clearAllDataCaches() {
        // Clear treemap caches if available
        if (window.tariffEffectsTreemap && window.tariffEffectsTreemap.clearCache) {
            // Clear cache for each effect type
            ['total', 'direct', 'indirect', 'combined'].forEach(effectType => {
                window.tariffEffectsTreemap.clearCache(effectType);
            });
            //console.log('Cleared all tariff effects treemap caches');
        }
        
        // Clear the global treemap data variables to prevent cross-contamination
        ['direct', 'indirect', 'total', 'combined'].forEach(effectType => {
            // Clear effect-specific data
            if (window[`_lastTreemapData_${effectType}`]) {
                window[`_lastTreemapData_${effectType}`] = null;
                //console.log(`Cleared global treemap data for ${effectType} effects`);
            }
        });
        
        // Clear the shared data variable
        if (window._lastTreemapData) {
            window._lastTreemapData = null;
            //console.log('Cleared shared treemap data');
        }
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Clear any shared data caches
        if (window.sparksDataComponent && window.sparksDataComponent.clearCache) {
            window.sparksDataComponent.clearCache();
            //console.log('Cleared shared data component cache');
        }
    }
    
    /**
     * Switch between tabs
     * @param {string} tabId - ID of the tab to switch to
     */
    function switchToTab(tabId) {
        //console.log(`Switching to tab: ${tabId}`);
        
        // Get the tabs
        const totalEffectsTab = document.getElementById('total-effects-tab');
        const directEffectsTab = document.getElementById('direct-effects-tab');
        const indirectEffectsTab = document.getElementById('indirect-effects-tab');
        
        // Get tab content elements
        const totalEffectsContent = document.querySelector('.total-effects-content');
        const directEffectsContent = document.querySelector('.direct-effects-content');
        const indirectEffectsContent = document.querySelector('.indirect-effects-content');
        
        if (!totalEffectsTab || !directEffectsTab || !indirectEffectsTab || 
            !totalEffectsContent || !directEffectsContent || !indirectEffectsContent) {
            console.error('Required DOM elements not found for tab switching');
            return;
        }
        
        // Clear all data caches when switching tabs
        clearAllDataCaches();
        
        // First, remove active class from all tabs and content
        totalEffectsTab.classList.remove('active');
        directEffectsTab.classList.remove('active');
        indirectEffectsTab.classList.remove('active');
        
        totalEffectsContent.classList.remove('active');
        directEffectsContent.classList.remove('active');
        indirectEffectsContent.classList.remove('active');
        
        // Then set the active tab and content based on tabId
        if (tabId === 'total-effects') {
            totalEffectsTab.classList.add('active');
            totalEffectsContent.classList.add('active');
            createTreemap('total');
        } else if (tabId === 'direct-effects') {
            directEffectsTab.classList.add('active');
            directEffectsContent.classList.add('active');
            createTreemap('direct');
        } else if (tabId === 'indirect-effects') {
            indirectEffectsTab.classList.add('active');
            indirectEffectsContent.classList.add('active');
            createTreemap('indirect');
        } else {
            console.error('Unknown tab ID:', tabId);
            // Default to total effects tab
            totalEffectsTab.classList.add('active');
            totalEffectsContent.classList.add('active');
            createTreemap('total');
        }
    }
    
    /**
     * Create all treemaps for the different effect types
     */
    function createAllTreemaps() {
        // Create the treemap for the active tab only
        const totalEffectsTab = document.getElementById('total-effects-tab');
        const directEffectsTab = document.getElementById('direct-effects-tab');
        const indirectEffectsTab = document.getElementById('indirect-effects-tab');
        
        if (totalEffectsTab && totalEffectsTab.classList.contains('active')) {
            createTreemap('total');
        } else if (directEffectsTab && directEffectsTab.classList.contains('active')) {
            createTreemap('direct');
        } else if (indirectEffectsTab && indirectEffectsTab.classList.contains('active')) {
            createTreemap('indirect');
        } else {
            // Default: create the total effects treemap
            createTreemap('total');
        }
    }
    
    /**
     * Create a tariff effects treemap visualization
     * @param {string} effectType - Type of effect ('total', 'direct', 'indirect', or 'combined')
     */
    function createTreemap(effectType) {
        //console.log(`Creating treemap for ${effectType} effects`);
        
        // Get container ID based on effect type
        const containerId = `${effectType}-effects-treemap`;
        
        // Get container
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Treemap container '${containerId}' not found`);
            return;
        }
        
        // Show loading indicator
        container.innerHTML = '<div class="chart-loading">Loading treemap data...</div>';
        
        // Check if the required window objects are available
        if (!window.tariffEffectsTreemap) {
            console.error('tariffEffectsTreemap module not available');
            container.innerHTML = '<div class="error-message">Required modules not loaded. Please try refreshing the page.</div>';
            return;
        }
        
        // Check if tariff effects data is available
        const dataAvailable = checkTariffEffectsDataAvailability(effectType);
        if (!dataAvailable) {
            console.error(`Tariff ${effectType} effect data not available`);
            container.innerHTML = `
                <div class="error-message">
                    <h3>No Data Available</h3>
                    <p>Tariff ${effectType} effect data is not available. Please calculate tariff effects first.</p>
                </div>
            `;
            return;
        }
        
        // First, clear any existing treemap data for this effect type
        if (window.tariffEffectsTreemap && window.tariffEffectsTreemap.clearCache) {
            window.tariffEffectsTreemap.clearCache(effectType);
        }
        
        // Configure and create the treemap
        const options = {
            showLabels: true,
            animate: false, // Disable animation so legends render properly
            preserveTitles: true,
            title: `Tariff ${capitalizeFirstLetter(effectType)} Effects`,
            subtitle: 'Breakdown by economic sector',
            resetToRoot: true, // Force reset to root level
            onSuccess: function(config) {
                //console.log(`${effectType} effects treemap created successfully`);
            },
            onError: function(error) {
                console.error(`Error creating ${effectType} treemap:`, error);
                container.innerHTML = `
                    <div class="error-message">
                        <h3>Error Creating Chart</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        };
        
        // Create the treemap
        window.tariffEffectsTreemap.createChart(containerId, effectType, options);
    }
    
    /**
     * Check if tariff effects data is available
     * @param {string} effectType - Type of effect ('total', 'direct', 'indirect', or 'combined')
     * @returns {boolean} True if data is available
     */
    function checkTariffEffectsDataAvailability(effectType) {
        switch (effectType) {
            case 'direct':
                return !!window.nipaDirectLayerAggregations;
            case 'indirect':
                return !!window.nipaIndirectLayerAggregations;
            case 'total':
                return !!window.nipaTotalLayerAggregations;
            case 'combined':
                return !!window.nipaDirectLayerAggregations && !!window.nipaIndirectLayerAggregations;
            default:
                return false;
        }
    }
    
    /**
     * Helper function to capitalize the first letter of a string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    function capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Toggle the panel visibility
     */
    function togglePanel() {
        if (isVisible) {
            hidePanel();
        } else {
            showPanel();
        }
    }
    
    /**
     * Public API
     */
    return {
        initialize,
        showPanel,
        hidePanel,
        togglePanel,
        createAllTreemaps,
        createTreemap,
        clearAllDataCaches
    };
})();

// Initialize when document is loaded - but don't show automatically
document.addEventListener('DOMContentLoaded', function() {
    window.tariffEffectsPanel.initialize();
});