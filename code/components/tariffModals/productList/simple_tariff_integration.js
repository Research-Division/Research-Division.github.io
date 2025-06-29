// Simple Tariff Integration with Bidirectional Propagation

// Import the tariff propagation module
import TariffPropagation from './tariffs/simpleTariffPropagation.js';

// Initialize the propagation system
const tariffPropagator = new TariffPropagation();

// Global variables
let selectedCountry = null;
let sectionToHs4Mapping = {};
let sectionWeights = {};
let beaSectionWeights = {};
let beaImportWeights = {};
let bilateralTariffs = {};
let sectionIdToName = {};
let currentPassThroughRate = 1.0; // Default 100%
let showOriginalAndCurrentTariffs = false; // Toggle between tariff modes

// Maps between ISO codes and country names
const isoToCountry = new Map();
const countryToIso = new Map();

// Store the expanded state of sections and chapters
let expandedSections = new Set();
let expandedChapters = new Set();

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load required data
    await Promise.all([
      loadJSON(DataPaths.meta.section_to_chapters).then(data => sectionToHs4Mapping = data),
      loadJSON(DataPaths.calculations.hs_section_weights).then(data => sectionWeights = data),
      loadJSON(DataPaths.calculations.bea_section_weights).then(data => beaSectionWeights = data),
      loadJSON(DataPaths.calculations.importVector).then(data => beaImportWeights = data),
      loadJSON(DataPaths.meta.country_iso_mapping).then(data => {
        // Initialize country mappings
        data.forEach(entry => {
          countryToIso.set(entry.country, entry.iso);
          isoToCountry.set(entry.iso, entry.country);
          // Also create a mapping for direct access
          if (!window.isoToCountryName) {
            window.isoToCountryName = {};
          }
          window.isoToCountryName[entry.iso] = entry.country;
        });
      }),
      loadJSON(DataPaths.bilateral_tariffs.section.weighted_winsorized).then(data => {
        bilateralTariffs = data;
        // Create mapping between section IDs and names
        if (Object.keys(bilateralTariffs).length > 0) {
          const anySample = Object.values(bilateralTariffs)[0];
          if (anySample && anySample.sectors) {
            sectionIdToName = {};
            anySample.sectors.forEach(s => {
              if (s.code && s.name) {
                sectionIdToName[s.code.toString()] = s.name;
              }
            });
          }
        }
      })
    ]);

    // Initialize the tariff propagator
    tariffPropagator.initialize({
      sectionToHs4Mapping,
      sectionWeights,
      beaSectionWeights,
      beaImportWeights,
      getTariffOriginalData
    });

    // Populate country dropdown
    populateCountryDropdown();
    
    // Set up event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Error initializing application:', error);
    updateStatus(`Error initializing: ${error.message}`, 'error');
  }
});

/**
 * Helper function to load JSON data
 */
async function loadJSON(url) {
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
 * Set up event listeners
 */
function setupEventListeners() {
  // Country selection
  const countrySelect = document.getElementById('country-select');
  if (countrySelect) {
    countrySelect.addEventListener('change', handleCountryChange);
  }
  
  // Open modal button
  const openModalBtn = document.getElementById('open-modal-btn');
  if (openModalBtn) {
    openModalBtn.addEventListener('click', () => openModal('modal-product-list'));
  }
  
  // Toggle input mode button
  const toggleModeBtn = document.getElementById('toggle-mode-btn');
  if (toggleModeBtn) {
    toggleModeBtn.addEventListener('click', toggleInputMode);
    // Set initial button text
    toggleModeBtn.textContent = showOriginalAndCurrentTariffs ? 
      'Switch to Tariff Change Mode' : 'Switch to Original/Current Mode';
  }
  
  // Submit tariff button
  const submitBtn = document.getElementById('tariffSubmit');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleTariffSubmit);
  }
  
  // All-industry tariff input - now updates all section values directly
  const allTariffInput = document.getElementById('tariff-all-input');
  if (allTariffInput) {
    // Add focus event listener for warning popup
    allTariffInput.addEventListener('focus', function() {
      // Check if warning popup already exists
      let warningPopup = document.getElementById('all-tariff-warning-popup');
      if (!warningPopup) {
        // Create warning popup
        warningPopup = document.createElement('div');
        warningPopup.id = 'all-tariff-warning-popup';
        warningPopup.style.cssText = `
          position: absolute;
          background: var(--background-color, white);
          border: 2px solid var(--warning, #f0ad4e);
          border-radius: 4px;
          padding: 10px 15px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          font-size: 14px;
          font-family: var(--font-family-monospace);
          color: var(--text-color);
          z-index: 10000;
          max-width: 300px;
          pointer-events: none;
        `;
        warningPopup.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: var(--warning, #f0ad4e); font-weight: bold;">⚠</span>
            <span>Changing this value will override all current industry-level tariff values. Make sure this is what you want before proceeding.</span>
          </div>
        `;
        
        // Position the popup above the input
        const rect = allTariffInput.getBoundingClientRect();
        const modalRect = allTariffInput.closest('.modal-content').getBoundingClientRect();
        warningPopup.style.left = (rect.left - modalRect.left) + 'px';
        warningPopup.style.top = (rect.top - modalRect.top - 80) + 'px';
        
        // Add to modal content
        allTariffInput.closest('.modal-content').appendChild(warningPopup);
        
        // Remove popup when input loses focus
        allTariffInput.addEventListener('blur', function() {
          setTimeout(() => {
            if (warningPopup && warningPopup.parentNode) {
              warningPopup.parentNode.removeChild(warningPopup);
            }
          }, 200);
        }, { once: true });
      }
    });
    
    allTariffInput.addEventListener('change', function() {
      const value = parseFloat(this.value) || 0;
      // Update global pass-through rate from the input
      const passThroughInput = document.getElementById('tariff-all-passthrough');
      if (passThroughInput) {
        currentPassThroughRate = (parseFloat(passThroughInput.value) || 100) / 100;
      }
      
      // Update all section values based on the mode
      if (value >= 0 && selectedCountry) {
        Object.keys(sectionToHs4Mapping).forEach(sectionId => {
          if (showOriginalAndCurrentTariffs) {
            // In original/current mode: current = original + (additional × pass-through)
            const originalValue = tariffPropagator.getTariffValue('section', sectionId, null, null, selectedCountry, 'original');
            const newValue = originalValue + (value * currentPassThroughRate);
            tariffPropagator.updateTariff('section', sectionId, null, null, newValue, selectedCountry, 'current');
          } else {
            // In tariff-change mode: value = additional × pass-through
            tariffPropagator.updateTariff('section', sectionId, null, null, value * currentPassThroughRate, selectedCountry);
          }
        });
        
        // Refresh the hierarchical view to show the updated values
        buildHierarchicalView();
      }
    });
  }
  
  // Pass-through rate input
  const passThroughInput = document.getElementById('tariff-all-passthrough');
  if (passThroughInput) {
    passThroughInput.addEventListener('change', function() {
      currentPassThroughRate = (parseFloat(this.value) || 100) / 100;
    });
  }
  
  // Add Enter key functionality to all inputs
  document.querySelectorAll('.popup-input').forEach(input => {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && submitBtn) {
        e.preventDefault();
        submitBtn.click();
      }
    });
  });
}

/**
 * Populate the country dropdown
 */
function populateCountryDropdown() {
  const dropdown = document.getElementById('country-select');
  if (!dropdown) return;
  
  // Clear existing options
  dropdown.innerHTML = '';
  
  // Get country list from section weights (these are the countries we have data for)
  const countries = Array.from(isoToCountry.entries()).map(([iso, name]) => ({ iso, name }));
  
  // Sort countries alphabetically by name
  countries.sort((a, b) => a.name.localeCompare(b.name));
  
  // Add options to dropdown
  countries.forEach(country => {
    const option = document.createElement('option');
    option.value = country.iso;
    option.textContent = country.name;
    dropdown.appendChild(option);
  });
  
  // Select first country by default
  if (countries.length > 0) {
    selectedCountry = countries[0].iso;
    dropdown.value = selectedCountry;
    
    // Pre-calculate weights for initial country
    tariffPropagator.preCalculateWeights(selectedCountry);
  }
}

/**
 * Handle country change event
 */
function handleCountryChange(event) {
  selectedCountry = event.target.value;
  
  // Pre-calculate weights for the new country (also initializes original tariffs)
  tariffPropagator.preCalculateWeights(selectedCountry);
  
  // Initialize current tariffs to match original tariffs if in original/current mode
  if (showOriginalAndCurrentTariffs && selectedCountry) {
    
    // Get all section, chapter, and HS4 tariffs from original to initialize current
    if (tariffPropagator.originalTariffs[selectedCountry]) {
      if (!tariffPropagator.currentTariffs[selectedCountry]) {
        tariffPropagator.currentTariffs[selectedCountry] = {};
      }
      
      // Copy original tariffs to current for all levels
      Object.keys(tariffPropagator.originalTariffs[selectedCountry]).forEach(key => {
        const originalValue = tariffPropagator.originalTariffs[selectedCountry][key];
        if (originalValue !== undefined) {
          tariffPropagator.currentTariffs[selectedCountry][key] = originalValue;
        }
      });
    }
  }
  
  // Update status
  updateStatus(`Selected country: ${isoToCountry.get(selectedCountry) || selectedCountry}`, 'info');
}

/**
 * Toggle between tariff modes (tariff change vs original/current)
 */
function toggleInputMode() {
  showOriginalAndCurrentTariffs = !showOriginalAndCurrentTariffs;
  
  // Update the toggle button text
  const toggleBtn = document.getElementById('toggle-mode-btn');
  if (toggleBtn) {
    toggleBtn.textContent = showOriginalAndCurrentTariffs ? 
      'Switch to Tariff Change Mode' : 'Switch to Original/Current Mode';
  }
  
  // If switching to original/current mode, initialize current tariffs to match original tariffs
  if (showOriginalAndCurrentTariffs && selectedCountry) {
    
    // Get all section, chapter, and HS4 tariffs from original to initialize current
    if (tariffPropagator.originalTariffs[selectedCountry]) {
      if (!tariffPropagator.currentTariffs[selectedCountry]) {
        tariffPropagator.currentTariffs[selectedCountry] = {};
      }
      
      // Copy original tariffs to current for all levels
      Object.keys(tariffPropagator.originalTariffs[selectedCountry]).forEach(key => {
        const originalValue = tariffPropagator.originalTariffs[selectedCountry][key];
        if (originalValue !== undefined) {
          tariffPropagator.currentTariffs[selectedCountry][key] = originalValue;
        }
      });
    }
  }
  
  // Rebuild the hierarchical view if the modal is open
  if (document.getElementById('modal-product-list').style.display === 'block') {
    buildHierarchicalView();
  }
  
  updateStatus(`Switched to ${showOriginalAndCurrentTariffs ? 'Original/Current' : 'Tariff Change'} mode`, 'info');
}

/**
 * Build the hierarchical tariff view
 */
function buildHierarchicalView() {
  const treeContainer = document.getElementById('tariff-tree');
  if (!treeContainer) {
    console.error("Element with id 'tariff-tree' not found.");
    return;
  }
  
  // Clear the container
  treeContainer.innerHTML = '';
  
  // Skip if no country selected
  if (!selectedCountry) {
    treeContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Please select a country first.</p>';
    return;
  }
  
  // Skip if no hierarchical structure
  if (!sectionToHs4Mapping || Object.keys(sectionToHs4Mapping).length === 0) {
    treeContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Loading hierarchical structure...</p>';
    return;
  }
  
  // Add each section to the tree
  for (const sectionId in sectionToHs4Mapping) {
    const section = sectionToHs4Mapping[sectionId];
    
    // Create section item
    const sectionItem = document.createElement('div');
    sectionItem.className = 'section-item collapsible';
    
    // Get current tariff value for this section
    const sectionTariff = tariffPropagator.getTariffValue('section', sectionId, null, null, selectedCountry);
    
    // Check if directly set
    const isDirectlySet = tariffPropagator.isDirectlySet('section', sectionId, null, null, selectedCountry);
    
    // Create section header with indicators
    const titleDiv = document.createElement('div');
    titleDiv.className = 'item-title';
    titleDiv.style.fontSize = '0.9em';
    
    // Show "Effective Tariff - X.XX%" in the tariff badge
    titleDiv.innerHTML = `
      <span class="toggle-icon"><img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-icon-img" style="width: 12px; height: 12px;"></span> 
      <strong>Section ${sectionId}:</strong> ${section.title}
      ${sectionTariff > 0 ? `<span class="tariff-badge">Effective Tariff - ${sectionTariff.toFixed(2)}%</span>` : ''}
    `;
    
    // Add section header to section item
    sectionItem.appendChild(titleDiv);
    
    // Create tariff inputs for the section
    const tariffContainer = createTariffContainer(sectionId);
    sectionItem.appendChild(tariffContainer);
    
    // Create container for chapters
    const chaptersContainer = document.createElement('div');
    chaptersContainer.className = 'chapter-container';
    chaptersContainer.style.display = 'none'; // Start collapsed
    
    // Add chapters to the section
    for (const chapterId in section.chapters) {
      const chapter = section.chapters[chapterId];
      
      // Create chapter item
      const chapterItem = document.createElement('div');
      chapterItem.className = 'chapter-item collapsible';
      
      // Get current tariff value for this chapter
      const chapterTariff = tariffPropagator.getTariffValue('chapter', sectionId, chapterId, null, selectedCountry);
      
      // Check if directly set
      const isChapterDirectlySet = tariffPropagator.isDirectlySet('chapter', sectionId, chapterId, null, selectedCountry);
      
      // Create chapter header with indicators
      const chapterTitleDiv = document.createElement('div');
      chapterTitleDiv.className = 'item-title';
      chapterTitleDiv.style.fontSize = '0.9em';
      
      // Zero-pad chapter ID to ensure it has at least 2 digits
      const paddedChapterId = chapterId.padStart(2, '0');
      
      // Show "Effective Tariff - X.XX%" in the tariff badge
      chapterTitleDiv.innerHTML = `
        <span class="toggle-icon"><img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-icon-img" style="width: 12px; height: 12px;"></span> 
        <strong>Chapter ${paddedChapterId}:</strong> ${chapter.short || chapter.title}
        ${chapterTariff > 0 ? `<span class="tariff-badge">Effective Tariff - ${chapterTariff.toFixed(2)}%</span>` : ''}
      `;
      
      // Add chapter header to chapter item
      chapterItem.appendChild(chapterTitleDiv);
      
      // Create tariff inputs for the chapter
      const chapterTariffContainer = createTariffContainer(`${sectionId}_${chapterId}`);
      chapterItem.appendChild(chapterTariffContainer);
      
      // Create container for HS4 codes
      const hs4Container = document.createElement('div');
      hs4Container.className = 'hs4-container';
      hs4Container.style.display = 'none'; // Start collapsed
      
      // Add HS4 codes to the chapter
      if (chapter.subcategories) {
        for (const hs4Code in chapter.subcategories) {
          const hs4 = chapter.subcategories[hs4Code];
          
          // Create HS4 item
          const hs4Item = document.createElement('div');
          hs4Item.className = 'hs4-item';
          
          // Get current tariff value for this HS4 code
          const hs4Tariff = tariffPropagator.getTariffValue('hs4', sectionId, chapterId, hs4Code, selectedCountry);
          
          // Check if directly set
          const isHs4DirectlySet = tariffPropagator.isDirectlySet('hs4', sectionId, chapterId, hs4Code, selectedCountry);
          
          // Create HS4 header with indicators
          const hs4TitleDiv = document.createElement('div');
          hs4TitleDiv.className = 'item-title';
          hs4TitleDiv.style.fontSize = '0.9em';
          
          // Create the description with name property
          let description = hs4.description || '';
          let nameText = '';
          if (hs4.name) {
            nameText = ` - ${hs4.name}`;
          }
          
          // Zero-pad HS4 code to ensure it has 4 digits
          const paddedHs4Code = hs4Code.padStart(4, '0');
          
          // Show "Effective Tariff - X.XX%" in the tariff badge
          hs4TitleDiv.innerHTML = `
            <strong>${paddedHs4Code}:</strong> ${description}${nameText}
            ${hs4Tariff > 0 ? `<span class="tariff-badge">Effective Tariff - ${hs4Tariff.toFixed(2)}%</span>` : ''}
          `;
          
          // Add HS4 header to HS4 item
          hs4Item.appendChild(hs4TitleDiv);
          
          // Create tariff inputs for the HS4 code
          const hs4TariffContainer = createTariffContainer(`${sectionId}_${chapterId}_${hs4Code}`);
          hs4Item.appendChild(hs4TariffContainer);
          
          // Add HS4 item to HS4 container
          hs4Container.appendChild(hs4Item);
        }
      }
      
      // Add click handler for chapter toggle
      chapterTitleDiv.addEventListener('click', function(e) {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
          e.stopPropagation();
          toggleContainer(chapterItem, hs4Container);
        }
      });
      
      // Make the entire chapter item clickable, not just the title
      chapterItem.addEventListener('click', function(e) {
        // Only handle clicks directly on the container, not on child elements
        if (e.target === this && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
          e.stopPropagation();
          toggleContainer(chapterItem, hs4Container);
        }
      });
      
      // Add chapter and its HS4 container to chapters container
      chaptersContainer.appendChild(chapterItem);
      chaptersContainer.appendChild(hs4Container);
    }
    
    // Add click handler for section toggle
    titleDiv.addEventListener('click', function(e) {
      if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        toggleContainer(sectionItem, chaptersContainer);
      }
    });
    
    // Make the entire section item clickable, not just the title
    sectionItem.addEventListener('click', function(e) {
      // Only handle clicks directly on the container, not on child elements
      if (e.target === this && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
        e.stopPropagation();
        toggleContainer(sectionItem, chaptersContainer);
      }
    });
    
    // Add section and its chapters container to tree
    treeContainer.appendChild(sectionItem);
    treeContainer.appendChild(chaptersContainer);
  }
  
  // Restore expanded sections and chapters
  restoreExpandedState();
}

/**
 * Create a tariff container with input fields for a node
 */
function createTariffContainer(nodeId) {
  // Create the tariff container
  const tariffContainer = document.createElement('div');
  tariffContainer.classList.add('tariff-container');

  if (showOriginalAndCurrentTariffs) {
    // --- ORIGINAL TARIFF INPUT ---
    const originalTariffRow = document.createElement('div');
    originalTariffRow.classList.add('popup-row-modal');

    const originalTariffLabel = document.createElement('label');
    originalTariffLabel.setAttribute('for', 'originalTariffInput_' + nodeId);
    originalTariffLabel.textContent = "Original Tariff:";
    originalTariffLabel.style.fontSize = '0.9em';

    const originalTariffInputGroup = document.createElement('div');
    originalTariffInputGroup.classList.add('input-group');

    const originalTariffInput = document.createElement('input');
    originalTariffInput.type = 'number';
    originalTariffInput.classList.add('popup-input', 'percent', 'original-tariff');
    originalTariffInput.step = 0.1;
    originalTariffInput.min = 0;
    originalTariffInput.max = 100;
    
    // Get original tariff value from tariff propagator instead of getTariffOriginalData
    let originalValue = 0;
    const nodeParts = nodeId.split('_');
    if (nodeParts.length === 1) {
      // Section
      originalValue = tariffPropagator.getTariffValue('section', nodeParts[0], null, null, selectedCountry, 'original');
    } else if (nodeParts.length === 2) {
      // Chapter
      originalValue = tariffPropagator.getTariffValue('chapter', nodeParts[0], nodeParts[1], null, selectedCountry, 'original');
    } else if (nodeParts.length === 3) {
      // HS4
      originalValue = tariffPropagator.getTariffValue('hs4', nodeParts[0], nodeParts[1], nodeParts[2], selectedCountry, 'original');
    }
    
    originalTariffInput.value = originalValue.toFixed(2);
    originalTariffInput.id = 'originalTariffInput_' + nodeId;
    
    // Handle original tariff changes
    originalTariffInput.addEventListener('change', function() {
      const value = parseFloat(this.value) || 0;
      const parts = nodeId.split('_');
      
      // Use the tariff propagator to update original tariffs with the correct tariff type
      if (parts.length === 1) {
        // This is a section
        tariffPropagator.updateTariff('section', parts[0], null, null, value, selectedCountry, 'original');
      } else if (parts.length === 2) {
        // This is a chapter
        tariffPropagator.updateTariff('chapter', parts[0], parts[1], null, value, selectedCountry, 'original');
      } else if (parts.length === 3) {
        // This is an HS4 code
        tariffPropagator.updateTariff('hs4', parts[0], parts[1], parts[2], value, selectedCountry, 'original');
      }
      
      // Refresh the view
      buildHierarchicalView();
    });

    const originalTariffPercentSymbol = document.createElement('span');
    originalTariffPercentSymbol.classList.add('percent-symbol');
    originalTariffPercentSymbol.textContent = '%';

    originalTariffInputGroup.appendChild(originalTariffInput);
    originalTariffInputGroup.appendChild(originalTariffPercentSymbol);

    originalTariffRow.appendChild(originalTariffLabel);
    originalTariffRow.appendChild(originalTariffInputGroup);

    // --- CURRENT TARIFF INPUT ---
    const currentTariffRow = document.createElement('div');
    currentTariffRow.classList.add('popup-row-modal');

    const currentTariffLabel = document.createElement('label');
    currentTariffLabel.setAttribute('for', 'currentTariffInput_' + nodeId);
    currentTariffLabel.textContent = "Current Tariff:";
    currentTariffLabel.style.fontSize = '0.9em';

    const currentTariffInputGroup = document.createElement('div');
    currentTariffInputGroup.classList.add('input-group');

    const currentTariffInput = document.createElement('input');
    currentTariffInput.type = 'number';
    currentTariffInput.classList.add('popup-input', 'percent', 'current-tariff');
    currentTariffInput.step = 0.1;
    currentTariffInput.min = 0;
    currentTariffInput.max = 100;
    
    // Get current tariff value from tariff propagator
    let currentValue = originalValue; // Default to original value
    // Reuse nodeParts from above
    if (nodeParts.length === 1) {
      // Section
      currentValue = tariffPropagator.getTariffValue('section', nodeParts[0], null, null, selectedCountry, 'current');
    } else if (nodeParts.length === 2) {
      // Chapter
      currentValue = tariffPropagator.getTariffValue('chapter', nodeParts[0], nodeParts[1], null, selectedCountry, 'current');
    } else if (nodeParts.length === 3) {
      // HS4
      currentValue = tariffPropagator.getTariffValue('hs4', nodeParts[0], nodeParts[1], nodeParts[2], selectedCountry, 'current');
    }
    
    currentTariffInput.value = currentValue.toFixed(2);
    currentTariffInput.id = 'currentTariffInput_' + nodeId;
    
    // Handle current tariff changes with propagation
    currentTariffInput.addEventListener('change', function() {
      const value = parseFloat(this.value) || 0;
      const parts = nodeId.split('_');
      
      if (parts.length === 1) {
        // This is a section
        tariffPropagator.updateTariff('section', parts[0], null, null, value, selectedCountry, 'current');
      } else if (parts.length === 2) {
        // This is a chapter
        tariffPropagator.updateTariff('chapter', parts[0], parts[1], null, value, selectedCountry, 'current');
      } else if (parts.length === 3) {
        // This is an HS4 code
        tariffPropagator.updateTariff('hs4', parts[0], parts[1], parts[2], value, selectedCountry, 'current');
      }
      
      // Refresh the hierarchical view to show propagated changes
      buildHierarchicalView();
    });

    const currentTariffPercentSymbol = document.createElement('span');
    currentTariffPercentSymbol.classList.add('percent-symbol');
    currentTariffPercentSymbol.textContent = '%';

    currentTariffInputGroup.appendChild(currentTariffInput);
    currentTariffInputGroup.appendChild(currentTariffPercentSymbol);

    currentTariffRow.appendChild(currentTariffLabel);
    currentTariffRow.appendChild(currentTariffInputGroup);

    // Append both rows to the tariff container
    tariffContainer.appendChild(originalTariffRow);
    tariffContainer.appendChild(currentTariffRow);
  } else {
    // --- TARIFF CHANGE INPUT ---
    const newTariffRow = document.createElement('div');
    newTariffRow.classList.add('popup-row-modal');

    const newTariffLabel = document.createElement('label');
    newTariffLabel.setAttribute('for', 'newTariffInput_' + nodeId);
    newTariffLabel.textContent = "Tariff Change:";
    newTariffLabel.style.fontSize = '0.9em';

    const newTariffInputGroup = document.createElement('div');
    newTariffInputGroup.classList.add('input-group');

    const newTariffInput = document.createElement('input');
    newTariffInput.type = 'number';
    newTariffInput.classList.add('popup-input', 'percent', 'tariff-change');
    newTariffInput.step = 5;
    newTariffInput.min = 0;
    newTariffInput.max = 100;
    
    // Get current tariff value
    let tariffChangeValue = 0;
    const parts = nodeId.split('_');
    if (parts.length === 1) {
      // Section
      tariffChangeValue = tariffPropagator.getTariffValue('section', parts[0], null, null, selectedCountry);
    } else if (parts.length === 2) {
      // Chapter
      tariffChangeValue = tariffPropagator.getTariffValue('chapter', parts[0], parts[1], null, selectedCountry);
    } else if (parts.length === 3) {
      // HS4
      tariffChangeValue = tariffPropagator.getTariffValue('hs4', parts[0], parts[1], parts[2], selectedCountry);
    }
    
    newTariffInput.value = tariffChangeValue.toFixed(2);
    newTariffInput.id = 'newTariffInput_' + nodeId;
    
    // Handle tariff changes with propagation
    newTariffInput.addEventListener('change', function() {
      const value = parseFloat(this.value) || 0;
      const passThroughValue = currentPassThroughRate;
      const parts = nodeId.split('_');
      
      // Handle differently based on the current mode
      if (showOriginalAndCurrentTariffs) {
        
        let originalValue = 0;
        let nodeType = '';
        
        // Get the original value based on the node type
        if (parts.length === 1) {
          // This is a section
          nodeType = 'section';
          originalValue = tariffPropagator.getTariffValue('section', parts[0], null, null, selectedCountry, 'original');
          // Calculate the new value by adding the tariff value to the original value
          const newValue = originalValue + (value * passThroughValue);
          // Update the tariff with the new value
          tariffPropagator.updateTariff('section', parts[0], null, null, newValue, selectedCountry, 'current');
        } else if (parts.length === 2) {
          // This is a chapter
          nodeType = 'chapter';
          originalValue = tariffPropagator.getTariffValue('chapter', parts[0], parts[1], null, selectedCountry, 'original');
          // Calculate the new value by adding the tariff value to the original value
          const newValue = originalValue + (value * passThroughValue);
          // Update the tariff with the new value
          tariffPropagator.updateTariff('chapter', parts[0], parts[1], null, newValue, selectedCountry, 'current');
        } else if (parts.length === 3) {
          // This is an HS4 code
          nodeType = 'hs4';
          originalValue = tariffPropagator.getTariffValue('hs4', parts[0], parts[1], parts[2], selectedCountry, 'original');
          // Calculate the new value by adding the tariff value to the original value
          const newValue = originalValue + (value * passThroughValue);
          // Update the tariff with the new value
          tariffPropagator.updateTariff('hs4', parts[0], parts[1], parts[2], newValue, selectedCountry, 'current');
        }
      } else {
        // In Tariff Change mode, apply tariff value directly
        
        if (parts.length === 1) {
          // This is a section
          tariffPropagator.updateTariff('section', parts[0], null, null, value * passThroughValue, selectedCountry);
        } else if (parts.length === 2) {
          // This is a chapter
          tariffPropagator.updateTariff('chapter', parts[0], parts[1], null, value * passThroughValue, selectedCountry);
        } else if (parts.length === 3) {
          // This is an HS4 code
          tariffPropagator.updateTariff('hs4', parts[0], parts[1], parts[2], value * passThroughValue, selectedCountry);
        }
      }
      
      // Refresh the hierarchical view to show propagated changes
      buildHierarchicalView();
    });

    const newTariffPercentSymbol = document.createElement('span');
    newTariffPercentSymbol.classList.add('percent-symbol');
    newTariffPercentSymbol.textContent = '%';

    newTariffInputGroup.appendChild(newTariffInput);
    newTariffInputGroup.appendChild(newTariffPercentSymbol);

    newTariffRow.appendChild(newTariffLabel);
    newTariffRow.appendChild(newTariffInputGroup);

    // --- Pass-Through Popup Row ---
    const passThroughRow = document.createElement('div');
    passThroughRow.classList.add('popup-row-modal');

    const passThroughLabel = document.createElement('label');
    passThroughLabel.setAttribute('for', 'passThroughInput_' + nodeId);
    passThroughLabel.textContent = "Pass Through:";
    passThroughLabel.style.fontSize = '0.9em';

    const passThroughInputGroup = document.createElement('div');
    passThroughInputGroup.classList.add('input-group');

    const passThroughInput = document.createElement('input');
    passThroughInput.type = 'number';
    passThroughInput.classList.add('popup-input', 'percent', 'pass-through');
    passThroughInput.step = 10;
    passThroughInput.min = 0;
    passThroughInput.max = 100;
    passThroughInput.value = (currentPassThroughRate * 100).toFixed(0);
    passThroughInput.id = 'passThroughInput_' + nodeId;
    
    // Update the pass-through rate
    passThroughInput.addEventListener('change', function() {
      const value = parseFloat(this.value) || 0;
      currentPassThroughRate = value / 100;
    });

    const passThroughPercentSymbol = document.createElement('span');
    passThroughPercentSymbol.classList.add('percent-symbol');
    passThroughPercentSymbol.textContent = '%';

    passThroughInputGroup.appendChild(passThroughInput);
    passThroughInputGroup.appendChild(passThroughPercentSymbol);

    passThroughRow.appendChild(passThroughLabel);
    passThroughRow.appendChild(passThroughInputGroup);

    // Append both popup rows to the tariff container
    tariffContainer.appendChild(newTariffRow);
    tariffContainer.appendChild(passThroughRow);
  }
  
  return tariffContainer;
}

/**
 * Toggle visibility of a container element
 */
function toggleContainer(headerElement, containerElement) {
  const isVisible = containerElement.style.display === 'block';
  containerElement.style.display = isVisible ? 'none' : 'block';
  
  // Update toggle icon
  const toggleIcon = headerElement.querySelector('.toggle-icon');
  if (toggleIcon) {
    toggleIcon.innerHTML = isVisible ? 
      '<img src="assets/fontawesome/chevron-right-solid.svg" alt="Expand" class="toggle-icon-img">' : 
      '<img src="assets/fontawesome/chevron-down-solid.svg" alt="Collapse" class="toggle-icon-img">';
  }
  
  // Save the expanded state
  saveExpandedState();
}

/**
 * Save the expanded state of sections and chapters
 */
function saveExpandedState() {
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
 */
function restoreExpandedState() {
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

/**
 * Get original tariff data for a section
 */
function getTariffOriginalData(countryIso, sectionId) {
  if (!bilateralTariffs || !bilateralTariffs[countryIso]) {
    return { usTariff: 0 };
  }
  
  // Get section name from the sectionIdToName mapping
  const sectionName = sectionIdToName[sectionId];
  
  // If no section name, log error and return 0
  if (!sectionName) {
    console.error(`No section name found for ID: ${sectionId}`);
    return { usTariff: 0 };
  }
  
  // Get tariff year (default to 2021)
  const tariffYear = 2021;
  
  // Get sector data
  if (bilateralTariffs[countryIso].sector_data && 
      bilateralTariffs[countryIso].sector_data[tariffYear] && 
      bilateralTariffs[countryIso].sector_data[tariffYear][sectionName]) {
    
    const tariffValue = bilateralTariffs[countryIso].sector_data[tariffYear][sectionName].us_to_country || 0;
    return { 
      code: parseInt(sectionId, 10),
      usTariff: tariffValue
    };
  }
  
  return { usTariff: 0 };
}

/**
 * Handle tariff submission
 */
function handleTariffSubmit() {
  // Validate that we have a current country
  if (!selectedCountry) {
    alert('Please select a country first.');
    return;
  }
  
  try {
    // Get the all-industry tariff and pass-through values from the top inputs
    const allTariffInput = document.getElementById('tariff-all-input');
    const allPassThroughInput = document.getElementById('tariff-all-passthrough');
    
    if (allTariffInput && allPassThroughInput) {
      const tariffValue = parseFloat(allTariffInput.value) || 0;
      const passThroughValue = parseFloat(allPassThroughInput.value) || 100;
      
      // Store current pass-through rate (as a decimal)
      currentPassThroughRate = passThroughValue / 100;
      
      // The all-industry tariff is now applied directly to sections when the input changes,
      // so we don't need to apply it again here during submission.
      // The tariffPropagator already has all the section values set correctly.
    }
    
    // Generate tariff data from the tariff propagator
    const tariffData = tariffPropagator.generateTariffData(selectedCountry);
    
    // Store data in window object for other components to access
    window.tariffData = tariffData;
    
    // Store in localStorage for transfer to calculations
    localStorage.setItem('tariffEditorData', JSON.stringify(tariffData));
    
    // Call calculations if available
    if (window.TariffCalculations && window.TariffCalculations.processTariffData) {
      window.TariffCalculations.processTariffData(tariffData)
        .then(success => {
          if (success) {
          } else {
            console.error('Failed to process tariff data');
          }
        });
    }
    
    // Reset the all-industry tariff input field to 0
    if (allTariffInput) {
      allTariffInput.value = "0";
    }
    
    // Close the modal
    closeModal('modal-product-list');
    
    // Display the tariff data
    displayTariffData(tariffData);
    
    updateStatus('Tariff submission complete', 'success');
    
  } catch (error) {
    console.error('Error submitting tariffs:', error);
    alert(`Error submitting tariffs: ${error.message}`);
  }
}

/**
 * Display tariff data in the output area
 */
function displayTariffData(data) {
  const container = document.getElementById('data-output');
  
  if (!data || !data.iso_list || data.iso_list.length === 0) {
    container.textContent = 'No tariff data available.';
    return;
  }
  
  // Format the data for display
  const formatted = {
    countries: data.iso_list.map(iso => ({ 
      iso, 
      name: isoToCountry.get(iso) || iso 
    })),
    mode: showOriginalAndCurrentTariffs ? 'Original/Current' : 'Tariff Change',
    importWeighted: data.importWeighted ? 'Yes' : 'No',
    percentChanges: data.iso_list.reduce((obj, iso, idx) => {
      // Only show the first 5 values to keep the display manageable
      obj[iso] = data.tau_c[idx].map(v => (v * 100).toFixed(4) + '%');
      return obj;
    }, {})
  };
  
  // Display as JSON
  container.textContent = JSON.stringify(formatted, null, 2);
}

/**
 * Update status message
 */
function updateStatus(message, type = 'info') {
  const statusMessage = document.getElementById('status-message');
  if (!statusMessage) return;
  
  statusMessage.textContent = message;
  
  // Set color based on type
  if (type === 'error') {
    statusMessage.style.color = '#f44336';
  } else if (type === 'success') {
    statusMessage.style.color = '#4CAF50';
  } else {
    statusMessage.style.color = '#2196F3';
  }
}

/**
 * Open a modal
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    // Build the hierarchical view before showing the modal
    buildHierarchicalView();
    modal.style.display = 'block';
  }
}

/**
 * Close a modal
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Add closeModal function to window object for use in HTML onclick
window.closeModal = closeModal;

// Export tariffPropagator for use with the MDS helper functions
window.tariffPropagator = tariffPropagator;