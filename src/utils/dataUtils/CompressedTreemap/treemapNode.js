/**
 * TreemapNode.js
 * 
 * Represents a node in the treemap hierarchy.
 * Works with MetadataProvider to access entity information.
 */

// Make sure the CompressedTreemap namespace exists
window.CompressedTreemap = window.CompressedTreemap || {};

/**
 * Represents a node in the treemap hierarchy
 */
window.CompressedTreemap.TreemapNode = class TreemapNode {
  /**
   * Create a new treemap node
   * @param {string} id - Unique identifier for the node
   * @param {number} value - Numerical value for sizing
   * @param {MetadataProvider} metadataProvider - Provider for entity metadata
   * @param {string} nameOverride - Optional name override
   */
  constructor(id, value, metadataProvider, nameOverride = null) {
    this.id = id;
    this.value = parseFloat(value) || 0;
    this._metadataProvider = metadataProvider;
    this._nameOverride = nameOverride;
    this.children = [];
    this.parent = null;
    this.level = 0;
    this.rect = { x: 0, y: 0, width: 0, height: 0 };
    this.weight = this.value;
    this.originalValue = this.value;
  }
  
  /**
   * Get the node's name from metadata or override
   */
  get name() {
    // Define simplified titles for section names
    // This mapping helps display shorter, more readable names for section titles
    const simplifiedTitles = {
      'Live Animals and Animal Products': 'Live Animals & Products',
      'Vegetable Products': 'Vegetable Products',
      'Animal or Vegetable Fats and Oils and Their Cleavage Products; Prepared Edible Fats; Animal or Vegetable Waxes': 'Fats & Oils',
      'Prepared Foodstuffs; Beverages, Spirits and Vinegar; Tobacco and Manufactured Tobacco Substitutes': 'Food, Bev. & Tobacco',
      'Mineral Products': 'Minerals',
      'Products of the Chemical or Allied Industries': 'Chemicals',
      'Plastics and Articles Thereof; Rubber and Articles Thereof': 'Plastics & Rubber',
      'Raw Hides and Skins, Leather, Furskins and Articles Thereof; Saddlery and Harness; Travel Goods, Handbags and Similar Containers; Articles of Animal Gut (Other Than Silkworm Gut)': 'Leather & Fur',
      'Wood and Articles of Wood; Wood Charcoal; Cork and Articles of Cork; Manufactures of Straw, of Esparto or of Other Plaiting Materials; Basketware and Wickerwork': 'Wood Products',
      'Pulp of Wood or of Other Fibrous Cellulosic Material; Recovered (Waste and Scrap) Paper or Paperboard; Paper and Paperboard and Articles Thereof': 'Paper & Pulp',
      'Textiles and Textile Articles': 'Textiles',
      'Footwear, Headgear, Umbrellas, Walking-Sticks, Whips, Riding-Crops and Parts Thereof; Prepared Feathers and Articles Made Therewith; Artificial Flowers; Articles of Human Hair': 'Footwear & Acc.',
      'Articles of Stone, Plaster, Cement, Asbestos, Mica or Similar Materials; Ceramic Products; Glass and Glassware': 'Stone & Ceramics',
      'Natural or Cultured Pearls, Precious or Semi-Precious Stones, Precious Metals, Metals Clad with Precious Metal and Articles Thereof; Imitation Jewelry; Coin': 'Jewelry & Gems',
      'Base Metals and Articles of Base Metal': 'Metals',
      'Machinery and Mechanical Appliances; Electrical Equipment; Parts Thereof': 'Machinery',
      'Vehicles, Aircraft, Vessels and Associated Transport Equipment': 'Transportation',
      'Optical, Photographic, Cinematographic, Measuring, Checking, Precision, Medical or Surgical Instruments and Apparatus; Clocks and Watches; Musical Instruments; Parts and Accessories Thereof': 'Precision Instruments',
      'Arms and Ammunition; Parts and Accessories Thereof': 'Arms & Ammun.',
      'Miscellaneous Manufactured Articles': 'Misc. Manufactured',
      "Works of Art, Collectors' Pieces and Antiques": 'Art & Antiques'
    };

    // First check for explicit name override
    if (this._nameOverride && this._nameOverride !== 'null' && this._nameOverride !== null) {
      // Check if we have a simplified title for this name
      return simplifiedTitles[this._nameOverride] || this._nameOverride;
    }
    
    // Then check for section/chapter mapping
    const sectionMapping = window.sectionToChaptersMapping;
    if (sectionMapping) {
      // Check if this is a section node (ID starts with 'S')
      if (this.id && this.id.toString().startsWith('S')) {
        const sectionId = this.id.toString().substring(1); // Remove the 'S'
        // Try string key first, then numeric key
        let fullTitle = null;
        
        if (sectionMapping[sectionId] && sectionMapping[sectionId].title) {
          fullTitle = sectionMapping[sectionId].title;
        } else if (sectionMapping[parseInt(sectionId, 10)] && sectionMapping[parseInt(sectionId, 10)].title) {
          fullTitle = sectionMapping[parseInt(sectionId, 10)].title;
        }
        
        if (fullTitle) {
          // Use simplified title if available, otherwise use full title
          const simplifiedTitle = simplifiedTitles[fullTitle] || fullTitle;
          //console.log(`Section name for ${this.id}: ${simplifiedTitle} (from: ${fullTitle})`);
          return simplifiedTitle;
        }
      }
      
      // Check if this is a chapter with a parent section node
      if (this.parent && this.parent.id && this.parent.id.toString().startsWith('S')) {
        const parentSectionId = this.parent.id.toString().substring(1); // Remove the 'S'
        const sectionData = sectionMapping[parentSectionId] || sectionMapping[parseInt(parentSectionId, 10)];
        
        if (sectionData && sectionData.chapters) {
          // Try different formats for the chapter ID
          const chapterData = sectionData.chapters[this.id] || sectionData.chapters[parseInt(this.id, 10)];
          if (chapterData) {
            //console.log(`Chapter name found for ${this.id} in section ${parentSectionId}: ${chapterData.short}`);
            return chapterData.short;
          }
        }
      }
      
      // For other chapter nodes, search through all sections
      for (const sectionId in sectionMapping) {
        if (sectionMapping[sectionId].chapters) {
          // Try direct string match
          if (sectionMapping[sectionId].chapters[this.id]) {
            const chapterName = sectionMapping[sectionId].chapters[this.id].short;
            //console.log(`Chapter name found for ${this.id} in section ${sectionId}: ${chapterName}`);
            return chapterName;
          }
          
          // Try numeric match
          const numericId = parseInt(this.id, 10);
          if (!isNaN(numericId) && sectionMapping[sectionId].chapters[numericId]) {
            const chapterName = sectionMapping[sectionId].chapters[numericId].short;
            //console.log(`Chapter name (numeric) found for ${this.id} in section ${sectionId}: ${chapterName}`);
            return chapterName;
          }
        }
      }
    }
    
    // Get name from metadata provider
    const metadataName = this._metadataProvider.getName(this.id);
    
    // Check if the metadata name has a simplified version
    if (metadataName && metadataName !== this.id) {
      return simplifiedTitles[metadataName] || metadataName;
    }
    
    // Fall back to ID
    return this.id;
  }
  
  /**
   * Get the node's color from metadata
   */
  get color() {
    return this._metadataProvider.getColor(this.id);
  }
  
  /**
   * Get the node's description from metadata
   */
  get description() {
    return this._metadataProvider.getDescription(this.id);
  }
  
  /**
   * Get the node's parent ID from metadata
   */
  get parentId() {
    return this._metadataProvider.getParentId(this.id);
  }
  
  /**
   * Add a child node
   * @param {TreemapNode} child - Child node to add
   * @returns {TreemapNode} The added child node
   */
  addChild(child) {
    child.parent = this;
    child.level = this.level + 1;
    
    // Special handling for tariff effect nodes
    if (this.id && typeof this.id === 'string' && this.id.match(/^L\d+_/) &&
        child.id && typeof child.id === 'string' && child.id.match(/^L\d+_/)) {
      
      // Extract original layers from IDs
      const parentLayer = this.id.match(/^L(\d+)_/) ? parseInt(this.id.match(/^L(\d+)_/)[1]) : null;
      const childLayer = child.id.match(/^L(\d+)_/) ? parseInt(child.id.match(/^L(\d+)_/)[1]) : null;
      
      // Debug log for tariff effect parent-child relationships
      if (parentLayer !== null && childLayer !== null) {
        //console.log(`Tariff node relationship: ${this.id} (layer ${parentLayer}) → ${child.id} (layer ${childLayer})`);
      }
    }
    
    this.children.push(child);
    return child;
  }
  
  /**
   * Calculate the total value of this node and all descendants
   * @returns {number} Total value
   */
  calculateTotalValue() {
    if (this.children.length === 0) {
      return this.value;
    }
    
    const childrenSum = this.children.reduce((sum, child) => sum + child.calculateTotalValue(), 0);
    return childrenSum;
  }
  
  /**
   * Sort children by value (descending)
   */
  sortChildren() {
    this.children.sort((a, b) => b.value - a.value);
    this.children.forEach(child => child.sortChildren());
  }
  
  /**
   * Get a property from metadata
   * @param {string} property - Property name
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Property value or default
   */
  getProperty(property, defaultValue = null) {
    return this._metadataProvider.getProperty(this.id, property, defaultValue);
  }
  
  /**
   * Get all metadata for this node
   * @returns {Object} All metadata
   */
  getAllMetadata() {
    return this._metadataProvider.getAllMetadata(this.id);
  }
  
  /**
   * Convert to the legacy format for compatibility
   * @returns {Object} Node in legacy format
   */
  toLegacyFormat() {
    const result = {
      id: this.id,
      name: this.name,
      value: this.value,
      ...this.getAllMetadata()
    };
    
    if (this.children.length > 0) {
      result.children = this.children.map(child => child.toLegacyFormat());
    }
    
    return result;
  }
  
  /**
   * Find a child node by ID (direct children only)
   * @param {string} id - ID to find
   * @returns {TreemapNode|null} Found node or null
   */
  findChildById(id) {
    return this.children.find(child => child.id === id) || null;
  }
  
  /**
   * Find a node by ID in this node or its descendants
   * @param {string} id - ID to find
   * @returns {TreemapNode|null} Found node or null
   */
  findNodeById(id) {
    if (this.id === id) return this;
    
    for (const child of this.children) {
      const found = child.findNodeById(id);
      if (found) return found;
    }
    
    return null;
  }
};