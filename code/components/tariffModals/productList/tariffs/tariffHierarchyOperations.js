// Tariff hierarchy operations module - IMPROVED VERSION WITH BIDIRECTIONAL PROPAGATION

/**
 * Update tariff values for the hierarchical structure
 * @param {string} levelType - Level type ('section', 'chapter', or 'hs4')
 * @param {string} sectionId - Section ID
 * @param {string|null} chapterId - Chapter ID (if levelType is 'chapter' or 'hs4')
 * @param {string|null} hs4Code - HS4 code (if levelType is 'hs4')
 * @param {number} newValue - New tariff value
 * @param {string} isoCode - Country ISO code
 * @param {Object} currentTariffs - Object to store current tariffs
 * @param {Object} directlySetTariffs - Object to track which tariffs were directly set by the user
 * @param {Object} sectionToHs4Mapping - Hierarchical mapping of sections to HS codes
 * @param {Function} getHsCodeWeight - Function to get weight for HS code
 * @param {Function} getTariffData - Function to get tariff data
 * @param {Object} modifiedOriginalTariffs - Object to store modified original tariffs
 * @param {Set} expandedSections - Set of expanded section indices
 * @param {Set} expandedChapters - Set of expanded chapter indices
 * @param {Function} saveExpandedState - Function to save expanded state
 * @param {Function} refreshView - Function to refresh the view
 */
export function updateTariff(
    levelType, 
    sectionId, 
    chapterId, 
    hs4Code, 
    newValue, 
    isoCode, 
    currentTariffs, 
    directlySetTariffs,
    sectionToHs4Mapping, 
    getHsCodeWeight, 
    getTariffData,
    modifiedOriginalTariffs,
    expandedSections, 
    expandedChapters,
    saveExpandedState,
    refreshView
) {
    if (!isoCode) {
        console.error(`No ISO code provided`);
        return;
    }
    
    // Save expanded state
    if (saveExpandedState) {
        saveExpandedState(expandedSections, expandedChapters);
    }
    
    // Initialize the currentTariffs object for this country if it doesn't exist
    if (!currentTariffs[isoCode]) {
        currentTariffs[isoCode] = {};
    }
    
    // Get original section tariff to use as fallback
    const originalSectionTariff = getTariffData(isoCode, sectionId)?.usTariff || 0;
    
    // Get reference to the section data
    const section = sectionToHs4Mapping[sectionId];
    if (!section) {
        console.error(`Section ${sectionId} not found in mapping`);
        return;
    }
    
    // Handle tariff updates differently based on level
    if (levelType === 'section') {
        // SECTION LEVEL - Direct change by user
        currentTariffs[isoCode][sectionId] = newValue;
        
        // Mark as directly set
        if (!directlySetTariffs[isoCode]) directlySetTariffs[isoCode] = {};
        directlySetTariffs[isoCode][sectionId] = true;
        
        // Propagate down to all chapters and HS4 codes
        Object.keys(section.chapters).forEach(chapId => {
            // Set chapter tariff to match section
            currentTariffs[isoCode][`${sectionId}_${chapId}`] = newValue;
            directlySetTariffs[isoCode][`${sectionId}_${chapId}`] = false; // Not directly set
            
            // Override all HS4 tariffs in this chapter to match the chapter tariff
            const chapter = section.chapters[chapId];
            Object.keys(chapter.subcategories || {}).forEach(hsCode => {
                currentTariffs[isoCode][`${sectionId}_${chapId}_${hsCode}`] = newValue;
                directlySetTariffs[isoCode][`${sectionId}_${chapId}_${hsCode}`] = false; // Not directly set
            });
        });
    } 
    else if (levelType === 'chapter') {
        // Get original chapter tariff for calculating change
        const originalChapterTariff = 
            currentTariffs[isoCode][`${sectionId}_${chapterId}`] !== undefined ?
            currentTariffs[isoCode][`${sectionId}_${chapterId}`] : 
            originalSectionTariff;
        
        // Calculate the change from the original chapter tariff
        const change = newValue - originalChapterTariff;
        
        // CHAPTER LEVEL - Direct change by user
        currentTariffs[isoCode][`${sectionId}_${chapterId}`] = newValue;
        
        // Mark as directly set
        if (!directlySetTariffs[isoCode]) directlySetTariffs[isoCode] = {};
        directlySetTariffs[isoCode][`${sectionId}_${chapterId}`] = true;
        
        // Propagate down to all HS4 codes in this chapter
        const chapter = section.chapters[chapterId];
        Object.keys(chapter.subcategories || {}).forEach(hsCode => {
            // Set HS4 tariff to match chapter tariff, but only if not directly set by user
            if (!directlySetTariffs[isoCode][`${sectionId}_${chapterId}_${hsCode}`]) {
                currentTariffs[isoCode][`${sectionId}_${chapterId}_${hsCode}`] = newValue;
            }
        });
        
        // Propagate up to section using weighted change
        const chapterWeight = getHsCodeWeight(sectionId, chapterId) || 0;
        if (chapterWeight > 0) {
            // If we have a current section tariff, adjust it based on the weighted change
            if (currentTariffs[isoCode][sectionId] !== undefined) {
                currentTariffs[isoCode][sectionId] += change * chapterWeight;
            } else {
                // If no current section tariff, use the original and apply weighted change
                currentTariffs[isoCode][sectionId] = originalSectionTariff + (change * chapterWeight);
            }
            
            // Section was not directly set by user
            directlySetTariffs[isoCode][sectionId] = false;
        }
    } 
    else if (levelType === 'hs4') {
        // Get original HS4 tariff for calculating change
        const originalHS4Tariff = 
            currentTariffs[isoCode][`${sectionId}_${chapterId}_${hs4Code}`] !== undefined ?
            currentTariffs[isoCode][`${sectionId}_${chapterId}_${hs4Code}`] :
            originalSectionTariff;
        
        // Calculate the change
        const change = newValue - originalHS4Tariff;
        
        // HS4 LEVEL - Direct change by user
        currentTariffs[isoCode][`${sectionId}_${chapterId}_${hs4Code}`] = newValue;
        
        // Mark as directly set
        if (!directlySetTariffs[isoCode]) directlySetTariffs[isoCode] = {};
        directlySetTariffs[isoCode][`${sectionId}_${chapterId}_${hs4Code}`] = true;
        
        // Get the chapter data
        const chapter = section.chapters[chapterId];
        if (!chapter) {
            console.error(`Chapter ${chapterId} not found in section ${sectionId}`);
            return;
        }
        
        // Check if we have cached chapter weights
        let totalChapterWeight = 0;
        let relativeWeight = 0;
        let hs4Weight = 0;
        
        // Try to get weights from cache (passed via modifiedOriginalTariffs.cachedChapterWeights)
        if (modifiedOriginalTariffs && 
            modifiedOriginalTariffs.cachedChapterWeights && 
            modifiedOriginalTariffs.cachedChapterWeights[isoCode] && 
            modifiedOriginalTariffs.cachedChapterWeights[isoCode][sectionId] && 
            modifiedOriginalTariffs.cachedChapterWeights[isoCode][sectionId][chapterId]) {
            
            // Use cached values
            const cachedData = modifiedOriginalTariffs.cachedChapterWeights[isoCode][sectionId][chapterId];
            totalChapterWeight = cachedData.totalWeight;
            hs4Weight = getHsCodeWeight(sectionId, hs4Code) || 0;
            
            // Calculate relative weight
            if (totalChapterWeight > 0 && hs4Weight > 0) {
                relativeWeight = hs4Weight / totalChapterWeight;
            }
        } else {
            console.warn(`No cached chapter weights found for ${isoCode} ${sectionId} ${chapterId}`);
            // Fallback to calculating weights on-the-fly
            totalChapterWeight = 0;
            Object.keys(chapter.subcategories || {}).forEach(hsCode => {
                const weight = getHsCodeWeight(sectionId, hsCode) || 0;
                totalChapterWeight += weight;
            });
            
            // Get weight for this specific HS4 code
            hs4Weight = getHsCodeWeight(sectionId, hs4Code) || 0;
            
            // Calculate relative weight
            if (totalChapterWeight > 0 && hs4Weight > 0) {
                relativeWeight = hs4Weight / totalChapterWeight;
            }
        }
        
        // Propagate up to chapter using weighted change
        if (totalChapterWeight > 0 && hs4Weight > 0) {
            
            // If we have a current chapter tariff, adjust it based on the weighted change
            if (currentTariffs[isoCode][`${sectionId}_${chapterId}`] !== undefined) {
                currentTariffs[isoCode][`${sectionId}_${chapterId}`] += change * relativeWeight;
            } else {
                // If no current chapter tariff, use the original and apply weighted change
                currentTariffs[isoCode][`${sectionId}_${chapterId}`] = originalSectionTariff + (change * relativeWeight);
            }
            
            // Chapter was not directly set by user
            directlySetTariffs[isoCode][`${sectionId}_${chapterId}`] = false;
            
            // Propagate to section level using direct HS4 weight to section
            if (hs4Weight > 0) {
                // If we have a current section tariff, adjust it based on the weighted change
                if (currentTariffs[isoCode][sectionId] !== undefined) {
                    currentTariffs[isoCode][sectionId] += change * hs4Weight;
                } else {
                    // If no current section tariff, use the original and apply weighted change
                    currentTariffs[isoCode][sectionId] = originalSectionTariff + (change * hs4Weight);
                }
                
                // Section was not directly set by user
                directlySetTariffs[isoCode][sectionId] = false;
            }
        }
    }
    
    // Update affected displays without a full refresh
    // We'll handle this in a separate function to avoid imports here
    if (refreshView) {
        // Check if the selective update function exists - if not, fall back to full refresh
        if (typeof window.updateAffectedTariffs === 'function') {
            window.updateAffectedTariffs(levelType, sectionId, chapterId, hs4Code, isoCode, currentTariffs);
        } else {
            refreshView();
        }
    }
}

/**
 * Update original tariff values in a hierarchical tariff structure
 * This also uses bidirectional propagation, same as updateTariff
 */
export function updateOriginalTariff(
    levelType, 
    sectionId, 
    chapterId, 
    hs4Code, 
    newValue, 
    isoCode, 
    modifiedOriginalTariffs, 
    sectionToHs4Mapping, 
    getHsCodeWeight, 
    getTariffOriginalData,
    expandedSections, 
    expandedChapters,
    saveExpandedState,
    refreshView
) {
    // Create empty directlySetTariffs object to use with modifiedOriginalTariffs
    const directlySetOriginalTariffs = {};
    if (!directlySetOriginalTariffs[isoCode]) {
        directlySetOriginalTariffs[isoCode] = {};
    }
    
    // Call updateTariff with modifiedOriginalTariffs
    updateTariff(
        levelType, 
        sectionId, 
        chapterId, 
        hs4Code, 
        newValue, 
        isoCode, 
        modifiedOriginalTariffs, 
        directlySetOriginalTariffs,
        sectionToHs4Mapping, 
        getHsCodeWeight, 
        getTariffOriginalData,
        null,  // Don't need to pass modifiedOriginalTariffs again
        expandedSections, 
        expandedChapters,
        saveExpandedState,
        refreshView
    );
}

/**
 * Create a hierarchical tariff editor UI
 * @param {string} levelType - Level type ('section', 'chapter', or 'hs4')
 * @param {string} sectionId - Section ID
 * @param {string|null} chapterId - Chapter ID (if levelType is 'chapter' or 'hs4')
 * @param {string|null} hs4Code - HS4 code (if levelType is 'hs4')
 * @param {Object} options - Configuration options
 * @returns {HTMLElement} - The created editor DOM element
 */
export function createTariffEditor(
    levelType,
    sectionId,
    chapterId,
    hs4Code,
    options
) {
    const {
        isoCode,
        currentTariffs,
        modifiedOriginalTariffs,
        getTariffOriginalDataWrapper,
        getTariffDataWrapper,
        updateOriginalTariff,
        updateTariff
    } = options;
    
    // Get the appropriate hierarchy key
    let hierarchyKey = null;
    if (levelType === 'section') {
        hierarchyKey = sectionId;
    } else if (levelType === 'chapter') {
        hierarchyKey = `${sectionId}_${chapterId}`;
    } else if (levelType === 'hs4') {
        hierarchyKey = `${sectionId}_${chapterId}_${hs4Code}`;
    }
    
    // Get original tariff value from base data
    const originalTariffData = getTariffOriginalDataWrapper(isoCode, sectionId);
    const originalTariff = originalTariffData?.usTariff || 0;
    
    // Get current tariff - either set value or original
    let currentTariff = originalTariff;
    if (currentTariffs[isoCode] && currentTariffs[isoCode][hierarchyKey] !== undefined) {
        currentTariff = currentTariffs[isoCode][hierarchyKey];
    }
    
    // Create container for the editor
    const container = document.createElement('div');
    container.className = 'tariff-editors-container';
    
    // Create original tariff editor
    const originalEditorContainer = document.createElement('div');
    originalEditorContainer.className = 'tariff-editor-column';
    
    const originalLabel = document.createElement('div');
    originalLabel.className = 'tariff-editor-label';
    originalLabel.textContent = 'Original';
    originalLabel.style.color = '#2196F3';
    
    const originalEditor = document.createElement('div');
    originalEditor.className = 'tariff-editor original';
    
    // Create input field for original tariff first (before buttons)
    const originalInputField = document.createElement('input');
    originalInputField.type = 'text';
    originalInputField.value = originalTariff.toFixed(2);
    originalInputField.dataset.originalValue = originalTariff.toFixed(2);
    
    // Create minus button for original tariff
    const originalMinusBtn = document.createElement('button');
    originalMinusBtn.textContent = '-';
    originalMinusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Get the current value from the input field
        const currentValue = parseFloat(originalInputField.value) || 0;
        const newValue = Math.max(0, currentValue - 0.1);
        updateOriginalTariff(levelType, sectionId, chapterId, hs4Code, parseFloat(newValue.toFixed(2)));
    });
    
    // Only allow numbers and decimal point
    originalInputField.addEventListener('input', (e) => {
        const value = e.target.value;
        // Validate input - only allow numbers and up to one decimal point
        if (!/^(\d*\.?\d{0,2})$/.test(value)) {
            e.target.value = e.target.dataset.originalValue;
        } else {
            e.target.dataset.originalValue = value;
        }
    });
    
    // Update on blur and Enter key
    originalInputField.addEventListener('blur', (e) => {
        if (e.target.value !== '') {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue) && newValue >= 0) {
                updateOriginalTariff(levelType, sectionId, chapterId, hs4Code, parseFloat(newValue.toFixed(2)));
            } else {
                e.target.value = originalTariff.toFixed(2);
            }
        } else {
            e.target.value = originalTariff.toFixed(2);
        }
    });
    
    originalInputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    });
    
    // Create plus button for original tariff
    const originalPlusBtn = document.createElement('button');
    originalPlusBtn.textContent = '+';
    originalPlusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Get the current value from the input field
        const currentValue = parseFloat(originalInputField.value) || 0;
        const newValue = currentValue + 0.1;
        updateOriginalTariff(levelType, sectionId, chapterId, hs4Code, parseFloat(newValue.toFixed(2)));
    });
    
    // Assemble original editor
    originalEditor.appendChild(originalMinusBtn);
    originalEditor.appendChild(originalInputField);
    originalEditor.appendChild(originalPlusBtn);
    
    originalEditorContainer.appendChild(originalLabel);
    originalEditorContainer.appendChild(originalEditor);
    
    // Create current tariff editor
    const currentEditorContainer = document.createElement('div');
    currentEditorContainer.className = 'tariff-editor-column';
    
    const currentLabel = document.createElement('div');
    currentLabel.className = 'tariff-editor-label';
    currentLabel.textContent = 'Current';
    currentLabel.style.color = '#f44336';
    
    const currentEditor = document.createElement('div');
    currentEditor.className = 'tariff-editor current';
    
    // Create input field for current tariff first (before buttons)
    const currentInputField = document.createElement('input');
    currentInputField.type = 'text';
    currentInputField.value = currentTariff.toFixed(2);
    currentInputField.dataset.originalValue = currentTariff.toFixed(2);
    
    // Create minus button for current tariff
    const currentMinusBtn = document.createElement('button');
    currentMinusBtn.textContent = '-';
    currentMinusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Get the current value from the input field
        const currentValue = parseFloat(currentInputField.value) || 0;
        const newValue = Math.max(0, currentValue - 0.1);
        updateTariff(levelType, sectionId, chapterId, hs4Code, parseFloat(newValue.toFixed(2)));
    });
    
    // Only allow numbers and decimal point
    currentInputField.addEventListener('input', (e) => {
        const value = e.target.value;
        // Validate input - only allow numbers and up to one decimal point
        if (!/^(\d*\.?\d{0,2})$/.test(value)) {
            e.target.value = e.target.dataset.originalValue;
        } else {
            e.target.dataset.originalValue = value;
        }
    });
    
    // Update on blur and Enter key
    currentInputField.addEventListener('blur', (e) => {
        if (e.target.value !== '') {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue) && newValue >= 0) {
                updateTariff(levelType, sectionId, chapterId, hs4Code, parseFloat(newValue.toFixed(2)));
            } else {
                e.target.value = currentTariff.toFixed(2);
            }
        } else {
            e.target.value = currentTariff.toFixed(2);
        }
    });
    
    currentInputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    });
    
    // Create plus button for current tariff
    const currentPlusBtn = document.createElement('button');
    currentPlusBtn.textContent = '+';
    currentPlusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Get the current value from the input field
        const currentValue = parseFloat(currentInputField.value) || 0;
        const newValue = currentValue + 0.1;
        updateTariff(levelType, sectionId, chapterId, hs4Code, parseFloat(newValue.toFixed(2)));
    });
    
    // Assemble current editor
    currentEditor.appendChild(currentMinusBtn);
    currentEditor.appendChild(currentInputField);
    currentEditor.appendChild(currentPlusBtn);
    
    currentEditorContainer.appendChild(currentLabel);
    currentEditorContainer.appendChild(currentEditor);
    
    // Assemble container with both editors
    container.appendChild(originalEditorContainer);
    container.appendChild(currentEditorContainer);
    
    return container;
}

/**
 * Get hierarchical tariff data for display
 * @param {string} levelType - Level type ('section', 'chapter', or 'hs4')
 * @param {string} sectionId - Section ID
 * @param {string|null} chapterId - Chapter ID (if levelType is 'chapter' or 'hs4')
 * @param {string|null} hs4Code - HS4 code (if levelType is 'hs4')
 * @param {Object} options - Configuration options including:
 *   @param {string} options.isoCode - Country ISO code
 *   @param {Object} options.currentTariffs - Current (modified) tariff values
 *   @param {Object} options.modifiedOriginalTariffs - Modified original tariffs
 *   @param {Object} options.directlySetTariffs - Object tracking which tariffs were directly set by user
 *   @param {Function} options.getTariffOriginalDataWrapper - Function to get original tariff data
 * @returns {Object} - Object containing tariff data with isDirectlySet property
 */
export function getHierarchicalTariffData(
    levelType,
    sectionId,
    chapterId,
    hs4Code,
    options
) {
    const {
        isoCode,
        currentTariffs,
        modifiedOriginalTariffs,
        directlySetTariffs,
        getTariffOriginalDataWrapper
    } = options;
    
    // Get hierarchical key based on level type
    let hierarchyKey;
    if (levelType === 'section') {
        hierarchyKey = sectionId;
    } else if (levelType === 'chapter') {
        hierarchyKey = `${sectionId}_${chapterId}`;
    } else if (levelType === 'hs4') {
        hierarchyKey = `${sectionId}_${chapterId}_${hs4Code}`;
    }
    
    // Get original tariff from base data
    const originalTariffData = getTariffOriginalDataWrapper(isoCode, sectionId);
    const originalTariff = originalTariffData?.usTariff || 0;
    
    // Get current tariff - either explicitly set or use original
    let currentTariff = originalTariff;
    if (currentTariffs[isoCode] && currentTariffs[isoCode][hierarchyKey] !== undefined) {
        currentTariff = currentTariffs[isoCode][hierarchyKey];
    }
    
    // Calculate percent change
    const percentChange = originalTariff !== 0
        ? ((currentTariff - originalTariff) / originalTariff) * 100
        : 0;
    
    // Check if this tariff was directly set by user
    const isDirectlySet = directlySetTariffs?.[isoCode]?.[hierarchyKey] === true;
    
    return {
        originalTariff,
        currentTariff,
        percentChange,
        hierarchyKey,
        isDirectlySet
    };
}