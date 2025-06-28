// Calculations module for handling tariff input and effect calculation
var TariffCalculations = (function() {
    // Private cached data
    const cachedData = {
        directMatrix: null,
        indirectMatrix: null
    };
    
    // Private scenario results
    let scenarioResults = [];
    
    // Custom order for BEA codes - ensure vector conformability
    const customBEAOrder = ['111', '112', '113FF', '211', '212', '213', '2211', '2212NW', '23EH', '23MR', '23OC', '23OR', '23OT', '23PC', '23SF', '23TH', '321', '327', '3311IS', '3313NF', '332', '33311', '33312', '33313', '3332OM', '3341', '3342', '3344', '3345', '334X', '335', '336111', '336112', '33612', '3362BP', '3364', '3365AO', '337', '3391', '3399', '311', '3121', '3122', '313TT', '315AL', '322', '323', '324', '3251', '3252', '3254', '325X', '326', '4231', '4234', '4236', '4238', '423X', '4242', '4244', '4247', '424X', '425', '42ID', '441', '445', '452', '444', '446', '447', '448', '454', '4A0X', '481', '482', '483', '484', '485', '486', '48A', '492', '493', '5111', '5112', '512', '515', '5171', '5172', '5174OT', '518', '519', '521CI', '523', '524113', '5241X', '5242', '525', 'HSO', 'HST', 'ORE', '532RL', '5411', '5415', '5412', '5413', '5416', '5417', '5418', '541X', '55', '5613', '5617', '561X', '562', '61', '6211', '6212', '6213', '6214', '6215OH', '622', '623', '624', '711AS', '713', '721', '722', '811', '812', '813', '814', 'GFGD', 'GFGN', 'GFE', 'GSLGE', 'GSLGH', 'GSLGO', 'GSLE', 'Used', 'Other'];
    
    // Storage for current tariff data
    let currentTariffData = {
        iso_list: [],
        bea_codes: customBEAOrder,
        tau_c: [],
        tauCForCalculations: {},
        importWeighted: false
    };
    
    /*
     * DATA LOADING AND CACHING FUNCTIONS
     */
    async function loadCalculationsData({ persist = false } = {}) {
        if (persist && cachedData.directMatrix && cachedData.indirectMatrix) {
            return {
                directMatrix: cachedData.directMatrix,
                indirectMatrix: cachedData.indirectMatrix
            };
        }
        
        try {
            // Try to load real matrices
            let directMatrix, indirectMatrix;
            
            try {
                const [directResponse, indirectResponse] = await Promise.all([
                    fetch(DataPaths.calculations.direct_matrix),
                    fetch(DataPaths.calculations.indirect_matrix)
                ]);
                
                [directMatrix, indirectMatrix] = await Promise.all([
                    directResponse.json(),
                    indirectResponse.json()
                ]);
            } catch (fetchError) {
                console.warn('Could not load matrix files, creating dummy matrices for testing:', fetchError);
                
                // Create dummy matrices for testing
                // This creates 163x163 matrices (matching the BEA code count)
                const rows = customBEAOrder.length;
                const cols = customBEAOrder.length;
                /*
                // Create dummy data arrays filled with small random values
                const directData = Array(rows).fill().map(() => 
                    Array(cols).fill().map(() => Math.random() * 0.01)
                );
                
                const indirectData = Array(rows).fill().map(() => 
                    Array(cols).fill().map(() => Math.random() * 0.005)
                );
                */
                directMatrix = {
                    rows: rows,
                    cols: cols,
                    data: directData
                };
                
                indirectMatrix = {
                    rows: rows,
                    cols: cols,
                    data: indirectData
                };
            }
            
            if (persist) {
                cachedData.directMatrix = directMatrix;
                cachedData.indirectMatrix = indirectMatrix;
            }
            
            return { directMatrix, indirectMatrix };
        } catch (error) {
            console.error('Error loading calculation matrices:', error);
            return null;
        }
    }
    
    function clearCalculationsData() {
        cachedData.directMatrix = null;
        cachedData.indirectMatrix = null;
    }
    
    /*
     * BASE CALCULATION FUNCTIONS
     */
    function multiplyVectorByMatrix(inputVector, matrix) {
        if (!matrix || !matrix[0]) {
            return [];
        }
        //console.log(inputVector, matrix);

        const E = matrix[0].length; // Number of columns in the matrix
        const result = new Array(E).fill(0);
        
        // Ensure vector length matches matrix rows
        if (inputVector.length !== matrix.length) {
            console.error(`Vector length (${inputVector.length}) doesn't match matrix rows (${matrix.length})`);
            return result;
        }
        
        for (let i = 0; i < inputVector.length; i++) {
            for (let j = 0; j < E; j++) {
                result[j] += inputVector[i] * matrix[i][j];
            }
        }
        
        return result;
    }
    
    // Calculate total effect (direct + indirect)
    function totalEffect(directMatrix, indirectMatrix, inputVector, aggregate = true) {
        const directEffect = multiplyVectorByMatrix(inputVector, directMatrix.data);
        const indirectEffect = multiplyVectorByMatrix(inputVector, indirectMatrix.data);
        const totalEffect = directEffect.map((val, idx) => val + indirectEffect[idx]);
        
        let directSum = null;
        let indirectSum = null;
        let totalSum = null;
        
        if (aggregate) {
            directSum = directEffect.reduce((sum, val) => sum + val, 0);
            indirectSum = indirectEffect.reduce((sum, val) => sum + val, 0);
            totalSum = totalEffect.reduce((sum, val) => sum + val, 0);
        }
        
        return {
            directEffectVector: directEffect,
            indirectEffectVector: indirectEffect,
            totalEffectVector: totalEffect,
            directSum,
            indirectSum,
            totalSum
        };
    }
    
    // Handle duplicates when calculating for multiple countries
    function handleSameISOs(existingResults, newIsoList, strategy = 'override') {
        if (!existingResults || existingResults.length === 0) {
            return {
                isoList: newIsoList,
                removedIndices: []
            };
        }
        
        const existingIsoCodes = existingResults.map(result => result.isoCode);
        const duplicateIsos = newIsoList.filter(iso => existingIsoCodes.includes(iso));
        
        if (duplicateIsos.length === 0) {
            return {
                isoList: newIsoList,
                removedIndices: []
            };
        }
        
        // Find indices of duplicates to remove from scenario results
        const removedIndices = [];
        
        if (strategy === 'override') {
            duplicateIsos.forEach(iso => {
                const index = existingResults.findIndex(result => result.isoCode === iso);
                if (index !== -1) {
                    removedIndices.push(index);
                }
            });
        }
        
        // For revert strategy, remove duplicate ISOs from the new list
        if (strategy === 'revert') {
            return {
                isoList: newIsoList.filter(iso => !existingIsoCodes.includes(iso)),
                removedIndices: []
            };
        }
        
        return {
            isoList: strategy === 'override' ? newIsoList : newIsoList.filter(iso => !existingIsoCodes.includes(iso)),
            removedIndices: removedIndices
        };
    }
    
    /*
     * MAIN CALCULATION FUNCTION
     */
    async function fullCalculations(iso_list, tau_c, {persist = false, dupeStrategy = 'override'}={}) {
        const data = await loadCalculationsData({ persist });
        if (!data) return null;
        
        const {directMatrix, indirectMatrix} = data;
        
        // Handle duplicate ISO codes
        const { isoList: filteredIsoList, removedIndices } = handleSameISOs(
            scenarioResults,
            iso_list,
            dupeStrategy
        );
        
        // Remove duplicates from scenario results if needed
        if (removedIndices.length > 0 && dupeStrategy === 'override') {
            // Sort indices in descending order to avoid shifting issues when removing
            removedIndices.sort((a, b) => b - a);
            removedIndices.forEach(index => {
                scenarioResults.splice(index, 1);
            });
        }
        
        const newResults = [];
        
        // Calculate new results
        filteredIsoList.forEach(iso => {
            const inputVector = tau_c[iso];
            const {
                directEffectVector, 
                indirectEffectVector,
                totalEffectVector, 
                directSum,
                indirectSum, 
                totalSum
            } = totalEffect(directMatrix, indirectMatrix, inputVector, true);
            
            // Create result object with base properties
            const resultObj = {
                isoCode: iso,
                directEffectVector,
                indirectEffectVector,
                totalEffectVector, 
                directSum, 
                indirectSum,
                totalSum,
                importWeighted: currentTariffData.importWeighted,
                timestamp: new Date().getTime(),
                tariffSource: currentTariffData.tariffSource || 'unknown',
                tariffMetadata: currentTariffData.tariffMetadata || {}
            };
            
            // Add section-level tariffs to the result
            // Priority: Use pre-built section tariffs from map popup if available
            if (currentTariffData.sectionTariffs && 
                currentTariffData.sectionTariffs[iso]) {
                // Use the section tariffs built by map popup (has proper fallback logic)
                resultObj.sectionTariffs = currentTariffData.sectionTariffs[iso];
            } else if (window.tariffPropagator) {
                // Fallback: Try to build section tariffs from tariff propagator
                resultObj.sectionTariffs = {
                    original: {},
                    current: {}
                };
                
                try {
                    // Get all section IDs - ensure the mapping actually has content
                    const sectionIds = window.tariffPropagator.sectionToHs4Mapping && 
                                     Object.keys(window.tariffPropagator.sectionToHs4Mapping).length > 0
                        ? Object.keys(window.tariffPropagator.sectionToHs4Mapping) 
                        : []; // Empty array if no mapping available
                    
                    // Only proceed if we have section IDs
                    if (sectionIds.length > 0) {
                        // Store original and current tariffs for each section
                        sectionIds.forEach(sectionId => {
                            try {
                                // Get original tariff value
                                resultObj.sectionTariffs.original[sectionId] = 
                                    window.tariffPropagator.getTariffValue('section', sectionId, null, null, iso, 'original');
                                
                                // Get current tariff value
                                resultObj.sectionTariffs.current[sectionId] = 
                                    window.tariffPropagator.getTariffValue('section', sectionId, null, null, iso, 'current');
                            } catch (e) {
                                console.warn(`Error getting tariff values for section ${sectionId}, country ${iso}:`, e);
                                resultObj.sectionTariffs.original[sectionId] = 0;
                                resultObj.sectionTariffs.current[sectionId] = 0;
                            }
                        });
                    } else {
                        console.warn(`No section IDs available from tariffPropagator for ${iso}`);
                        // Create empty section tariffs to avoid undefined
                        resultObj.sectionTariffs = {
                            original: {},
                            current: {}
                        };
                    }
                } catch (e) {
                    console.warn('Error collecting section tariffs:', e);
                    resultObj.sectionTariffs = {
                        original: {},
                        current: {}
                    };
                }
            }
            
            newResults.push(resultObj);
        });
        
        scenarioResults.push(...newResults);
        
        // Log calculation results for debugging
        //console.log('Tariff Calculation Results:');
        //console.log('iso_list:', filteredIsoList);
        //console.log('tau_c:', tau_c);
        
        // Log each result separately for easier inspection 
        /*
        console.log('===== DETAILED CALCULATION RESULTS =====');
        newResults.forEach(result => {
            console.log(`Result for ${result.isoCode}:`, {
                directSum: result.directSum,
                indirectSum: result.indirectSum,
                totalSum: result.totalSum,
                importWeighted: result.importWeighted,
                sectionTariffs: result.sectionTariffs || 'Not available',
                directEffectVector: result.directEffectVector,
                indirectEffectVector: result.indirectEffectVector,
                totalEffectVector: result.totalEffectVector
            });
        });
        console.log('results (full):', newResults);
        */
        // Create event to notify receipt of new calculation results
        const event = new CustomEvent('calculationComplete', {
            detail: { results: newResults }
        });
        document.dispatchEvent(event);
        
        return newResults;
    }
    
    /*
     * PUBLIC INTERFACE FUNCTIONS
     */
    // Process tariff data from the editor
    // Keep track of the last processed source to prevent unwanted double processing
    let lastProcessedSource = null;
    let lastProcessedTime = 0;
    
    async function processTariffData(tariffData) {
        if (!tariffData || !tariffData.iso_list || !tariffData.tau_c) {
            console.error('Invalid tariff data format');
            return false;
        }
        
        // Get the current source and timestamp
        const currentSource = tariffData.tariffSource || 'unknown';
        const currentTime = new Date().getTime();
        
        // Check if this is a duplicate or conflicting calculation within a short time window (2 seconds)
        if (lastProcessedSource && (currentTime - lastProcessedTime < 2000)) {
            // If we just processed a uniformPopup source, don't allow productTariffModal source
            // This prevents abandoned product tariffs from being calculated after a uniform tariff
            if (lastProcessedSource === 'uniformPopup' && currentSource === 'productTariffModal') {
                // console.log('[TARIFF_VECTOR_DEBUG] Blocking redundant productTariffModal calculation after uniformPopup');
                return false;
            }
        }
        
        // Update the last processed info
        lastProcessedSource = currentSource;
        lastProcessedTime = currentTime;
        
        try {
            // Store the tariff data
            currentTariffData = {
                iso_list: tariffData.iso_list,
                bea_codes: tariffData.bea_codes || customBEAOrder,
                tau_c: tariffData.tau_c,
                tauCForCalculations: tariffData.tauCForCalculations || {},
                importWeighted: tariffData.importWeighted || false,
                countryNames: tariffData.countryNames || {}, // Pass along country names
                sectionTariffs: tariffData.sectionTariffs || {}, // Store section tariffs
                tariffSource: tariffData.tariffSource || 'unknown', // Track source of tariff changes
                sectionTariffSource: tariffData.tariffSource || 'unknown', // Track source of section tariffs
                tariffMetadata: tariffData.tariffMetadata || {}, // Store additional metadata
                useSectionTariffsFallback: tariffData.useSectionTariffsFallback // Option to disable fallback
            };
            
            // Log if section tariffs are available
            if (tariffData.sectionTariffs) {
                /*console.log('Section tariffs received in tariff data:', 
                    Object.keys(tariffData.sectionTariffs).length, 'countries');
                */
                // Make sure we have section tariffs for all countries
                tariffData.iso_list.forEach(iso => {
                    if (!tariffData.sectionTariffs[iso]) {
                        //console.log(`No section tariffs for ${iso}, creating empty object`);
                        tariffData.sectionTariffs[iso] = {
                            original: {},
                            current: {}
                        };
                    }
                });
            } else {
                //console.log('No section tariffs included in tariff data');
                
                // Create empty section tariffs object
                tariffData.sectionTariffs = {};
                tariffData.iso_list.forEach(iso => {
                    tariffData.sectionTariffs[iso] = {
                        original: {},
                        current: {}
                    };
                });
            }
            
            // Prepare the tau_c data in the expected format
            const tauC = {};
            currentTariffData.iso_list.forEach((iso, index) => {
                tauC[iso] = currentTariffData.tau_c[index];
                
                // Log which tariff vector is being used for calculation
                // console.log('[TARIFF_VECTOR_DEBUG] Vector used in calculations:', {
                //     iso,
                //     vector: tauC[iso],
                //     source: currentTariffData.tariffSource || 'unknown',
                //     metadata: currentTariffData.tariffMetadata || {}
                // });
            });
            
            // Perform the calculations
            const results = await fullCalculations(
                currentTariffData.iso_list,
                tauC,
                { persist: true, dupeStrategy: 'override' }
            );
            
            return results ? true : false;
        } catch (error) {
            console.error('Error processing tariff data:', error);
            return false;
        }
    }
    
    // Get all scenario results
    function getScenarioResults() {
        return scenarioResults.slice();
    }
    
    // Clear all scenario results - fixes the stack overflow issue when clearing.
    function clearScenarioResults(skipEvent = false) {
        // Always reset the currentTariffData to initial state
        currentTariffData = {
            iso_list: [],
            bea_codes: customBEAOrder,
            tau_c: [],
            tauCForCalculations: {},
            importWeighted: false,
            countryNames: {},
            sectionTariffs: {},
            tariffSource: 'unknown',
            tariffMetadata: {}
        };
        
        // Clear the results array
        scenarioResults = [];
        
        // Dispatch the event only if not explicitly skipped
        // This prevents infinite recursion when called from an event handler
        if (!skipEvent) {
            const event = new CustomEvent('calculationsCleared');
            document.dispatchEvent(event);
        }
    }
    
    // Get most recent result for each ISO code
    function getMostRecentResults() {
        if (!scenarioResults || scenarioResults.length === 0) {
            return [];
        }
        
        // Group by ISO code (use the most recent result for each ISO)
        const isoGroups = {};
        
        // Process in reverse order to get most recent result for each ISO first
        [...scenarioResults].reverse().forEach(result => {
            const iso = result.isoCode;
            // Only add if this ISO isn't already in the groups (this gives us the most recent)
            if (!isoGroups[iso]) {
                isoGroups[iso] = result;
            }
        });
        
        return Object.values(isoGroups);
    }
    
    // Format effect value as percentage with 2 decimal places
    function formatEffectValue(value) {
        if (typeof value !== 'number') {
            return '0.00%';
        }
        return (value * 100).toFixed(2) + '%';
    }
    
    // Remove a specific country result
    function removeCountryResult(isoCode) {
        if (!isoCode || !scenarioResults || scenarioResults.length === 0) {
            console.warn(`Cannot remove country ${isoCode}: No scenario results or invalid ISO code`);
            return false;
        }
        
        //console.log(`Removing calculation results for country ${isoCode}`);
        //console.log(`Before removal: ${scenarioResults.length} scenario results`);
        
        // Filter out all entries for the specified ISO code
        const originalLength = scenarioResults.length;
        scenarioResults = scenarioResults.filter(result => result.isoCode !== isoCode);
        
        // Check if any results were actually removed
        const wasRemoved = originalLength !== scenarioResults.length;
        
        //console.log(`After removal: ${scenarioResults.length} scenario results (${originalLength - scenarioResults.length} removed)`);
        
        // Additional logging to help diagnose issues
        if (!wasRemoved) {
            console.warn(`No results found for country ${isoCode} to remove`);
            // Log the available ISO codes for debugging
            const availableISOs = new Set(scenarioResults.map(result => result.isoCode));
            //console.log('Available ISO codes in results:', [...availableISOs]);
        }
        
        if (wasRemoved) {
            // Create event to notify that a calculation was removed
            const event = new CustomEvent('calculationRemoved', {
                detail: { isoCode: isoCode }
            });
            document.dispatchEvent(event);
            
            //console.log(`Removed calculation results for ${isoCode}`);
        } else {
            //console.log(`No calculation results found for ${isoCode}`);
        }
        
        return wasRemoved;
    }
    
    // Public API
    return {
        processTariffData,
        getScenarioResults,
        getMostRecentResults,
        clearScenarioResults,
        removeCountryResult,
        formatEffectValue,
        customBEAOrder,
        get currentTariffData() { return currentTariffData; } // Expose current tariff data as a getter
    };
})();

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check for tariff data in localStorage (passed from tariff editor)
    function checkForImportedData() {
        try {
            const storedData = localStorage.getItem('tariffEditorData');
            if (storedData) {
                const data = JSON.parse(storedData);                
                // Process the imported tariff data
                TariffCalculations.processTariffData(data)
                    .then(success => {
                        if (success) {
                           //console.log('Tariff data processed successfully');
                        } else {
                            console.error('Failed to process tariff data');
                        }
                    });
                
                // Clear data after loading to prevent stale data on manual refresh
                // Don't clear it if we're coming directly from the tariff editor
                const urlParams = new URLSearchParams(window.location.search);
                if (!urlParams.get('source')) {
                    localStorage.removeItem('tariffEditorData');
                }
                
                return true;
            }
        } catch (e) {
            console.error('Error loading data from localStorage:', e);
        }
        return false;
    }
    
    // Check for imported data on page load
    checkForImportedData();
    
    // Listen for storage events (another tab changing localStorage)
    window.addEventListener('storage', function(e) {
        if (e.key === 'tariffEditorData' && e.newValue) {
            checkForImportedData();
        }
    });
});

// Make the calculation module globally available
window.TariffCalculations = TariffCalculations;