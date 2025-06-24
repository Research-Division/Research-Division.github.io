// Core utility functions for tariff weighting calculations

/**
 * Convert country name to ISO code
 * @param {string} countryName - The name of the country
 * @param {Map} countryToIso - Mapping from country names to ISO codes
 * @returns {string|null} - The ISO code or null if not found
 */
export function getIsoFromCountry(countryName, countryToIso) {
    // If it's already an ISO code (3 uppercase letters), return it directly
    if (countryName && countryName.length === 3 && countryName === countryName.toUpperCase()) {
        return countryName;
    }
    return countryToIso.get(countryName) || null;
}

/**
 * Convert ISO code to country name
 * @param {string} isoCode - The ISO code of the country
 * @param {Map} isoToCountry - Mapping from ISO codes to country names
 * @returns {string|null} - The country name or null if not found
 */
export function getCountryFromIso(isoCode, isoToCountry) {
    return isoToCountry.get(isoCode) || null;
}

/**
 * Initialize mapping between country names and ISO codes
 * @param {Array} mappingData - Array of objects with country and iso properties
 * @param {Map} countryToIso - Map to store country name to ISO code mapping
 * @param {Map} isoToCountry - Map to store ISO code to country name mapping
 */
export function initializeCountryMappings(mappingData, countryToIso, isoToCountry) {
    mappingData.forEach(entry => {
        // Simple mapping for all entries
        countryToIso.set(entry.country, entry.iso);
        isoToCountry.set(entry.iso, entry.country);
    });
    
}

/**
 * Helper function to load JSON data
 * @param {string} url - URL of the JSON file to load
 * @returns {Promise<Object>} - Promise resolving to the loaded JSON data
 */
export async function loadJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        throw error;
    }
}

/**
 * Calculate BEA code tariffs using importance weights
 * @param {string} countryIso - ISO code of the country
 * @param {Object} beaSectionWeights - BEA section weights
 * @param {Object} originalTariffs - Original tariffs
 * @param {Object} modifiedOriginalTariffs - User-modified original tariffs
 * @param {Function} getTariffData - Function to get tariff data
 * @param {boolean} useOriginal - Whether to use original tariffs
 * @returns {Object} - Calculated BEA tariffs
 */
export function calculateBeaTariffs(countryIso, beaSectionWeights, originalTariffs, modifiedOriginalTariffs, getTariffData, useOriginal = false) {
    const beaTariffs = {};
    
    // Check if we have BEA weights for this country
    if (!beaSectionWeights[countryIso]) {
        console.warn(`No BEA weights found for country: ${countryIso}`);
        return beaTariffs;
    }
    
    // For each BEA code
    Object.keys(beaSectionWeights[countryIso]).forEach(beaCode => {
        const sectionWeights = beaSectionWeights[countryIso][beaCode];
        let weightedTariffSum = 0;
        let totalWeight = 0;
        
        // For each section with a weight for this BEA code
        Object.keys(sectionWeights).forEach(sectionId => {
            const weight = sectionWeights[sectionId];
            
            // Get the tariff for this section
            let tariffValue;
            
            if (useOriginal) {
                // Check for user-modified original tariff first
                if (modifiedOriginalTariffs[countryIso] && modifiedOriginalTariffs[countryIso][sectionId] !== undefined) {
                    tariffValue = modifiedOriginalTariffs[countryIso][sectionId];
                } else {
                    // Use original tariff value
                    tariffValue = originalTariffs[countryIso][sectionId];
                }
            } else {
                // Use current (potentially modified) tariff value - pass null as directlySetTariffs
                // because we want to use section-level tariffs regardless of how they were set
                // When calculating BEA tariffs, we're aggregating sectors, so we need to use
                // all section values even if they were calculated
                const tariffData = getTariffData(countryIso, sectionId);
                
                // Fallback to original if no current
                if (!tariffData || tariffData.usTariff === null || tariffData.usTariff === undefined) {
                    if (originalTariffs[countryIso] && originalTariffs[countryIso][sectionId] !== undefined) {
                        tariffValue = originalTariffs[countryIso][sectionId];
                    }
                } else {
                    tariffValue = tariffData.usTariff;
                }
            }
            
            if (tariffValue !== null && tariffValue !== undefined) {
                weightedTariffSum += tariffValue * weight;
                totalWeight += weight;
            }
        });
        
        // Calculate weighted average tariff
        if (totalWeight > 0) {
            beaTariffs[beaCode] = weightedTariffSum / totalWeight;
        } else {
            beaTariffs[beaCode] = 0;
        }
    });
    
    return beaTariffs;
}