/**
 * CompressedDataAdapter.js
 * 
 * Adapter for converting compressed array-based data to TreemapNode objects.
 * Supports both multi-year trade data and standard compressed format.
 */

// Import required classes if in Node.js environment


/**
 * Adapter for converting compressed array-based data
 */
class CompressedDataAdapter {
  /**
   * Create a new compressed data adapter
   * @param {MetadataProvider} metadataProvider - Metadata provider for entity information
   */
  constructor(metadataProvider) {
    this.metadataProvider = metadataProvider;
  }
  
  /**
   * Convert compressed array data to treemap nodes
   * @param {Array} arrayData - Array data in format [id, nameOverride, value, children]
   * @param {Object} options - Optional parameters
   * @param {number} options.maxDepth - Maximum depth to process (default: Infinity)
   * @param {number} options.currentDepth - Current depth in the hierarchy (used internally)
   * @returns {TreemapNode} Root node of the converted hierarchy
   */
  convertArrayToTreemapNodes(arrayData, options = {}) {
    if (!arrayData || !Array.isArray(arrayData) || arrayData.length < 3) {
      console.error('Invalid array data format', arrayData);
      return null;
    }
    
    // Extract options
    const maxDepth = options.maxDepth !== undefined ? options.maxDepth : Infinity;
    const currentDepth = options.currentDepth || 0;
    
    // Extract components
    const [id, nameOverride, value, children] = arrayData;
    
    // Ensure value is a valid number
    const numericValue = typeof value === 'number' && isFinite(value) ? value : 0;
    
    // Debug log to track node creation (only for important nodes)
    if (id && id !== 'root' && numericValue === 0 && currentDepth <= 1) {
      //console.log(`Node ${id} has zero value. Original value:`, value);
    }
    
    // Create root node with validated value
    const rootNode = new window.CompressedTreemap.TreemapNode(id, numericValue, this.metadataProvider, nameOverride);
    
    // Check if this is a tariff effects node (IDs like L0_X, L1_X, etc.)
    if (id && typeof id === 'string' && id.match(/^L\d+_/)) {
      // Extract the original layer from the ID
      const originalLayer = parseInt(id.match(/^L(\d+)_/)[1]);
      // Store the original layer as a property on the node for reference
      rootNode._originalLayer = originalLayer;
      
      // Debug log for tariff effect nodes
      if (currentDepth <= 2) {
       //console.log(`Creating tariff node ${id} with level ${currentDepth} and original layer ${originalLayer}`);
      }
    }
    
    // Only process children if we haven't reached maxDepth
    if (currentDepth < maxDepth && children && Array.isArray(children) && children.length > 0) {
      // Process children and keep track of total child weight
      let totalChildWeight = 0;
      const childNodes = [];
      
      // If at the level just before maxDepth, we can simplify processing
      if (currentDepth === maxDepth - 1) {
        // At the last level we're processing, just calculate total child count and weights
        // without creating full TreemapNode objects for each child
        rootNode._childCount = children.length;
        
        // For each child, extract key info without recursing further
        children.forEach(childData => {
          if (childData && Array.isArray(childData) && childData.length >= 3) {
            const [childId, childNameOverride, childValue] = childData;
            const childNumericValue = typeof childValue === 'number' && isFinite(childValue) ? childValue : 0;
            
            if (childNumericValue > 0) {
              // Create a simplified node (no grandchildren)
              const childNode = new window.CompressedTreemap.TreemapNode(childId, childNumericValue, this.metadataProvider, childNameOverride);
              childNodes.push(childNode);
              totalChildWeight += childNumericValue;
              
              // Store child count info but don't create actual grandchildren
              if (childData[3] && Array.isArray(childData[3])) {
                childNode._childCount = childData[3].length;
              }
            }
          }
        });
      } else {
        // Normal recursive processing for deeper levels
        children.forEach(childData => {
          const childNode = this.convertArrayToTreemapNodes(childData, {
            maxDepth: maxDepth,
            currentDepth: currentDepth + 1
          });
          
          if (childNode) {
            // Only add children with positive weight
            if (childNode.weight > 0) {
              childNodes.push(childNode);
              totalChildWeight += childNode.weight;
            } else if (currentDepth <= 1) {
              // Only log for top-level nodes to reduce console spam
              //console.log(`Skipping zero-weight child node: ${childNode.id}`);
            }
          }
        });
      }
      
      // If parent has zero value but children have values, use sum of children
      if (numericValue === 0 && totalChildWeight > 0) {
        rootNode.value = totalChildWeight;
        rootNode.weight = totalChildWeight;
        if (currentDepth <= 1) {
          //console.log(`Updated zero-value parent ${id} with total child weight: ${totalChildWeight}`);
        }
      }
      
      // Add all valid children
      childNodes.forEach(childNode => {
        rootNode.addChild(childNode);
      });
    } else if (currentDepth >= maxDepth && children && Array.isArray(children)) {
      // Store child count for reference but don't create actual children
      rootNode._childCount = children.length;
    }
    
    return rootNode;
  }
  
  /**
   * Convert multi-year data format to treemap data
   * @param {Object} multiYearData - Multi-year data with metadata and hierarchy
   * @param {Object} options - Conversion options (year, dataType, etc.)
   * @returns {Object} Converted data with metadata provider and root node
   */
  convertMultiYearData(multiYearData, options = {}) {
    if (!multiYearData) {
      console.error('No data provided for conversion');
      return null;
    }
    
    // Extract metadata
    const metadata = multiYearData.metadata || {};
    const metadataProvider = new window.CompressedTreemap.MetadataProvider(metadata);
    this.metadataProvider = metadataProvider;
    
    // Determine year and data type
    const dataType = options.dataType || 'imports';
    const years = multiYearData.years || Object.keys(multiYearData[dataType] || {});
    const year = options.year || (years.length > 0 ? years[years.length - 1] : null);
    
    if (!year) {
      console.error('No valid year found in data');
      return {
        metadataProvider,
        rootNode: new window.CompressedTreemap.TreemapNode('root', 0, metadataProvider, `${dataType} (No Data)`)
      };
    }
    
    // Get the hierarchy for the specified year and data type
    const hierarchy = multiYearData[dataType]?.[year];
    
    if (!hierarchy || !Array.isArray(hierarchy) || hierarchy.length === 0) {
      console.error(`No data found for ${dataType} in year ${year}`);
      console.warn({hierarchy, dataType, year, multiYearData});
      return {
        metadataProvider,
        rootNode: new window.CompressedTreemap.TreemapNode('root', 0, metadataProvider, `${dataType} (${year})`)
      };
    }
    
    // Convert the first node in the hierarchy (root node) with depth limitation
    // Use the maxDepth from options, default to Infinity to allow all levels
    const maxDepth = options.maxDepth !== undefined ? options.maxDepth : Infinity;
    //console.log(`Converting data with max depth: ${maxDepth} (unlimited if Infinity)`);
    const rootNode = this.convertArrayToTreemapNodes(hierarchy[0], { maxDepth });
    
    return {
      metadataProvider,
      rootNode,
      year,
      dataType,
      years,
      dataTypes: Object.keys(multiYearData).filter(key => 
        typeof multiYearData[key] === 'object' && 
        !Array.isArray(multiYearData[key]) && 
        key !== 'metadata' && 
        key !== 'years' &&
        key !== 'configTemplate'
      )
    };
  }
  
  /**
   * Convert standard hierarchical data to compressed format
   * @param {Object} data - Standard hierarchical data with name, children, value properties
   * @returns {Object} Data in compressed format with metadata and hierarchy
   */
  convertHierarchicalToCompressed(data) {
    // Create metadata dictionary
    const metadata = {};
    
    // Function to process a node and extract metadata
    const processNode = (node, parentId = null) => {
      if (!node) return null;
      
      const id = node.id || `node_${Object.keys(metadata).length}`;
      
      // Extract metadata
      metadata[id] = {
        name: node.name,
        ...(node.color && { color: node.color }),
        ...(node.description && { description: node.description }),
        ...(parentId && { parent: parentId })
      };
      
      // Additional properties that aren't part of the hierarchy structure
      Object.keys(node).forEach(key => {
        if (!['id', 'name', 'value', 'children'].includes(key)) {
          metadata[id][key] = node[key];
        }
      });
      
      // Process children and create compressed format
      const children = node.children ? 
        node.children.map(child => processNode(child, id)) : 
        [];
      
      return [id, null, node.value || 0, children];
    };
    
    // Process from root
    const hierarchy = [processNode(data)];
    
    return {
      metadata,
      hierarchy
    };
  }
  
  /**
   * Create a metadata provider from data
   * @param {Object} data - Data containing metadata
   * @returns {MetadataProvider} New metadata provider
   */
  createMetadataProvider(data) {
    const metadata = data.metadata || {};
    return new window.CompressedTreemap.MetadataProvider(metadata);
  }
  
  /**
   * Find node data in array format by ID
   * @param {Array} arrayData - Hierarchy data in array format
   * @param {string} id - ID to find
   * @returns {Array|null} Found node data or null
   * @private
   */
  _findNodeDataById(arrayData, id) {
    if (!arrayData || !Array.isArray(arrayData)) return null;
    
    // Check if this is the node we're looking for
    if (arrayData[0] === id) {
      return arrayData;
    }
    
    // Check children
    const children = arrayData[3];
    if (children && Array.isArray(children)) {
      for (const child of children) {
        const found = this._findNodeDataById(child, id);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * Extract entity data from multi-year data
   * @param {Object} multiYearData - Multi-year data
   * @param {string} entityId - ID of the entity to extract
   * @param {Object} options - Options (year, dataType)
   * @returns {Object} Data with metadata provider and root node for the entity
   */
  extractEntityData(multiYearData, entityId, options = {}) {
    if (!multiYearData || !entityId) {
      console.error('Missing required parameters for extractEntityData');
      return null;
    }
    
    // Extract options
    const dataType = options.dataType || 'imports';
    const years = multiYearData.years || Object.keys(multiYearData[dataType] || {});
    const year = options.year || (years.length > 0 ? years[years.length - 1] : null);
    
    if (!year) {
      console.error('No valid year found in data');
      return null;
    }
    
    // Get the hierarchy for the specified year and data type
    const hierarchy = multiYearData[dataType]?.[year];
    
    if (!hierarchy || !Array.isArray(hierarchy) || hierarchy.length === 0) {
      console.error(`No data found for ${dataType} in year ${year}`);
      return null;
    }
    
    // First find the entity node data in the hierarchy
    const entityData = this._findNodeDataById(hierarchy[0], entityId);
    
    if (!entityData) {
      console.error(`Entity with ID ${entityId} not found in hierarchy`);
      return null;
    }
    
    //console.log(`Found entity data: ${entityData[0]} (${entityData[1] || 'unnamed'})`);
    
    // Create a new hierarchy with just this entity as the root
    // Format is [id, nameOverride, value, children]
    const entityValue = entityData[2] || 0;
    const entityChildren = entityData[3] || [];
    const entityName = entityData[1] || this.metadataProvider.getName(entityId);
    
    // Create a completely new hierarchy with just this entity as the root
    const newHierarchy = [
      ["entity_root", `${entityName}`, entityValue, entityChildren]
    ];
    
    // Create a new data object in the standard hierarchy format (not multi-year)
    const entityDataObject = {
      metadata: multiYearData.metadata || {},
      hierarchy: newHierarchy
    };
    
    //console.log(`Created entity-specific data object for ${entityName}`);
    
    // Convert the entity node with increased depth
    const maxDepth = options.maxDepth || 10; // Increase default from 3 to 10
    
    // Create a new root node directly from the hierarchy
    const rootNode = this.convertArrayToTreemapNodes(newHierarchy[0], { 
      maxDepth: maxDepth 
    });
    
    // Create result object similar to convertMultiYearData
    const result = {
      metadataProvider: this.metadataProvider,
      rootNode: rootNode,
      year,
      dataType,
      entityId,
      entityName
    };
    
    return result;
  }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CompressedDataAdapter;
} else {
  // Browser environment
  window.CompressedTreemap = window.CompressedTreemap || {};
  window.CompressedTreemap.CompressedDataAdapter = CompressedDataAdapter;
}