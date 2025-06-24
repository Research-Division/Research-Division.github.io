/**
 * MDS_helper_functions.js - Helper functions for multi-country tariff calculations
 * 
 * This module provides helper functions for extracting HS4 level tariff changes
 * and aggregating them to section level for multiple countries in the country list
 * and global tariff implementations.
 */

var MdsHelperFunctions = (function() {
    // Store loaded data for reuse
    let cachedData = {
        sectionToHs4Mapping: null,
        sectionWeights: null,
        beaSectionWeights: null,
        beaImportWeights: null,
        originalTariffs: null,
        dataLoaded: false
    };

    /**
     * Load all necessary data for tariff calculations
     * @returns {Promise} - A promise that resolves when all data is loaded
     */
    async function loadAllData() {
        if (cachedData.dataLoaded) {
            return cachedData;
        }
        
        try {
            // Load all required data in parallel
            const [sectionToHs4Mapping, sectionWeights, beaSectionWeights, beaImportWeights, bilateralTariffs] = await Promise.all([
                fetch(DataPaths.meta.section_to_chapters).then(r => r.json()),
                fetch(DataPaths.calculations.hs_section_weights).then(r => r.json()),
                fetch(DataPaths.calculations.bea_section_weights).then(r => r.json()),
                fetch(DataPaths.calculations.importVector).then(r => r.json()),
                fetch(DataPaths.bilateral_tariffs.section.statutory).then(r => r.json())
            ]);
            
            // Store in cache
            cachedData.sectionToHs4Mapping = sectionToHs4Mapping;
            cachedData.sectionWeights = sectionWeights;
            cachedData.beaSectionWeights = beaSectionWeights;
            cachedData.beaImportWeights = beaImportWeights.direct;
            
            // Process original tariffs into a structured format from statutory.json
            const processedOriginalTariffs = {};
            
            // Create a mapping from section ID to section name using a sample country
            const sectionIdToName = {};
            if (Object.keys(bilateralTariffs).length > 0) {
                const anySample = Object.values(bilateralTariffs)[0];
                if (anySample && anySample.sectors) {
                    anySample.sectors.forEach(sector => {
                        if (sector.code !== undefined && sector.name) {
                            sectionIdToName[sector.code.toString()] = sector.name;
                        }
                    });
                }
            }
            
            // Default tariff year to use
            const tariffYear = '2021';
            
            // For each country
            Object.keys(bilateralTariffs).forEach(countryCode => {
                processedOriginalTariffs[countryCode] = {};
                
                // Make sure we have sections and years data for this country
                if (!bilateralTariffs[countryCode] || 
                    !bilateralTariffs[countryCode].sector_data || 
                    !bilateralTariffs[countryCode].sector_data[tariffYear]) {
                    //console.warn(`Missing sector data for country ${countryCode} in year ${tariffYear}`);
                    return;
                }
                
                // For each section ID
                Object.keys(sectionIdToName).forEach(sectionId => {
                    const sectionName = sectionIdToName[sectionId];
                    
                    // Get sector data
                    if (bilateralTariffs[countryCode].sector_data[tariffYear][sectionName]) {
                        // Extract US to country tariff
                        const tariffValue = 
                            bilateralTariffs[countryCode].sector_data[tariffYear][sectionName].us_to_country || 0;
                        
                        // Store the tariff value
                        processedOriginalTariffs[countryCode][sectionId] = tariffValue;
                    } else {
                        // No data for this section, default to 0
                        processedOriginalTariffs[countryCode][sectionId] = 0;
                    }
                });
            });
            
            // Store processed data
            cachedData.originalTariffs = processedOriginalTariffs;
            cachedData.dataLoaded = true;
            
            // Data successfully loaded
            
            return cachedData;
        } catch (error) {
            console.error('Error loading data for MDS helper functions:', error);
            throw error;
        }
    }
    
    /**
     * Extract HS4 level tariff changes from product modal
     * This is a simplified version that works with the current structure
     * @param {Object} currentVector - The vector of tariff changes from the modal
     * @returns {Array} - Array of HS4 tariff changes
     */
    async function extractTariffChanges(currentVector) {
        // Ensure data is loaded
        await loadAllData();
        
        const hs4TariffChanges = [];
        const sectionToHs4Mapping = cachedData.sectionToHs4Mapping;
        
        // Extract the section-level tariff changes
        Object.keys(currentVector).forEach(sectionId => {
            const tariffChange = currentVector[sectionId];
            // Check if this is an array index (number) or a direct section ID
            const isIndexBasedVector = !isNaN(parseInt(sectionId)) && 
                                     parseInt(sectionId) >= 0 && 
                                     parseInt(sectionId) < 21;
            
            // Adjust section ID if this is using array indexing
            const adjustedSectionId = isIndexBasedVector ? 
                                    (parseInt(sectionId) + 1).toString() : 
                                    sectionId;
            
            
            if (Math.abs(tariffChange) > 0.0001) {
                // If we have a valid tariff change and section, add HS4 entries
                const section = sectionToHs4Mapping[adjustedSectionId];
                if (section && section.chapters) {
                    // Log how many HS4 codes we're adding for this section
                    let hs4Count = 0;
                    Object.keys(section.chapters).forEach(chapterId => {
                        const chapter = section.chapters[chapterId];
                        if (chapter && chapter.subcategories) {
                            hs4Count += Object.keys(chapter.subcategories).length;
                        }
                    });
                    
                    // For each chapter in this section
                    Object.keys(section.chapters).forEach(chapterId => {
                        const chapter = section.chapters[chapterId];
                        if (chapter && chapter.subcategories) {
                            // For each HS4 code in this chapter
                            Object.keys(chapter.subcategories).forEach(hs4Code => {
                                hs4TariffChanges.push({
                                    sectionId: adjustedSectionId,
                                    chapterId: chapterId,
                                    hs4Code: hs4Code,
                                    tariffChange: tariffChange,
                                    passThrough: 1.0 // Default pass-through is 100%
                                });
                            });
                        }
                    });
                } else {
                }
            }
        });
        
        
        return hs4TariffChanges;
    }

    /**
     * Aggregate HS4 tariff changes to section level for a specific country
     * @param {Array} hs4TariffChanges - Array of HS4 tariff changes
     * @param {string} countryCode - ISO code for the country
     * @returns {Object} - Object with section tariffs for the country
     */
    async function aggregateToSectionLevel(hs4TariffChanges, countryCode) {
        // Ensure data is loaded
        await loadAllData();
        
        // Initialize tariff store for this country
        const tariffStore = {};
        const sectionWeights = cachedData.sectionWeights;
        const originalTariffs = cachedData.originalTariffs;
        
        // Track total weights and weighted sums for proper averaging
        const totalSectionWeights = {};
        const weightedSectionSums = {};
        

        // Initialize with original tariffs if available
        if (originalTariffs && originalTariffs[countryCode]) {
            Object.keys(originalTariffs[countryCode]).forEach(sectionId => {
                tariffStore[sectionId] = originalTariffs[countryCode][sectionId];
                //console.log(`Initial tariff for section ${sectionId}: ${tariffStore[sectionId]}`);
            });
        }
        
        // Initialize tracking objects for all sections that might be affected
        const uniqueSections = [...new Set(hs4TariffChanges.map(change => change.sectionId))];
        uniqueSections.forEach(sectionId => {
            totalSectionWeights[sectionId] = 0;
            weightedSectionSums[sectionId] = 0;
        });

        // Process each HS4 tariff change
        let processedHs4Count = 0;
        let skippedHs4Count = 0;
        
        hs4TariffChanges.forEach(change => {
            const { sectionId, hs4Code, tariffChange } = change;
            
            // Skip if no change
            if (Math.abs(tariffChange) <= 0.0001) {
                skippedHs4Count++;
                return;
            }
            
            // Get the HS4 weight for this country
            let hs4Weight = 0;
            
            // Check if we have section weights for this country
            if (sectionWeights && sectionWeights[countryCode] && 
                sectionWeights[countryCode][sectionId] && 
                sectionWeights[countryCode][sectionId][hs4Code]) {
                hs4Weight = sectionWeights[countryCode][sectionId][hs4Code];
            }
            
            // Skip if weight is zero or missing
            if (hs4Weight <= 0) {
                skippedHs4Count++;
                return; // Skip this change
            }
            
            // If we have a valid weight, accumulate for proper weighted average
            processedHs4Count++;
            totalSectionWeights[sectionId] += hs4Weight;
            weightedSectionSums[sectionId] += tariffChange * hs4Weight;
        });
        
      
        // Calculate the weighted average for each section
        Object.keys(totalSectionWeights).forEach(sectionId => {
            if (totalSectionWeights[sectionId] > 0) {
                // Calculate weighted average
                const weightedAverage = weightedSectionSums[sectionId] / totalSectionWeights[sectionId];
                
                // Get original section tariff as fallback
                const originalSectionTariff = 
                    (originalTariffs && originalTariffs[countryCode] && 
                     originalTariffs[countryCode][sectionId]) || 0;
                
                // Set the final tariff value (original + weighted average of changes)
                tariffStore[sectionId] = originalSectionTariff + weightedAverage;
                
            } else {
            }
        });
        
        return tariffStore;
    }
    
    /**
     * Calculate BEA tariffs for a country based on section tariffs
     * @param {Object} sectionTariffs - Section tariffs for the country
     * @param {string} countryCode - ISO code for the country
     * @returns {Object} - Object with BEA tariffs for the country
     */
    async function calculateBeaTariffs(sectionTariffs, countryCode) {
        // Ensure data is loaded
        await loadAllData();
        
        const beaTariffs = {};
        const beaSectionWeights = cachedData.beaSectionWeights;
        // Check if we have BEA weights for this country
        if (!beaSectionWeights || !beaSectionWeights[countryCode]) {
            //console.warn(`No BEA weights found for country: ${countryCode}`);
            return beaTariffs;
        }
        
        // For each BEA code
        Object.keys(beaSectionWeights[countryCode]).forEach(beaCode => {
            const sectionWeights = beaSectionWeights[countryCode][beaCode];
            let weightedTariffSum = 0;
            let totalWeight = 0;
            
            // For each section with a weight for this BEA code
            Object.keys(sectionWeights).forEach(sectionId => {
                const weight = sectionWeights[sectionId];
                
                // Get the tariff for this section
                let tariffValue = sectionTariffs[sectionId] || 0;
                
                // Add to weighted sum
                weightedTariffSum += tariffValue * weight;
                totalWeight += weight;
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
    
    /**
     * Calculate original BEA tariffs for a country
     * @param {string} countryCode - ISO code for the country
     * @returns {Object} - Object with original BEA tariffs
     */
    async function calculateOriginalBeaTariffs(countryCode) {
        // Ensure data is loaded
        await loadAllData();
        
        const originalTariffs = cachedData.originalTariffs;
        
        // Get original section tariffs for this country
        const originalSectionTariffs = {};
        if (originalTariffs && originalTariffs[countryCode]) {
            Object.assign(originalSectionTariffs, originalTariffs[countryCode]);
        } else {
            //console.warn(`No original tariffs found for country: ${countryCode}`);
        }
        
        // Calculate BEA tariffs using the original section tariffs
        return await calculateBeaTariffs(originalSectionTariffs, countryCode);
    }
    
    /**
     * Process tariff changes for multiple countries
     * @param {Object} currentVector - The vector of tariff changes from the modal
     * @param {Array} countryList - List of country ISO codes
     * @returns {Object} - Tariff data object with vectors and matrices for calculations
     */
    async function processMultiCountryTariffs(currentVector, countryList) {
        // Ensure data is loaded
        await loadAllData();
        
        // Extract HS4 level tariff changes
        const hs4TariffChanges = await extractTariffChanges(currentVector);
        
        // Get the BEA codes (use the first country with weights as a reference)
        const beaSectionWeights = cachedData.beaSectionWeights;
        const beaImportWeights = cachedData.beaImportWeights;
        
        // Use the same custom BEA order as in simpleTariffPropagation.js for consistency
        const customBEAOrder = [
          '111', '112', '113FF', '211', '212', '213', '2211', '2212NW', '23EH', '23MR', '23OC', '23OR', '23OT', '23PC', '23SF', '23TH', '321', '327', '3311IS', '3313NF', '332', '33311', '33312', '33313', '3332OM', '3341', '3342', '3344', '3345', '334X', '335', '336111', '336112', '33612', '3362BP', '3364', '3365AO', '337', '3391', '3399', '311', '3121', '3122', '313TT', '315AL', '322', '323', '324', '3251', '3252', '3254', '325X', '326', '4231', '4234', '4236', '4238', '423X', '4242', '4244', '4247', '424X', '425', '42ID', '441', '445', '452', '444', '446', '447', '448', '454', '4A0X', '481', '482', '483', '484', '485', '486', '48A', '492', '493', '5111', '5112', '512', '515', '5171', '5172', '5174OT', '518', '519', '521CI', '523', '524113', '5241X', '5242', '525', 'HSO', 'HST', 'ORE', '532RL', '5411', '5415', '5412', '5413', '5416', '5417', '5418', '541X', '55', '5613', '5617', '561X', '562', '61', '6211', '6212', '6213', '6214', '6215OH', '622', '623', '624', '711AS', '713', '721', '722', '811', '812', '813', '814', 'GFGD', 'GFGN', 'GFE', 'GSLGE', 'GSLGH', 'GSLGO', 'GSLE', 'Used', 'Other'
        ];
        
        // Find a valid country to get BEA codes (still needed for validation)
        let referenceCountry = null;
        for (const country of Object.keys(beaSectionWeights)) {
            if (Object.keys(beaSectionWeights[country]).length > 0) {
                referenceCountry = country;
                break;
            }
        }
        
        if (!referenceCountry) {
            console.error('No valid country found to get BEA codes');
            return null;
        }
        
        // Use the custom BEA order, but make sure all codes exist in our weights
        const beaCodes = customBEAOrder.filter(code => 
            beaSectionWeights[referenceCountry] && 
            beaSectionWeights[referenceCountry][code] !== undefined
        );
        
        // Log the BEA codes being used
        
        // Create tariff data for calculations
        const tariffData = {
            iso_list: [],
            bea_codes: beaCodes,
            tau_c: [],
            tauCForCalculations: {},
            importWeighted: true,
            sectionTariffs: {} // Add section tariffs property
        };
        
        // Debug data
        const debugData = {
            originalSectionTariffs: {},
            newSectionTariffs: {},
            originalBeaTariffs: {},
            newBeaTariffs: {},
            hs4Changes: hs4TariffChanges,
            countryList: countryList
        };
        
        // Process each country in the country list
        for (const countryCode of countryList) {
            // Skip WLD (world) code as it's not a real country
            if (countryCode === 'WLD') {
                continue;
            }
            
            // Skip countries without weights but with better logging
            if (!beaSectionWeights[countryCode]) {
                continue;
            }
            // skip if issing import weights
            if (!beaImportWeights[countryCode]) {
                continue;
            }
            
            // Step 1: Aggregate HS4 changes to section level
            const sectionTariffs = await aggregateToSectionLevel(hs4TariffChanges, countryCode);
            
            // Store for debugging
            debugData.newSectionTariffs[countryCode] = {...sectionTariffs};
            debugData.originalSectionTariffs[countryCode] = 
                cachedData.originalTariffs[countryCode] || {};
            
            // Step 2: Calculate BEA tariffs
            const beaTariffs = await calculateBeaTariffs(sectionTariffs, countryCode);
            const originalBeaTariffs = await calculateOriginalBeaTariffs(countryCode);
            
            // Store for debugging
            debugData.originalBeaTariffs[countryCode] = originalBeaTariffs;
            debugData.newBeaTariffs[countryCode] = beaTariffs;
            
            // Step 3: Create tau_c vector (percent change)
            const percentChangeVector = [];
            
            beaCodes.forEach(beaCode => {
                const originalTariff = originalBeaTariffs[beaCode] || 0;
                const currentTariff = beaTariffs[beaCode] || 0;
                
                
                // Calculate percent change
                let percentChange = 0;
                
                if (originalTariff !== 0 || currentTariff !== 0) {
                    percentChange = (currentTariff - originalTariff) / (100 + originalTariff);
                }
                
                // Apply import weighting
                if (beaImportWeights[countryCode] && 
                    beaImportWeights[countryCode][beaCode] !== undefined) {
                    percentChange *= beaImportWeights[countryCode][beaCode];
                }
                
                percentChangeVector.push(percentChange);
            });
            
            // Add to the tariff data
            tariffData.iso_list.push(countryCode);
            tariffData.tau_c.push(percentChangeVector);
            tariffData.tauCForCalculations[countryCode] = percentChangeVector;
            
            // Add section tariffs for this country (filtering to include only section-level entries)
            const originalSectionTariffs = {};
            const currentSectionTariffs = {};
            
            // Filter original tariffs to include only section-level entries
            if (cachedData.originalTariffs[countryCode]) {
                Object.keys(cachedData.originalTariffs[countryCode]).forEach(key => {
                    if (!key.includes('_')) {
                        originalSectionTariffs[key] = cachedData.originalTariffs[countryCode][key];
                    }
                });
            }
            
            // Filter current tariffs to include only section-level entries
            Object.keys(sectionTariffs).forEach(key => {
                if (!key.includes('_')) {
                    currentSectionTariffs[key] = sectionTariffs[key];
                }
            });
            
            tariffData.sectionTariffs[countryCode] = {
                original: originalSectionTariffs,
                current: currentSectionTariffs
            };
        }
        
        // Log complete debug data
        //console.log('Complete tariff processing debug data:', debugData);
        
        return tariffData;
    }
    
    // Return the public API
    return {
        loadAllData,
        extractTariffChanges,
        aggregateToSectionLevel,
        calculateBeaTariffs,
        calculateOriginalBeaTariffs,
        processMultiCountryTariffs
    };
})();
