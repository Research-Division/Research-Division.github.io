// UI operations module

/**
 * Toggle visibility of a container element
 * @param {HTMLElement} headerElement - The header element that controls the toggle
 * @param {HTMLElement} containerElement - The container element to toggle
 */
export function toggleContainer(headerElement, containerElement) {
    const isVisible = containerElement.style.display === 'block';
    containerElement.style.display = isVisible ? 'none' : 'block';
    
    // Update toggle icon
    const toggleIcon = headerElement.querySelector('.toggle-icon');
    toggleIcon.textContent = isVisible ? '▶' : '▼';
}

/**
 * Populate the country dropdown based on section_weights data
 * @param {Object} sectionWeights - Section weights data
 * @param {Function} getCountryFromIso - Function to convert ISO code to country name
 */
export function populateCountryDropdown(sectionWeights, getCountryFromIso) {
    const countrySelect = document.getElementById('country-select');
    countrySelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a country --';
    countrySelect.appendChild(defaultOption);
    
    // Add countries from section_weights.json
    Object.keys(sectionWeights).forEach(iso => {
        const option = document.createElement('option');
        option.value = iso;
        option.textContent = getCountryFromIso(iso);
        countrySelect.appendChild(option);
    });
    
    // Set default selected country
    if (countrySelect.options.length > 1) {
        countrySelect.selectedIndex = 1;
        return countrySelect.value; // Return the selected country
    }
    
    return null;
}

/**
 * Save the current expanded state of sections and chapters
 * @param {Set} expandedSections - Set to store expanded section indices
 * @param {Set} expandedChapters - Set to store expanded chapter indices
 */
export function saveExpandedState(expandedSections, expandedChapters) {
    expandedSections.clear();
    expandedChapters.clear();
    
    // Save expanded sections
    document.querySelectorAll('.section-item').forEach((sectionItem, index) => {
        const container = document.querySelectorAll('.chapter-container')[index];
        if (container && container.style.display === 'block') {
            expandedSections.add(index);
        }
    });
    
    // Save expanded chapters
    document.querySelectorAll('.chapter-item').forEach((chapterItem, index) => {
        const container = document.querySelectorAll('.hs4-container')[index];
        if (container && container.style.display === 'block') {
            expandedChapters.add(index);
        }
    });
}

/**
 * Restore the expanded state of sections and chapters
 * @param {Set} expandedSections - Set of expanded section indices
 * @param {Set} expandedChapters - Set of expanded chapter indices
 */
export function restoreExpandedState(expandedSections, expandedChapters) {
    // Restore expanded sections
    document.querySelectorAll('.section-item').forEach((sectionItem, index) => {
        if (expandedSections.has(index)) {
            const container = document.querySelectorAll('.chapter-container')[index];
            if (container) {
                container.style.display = 'block';
                const toggleIcon = sectionItem.querySelector('.toggle-icon');
                if (toggleIcon) toggleIcon.textContent = '▼';
            }
        }
    });
    
    // Restore expanded chapters
    document.querySelectorAll('.chapter-item').forEach((chapterItem, index) => {
        if (expandedChapters.has(index)) {
            const container = document.querySelectorAll('.hs4-container')[index];
            if (container) {
                container.style.display = 'block';
                const toggleIcon = chapterItem.querySelector('.toggle-icon');
                if (toggleIcon) toggleIcon.textContent = '▼';
            }
        }
    });
}