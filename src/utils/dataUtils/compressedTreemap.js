/**
 * compressedTreemap.js
 * 
 * Main implementation of the compressed treemap visualization.
 * Coordinates all components and provides the public API.
 */

// Use global namespace pattern instead of ES Module imports
// The CompressedTreemap components should be loaded before this file

/**
 * Main treemap implementation for compressed data format
 */
class CompressedTreemapImpl {
  /**
   * Create a new compressed treemap
   * @param {Object} options - Treemap options
   */
  constructor(options = {}) {
    this.options = {
      padding: 1,
      animate: true,
      showLabels: true,
      showValues: true,
      height: 500,
      legendLevel: 1,
      valuePrefix: '$',
      enableDrillDown: true,
      maxDrillLevel: null,     // No maximum drill-down level by default
      disabledLevels: [],      // No levels are disabled by default
      ...options
    };
    
    this.dataAdapter = null;
    this.layout = null;
    this.renderer = null;
    this.drillDownManager = null;
    this.container = null;
    this._originalData = null;
  }
  
  /**
   * Render the treemap
   * @param {string|HTMLElement} container - Container ID or element
   * @param {Object} data - Data in compressed format
   * @param {Object} options - Render options
   * @returns {CompressedTreemapImpl} This instance for chaining
   */
  render(container, data, options = {}) {
    // Merge options
    const renderOptions = { ...this.options, ...options };
    
    // Store reference to original data
    this._originalData = data;
    
    // Get container element
    if (typeof container === 'string') {
      this.container = document.getElementById(container);
      if (!this.container) {
        console.error(`Container element with ID "${container}" not found`);
        return this;
      }
    } else if (container instanceof HTMLElement) {
      this.container = container;
    } else {
      console.error('Invalid container specified');
      return this;
    }
    
    // Initialize components
    this._initComponents(data, renderOptions);
    
    // Convert data to treemap nodes
    const convertedData = this._convertData(data, renderOptions);
    if (!convertedData || !convertedData.rootNode) {
      console.error('Failed to convert data');
      return this;
    }
    
    // Calculate layout
    const rootNode = this._calculateLayout(convertedData.rootNode, renderOptions);
    
    // Render treemap
    this._renderTreemap(rootNode, convertedData.metadataProvider, renderOptions);
    
    // Set up event listeners
    this._setupEventListeners(renderOptions);
    
    // Store metadata provider for later use
    this.metadataProvider = convertedData.metadataProvider;
    
    return this;
  }
  
  /**
   * Initialize components
   * @param {Object} data - Data in compressed format
   * @param {Object} options - Component options
   * @private
   */
  _initComponents(data, options) {
    // Create enhanced metadata provider with section mapping integration
    const metadata = data.metadata || {};
    
    // Create custom fallback provider function that uses section mapping
    const fallbackProvider = function(id, property) {
      // Only handle 'name' property requests
      if (property !== 'name') return null;
      
      // Access section mapping from global variable
      const sectionMapping = window.sectionToChaptersMapping || {};
      if (!sectionMapping || Object.keys(sectionMapping).length === 0) {
        //('Section mapping not available for fallback provider');
        return null;
      }
      
      // Check if this is a section ID (starts with 'S')
      if (id && id.toString().startsWith('S')) {
        const sectionId = id.toString().substring(1); // Remove the 'S'
        // Try string key first, then numeric key
        if (sectionMapping[sectionId] && sectionMapping[sectionId].title) {
          //console.log(`Section mapping found for ${id}: ${sectionMapping[sectionId].title}`);
          return sectionMapping[sectionId].title;
        } else if (sectionMapping[parseInt(sectionId, 10)] && sectionMapping[parseInt(sectionId, 10)].title) {
          //console.log(`Section mapping (numeric) found for ${id}: ${sectionMapping[parseInt(sectionId, 10)].title}`);
          return sectionMapping[parseInt(sectionId, 10)].title;
        }
      }
      
      // Check if this is a chapter with a parent section node
      // This is trickier since we need to scan all sections to find the chapter
      for (const sectionId in sectionMapping) {
        if (sectionMapping[sectionId].chapters) {
          // Try direct string match
          if (sectionMapping[sectionId].chapters[id]) {
            const chapterName = sectionMapping[sectionId].chapters[id].short;
            //console.log(`Chapter mapping found for ${id} in section ${sectionId}: ${chapterName}`);
            return chapterName;
          }
          
          // Try numeric match
          const numericId = parseInt(id, 10);
          if (!isNaN(numericId) && sectionMapping[sectionId].chapters[numericId]) {
            const chapterName = sectionMapping[sectionId].chapters[numericId].short;
            //console.log(`Chapter mapping (numeric) found for ${id} in section ${sectionId}: ${chapterName}`);
            return chapterName;
          }
        }
      }
      
      // No mapping found
      return null;
    };
    
    // Create the enhanced provider with the fallback
    //console.log('Creating enhanced metadata provider with section mapping integration');
    const metadataProvider = new window.CompressedTreemap.MetadataProvider(metadata, fallbackProvider);
    
    // Create data adapter
    this.dataAdapter = new window.CompressedTreemap.CompressedDataAdapter(metadataProvider);
    
    // Create layout calculator
    this.layout = new window.CompressedTreemap.TreemapLayout({
      padding: options.padding,
      animate: options.animate
    });
    
    // Create drill-down manager first (so we can check drill-down status)
    this.drillDownManager = new window.CompressedTreemap.DrillDownManager({
      drillDownLevels: options.drillDownLevels || ['continent', 'country', 'industry'],
      maxDrillLevel: options.maxDrillLevel || null,
      disabledLevels: options.disabledLevels || []
    });
    
    // Create renderer with drill-down status
    this.renderer = new window.CompressedTreemap.TreemapRenderer({
      showLabels: options.showLabels,
      showValues: options.showValues,
      animate: options.animate,
      height: options.height,
      valuePrefix: options.valuePrefix,
      valueSuffix: options.valueSuffix,
      legendLevel: options.legendLevel,
      drillDownEnabled: options.enableDrillDown !== false && 
                        this.drillDownManager.isDrillDownEnabled(0)
    });
    
    // Set up drill-down and drill-up handlers
    this.drillDownManager.setDrillDownHandler((node, level, context) => {
      this._handleDrillDown(node, level, context);
    });
    
    this.drillDownManager.setDrillUpHandler((level, id, context) => {
      this._handleDrillUp(level, id, context);
    });
  }
  
  /**
   * Convert data to treemap nodes
   * @param {Object} data - Data in compressed format
   * @param {Object} options - Conversion options
   * @returns {Object} Converted data with metadata provider and root node
   * @private
   */
  _convertData(data, options) {
    // Handle different data formats
    if (data.metadata && (data.hierarchy || (data.imports && data.years) || (data.exports && data.years) || (data.effects && data.years))) {
      // Multi-year trade data format
      const result = this.dataAdapter.convertMultiYearData(data, {
        year: options.year,
        dataType: options.dataType
      });
      
      // Debug: Log nodes to see if section mapping is working
      if (result && result.rootNode) {
        this._debugLogNodes(result.rootNode);
      }
      
      return result;
    } else if (Array.isArray(data) && data.length >= 3) {
      // Direct array format
      const rootNode = this.dataAdapter.convertArrayToTreemapNodes(data);
      
      // Debug: Log nodes
      this._debugLogNodes(rootNode);
      
      return {
        metadataProvider: this.dataAdapter.metadataProvider,
        rootNode
      };
    } else if (data.children) {
      // Standard hierarchical format - convert to compressed
      const compressedData = this.dataAdapter.convertHierarchicalToCompressed(data);
      const result = window.CompressedTreemap.buildCompressedTreemap(compressedData);
      
      // Debug: Log nodes
      if (result && result.rootNode) {
        this._debugLogNodes(result.rootNode);
      }
      
      return result;
    } else {
      console.error('Unsupported data format', data);
      return null;
    }
  }
  
  /**
   * Debug: Log node information to check name mapping
   * @param {TreemapNode} rootNode - Root node of the tree
   * @private
   */
  _debugLogNodes(rootNode) {
    //console.log('DEBUG: Checking node names after conversion');
    
    // Check if section mapping is available
    //console.log('Section mapping available:', !!window.sectionToChaptersMapping);
    
    // Function to traverse the tree and check names
    const checkNode = (node, level = 0) => {
      // Only log top 3 levels to avoid flooding console
      if (level <= 2) {
        // For section nodes, log more details
        if (node.id && node.id.toString().startsWith('S')) {
          //console.log(`[Level ${level}] Section node ${node.id}: "${node.name}" (parent: ${node.parent ? node.parent.id : 'none'})`);
        } 
        // For numeric nodes that might be chapters, log more details
        else if (!isNaN(parseInt(node.id, 10))) {
          //console.log(`[Level ${level}] Chapter node ${node.id}: "${node.name}" (parent: ${node.parent ? node.parent.id : 'none'})`);
        }
        // For other nodes, log basic info
        else if (level === 0) {
          //console.log(`[Level ${level}] Root node ${node.id}: "${node.name}"`);
        }
      }
      
      // Recursively process children (limit to first 5 for clarity)
      if (node.children && node.children.length > 0) {
        const children = level < 2 ? node.children : node.children.slice(0, 5);
        children.forEach(child => checkNode(child, level + 1));
        
        // If we truncated children, log that
        if (level >= 2 && node.children.length > 5) {
          //console.log(`... and ${node.children.length - 5} more children at level ${level + 1}`);
        }
      }
    };
    
    // Start traversal from root
    checkNode(rootNode);
  }
  
  /**
   * Calculate layout for the treemap
   * @param {TreemapNode} rootNode - Root node
   * @param {Object} options - Layout options
   * @returns {TreemapNode} Root node with calculated layout
   * @private
   */
  _calculateLayout(rootNode, options) {
    // Get container dimensions
    const containerRect = this.container.getBoundingClientRect();
    const width = containerRect.width;
    const height = options.height || containerRect.height || 500;
    
    // Calculate layout
    return this.layout.calculateLayout(rootNode, {
      x: 0,
      y: 0,
      width,
      height
    });
  }
  
  /**
   * Render the treemap
   * @param {TreemapNode} rootNode - Root node with layout
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @param {Object} options - Render options
   * @private
   */
  _renderTreemap(rootNode, metadataProvider, options) {
    // Add title if specified
    if (options.title) {
      this._addTitle(options.title);
    }
    
    // Add subtitle if specified
    if (options.subtitle) {
      this._addSubtitle(options.subtitle);
    }
    
    // Add breadcrumb if we're in a drill-down
    if (this.drillDownManager.canDrillUp()) {
      this._addBreadcrumb();
    }
    
    // Create visualization container
    const visualizationContainer = document.createElement('div');
    visualizationContainer.className = 'treemap-visualization-container';
    this.container.appendChild(visualizationContainer);
    
    // Render the treemap
    this.renderer.render(visualizationContainer, rootNode, this.layout, metadataProvider);
    
    // Add source note if specified
    if (options.sourceNote) {
      this._addSourceNote(options.sourceNote);
    }
    
    // Add note if specified
    if (options.note) {
      this._addNote(options.note);
    }
  }
  
  /**
   * Add a title to the container
   * @param {string} title - Title text
   * @private
   */
  _addTitle(title) {
    const titleElement = document.createElement('div');
    titleElement.className = 'chart-title';
    
    // Highlight country names by wrapping them in <strong> tags
    // First check if this is a drill-down view (not root level)
    if (this.drillDownManager && this.drillDownManager.currentLevel > 0) {
      // Check for the new format with colon: "Country Imports: Section (2024)"
      const colonTitleMatch = title.match(/^(.*?)\s+(Imports|Exports):\s+(.*?)(\s+\(\d+\))?$/i);
      
      if (colonTitleMatch) {
        const countryName = colonTitleMatch[1];
        const dataType = colonTitleMatch[2];
        const sectionName = colonTitleMatch[3];
        const yearPart = colonTitleMatch[4] || '';
        
        // Format with country in <strong> tags
        titleElement.innerHTML = `<strong>${countryName}</strong> ${dataType}: ${sectionName}${yearPart}`;
      } else {
        // Check for the standard format without colon: "China Imports (2024)"
        const standardTitleMatch = title.match(/^(.*?)\s+(Imports|Exports)(\s+\(\d+\))?$/i);
        
        if (standardTitleMatch) {
          const countryName = standardTitleMatch[1];
          const dataType = standardTitleMatch[2];
          const yearPart = standardTitleMatch[3] || '';
          
          // If we found a country name, wrap it in <strong> tags
          titleElement.innerHTML = `<strong>${countryName}</strong> ${dataType}${yearPart}`;
        } else {
          // If it doesn't match any expected pattern, use the title as is
          titleElement.innerHTML = title;
        }
      }
    } else {
      // For root level or non-matching titles, use plain text
      titleElement.innerHTML = title;
    }
    
    // Clear existing title if any
    const existingTitle = this.container.querySelector('.chart-title');
    if (existingTitle) {
      existingTitle.remove();
    }
    
    // Add to container as first element
    if (this.container.firstChild) {
      this.container.insertBefore(titleElement, this.container.firstChild);
    } else {
      this.container.appendChild(titleElement);
    }
  }
  
  /**
   * Add a subtitle to the container
   * @param {string} subtitle - Subtitle text
   * @private
   */
  _addSubtitle(subtitle) {
    const subtitleElement = document.createElement('div');
    subtitleElement.className = 'chart-subtitle';
    subtitleElement.textContent = subtitle;
    
    // Clear existing subtitle if any
    const existingSubtitle = this.container.querySelector('.chart-subtitle');
    if (existingSubtitle) {
      existingSubtitle.remove();
    }
    
    // Add after title or as first element
    const title = this.container.querySelector('.chart-title');
    if (title) {
      title.after(subtitleElement);
    } else if (this.container.firstChild) {
      this.container.insertBefore(subtitleElement, this.container.firstChild);
    } else {
      this.container.appendChild(subtitleElement);
    }
  }
  
  /**
   * Add a breadcrumb navigation to the container
   * @private
   */
  _addBreadcrumb() {
    const breadcrumbContainer = document.createElement('div');
    breadcrumbContainer.className = 'breadcrumb-container';
    
    // Clear existing breadcrumb if any
    const existingBreadcrumb = this.container.querySelector('.breadcrumb-container');
    if (existingBreadcrumb) {
      existingBreadcrumb.remove();
    }
    
    // Add after subtitle or title or as first element
    const subtitle = this.container.querySelector('.chart-subtitle');
    const title = this.container.querySelector('.chart-title');
    
    if (subtitle) {
      subtitle.after(breadcrumbContainer);
    } else if (title) {
      title.after(breadcrumbContainer);
    } else if (this.container.firstChild) {
      this.container.insertBefore(breadcrumbContainer, this.container.firstChild);
    } else {
      this.container.appendChild(breadcrumbContainer);
    }
    
    // Create breadcrumb
    this.drillDownManager.createBreadcrumb(
      breadcrumbContainer, 
      (id, level) => {
        if (id === 'root') {
          this.drillDownManager.resetToRoot();
        } else {
          // Drill up to the specified level
          while (this.drillDownManager.currentLevel > level) {
            this.drillDownManager.drillUp();
          }
        }
      },
      this.metadataProvider
    );
  }
  
  /**
   * Add a source note to the container
   * @param {string} sourceNote - Source note text
   * @private
   */
  _addSourceNote(sourceNote) {
    const noteElement = document.createElement('div');
    noteElement.className = 'chart-source-note';
    noteElement.innerHTML = `<strong>Source:</strong> ${sourceNote}`;
    
    // Clear existing source note if any
    const existingNote = this.container.querySelector('.chart-source-note');
    if (existingNote) {
      existingNote.remove();
    }
    
    // Add to container as last element
    this.container.appendChild(noteElement);
  }
  
  /**
   * Add a note to the container
   * @param {string} note - Note text
   * @private
   */
  _addNote(note) {
    const noteElement = document.createElement('div');
    noteElement.className = 'chart-note';
    noteElement.innerHTML = `<strong>Note:</strong> ${note}`;
    
    // Clear existing note if any
    const existingNote = this.container.querySelector('.chart-note');
    if (existingNote) {
      existingNote.remove();
    }
    
    // Add before source note or as last element
    const sourceNote = this.container.querySelector('.chart-source-note');
    if (sourceNote) {
      sourceNote.before(noteElement);
    } else {
      this.container.appendChild(noteElement);
    }
  }
  
  
  /**
   * Set up event listeners
   * @param {Object} options - Event options
   * @private
   */
  _setupEventListeners(options) {
    // Add click event listener to title to go back to previous view
    const title = this.container.querySelector('.chart-title');
    if (title) {
      //title.style.cursor = 'pointer';
      //title.title = 'Click to go back to previous view';
      
      title.addEventListener('click', () => {
        // Try to drill up, and if we can't, reset to root
        //if (!this.drillDownManager.drillUp()) {
          //this.drillDownManager.resetToRoot();
        //}
      });
    }
    
    // Listen for node clicks
    this.container.addEventListener('treemap-node-click', (event) => {
      const node = event.detail.node;
      
      // Handle drill-down if globally enabled and not disabled for the current level
      if (options.enableDrillDown !== false && node) {
        // The drillDown method will check if the current level is disabled
        const drillDownSuccessful = this.drillDownManager.drillDown(node, {
          dataType: options.dataType,
          year: options.year
        });
        
        // Optionally provide visual feedback if drill-down was blocked
        if (!drillDownSuccessful && options.showDrillDownDisabledMessage !== false) {
          //console.log(`Drill-down disabled for level ${this.drillDownManager.currentLevel}`);
        }
      }
    });
    
    // Listen for legend clicks
    this.container.addEventListener('treemap-legend-click', (event) => {
      const node = event.detail.node;
      
      // Handle drill-down if globally enabled and not disabled for the current level
      if (options.enableDrillDown !== false && node) {
        // The drillDown method will check if the current level is disabled
        const drillDownSuccessful = this.drillDownManager.drillDown(node, {
          dataType: options.dataType,
          year: options.year
        });
        
        // Optionally provide visual feedback if drill-down was blocked
        if (!drillDownSuccessful && options.showDrillDownDisabledMessage !== false) {
          //console.log(`Drill-down disabled for level ${this.drillDownManager.currentLevel}`);
        }
      }
    });
  }
  
  /**
   * Handle drill-down to a node
   * @param {TreemapNode} node - Node being drilled down to
   * @param {number} level - New level
   * @param {Object} context - Drill-down context
   * @private
   */
  _handleDrillDown(node, level, context) {
    // Clean up any tooltips
    if (window.sparksTooltipManager && window.sparksTooltipManager.hideAllTooltips) {
      window.sparksTooltipManager.hideAllTooltips();
    }
    
    // Try to get the drill-down data
    try {
      const drillDownData = this._getDrillDownData(node, level, context);
      
      // If no data is available or the data has no meaningful structure, 
      // prevent drill-down and inform the user
      if (!drillDownData) {
        return;
      }
      
      // Check if we have valid children to display
      if (this._isEmptyDrillDown(drillDownData)) {
        return;
      }
      
      // Find and remove any existing legends
      if (this.container.parentElement) {
        const parentLegends = this.container.parentElement.querySelectorAll('.treemap-legend');
        parentLegends.forEach(legend => legend.remove());
        
        // Hide empty chart-legend containers
        const emptyChartLegends = document.querySelectorAll('.chart-legend:empty');
        emptyChartLegends.forEach(legend => {
          legend.style.display = 'none';
          legend.style.height = '0';
          legend.style.margin = '0';
          legend.style.padding = '0';
        });
        
        // Check one more level up
        if (this.container.parentElement.parentElement) {
          const grandparentLegends = this.container.parentElement.parentElement.querySelectorAll('.treemap-legend');
          grandparentLegends.forEach(legend => legend.remove());
          
          // Check visualization container
          const chartVisContainer = this.container.parentElement.parentElement.querySelector('.chart-visualization-container');
          if (chartVisContainer) {
            const containerLegends = chartVisContainer.querySelectorAll('.treemap-legend');
            containerLegends.forEach(legend => legend.remove());
          }
        }
      }
      
      // Determine the title based on the current level
      let drillTitle;
      
      // Save the current title before clearing the container
      let currentTitle = '';
      let countryName = '';
      const existingTitle = this.container.querySelector('.chart-title');
      
      if (existingTitle) {
        currentTitle = existingTitle.textContent || '';
        
        // Try to extract country name from existing title
        // We look for patterns like "China Imports (2024)" or "China Imports: Something (2024)"
        const titleMatch = currentTitle.match(/^(.*?)\s+(Imports|Exports)(?::|$|\s|\()/i);
        if (titleMatch) {
          countryName = titleMatch[1];
        }
      }
      
      // Store the country name in a global variable for this instance
      if (!this._countryName) {
        this._countryName = {};
      }
      
      // Level 1 is typically a country - store it for future reference
      if (level === 1) {
        this._countryName[this.container.id] = node.name;
        drillTitle = `${node.name} ${context.dataType} (${context.year})`;
      } 
      // Level 2+ - use the previously stored country name if available
      else if (level > 1) {
        // First try our stored country name
        if (this._countryName[this.container.id]) {
          countryName = this._countryName[this.container.id];
        }
        
        // If we have a country name, use it in the title
        if (countryName) {
          drillTitle = `${countryName} ${context.dataType}: ${node.name} (${context.year})`;
        } else {
          // Fallback if no country name found
          drillTitle = `${node.name} ${context.dataType} (${context.year})`;
        }
      }
      // Level 0 (root) - just use node name
      else {
        drillTitle = `${node.name} ${context.dataType} (${context.year})`;
      }
      
      // Clear container
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
      
      // Render drill-down view
      this.render(this.container, drillDownData, {
        ...this.options,
        ...context,
        title: drillTitle,
        subtitle: this._getDrillDownSubtitle(node, level, context)
      });
    } catch (error) {
      console.error('Error during drill-down operation:', error);
      // Revert the drilldown in the manager since we encountered an error
      this.drillDownManager.drillUp();
    }
  }
  
  /**
   * Handle drill-up to previous level
   * @param {number} level - New level
   * @param {string} id - ID at the new level
   * @param {Object} context - Drill-up context
   * @private
   */
  _handleDrillUp(level, id, context) {
    // Clean up any tooltips
    if (window.sparksTooltipManager && window.sparksTooltipManager.hideAllTooltips) {
      window.sparksTooltipManager.hideAllTooltips();
    }
    
    // Get the drill-up data
    const drillUpData = this._getDrillUpData(level, id, context);
    
    if (!drillUpData) {
      console.error('No drill-up data available');
      return;
    }
    
    // Find and remove any existing legends in the DOM tree (outside the container)
    // This prevents legends from accumulating on successive drillups
    if (this.container.parentElement) {
      // Look for legends in parent element
      const parentLegends = this.container.parentElement.querySelectorAll('.treemap-legend');
      parentLegends.forEach(legend => {
        //console.log('Removing legend from parent element during drillup');
        legend.remove();
      });
      
      // Also hide any empty chart-legend containers
      const emptyChartLegends = document.querySelectorAll('.chart-legend:empty');
      emptyChartLegends.forEach(legend => {
        //console.log('Hiding empty chart-legend container during drillup');
        legend.style.display = 'none';
        legend.style.height = '0';
        legend.style.margin = '0';
        legend.style.padding = '0';
      });
      
      // Also check one more level up
      if (this.container.parentElement.parentElement) {
        const grandparentLegends = this.container.parentElement.parentElement.querySelectorAll('.treemap-legend');
        grandparentLegends.forEach(legend => {
         //console.log('Removing legend from grandparent element during drillup');
          legend.remove();
        });
        
        // Check visualization container if it exists
        const chartVisContainer = this.container.parentElement.parentElement.querySelector('.chart-visualization-container');
        if (chartVisContainer) {
          const containerLegends = chartVisContainer.querySelectorAll('.treemap-legend');
          containerLegends.forEach(legend => {
            //console.log('Removing legend from chart-visualization-container during drillup');
            legend.remove();
          });
        }
      }
    }
    
    // Clear container
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    
    // Determine appropriate title
    let drillUpTitle = drillUpData.title;
    
    // If drilling up to level 1 (country level) and we have a stored country name
    if (level === 1 && this._countryName && this._countryName[this.container.id]) {
      drillUpTitle = `${this._countryName[this.container.id]} ${context.dataType} (${context.year})`;
    }
    // If drilling up but still beyond level 1, maintain country:section format
    else if (level > 1 && this._countryName && this._countryName[this.container.id]) {
      // Find node name at this level if available in context
      const nodeName = drillUpData.title || '';
      drillUpTitle = `${this._countryName[this.container.id]} ${context.dataType}: ${nodeName} (${context.year})`;
    }
    
    // Render drill-up view
    this.render(this.container, drillUpData.data, {
      ...this.options,
      ...context,
      title: drillUpTitle,
      subtitle: drillUpData.subtitle
    });
  }
  
  /**
   * Get data for drill-down
   * @param {TreemapNode} node - Node being drilled down to
   * @param {number} level - New level
   * @param {Object} context - Drill-down context
   * @returns {Object} Drill-down data
   * @private
   */
  _getDrillDownData(node, level, context) {
    // Get level name
    const levelName = this.drillDownManager.getCurrentLevelName();
    /*console.log('Drill Down called:' , {
      node: node, 
      level: level,
      context: context,
      hasChildren: node.children && node.children.length > 0,
      childCount: node.children ? node.children.length : 0,
      hasStoredChildCount: node._childCount !== undefined,
      storedChildCount: node._childCount || 0
    })
      */
    // Handle different level types
    if (levelName === 1) {
      // Drill down from root to continent
      return window.CompressedTreemap.extractParentData(this._originalData, context.year, context.dataType, node.id);
    } else if (levelName === 2) {
      // Drill down from continent to country
      // Just show the country's data from the original data
      
      // Return the data for this country
      return {
        metadata: this._originalData.metadata || {},
        hierarchy: [
          [
            "root",
            `${node.name} ${context.dataType} (${context.year})`,
            node.value,
            node.children.map(child => [
              child.id,
              child.name,
              child.value,
              child.children.map(grandchild => [
                grandchild.id,
                grandchild.name,
                grandchild.value,
                []
              ])
            ])
          ]
        ]
      };
    } else if (this.drillDownManager.currentLevel === 1) {
      // We're at level 1 drilldown
      // Log detailed information about the node
      /*
      console.log('DEBUG: Drilling down to level 1 node:', {
        id: node.id,
        name: node.name,
        value: node.value,
        actualChildCount: node.children ? node.children.length : 0,
        hasChildCountProperty: node._childCount !== undefined,
        childCount: node._childCount || 0,
        level: node.level,
        currentLevel: this.drillDownManager.currentLevel
      });
      */
      // Handle the case where node.children is empty but _childCount exists
      if ((!node.children || node.children.length === 0) && node._childCount > 0) {
        //console.log(`WARNING: Node ${node.id} has _childCount (${node._childCount}) but empty children array`);
        
        // Following the approach in the original code, go back to original data and re-parse
        // with deeper maxDepth for just this node
        if (this._originalData && this._originalData[context.dataType] && 
            this._originalData[context.dataType][context.year] && 
            Array.isArray(this._originalData[context.dataType][context.year][0])) {
          
          
          try {
            // Create new adapter
            const metadataProvider = new window.CompressedTreemap.MetadataProvider(this._originalData.metadata || {});
            const adapter = new window.CompressedTreemap.CompressedDataAdapter(metadataProvider);
            
            // Get full data with unlimited depth - this recreates what extractParentData does
            const fullData = adapter.convertArrayToTreemapNodes(this._originalData[context.dataType][context.year][0]);
            
            // Find the node by ID
            const fullNode = fullData.findNodeById(node.id);
            
            if (fullNode && fullNode.children && fullNode.children.length > 0) {
              //console.log(`Successfully found node ${node.id} with ${fullNode.children.length} children`);
              
              // Create array format for each child with its own children
              const childrenArray = fullNode.children.map(child => {
                return [
                  child.id,
                  child.name,
                  child.value,
                  child.children.map(grandchild => [
                    grandchild.id,
                    grandchild.name,
                    grandchild.value,
                    []
                  ])
                ];
              });
              
              // Return the data in the format that compressedDataAdapter.js expects
              // The key point is to nest the hierarchy under dataType and year properties
              const result = {
                metadata: this._originalData.metadata || {}
              };
              
              // Create the nested structure dataType -> year -> hierarchy
              result[context.dataType] = {
                [context.year]: [
                  [
                    "node_drilldown",
                    `${fullNode.name} ${context.dataType} (${context.year})`,
                    fullNode.value,
                    childrenArray
                  ]
                ]
              };
              
              // Ensure years array is preserved (if it exists in the original data)
              if (this._originalData.years) {
                result.years = this._originalData.years;
              }
                            return result;
            }
          } catch (error) {
            console.error('Error re-parsing node with deeper maxDepth:', error);
          }
        }
        
        // Create a minimal valid structure
        // Fix the undefined variables issue but don't provide special case handling
        return {
          metadata: this._originalData.metadata || {},
          hierarchy: [
            [
              "breakdown_root",
              `${node.name} ${context.dataType} (${context.year})`,
              node.value || 0,  // Use the node's value instead of undefined totalValue
              []  // Empty array of children instead of undefined groups
            ]
          ]
        };
      }
      
      // Standard case - node has children
      // Return with proper nesting of dataType -> year -> hierarchy
      const result = {
        metadata: this._originalData.metadata || {}
      };
      
      // Create the nested structure dataType -> year -> hierarchy
      result[context.dataType] = {
        [context.year]: [
          [
            "root",
            `${node.name} ${context.dataType} (${context.year})`,
            node.value,
            node.children.map(child => [
              child.id,
              child.name,
              child.value,
              child.children && child.children.length > 0 
                ? child.children.map(grandchild => [
                    grandchild.id,
                    grandchild.name,
                    grandchild.value,
                    []
                  ]) 
                : []
            ])
          ]
        ]
      };
      
      // Preserve years array if it exists
      if (this._originalData.years) {
        result.years = this._originalData.years;
      }
      
      return result;
    } else {
      // Default case - just use the node's data with proper nesting
      const result = {
        metadata: this._originalData.metadata || {}
      };
      
      // Create the nested structure dataType -> year -> hierarchy
      result[context.dataType] = {
        [context.year]: [
          [
            "root",
            node.name,
            node.value,
            node.children.map(child => [
              child.id,
              child.name,
              child.value,
              []
            ])
          ]
        ]
      };
      
      // Preserve years array if it exists
      if (this._originalData.years) {
        result.years = this._originalData.years;
      }
      
      return result;
    }
  }
  
  /**
   * Get data for drill-up
   * @param {number} level - New level
   * @param {string} id - ID at the new level
   * @param {Object} context - Drill-up context
   * @returns {Object} Drill-up data with title, subtitle, and data
   * @private
   */
  _getDrillUpData(level, id, context) {
    // Check if we're going back to root
    if (level === 0) {
      // Return to the original data
      return {
        title: `${context.dataType ? context.dataType.charAt(0).toUpperCase() + context.dataType.slice(1) : 'Data'} (${context.year || 'All Years'})`,
        subtitle: this._originalData.configTemplate?.subtitle || null,
        data: this._originalData
      };
    } else {
      // Get the parent node from the original data
      const parentId = id;
      
      // Find appropriate data based on level
      if (level === 1) { // Continent level
        return {
          title: this.metadataProvider.getName(parentId) || parentId,
          subtitle: `${context.dataType ? context.dataType.charAt(0).toUpperCase() + context.dataType.slice(1) : 'Data'} (${context.year || 'All Years'})`,
          data: window.CompressedTreemap.extractParentData(this._originalData, context.year, context.dataType, parentId)
        };
      } else {
        // Other levels - more complex cases would be handled here
        return {
          title: this.metadataProvider.getName(parentId) || parentId,
          subtitle: `${context.dataType ? context.dataType.charAt(0).toUpperCase() + context.dataType.slice(1) : 'Data'} (${context.year || 'All Years'})`,
          data: this._originalData
        };
      }
    }
  }
  
  /**
   * Check if the drill-down data is empty or has no meaningful structure
   * @param {Object} drillDownData - Data for the drill-down
   * @returns {boolean} True if the drill-down would be empty
   * @private
   */
  _isEmptyDrillDown(drillDownData) {
    // If using the structure with metadata and hierarchy
    if (drillDownData.metadata && drillDownData.hierarchy) {
      // Check if hierarchy exists and has content
      if (!Array.isArray(drillDownData.hierarchy) || drillDownData.hierarchy.length === 0) {
        return true;
      }
      
      // Check if first hierarchy item exists and has children
      const firstItem = drillDownData.hierarchy[0];
      if (!Array.isArray(firstItem) || firstItem.length < 4) {
        return true;
      }
      
      // Check if children array exists and has meaningful data
      const children = firstItem[3];
      if (!Array.isArray(children) || children.length === 0) {
        return true;
      }
      
      // If any child has a non-zero value, it's not empty
      return !children.some(child => Array.isArray(child) && child.length >= 3 && child[2] > 0);
    }
    
    // If using the dataType -> year structure
    if (drillDownData[Object.keys(drillDownData)[0]] && 
        typeof drillDownData[Object.keys(drillDownData)[0]] === 'object') {
      const dataType = Object.keys(drillDownData)[0];
      
      // Skip 'metadata' key which is not a data type
      if (dataType === 'metadata') {
        const dataKeys = Object.keys(drillDownData).filter(k => k !== 'metadata' && k !== 'years');
        if (dataKeys.length === 0) return true;
        const alternativeDataType = dataKeys[0];
        
        // No data for this type
        if (!drillDownData[alternativeDataType] || typeof drillDownData[alternativeDataType] !== 'object') {
          return true;
        }
        
        // Check years 
        const years = Object.keys(drillDownData[alternativeDataType]);
        if (years.length === 0) return true;
        
        // Check hierarchy in first year
        const hierarchy = drillDownData[alternativeDataType][years[0]];
        if (!Array.isArray(hierarchy) || hierarchy.length === 0 || !Array.isArray(hierarchy[0])) {
          return true;
        }
        
        // Check children
        const children = hierarchy[0][3];
        if (!Array.isArray(children) || children.length === 0) {
          return true;
        }
        
        // If any child has a non-zero value, it's not empty
        return !children.some(child => Array.isArray(child) && child.length >= 3 && child[2] > 0);
      }
      
      // No data for this type
      if (!drillDownData[dataType] || typeof drillDownData[dataType] !== 'object') {
        return true;
      }
      
      // Check years 
      const years = Object.keys(drillDownData[dataType]);
      if (years.length === 0) return true;
      
      // Check hierarchy in first year
      const hierarchy = drillDownData[dataType][years[0]];
      if (!Array.isArray(hierarchy) || hierarchy.length === 0 || !Array.isArray(hierarchy[0])) {
        return true;
      }
      
      // Check children
      const children = hierarchy[0][3];
      if (!Array.isArray(children) || children.length === 0) {
        return true;
      }
      
      // If any child has a non-zero value, it's not empty
      return !children.some(child => Array.isArray(child) && child.length >= 3 && child[2] > 0);
    }
    
    // If using TreemapNode objects
    if (drillDownData.rootNode && typeof drillDownData.rootNode === 'object') {
      // No children or empty children array
      if (!drillDownData.rootNode.children || drillDownData.rootNode.children.length === 0) {
        return true;
      }
      
      // If any child has a non-zero value, it's not empty
      return !drillDownData.rootNode.children.some(child => child.value > 0);
    }
    
    // Default to considering it empty if we can't determine the structure
    return true;
  }
  
  /**
   * Get subtitle for drill-down view
   * @param {TreemapNode} node - Node being drilled down to
   * @param {number} level - New level
   * @param {Object} context - Drill-down context
   * @returns {string} Subtitle text
   * @private
   */
  _getDrillDownSubtitle(node, level, context) {
    const levelName = this.drillDownManager.getCurrentLevelName();
    const formattedValue = this.renderer.options.valueFormatter ? 
      this.renderer.options.valueFormatter(node.value) : 
      `$${node.value.toLocaleString()}`;
    
    // For level 1, show a meaningful message
    if (this.drillDownManager.currentLevel === 1) {
      return `Click items to explore details - ${formattedValue}`;
    }
    
    // For deeper levels
    if (this.drillDownManager.currentLevel > 1) {
      return `Detail view - ${formattedValue}`;
    }
    
    // Default subtitle for other levels
    return `Level ${this.drillDownManager.currentLevel} - ${formattedValue}`;
  }
}

// Define global API functions

/**
 * Create a new compressed treemap
 * @param {string|HTMLElement} container - Container ID or element
 * @param {Object} data - Data in compressed format
 * @param {Object} options - Treemap options
 * @returns {Object} The created treemap instance
 */
window.createCompressedTreemap = function(container, data, options = {}) {
  const treemap = new CompressedTreemapImpl(options);
  treemap.render(container, data, options);
  return treemap;
};

/**
 * Render a treemap for multi-year trade data
 * @param {string|HTMLElement} container - Container ID or element
 * @param {Object} multiYearData - Multi-year trade data
 * @param {Object} options - Rendering options
 * @returns {Object} The created treemap instance
 */
window.renderMultiYearTreemap = function(container, multiYearData, options = {}) {
  // Get year and data type
  const years = multiYearData.years || [];
  const year = options.year || (years.length > 0 ? years[years.length - 1] : null);
  const dataType = options.dataType || 'imports';
  
  // Check if data exists
  if (!multiYearData[dataType] || !multiYearData[dataType][year]) {
    console.error(`No data available for ${dataType} in ${year}`);
    
    // Create treemap with error message
    const treemap = new CompressedTreemapImpl(options);
    if (typeof container === 'string') {
      const containerEl = document.getElementById(container);
      if (containerEl) {
        containerEl.innerHTML = `<div class="treemap-error">No data available for ${dataType} in ${year}</div>`;
      }
    } else if (container instanceof HTMLElement) {
      container.innerHTML = `<div class="treemap-error">No data available for ${dataType} in ${year}</div>`;
    }
    
    return treemap;
  }
  
  // Create title and subtitle
  const title = options.title || `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (${year})`;
  const subtitle = options.subtitle || 'Click on a region to drill down';
  
  // Create treemap with appropriate options
  return window.createCompressedTreemap(container, multiYearData, {
    year,
    dataType,
    title,
    subtitle,
    enableDrillDown: options.enableDrillDown !== false,
    maxDrillLevel: options.maxDrillLevel || null,
    disabledLevels: options.disabledLevels || [],
    showLabels: options.showLabels !== false,
    showValues: options.showValues !== false,
    animate: options.animate !== false,
    height: options.height || 500,
    valuePrefix: options.valuePrefix || '$',
    ...options
  });
};

// Add functions to CompressedTreemap global object
if (window.CompressedTreemap) {
  window.CompressedTreemap.createCompressedTreemap = window.createCompressedTreemap;
  window.CompressedTreemap.renderMultiYearTreemap = window.renderMultiYearTreemap;
  
  // IMPORTANT: Copy drilldown-related functions from the original implementation
  if (!window.CompressedTreemap.extractParentData && 
      typeof window.CompressedTreemap.TreemapNode === 'function' && 
      typeof window.CompressedTreemap.MetadataProvider === 'function') {
    
    // Define extractParentData if not already defined
    window.CompressedTreemap.extractParentData = function(data, year, dataType, parentId) {
      if (!data || !data[dataType] || !data[dataType][year]) {
        console.error(`No data available for ${dataType} in ${year}`);
        return null;
      }
      
      // Create adapter with metadata
      const metadataProvider = new window.CompressedTreemap.MetadataProvider(data.metadata || {});
      const adapter = new window.CompressedTreemap.CompressedDataAdapter(metadataProvider);
      
      // Convert full data to treemap nodes
      const fullData = adapter.convertArrayToTreemapNodes(data[dataType][year][0]);
      
      // Find parent node
      const parentNode = fullData.findNodeById(parentId);
      if (!parentNode) {
        console.error(`Parent entity ${parentId} not found in data`);
        return null;
      }
      
      // Return data for this parent entity
      return {
        metadataProvider,
        rootNode: parentNode,
        entityName: parentNode.name,
        entityId: parentId,
        year,
        dataType
      };
    };
    
    // Define getIndustryBreakdown if not already defined   - depreciated. If you see these industry values, someting has gone very wrong. 
    window.CompressedTreemap.getIndustryBreakdown = function(data, year, dataType, parentId) {
      // First extract parent entity data
      const parentData = window.CompressedTreemap.extractParentData(data, year, dataType, parentId);
      if (!parentData) return null;
      
      const { metadataProvider, rootNode, entityName } = parentData;
      
      // Industry category IDs
      const industryCategories = {
        '33DG': { id: '33DG', name: 'Durable Goods' },
        '31ND': { id: '31ND', name: 'Nondurable Goods' },
        '21': { id: '21', name: 'Mining' },
        '11': { id: '11', name: 'Agriculture, Forestry, Fishing, and Hunting' }
      };
      
      // Create industry aggregation nodes
      const industryNodes = {};
      
      // Helper to get industry category for a product ID
      function getIndustryCategory(productId) {
        // Extract first 2 characters to determine industry group
        const prefix = productId.substring(0, 2);
        
        if (prefix === '33') return '33DG';
        if (prefix === '31') return '31ND';
        if (prefix === '21') return '21';
        if (prefix === '11') return '11';
        
        // Default to durable goods for unknown
        return '33DG';
      }
      
      // Process all child nodes in the parent node
      rootNode.children.forEach(childNode => {
        // Find product nodes - these are typically the children of the level2 entities
        const productNodes = childNode.children;
        
        productNodes.forEach(productNode => {
          // Determine which industry category this product belongs to
          const categoryId = getIndustryCategory(productNode.id);
          
          // Ensure category exists in our aggregation
          if (!industryNodes[categoryId]) {
            industryNodes[categoryId] = new window.CompressedTreemap.TreemapNode(
              categoryId,
              0,
              metadataProvider,
              industryCategories[categoryId]?.name || metadataProvider.getName(categoryId)
            );
          }
          
          // Add product value to the industry category
          industryNodes[categoryId].value += productNode.value;
          
          // If this product has children, they become children of the industry category
          productNode.children.forEach(subProductNode => {
            // Create a copy of the subProductNode to avoid circular references
            const subNodeCopy = new window.CompressedTreemap.TreemapNode(
              subProductNode.id,
              subProductNode.value,
              metadataProvider,
              subProductNode.name
            );
            
            // Add as child to the industry category
            industryNodes[categoryId].addChild(subNodeCopy);
          });
        });
      });
      
      // Create root node for the industry breakdown
      const breakdownRoot = new window.CompressedTreemap.TreemapNode(
        'industry_root',
        rootNode.value,
        metadataProvider,
        `${entityName} by Industry (${year})`
      );
      
      // Add industry categories as children
      Object.values(industryNodes).forEach(industryNode => {
        breakdownRoot.addChild(industryNode);
      });
      
      return {
        metadataProvider,
        rootNode: breakdownRoot,
        entityId: parentId,
        year,
        dataType
      };
    };
  }
}