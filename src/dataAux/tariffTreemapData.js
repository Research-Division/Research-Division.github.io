/**
 * Tariff Treemap Data Transformation Module
 * 
 * Transforms NIPA aggregation data from receipt.js into treemap-compatible format
 * for visualizing tariff effects across economic sectors.
 */

var TariffTreemapData = (function() {
    /**
     * Transforms NIPA layer aggregations into a format compatible with compressed treemap
     * @param {Object} layerAggregations - NIPA layer aggregations data from Aggregations.aggregateVector
     * @param {string} effectType - Type of effect ('direct', 'indirect', or 'total')
     * @returns {Object} Data formatted for compressed treemap visualization
     */
    function transformToTreemapData(layerAggregations, effectType) {
        if (!layerAggregations) {
            console.error('No layer aggregations provided for transformation');
            return null;
        }
        
        // Create metadata object for the treemap
        const metadata = {};
        
        // Build hierarchy starting with root
        const rootNode = ['tariff_root', `Tariff ${capitalizeFirstLetter(effectType)} Effects`, 0, []];
        
        // Process each layer, starting with the highest level (0)
        const layers = Object.keys(layerAggregations).sort((a, b) => parseInt(a) - parseInt(b));
        
        // Log all available layers for debugging
        //console.log(`Found ${layers.length} layers in aggregation data:`, layers);
        
        // Store layer information globally for debugging
        window._tariffTreemapLayers = layers;
        
        // Keep track of all nodes by layer and code for parent-child relationships
        const nodesByLayerAndCode = {};
        
        // First create all nodes and organize them by layer
        layers.forEach(layer => {
            const layerNum = parseInt(layer);
            nodesByLayerAndCode[layerNum] = {};
            
            // Skip adjustment items (code = -1)
            const items = layerAggregations[layer].items.filter(item => item.code !== -1);
            
            
            // Create nodes for this layer
            items.forEach((item, index) => {
                // Create unique ID for this node
                const nodeId = `L${layerNum}_${item.code}`;
                
                // Ensure value is positive (some aggregations might have negative values)
                const nodeValue = Math.abs(item.sum);
                
                // Skip nodes with zero or extremely small values - they cause confusion
                if (nodeValue < 0) {
                    return;
                }
                
                // Build a node in compressed format: [id, name, value, children]
                const node = [nodeId, item.name, nodeValue, []];
                
                // Store in our lookup for later parenting
                nodesByLayerAndCode[layerNum][item.code] = node;
                
                // Add metadata for this node
                metadata[nodeId] = {
                    name: item.name,
                    value: nodeValue,
                    code: item.code,
                    layer: layerNum,
                    effectType: effectType,
                    // Store indices for debugging and parent-child relationship building
                    indices: item.indices ? [...item.indices] : []
                };
                
                // Only assign colors to top level nodes (layer 0)
                // This allows the treemap renderer to handle color inheritance
                if (layerNum === 0) {
                    // Assign color from the standard palette
                    metadata[nodeId].color = STANDARD_COLORS[index % STANDARD_COLORS.length];
                }
                
                // If this is the top layer (0), add directly to root
                if (layerNum === 0) {
                    rootNode[3].push(node);
                    metadata[nodeId].parent = 'tariff_root';
                }
            });
        });
        
        // Now build parent-child relationships between layers
        for (let layerNum = 1; layerNum < layers.length; layerNum++) {
            const parentLayerNum = layerNum - 1;
            
            
            // For each node in this layer
            const currentLayerNodes = Object.values(nodesByLayerAndCode[layerNum] || {});
            
            currentLayerNodes.forEach(node => {
                const nodeId = node[0];
                const nodeCode = metadata[nodeId].code;
                const nodeIndices = metadata[nodeId].indices || [];
                
                // Find parent in previous layer that contains this code's indices
                let foundParent = false;
                
                // Verify we have indices for parent matching
                if (nodeIndices.length === 0) {
                    //console.warn(`Node ${nodeId} has no indices for parent matching, adding to root`);
                    rootNode[3].push(node);
                    metadata[nodeId].parent = 'tariff_root';
                    return;
                }
                
                // Try to find a parent node in the previous layer
                const parentLayerNodes = Object.entries(nodesByLayerAndCode[parentLayerNum] || {});
                
                for (const [parentCode, parentNode] of parentLayerNodes) {
                    const parentNodeId = parentNode[0];
                    const parentIndices = metadata[parentNodeId].indices || [];
                    
                    // Skip if parent has no indices
                    if (parentIndices.length === 0) continue;
                    
                    // Check if any of the current node's indices are included in the parent's indices
                    if (doIndicesOverlap(parentIndices, nodeIndices)) {
                        // This is a parent - add the node as a child
                        parentNode[3].push(node);
                        metadata[nodeId].parent = parentNodeId;
                        foundParent = true;
                        
                        // Log successful parent-child relationship
                        break;
                    }
                }
                
                // If no parent found, add to the root (uncommon but possible)
                if (!foundParent) {
                    //console.warn(`No parent found for node ${nodeId} (${metadata[nodeId].name}) in layer ${layerNum}, adding to root`);
                    rootNode[3].push(node);
                    metadata[nodeId].parent = 'tariff_root';
                }
            });
        }
        
        // Log the layer structure to debug drill-down issues
        for (let layerNum = 0; layerNum < layers.length; layerNum++) {
            const nodesInLayer = Object.values(nodesByLayerAndCode[layerNum] || {});
            
            // Check and log child counts for this layer's nodes
            if (layerNum < layers.length - 1) {
                const nodesWithChildren = nodesInLayer.filter(node => node[3] && node[3].length > 0);
                
                // Log a few examples
                if (nodesWithChildren.length > 0) {
                    const examples = nodesWithChildren.slice(0, Math.min(3, nodesWithChildren.length));
                    examples.forEach(node => {
                    });
                }
                
                // Log specific layer 3 nodes with their children for debugging
                if (layerNum === 3) {
                    nodesWithChildren.forEach(node => {
                    });
                }
            }
        }
        
        // Update the root node's value to be the sum of its direct children
        // This ensures the root value matches the displayed sum
        rootNode[2] = rootNode[3].reduce((sum, child) => sum + child[2], 0);
        
        // Root metadata
        metadata['tariff_root'] = {
            name: `Tariff ${capitalizeFirstLetter(effectType)} Effects`,
            value: rootNode[2],
            effectType: effectType,
            isRoot: true
        };
        
        // Structure the data properly for the treemap data adapter
        return {
            metadata: metadata,
            hierarchy: [rootNode],
            years: ['2025'],
            effects: {
                '2025': [rootNode]
            }
        };
    }
    
    /**
     * Checks if two arrays of indices have any overlap
     * @param {Array} parentIndices - Array of parent indices
     * @param {Array} childIndices - Array of child indices
     * @returns {boolean} True if there is any overlap
     */
    function doIndicesOverlap(parentIndices, childIndices) {
        return parentIndices.some(index => childIndices.includes(index));
    }
    
    // Standard color palette for all treemaps
    const STANDARD_COLORS = [
        '#3581b4', // blue1
        '#7fac1c', // green1
        '#f3bb00', // yellow1
        '#56bfd6', // blue2
        '#ca590c', // orange1
        '#53c49f', // teal1
        '#d34682', // pink1
        '#4a3e8e'  // purple1
    ];
    
    /**
     * Helper to capitalize the first letter of a string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    function capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Combines direct and indirect effects into a single treemap data structure
     * @param {Object} directLayerAggregations - Direct effect layer aggregations
     * @param {Object} indirectLayerAggregations - Indirect effect layer aggregations
     * @returns {Object} Combined treemap data
     */
    function combineEffectsToTreemapData(directLayerAggregations, indirectLayerAggregations) {
        const directData = transformToTreemapData(directLayerAggregations, 'direct');
        const indirectData = transformToTreemapData(indirectLayerAggregations, 'indirect');
        
        if (!directData || !indirectData) {
            console.error('Missing effect data for combined treemap');
            return null;
        }
        
        // Create a new combined root
        const combinedRoot = ['tariff_combined_root', 'Tariff Effects Breakdown', 0, [
            // Add direct and indirect as first-level children
            ['tariff_direct_root', 'Direct Effects', directData.hierarchy[0][2], directData.hierarchy[0][3]],
            ['tariff_indirect_root', 'Indirect Effects', indirectData.hierarchy[0][2], indirectData.hierarchy[0][3]]
        ]];
        
        // Update the combined root value
        combinedRoot[2] = combinedRoot[3].reduce((sum, child) => sum + child[2], 0);
        
        // Merge metadata with updated parent references
        const combinedMetadata = {
            ...directData.metadata,
            ...indirectData.metadata,
            'tariff_combined_root': {
                name: 'Tariff Effects Breakdown',
                value: combinedRoot[2],
                isRoot: true
            },
            'tariff_direct_root': {
                name: 'Direct Effects',
                value: directData.hierarchy[0][2],
                parent: 'tariff_combined_root',
                effectType: 'direct',
                color: STANDARD_COLORS[0] // Use first standard color for direct
            },
            'tariff_indirect_root': {
                name: 'Indirect Effects',
                value: indirectData.hierarchy[0][2],
                parent: 'tariff_combined_root',
                effectType: 'indirect',
                color: STANDARD_COLORS[1] // Use second standard color for indirect
            }
        };
        
        // Update parent references for direct effect nodes
        Object.keys(directData.metadata).forEach(nodeId => {
            if (directData.metadata[nodeId].parent === 'tariff_root') {
                combinedMetadata[nodeId].parent = 'tariff_direct_root';
            }
        });
        
        // Update parent references for indirect effect nodes
        Object.keys(indirectData.metadata).forEach(nodeId => {
            if (indirectData.metadata[nodeId].parent === 'tariff_root') {
                combinedMetadata[nodeId].parent = 'tariff_indirect_root';
            }
        });
        
        return {
            metadata: combinedMetadata,
            hierarchy: [combinedRoot],
            years: ['2025'],
            effects: {
                '2025': [combinedRoot]
            }
        };
    }
    
    /**
     * Generates a treemap data structure from the window.nipa*LayerAggregations data
     * @param {string} effectType - Type of effect ('direct', 'indirect', 'total', or 'combined')
     * @returns {Object|null} Treemap data or null if data not available
     */
    function getTreemapDataFromWindow(effectType = 'total') {
        // Log the layer structure for debugging
        function logLayerStructure(layerAggregations) {
            const layers = Object.keys(layerAggregations).sort((a, b) => parseInt(a) - parseInt(b));
            
            layers.forEach(layer => {
                const items = layerAggregations[layer].items.filter(item => item.code !== -1);
            });
        }
        
        switch (effectType.toLowerCase()) {
            case 'direct':
                if (!window.nipaDirectLayerAggregations) {
                    console.error('Direct effect aggregations not available');
                    return null;
                }
                logLayerStructure(window.nipaDirectLayerAggregations);
                return transformToTreemapData(window.nipaDirectLayerAggregations, 'direct');
                
            case 'indirect':
                if (!window.nipaIndirectLayerAggregations) {
                    console.error('Indirect effect aggregations not available');
                    return null;
                }
                logLayerStructure(window.nipaIndirectLayerAggregations);
                return transformToTreemapData(window.nipaIndirectLayerAggregations, 'indirect');
                
            case 'total':
                if (!window.nipaTotalLayerAggregations) {
                    console.error('Total effect aggregations not available');
                    return null;
                }
                logLayerStructure(window.nipaTotalLayerAggregations);
                return transformToTreemapData(window.nipaTotalLayerAggregations, 'total');
                
            case 'combined':
                if (!window.nipaDirectLayerAggregations || !window.nipaIndirectLayerAggregations) {
                    console.error('Direct or indirect effect aggregations not available for combined view');
                    return null;
                }
                logLayerStructure(window.nipaDirectLayerAggregations);
                logLayerStructure(window.nipaIndirectLayerAggregations);
                return combineEffectsToTreemapData(
                    window.nipaDirectLayerAggregations,
                    window.nipaIndirectLayerAggregations
                );
                
            default:
                console.error(`Unknown effect type: ${effectType}`);
                return null;
        }
    }
    
    // Public API
    return {
        transformToTreemapData,
        combineEffectsToTreemapData,
        getTreemapDataFromWindow
    };
})();

// Make the module globally available
window.TariffTreemapData = TariffTreemapData;