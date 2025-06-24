/**
 * simpleTariffPropagation.js - Simple Tariff Propagation Module
 * 
 * This module provides the core bidirectional tariff propagation logic
 * without the UI components, making it easy to integrate into other applications.
 * 
 * Features:
 * - Bidirectional propagation: changes flow both up and down the hierarchy
 * - Section → Chapter → HS4 code hierarchical structure
 * - Weighted averaging for upward propagation
 * - Direct setting for downward propagation
 * - Tracks which tariffs were directly set vs calculated
 */

// Use IIFE pattern for module encapsulation as per CLAUDE.md guidelines
var TariffPropagation = (function() {
class TariffPropagation {
  constructor() {
    // Core data stores
    this.currentTariffs = {};       // Current tariff values by country and hierarchy key
    this.originalTariffs = {};      // Original tariff values by country and hierarchy key
    this.directlySetTariffs = {};   // Tracks which tariffs were directly set by user vs calculated
    this.sectionToHs4Mapping = {};  // Hierarchical mapping of sections, chapters, and HS4 codes
    this.sectionWeights = {};       // Weights for sections, chapters, and HS4 codes by country
    this.cachedChapterWeights = {}; // Cache for chapter weights calculations
    
    // Custom BEA codes order for output vector (you can replace with your specific order)
    this.customBEAOrder = [
     '111', '112', '113FF', '211', '212', '213', '2211', '2212NW', '23EH', '23MR', '23OC', '23OR', '23OT', '23PC', '23SF', '23TH', '321', '327', '3311IS', '3313NF', '332', '33311', '33312', '33313', '3332OM', '3341', '3342', '3344', '3345', '334X', '335', '336111', '336112', '33612', '3362BP', '3364', '3365AO', '337', '3391', '3399', '311', '3121', '3122', '313TT', '315AL', '322', '323', '324', '3251', '3252', '3254', '325X', '326', '4231', '4234', '4236', '4238', '423X', '4242', '4244', '4247', '424X', '425', '42ID', '441', '445', '452', '444', '446', '447', '448', '454', '4A0X', '481', '482', '483', '484', '485', '486', '48A', '492', '493', '5111', '5112', '512', '515', '5171', '5172', '5174OT', '518', '519', '521CI', '523', '524113', '5241X', '5242', '525', 'HSO', 'HST', 'ORE', '532RL', '5411', '5415', '5412', '5413', '5416', '5417', '5418', '541X', '55', '5613', '5617', '561X', '562', '61', '6211', '6212', '6213', '6214', '6215OH', '622', '623', '624', '711AS', '713', '721', '722', '811', '812', '813', '814', 'GFGD', 'GFGN', 'GFE', 'GSLGE', 'GSLGH', 'GSLGO', 'GSLE', 'Used', 'Other'
      // Add more BEA codes as needed for your application
    ];
    
    // For data export
    this.iso_list = [];                    // List of ISO codes for countries
    this.original_tariffs_by_country = {}; // Original tariffs by country and BEA code
    this.percent_change_by_country = {};   // Percent change vectors by country and BEA code
    this.tau_c = [];                       // Matrix of percent change vectors
  }

  /**
   * Initialize the propagation system with required data
   * @param {Object} options - Configuration options
   * @param {Object} options.sectionToHs4Mapping - Hierarchical structure of sections, chapters, and HS4 codes
   * @param {Object} options.sectionWeights - Weights for sections by country
   * @param {Object} options.beaSectionWeights - BEA weights for sections
   * @param {Object} options.beaImportWeights - Import weights for BEA codes by country
   * @param {Function} options.getTariffOriginalData - Function to get original tariff data
   */
  initialize(options) {
    const {
      sectionToHs4Mapping,
      sectionWeights,
      beaSectionWeights,
      beaImportWeights,
      getTariffOriginalData
    } = options;
    
    // Store the data
    this.sectionToHs4Mapping = sectionToHs4Mapping || {};
    this.sectionWeights = sectionWeights || {};
    this.beaSectionWeights = beaSectionWeights || {};
    this.beaImportWeights = beaImportWeights || {};
    this.getTariffOriginalData = getTariffOriginalData;
    
    // Initialize caches
    this.cachedChapterWeights = {};
    
    // Initialize original tariffs
    this.originalTariffs = {};
    
    return this;
  }
  
  /**
   * Pre-calculate chapter weights for a country to improve performance
   * @param {string} countryCode - ISO code for the country
   */
  preCalculateWeights(countryCode) {
    if (!countryCode || !this.sectionToHs4Mapping || !this.sectionWeights) {
      console.error("Cannot pre-calculate weights: missing required data");
      return;
    }
    
    // Initialize country in cache if needed
    if (!this.cachedChapterWeights[countryCode]) {
      this.cachedChapterWeights[countryCode] = {};
    }
    
    // Initialize original tariffs for this country if they don't exist yet
    if (!this.originalTariffs[countryCode] || Object.keys(this.originalTariffs[countryCode]).length === 0) {
      this.originalTariffs[countryCode] = {};
      
      // Load original tariffs from data source
      if (this.getTariffOriginalData) {
        Object.keys(this.sectionToHs4Mapping).forEach(sectionId => {
          const originalData = this.getTariffOriginalData(countryCode, sectionId);
          if (originalData && originalData.usTariff !== undefined) {
            this.originalTariffs[countryCode][sectionId] = originalData.usTariff;
            
            // Propagate section value to chapters and HS4 codes
            const section = this.sectionToHs4Mapping[sectionId];
            if (section && section.chapters) {
              Object.keys(section.chapters).forEach(chapId => {
                this.originalTariffs[countryCode][`${sectionId}_${chapId}`] = originalData.usTariff;
                
                const chapter = section.chapters[chapId];
                if (chapter && chapter.subcategories) {
                  Object.keys(chapter.subcategories).forEach(hsCode => {
                    this.originalTariffs[countryCode][`${sectionId}_${chapId}_${hsCode}`] = originalData.usTariff;
                  });
                }
              });
            }
          }
        });
      }
    }
    
    // For each section
    Object.keys(this.sectionToHs4Mapping).forEach(sectionId => {
      const section = this.sectionToHs4Mapping[sectionId];
      if (!section || !section.chapters) return;
      
      // Initialize section in cache
      if (!this.cachedChapterWeights[countryCode][sectionId]) {
        this.cachedChapterWeights[countryCode][sectionId] = {};
      }
      
      // For each chapter in this section
      Object.keys(section.chapters).forEach(chapterId => {
        const chapter = section.chapters[chapterId];
        if (!chapter || !chapter.subcategories) return;
        
        // Calculate total weight for this chapter and relative weights for HS4 codes
        let totalWeight = 0;
        const hs4Weights = {};
        
        // Sum weights of all HS4 codes in this chapter
        Object.keys(chapter.subcategories).forEach(hs4Code => {
          const weight = this.getHsCodeWeight(sectionId, hs4Code, countryCode) || 0;
          if (weight > 0) {
            hs4Weights[hs4Code] = weight;
            totalWeight += weight;
          }
        });
        
        // If no weights found, use equal weighting
        if (totalWeight <= 0) {
          const hs4Count = Object.keys(chapter.subcategories).length;
          if (hs4Count > 0) {
            const equalWeight = 1 / hs4Count;
            Object.keys(chapter.subcategories).forEach(hs4Code => {
              hs4Weights[hs4Code] = equalWeight;
            });
            totalWeight = 1.0; // Equal distribution total
          }
        } else {
          // Normalize weights to sum to 1 within the chapter
          Object.keys(hs4Weights).forEach(hs4Code => {
            hs4Weights[hs4Code] = hs4Weights[hs4Code] / totalWeight;
          });
        }
        
        // Store in cache
        this.cachedChapterWeights[countryCode][sectionId][chapterId] = {
          totalWeight: totalWeight,
          hs4RelativeWeights: hs4Weights
        };
      });
    });
  }
  
  /**
   * Get weight for a specific HS code
   * @param {string} sectionId - Section ID
   * @param {string} hsCode - HS code (can be chapter ID or HS4 code)
   * @param {string} countryCode - ISO code for the country
   * @returns {number} - Weight value or 0 if not found
   */
  getHsCodeWeight(sectionId, hsCode, countryCode) {
    // Ensure we have selected country and section data
    if (!countryCode || 
        !this.sectionWeights[countryCode] || 
        !this.sectionWeights[countryCode][sectionId]) {
      return 0;
    }
    
    // Check if the specific code exists
    if (this.sectionWeights[countryCode][sectionId][hsCode]) {
      return this.sectionWeights[countryCode][sectionId][hsCode];
    }
    
    return 0;
  }
  
  /**
   * Update a tariff value with bidirectional propagation
   * @param {string} levelType - Level type ('section', 'chapter', or 'hs4')
   * @param {string} sectionId - Section ID
   * @param {string|null} chapterId - Chapter ID (if levelType is 'chapter' or 'hs4')
   * @param {string|null} hs4Code - HS4 code (if levelType is 'hs4')
   * @param {number} newValue - New tariff value
   * @param {string} countryCode - ISO code for the country
   * @param {string} tariffType - Type of tariff to update ('current' or 'original')
   * @returns {Object} - Object with updated tariff data
   */
  updateTariff(levelType, sectionId, chapterId, hs4Code, newValue, countryCode, tariffType = 'current') {
    if (!countryCode) {
      console.error("No country code provided");
      return null;
    }
    
    // Initialize country in tariff stores if needed
    if (!this.currentTariffs[countryCode]) {
      this.currentTariffs[countryCode] = {};
    }
    if (!this.originalTariffs[countryCode]) {
      this.originalTariffs[countryCode] = {};
    }
    if (!this.directlySetTariffs[countryCode]) {
      this.directlySetTariffs[countryCode] = {};
    }
    
    // Get reference to the section data
    const section = this.sectionToHs4Mapping[sectionId];
    if (!section) {
      return null;
    }
    
    // Get original tariff for this section (as fallback value)
    // Only initialize original tariffs if they don't exist yet
    if (Object.keys(this.originalTariffs[countryCode]).length === 0 && this.getTariffOriginalData) {
      Object.keys(this.sectionToHs4Mapping).forEach(secId => {
        const originalData = this.getTariffOriginalData(countryCode, secId);
        if (originalData && originalData.usTariff !== undefined) {
          this.originalTariffs[countryCode][secId] = originalData.usTariff;
        }
      });
    }
    
    // Choose the tariff store to update based on tariffType
    const tariffStore = tariffType === 'original' ? this.originalTariffs : this.currentTariffs;
    
    // Get the original tariff for this section (for fallback)
    let originalSectionTariff = this.originalTariffs[countryCode][sectionId] || 0;
    
    // Handle tariff updates differently based on level
    if (levelType === 'section') {
      // SECTION LEVEL - Direct change by user
      tariffStore[countryCode][sectionId] = newValue;
      
      // Mark as directly set (only track for current tariffs)
      if (tariffType === 'current') {
        this.directlySetTariffs[countryCode][sectionId] = true;
      }
      
      // Propagate down to all chapters and HS4 codes
      Object.keys(section.chapters).forEach(chapId => {
        // Set chapter tariff to match section
        tariffStore[countryCode][`${sectionId}_${chapId}`] = newValue;
        
        // Mark as not directly set (only for current tariffs)
        if (tariffType === 'current') {
          this.directlySetTariffs[countryCode][`${sectionId}_${chapId}`] = false;
        }
        
        // Override all HS4 tariffs in this chapter to match the chapter tariff
        const chapter = section.chapters[chapId];
        Object.keys(chapter.subcategories || {}).forEach(hsCode => {
          tariffStore[countryCode][`${sectionId}_${chapId}_${hsCode}`] = newValue;
          
          // Mark as not directly set (only for current tariffs)
          if (tariffType === 'current') {
            this.directlySetTariffs[countryCode][`${sectionId}_${chapId}_${hsCode}`] = false;
          }
        });
      });
    } 
    else if (levelType === 'chapter') {
      // Get original chapter tariff for calculating change
      const hierarchyKey = `${sectionId}_${chapterId}`;
      
      const originalChapterTariff = 
        tariffStore[countryCode][hierarchyKey] !== undefined ?
        tariffStore[countryCode][hierarchyKey] : 
        originalSectionTariff;
      
      // Calculate the change from the original chapter tariff
      const change = newValue - originalChapterTariff;
      
      // CHAPTER LEVEL - Direct change by user
      tariffStore[countryCode][hierarchyKey] = newValue;
      
      // Mark as directly set (only for current tariffs)
      if (tariffType === 'current') {
        this.directlySetTariffs[countryCode][hierarchyKey] = true;
      }
      
      // Propagate down to all HS4 codes in this chapter
      const chapter = section.chapters[chapterId];
      Object.keys(chapter.subcategories || {}).forEach(hsCode => {
        // Set HS4 tariff to match chapter tariff, but only if not directly set by user
        const hs4Key = `${sectionId}_${chapterId}_${hsCode}`;
        
        // For original tariffs, always propagate down
        if (tariffType === 'original' || !this.directlySetTariffs[countryCode][hs4Key]) {
          tariffStore[countryCode][hs4Key] = newValue;
        }
      });
      
      // Propagate up to section using weighted change
      const chapterWeight = this.getHsCodeWeight(sectionId, chapterId, countryCode) || 0;
      if (chapterWeight > 0) {
        // If we have a current section tariff, adjust it based on the weighted change
        if (tariffStore[countryCode][sectionId] !== undefined) {
          tariffStore[countryCode][sectionId] += change * chapterWeight;
        } else {
          // If no current section tariff, use the original and apply weighted change
          tariffStore[countryCode][sectionId] = originalSectionTariff + (change * chapterWeight);
        }
        
        // Section was not directly set by user (only for current tariffs)
        if (tariffType === 'current') {
          this.directlySetTariffs[countryCode][sectionId] = false;
        }
      }
    } 
    else if (levelType === 'hs4') {
      // Get original HS4 tariff for calculating change
      const hs4Key = `${sectionId}_${chapterId}_${hs4Code}`;
      
      const originalHS4Tariff = 
        tariffStore[countryCode][hs4Key] !== undefined ?
        tariffStore[countryCode][hs4Key] :
        originalSectionTariff;
      
      // Calculate the change
      const change = newValue - originalHS4Tariff;
      
      // HS4 LEVEL - Direct change by user
      tariffStore[countryCode][hs4Key] = newValue;
      
      // Mark as directly set (only for current tariffs)
      if (tariffType === 'current') {
        this.directlySetTariffs[countryCode][hs4Key] = true;
      }
      
      // Get the chapter data
      const chapter = section.chapters[chapterId];
      if (!chapter) {
        return null;
      }
      
      // Use cached chapter weights if available
      let relativeWeight = 0;
      let hs4Weight = 0;
      
      // Try to get weights from cache
      if (this.cachedChapterWeights[countryCode] && 
          this.cachedChapterWeights[countryCode][sectionId] && 
          this.cachedChapterWeights[countryCode][sectionId][chapterId]) {
        
        // Use cached values
        const cachedData = this.cachedChapterWeights[countryCode][sectionId][chapterId];
        const totalChapterWeight = cachedData.totalWeight || 0;
        hs4Weight = this.getHsCodeWeight(sectionId, hs4Code, countryCode) || 0;
        
        // Calculate relative weight
        if (totalChapterWeight > 0 && hs4Weight > 0) {
          relativeWeight = hs4Weight / totalChapterWeight;
        }
      } else {
        // No cache - calculate on the fly
        
        // Calculate total chapter weight
        let totalChapterWeight = 0;
        Object.keys(chapter.subcategories || {}).forEach(hsCode => {
          const weight = this.getHsCodeWeight(sectionId, hsCode, countryCode) || 0;
          totalChapterWeight += weight;
        });
        
        // Get weight for this specific HS4 code
        hs4Weight = this.getHsCodeWeight(sectionId, hs4Code, countryCode) || 0;
        
        // Calculate relative weight
        if (totalChapterWeight > 0 && hs4Weight > 0) {
          relativeWeight = hs4Weight / totalChapterWeight;
        }
      }
      
      // Propagate up to chapter using weighted change
      if (relativeWeight > 0) {
        const chapterKey = `${sectionId}_${chapterId}`;
        
        // If we have a current chapter tariff, adjust it based on the weighted change
        if (tariffStore[countryCode][chapterKey] !== undefined) {
          tariffStore[countryCode][chapterKey] += change * relativeWeight;
        } else {
          // If no current chapter tariff, use the original and apply weighted change
          tariffStore[countryCode][chapterKey] = originalSectionTariff + (change * relativeWeight);
        }
        
        // Chapter was not directly set by user (only for current tariffs)
        if (tariffType === 'current') {
          this.directlySetTariffs[countryCode][chapterKey] = false;
        }
        
        // Propagate to section level using direct HS4 weight to section
        if (hs4Weight > 0) {
          // If we have a current section tariff, adjust it based on the weighted change
          if (tariffStore[countryCode][sectionId] !== undefined) {
            tariffStore[countryCode][sectionId] += change * hs4Weight;
          } else {
            // If no current section tariff, use the original and apply weighted change
            tariffStore[countryCode][sectionId] = originalSectionTariff + (change * hs4Weight);
          }
          
          // Section was not directly set by user (only for current tariffs)
          if (tariffType === 'current') {
            this.directlySetTariffs[countryCode][sectionId] = false;
          }
        }
      }
    }
    
    // Return affected tariff data for UI updates
    return {
      levelType,
      sectionId,
      chapterId,
      hs4Code,
      countryCode,
      currentTariffs: this.currentTariffs
    };
  }
  
  /**
   * Calculate original BEA tariffs for a country
   * @param {string} countryCode - ISO code for the country
   * @returns {Object} - Object with original BEA tariffs
   */
  calculateOriginalBeaTariffs(countryCode) {
    // Initialize original tariffs for this country if needed
    if (!this.originalTariffs[countryCode]) {
      this.originalTariffs[countryCode] = {};
      
      // Get original tariff data for each section
      if (this.getTariffOriginalData) {
        Object.keys(this.sectionToHs4Mapping).forEach(sectionId => {
          const originalData = this.getTariffOriginalData(countryCode, sectionId);
          if (originalData && originalData.usTariff !== undefined) {
            this.originalTariffs[countryCode][sectionId] = originalData.usTariff;
          }
        });
      }
    }
        
    // Convert section tariffs to BEA tariffs using weights
    const beaTariffs = {};
    
    // Check if we have BEA weights for this country
    if (!this.beaSectionWeights || !this.beaSectionWeights[countryCode]) {
      //console.warn(`No BEA weights found for country: ${countryCode}`);
      return beaTariffs;
    }
    
    // For each BEA code
    Object.keys(this.beaSectionWeights[countryCode]).forEach(beaCode => {
      const sectionWeights = this.beaSectionWeights[countryCode][beaCode];
      let weightedTariffSum = 0;
      let totalWeight = 0;
      
      // For each section with a weight for this BEA code
      Object.keys(sectionWeights).forEach(sectionId => {
        const weight = sectionWeights[sectionId];
        
        // Get the original tariff for this section
        let tariffValue = this.originalTariffs[countryCode]?.[sectionId] || 0;
        
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
   * Calculate current BEA code tariffs from section tariffs
   * @param {string} countryCode - ISO code for the country
   * @returns {Object} - Object with current BEA tariffs
   */
  calculateBeaTariffs(countryCode) {
    const beaTariffs = {};
    
    // Check if we have BEA weights for this country
    if (!this.beaSectionWeights || !this.beaSectionWeights[countryCode]) {
      //console.warn(`No BEA weights found for country: ${countryCode}`);
      return beaTariffs;
    }
    

    
    // Get original section tariffs for fallback
    if (!this.originalTariffs[countryCode]) {
      this.calculateOriginalBeaTariffs(countryCode); // This initializes this.originalTariffs[countryCode]
    }
    
    // Track sections with non-zero tariffs
    const nonZeroSections = [];
    
    // For each BEA code
    Object.keys(this.beaSectionWeights[countryCode]).forEach(beaCode => {
      const sectionWeights = this.beaSectionWeights[countryCode][beaCode];
      let weightedTariffSum = 0;
      let totalWeight = 0;
      
      // For each section with a weight for this BEA code
      Object.keys(sectionWeights).forEach(sectionId => {
        const weight = sectionWeights[sectionId];
        
        // Get the tariff for this section - default to original if no change
        let tariffValue;
        
        if (this.currentTariffs[countryCode] && this.currentTariffs[countryCode][sectionId] !== undefined) {
          // User changed this section's tariff
          tariffValue = this.currentTariffs[countryCode][sectionId];
        } else {
          // No change - use original tariff
          tariffValue = this.originalTariffs[countryCode]?.[sectionId] || 0;
        }
        
        // Include in the weighted sum
        weightedTariffSum += tariffValue * weight;
        totalWeight += weight;
        
        // Track non-zero tariffs
        if (Math.abs(tariffValue) > 0.0001) {
          nonZeroSections.push({
            sectionId,
            tariffValue,
            weight,
            contribution: tariffValue * weight,
            source: this.currentTariffs[countryCode]?.[sectionId] !== undefined ? 'current' : 'original'
          });
        }
      });
      
      // Calculate weighted average tariff
      if (totalWeight > 0) {
        beaTariffs[beaCode] = weightedTariffSum / totalWeight;
        
        // Log non-zero BEA tariffs for debugging
        if (Math.abs(beaTariffs[beaCode]) > 0.00000001) {   }
      } else {
        beaTariffs[beaCode] = 0;
      }
    });
    return beaTariffs;
  }
  
  /**
   * Get a tariff value for a specific level in the hierarchy
   * @param {string} levelType - Level type ('section', 'chapter', or 'hs4')
   * @param {string} sectionId - Section ID
   * @param {string|null} chapterId - Chapter ID (if levelType is 'chapter' or 'hs4')
   * @param {string|null} hs4Code - HS4 code (if levelType is 'hs4')
   * @param {string} countryCode - ISO code for the country
   * @param {string} tariffType - Type of tariff to get ('current' or 'original')
   * @returns {number} - Tariff value or 0 if not found
   */
  getTariffValue(levelType, sectionId, chapterId, hs4Code, countryCode, tariffType = 'current') {
    // Choose the tariff store based on tariffType
    const tariffStore = tariffType === 'original' ? this.originalTariffs : this.currentTariffs;
    
    if (!countryCode || !tariffStore[countryCode]) {
      return 0;
    }
    
    let hierarchyKey;
    if (levelType === 'section') {
      hierarchyKey = sectionId;
    } else if (levelType === 'chapter') {
      hierarchyKey = `${sectionId}_${chapterId}`;
    } else if (levelType === 'hs4') {
      hierarchyKey = `${sectionId}_${chapterId}_${hs4Code}`;
    }
    
    return tariffStore[countryCode][hierarchyKey] !== undefined ? 
      tariffStore[countryCode][hierarchyKey] : 0;
  }
  
  /**
   * Check if a tariff was directly set by the user
   * @param {string} levelType - Level type ('section', 'chapter', or 'hs4')
   * @param {string} sectionId - Section ID
   * @param {string|null} chapterId - Chapter ID (if levelType is 'chapter' or 'hs4')
   * @param {string|null} hs4Code - HS4 code (if levelType is 'hs4')
   * @param {string} countryCode - ISO code for the country
   * @returns {boolean} - True if directly set, false otherwise
   */
  isDirectlySet(levelType, sectionId, chapterId, hs4Code, countryCode) {
    if (!countryCode || !this.directlySetTariffs[countryCode]) {
      return false;
    }
    
    let hierarchyKey;
    if (levelType === 'section') {
      hierarchyKey = sectionId;
    } else if (levelType === 'chapter') {
      hierarchyKey = `${sectionId}_${chapterId}`;
    } else if (levelType === 'hs4') {
      hierarchyKey = `${sectionId}_${chapterId}_${hs4Code}`;
    }
    
    return this.directlySetTariffs[countryCode][hierarchyKey] === true;
  }
  
  /**
   * Generate tariff data for calculations
   * @param {string} countryCode - ISO code for the country
   * @param {Array} originalBeaTariffs - Original BEA tariffs
   * @returns {Object} - Tariff data object with vectors and matrices
   */
  generateTariffData(countryCode, providedOriginalBeaTariffs = null) {    
    // Calculate current BEA tariffs
    const currentBeaTariffs = this.calculateBeaTariffs(countryCode);
    
    // Calculate original BEA tariffs (separate from current)
    const calculatedOriginalBeaTariffs = this.calculateOriginalBeaTariffs(countryCode);
    
    // Use provided original tariffs, or our calculated ones
    const originals = providedOriginalBeaTariffs || calculatedOriginalBeaTariffs;
    
    // Always use all BEA codes from customBEAOrder regardless of tariff values
    // This ensures we always have a full tau_c vector with the correct number of elements
    let beaCodes = this.customBEAOrder;
        
    // Create vectors for original tariffs and percent changes
    const originalVector = {};
    const percentChangeVector = {};
    
    // Debug: Track non-zero values
    const nonZeroChanges = [];
    
    beaCodes.forEach(beaCode => {
      const originalTariff = originals[beaCode] || 0;
      const currentTariff = currentBeaTariffs[beaCode] || 0;
      
      // Store original tariff
      originalVector[beaCode] = originalTariff;
            
      // Calculate percent change using the economically correct formula:
      // (currentTariff - originalTariff) / (100 + originalTariff)
      let percentChange = 0;
      
      if (originalTariff !== 0 || currentTariff !== 0) {
        percentChange = (currentTariff - originalTariff) / (100 + originalTariff);
        
        // Track non-zero values for debugging
        if (Math.abs(percentChange) > 0.0001) {
          nonZeroChanges.push({
            beaCode,
            originalTariff,
            currentTariff,
            percentChange,
            formula: `(${currentTariff} - ${originalTariff}) / (100 + ${originalTariff}) = ${percentChange}`
          });
        }
      }
      
      // Ensure the value is finite
      percentChange = isFinite(percentChange) ? percentChange : 0;
      
      // Apply import weighting if available
      if (this.beaImportWeights && 
          this.beaImportWeights[countryCode] && 
          this.beaImportWeights[countryCode][beaCode] !== undefined) {
        
        const importWeight = this.beaImportWeights[countryCode][beaCode];
        percentChangeVector[beaCode] = percentChange * importWeight;
      } else {
        // If no import weights, use the unweighted percent change
        percentChangeVector[beaCode] = percentChange;
      }
    });
    
    // Create array of percent changes in the correct order
    const percentChangeArray = beaCodes.map(code => percentChangeVector[code] || 0);
    
    
    // Store the data for export
    const existingIndex = this.iso_list.indexOf(countryCode);
    
    if (existingIndex !== -1) {
      // Update existing entries
      this.tau_c[existingIndex] = percentChangeArray;
      this.original_tariffs_by_country[countryCode] = originalVector;
      this.percent_change_by_country[countryCode] = percentChangeVector;
    } else {
      // Add new entries
      this.iso_list.push(countryCode);
      this.tau_c.push(percentChangeArray);
      this.original_tariffs_by_country[countryCode] = originalVector;
      this.percent_change_by_country[countryCode] = percentChangeVector;
    }
    
    // Format for export
    return {
      iso_list: this.iso_list,
      bea_codes: beaCodes,
      tau_c: this.tau_c,
      tauCForCalculations: this.iso_list.reduce((obj, iso, idx) => {
        obj[iso] = this.tau_c[idx];
        return obj;
      }, {}),
      importWeighted: Boolean(
        this.beaImportWeights && 
        this.beaImportWeights[countryCode] && 
        Object.keys(this.beaImportWeights[countryCode]).length > 0
      ),
      // Include section tariffs - both original and current, filtering to include only section-level entries
      sectionTariffs: this.iso_list.reduce((obj, iso) => {
        // Create filtered objects with only section-level entries (no underscores in key)
        const originalSectionTariffs = {};
        const currentSectionTariffs = {};
        
        // Filter original tariffs to include only section-level entries
        if (this.originalTariffs[iso]) {
          Object.keys(this.originalTariffs[iso]).forEach(key => {
            if (!key.includes('_')) {
              originalSectionTariffs[key] = this.originalTariffs[iso][key];
            }
          });
        }
        
        // Filter current tariffs to include only section-level entries
        if (this.currentTariffs[iso]) {
          Object.keys(this.currentTariffs[iso]).forEach(key => {
            if (!key.includes('_')) {
              currentSectionTariffs[key] = this.currentTariffs[iso][key];
            }
          });
        }
        
        obj[iso] = {
          original: originalSectionTariffs,
          current: currentSectionTariffs
        };
        return obj;
      }, {})
    };
  }
  
  /**
   * Clear all tariff data for a country
   * @param {string} countryCode - ISO code for the country
   */
  clearCountryData(countryCode) {
    if (!countryCode) return;
    
    // Remove from tariff stores
    delete this.currentTariffs[countryCode];
    delete this.directlySetTariffs[countryCode];
    
    // Remove from export data
    const index = this.iso_list.indexOf(countryCode);
    if (index !== -1) {
      this.iso_list.splice(index, 1);
      this.tau_c.splice(index, 1);
      delete this.original_tariffs_by_country[countryCode];
      delete this.percent_change_by_country[countryCode];
    }
  }
  
  /**
   * Clear all tariff data
   */
  clearAllData() {
    this.currentTariffs = {};
    this.directlySetTariffs = {};
    this.iso_list = [];
    this.tau_c = [];
    this.original_tariffs_by_country = {};
    this.percent_change_by_country = {};
  }
}

  // Return the TariffPropagation class
  return TariffPropagation;
})();