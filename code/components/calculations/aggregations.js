/**
 * Aggregations module for the Tariff Price Pulse application
 * Handles aggregating effect vectors by NIPA layer categories
 */
var Aggregations = (function() {
    let cachedNipaMapping = null;
    
    /**
     * Loads the NIPA mapping data from the specified path
     * @returns {Promise} A promise that resolves to the NIPA mapping data
     */
    async function loadNipaMapping() {
        if (cachedNipaMapping) {
            return cachedNipaMapping;
        }
        
        try {
            const response = await fetch(DataPaths.meta.nipa_map);
            const mapping = await response.json();
            cachedNipaMapping = mapping;
            return mapping;
        } catch (error) {
            console.error('Error loading NIPA mapping data:', error);
            throw error;
        }
    }
    
    /**
     * Groups codes by layer from the NIPA mapping
     * @param {Object} mapping - The NIPA mapping data
     * @returns {Object} An object with layer numbers as keys and arrays of codes as values
     */
    function getCodesByLayer(mapping) {
        return Object.entries(mapping).reduce((groups, [code, {layer}]) => {
            if (!groups[layer]) groups[layer] = [];
            groups[layer].push(code);
            return groups;
        }, {});
    }
    
    /**
     * Creates an aggregation vector for a specific layer - each position in the vector
     * represents the sum of all effects for that layer's category
     * @param {Array} originalVector - The original effect vector
     * @param {Object} mapping - The NIPA mapping data
     * @param {Number} layerNum - The layer number to create vector for
     * @param {Object} options - Options for aggregation
     * @returns {Array} The aggregated vector for this layer
     */
    function createLayerVector(originalVector, mapping, layerNum, options = {}) {
        // Filter mapping to only include entries for this layer
        const layerEntries = Object.entries(mapping).filter(([_, data]) => data.layer === layerNum);
        
        // Create a new vector filled with zeros (same length as original vector)
        const aggregatedVector = new Array(originalVector.length).fill(0);
        
        // A lookup to track which indices we've already processed
        const processedIndices = new Set();
        
        // Iterate through each code in this layer
        layerEntries.forEach(([code, data]) => {
            // Get the indices that this code aggregates
            const { indices } = data;
            
            // For each index that this code aggregates
            indices.forEach(idx => {
                // If we've already included this index in another code at this layer, skip it
                if (processedIndices.has(idx)) return;
                
                // Add the value from the original vector to our aggregated vector
                // at the same position
                aggregatedVector[idx] = originalVector[idx];
                
                // Mark this index as processed so we don't double-count
                processedIndices.add(idx);
            });
        });
        
        // If we need to add adjustment to make the sum match
        if (options.addAdjustment && options.adjustmentLayers && options.adjustmentLayers.includes(layerNum)) {
            // Calculate the original vector sum
            const originalSum = originalVector.reduce((sum, val) => sum + val, 0);
            
            // Calculate the current aggregated vector sum
            const aggregatedSum = aggregatedVector.reduce((sum, val) => sum + val, 0);
            
            // Calculate the adjustment needed
            const adjustment = originalSum - aggregatedSum;
            
            if (adjustment !== 0) {
                // Distribute the adjustment across the vector
                // Add it to the first non-zero element, or the first element if all are zero
                let adjustmentAdded = false;
                for (let i = 0; i < aggregatedVector.length; i++) {
                    if (aggregatedVector[i] !== 0) {
                        aggregatedVector[i] += adjustment;
                        adjustmentAdded = true;
                        break;
                    }
                }
                
                // If all elements were zero, add to the first element
                if (!adjustmentAdded && aggregatedVector.length > 0) {
                    aggregatedVector[0] = adjustment;
                }
            }
        }
        
        return aggregatedVector;
    }
    
    /**
     * Aggregates an effect vector by NIPA layers
     * @param {Array} vector - The effect vector to aggregate
     * @param {Object} mapping - The NIPA mapping data
     * @param {Object} options - Options for aggregation
     * @param {boolean} options.addAdjustments - Whether to add adjustment entries to layers 0-4
     * @param {Array} options.adjustmentLayers - Which layers to add adjustments to (default: [0,1,2,3,4])
     * @returns {Object} The layer aggregations with both item data and vectors
     */
    function aggregateByLayer(vector, mapping, options = {}) {
        const defaultOptions = {
            addAdjustments: true,
            adjustmentLayers: [0, 1, 2, 3, 4]
        };
        
        const opts = { ...defaultOptions, ...options };
        
        // Calculate total vector sum for reference and adjustments
        const totalVectorSum = vector.reduce((sum, val) => sum + val, 0);
        
        // Get codes grouped by layer
        const codesByLayer = getCodesByLayer(mapping);
        
        // Calculate aggregations for each layer
        const layerAggregations = Object.entries(codesByLayer).reduce((agg, [layer, codes]) => {
            // Parse the layer number
            const layerNum = parseInt(layer, 10);
            
            // Map the codes to objects with their sums
            const codeItems = codes.map(code => {
                const { name, indices } = mapping[code];
                const sum = indices.reduce((s, idx) => s + (vector[idx] || 0), 0);
                return { code: +code, name, sum, indices };
            });
            
            // Calculate the total sum for this layer
            const layerSum = codeItems.reduce((total, item) => total + item.sum, 0);
            
            // Create the aggregated vector for this layer
            const layerVector = createLayerVector(vector, mapping, layerNum, {
                addAdjustment: opts.addAdjustments,
                adjustmentLayers: opts.adjustmentLayers
            });
            
            // Only add adjustment if specified in options
            if (opts.addAdjustments && opts.adjustmentLayers.includes(layerNum)) {
                // Calculate adjustment
                const adjustment = totalVectorSum - layerSum;
                
                // Add the adjustment entry
                codeItems.push({
                    code: -1, // Special code for adjustment
                    name: 'Adjustment',
                    sum: adjustment,
                    indices: []
                });
                
                // Update the layer sum to include adjustment
                agg[layer] = {
                    items: codeItems,
                    sum: layerSum + adjustment, // Now equals totalVectorSum
                    vector: layerVector
                };
            } else {
                // Store both the code items and the layer sum without adjustment
                agg[layer] = {
                    items: codeItems,
                    sum: layerSum,
                    vector: layerVector
                };
            }
            
            return agg;
        }, {});
        
        return layerAggregations;
    }
    
    /**
     * Creates a summary of layer aggregations with statistics
     * @param {Object} layerAggregations - The layer aggregations to summarize
     * @param {number} totalVectorSum - The total sum of the vector
     * @returns {Object} The layer summary
     */
    function createLayerSummary(layerAggregations, totalVectorSum) {
        let layerSummary = {};
        
        Object.entries(layerAggregations).forEach(([layer, data]) => {
            const originalSum = data.items.reduce((sum, item) => {
                // Skip the adjustment entry when calculating original sum
                return item.code !== -1 ? sum + item.sum : sum;
            }, 0);
            
            const adjustmentItem = data.items.find(item => item.code === -1);
            const adjustment = adjustmentItem ? adjustmentItem.sum : 0;
            
            const layerVectorSum = data.vector ? data.vector.reduce((sum, val) => sum + val, 0) : 0;
            
            layerSummary[layer] = {
                originalSum,
                adjustment,
                totalSum: data.sum,
                vectorSum: layerVectorSum,
                percentOfTotal: (data.sum / totalVectorSum * 100).toFixed(2) + '%'
            };
        });
        
        return layerSummary;
    }
    
    /**
     * Performs a complete aggregation of an effect vector by NIPA layers
     * @param {Array} vector - The effect vector to aggregate
     * @param {Object} options - Options for aggregation
     * @returns {Promise} A promise that resolves to the aggregation results including vectors
     */
    async function aggregateVector(vector, options = {}) {
        try {
            const mapping = await loadNipaMapping();
            
            // Calculate total vector sum
            const totalVectorSum = vector.reduce((sum, val) => sum + val, 0);
            
            // Aggregate by layer
            const layerAggregations = aggregateByLayer(vector, mapping, options);
            
            // Extract layer vectors into a separate object for easier access
            const layerVectors = {};
            Object.entries(layerAggregations).forEach(([layer, data]) => {
                layerVectors[layer] = data.vector;
            });
            
            return {
                layerAggregations, // Contains items, sum, and vector for each layer
                layerVectors       // Direct access to just the vectors by layer
            };
        } catch (error) {
            console.error('Error aggregating vector:', error);
            throw error;
        }
    }
    
    // Public API
    return {
        aggregateVector,
        aggregateByLayer,
        createLayerSummary,
        createLayerVector,
        loadNipaMapping
    };
})();

// Make the aggregations module globally available
window.Aggregations = Aggregations;