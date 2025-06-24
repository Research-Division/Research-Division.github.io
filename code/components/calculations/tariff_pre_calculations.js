/**
 * Tariff Pre-Calculations Module
 * 
 * Handles import vector loading and trade-weighting for tariff calculations
 */
var TariffPreCalculations = (function() {
    // Private cached data
    let importVectorData = null;
    
    /**
     * Loads the import vector data from the server
     * @returns {Promise<Object>} The import vector data, where keys are ISO codes
     */
    async function loadImportVectorData() {
        if (importVectorData !== null) {
            return importVectorData;
        }
        
        try {
            const response = await fetch(DataPaths.calculations.importVector);
            importVectorData = await response.json();
            return importVectorData;
        } catch (error) {
            console.error('Error loading import vector data:', error);
            return null;
        }
    }
    
    /**
     * Creates a properly ordered import vector for a given country
     * @param {string} isoCode - The ISO code of the country
     * @param {Array} customBEAOrder - The custom order of BEA codes to ensure conformability
     * @returns {Promise<Array>} - A properly ordered import vector
     */
    async function getOrderedImportVector(isoCode, customBEAOrder) {
        const importData = await loadImportVectorData();
        
        if (!importData || !importData.direct || !importData.direct[isoCode]) {
            console.warn(`No import data found for ${isoCode}, using equal weights`);
            // Return a vector of equal weights
            return customBEAOrder.map(() => 1 / customBEAOrder.length);
        }
        
        // Get the import data for this country
        const countryImportData = importData.direct[isoCode];
        
        // Create a vector ordered according to customBEAOrder
        const orderedVector = customBEAOrder.map(beaCode => {
            // Use the import share for this BEA code if available, otherwise use 0
            return countryImportData[beaCode] || 0;
        });
        
        return orderedVector;
    }
    
    /**
     * Apply trade-weighting to a tariff vector using import shares
     * @param {string} isoCode - The ISO code of the country
     * @param {Array} tariffVector - The tariff vector to weight
     * @param {Array} customBEAOrder - The custom order of BEA codes to ensure conformability
     * @returns {Promise<Array>} - The trade-weighted tariff vector
     */
    async function tradeWeightTariffVector(isoCode, tariffVector, customBEAOrder) {
        // Get the ordered import vector
        const importVector = await getOrderedImportVector(isoCode, customBEAOrder);
        
        // Ensure vectors are same length
        if (tariffVector.length !== importVector.length) {
            console.error(`Vector length mismatch: tariff vector (${tariffVector.length}) vs import vector (${importVector.length})`);
            return tariffVector; // Return unweighted as fallback
        }
        
        // Apply element-wise multiplication
        const weightedVector = tariffVector.map((tariff, index) => {
            return tariff * importVector[index];
        });
        
        return weightedVector;
    }
    
    /**
     * Apply trade-weighting to multiple tariff vectors in a calculation
     * @param {Object} tariffData - The tariff data object with iso_list and tau_c
     * @param {Array} customBEAOrder - The custom order of BEA codes
     * @returns {Promise<Object>} - The updated tariff data with weighted vectors
     */
    async function applyTradeWeighting(tariffData, customBEAOrder) {
        const { iso_list, tau_c } = tariffData;
        const weightedTauC = [];
        
        // Process each country in iso_list
        for (let i = 0; i < iso_list.length; i++) {
            const iso = iso_list[i];
            const tariffVector = tau_c[i];
            
            // Weight the tariff vector
            const weightedVector = await tradeWeightTariffVector(iso, tariffVector, customBEAOrder);
            weightedTauC.push(weightedVector);
        }
        
        // Return updated tariff data
        return {
            ...tariffData,
            tau_c: weightedTauC,
            importWeighted: true
        };
    }
    
    // Public API
    return {
        loadImportVectorData,
        getOrderedImportVector,
        tradeWeightTariffVector,
        applyTradeWeighting
    };
})();

// Make the module globally available
window.TariffPreCalculations = TariffPreCalculations;