// Tariff data operations module

/**
 * Get tariff data for a specific section and country
 * @param {string} countryName - Country name or ISO code
 * @param {string} sectionId - Section ID
 * @param {Object} bilateralTariffs - Bilateral tariff data
 * @param {Object} currentTariffs - Current (potentially modified) tariff values
 * @param {Object} sectionIdToName - Mapping from section IDs to names
 * @param {number} tariffYear - Target tariff year
 * @param {Function} getIsoFromCountry - Function to convert country name to ISO code
 * @param {Object} directlySetTariffs - Optional - Tracks which tariffs were directly set by the user vs calculated
 * @param {string} hierarchyKey - Optional - For getting a specific hierarchical key (e.g. sectionId_chapterId_hsCode)
 * @returns {Object|null} - Tariff data object or null if not found
 */
export function getTariffData(countryName, sectionId, bilateralTariffs, currentTariffs, sectionIdToName, tariffYear, getIsoFromCountry, directlySetTariffs = null, hierarchyKey = null) {
    // Get ISO code for the country
    const isoCode = getIsoFromCountry(countryName);
    
    if (!isoCode) {
        console.error(`No ISO code found for country: ${countryName}`);
        return null;
    }
    
    // If a specific hierarchical key is provided (e.g. for HS4 or chapter level), check for it first
    if (hierarchyKey && currentTariffs[isoCode] && currentTariffs[isoCode][hierarchyKey] !== undefined) {
        return {
            code: parseInt(sectionId, 10),
            usTariff: currentTariffs[isoCode][hierarchyKey]
        };
    }
    
    // If looking for section data and we have a modified tariff, return it
    if ((!hierarchyKey || hierarchyKey === sectionId) && 
        currentTariffs[isoCode] && 
        currentTariffs[isoCode][sectionId] !== undefined) {
        return {
            code: parseInt(sectionId, 10),
            usTariff: currentTariffs[isoCode][sectionId]
        };
    }
    
    // Check if we have tariff data for this country
    if (!bilateralTariffs[isoCode]) {
        console.error(`No tariff data found for country with ISO code: ${isoCode}`);
        return null;
    }
    
    // Get section name from our mapping to access tariff data
    const sectionName = sectionIdToName[sectionId];
    if (!sectionName) {
        console.error(`No section name found for ID: ${sectionId}`);
        return null;
    }
    
    // Get tariff data for this section
    const sectorData = bilateralTariffs[isoCode].sector_data[tariffYear][sectionName];
    
    // Store the original tariff in our currentTariffs object if it doesn't exist yet
    if (!currentTariffs[isoCode]) {
        currentTariffs[isoCode] = {};
    }
    if (currentTariffs[isoCode][sectionId] === undefined) {
        currentTariffs[isoCode][sectionId] = sectorData.us_to_country;
    }
    
    // Only return the US tariff on the selected country
    return {
        code: parseInt(sectionId, 10),
        usTariff: currentTariffs[isoCode][sectionId]
    };
}

/**
 * Get original (unmodified) tariff data for a section
 * @param {string} countryIso - Country ISO code or name
 * @param {string} sectionId - Section ID
 * @param {Object} bilateralTariffs - Bilateral tariff data
 * @param {Object} modifiedOriginalTariffs - User-modified original tariffs
 * @param {Object} sectionIdToName - Mapping from section IDs to names
 * @param {number} tariffYear - Target tariff year
 * @param {Function} getIsoFromCountry - Function to convert country name to ISO code
 * @returns {Object|null} - Tariff data object or null if not found
 */
export function getTariffOriginalData(countryIso, sectionId, bilateralTariffs, modifiedOriginalTariffs, sectionIdToName, tariffYear, getIsoFromCountry) {
    // Get ISO code for the country if string was provided
    const isoCode = typeof countryIso === 'string' && countryIso.length === 3 ? 
        countryIso : getIsoFromCountry(countryIso);
    
    if (!isoCode) {
        console.error(`No ISO code found for country: ${countryIso}`);
        return null;
    }
    
    // Check if we have a user-modified original tariff for this section and country
    if (modifiedOriginalTariffs[isoCode] && modifiedOriginalTariffs[isoCode][sectionId] !== undefined) {
        return {
            code: parseInt(sectionId, 10),
            usTariff: modifiedOriginalTariffs[isoCode][sectionId]
        };
    }
    
    // Check if we have tariff data for this country
    if (!bilateralTariffs[isoCode]) {
        console.error(`No tariff data found for country with ISO code: ${isoCode}`);
        return null;
    }
    
    // Get section name from our mapping to access tariff data
    const sectionName = sectionIdToName[sectionId];
    if (!sectionName) {
        console.error(`No section name found for ID: ${sectionId}`);
        return null;
    }
    
    // Get tariff data for this section
    const sectorData = bilateralTariffs[isoCode].sector_data[tariffYear][sectionName];
    
    // Return tariff data if available
    if (sectorData && sectorData.us_to_country !== undefined) {
        return {
            code: parseInt(sectionId, 10),
            usTariff: sectorData.us_to_country
        };
    }
    
    return null;
}

/**
 * Store original tariffs for a country
 * @param {string} countryIso - Country ISO code
 * @param {Object} originalTariffs - Object to store original tariffs
 * @param {Object} sectionIdToName - Mapping from section IDs to names
 * @param {Function} getTariffOriginalData - Function to get original tariff data
 */
export function storeOriginalTariffs(countryIso, originalTariffs, sectionIdToName, getTariffOriginalData) {
    if (!originalTariffs[countryIso]) {
        originalTariffs[countryIso] = {};
        
        // Store original section tariffs
        Object.keys(sectionIdToName).forEach(sectionId => {
            const tariffData = getTariffOriginalData(countryIso, sectionId);
            if (tariffData && tariffData.usTariff !== undefined) {
                originalTariffs[countryIso][sectionId] = tariffData.usTariff;
            }
        });
    }
}

/**
 * Get the weight for a specific HS code in a section
 * @param {string} sectionId - Section ID
 * @param {string} hsCode - HS code
 * @param {string} selectedCountry - Selected country
 * @param {Object} sectionWeights - Section weights data
 * @returns {number|null} - Weight value or null if not found
 */
export function getHsCodeWeight(sectionId, hsCode, selectedCountry, sectionWeights) {
    // Ensure we have selected country and section data
    if (!selectedCountry || !sectionWeights[selectedCountry] || !sectionWeights[selectedCountry][sectionId]) {
        return null;
    }
    
    // Check if the specific code exists (either HS-4 or HS-2)
    if (sectionWeights[selectedCountry][sectionId][hsCode]) {
        return sectionWeights[selectedCountry][sectionId][hsCode];
    }
    
    // No fallback - if the code doesn't exist, return null
    return null;
}

/**
 * Calculate weights for HS4 codes within their HS2 chapter
 * @param {string} sectionId - Section ID
 * @param {string} chapterId - HS2 chapter ID
 * @param {Object} sectionToHs4Mapping - Hierarchical mapping of sections to HS codes
 * @param {string} selectedCountry - Selected country
 * @param {Object} sectionWeights - Section weights data
 * @param {Object} cachedWeights - Optional cached weights to use/update
 * @returns {Object} - Map of HS4 code to its weight within the chapter
 */
export function calculateHs4WeightsWithinChapter(sectionId, chapterId, sectionToHs4Mapping, selectedCountry, sectionWeights, cachedWeights = null) {
    // Check if we have cached weights for this section, chapter, and country
    if (cachedWeights && 
        cachedWeights[selectedCountry] && 
        cachedWeights[selectedCountry][sectionId] && 
        cachedWeights[selectedCountry][sectionId][chapterId]) {
        return cachedWeights[selectedCountry][sectionId][chapterId].hs4RelativeWeights;
    }
    
    // Get the chapter data
    const section = sectionToHs4Mapping[sectionId];
    if (!section || !section.chapters || !section.chapters[chapterId]) {
        return {};
    }
    
    const chapter = section.chapters[chapterId];
    const hs4Weights = {};
    let totalWeight = 0;
    
    // Sum weights of all HS4 codes in this chapter
    Object.keys(chapter.subcategories || {}).forEach(hs4Code => {
        const weight = getHsCodeWeight(sectionId, hs4Code, selectedCountry, sectionWeights) || 0;
        if (weight > 0) {
            hs4Weights[hs4Code] = weight;
            totalWeight += weight;
        }
    });
    
    // If no weights found, use equal weighting
    if (totalWeight <= 0) {
        const hs4Count = Object.keys(chapter.subcategories || {}).length;
        if (hs4Count > 0) {
            const equalWeight = 1 / hs4Count;
            Object.keys(chapter.subcategories || {}).forEach(hs4Code => {
                hs4Weights[hs4Code] = equalWeight;
            });
            
            // Use 1.0 as the total weight for equal distribution
            totalWeight = 1.0;
        }
    } else {
        // Normalize weights to sum to 1 within the chapter
        Object.keys(hs4Weights).forEach(hs4Code => {
            hs4Weights[hs4Code] = hs4Weights[hs4Code] / totalWeight;
        });
    }
    
    // If we have a cache to update, store the results
    if (cachedWeights) {
        if (!cachedWeights[selectedCountry]) {
            cachedWeights[selectedCountry] = {};
        }
        if (!cachedWeights[selectedCountry][sectionId]) {
            cachedWeights[selectedCountry][sectionId] = {};
        }
        cachedWeights[selectedCountry][sectionId][chapterId] = {
            totalWeight: totalWeight,
            hs4RelativeWeights: hs4Weights
        };
    }
    
    return hs4Weights;
}

/**
 * Pre-calculate all chapter weights for a country
 * @param {string} countryCode - Country code or ISO
 * @param {Object} sectionToHs4Mapping - Hierarchical mapping of sections to HS codes
 * @param {Object} sectionWeights - Section weights data
 * @param {Object} cachedWeights - Object to store the cached weights
 */
export function preCalculateChapterWeights(countryCode, sectionToHs4Mapping, sectionWeights, cachedWeights) {
    // Initialize country in the cache if needed
    if (!cachedWeights[countryCode]) {
        cachedWeights[countryCode] = {};
    }
    
    // For each section
    Object.keys(sectionToHs4Mapping).forEach(sectionId => {
        const section = sectionToHs4Mapping[sectionId];
        if (!section || !section.chapters) return;
        
        // Initialize section in the cache
        if (!cachedWeights[countryCode][sectionId]) {
            cachedWeights[countryCode][sectionId] = {};
        }
        
        // For each chapter in this section
        Object.keys(section.chapters).forEach(chapterId => {
            const chapter = section.chapters[chapterId];
            if (!chapter || !chapter.subcategories) return;
            
            // Calculate and cache the weights for this chapter
            calculateHs4WeightsWithinChapter(
                sectionId, 
                chapterId, 
                sectionToHs4Mapping, 
                countryCode, 
                sectionWeights,
                cachedWeights
            );
        });
    });
}