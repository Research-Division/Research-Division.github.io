/**
 * TreemapRenderer.js
 * 
 * Renders a treemap visualization from a TreemapNode hierarchy.
 * Handles SVG creation, node rendering, tooltips, and interactions.
 */

/**
 * Renders the treemap visualization
 */
class TreemapRenderer {
  /**
   * Create a new treemap renderer
   * @param {Object} options - Rendering options
   * @param {boolean} [options.showLabels=true] - Whether to show labels
   * @param {boolean} [options.showValues=true] - Whether to show values
   * @param {boolean} [options.animate=true] - Whether to animate treemap creation
   * @param {number} [options.animationDuration=800] - Animation duration in ms
   * @param {Function} [options.valueFormatter] - Custom value formatter function
   * @param {string[]} [options.colors] - Array of colors for nodes
   * @param {number} [options.legendLevel=1] - Level of hierarchy to show in legend
   * @param {number} [options.maxDepth=2 - Maximum depth of nodes to render initially
   */
  constructor(options = {}) {
    this.options = {
      showLabels: true,
      showValues: true,
      animate: true,
      animationDuration: 800,
      title: 'Treemap Visualization', // Default title
      valueFormatter: (value) => {
        // Default formatter with appropriate suffix (K, M, B, T)
        if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
        if (value < 1) return `$${value.toFixed(4)}`
        if (value < 0.01) return `$${value.toFixed(6)}`;
        if (value < 0.001) return `$${value.toFixed(8)}`;
        return `$${value.toFixed(2)}`;
      },
      colors: [
        '#3581b4', // blue1
        '#7fac1c', // green1
        '#f3bb00', // yellow1
        '#56bfd6', // blue2
        '#ca590c', // orange1
        '#53c49f', // teal1
        '#d34682', // pink1
        '#4a3e8e'  // purple1
      ],
      colorStrategy: 'byLevel', // 'byLevel', 'byParent', 'byValue'
      padding: 1,
      minLabelSize: 20, // Minimum rectangle size to show labels
      maxDepth: 10, // Maximum depth of the hierarchy to render initially (increased from 2)
      drillDownEnabled: true, // Whether drilldown is enabled
      // Default drill-down manager options
      drillDownManagerOptions: {
        drillDownLevels: ['level0', 'level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'],
        maxDrillLevel: 10, // Increased from default 3
        disabledLevels: []
      },
      ...options
    };
    
    // Initialize the global color map if it doesn't exist
    // This ensures consistent colors across multiple treemaps for the same data
    if (!window._treemapGlobalColorMap) {
      this._initGlobalColorMap();
    }
    
    // Always use our internal tooltip implementation for the compressed treemap
    // Rather than the global sparksTooltipManager which expects SVG containers
    this.tooltipManager = null;
  }
  
  /**
   * Initialize the global color map for consistent colors across treemaps
   * @private
   */
  _initGlobalColorMap() {
    window._treemapGlobalColorMap = {
      // For product sections (starting with 'S'), map section IDs to specific colors
      sections: {},
      // For countries, map country ISOs to specific colors
      countries: {},
      // Track sections already assigned colors
      assignedSections: []
    };
    //console.log('Initialized global treemap color map for consistent colors');
  }
  
  /**
   * Clean up tooltips and event listeners
   */
  cleanup() {
    // Remove global tooltip if it exists
    const globalTooltip = document.getElementById('treemap-tooltip-container');
    if (globalTooltip) {
      globalTooltip.style.visibility = 'hidden';
    }
    
    // Clean up any local tooltips
    if (this.container) {
      const localTooltips = this.container.querySelectorAll('.treemap-tooltip-container');
      localTooltips.forEach(tooltip => {
        tooltip.style.visibility = 'hidden';
      });
    }
  }

  /**
   * Render the treemap
   * @param {HTMLElement} container - Container element to render into
   * @param {TreemapNode} rootNode - Root node of the treemap
   * @param {TreemapLayout} layout - Layout calculator
   * @param {MetadataProvider} metadataProvider - Metadata provider
   */
  render(container, rootNode, layout, metadataProvider) {
    if (!container || !rootNode) return;
    
    // Clean up any existing tooltips
    this.cleanup();
    
    // Store references
    this.container = container;
    this.rootNode = rootNode;
    this.layout = layout;
    this.metadataProvider = metadataProvider;
    
    // Clear the container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('class', 'treemap-svg');
    container.appendChild(svg);
    
    // Get container dimensions - prioritize actual container dimensions over options
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    // Prioritize container height over options.height, but leave space for legend (approx 25% of total height)
    // This prevents the treemap from taking the full container height and overlapping with the legend
    const totalHeight = containerRect.height || this.options.height || 500;
    const height = Math.floor(totalHeight * 0.75); // Use 75% of the height for the treemap, leaving 25% for legend
    
    // Set SVG dimensions to properly fit within the larger chart container
    // IMPORTANT: We're addressing an issue where SVG overflow doesn't affect DOM layout flow
    // By setting a height that matches our expected content height, we ensure proper spacing
    // for the legend and notes that follow in the DOM
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', `${height}px`); // Use fixed height in pixels
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.overflow = 'visible'; // Allow overflow content to be visible
    
    // Ensure the parent container of the SVG (treemap-visualization-container)
    // gets enough height to properly display the treemap without overlap
    if (container.parentElement && container.parentElement.classList.contains('chart-visualization')) {
      container.style.height = `${height}px`;
      container.style.minHeight = `${height}px`;
    }
    svg.style.display = 'block'; // Ensure it takes up full space
    
    // Create group for all treemap elements
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'treemap-container');
    svg.appendChild(g);
    
    // Create tooltip container if needed
    let tooltipContainer = null;
    if (!this.tooltipManager) {
      // Check if we already have a tooltip container in the body
      tooltipContainer = document.getElementById('treemap-tooltip-container');
      
      if (!tooltipContainer) {
        tooltipContainer = document.createElement('div');
        tooltipContainer.id = 'treemap-tooltip-container';
        tooltipContainer.className = 'treemap-tooltip-container';
        tooltipContainer.style.position = 'absolute';
        tooltipContainer.style.pointerEvents = 'none';
        tooltipContainer.style.zIndex = '1000';
        tooltipContainer.style.visibility = 'hidden';
        tooltipContainer.style.backgroundColor = 'white';
        tooltipContainer.style.padding = '8px 12px';
        tooltipContainer.style.border = '1px solid #ddd';
        tooltipContainer.style.borderRadius = '4px';
        tooltipContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        // Add directly to body instead of the container
        document.body.appendChild(tooltipContainer);
      }
    }
    
    // Title has been removed to fix legend spacing issue
    
    // Look for existing legend container in the parent
    let legendContainer;
    if (container.parentElement) {
      legendContainer = container.parentElement.querySelector('.treemap-legend');
    }
    
    // If no existing legend container found, create one
    if (!legendContainer) {
      legendContainer = document.createElement('div');
      legendContainer.className = 'treemap-legend';
      
      // IMPORTANT: We need to ensure the legend is positioned correctly after the treemap
      // The legend should be a sibling of the treemap-visualization-container, not a child
      // This prevents the legend from being inside the container that might have overflow issues
      
      // Check if we have a chart-visualization-container (where legend should go in standard layout)
      let chartVisContainer = null;
      if (container.parentElement && container.parentElement.parentElement) {
        chartVisContainer = container.parentElement.parentElement.querySelector('.chart-visualization-container');
      }
      
      if (chartVisContainer) {
        // Put legend in the standard chart-visualization-container if available
        chartVisContainer.appendChild(legendContainer);
      } else if (container.parentElement) {
        // Append to the parent container instead of the SVG container for better layout
        container.parentElement.appendChild(legendContainer);
      } else {
        // Fallback to direct append
        container.appendChild(legendContainer);
      }
    } else {
      // Clear existing legend content
      legendContainer.innerHTML = '';
    }
    
    // Check if animation is explicitly enabled
    if (this.options.animate === true && layout.animationStates.length > 0) {
      //console.log('Rendering with animation');
      this._renderAnimation(g, rootNode, layout.getAnimationStates(), metadataProvider);
    } else {
      // Render without animation (default)
      //console.log('Rendering without animation for better performance');
      this._renderNodes(g, rootNode, metadataProvider, tooltipContainer);
      this._renderLegend(legendContainer, rootNode, metadataProvider, tooltipContainer);
    }
    
    // Return the renderer for chaining
    return this;
  }
  
  /**
   * Render nodes
   * @param {SVGElement} container - SVG container
   * @param {TreemapNode} rootNode - Root node
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @param {HTMLElement} tooltipContainer - Tooltip container
   * @private
   */
  _renderNodes(container, rootNode, metadataProvider, tooltipContainer) {
    //console.log(`Rendering nodes with max depth: ${this.options.maxDepth}`);
    
    // If maxDepth is 1, only render top level
    if (this.options.maxDepth === 1) {
      this._renderTopLevelOnly(container, rootNode, metadataProvider, tooltipContainer);
    } else {
      // Otherwise render with controlled depth
      this._renderNodeChildren(container, rootNode, metadataProvider, tooltipContainer, this.options.maxDepth);
    }
  }
  
  /**
   * Render only top level nodes (children of root)
   * @param {SVGElement} container - SVG container
   * @param {TreemapNode} rootNode - Root node
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @param {HTMLElement} tooltipContainer - Tooltip container
   * @private
   */
  _renderTopLevelOnly(container, rootNode, metadataProvider, tooltipContainer) {
    //console.log(`Rendering top level only. Root has ${rootNode.children.length} children`);
    
    // Render each child of the root (e.g., continents)
    rootNode.children.forEach(child => {
      this._renderNode(container, child, metadataProvider, tooltipContainer);
    });
  }
  
  /**
   * Render node children
   * @param {SVGElement} container - SVG container
   * @param {TreemapNode} node - Parent node
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @param {HTMLElement} tooltipContainer - Tooltip container
   * @param {number} maxDepth - Maximum depth to render
   * @private
   */
  _renderNodeChildren(container, node, metadataProvider, tooltipContainer, maxDepth = 2) {
    // Don't go deeper than maxDepth
    if (node.level >= maxDepth) {
      return;
    }
    
    // Get parent color for consistent coloring of children
    const parentColor = this._getNodeColor(node, metadataProvider);
    
    // Render each child
    node.children.forEach(child => {
      // Set parent color reference to ensure color consistency
      if (parentColor && child.level > 1) {
        child._parentColor = parentColor;
      }
      
      this._renderNode(container, child, metadataProvider, tooltipContainer);
      
      // Recursively render grandchildren if appropriate
      if (child.children.length > 0 && 
          child.rect.width > 30 && 
          child.rect.height > 30 && 
          child.level < maxDepth) {
        this._renderNodeChildren(container, child, metadataProvider, tooltipContainer, maxDepth);
      }
    });
  }
  
  /**
   * Render a single node
   * @param {SVGElement} container - SVG container
   * @param {TreemapNode} node - Node to render
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @param {HTMLElement} tooltipContainer - Tooltip container
   * @private
   */
  _renderNode(container, node, metadataProvider, tooltipContainer) {
    const { x, y, width, height } = node.rect;
    
    // Create rectangle
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', this._getNodeColor(node, metadataProvider));
    rect.setAttribute('stroke', 'var(--background-color, #fff)');
    rect.setAttribute('stroke-width', this.options.padding);
    rect.setAttribute('class', 'treemap-rect');
    rect.setAttribute('data-id', node.id);
    rect.setAttribute('data-level', node.level);
    // Add transition for smoother highlighting effects
    rect.style.transition = 'opacity 0.2s ease-in-out, stroke-width 0.2s ease-in-out';
    // IMPORTANT: Remove default title attribute to prevent double tooltips
    rect.removeAttribute('title');
    
    // Add to container
    container.appendChild(rect);
    
    // Add text if there's enough space - use different thresholds for different levels
    const minSize = node.level > 1 ? Math.max(10, this.options.minLabelSize * 0.6) : this.options.minLabelSize;
    if (this.options.showLabels && width > minSize && height > minSize) {
      this._addNodeLabel(container, node, metadataProvider);
    }
    
    // Add tooltip
    this._setupTooltip(rect, node, metadataProvider, tooltipContainer);
    
    // Make node interactive only if drilldown is enabled
    const drillDownEnabled = this.options.drillDownEnabled !== false;
    rect.style.cursor = drillDownEnabled ? 'pointer' : 'default';
    
    rect.addEventListener('mouseover', () => {
      rect.setAttribute('stroke', 'var(--text-color, #333)');
      rect.setAttribute('stroke-width', this.options.padding * 2);
    });
    
    rect.addEventListener('mouseout', () => {
      rect.setAttribute('stroke', 'var(--background-color, #fff)');
      rect.setAttribute('stroke-width', this.options.padding);
    });
    
    // Dispatch a custom event when clicked
    rect.addEventListener('click', () => {
      // Special handling for tariff effect nodes to ensure children are recognized
      if (node.id && typeof node.id === 'string' && node.id.match(/^L\d+_/)) {
        // Determine which effect type this node belongs to by checking effect-specific global variables
        let effectType = 'total'; // Default to total
        let treemapData = null;
        
        // Check if we have effect-specific data available
        if (window._lastTreemapData_direct && 
            window._lastTreemapData_direct.metadata && 
            window._lastTreemapData_direct.metadata[node.id]) {
          effectType = 'direct';
          treemapData = window._lastTreemapData_direct;
        } else if (window._lastTreemapData_indirect && 
                  window._lastTreemapData_indirect.metadata && 
                  window._lastTreemapData_indirect.metadata[node.id]) {
          effectType = 'indirect';
          treemapData = window._lastTreemapData_indirect;
        } else if (window._lastTreemapData_total && 
                  window._lastTreemapData_total.metadata && 
                  window._lastTreemapData_total.metadata[node.id]) {
          effectType = 'total';
          treemapData = window._lastTreemapData_total;
        } else if (window._lastTreemapData && 
                  window._lastTreemapData.metadata && 
                  window._lastTreemapData.metadata[node.id]) {
          // Fallback to the original global variable
          treemapData = window._lastTreemapData;
        }
        
        // Only proceed if we have data
        if (treemapData && treemapData.metadata) {
          //console.log(`Using ${effectType} effect data for node ${node.id}`);
          
          // Try to find child nodes in the metadata
          const childNodes = Object.entries(treemapData.metadata)
            .filter(([id, meta]) => meta.parent === node.id)
            .map(([id, meta]) => ({ id, ...meta }));
          
          if (childNodes.length > 0 && (!node.children || node.children.length === 0)) {
            //console.log(`Node ${node.id} has ${childNodes.length} children in metadata but none in TreemapNode. DYNAMICALLY ADDING CHILDREN.`);
            
            // Store the metadata children
            node._metadataChildren = childNodes;
            node._hasMetadataChildren = true;
            
            // IMPORTANT: Dynamically add the missing children to the node
            // This is critical for tariff effect nodes where the TreemapNode structure
            // doesn't match the metadata parent-child relationships
            
            // First, clear any existing children (shouldn't be any, but just in case)
            node.children = [];
            
            // For each child in metadata, create a new TreemapNode and add it as a child
            childNodes.forEach(childMeta => {
              // Create a new TreemapNode for this child
              const childNode = new window.CompressedTreemap.TreemapNode(
                childMeta.id, 
                childMeta.value || 0,
                node._metadataProvider,
                childMeta.name
              );
              
              // Preserve the effect type on the child node
              if (childMeta._effectType) {
                childNode._effectType = childMeta._effectType;
              } else if (node._effectType) {
                childNode._effectType = node._effectType;
              }
              
              // Add it as a child of the current node
              node.addChild(childNode);
              
              // Log the dynamic child addition
              //console.log(`Dynamically added child ${childNode.id} (${childNode.name}) to node ${node.id}`);
            });
            
            //console.log(`Node now has ${node.children.length} children after dynamic addition`);
          }
        }
      }
      
      const event = new CustomEvent('treemap-node-click', {
        bubbles: true,
        detail: { node }
      });
      container.dispatchEvent(event);
    });
  }
  
  /**
   * Add a label to a node
   * @param {SVGElement} container - SVG container
   * @param {TreemapNode} node - Node to label
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @private
   */
  _addNodeLabel(container, node, metadataProvider) {
    const { x, y, width, height } = node.rect;
    
    // Define padding from the edges
    const padding = 10;
    
    // Create text foreign object for wrapping text
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreignObject.setAttribute('x', x + padding);
    foreignObject.setAttribute('y', y + padding);
    foreignObject.setAttribute('width', width - (padding * 2));
    foreignObject.setAttribute('height', height - (padding * 2));
    foreignObject.setAttribute('class', 'treemap-label-container');
    // Store the node ID as a data attribute to help with legend highlighting
    foreignObject.setAttribute('data-node-id', node.id);
    // IMPORTANT: Make foreignObject transparent to mouse events so the underlying rectangle gets hover events
    foreignObject.style.pointerEvents = 'none';
    
    // Create HTML div for text content with wrapping
    const textDiv = document.createElement('div');
    textDiv.style.width = '100%';
    textDiv.style.height = '100%';
    textDiv.style.overflow = 'hidden';
    textDiv.style.display = 'flex';
    textDiv.style.flexDirection = 'column';
    textDiv.style.textAlign = 'left'; // Change to left alignment
    textDiv.style.fontFamily = 'var(--font-family-monospace, monospace)';
    textDiv.style.color = this._getTextColor(this._getNodeColor(node, metadataProvider));
    textDiv.style.transition = 'opacity 0.2s ease-in-out, visibility 0.2s ease-in-out';
    textDiv.style.pointerEvents = 'none'; // Also make text transparent to mouse events
    textDiv.className = 'treemap-label';
    
    // Debug: Check if this is a section or chapter node
    if (node.id && (node.id.toString().startsWith('S') || (!isNaN(parseInt(node.id, 10)) && node.parent && node.parent.id && node.parent.id.toString().startsWith('S')))) {
      // If it's a section node, check specific section data
      if (node.id.toString().startsWith('S')) {
        const sectionId = node.id.toString().substring(1);
        if (window.sectionToChaptersMapping) {
          const sectionData = window.sectionToChaptersMapping[sectionId] || window.sectionToChaptersMapping[parseInt(sectionId, 10)];
          //console.log(`Section ${sectionId} data:`, sectionData ? JSON.stringify(sectionData).substring(0, 100) + '...' : 'not found');
        }
      }
      // If it's a chapter node with section parent, check chapter data
      else if (!isNaN(parseInt(node.id, 10)) && node.parent && node.parent.id && node.parent.id.toString().startsWith('S')) {
        const parentSectionId = node.parent.id.toString().substring(1);
        if (window.sectionToChaptersMapping) {
          const sectionData = window.sectionToChaptersMapping[parentSectionId] || window.sectionToChaptersMapping[parseInt(parentSectionId, 10)];
          if (sectionData && sectionData.chapters) {
            const chapterData = sectionData.chapters[node.id] || sectionData.chapters[parseInt(node.id, 10)];
            //console.log(`Chapter ${node.id} data in section ${parentSectionId}:`, chapterData ? JSON.stringify(chapterData).substring(0, 100) + '...' : 'not found');
          }
        }
      }
    }
    
    // Set the text content with mapping for null names
    const displayName = this._getDisplayName(node);
    
    // Create name span with cross-browser support for line clamping
    const nameSpan = document.createElement('div');
    const fontSize = this._getTextSize(width, height, node.level);
    nameSpan.style.fontSize = fontSize;
    nameSpan.style.fontWeight = 'bold';
    nameSpan.style.lineHeight = '1.2';
    nameSpan.style.marginBottom = '4px';
    nameSpan.style.wordWrap = 'break-word';
    
    // Cross-browser line clamping
    // Method 1: WebKit line clamp (Chrome, Safari)
    nameSpan.style.display = '-webkit-box';
    nameSpan.style.WebkitLineClamp = '2';
    nameSpan.style.WebkitBoxOrient = 'vertical';
    nameSpan.style.overflow = 'hidden';
    nameSpan.style.textOverflow = 'ellipsis';
    
    // Method 2: Max-height fallback (Firefox, IE, Edge)
    // Calculate approximate height of two lines based on font size
    const lineHeight = parseInt(fontSize) * 1.2;
    const twoLinesHeight = lineHeight * 2 + 2; // Add a little extra for safety
    nameSpan.style.maxHeight = `${Math.min(twoLinesHeight, height - 15)}px`;
    
    nameSpan.style.pointerEvents = 'none'; // Ensure mouse events pass through
    nameSpan.textContent = displayName || node.id;
    textDiv.appendChild(nameSpan);
    
    // If showing values and there's room, add value below the label
    // For deeper levels, use a smaller threshold
    // Use a very small height threshold to display values in more nodes
    const valueHeightThreshold = 8;
    
    if ((this.options.showValues || true) && height > valueHeightThreshold) {
      // Create value span
      const valueSpan = document.createElement('div');
      // Use slightly larger font for values
      const fontSizeFactor = 0.85;
      valueSpan.style.fontSize = `${parseInt(this._getTextSize(width, height, node.level)) * fontSizeFactor}px`;
      valueSpan.style.fontWeight = 'normal';
      valueSpan.style.lineHeight = '1.2';
      valueSpan.style.pointerEvents = 'none'; // Ensure mouse events pass through
      valueSpan.className = 'treemap-value';
      
      // Get total value from root node to calculate percentage
      const totalValue = this.rootNode ? this.rootNode.value : 0;
      
      // Calculate percentage of total (avoid division by zero)
      const percentage = totalValue > 0 ? (node.value / totalValue * 100) : 0;
      
      // Format the value with percentage
      const formattedValue = typeof this.options.valueFormatter === 'function' 
        ? this.options.valueFormatter(node.value)
        : node.value.toString();
      
      // Get the prefix if provided
      //const prefix =  this.options.valuePrefix || ''; // This causes a double $ if we have it set because the formatted value also has a $
      const prefix = ''
      // Format for all nodes - percentage and formatted value
      valueSpan.textContent = `${percentage.toFixed(1)}% (${prefix}${formattedValue})`;
      
      textDiv.appendChild(valueSpan);
    }
    
    // Add div to foreignObject
    foreignObject.appendChild(textDiv);
    
    // Add to container
    container.appendChild(foreignObject);
  }
  
  /**
   * Setup tooltip for a node
   * @param {SVGElement} element - Element to attach tooltip to
   * @param {TreemapNode} node - Node data
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @param {HTMLElement} tooltipContainer - Tooltip container
   * @private
   */
  _setupTooltip(element, node, metadataProvider, tooltipContainer) {
    // Only use our custom tooltip implementation and ignore sparksTooltipManager
    // This simplifies the code and ensures we only have one tooltip
    if (tooltipContainer) {
      // Custom tooltip implementation when tooltipContainer is available
      const tooltip = tooltipContainer;
      
      element.addEventListener('mouseenter', (e) => {
        try {
          // Make sure tooltip is in the correct container
          if (tooltip.parentNode !== document.body) {
            document.body.appendChild(tooltip);
          }
          // Set tooltip content
          const displayName = this._getDisplayName(node);
          
          // Calculate percentage of total (avoid division by zero)
          const totalValue = this.rootNode ? this.rootNode.value : 0;
          const percentage = totalValue > 0 ? (node.value / totalValue * 100) : 0;
          
          // Format value
          const formattedValue = typeof this.options.valueFormatter === 'function' 
            ? this.options.valueFormatter(node.value) 
            : node.value.toString();
          
          // Format the tooltip content
          let valueDisplay;
          
          try {
            // Check if we have a custom tooltip formatter
            if (this.options.tooltipFormatter && typeof this.options.tooltipFormatter === 'function') {
              // Get metadata for the node
              const metadata = metadataProvider ? metadataProvider.getMetadata(node.id) : null;
              valueDisplay = this.options.tooltipFormatter(node.value, node.name, node.id, metadata);
            }
            // Simplified formatting for tariff effect nodes
            /*
            else if (node.id && node.id.toString().startsWith('L')) {
              // Simple display of percentage of total
              valueDisplay = `${percentage.toFixed(1)}% of total effect`;
                
              // Add dollar impact if household income is available
              if (this.options.householdIncome && typeof this.options.householdIncome === 'number') {
                const impact = node.value * this.options.householdIncome;
                valueDisplay += `\n$${Math.abs(impact).toFixed(2)} impact on $${this.options.householdIncome.toLocaleString()} household`;
              }
                
              // Always show raw value in scientific notation
              const rawValue = node.value.toExponential(4);
              valueDisplay += `\nRaw effect value: ${rawValue}`;
            } */ else {
              // For other nodes, show percentage and value
              valueDisplay = `${percentage.toFixed(1)}% (${formattedValue})`;
            }
          } catch (error) {
            //console.error('Error in tooltip formatting:', error);
            // Fallback to simple formatting
            valueDisplay = `${node.name || node.id}: ${percentage.toFixed(1)}%`;
          }

          tooltip.innerHTML = `
              <div class="tooltip-header" style="font-family: var(--font-family-monospace, monospace); font-weight: bold; margin-bottom: 4px; color: var(--text-color, black);">${displayName || node.id}</div>
              <div class="tooltip-value" style="font-family: var(--font-family-monospace, monospace); color: var(--text-color, black);">${valueDisplay}</div>
              ${node.description ? `<div class="tooltip-description" style="font-family: var(--font-family-monospace, monospace); color: var(--text-color-secondary, #666); font-style: italic; margin-top: 4px;">${node.description}</div>` : ''}
          `;
          
          // Set tooltip styling with dark mode support and translucent effect
          tooltip.style.position = 'absolute';
          tooltip.style.zIndex = '1000';
          tooltip.style.backgroundColor = 'var(--background-color, white)';
          tooltip.style.color = 'var(--text-color, black)';
          tooltip.style.padding = '8px 12px';
          tooltip.style.border = '1px solid var(--borderColor, #ddd)';
          tooltip.style.borderRadius = 'var(--borderRadius, 4px)';
          tooltip.style.boxShadow = '0 2px 5px rgba(0,0,0,0.25)';
          tooltip.style.opacity = '0.9'; // Translucent effect
          tooltip.style.transition = 'opacity 0.2s ease';
          tooltip.style.fontFamily = 'var(--font-family-monospace, monospace)';
          tooltip.style.pointerEvents = 'none';
          
          // Show tooltip
          tooltip.style.visibility = 'visible';
          
          // Position tooltip
          this._positionTooltip(tooltip, e);
        } catch (error) {
          //console.warn('Error showing tooltip:', error);
        }
      });
      
      element.addEventListener('mousemove', (e) => {
        try {
          if (tooltip.style.visibility === 'visible') {
            this._positionTooltip(tooltip, e);
          }
        } catch (error) {
          //console.warn('Error positioning tooltip:', error);
        }
      });
      
      element.addEventListener('mouseleave', () => {
        try {
          tooltip.style.visibility = 'hidden';
        } catch (error) {
          //console.warn('Error hiding tooltip:', error);
        }
      });
    }
  }
  
  /**
   * Position a tooltip
   * @param {HTMLElement} tooltip - Tooltip element
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  _positionTooltip(tooltip, event) {
    if (!tooltip) return;
    
    // Get the container's position
    const containerRect = this.container.getBoundingClientRect();
    
    // Calculate position relative to the page, not the viewport
    const pageX = event.pageX || (event.clientX + window.scrollX);
    const pageY = event.pageY || (event.clientY + window.scrollY);
    
    // Calculate offset from mouse position
    const offsetX = 15;
    const offsetY = 15;
    
    // Position tooltip relative to the page
    tooltip.style.left = `${pageX + offsetX}px`;
    tooltip.style.top = `${pageY + offsetY}px`;
    
    // Ensure tooltip is within viewport
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // If tooltip goes beyond right edge, flip to left of cursor
    if (tooltipRect.right > viewportWidth) {
      tooltip.style.left = `${pageX - tooltipRect.width - offsetX}px`;
    }
    
    // If tooltip goes beyond bottom edge, flip to above cursor
    if (tooltipRect.bottom > viewportHeight) {
      tooltip.style.top = `${pageY - tooltipRect.height - offsetY}px`;
    }
  }
  
  /**
   * Render the legend
   * @param {HTMLElement} container - Legend container
   * @param {TreemapNode} rootNode - Root node
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @param {HTMLElement} tooltipContainer - Tooltip container
   * @private
   */
  _renderLegend(container, rootNode, metadataProvider, tooltipContainer) {
    // Get legend items from the specified level
    const legendLevel = this.options.legendLevel || 1;
    const legendItems = this._getLegendItems(rootNode, legendLevel, metadataProvider);
    
    // Sort legend items by value (descending) for better organization
    legendItems.sort((a, b) => b.value - a.value);
    
    // Add a legend title for clarity
    const legendTitle = document.createElement('div');
    legendTitle.className = 'legend-title';
    legendTitle.style.fontSize = '16px';  // Increased from 14px
    legendTitle.style.fontWeight = 'bold';
    legendTitle.style.marginBottom = '10px';
    legendTitle.style.paddingLeft = '4px';
    legendTitle.style.paddingTop = '5px';
    
    // Determine what the legend represents based on level
    if (legendLevel === 0) {
      legendTitle.textContent = 'Regions';
    } else if (legendLevel === 1) {
      legendTitle.textContent = '';// Need to fix this at some point such that this renders the
    } else if (legendLevel === 2) {
      // Look for any node with an id starting with 'S' to determine if this is a product section level
      const hasSectionNodes = legendItems.some(item => item.id && item.id.toString().startsWith('S'));
      legendTitle.textContent = hasSectionNodes ? 'Product Categories' : 'Products';
    } else {
      legendTitle.textContent = `Level ${legendLevel} Items`;
    }
    
    container.appendChild(legendTitle);
    
    // Reset link removed
    
    // Create legend items container with improved grid layout
    const legend = document.createElement('div');
    legend.className = 'treemap-legend-items';
    legend.style.display = 'grid';
    legend.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))'; // Increased from 180px to 200px
    legend.style.gap = '6px'; // Keep the original gap size
    legend.style.padding = '4px';
    
    // Add legend items in a grid layout
    legendItems.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'treemap-legend-item';
      itemEl.setAttribute('data-id', item.id);
      
      // Calculate percentage for tooltip
      const tooltipTotalValue = this.rootNode ? this.rootNode.value : 0;
      const tooltipPercentage = tooltipTotalValue > 0 ? (item.value / tooltipTotalValue * 100) : 0;
      
      // Add percentage first, then value to tooltip
      itemEl.title = `${item.name}: ${tooltipPercentage.toFixed(1)}% (${this.options.valueFormatter(item.value)})`; // Tooltip for full info
      
      // Improved styling for legend items - vertical layout
      itemEl.style.display = 'flex';
      itemEl.style.flexDirection = 'column';
      itemEl.style.padding = '4px 8px';
      itemEl.style.borderRadius = '3px';
      itemEl.style.cursor = 'pointer';
      itemEl.style.transition = 'all 0.2s';
      itemEl.style.border = '1px solid transparent';
      
      // Add hover styles
      itemEl.addEventListener('mouseenter', () => {
        itemEl.style.backgroundColor = 'rgba(0,0,0,0.05)';
        itemEl.style.border = '1px solid rgba(0,0,0,0.1)';
      });
      
      itemEl.addEventListener('mouseleave', () => {
        itemEl.style.backgroundColor = '';
        itemEl.style.border = '1px solid transparent';
      });
      
      // Create header row with color and name
      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.alignItems = 'center';
      headerRow.style.marginBottom = '2px'; // Reduced spacing
      headerRow.style.width = '100%';
      
      // Create color square with improved styling
      const colorBox = document.createElement('div');
      colorBox.className = 'legend-color';
      colorBox.style.backgroundColor = item.color; // This should show the color
      colorBox.style.width = '14px';  // Increased from 12px
      colorBox.style.height = '14px';  // Increased from 12px
      colorBox.style.minWidth = '14px';  // Increased from 12px
      colorBox.style.borderRadius = '2px';
      colorBox.style.marginRight = '6px';  // Increased from 5px
      colorBox.style.display = 'inline-block';
      // Add subtle outline that works in both light and dark mode
      colorBox.style.border = '1px solid var(--borderColor, rgba(0,0,0,0.1))';
      
      // Create label - use display name if item.name is null
      const label = document.createElement('div');
      label.className = 'legend-label';
      const displayName = item.name && item.name !== 'null' && item.name !== null ? 
        item.name : this._getDisplayName(item.node);
      label.textContent = displayName || item.id;
      label.style.flex = '1';
      label.style.fontWeight = '500';
      label.style.fontSize = '14px';  // Increased from 12px
      label.style.fontFamily = 'var(--font-family-monospace, monospace)';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.style.whiteSpace = 'nowrap';
      label.style.maxWidth = '160px'; // Ensure text has room to display
      
      // Add color and label to header row
      headerRow.appendChild(colorBox);
      headerRow.appendChild(label);
      
      // Create value with improved styling - now centered below the name
      const value = document.createElement('div');
      value.className = 'legend-value';
      
      // Calculate percentage of total value
      const totalValue = this.rootNode ? this.rootNode.value : 0;
      const percentage = totalValue > 0 ? (item.value / totalValue * 100) : 0;
      
      // Format percentage with value in parentheses
      const formattedValue = this.options.valueFormatter(item.value);
      value.textContent = `${percentage.toFixed(1)}% (${formattedValue})`;
      
      value.style.fontSize = '13px';  // Increased from 11px
      value.style.fontFamily = 'var(--font-family-monospace, monospace)';
      value.style.color = 'var(--text-color-secondary, #666)';
      value.style.textAlign = 'center';
      value.style.width = '100%';
      value.style.lineHeight = '1.2';
      value.style.marginTop = '2px';
      
      // Assemble legend item with vertical layout
      itemEl.appendChild(headerRow);
      itemEl.appendChild(value);
      
      // Add to legend
      legend.appendChild(itemEl);
      
      // Add highlight to rectangle interaction (this will work in conjunction with the hover styles)
      itemEl.addEventListener('mouseenter', () => {
        // Get all treemap rectangles across all treemaps
        const allRects = document.querySelectorAll('.treemap-rect');
        
        // Get all treemap label containers by their class across all treemaps
        const allLabelContainers = document.querySelectorAll('.treemap-label-container');
        
        // Initially hide all label containers
        allLabelContainers.forEach(labelContainer => {
          labelContainer.style.visibility = 'hidden';
        });
        
        // Dim all rectangles
        allRects.forEach(rect => {
          rect.style.opacity = '0.3';
          rect.setAttribute('stroke', 'var(--background-color, #fff)');
          rect.setAttribute('stroke-width', this.options.padding);
        });
        
        // Find all rectangles that match this item's ID directly
        const directMatchRects = document.querySelectorAll(`.treemap-rect[data-id="${item.id}"]`);
        
        // Identify related rectangles based on hierarchical relationships
        // For sections, find all chapter rectangles that belong to this section
        let relatedRects = [];
        
        // If this is a section (ID starts with 'S'), also highlight all its chapters
        if (item.id && item.id.toString().startsWith('S')) {
          // Extract section number
          const sectionNum = item.id.toString().substring(1);
          
          // Get all section mapping data
          if (window.sectionToChaptersMapping && window.sectionToChaptersMapping[sectionNum]) {
            const sectionData = window.sectionToChaptersMapping[sectionNum];
            
            // If section has chapters, highlight all rectangles with those chapter IDs
            if (sectionData && sectionData.chapters) {
              const chapterIds = Object.keys(sectionData.chapters);
              
              // Add all chapter rectangles to related elements
              chapterIds.forEach(chapterId => {
                const chapterRects = document.querySelectorAll(`.treemap-rect[data-id="${chapterId}"]`);
                relatedRects = [...relatedRects, ...Array.from(chapterRects)];
              });
            }
          }
        }
        
        // Combine direct matches with related rectangles
        const allMatchingRects = [...Array.from(directMatchRects), ...relatedRects];
        
        // For diagnostic purposes, log highlighting details
        /*
        console.log(`Highlighting treemap nodes for: ${item.name || item.id}`);
        console.log(`- Direct matches: ${directMatchRects.length}`);
        console.log(`- Related matches: ${relatedRects.length}`);
        console.log(`- Total highlighted: ${allMatchingRects.length}`);
        */
        // Highlight all matching rectangles and only their labels
        allMatchingRects.forEach(rect => {
          rect.style.opacity = '1';
          rect.setAttribute('stroke', 'var(--text-color, #333)');
          rect.setAttribute('stroke-width', this.options.padding * 2);
          
          // Get the node ID from the rectangle
          const nodeId = rect.getAttribute('data-id');
          
          // Find and show the label containers for this node ID across all treemaps
          if (nodeId) {
            const matchingLabels = document.querySelectorAll(`.treemap-label-container[data-node-id="${nodeId}"]`);
            matchingLabels.forEach(matchingLabel => {
              matchingLabel.style.visibility = 'visible';
            });
          }
        });
      });
      
      itemEl.addEventListener('mouseleave', () => {
        // Restore all rectangles and labels to normal across all treemaps
        document.querySelectorAll('.treemap-rect').forEach(rect => {
          rect.style.opacity = '1';
          rect.setAttribute('stroke', 'var(--background-color, #fff)');
          rect.setAttribute('stroke-width', this.options.padding);
        });
        
        document.querySelectorAll('.treemap-label-container').forEach(labelContainer => {
          // Make all label containers visible again
          labelContainer.style.visibility = 'visible';
        });
      });
      
      // Make legend items clickable
      itemEl.addEventListener('click', () => {
        const event = new CustomEvent('treemap-legend-click', {
          bubbles: true,
          detail: { id: item.id, node: item.node }
        });
        container.dispatchEvent(event);
      });
    });
    
    // Add to container
    container.appendChild(legend);
  }
  
  /**
   * Get legend items from the tree
   * @param {TreemapNode} rootNode - Root node
   * @param {number} level - Level to get items from
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @returns {Array<Object>} Legend items
   * @private
   */
  _getLegendItems(rootNode, level, metadataProvider) {
    const items = [];
    const self = this; // Store reference to TreemapRenderer instance
    
    // Recursive function to find nodes at the specified level
    function findNodesAtLevel(node, currentLevel) {
      if (currentLevel === level) {
        // Use _getNodeColor to ensure consistent colors with the treemap
        const nodeColor = self._getNodeColor(node, metadataProvider);
        items.push({
          id: node.id,
          name: node.name,
          value: node.value,
          color: nodeColor,
          node: node
        });
        return;
      }
      
      // Continue recursion
      node.children.forEach(child => findNodesAtLevel(child, currentLevel + 1));
    }
    
    // Start recursion
    findNodesAtLevel(rootNode, 0);
    
    return items;
  }
  
  /**
   * Render animation
   * @param {SVGElement} container - SVG container
   * @param {TreemapNode} rootNode - Root node
   * @param {Array<Array<Object>>} states - Animation states
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @private
   */
  _renderAnimation(container, rootNode, states, metadataProvider) {
    // Create map of nodes by ID for quick lookup
    const nodesById = {};
    
    function mapNodes(node) {
      nodesById[node.id] = node;
      node.children.forEach(mapNodes);
    }
    
    mapNodes(rootNode);
    
    // Create rectangles for each node
    const rectangles = {};
    
    // Get flattened list of all nodes to render
    const allNodes = [];
    
    function flattenNodes(node) {
      if (node.level > 0) { // Skip root
        allNodes.push(node);
      }
      node.children.forEach(flattenNodes);
    }
    
    flattenNodes(rootNode);
    
    // Create rectangles for all nodes
    allNodes.forEach(node => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('fill', this._getNodeColor(node, metadataProvider));
      rect.setAttribute('stroke', '#fff');
      rect.setAttribute('stroke-width', this.options.padding);
      rect.setAttribute('class', 'treemap-rect treemap-rect-animated');
      rect.setAttribute('data-id', node.id);
      rect.setAttribute('data-level', node.level);
      
      // Initial position (outside of view)
      rect.setAttribute('x', -1000);
      rect.setAttribute('y', -1000);
      rect.setAttribute('width', 0);
      rect.setAttribute('height', 0);
      
      // Add to container and store reference
      container.appendChild(rect);
      rectangles[node.id] = rect;
    });
    
    // Function to update rectangles for a given state
    const updateToState = (stateIndex) => {
      const state = states[stateIndex];
      
      state.forEach(nodeState => {
        const rect = rectangles[nodeState.id];
        if (rect) {
          rect.setAttribute('x', nodeState.rect.x);
          rect.setAttribute('y', nodeState.rect.y);
          rect.setAttribute('width', nodeState.rect.width);
          rect.setAttribute('height', nodeState.rect.height);
        }
      });
    };
    
    // Start animation
    let currentStateIndex = 0;
    const animationDuration = this.options.animationDuration || 800;
    const framesPerSecond = 60;
    const totalFrames = Math.min(states.length, (animationDuration / 1000) * framesPerSecond);
    const frameDelay = animationDuration / totalFrames;
    
    // Show initial state
    updateToState(0);
    
    // Animation timer
    const animateNextFrame = () => {
      currentStateIndex++;
      
      if (currentStateIndex >= states.length) {
        // Animation complete, render final state
        this._renderNodes(container, rootNode, metadataProvider);
        return;
      }
      
      // Update to next state
      updateToState(currentStateIndex);
      
      // Schedule next frame
      setTimeout(animateNextFrame, frameDelay);
    };
    
    // Start animation
    setTimeout(animateNextFrame, frameDelay);
  }
  
  /**
   * Get color for a node
   * @param {TreemapNode} node - Node
   * @param {MetadataProvider} metadataProvider - Metadata provider
   * @returns {string} Color value
   * @private
   */
  _getNodeColor(node, metadataProvider) {
    // Use consistent color assignment across all treemaps
    // Make sure the global map exists
    if (!window._treemapGlobalColorMap) {
      this._initGlobalColorMap();
    }
    
    // Color palettes for different levels using organization's approved colors
    const colorPalettes = {
      // Continents (level 0) - Using NEW Palette from Whitney
      continent: [
        '#3581b4', // blue1
        '#7fac1c', // green1
        '#f3bb00', // yellow1
        '#56bfd6', // blue2
        '#ca590c', // orange1
        '#53c49f', // teal1
        '#d34682', // pink1
        '#4a3e8e', // purple1
        '#580d10', // maroon1
        '#006278', // blue3
        '#385100', // green2
        '#414141'  // gray1
      ],
      
      // Countries (level 1) - Derived from continent colors
      country: [], // Will be derived from parent
      
      // Products (level 2) - Using BRAND PALETTE
      product: [
        '#BF1B23', // respectRed
        '#CC276E', // fuchsia
        '#5E4FB3', // integrityIndigo
        '#009EC1', // teal
        '#00A871', // shamrockGreen
        '#6FA200', // limeGreen
        '#FFC400', // gold
        '#ED690E'  // excellenceOrange
      ],
      
      // Sub-products (level 3) - Using DARKS and TERTIARY LIGHT palettes
      subproduct: [
        '#891922', // respectRedDark
        '#991F57', // fuchsiaDark
        '#3E3B71', // integrityIndigoDark
        '#00724A', // shamrockGreenDark
        '#03798D', // tealDark
        '#d79a97', // respectRedLight
        '#DE0EB8', // fuchsiaLight
        '#AEABD1', // integrityIndigoLight
        '#9FCEDC', // tealLight
        '#A1D1B8', // shamrockGreenLight
        '#BCD0A5', // lineGreenLight
        '#FBE3A2', // goldLight
        '#EFB79C'  // excellenceOrangeLight
      ]
    };
    
    // First try to get color from node itself (explicit color has highest priority)
    if (node.color) return node.color;
    
    // Then try to get color from metadata (second highest priority)
    const metadataColor = metadataProvider.getColor(node.id);
    if (metadataColor) return metadataColor;
    
    // HIERARCHICAL COLOR INHERITANCE SYSTEM
    
    // Root node (usually "World" or similar)
    if (node.level === 0) {
      // Special case for root node with no parent
      if (!node.parent) {
        const rootColor = '#333333'; // Dark grey for root
        
        // Assign colors to children based on continent palette
        node.children.forEach((child, index) => {
          // Store the derived color on the child for later reference
          child._derivedColor = colorPalettes.continent[index % colorPalettes.continent.length];
        });
        
        return rootColor;
      }
    }
    
    // Level 1 nodes (typically countries)
    if (node.level === 1) {
      // If node already has a derived color, use it
      if (node._derivedColor) return node._derivedColor;
      
      // If parent exists, try to get a color derived from parent
      if (node.parent) {
        // Try to get parent's derived color first
        let parentColor = node.parent._derivedColor;
        
        // If parent doesn't have a derived color, try to get its color directly
        if (!parentColor) {
          parentColor = this._getNodeColor(node.parent, metadataProvider);
        }
        
        // Find index of this node among its siblings
        const siblingIndex = node.parent.children.indexOf(node);
        
        // Get a derived color based on parent's color with slight variation
        // Use node's index among siblings to determine the lightness adjustment
        const lightnessAdjustment = 0 //15 + (siblingIndex % 3) * 5; // 15, 20, or 25
        
        // Store the derived color for future reference
        node._derivedColor = this._adjustColor(parentColor, lightnessAdjustment);
        return node._derivedColor;
      }
    }
    
    // Level 2 nodes (typically products or product sections)
    if (node.level === 2) {
      // Special handling for section nodes (IDs starting with 'S')
      if (node.id && node.id.toString().startsWith('S')) {
        const sectionId = node.id.toString();
        
        // Check if we already have a color for this section in our global map
        if (window._treemapGlobalColorMap.sections[sectionId]) {
          return window._treemapGlobalColorMap.sections[sectionId];
        }
        
        // If not, assign a new color from the product palette
        // Use a consistent index based on the section ID number
        const sectionNum = parseInt(sectionId.substring(1), 10) || 0;
        const colorIndex = sectionNum % colorPalettes.product.length;
        const color = colorPalettes.product[colorIndex];
        
        // Store it in our global map for future reference
        window._treemapGlobalColorMap.sections[sectionId] = color;
        window._treemapGlobalColorMap.assignedSections.push(sectionId);
        
        return color;
      }
      
      // For non-section nodes at level 2, use regular approach
      if (node.parent) {
        // Find index of this node among its siblings
        const siblingIndex = node.parent.children.indexOf(node);
        
        // If the number of siblings is small, use a gradient approach
        if (node.parent.children.length <= 5) {
          // Get parent color
          const parentColor = this._getNodeColor(node.parent, metadataProvider);
          
          // Create a palette of variations based on parent color
          const variations = [
            this._adjustColor(parentColor, 15),  // Lighter
            this._adjustColor(parentColor, 5),   // Slightly lighter
            parentColor,                         // Same
            this._adjustColor(parentColor, -5),  // Slightly darker
            this._adjustColor(parentColor, -15)  // Darker
          ];
          
          return variations[siblingIndex % variations.length];
        } 
        // If many siblings, use distinct colors from product palette (BRAND PALETTE)
        else {
          return colorPalettes.product[siblingIndex % colorPalettes.product.length];
        }
      }
    }
    
    // Level 3 nodes (typically sub-products or chapters)
    if (node.level === 3) {
      // Special handling for chapter nodes that have a parent section (IDs starting with 'S')
      if (node.id && node.parent && node.parent.id && node.parent.id.toString().startsWith('S')) {
        const chapterId = node.id.toString();
        const parentSectionId = node.parent.id.toString();
        const chapterKey = `${parentSectionId}_${chapterId}`;
        
        // Check if we already have a color for this chapter in our global map
        if (window._treemapGlobalColorMap.sections[chapterKey]) {
          return window._treemapGlobalColorMap.sections[chapterKey];
        }
        
        // If not, derive from parent section color with consistent modification
        // Get the parent section color first
        const parentColor = this._getNodeColor(node.parent, metadataProvider);
        
        // Use chapter number for consistent modification
        const chapterNum = parseInt(chapterId, 10) || 0;
        const modIndex = chapterNum % 5; // Create 5 variations
        
        // Create variations of the parent color
        let color;
        switch(modIndex) {
          case 0: color = this._adjustColor(parentColor, 20); break;  // Lighter
          case 1: color = this._adjustColor(parentColor, 10); break;  // Slightly lighter
          case 2: color = parentColor; break;                         // Same
          case 3: color = this._adjustColor(parentColor, -10); break; // Slightly darker
          case 4: color = this._adjustColor(parentColor, -20); break; // Darker
          default: color = parentColor;
        }
        
        // Store it in our global map for future reference
        window._treemapGlobalColorMap.sections[chapterKey] = color;
        
        return color;
      }
      
      // For other level 3 nodes, use the regular approach
      if (node.parent) {
        const siblingIndex = node.parent.children.indexOf(node);
        // Use the dedicated subproduct palette
        return colorPalettes.subproduct[siblingIndex % colorPalettes.subproduct.length];
      }
    }
    
    // Level 4 and deeper (deeper hierarchies)
    if (node.level > 3) {
      // Always derive from parent color with progressively lighter adjustments
      if (node.parent) {
        const parentColor = this._getNodeColor(node.parent, metadataProvider);
        // Deeper levels get progressively lighter
        const lightnessAdjustment = 15 + ((node.level - 3) * 5);
        return this._adjustColor(parentColor, lightnessAdjustment);
      }
    }
    
    // Default color strategy as fallback
    const defaultColor = this.options.colors[node.level % this.options.colors.length];
    return defaultColor;
  }
  
  /**
   * Adjust a color to be lighter or darker
   * @param {string} color - Base color (hex or rgb)
   * @param {number} amount - Amount to lighten (positive) or darken (negative)
   * @returns {string} Adjusted color
   * @private
   */
  _adjustColor(color, amount) {
    // Convert to hex if it's rgb
    let hex = color;
    if (color.startsWith('rgb')) {
      const rgb = color.match(/\d+/g).map(Number);
      hex = `#${rgb.map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('')}`;
    }
    
    // Parse hex color
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    // Adjust each component
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  /**
   * Get appropriate text color for a background
   * @param {string} backgroundColor - Background color
   * @returns {string} Text color (black or white)
   * @private
   */
  _getTextColor(backgroundColor) {
    // Custom text color mapping - this can be replaced with your organization's required mappings
    const textColorMap = {
      // Whitney palette text colors
      '#3581b4': '#FFFFFF', // blue1 - white text
      '#7fac1c': '#FFFFFF', // green1 - white text
      '#f3bb00': '#000000', // yellow1 - black text
      '#56bfd6': '#000000', // blue2 - black text
      '#ca590c': '#FFFFFF', // orange1 - white text
      '#53c49f': '#000000', // teal1 - black text
      '#d34682': '#FFFFFF', // pink1 - white text
      '#4a3e8e': '#FFFFFF', // purple1 - white text
      '#580d10': '#FFFFFF', // maroon1 - white text
      '#006278': '#FFFFFF', // blue3 - white text
      '#385100': '#FFFFFF', // green2 - white text
      '#414141': '#FFFFFF', // gray1 - white text
      
      // Brand palette text colors
      '#BF1B23': '#FFFFFF', // respectRed - white text
      '#CC276E': '#FFFFFF', // fuchsia - white text
      '#5E4FB3': '#FFFFFF', // integrityIndigo - white text
      '#009EC1': '#FFFFFF', // teal - white text
      '#00A871': '#FFFFFF', // shamrockGreen - white text
      '#6FA200': '#FFFFFF', // limeGreen - white text
      '#FFC400': '#000000', // gold - black text
      '#ED690E': '#FFFFFF', // excellenceOrange - white text
      
      // Dark and Light text colors
      '#891922': '#FFFFFF', // respectRedDark - white text
      '#991F57': '#FFFFFF', // fuchsiaDark - white text
      '#3E3B71': '#FFFFFF', // integrityIndigoDark - white text
      '#00724A': '#FFFFFF', // shamrockGreenDark - white text
      '#03798D': '#FFFFFF', // tealDark - white text
      '#d79a97': '#000000', // respectRedLight - black text
      '#DE0EB8': '#FFFFFF', // fuchsiaLight - white text
      '#AEABD1': '#000000', // integrityIndigoLight - black text
      '#9FCEDC': '#000000', // tealLight - black text
      '#A1D1B8': '#000000', // shamrockGreenLight - black text
      '#BCD0A5': '#000000', // lineGreenLight - black text
      '#FBE3A2': '#000000', // goldLight - black text
      '#EFB79C': '#000000'  // excellenceOrangeLight - black text
    };
    
    // Normalize background color to uppercase for case-insensitive matching
    const normalizedColor = backgroundColor.toUpperCase();
    
    // Check if we have a predefined text color for this background
    for (const [bgColor, textColor] of Object.entries(textColorMap)) {
      if (bgColor.toUpperCase() === normalizedColor) {
        return textColor;
      }
    }
    
    // For colors not in the mapping or for derived colors, 
    // fall back to luminance-based calculation
    
    // Convert hex to RGB
    let r, g, b;
    
    if (backgroundColor.startsWith('#')) {
      const hex = backgroundColor.substring(1);
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else if (backgroundColor.startsWith('rgb')) {
      const rgb = backgroundColor.match(/\d+/g);
      r = parseInt(rgb[0]);
      g = parseInt(rgb[1]);
      b = parseInt(rgb[2]);
    } else {
      return '#000000'; // Default to black for unknown format
    }
    
    // Calculate luminance - this is a standard formula for perceived brightness
    //const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Use white text for dark backgrounds, black for light
    //return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }
  
  /**
   * Get appropriate text size based on rectangle dimensions and node level
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @param {number} level - Level in the hierarchy (optional)
   * @returns {string} Font size
   * @private
   */
  _getTextSize(width, height, level = 1) {
    const area = width * height;
    
    // Use smaller text for deeper levels with less aggressive scaling
    const levelFactor = level > 1 ? 0.85 : 1;
    
    // Increased font sizes for all box sizes
    if (area > 20000) return `${Math.round(20 * levelFactor)}px`;  // Very large boxes
    if (area > 10000) return `${Math.round(18 * levelFactor)}px`;  // Large boxes
    if (area > 5000) return `${Math.round(16 * levelFactor)}px`;   // Medium-large boxes
    if (area > 2000) return `${Math.round(14 * levelFactor)}px`;   // Medium boxes
    if (area > 800) return `${Math.round(11 * levelFactor)}px`;    // Small-medium boxes
    if (area > 400) return `${Math.round(9 * levelFactor)}px`;     // Small boxes
    return `${Math.round(8 * levelFactor)}px`;                     // Very small boxes
  }
  
  /**
   * Truncate text to fit within width
   * @param {SVGTextElement} textElement - Text element
   * @param {number} maxWidth - Maximum width
   * @private
   */
  _truncateText(textElement, maxWidth) {
    const text = textElement.textContent;
    
    // Skip if text is too short
    if (text.length <= 3) return;
    
    // Get approximate text width
    const fontSize = parseInt(textElement.getAttribute('font-size')) || 10;
    const textLength = text.length * fontSize * 0.6;
    
    if (textLength > maxWidth) {
      // Calculate how many characters can fit
      const ratio = maxWidth / textLength;
      const maxChars = Math.max(3, Math.floor(text.length * ratio)) - 3; // Leave room for ellipsis
      
      // Truncate text
      textElement.textContent = text.substring(0, maxChars) + '...';
    }
  }
  
  /**
   * Default value formatter
   * @param {number} value - Value to format
   * @returns {string} Formatted value
   * @private
   */
  // The default formatter is now defined inline in the constructor options
  
  /**
   * Get a display name for a node, using section/chapter mappings if available
   * @param {TreemapNode} node - The node to get a name for
   * @returns {string} The display name
   * @private
   */
  _getDisplayName(node) {
    // If node already has a valid name, use it
    if (node.name && node.name !== 'null' && node.name !== null) {
      return node.name;
    }
    
    // If no valid name, attempt to get one from section/chapter mappings
    try {
      // Only load the mapping once and cache it
      if (!this._sectionMapping) {
        this._sectionMapping = this._loadSectionMapping();
      }
      
      // If mapping couldn't be loaded, fall back to node.id
      if (!this._sectionMapping) {
        return node.id;
      }
      
      // For debugging: log node info
      if (!this._hasLoggedNodeInfo) {
        /*
        console.log('Example node structure:', {
          id: node.id,
          name: node.name,
          level: node.level,
          parentId: node.parent ? node.parent.id : 'no parent'
        });*/
        this._hasLoggedNodeInfo = true;
      }
      
      // Handle nodes with "S" prefix (sections)
      if (node.id && node.id.toString().startsWith('S')) {
        const sectionId = node.id.toString().substring(1); // Remove the 'S'
        // Try string key first, then numeric key if that fails
        if (this._sectionMapping[sectionId]) {
          const mappedName = this._sectionMapping[sectionId].title;
          //console.log(`Section mapping: Node ${node.id} → Section ${sectionId} → "${mappedName}"`);
          return mappedName;
        } else if (this._sectionMapping[parseInt(sectionId, 10)]) {
          const mappedName = this._sectionMapping[parseInt(sectionId, 10)].title;
          //console.log(`Section mapping (numeric): Node ${node.id} → Section ${parseInt(sectionId, 10)} → "${mappedName}"`);
          return mappedName;
        } else {
          //console.log(`Section mapping failed: No entry for section ${sectionId} (string or numeric)`);
          // Log all available section keys for debugging
          //console.log(`Available section keys: ${Object.keys(this._sectionMapping).slice(0, 10).join(', ')}...`);
        }
      }
      
      // Handle chapter nodes (numerical IDs, children of sections)
      if (node.parent && node.parent.id && node.parent.id.toString().startsWith('S')) {
        const parentSectionId = node.parent.id.toString().substring(1); // Remove the 'S'
        const nodeId = node.id.toString(); // Ensure string for comparison
        
        // Try different combinations of string/numeric IDs
        let mappedName = null;
        let sectionEntry = this._sectionMapping[parentSectionId] || this._sectionMapping[parseInt(parentSectionId, 10)];
        
        if (sectionEntry && sectionEntry.chapters) {
          // Try different formats for the chapter ID
          if (sectionEntry.chapters[nodeId]) {
            mappedName = sectionEntry.chapters[nodeId].short;
            //console.log(`Chapter mapping (string): Node ${node.id} → Chapter "${mappedName}"`);
          } else if (sectionEntry.chapters[parseInt(nodeId, 10)]) {
            mappedName = sectionEntry.chapters[parseInt(nodeId, 10)].short;
            //console.log(`Chapter mapping (numeric): Node ${node.id} → Chapter "${mappedName}"`);
          }
          
          if (mappedName) {
            return mappedName;
          } else {
            //console.log(`Chapter mapping failed: No entry for chapter ${nodeId} in section ${parentSectionId}`);
            // Log available chapter keys for debugging
            const chapterKeys = Object.keys(sectionEntry.chapters);
            //console.log(`Section ${parentSectionId} exists with ${chapterKeys.length} chapters`);
            //console.log(`Available chapter keys: ${chapterKeys.slice(0, 10).join(', ')}...`);
            //console.log(`Node ID type: ${typeof nodeId}, Example chapter key type: ${typeof chapterKeys[0]}`);
          }
        } else {
         // console.log(`Chapter mapping failed: Section ${parentSectionId} not found or has no chapters`);
        }
      }
      
      // Fall back to node.id if no mapping found
      //console.log(`No mapping found for node ${node.id}, falling back to ID`);
      return node.id;
    } catch (error) {
      console.warn('Error getting display name for node:', error);
      return node.id;
    }
  }
  
  // _resetTreemap method has been removed

  /**
   * Load the section to chapter mappings from the data path
   * @returns {Object|null} The mapping object or null if loading failed
   * @private
   */
  _loadSectionMapping() {
    try {
      // Try to get the mapping from window.sectionToChaptersMapping if it exists
      if (window.sectionToChaptersMapping) {
        //console.log('Using cached section mapping from window.sectionToChaptersMapping');
        //console.log('Available sections:', Object.keys(window.sectionToChaptersMapping).length);
        //console.log('Sample section keys:', Object.keys(window.sectionToChaptersMapping).slice(0, 5).join(', '));
        return window.sectionToChaptersMapping;
      }
      
      // Otherwise, load it asynchronously and cache for future use
      const mappingPath = window.DataPaths && window.DataPaths.meta ? 
        window.DataPaths.meta.section_to_chapters : 
        'data/metadata/section_to_chapters_full_rewritten.json';
      
      c//onsole.log('Loading section mapping from:', mappingPath);
      
      // Start the fetch but don't wait for it
      fetch(mappingPath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load section mapping: ${response.status}`);
          }
          //console.log('Section mapping fetch successful, parsing JSON...');
          return response.json();
        })
        .then(data => {
          // Cache the mapping globally for future use
          window.sectionToChaptersMapping = data;
          // Also cache locally in this instance
          this._sectionMapping = data;
          //console.log('Section to chapter mapping loaded successfully');
          //console.log('Available sections:', Object.keys(data).length);
          //console.log('Sample section keys:', Object.keys(data).slice(0, 5).join(', '));
          //console.log('Sample section 1 title:', data['1'] ? data['1'].title : 'not found');
          
          // Log mapping structure for debugging
          if (data['1'] && data['1'].chapters) {
            //console.log('Section 1 has', Object.keys(data['1'].chapters).length, 'chapters');
            //console.log('Chapter keys in section 1:', Object.keys(data['1'].chapters).slice(0, 5).join(', '));
            //console.log('Sample chapter data:', data['1'].chapters['1']);
          }
        })
        .catch(error => {
          console.error('Error loading section to chapter mapping:', error);
        });
      
      // Return null since we don't have the mapping yet
      //console.log('Initial load returning null, mapping will be available asynchronously');
      return null;
    } catch (error) {
      console.error('Error setting up section mapping:', error);
      return null;
    }
  }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreemapRenderer;
} else {
  // Browser environment
  window.CompressedTreemap = window.CompressedTreemap || {};
  window.CompressedTreemap.TreemapRenderer = TreemapRenderer;
}