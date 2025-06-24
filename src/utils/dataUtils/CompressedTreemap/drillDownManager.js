/**
 * DrillDownManager.js
 * 
 * Manages drill-down navigation for treemaps.
 * Tracks navigation state and handles drill-down/up events.
 */

/**
 * Manages drill-down navigation for treemaps
 */
class DrillDownManager {
  /**
   * Create a new drill-down manager
   * @param {Object} options - Manager options
   */
  constructor(options = {}) {
    this.options = {
      // Expanded default levels to support deeper hierarchies
      drillDownLevels: ['level0', 'level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'],
      maxDrillLevel: null, // No limit by default
      disabledLevels: [], // No disabled levels by default
      ...options
    };
    
    this.navigationStack = [];
    this.currentLevel = 0;
    this.currentId = null;
    this.onDrillDown = null;
    this.onDrillUp = null;
  }
  
  /**
   * Register drill-down handler
   * @param {Function} handler - Function to call on drill-down
   */
  setDrillDownHandler(handler) {
    this.onDrillDown = handler;
  }
  
  /**
   * Register drill-up handler
   * @param {Function} handler - Function to call on drill-up
   */
  setDrillUpHandler(handler) {
    this.onDrillUp = handler;
  }
  
  /**
   * Drill down to a specific node
   * @param {TreemapNode} node - Node to drill down to
   * @param {Object} context - Additional context data
   * @returns {boolean} True if drill-down was performed, false if it was disabled
   */
  drillDown(node, context = {}) {
    if (!node) return false;
    
    // Check if drill-down is enabled for the current level
    if (!this.isDrillDownEnabled(this.currentLevel)) {
      //console.log(`Drill-down disabled for level ${this.currentLevel}`);
      return false;
    }
    
    // Push current state to navigation stack - now with node reference
    this.navigationStack.push({
      level: this.currentLevel,
      id: this.currentId,
      node: node,  // Store the node object so we can use it later for the path
      name: node.name, // Store the name directly in case node reference is lost
      context: { ...context }
    });
    
    // Update current state
    this.currentLevel++;
    this.currentId = node.id;
    
    // Debug log for drill-down operation
    /*
    console.log(`Drill Down called:`, {
      node: node,
      level: this.currentLevel,
      originalLayer: node._originalLayer, // Log the original layer if available
      context: context,
      hasChildren: node && node.children && node.children.length > 0,
      childCount: node && node.children ? node.children.length : 0,
      hasStoredChildCount: node && node._childCount !== undefined,
      storedChildCount: node ? node._childCount : 0,
      // For tariff effect nodes, check for metadata children using original layer
      isTariffNode: node && node.id && typeof node.id === 'string' && node.id.match(/^L\d+_/)
    });
    */
    // Special handling for tariff effect nodes with pattern L#_
    if (node && node.id && typeof node.id === 'string' && node.id.match(/^L\d+_/)) {
      // Get the original layer from node
      const originalLayer = node._originalLayer;
      
      if (originalLayer !== undefined) {
        //console.log(`This is a tariff node with original layer ${originalLayer}`);
        
        // Determine which effect type this node belongs to by checking effect-specific global variables
        let effectType = 'default';
        let treemapData = null;
        
        // Try to find which effect type this node belongs to
        if (node._effectType) {
          // If the node has an explicitly stored effect type, use it
          effectType = node._effectType;
          //console.log(`Node has explicit effect type: ${effectType}`);
        } else {
          // Check known effect types
          ['direct', 'indirect', 'total'].forEach(type => {
            if (window[`_lastTreemapData_${type}`] && 
                window[`_lastTreemapData_${type}`].metadata && 
                window[`_lastTreemapData_${type}`].metadata[node.id]) {
              effectType = type;
            }
          });
          //console.log(`Determined node effect type: ${effectType}`);
        }
        
        // Use the appropriate data source based on effect type
        treemapData = window[`_lastTreemapData_${effectType}`] || window._lastTreemapData;
        
        // Check for metadata children with the next layer
        if (treemapData && treemapData.metadata) {
          const nextLayer = originalLayer + 1;
          //console.log(`Looking for children in layer ${nextLayer} using ${effectType} data`);
          
          // Look for child nodes in the metadata
          const childNodes = Object.entries(treemapData.metadata)
            .filter(([id, meta]) => meta.parent === node.id)
            .map(([id, meta]) => ({ id, ...meta }));
            
          // Store the effect type on any child nodes we find
          childNodes.forEach(child => {
            child._effectType = effectType;
          });
          /*
          console.log(`Found ${childNodes.length} children with parent=${node.id} in metadata:`, 
            childNodes.map(child => `${child.id} (${child.name})`));
          */
          // If node has dynamic children added by the click handler, use those
          if (node._hasMetadataChildren && node.children && node.children.length > 0) {
            //console.log(`Using ${node.children.length} dynamically added children for drill-down`);
          }
          // If we found children but the node doesn't have them, add a warning
          else if (childNodes.length > 0 && (!node.children || node.children.length === 0)) {
            //console.warn(`Node ${node.id} has ${childNodes.length} children in metadata but TreemapNode has none!`);
          }
        }
      }
    }
    
    // Call handler if registered
    if (this.onDrillDown) {
      this.onDrillDown(node, this.currentLevel, { ...context });
    }
    
    return true;
  }
  
  /**
   * Drill up to the previous level
   */
  drillUp() {
    if (this.navigationStack.length === 0) {
      return false; // Can't drill up further
    }
    
    // Pop the last state from the stack
    const previousState = this.navigationStack.pop();
    
    // Update current state
    this.currentLevel = previousState.level;
    this.currentId = previousState.id;
    
    // Call handler if registered
    if (this.onDrillUp) {
      this.onDrillUp(this.currentLevel, this.currentId, previousState.context);
    }
    
    return true;
  }
  
  /**
   * Reset navigation to root level
   */
  resetToRoot() {
    // Clear navigation stack
    this.navigationStack = [];
    this.currentLevel = 0;
    this.currentId = null;
    
    // Call drill-up handler if registered
    if (this.onDrillUp) {
      this.onDrillUp(0, null, {});
    }
  }
  
  /**
   * Get the current navigation path
   * @returns {Array<Object>} Navigation path objects
   */
  getNavigationPath() {
    // Return all items in the navigation stack plus the current state
    return [
      ...this.navigationStack,
      { level: this.currentLevel, id: this.currentId }
    ];
  }
  
  /**
   * Get the path of nodes leading to the current position
   * @returns {Array<Object>} Path of nodes with id, name, and level
   */
  getPath() {
    // This method requires nodes to be stored in the navigation stack
    // We'll use what we have and reconstruct the path from navigation stack
    // Start with root
    const path = [{ id: 'root', name: 'Root', level: 0 }];
    
    // Add each level from the navigation stack that includes nodes
    this.navigationStack.forEach((item, index) => {
      if (item.node) {
        path.push({
          id: item.node.id,
          name: item.node.name || item.id,
          level: item.level
        });
      } else if (item.id) {
        // If we don't have the node object, create a basic entry with what we know
        path.push({
          id: item.id,
          name: item.name || item.id,
          level: item.level
        });
      }
    });
    
    return path;
  }
  
  /**
   * Get level name for the current level
   * @returns {string} Level name
   */
  getCurrentLevelName() {
    if (this.currentLevel < this.options.drillDownLevels.length) {
      return this.options.drillDownLevels[this.currentLevel];
    }
    return `level_${this.currentLevel}`;
  }
  
  /**
   * Check if we can drill up from current position
   * @returns {boolean} True if we can drill up
   */
  canDrillUp() {
    return this.navigationStack.length > 0;
  }
  
  /**
   * Check if drilling down is enabled for a specific level
   * @param {number} level - The level to check (current level, not the target level)
   * @returns {boolean} True if drill-down is enabled for this level
   */
  isDrillDownEnabled(level) {
    // Check if maxDrillLevel is set and we're already at or beyond it
    if (this.options.maxDrillLevel !== null && level >= this.options.maxDrillLevel) {
      return false;
    }
    
    // Check if the current level is in the disabled levels list
    if (Array.isArray(this.options.disabledLevels) && this.options.disabledLevels.includes(level)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get the current navigation state
   * @returns {Object} Current state with level, id, and context
   */
  getCurrentState() {
    return {
      level: this.currentLevel,
      id: this.currentId,
      levelName: this.getCurrentLevelName(),
      canDrillUp: this.canDrillUp(),
      canDrillDown: this.isDrillDownEnabled(this.currentLevel),
      maxDrillLevel: this.options.maxDrillLevel,
      disabledLevels: this.options.disabledLevels
    };
  }
  
  /**
   * Create a breadcrumb navigation element
   * @param {HTMLElement} container - Container to append breadcrumb to
   * @param {Function} clickHandler - Function to call when a breadcrumb item is clicked
   * @param {MetadataProvider} metadataProvider - Provider for entity names
   */
  createBreadcrumb(container, clickHandler, metadataProvider) {
    // Clear existing breadcrumb
    if (container) {
      container.innerHTML = '';
    } else {
      return;
    }
    
    // Create breadcrumb element
    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'treemap-breadcrumb';
    
    // Add root link
    const rootLink = document.createElement('a');
    rootLink.href = '#';
    rootLink.textContent = 'Root';
    rootLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (clickHandler) {
        clickHandler('root', -1);
      }
    });
    
    breadcrumb.appendChild(rootLink);
    
    // Add path items
    this.getNavigationPath().forEach((item, index) => {
      if (index === 0) return; // Skip root
      
      // Add separator
      breadcrumb.appendChild(document.createTextNode(' > '));
      
      // Get node name
      const nodeName = metadataProvider ? metadataProvider.getName(item.id) : item.id;
      
      // Add link if not the current level
      if (index < this.getNavigationPath().length - 1) {
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = nodeName;
        link.addEventListener('click', (e) => {
          e.preventDefault();
          if (clickHandler) {
            clickHandler(item.id, index);
          }
        });
        
        breadcrumb.appendChild(link);
      } else {
        // Current level - just text
        breadcrumb.appendChild(document.createTextNode(nodeName));
      }
    });
    
    // Add to container
    container.appendChild(breadcrumb);
  }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DrillDownManager;
} else {
  // Browser environment
  window.CompressedTreemap = window.CompressedTreemap || {};
  window.CompressedTreemap.DrillDownManager = DrillDownManager;
}