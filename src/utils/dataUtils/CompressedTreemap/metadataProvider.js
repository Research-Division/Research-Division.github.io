/**
 * MetadataProvider.js
 * 
 * Centralized provider for entity metadata in compressed treemap visualizations.
 * Provides lookup functions with caching for efficient metadata access.
 */

// Make sure the CompressedTreemap namespace exists
window.CompressedTreemap = window.CompressedTreemap || {};

/**
 * Class for centralized entity information
 */
window.CompressedTreemap.MetadataProvider = class MetadataProvider {
  /**
   * Create a new metadata provider
   * @param {Object} metadata - Metadata dictionary
   * @param {Function} fallbackProvider - Optional function to call when metadata is not found
   */
  constructor(metadata = {}, fallbackProvider = null) {
    this.metadata = metadata;
    this.fallbackProvider = fallbackProvider;
    this._cache = {};
  }
  
  /**
   * Get entity name from metadata
   * @param {string} id - Entity identifier
   * @returns {string} Entity name or id if not found
   */
  getName(id) {
    if (this._cache[`name_${id}`]) return this._cache[`name_${id}`];
    
    const result = this.metadata[id]?.name || 
                 (this.fallbackProvider ? this.fallbackProvider(id, 'name') : null) || 
                 id;
    
    this._cache[`name_${id}`] = result;
    return result;
  }
  
  /**
   * Get entity color from metadata
   * @param {string} id - Entity identifier
   * @param {string} defaultColor - Default color if not specified
   * @returns {string} Color value
   */
  getColor(id, defaultColor = null) {
    if (this._cache[`color_${id}`]) return this._cache[`color_${id}`];
    
    const result = this.metadata[id]?.color || 
                 (this.fallbackProvider ? this.fallbackProvider(id, 'color') : null) || 
                 defaultColor;
    
    this._cache[`color_${id}`] = result;
    return result;
  }
  
  /**
   * Get entity description from metadata
   * @param {string} id - Entity identifier
   * @returns {string} Entity description or null if not found
   */
  getDescription(id) {
    if (this._cache[`desc_${id}`]) return this._cache[`desc_${id}`];
    
    const result = this.metadata[id]?.description || 
                 (this.fallbackProvider ? this.fallbackProvider(id, 'description') : null);
    
    this._cache[`desc_${id}`] = result;
    return result;
  }
  
  /**
   * Get parent entity ID from metadata
   * @param {string} id - Entity identifier
   * @returns {string} Parent ID or null if not found
   */
  getParentId(id) {
    if (this._cache[`parent_${id}`]) return this._cache[`parent_${id}`];
    
    const result = this.metadata[id]?.parent || 
                 this.metadata[id]?.parentId ||
                 (this.fallbackProvider ? this.fallbackProvider(id, 'parent') : null);
    
    this._cache[`parent_${id}`] = result;
    return result;
  }
  
  /**
   * Get any metadata property by name
   * @param {string} id - Entity identifier
   * @param {string} property - Property name
   * @param {*} defaultValue - Default value if property not found
   * @returns {*} Property value or defaultValue if not found
   */
  getProperty(id, property, defaultValue = null) {
    if (this._cache[`${property}_${id}`]) return this._cache[`${property}_${id}`];
    
    const result = this.metadata[id]?.[property] || 
                 (this.fallbackProvider ? this.fallbackProvider(id, property) : null) || 
                 defaultValue;
    
    this._cache[`${property}_${id}`] = result;
    return result;
  }
  
  /**
   * Add or update metadata for an entity
   * @param {string} id - Entity identifier
   * @param {Object} data - Metadata to add or update
   */
  addMetadata(id, data) {
    this.metadata[id] = {...(this.metadata[id] || {}), ...data};
    
    // Clear cache entries for this ID
    Object.keys(this._cache).forEach(key => {
      if (key.endsWith(`_${id}`)) {
        delete this._cache[key];
      }
    });
  }
  
  /**
   * Get all metadata for an entity
   * @param {string} id - Entity identifier
   * @returns {Object} All metadata for entity or empty object if not found
   */
  getAllMetadata(id) {
    return this.metadata[id] || {};
  }
  
  /**
   * Clear the internal cache
   */
  clearCache() {
    this._cache = {};
  }
  
  /**
   * Get entities by a property value
   * @param {string} property - Property name to match
   * @param {*} value - Value to match
   * @returns {Array} Array of entity IDs that match the criteria
   */
  getEntitiesByProperty(property, value) {
    return Object.entries(this.metadata)
      .filter(([id, data]) => data[property] === value)
      .map(([id]) => id);
  }
};