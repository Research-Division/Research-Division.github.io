/**
 * TreemapLayout.js
 * 
 * Handles the layout calculation for treemap visualizations.
 * Implements the squarified treemap algorithm for optimal aspect ratios.
 */

/**
 * Handles the layout calculation for the treemap
 */
class TreemapLayout {
  /**
   * Create a new treemap layout calculator
   * @param {Object} options - Layout options
   */
  constructor(options = {}) {
    this.options = {
      padding: options.padding || 1,
      aspectRatio: options.aspectRatio || 1,
      minNodeSize: options.minNodeSize || 5,
      ...options
    };
    this.animationStates = [];
    // Animation is now disabled by default - must be explicitly enabled
    this.captureAnimation = options.animate === true;
    
  }
  
  /**
   * Calculate the layout for the entire tree
   * @param {TreemapNode} rootNode - The root node of the tree
   * @param {Object} bounds - The available space {x, y, width, height}
   * @param {Object} options - Additional options
   * @param {number} options.maxDepth - Maximum depth to process
   * @returns {TreemapNode} The root node with updated layout
   */
  calculateLayout(rootNode, bounds, options = {}) {
    // Validate inputs
    if (!rootNode) {
      console.error('No root node provided for layout calculation');
      return null;
    }
    
    if (!bounds || typeof bounds !== 'object') {
      console.error('Invalid bounds provided for layout calculation');
      return null;
    }
    
    // Process depth limitation
    const maxDepth = options.maxDepth !== undefined ? options.maxDepth : 2; // Default to 2 levels (continents + countries)
    
    // Ensure bounds have valid numeric values and are large enough
    // Force a minimum size to prevent "no available space" errors
    const validBounds = {
      x: typeof bounds.x === 'number' && isFinite(bounds.x) ? bounds.x : 0,
      y: typeof bounds.y === 'number' && isFinite(bounds.y) ? bounds.y : 0,
      width: typeof bounds.width === 'number' && isFinite(bounds.width) ? Math.max(100, bounds.width) : 800,
      height: typeof bounds.height === 'number' && isFinite(bounds.height) ? Math.max(100, bounds.height) : 600
    };
    
    // Reset animation states if capturing
    if (this.captureAnimation) {
      this.animationStates = [];
    }
    
    try {
      // Sort nodes by value
      rootNode.sortChildren();
      
      // For performance reasons, if we're only showing the top level,
      // limit the calculation to just the direct children of the root
      if (maxDepth === 1) {
        
        // Remove all grandchildren to avoid deep calculations
        rootNode.children.forEach(child => {
          // Store the number of children for reference (for UI purposes)
          child._childCount = child.children.length;
          // Clear the children to avoid processing them
          child.children = [];
        });
      } else if (maxDepth > 1 && maxDepth < 99) {
        // Prune the tree to the specified depth
        this._pruneTreeToDepth(rootNode, maxDepth);
      }
      
      // Calculate total value for the root (may need to recalculate after pruning)
      let totalValue = 0;
      rootNode.children.forEach(child => {
        if (typeof child.weight === 'number' && isFinite(child.weight) && child.weight > 0) {
          totalValue += child.weight;
        }
      });
      
      // Ensure the total value is valid
      if (totalValue <= 0) {
        console.warn(`Invalid total value: ${totalValue}, setting to 1`);
        rootNode.weight = 1;
      } else {
        rootNode.weight = totalValue;
      }
      
      // Set root node bounds
      rootNode.rect = { ...validBounds };
      
      // Filter out any children with zero or negative weights
      const filterInvalidWeights = (node, currentDepth = 0) => {
        if (Array.isArray(node.children) && node.children.length > 0) {
          // Filter out invalid children
          const validChildren = node.children.filter(child => {
            const isValid = child && typeof child.weight === 'number' && isFinite(child.weight) && child.weight > 0;
            if (!isValid && currentDepth <= 1) { // Only log for top levels
              console.warn(`Filtered out child with invalid weight: ${child ? child.id : 'unknown'}, weight: ${child ? child.weight : 'unknown'}`);
            }
            return isValid;
          });
          
          // Update children array
          node.children = validChildren;
          
          // Recursively filter children's children, but only up to maxDepth
          if (currentDepth < maxDepth) {
            node.children.forEach(child => filterInvalidWeights(child, currentDepth + 1));
          }
        }
      };
      
      // Run weight filtering
      filterInvalidWeights(rootNode);
      
      // Check if after filtering we still have children
      if (rootNode.children.length === 0) {
        console.warn('No valid children with positive weights found after filtering');
      }
      
      // Process each level of the tree (respecting maxDepth)
      this._processNode(rootNode, 0, maxDepth);
      
      // Validate all nodes have proper dimensions, but only up to maxDepth
      const validateNodeDimensions = (node, currentDepth = 0) => {
        // Ensure node rect has valid values
        if (node.rect) {
          const validRect = {
            x: typeof node.rect.x === 'number' && isFinite(node.rect.x) ? node.rect.x : 0,
            y: typeof node.rect.y === 'number' && isFinite(node.rect.y) ? node.rect.y : 0,
            width: typeof node.rect.width === 'number' && isFinite(node.rect.width) ? Math.max(1, node.rect.width) : 1,
            height: typeof node.rect.height === 'number' && isFinite(node.rect.height) ? Math.max(1, node.rect.height) : 1
          };
          
          // Check if we had to fix the rect
          if (node.rect.x !== validRect.x || node.rect.y !== validRect.y || 
              node.rect.width !== validRect.width || node.rect.height !== validRect.height) {
            //console.warn(`Fixed invalid rect for node ${node.id}:`, node.rect, '→', validRect);
            node.rect = validRect;
          }
        }
        
        // Validate children recursively, but only up to maxDepth
        if (Array.isArray(node.children) && currentDepth < maxDepth) {
          node.children.forEach(child => validateNodeDimensions(child, currentDepth + 1));
        }
      };
      
      // Run validation
      validateNodeDimensions(rootNode);
      
      // Apply minimum size constraints
      this._applySizeConstraints(rootNode, maxDepth);
      
      return rootNode;
    } catch (error) {
      console.error('Error calculating treemap layout:', error);
      return rootNode; // Return the node anyway with default rect
    }
  }
  
  /**
   * Prune the tree to a maximum depth
   * @param {TreemapNode} node - The node to prune
   * @param {number} maxDepth - Maximum depth to keep
   * @param {number} currentDepth - Current depth in the tree
   * @private
   */
  _pruneTreeToDepth(node, maxDepth, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      // Save child count for reference and clear children
      node._childCount = node.children.length;
      node.children = [];
      return;
    }
    
    // Process children
    if (Array.isArray(node.children)) {
      node.children.forEach(child => {
        this._pruneTreeToDepth(child, maxDepth, currentDepth + 1);
      });
    }
  }
  
  /**
   * Process a single node and its children
   * @param {TreemapNode} node - The node to process
   * @param {number} currentDepth - Current depth in the tree
   * @param {number} maxDepth - Maximum depth to process
   * @private
   */
  _processNode(node, currentDepth = 0, maxDepth = 99) {
    // Validate node
    if (!node || !node.rect) {
      console.warn('Invalid node or missing rect in _processNode');
      return;
    }
    
    // Skip processing beyond maxDepth
    if (currentDepth > maxDepth) {
      return;
    }
    
    try {
      // Create local variables with validation
      const x = typeof node.rect.x === 'number' && isFinite(node.rect.x) ? node.rect.x : 0;
      const y = typeof node.rect.y === 'number' && isFinite(node.rect.y) ? node.rect.y : 0;
      const width = typeof node.rect.width === 'number' && isFinite(node.rect.width) ? node.rect.width : 0;
      const height = typeof node.rect.height === 'number' && isFinite(node.rect.height) ? node.rect.height : 0;
      
      // Skip if node has very small area
      if (width < 1 || height < 1) {
        if (currentDepth <= 1) { // Only log for top levels
        }
        // Instead of skipping completely, assign a minimal size
        node.rect = {
          x: x,
          y: y,
          width: Math.max(1, width),
          height: Math.max(1, height)
        };
        return;
      }
      
      // Ensure node.children is an array
      if (!Array.isArray(node.children)) {
        if (currentDepth <= 1) { // Only log for top levels
        }
        node.children = [];
        return;
      }
      
      // If node has children and we're not at maxDepth, process them
      if (node.children.length > 0 && currentDepth < maxDepth) {
        // Filter out invalid children
        const validChildren = node.children.filter(child => {
          const isValid = child && typeof child.weight === 'number' && isFinite(child.weight) && child.weight > 0;
          if (!isValid && currentDepth <= 1) { // Only log for top levels
          }
          return isValid;
        });
        
        // Skip if no valid children
        if (validChildren.length === 0) {
          if (currentDepth <= 1) { // Only log for top levels
          }
          return;
        }
        
        // Ensure we normalize weights to avoid very small values
        let totalWeight = 0;
        validChildren.forEach(child => {
          totalWeight += child.weight;
        });
        
        // If total weight is very small, normalize weights to avoid precision issues
        if (totalWeight > 0 && totalWeight < 0.1) {
          const scaleFactor = 1 / totalWeight;
          validChildren.forEach(child => {
            child.weight = child.weight * scaleFactor;
          });
          if (currentDepth <= 1) { // Only log for top levels
          }
        }
        
        // Ensure padding is a valid number
        // Use minimal padding for small containers to prevent "no space" errors
        const maxPadding = Math.min(width / 10, height / 10, 5);
        const padding = typeof this.options.padding === 'number' && isFinite(this.options.padding) 
          ? Math.min(Math.max(0, this.options.padding), maxPadding)
          : Math.min(1, maxPadding);
        
        // Calculate available space with padding - ensure it's never zero
        const innerSpace = {
          x: x + padding,
          y: y + padding,
          width: Math.max(1, width - 2 * padding),
          height: Math.max(1, height - 2 * padding)
        };
        
        // Log space information for debugging only for top levels
        if ((innerSpace.width < 10 || innerSpace.height < 10) && currentDepth <= 1) {
        }
        
        // Squarify the children
        this._squarify(validChildren, innerSpace);
        
        // Recursively process each child, but only if we're not at maxDepth
        if (currentDepth < maxDepth - 1) {
          validChildren.forEach(child => {
            try {
              this._processNode(child, currentDepth + 1, maxDepth);
            } catch (error) {
              if (currentDepth <= 1) { // Only log for top levels
              }
            }
          });
        }
      }
    } catch (error) {
      if (currentDepth <= 1) { // Only log for top levels
      }
    }
  }
  
  /**
   * Scale weights to fit container size
   * @param {Array<TreemapNode>} nodes - Nodes to scale weights for
   * @param {number} width - Container width
   * @param {number} height - Container height
   * @private
   */
  _scaleWeights(nodes, width, height) {
    let totalWeight = 0;
    for (let i = 0; i < nodes.length; i++) {
      totalWeight += nodes[i].weight;
    }
    
    // Prevent division by zero and negative scale factors
    if (totalWeight <= 0 || width <= 0 || height <= 0) {
      return; // Skip scaling rather than applying invalid values
    }
    
    const scale = width * height / totalWeight;
    
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].weight *= scale;
    }
  }

  /**
   * Squarify algorithm implementation based on the original sparksTreemapFinal
   * @param {Array<TreemapNode>} nodes - Array of nodes to layout
   * @param {Object} bounds - Available space {x, y, width, height}
   * @private
   */
  _squarify(nodes, bounds) {
    // Validate input
    if (!nodes || !Array.isArray(nodes)) {
      console.error('Invalid nodes provided to squarify algorithm');
      return;
    }
    
    if (!bounds || typeof bounds !== 'object') {
      console.error('Invalid bounds provided to squarify algorithm');
      return;
    }
    
    // Create local variables that can be modified
    let { x, y, width, height } = bounds;
    
    // Ensure bounds values are valid numbers
    x = x || 0;
    y = y || 0;
    width = Math.max(0, width || 0);
    height = Math.max(0, height || 0);
    
    // If there are no nodes or no space, return
    if (nodes.length === 0 || width <= 0 || height <= 0) {
      if (width > 0.1 || height > 0.1) {
      }
      return;
    }
    
    // Filter out nodes with invalid weights
    const validNodes = nodes.filter(node => {
      const isValid = node && typeof node.weight === 'number' && isFinite(node.weight) && node.weight > 0;
      if (!isValid) {
      }
      return isValid;
    });
    
    if (validNodes.length === 0) {
      return;
    }
    
    // Make a copy and sort by weight (largest first)
    const children = [...validNodes].sort((a, b) => b.weight - a.weight);
    
    // Scale the weights to match the container size
    this._scaleWeights(children, width, height);
    
    // Initialize layout variables
    let row = [];
    let vertical = height < width;
    let layoutWidth = vertical ? height : width;
    let posX = x;
    let posY = y;
    let remainingWidth = width;
    let remainingHeight = height;
    
    // Process nodes one by one
    while (children.length > 0) {
      const currentNode = children[0];
      const currentWeight = currentNode.weight;
      
      // Calculate aspect ratios with and without adding this node
      const rowSum = row.reduce((sum, node) => sum + node.weight, 0);
      const rowMin = row.length > 0 ? Math.min(...row.map(node => node.weight)) : Infinity;
      const rowMax = row.length > 0 ? Math.max(...row.map(node => node.weight)) : 0;
      
      const aspectWithout = row.length > 0 ? 
        this._calculateWorstRatio(rowSum, rowMin, rowMax, layoutWidth) : Infinity;
        
      const aspectWith = this._calculateWorstRatio(
        rowSum + currentWeight, 
        Math.min(rowMin, currentWeight), 
        Math.max(rowMax, currentWeight), 
        layoutWidth
      );
      
      if (row.length === 0 || aspectWith <= aspectWithout) {
        // Add to current row
        row.push(currentNode);
        children.shift(); // Remove from children
      } else {
        // Layout current row
        const rowArea = rowSum;
        let currX = posX;
        let currY = posY;
        const dimension = rowArea / layoutWidth;
        
        // Layout each node in the row
        for (let i = 0; i < row.length; i++) {
          const nodeWeight = row[i].weight;
          const nodeDimension = nodeWeight / dimension;
          
          // Create rectangle based on layout direction
          if (vertical) {
            row[i].rect = {
              x: currX,
              y: currY,
              width: dimension,
              height: nodeDimension
            };
            currY += nodeDimension;
          } else {
            row[i].rect = {
              x: currX,
              y: currY,
              width: nodeDimension,
              height: dimension
            };
            currX += nodeDimension;
          }
        }
        
        // Update container position and remaining space
        if (vertical) {
          posX += dimension;
          remainingWidth -= dimension;
        } else {
          posY += dimension;
          remainingHeight -= dimension;
        }
        
        // Update layout direction based on new container shape
        vertical = remainingHeight < remainingWidth;
        layoutWidth = vertical ? remainingHeight : remainingWidth;
        
        // Capture animation state if enabled
        if (this.captureAnimation) {
          this.animationStates.push(this._captureState(validNodes));
        }
        
        // Clear row for next iteration
        row = [];
      }
    }
    
    // Process any remaining nodes in the last row
    if (row.length > 0) {
      const rowSum = row.reduce((sum, node) => sum + node.weight, 0);
      let currX = posX;
      let currY = posY;
      const dimension = rowSum / layoutWidth;
      
      // Layout each node in the row
      for (let i = 0; i < row.length; i++) {
        const nodeWeight = row[i].weight;
        const nodeDimension = nodeWeight / dimension;
        
        // Create rectangle based on layout direction
        if (vertical) {
          row[i].rect = {
            x: currX,
            y: currY,
            width: dimension,
            height: nodeDimension
          };
          currY += nodeDimension;
        } else {
          row[i].rect = {
            x: currX,
            y: currY,
            width: nodeDimension,
            height: dimension
          };
          currX += nodeDimension;
        }
      }
      
      // Capture final animation state if enabled
      if (this.captureAnimation) {
        this.animationStates.push(this._captureState(validNodes));
      }
    }
  }
  
  /**
   * Calculate worst aspect ratio for a row of nodes based on the original sparksTreemapFinal algorithm
   * 
   * @param {number} sum - Sum of weights for the row
   * @param {number} min - Minimum weight in the row
   * @param {number} max - Maximum weight in the row
   * @param {number} width - Width of the side along which nodes are laid out
   * @returns {number} Worst aspect ratio
   * @private
   */
  _calculateWorstRatio(sum, min, max, width) {
    // Validate input
    if (!isFinite(sum) || sum <= 0 || !isFinite(min) || min <= 0 || !isFinite(max) || max <= 0 || !isFinite(width) || width <= 0) {
      return Infinity;
    }
    
    try {
      // Using the formula from the original sparksTreemapFinal
      return Math.max(
        width * width * max / (sum * sum),
        sum * sum / (width * width * min)
      );
    } catch (error) {
      console.error('Error calculating aspect ratio:', error);
      return Infinity;
    }
  }
  
  /**
   * Capture the current state of nodes for animation
   * @param {Array<TreemapNode>} nodes - Array of nodes
   * @returns {Array<Object>} State representation
   * @private
   */
  _captureState(nodes) {
    if (!nodes || !Array.isArray(nodes)) {
      return [];
    }
    
    return nodes.map(node => {
      if (!node || !node.rect) {
        return {
          id: node ? node.id : 'unknown',
          rect: { x: 0, y: 0, width: 0, height: 0 }
        };
      }
      
      // Validate rect values
      const validRect = {
        x: typeof node.rect.x === 'number' && isFinite(node.rect.x) ? node.rect.x : 0,
        y: typeof node.rect.y === 'number' && isFinite(node.rect.y) ? node.rect.y : 0,
        width: typeof node.rect.width === 'number' && isFinite(node.rect.width) ? Math.max(0, node.rect.width) : 0,
        height: typeof node.rect.height === 'number' && isFinite(node.rect.height) ? Math.max(0, node.rect.height) : 0
      };
      
      return {
        id: node.id,
        rect: validRect
      };
    });
  }
  
  /**
   * Get the captured animation states
   * @returns {Array<Array<Object>>} Animation states
   */
  getAnimationStates() {
    return Array.isArray(this.animationStates) ? this.animationStates : [];
  }
  
  /**
   * Apply size constraints to ensure minimum node sizes
   * @param {TreemapNode} rootNode - Root node of the treemap
   * @param {number} maxDepth - Maximum depth to process
   * @private
   */
  _applySizeConstraints(rootNode, maxDepth = 99) {
    if (!rootNode) {
      return;
    }
    
    // Ensure minNodeSize is a valid positive number
    const minSize = typeof this.options.minNodeSize === 'number' && isFinite(this.options.minNodeSize) && this.options.minNodeSize > 0
      ? this.options.minNodeSize
      : 5;
    
    // Track which nodes needed adjustment for logging
    const adjustedNodes = [];
    
    const applyMinSize = (node, currentDepth = 0) => {
      // Skip processing beyond maxDepth
      if (currentDepth > maxDepth) {
        return;
      }
      
      if (!node || !node.rect) {
        return;
      }
      
      try {
        // Validate rect values first
        if (typeof node.rect.width !== 'number' || !isFinite(node.rect.width)) {
          if (currentDepth <= 1) { // Only log for top levels
          }
          node.rect.width = minSize;
          adjustedNodes.push(node.id);
        }
        
        if (typeof node.rect.height !== 'number' || !isFinite(node.rect.height)) {
          if (currentDepth <= 1) { // Only log for top levels
          }
          node.rect.height = minSize;
          adjustedNodes.push(node.id);
        }
        
        // Apply minimum size constraint
        if (node.rect.width < minSize) {
          node.rect.width = minSize;
          if (!adjustedNodes.includes(node.id)) adjustedNodes.push(node.id);
        }
        if (node.rect.height < minSize) {
          node.rect.height = minSize;
          if (!adjustedNodes.includes(node.id)) adjustedNodes.push(node.id);
        }
        
        // Ensure x and y are valid
        if (typeof node.rect.x !== 'number' || !isFinite(node.rect.x)) {
          node.rect.x = 0;
          if (!adjustedNodes.includes(node.id)) adjustedNodes.push(node.id);
        }
        
        if (typeof node.rect.y !== 'number' || !isFinite(node.rect.y)) {
          node.rect.y = 0;
          if (!adjustedNodes.includes(node.id)) adjustedNodes.push(node.id);
        }
        
        // Apply to children if they exist, but only up to maxDepth
        if (Array.isArray(node.children) && currentDepth < maxDepth) {
          node.children.forEach(child => {
            try {
              applyMinSize(child, currentDepth + 1);
            } catch (error) {
              if (currentDepth <= 1) { // Only log for top levels
              }
            }
          });
        }
      } catch (error) {
        if (currentDepth <= 1) { // Only log for top levels
        }
      }
    };
    
    try {
      applyMinSize(rootNode, 0);
      
      // Log summary of adjustments
      if (adjustedNodes.length > 0) {
      }
    } catch (error) {
    }
  }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreemapLayout;
} else {
  // Browser environment
  window.CompressedTreemap = window.CompressedTreemap || {};
  window.CompressedTreemap.TreemapLayout = TreemapLayout;
}