/**
 * sparksCompressedTreemap.js
 * 
 * Renderer for compressed treemap visualizations integrated with Sparks Graphing core.
 * This is the main entry point for using compressed treemaps in the Sparks Graphing system.
 */

// Use global namespace pattern instead of ES Module imports
// The CompressedTreemap components should be loaded before this file

/**
 * Preload section to chapter mappings for better name resolution
 * This ensures that the mapping is available before rendering the treemap
 * @returns {Promise} Promise that resolves when the mapping is loaded
 */
function preloadSectionMapping() {
  return new Promise((resolve, reject) => {
    // If mapping is already loaded, return immediately
    if (window.sectionToChaptersMapping) {
      //console.log('Section mapping already loaded');
      //console.log('Available sections:', Object.keys(window.sectionToChaptersMapping).length);
      //console.log('Sample section keys:', Object.keys(window.sectionToChaptersMapping).slice(0, 5).join(', '));
      resolve(window.sectionToChaptersMapping);
      return;
    }
    
    // Get the mapping path -- fallback is nice but might not be necessary. 
    const mappingPath = window.DataPaths && window.DataPaths.meta ? 
      window.DataPaths.meta.section_to_chapters : 
      'data/metadata/section_to_chapters_full_rewritten.json';
    
    //console.log('Preloading section to chapter mapping from:', mappingPath);
    
    // Use a synchronous XMLHttpRequest to ensure the mapping is available before rendering
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', mappingPath, false);  // false makes it synchronous
      xhr.send(null);
      
      if (xhr.status === 200) {
        //console.log('Section mapping loaded synchronously, parsing JSON...');
        const data = JSON.parse(xhr.responseText);
        
        // Cache the mapping globally
        window.sectionToChaptersMapping = data;
        
        //console.log('Section to chapter mapping preloaded successfully');
        //console.log('Available sections:', Object.keys(data).length);
        //console.log('Sample section keys:', Object.keys(data).slice(0, 5).join(', '));
        
        // Log a sample section for debugging
      
        resolve(data);
      } else {
        throw new Error(`Failed to load section mapping: ${xhr.status}`);
      }
    } catch (error) {
      console.error('Error with synchronous section mapping load:', error);
      
      // Fall back to async fetch
      fetch(mappingPath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load section mapping: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          // Cache the mapping globally
          window.sectionToChaptersMapping = data;
          resolve(data);
        })
        .catch(error => {
          console.error('Error in fallback fetch for section mapping:', error);
          // Resolve with null to allow rendering to continue
          resolve(null);
        });
    }
  });
}

/**
 * Render a compressed treemap visualization
 * @param {string} containerId - Container element ID
 * @param {Object} config - Chart configuration
 */
// Load section mapping at module initialization
(function loadInitialSectionMapping() {
  const mappingPath = window.DataPaths && window.DataPaths.meta ? 
    window.DataPaths.meta.section_to_chapters : 
    'data/metadata/section_to_chapters_full_rewritten.json';
  
  //console.log('Preloading section mapping at module initialization from:', mappingPath);
  
  // Use a synchronous XMLHttpRequest to ensure the mapping is available before first render
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', mappingPath, false);  // false makes it synchronous
    xhr.send(null);
    
    if (xhr.status === 200) {
      //console.log('Section mapping loaded synchronously at initialization');
      const data = JSON.parse(xhr.responseText);
      
      // Cache the mapping globally
      window.sectionToChaptersMapping = data;
      
      //console.log('Section to chapter mapping initialized:');
      //console.log('Available sections:', Object.keys(data).length);
      //console.log('Sample section keys:', Object.keys(data).slice(0, 5).join(', '));
            
    } else {
      console.error(`Failed to load section mapping at initialization: ${xhr.status}`);
    }
  } catch (error) {
    console.error('Error with synchronous section mapping load at initialization:', error);
    // We'll try again during rendering
  }
})();

window.sparksCompressedTreemap = function(containerId, config) {
  try {
    // Get container and check existence
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with ID '${containerId}' not found`);
      return;
    }
    
    // Show loading state
    container.innerHTML = '<div class="loading-treemap">Loading treemap data...</div>';
    
    // Make sure section mapping is loaded before rendering
    if (!window.sectionToChaptersMapping) {
      // Try to load it if not already loaded
      preloadSectionMapping().then(() => {
        renderTreemap(container, containerId, config);
      });
    } else {
      // Section mapping already loaded, render immediately
      renderTreemap(container, containerId, config);
    }
  } catch (error) {
    console.error('Error initializing compressed treemap:', error);
    
    // Show error in container
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="treemap-error">
          <h3>Error Creating Treemap</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }
};

/**
 * Internal function to render the treemap after preloading
 * @param {HTMLElement} container - Container element
 * @param {string} containerId - Container element ID
 * @param {Object} config - Chart configuration
 */
function renderTreemap(container, containerId, config) {
  // Add debugging for node clicks
  window._debugNodeClicks = true;
  
  // Store the treemap data for debugging - in effect-specific variables if effectType is provided
  const effectType = config.effectType || 'default';
  
  // Always store in the effect-specific variable
  window[`_lastTreemapData_${effectType}`] = config.data || config.multiYearData;
  
  // Also store in the generic variable, but this shouldn't be used directly for drill-down
  window._lastTreemapData = config.data || config.multiYearData;
  
  // Log which data variable we're using
  
  // Listen for the treemap-node-click event to debug node details
  document.addEventListener('treemap-node-click', (event) => {
    if (window._debugNodeClicks) {
      const node = event.detail.node;
      
      // Extract key information about the node
      const nodeInfo = {
        id: node.id,
        name: node.name || 'unnamed',
        level: node.level,
        value: node.value,
        hasChildren: node.children && node.children.length > 0,
        childCount: node.children ? node.children.length : 0,
        children: node.children ? node.children.map(c => ({
          id: c.id, 
          name: c.name || 'unnamed',
          level: c.level,
          value: c.value
        })) : [],
        rect: node.rect,
        metadata: window._lastTreemapData && window._lastTreemapData.metadata ? 
          window._lastTreemapData.metadata[node.id] : null
      };
      
      
      // Log all nodes of the next level from the hierarchy
      if (window._lastTreemapData && node.level < 6) {
        const parentId = node.id;
        const nextLevel = node.level + 1;
        
        // Look for child nodes in the metadata
        const childNodes = Object.entries(window._lastTreemapData.metadata)
          .filter(([id, meta]) => meta.parent === parentId)
          .map(([id, meta]) => ({ id, ...meta }));
        
        // DEBUG the child node if found... 
        /*
        console.log(`Found ${childNodes.length} children in layer ${nextLevel}:`, 
          childNodes.map(child => `${child.id} (${child.name})`));
        */
        // No longer downloading JSON files, just keeping console diagnostics
      }
    }
  }, false);
  
  try {
    // Get configuration using ChartConfigManager if available
    let finalConfig = config;
    if (window.sparksChartConfigManager) {
      const baseConfig = window.sparksChartConfigManager.getChartConfig('treemap', {
        metric: config.metric || 'default'
      });
      finalConfig = { ...baseConfig, ...config };
    }
    
    // Get core components
    const coreModule = window.sparksGraphingCore;
    // Access components directly from the window object since sparksGraphingCore
    // doesn't expose a getComponent method in its public API
    const uiComponent = window.sparksUIComponent;
    const styleManager = window.sparksStyleManager;
    
    // Clear container
    container.innerHTML = '';
    
    // Create chart structure if UI component is available
    if (uiComponent) {
      uiComponent.createChartContainer(containerId, finalConfig);
    }
    
    // Get visualization container
    const chartVisualization = container.querySelector('.chart-visualization') || container;
    
    // Remove the existing SVG if it exists - we'll create our own
    const existingSvg = chartVisualization.querySelector('svg');
    if (existingSvg) {
      existingSvg.remove();
    }
    
    // IMPORTANT: Clean up any existing legends that might have been created during previous renders
    // Find all legend containers in the visualization and its parent
    const existingLegends = container.querySelectorAll('.treemap-legend');
    existingLegends.forEach(legend => {
      legend.remove();
    });
    
    // Also hide any empty chart-legend containers
    const emptyChartLegends = document.querySelectorAll('.chart-legend:empty');
    emptyChartLegends.forEach(legend => {
      legend.style.display = 'none';
      legend.style.height = '0';
      legend.style.margin = '0';
      legend.style.padding = '0';
    });
    
    // Also check for legends in the chart-visualization-container if it exists
    const chartVisContainer = container.querySelector('.chart-visualization-container');
    if (chartVisContainer) {
      const containerLegends = chartVisContainer.querySelectorAll('.treemap-legend');
      containerLegends.forEach(legend => {
        legend.remove();
      });
    }
    
    // Also check parent containers
    if (container.parentElement) {
      const parentLegends = container.parentElement.querySelectorAll('.treemap-legend');
      parentLegends.forEach(legend => {
        legend.remove();
      });
      
      // Check parent of parent for chart-visualization-container
      if (container.parentElement.parentElement) {
        const chartVisContainer = container.parentElement.parentElement.querySelector('.chart-visualization-container');
        if (chartVisContainer) {
          const containerLegends = chartVisContainer.querySelectorAll('.treemap-legend');
          containerLegends.forEach(legend => {
            legend.remove();
          });
        }
      }
    }
    
    // IMPORTANT FIX: Ensure the chart-visualization div expands to fit the treemap
    // This is a JS fallback for browsers that don't support the :has() CSS selector
    if (chartVisualization.classList.contains('chart-visualization')) {
      // Apply styles directly to ensure proper layout
      chartVisualization.style.height = 'auto';
      chartVisualization.style.minHeight = '500px';
      chartVisualization.style.display = 'flex';
      chartVisualization.style.flexDirection = 'column';
      
      // Add a class to mark this container as having a treemap
      chartVisualization.classList.add('contains-treemap');
    }
    
    // Setup options
    const renderOptions = {
      // Extract relevant properties from config
      height: finalConfig.height || 500,
      animate: finalConfig.animate !== false,
      showLabels: finalConfig.showLabels !== false,
      showValues: finalConfig.showValues !== false,
      enableDrillDown: finalConfig.enableDrillDown !== false,
      year: finalConfig.year,
      dataType: finalConfig.dataType || 'imports',
      valuePrefix: finalConfig.valuePrefix || '$',
      valueSuffix: finalConfig.valueSuffix || '',
      legendLevel: finalConfig.legendLevel || 1,
      
      // Pass percentage-related options
      showPercentages: finalConfig.showPercentages || false,
      totalEffectValue: finalConfig.totalEffectValue || null,
      valueFormatter: finalConfig.valueFormatter,
      tooltipFormatter: finalConfig.tooltipFormatter,
      
      // Add callbacks
      onDrillDown: finalConfig.onDrillDown,
      onDrillUp: finalConfig.onDrillUp
    };
    
    // Create treemap based on data type
    let treemap;
    
    // complete debug info about data
    /*
    console.log('DEBUG: Rendering compressed treemap with:');
    console.log('- Config:', Object.keys(finalConfig));
    console.log('- Data types available:', finalConfig.data ? 'direct data' : '', 
                finalConfig.multiYearData ? 'multi-year data' : '');
    
    // Verify functions exist
    console.log('- Required functions exist:', {
      createCompressedTreemap: !!window.CompressedTreemap.createCompressedTreemap,
      renderMultiYearTreemap: !!window.CompressedTreemap.renderMultiYearTreemap,
      extractParentData: !!window.CompressedTreemap.extractParentData,
      getIndustryBreakdown: !!window.CompressedTreemap.getIndustryBreakdown
    });
    */
    if (finalConfig.data) {
      // Render with provided data
      treemap = window.CompressedTreemap.createCompressedTreemap(chartVisualization, finalConfig.data, renderOptions);
    } else if (finalConfig.multiYearData) {
      // Render with multi-year data
      treemap = window.CompressedTreemap.renderMultiYearTreemap(chartVisualization, finalConfig.multiYearData, renderOptions);
    } else if (finalConfig.dataPath) {
      // Load data from path
      // This would be implemented with a fetch operation
      console.error('Loading data from path not yet implemented');
      chartVisualization.innerHTML = '<div class="treemap-error">Loading data from path not implemented</div>';
      return;
    } else {
      console.error('No data provided for treemap');
      chartVisualization.innerHTML = '<div class="treemap-error">No data provided</div>';
      return;
    }
    
    // Apply style using StyleManager
    if (styleManager) {
      styleManager.applyStyleToChart(container);
    }
    
    // Apply post-render adjustments
    if (coreModule && coreModule.applyPostRenderAdjustments) {
      coreModule.applyPostRenderAdjustments(containerId, finalConfig);
    }
    
    // Return treemap instance for further interaction
    return treemap;
  } catch (error) {
    console.error('Error creating compressed treemap:', error);
    
    // Show error in container
    container.innerHTML = `
      <div class="treemap-error">
        <h3>Error Creating Treemap</h3>
        <p>${error.message}</p>
      </div>
    `;
    
    return null;
  }
}

// Add missing renderMultiYearTreemap function to ensure backwards compatibility
window.CompressedTreemap = window.CompressedTreemap || {};

// Re-add the renderMultiYearTreemap function
window.CompressedTreemap.renderMultiYearTreemap = function(container, data, options = {}) {
  
  // Create default renderer options
  const renderOptions = {
    height: options.height || 500,
    animate: options.animate !== false,
    showLabels: options.showLabels !== false,
    showValues: options.showValues !== false,
    enableDrillDown: options.enableDrillDown !== false,
    year: options.year,
    dataType: options.dataType || 'imports',
    valuePrefix: options.valuePrefix || '$',
    valueSuffix: options.valueSuffix || '',
    legendLevel: options.legendLevel || 1,
    showPercentages: options.showPercentages || false,
    totalEffectValue: options.totalEffectValue || null,
    valueFormatter: options.valueFormatter,
    tooltipFormatter: options.tooltipFormatter,
    onDrillDown: options.onDrillDown,
    onDrillUp: options.onDrillUp
  };
  
  // Create the data adapter and layout
  const metadataProvider = new window.CompressedTreemap.MetadataProvider(data.metadata || {});
  const adapter = new window.CompressedTreemap.CompressedDataAdapter(metadataProvider);
  
  // Convert multi-year data
  const result = adapter.convertMultiYearData(data, {
    year: options.year,
    dataType: options.dataType,
    maxDepth: options.maxDepth || 10 // Default to 10 levels if not specified, was defaulting to 3
  });
  
  if (!result || !result.rootNode) {
    console.error('Failed to convert multi-year data');
    return null;
  }
  
  const { rootNode } = result;
  
  // Create layout calculator
  const layout = new window.CompressedTreemap.TreemapLayout();
  layout.calculateLayout(rootNode, options);
  
  // Create renderer
  const renderer = new window.CompressedTreemap.TreemapRenderer(options);
  renderer.render(container, rootNode, layout, metadataProvider);
  
  return { renderer, layout, rootNode, metadataProvider };
};

// Register with sparksGraphingCore if available
if (window.sparksGraphingCore && window.sparksGraphingCore.registerRenderer) {
  window.sparksGraphingCore.registerRenderer('compressedTreemap', window.sparksCompressedTreemap);
}