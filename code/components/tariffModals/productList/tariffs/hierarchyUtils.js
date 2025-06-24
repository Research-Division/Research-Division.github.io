// Helper functions for the hierarchical tariff editor

/**
 * Update the UI sections with tariff data
 * @param {string} levelType - Level type ('section', 'chapter', or 'hs4')
 * @param {string} sectionId - Section ID
 * @param {string|null} chapterId - Chapter ID (if levelType is 'chapter' or 'hs4')
 * @param {string|null} hs4Code - HS4 code (if levelType is 'hs4')
 * @param {Object} tariffData - Tariff data from getHierarchicalTariffData
 * @param {Function} createTariffEditorFn - Function to create tariff editor
 * @param {Function} getHsCodeWeightFn - Function to get weight for HS code
 * @param {Function} getBeaSectionWeightFn - Function to get BEA weight for a section
 * @returns {HTMLElement} - HTML element for the tariff information
 */
export function createTariffInfoElement(levelType, sectionId, chapterId, hs4Code, tariffData, createTariffEditorFn, getHsCodeWeightFn, getBeaSectionWeightFn) {
    const tariffInfo = document.createElement('div');
    tariffInfo.className = 'tariff-info';
    
    // Get weights based on level type
    let weightHTML = '';
    
    // Section level weight - use BEA section weights
    if (levelType === 'section' && getBeaSectionWeightFn) {
        const sectionWeight = getBeaSectionWeightFn(sectionId);
        if (sectionWeight !== null) {
            weightHTML = `<span class="weight-badge">BEA Weight: ${sectionWeight.toFixed(4)}</span>`;
        }
    } 
    // Chapter level weight - use HS weights
    else if (levelType === 'chapter' && getHsCodeWeightFn) {
        const chapterWeight = getHsCodeWeightFn(sectionId, chapterId);
        if (chapterWeight !== null) {
            weightHTML = `<span class="weight-badge">Weight: ${chapterWeight.toFixed(4)}</span>`;
        }
    } 
    // HS4 level weights - show both weights
    else if (levelType === 'hs4' && getHsCodeWeightFn) {
        // HS4 to Section weight (direct)
        const hs4SectionWeight = getHsCodeWeightFn(sectionId, hs4Code);
        
        if (hs4SectionWeight !== null) {
            // Build the weight display HTML for section weight
            weightHTML = `<span class="weight-badge">Weight (to Section): ${hs4SectionWeight.toFixed(4)}</span>`;
            
            // Calculate the within-chapter weight (requires a special calculateWithinChapterWeight function)
            // This is more complex because we'd need access to all HS4 codes in the chapter
            
            // For demo purposes, derive an approximate within-chapter weight:
            // Get the chapter weight
            const chapterWeight = getHsCodeWeightFn(sectionId, chapterId);
            
            // If both weights exist, we can calculate a rough approximation
            if (chapterWeight !== null && chapterWeight > 0) {
                const approximateWithinChapterWeight = hs4SectionWeight / chapterWeight;
                
                // Only show if it's a reasonable value (less than 1)
                if (approximateWithinChapterWeight <= 1) {
                    weightHTML += `<br><span class="weight-badge">Weight (within Chapter): ${approximateWithinChapterWeight.toFixed(4)}</span>`;
                }
            }
        }
    }
    
    if (tariffData) {
        const originalTariffValue = tariffData.originalTariff.toFixed(2);
        const currentTariffValue = tariffData.currentTariff.toFixed(2);
        
        // Container for all info
        const infoContainer = document.createElement('div');
        infoContainer.className = 'tariff-info-container';
        
        // Weight info on the left if available
        if (weightHTML) {
            const weightDiv = document.createElement('div');
            weightDiv.className = 'weight-info';
            weightDiv.innerHTML = weightHTML;
            infoContainer.appendChild(weightDiv);
        }
        
        // Tariff badge with current/original values
        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'tariff-badge';
        
        // Create unique ID for this tariff element to allow targeted updates
        const tariffId = `tariff-${levelType}-${sectionId}${chapterId ? '-'+chapterId : ''}${hs4Code ? '-'+hs4Code : ''}`;
        badgeSpan.id = tariffId;
        
        badgeSpan.innerHTML = `
            <span style="color: #2196F3">${originalTariffValue}%</span> → 
            <span style="color: #f44336" class="current-value">${currentTariffValue}%</span>
            ${Math.abs(tariffData.currentTariff - tariffData.originalTariff) > 0.001 ? 
                `(<span style="color: #f44336" class="percent-change">${isFinite(tariffData.percentChange) ? tariffData.percentChange.toFixed(1) + '%' : 'N/A'}</span>)` : ''}
        `;
        infoContainer.appendChild(badgeSpan);
        
        tariffInfo.appendChild(infoContainer);
        
        // Add tariff editor
        const editor = createTariffEditorFn(levelType, sectionId, chapterId, hs4Code);
        tariffInfo.appendChild(editor);
    } else {
        // Show placeholder with same sizing for consistency
        const infoContainer = document.createElement('div');
        infoContainer.className = 'tariff-info-container';
        
        // Weight info on the left if available
        if (weightHTML) {
            const weightDiv = document.createElement('div');
            weightDiv.className = 'weight-info';
            weightDiv.innerHTML = weightHTML;
            infoContainer.appendChild(weightDiv);
        }
        
        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'tariff-badge tariff-na';
        badgeSpan.textContent = 'No Tariff Data';
        infoContainer.appendChild(badgeSpan);
        
        tariffInfo.appendChild(infoContainer);
    }
    
    return tariffInfo;
}

/**
 * Adds CSS styles for the tariff hierarchy
 */
export function addTariffHierarchyStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Styles for direct vs calculated indicators */
        .directly-set {
            background-color: rgba(76, 175, 80, 0.1);
            border: 1px solid rgba(76, 175, 80, 0.2);
        }
        .calculated {
            background-color: rgba(96, 125, 139, 0.05);
            border: 1px solid rgba(96, 125, 139, 0.1);
        }
        .legend {
            margin-top: 10px;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 8px;
            background-color: #f5f5f5;
            border-radius: 4px;
            width: fit-content;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .legend-icon {
            font-size: 0.8em;
        }
        .legend-text {
            font-size: 0.9em;
        }
        
        /* Styles for weight and tariff info layout */
        .tariff-info-container {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 10px;
        }
        .weight-info {
            min-width: 180px;
            font-size: 0.85em;
            color: #555;
        }
        .weight-badge {
            background-color: rgba(33, 150, 243, 0.1);
            border: 1px solid rgba(33, 150, 243, 0.2);
            border-radius: 4px;
            padding: 3px 6px;
            display: inline-block;
        }
        .tariff-badge {
            padding: 3px 8px;
            border-radius: 4px;
            display: inline-block;
        }
    `;
    document.head.appendChild(styleElement);
}

/**
 * Creates a legend for the tariff hierarchy
 * @returns {HTMLElement} - The legend element
 */
export function createTariffLegend() {
    // Return an empty div since we're not using legends anymore
    return document.createElement('div');
}

/**
 * Update a specific tariff display without rebuilding the entire DOM
 * @param {string} levelType - Level type ('section', 'chapter', or 'hs4')
 * @param {string} sectionId - Section ID
 * @param {string|null} chapterId - Chapter ID (if levelType is 'chapter' or 'hs4')
 * @param {string|null} hs4Code - HS4 code (if levelType is 'hs4')
 * @param {Object} tariffData - Updated tariff data
 * @returns {boolean} - Whether the update was successful
 */
export function updateTariffDisplay(levelType, sectionId, chapterId, hs4Code, tariffData) {
    // Generate the same ID used when creating the element
    const tariffId = `tariff-${levelType}-${sectionId}${chapterId ? '-'+chapterId : ''}${hs4Code ? '-'+hs4Code : ''}`;
    
    // Find the element by ID
    const badgeSpan = document.getElementById(tariffId);
    if (!badgeSpan) {
        return false; // Element not found
    }
    
    // Format the tariff values
    const originalTariffValue = tariffData.originalTariff.toFixed(2);
    const currentTariffValue = tariffData.currentTariff.toFixed(2);
    const hasChange = Math.abs(tariffData.currentTariff - tariffData.originalTariff) > 0.001;
    const percentChange = hasChange && isFinite(tariffData.percentChange) ? 
        tariffData.percentChange.toFixed(1) + '%' : 'N/A';
    
    // Update just the current value and percent change
    const currentValueElement = badgeSpan.querySelector('.current-value');
    if (currentValueElement) {
        currentValueElement.textContent = `${currentTariffValue}%`;
    }
    
    // Update the percent change if it exists
    const percentChangeElement = badgeSpan.querySelector('.percent-change');
    if (percentChangeElement) {
        percentChangeElement.textContent = percentChange;
    } else if (hasChange) {
        // If the percent change element doesn't exist but we now have a change, add it
        const arrowElement = badgeSpan.querySelector('span:nth-child(2)');
        if (arrowElement) {
            const changeElement = document.createElement('span');
            changeElement.className = 'percent-change';
            changeElement.style.color = '#f44336';
            changeElement.textContent = percentChange;
            badgeSpan.appendChild(document.createTextNode(' ('));
            badgeSpan.appendChild(changeElement);
            badgeSpan.appendChild(document.createTextNode(')'));
        }
    }
    
    // IMPORTANT: Also update the input fields in the editor
    const tariffInfoContainer = badgeSpan.closest('.tariff-info');
    if (tariffInfoContainer) {
        // Update the original tariff input
        const originalInput = tariffInfoContainer.querySelector('.tariff-editor.original input');
        if (originalInput) {
            originalInput.value = originalTariffValue;
            originalInput.dataset.originalValue = originalTariffValue;
        }
        
        // Update the current tariff input
        const currentInput = tariffInfoContainer.querySelector('.tariff-editor.current input');
        if (currentInput) {
            currentInput.value = currentTariffValue;
            currentInput.dataset.originalValue = currentTariffValue;
        }
    }
    
    return true;
}