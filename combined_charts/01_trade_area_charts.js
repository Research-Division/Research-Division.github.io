/**
 * Multi-Chart Display Panel
 * 
 * This file implements a panel-based approach for displaying multiple charts
 * in a scrollable container that can be shown/hidden like a modal.
 */

// Immediately load section mapping to ensure it's available for treemap
(function loadSectionMappingImmediately() {
    try {
        //console.log('Loading section mapping in 01_trade_area_charts.js');
        const xhr = new XMLHttpRequest();
        xhr.open('GET', DataPaths.meta.section_to_chapters, false); // Synchronous
        xhr.send(null);
        
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            window.sectionToChaptersMapping = data;
            //console.log('Section mapping loaded:', Object.keys(data).length, 'sections available');
            //console.log('First section title:', data['1'] ? data['1'].title : 'not found');
        }
    } catch (error) {
        console.error('Error loading section mapping:', error);
    }
})();

window.multiChartPanel = (function() {
    // Flag to track if the panel has been initialized
    let isInitialized = false;
    let isVisible = false;
    
    // Cached bilateral features data
    let bilateralFeaturesData = null;
    
    // Cached section time series features data
    let sectionTimeSeriesData = null;
    
    // Current country selection - this will drive all charts
    let currentCountry = {
        iso: 'CHN',
        name: 'China'
    };
    
    /**
     * Initialize the panel structure
     */
    function initialize() {
        if (isInitialized) return;
        
        //console.log('Initializing multi-chart panel');
        
        // Create panel container if it doesn't exist
        createPanelContainer();
        
        isInitialized = true;
    }
    
    /**
     * Create the panel container and add it to the DOM
     */
    function createPanelContainer() {
        // Check if the container already exists
        if (document.getElementById('multi-chart-panel-container')) {
            return;
        }
        
        // Create the panel container
        const panelContainer = document.createElement('div');
        panelContainer.id = 'multi-chart-panel-container';
        panelContainer.className = 'multi-chart-panel-container';
        panelContainer.style.display = 'none'; // Hidden by default
        
        // Fetch the HTML content from the external file using DataPaths
        fetch(DataPaths.charts.tradeArea)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load HTML template: ${response.status} ${response.statusText}`);
                }
                return response.text();
            })
            .then(html => {
                // Insert the HTML content
                panelContainer.innerHTML = html;
                
                // Update country name and ISO in the loaded HTML
                const countryNameElements = panelContainer.querySelectorAll('.country-name');
                const countryIsoElements = panelContainer.querySelectorAll('.country-iso');
                
                countryNameElements.forEach(el => {
                    el.textContent = currentCountry.name;
                });
                
                countryIsoElements.forEach(el => {
                    el.textContent = currentCountry.iso;
                });
                
                // Add the panel to the body
                document.body.appendChild(panelContainer);
                
                // Set up event listeners
                setupEventListeners(panelContainer);
                
                // Load bilateral features data and update the narrative
                loadBilateralFeaturesData()
                    .then(() => updateTradeNarrative());
            })
            .catch(error => {
                console.error('Error loading HTML template:', error);
                // Fallback to a simple container with error message
                panelContainer.innerHTML = `
                    <div class="multi-chart-panel-content">
                        <div class="multi-chart-panel-header">
                            <h2>Error Loading Panel</h2>
                            <button class="panel-close-button" id="panel-close-button">
                                <img src="assets/fontawesome/xmark.svg" alt="Close" class="close-icon">
                            </button>
                        </div>
                        <div class="multi-chart-panel-body">
                            <p>Failed to load panel content: ${error.message}</p>
                        </div>
                    </div>
                `;
                document.body.appendChild(panelContainer);
                
                // Add close button event even in error state
                const closeButton = panelContainer.querySelector('#panel-close-button');
                if (closeButton) {
                    closeButton.addEventListener('click', hidePanel);
                }
            });
    }
    
    /**
     * Set up event listeners for the panel
     */
    function setupEventListeners(panelContainer) {
        // Add event listener for the close button
        const closeButton = panelContainer.querySelector('#panel-close-button');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                hidePanel();
            });
        }
        
        // Make dropdown toggle accessible
        const dropdownToggle = panelContainer.querySelector('.country-dropdown-toggle');
        if (dropdownToggle) {
            // Add accessibility attributes
            dropdownToggle.setAttribute('tabindex', '0');
            dropdownToggle.setAttribute('role', 'button');
            dropdownToggle.setAttribute('aria-haspopup', 'true');
            dropdownToggle.setAttribute('aria-expanded', 'false');
            dropdownToggle.setAttribute('aria-label', 'Select country');
            
            // Add click listener
            dropdownToggle.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent click from closing the dropdown immediately
                toggleCountryDropdown();
                
                // Load country list if not already loaded
                loadCountryList();
            });
            
            // Add keyboard listener
            dropdownToggle.addEventListener('keydown', function(e) {
                // Toggle on Enter or Space
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCountryDropdown();
                    
                    // Load country list if not already loaded
                    loadCountryList();
                }
            });
        }
        
        // We'll now set up the sector group dropdown event listeners dynamically
        // when the dropdown is created by updateTariffExplanationText()
        
        // Setup delegated event listener for country options (which will be added dynamically)
        const dropdown = document.getElementById('country-dropdown');
        if (dropdown) {
            // Add role for accessibility
            dropdown.setAttribute('role', 'listbox');
            
            // Click listener
            dropdown.addEventListener('click', function(e) {
                // Find the closest country-option ancestor of the clicked element
                const option = e.target.closest('.country-option');
                if (option) {
                    e.stopPropagation();
                    const iso = option.getAttribute('data-iso');
                    const name = option.getAttribute('data-name');
                    
                    if (iso && name) {
                        updateCountry(iso, name);
                    }
                }
            });
            
            // Keyboard navigation for dropdown
            dropdown.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Close dropdown on Escape
                    dropdown.classList.remove('active');
                    dropdownToggle.classList.remove('active');
                    dropdownToggle.setAttribute('aria-expanded', 'false');
                    dropdownToggle.focus(); // Return focus to toggle
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    // Navigate options with arrow keys
                    e.preventDefault();
                    
                    const options = Array.from(dropdown.querySelectorAll('.country-option'));
                    if (options.length === 0) return;
                    
                    // Find currently focused option
                    const focusedOption = document.activeElement.closest('.country-option');
                    let nextIndex = 0;
                    
                    if (focusedOption) {
                        const currentIndex = options.indexOf(focusedOption);
                        if (e.key === 'ArrowDown') {
                            nextIndex = (currentIndex + 1) % options.length;
                        } else {
                            nextIndex = (currentIndex - 1 + options.length) % options.length;
                        }
                    }
                    
                    options[nextIndex].focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    // Select option with Enter or Space
                    e.preventDefault();
                    const option = e.target.closest('.country-option');
                    if (option) {
                        const iso = option.getAttribute('data-iso');
                        const name = option.getAttribute('data-name');
                        
                        if (iso && name) {
                            updateCountry(iso, name);
                        }
                    }
                }
            });
        }
        
        // Add event listener for the reset treemap button
        const resetTreemapButtonImports = panelContainer.querySelector('#reset-treemap-button-imports');
        if (resetTreemapButtonImports) {
            resetTreemapButtonImports.addEventListener('click', function() {
                // Get the icon and manually restart the animation
                const icon = this.querySelector('.reset-icon');
                if (icon) {
                    // Remove and reapply animation to force restart
                    icon.style.animation = 'none';
                    // Force reflow
                    void icon.offsetWidth;
                    // Start animation
                    icon.style.animation = 'spin-full 0.5s ease';
                }
                
                // Reset the treemap
                createCompressedTreemapChartImports();
            });
        }
        const resetTreemapButtonExports = panelContainer.querySelector('#reset-treemap-button-exports');
        if (resetTreemapButtonExports) {
            resetTreemapButtonExports.addEventListener('click', function() {
                // Get the icon and manually restart the animation
                const icon = this.querySelector('.reset-icon');
                if (icon) {
                    // Remove and reapply animation to force restart
                    icon.style.animation = 'none';
                    // Force reflow
                    void icon.offsetWidth;
                    // Start animation
                    icon.style.animation = 'spin-full 0.5s ease';
                }
                
                // Reset the treemap
                createCompressedTreemapChartExports();
            });
        }
        
        // Setup tab switching with enhanced accessibility
        const tabsContainer = panelContainer.querySelector('#chart-tabs-container');
        const tabs = Array.from(panelContainer.querySelectorAll('.tab'));
        
        // Add appropriate ARIA attributes to tabs
        if (tabsContainer) {
            tabsContainer.setAttribute('role', 'tablist');
            
            // Set up each tab with proper attributes and event listeners
            tabs.forEach(tab => {
                // Add ARIA attributes
                tab.setAttribute('role', 'tab');
                tab.setAttribute('tabindex', '0');
                const tabId = tab.getAttribute('data-tab');
                const isActive = tab.classList.contains('active');
                tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                tab.setAttribute('aria-controls', `${tabId}-content`);
                
                // Find and set up corresponding panel
                const panel = panelContainer.querySelector(`.${tabId}-content`);
                if (panel) {
                    // Set ARIA attributes for panel
                    panel.setAttribute('role', 'tabpanel');
                    panel.setAttribute('id', `${tabId}-content`);
                    panel.setAttribute('aria-labelledby', tab.id);
                    panel.setAttribute('aria-hidden', !isActive);
                }
                
                // Add click event listener
                tab.addEventListener('click', function() {
                    const tabId = tab.getAttribute('data-tab');
                    switchToTab(tabId);
                });
                
                // Add keyboard event listener
                tab.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        // Activate tab on Enter or Space
                        e.preventDefault();
                        const tabId = tab.getAttribute('data-tab');
                        switchToTab(tabId);
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        // Immediately switch to next/previous tab
                        e.preventDefault();
                        
                        const currentIndex = tabs.indexOf(tab);
                        let nextIndex;
                        
                        if (e.key === 'ArrowRight') {
                            nextIndex = (currentIndex + 1) % tabs.length;
                        } else {
                            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                        }
                        
                        // Get the tabId of the next tab
                        const nextTab = tabs[nextIndex];
                        const nextTabId = nextTab.getAttribute('data-tab');
                        
                        // Activate the next tab
                        switchToTab(nextTabId);
                    }
                });
            });
        }
        
        // Set references to individual tabs for backward compatibility
        const tradeRelationsTab = panelContainer.querySelector('#trade-relations-tab');
        const tariffRelationshipsTab = panelContainer.querySelector('#tariff-relationships-tab');
        const sectionAnalysisTab = panelContainer.querySelector('#section-analysis-tab');
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
            // Check if this is a click on a dropdown toggle in section analysis tab
            if (e.target.closest('.sector-group-dropdown-toggle') || 
                e.target.classList.contains('sector-group-dropdown-toggle') ||
                e.target.closest('.dropdown-icon')) {
                
                // Check if we're in section-analysis tab
                if (document.querySelector('.section-analysis-content.active')) {
                    //onsole.log('Global click handler: Section dropdown toggle clicked');
                    
                    // Setup dropdown listeners first
                    setupNarrativeSectionDropdownListeners();
                    
                    // Then toggle the dropdown with a small delay
                    setTimeout(() => {
                        toggleSectionGroupDropdownInAnalysis();
                    }, 50);
                    
                    // Return to prevent further handling
                    return;
                }
            }
            
            // Handle country dropdown
            const countryDropdown = document.getElementById('country-dropdown');
            const countryToggle = document.querySelector('.country-dropdown-toggle');
            
            if (countryDropdown && countryDropdown.classList.contains('active') && 
                !countryDropdown.contains(e.target) && 
                (!countryToggle || !countryToggle.contains(e.target))) {
                countryDropdown.classList.remove('active');
                if (countryToggle) countryToggle.classList.remove('active');
            }
            
            // Handle sector group dropdown
            const sectorDropdown = document.getElementById('sector-group-dropdown');
            const sectorToggle = document.querySelector('.sector-group-dropdown-toggle');
            
            if (sectorDropdown && sectorDropdown.classList.contains('active') && 
                !sectorDropdown.contains(e.target) && 
                (!sectorToggle || !sectorToggle.contains(e.target))) {
                sectorDropdown.classList.remove('active');
                if (sectorToggle) sectorToggle.classList.remove('active');
            }
            
            // Also check section dropdown in Tab 3
            const sectionDropdown = document.querySelector('.section-analysis-content #section-group-dropdown');
            const sectionToggle = document.querySelector('.section-analysis-content .sector-group-dropdown-toggle');
            
            if (sectionDropdown && sectionDropdown.classList.contains('active') && 
                !sectionDropdown.contains(e.target) && 
                (!sectionToggle || !sectionToggle.contains(e.target))) {
                sectionDropdown.classList.remove('active');
                if (sectionToggle) sectionToggle.classList.remove('active');
            }
        });
        
        // Add event listener for escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && isVisible) {
                // If country dropdown is open, close it first
                const countryDropdown = document.getElementById('country-dropdown');
                if (countryDropdown && countryDropdown.classList.contains('active')) {
                    countryDropdown.classList.remove('active');
                    const countryToggle = document.querySelector('.country-dropdown-toggle');
                    if (countryToggle) countryToggle.classList.remove('active');
                    return;
                }
                
                // If sector group dropdown is open, close it
                const sectorDropdown = document.getElementById('sector-group-dropdown');
                if (sectorDropdown && sectorDropdown.classList.contains('active')) {
                    sectorDropdown.classList.remove('active');
                    const sectorToggle = document.querySelector('.sector-group-dropdown-toggle');
                    if (sectorToggle) sectorToggle.classList.remove('active');
                    return;
                }
                
                // Otherwise close the panel
                hidePanel();
            }
        });
    }
    
    /**
     * Load and populate the country list in the dropdown
     */
    async function loadCountryList() {
        const dropdownContent = document.getElementById('country-dropdown-content');
        if (!dropdownContent) return;
        
        // Only load once
        if (dropdownContent.querySelector('.country-option')) return;
        
        try {
            // Fetch country ISO mapping
            const response = await fetch(DataPaths.meta.country_iso_mapping);
            if (!response.ok) {
                throw new Error(`Failed to load country mapping: ${response.status}`);
            }
            
            const countryData = await response.json();
            
            // Sort countries alphabetically
            countryData.sort((a, b) => a.country.localeCompare(b.country));
            
            // Group countries by continent
            const countryGroups = {};
            
            // First try to load the continent data
            try {
                const continentResponse = await fetch(DataPaths.meta.country_continent);
                if (continentResponse.ok) {
                    const continentData = await continentResponse.json();
                    
                    // Create groups by continent
                    Object.keys(continentData).forEach(continent => {
                        countryGroups[continent] = [];
                        continentData[continent].forEach(country => {
                            const iso = Array.isArray(country.ISO_A3) ? country.ISO_A3[0] : country.ISO_A3;
                            const name = Array.isArray(country.country) ? country.country[0] : country.country;
                            if (iso && name) {
                                countryGroups[continent].push({ iso, name });
                            }
                        });
                    });
                } else {
                    throw new Error('Continent data not available');
                }
            } catch (error) {
                console.warn('Could not load continent data, falling back to alphabetical list', error);
                
                // Fall back to flat list
                countryGroups['All Countries'] = countryData.map(c => ({ 
                    iso: c.iso, 
                    name: c.country 
                }));
            }
            
            // Build the dropdown HTML
            let dropdownHtml = '';
            
            // For each continent, create a section
            Object.keys(countryGroups).forEach(continent => {
                const countries = countryGroups[continent];
                if (countries.length === 0) return;
                
                dropdownHtml += `<div class="country-group-header">${continent} (${countries.length})</div>`;
                
                countries.forEach(country => {
                    dropdownHtml += `
                        <div class="country-option" 
                             data-iso="${country.iso}" 
                             data-name="${country.name}"
                             tabindex="0"
                             role="option"
                             aria-label="Select ${country.name}">
                            ${country.name} (${country.iso})
                        </div>
                    `;
                });
            });
            
            // Update the dropdown content
            dropdownContent.innerHTML = dropdownHtml;
            
            //console.log('Country dropdown populated successfully');
        } catch (error) {
            console.error('Error loading country list:', error);
            dropdownContent.innerHTML = '<div class="dropdown-error">Error loading countries</div>';
        }
    }
    function formatDirectionalChange(formattedString) {
        if (typeof formattedString !== "string") return "N/A";
    
        // Extract numeric part for logic
        const value = parseFloat(formattedString.replace("%", ""));
    
        if (isNaN(value)) return "N/A";
        if (value > 0) return `rose by ${formattedString}`;
        if (value < 0) return `fell by ${formattedString}`;
        return `remained unchanged`;
    }
    /*
    function generateTradeNarrative(features, countryName, isoCode) {
        const latestYear = 2024;
        const initialYear = 1992;
    
        const safeRank = r => (r === 9999 ? 'N/A' : `#${r}`);
        const formatUSD = val => `$${Number(val).toLocaleString()}`;
    
        const tradeRank_latest_raw = features.tradeRank[0];
        const tradeRank_initial_raw = features.tradeRank.at(-1); // 1994

        const tradeRank_initial = safeRank(tradeRank_initial_raw);
        const tradeRank_latest = safeRank(tradeRank_latest_raw);

        let tradeDirection = "";
        if (tradeRank_initial_raw === 9999 || tradeRank_latest_raw === 9999) {
            tradeDirection = "compared to earlier data";
        } else if (tradeRank_latest_raw < tradeRank_initial_raw) {
            tradeDirection = `up from ${tradeRank_initial}`;
        } else if (tradeRank_latest_raw > tradeRank_initial_raw) {
            tradeDirection = `down from ${tradeRank_initial}`;
        } else {
            tradeDirection = `unchanged from ${tradeRank_initial}`;
        }
        const importRank_latest_raw = features.importRank[0];
        const exportRank_latest_raw = features.exportRank[0];
        const deficitRank_latest_raw = features.deficitRank[0];

        // If you want to show change over time, compare to oldest value
        const importRank_initial_raw = features.importRank.at(-1);
        const exportRank_initial_raw = features.exportRank.at(-1);
        const deficitRank_initial_raw = features.deficitRank.at(-1);

        // Optional: convert to safeRank format (e.g., "#3" or "N/A")
        const importRank_latest = safeRank(importRank_latest_raw);
        const exportRank_latest = safeRank(exportRank_latest_raw);
        const deficitRank_latest = safeRank(deficitRank_latest_raw);
            
        const importShare = features.importShare;
        const exportShare = features.exportShare;
        const bilateralDeficit = features.bilateralDeficit;
    
        const balanceText = (() => {
            if (features.deficitToSurplus === "NO") return `The <strong>U.S.</strong> has consistently run a trade deficit with <strong>${countryName}</strong> since 1992.`;
            if (features.deficitToSurplus === "ALWAYS SURPLUS") return `The <strong>U.S.</strong> has consistently maintained a trade surplus with <strong>${countryName}</strong> since 1992.`;
            return `The <strong>U.S.</strong> ran trade surpluses with <strong>${countryName}</strong> in the following years: ${features.deficitToSurplus.join(", ")}.`;
        })();
    
        const delta = features.valueChanges;
        const pct = features.percentChanges;
    
        return `
            <p>
                As of ${latestYear}, <strong>${countryName}</strong> ranked 
                ${tradeRank_latest} among all <strong>U.S.</strong> trading partners by total goods trade — 
                up from ${tradeRank_initial} in ${initialYear}. It is currently the 
                ${importRank_latest} largest source of imports and the 
                ${exportRank_latest} largest destination for exports.
            </p>
    
            <p>
                Imports from <strong>${countryName}</strong> make up ${importShare} of total <strong>U.S.</strong> imports and is the 
                destination for ${exportShare} of total <strong>U.S.</strong> exports. The <strong>U.S.</strong> currently 
                runs a trade deficit of ${bilateralDeficit}, ranking 
                ${deficitRank_latest} among all bilateral trade deficits.
            </p>
    
            <p>${balanceText}</p>                
            <p>
            More recently, over the past 5 years, imports ${formatDirectionalChange(pct.import["5year"])} and exports 
            ${formatDirectionalChange(pct.export["5year"])}. In the last year, exports 
            ${formatDirectionalChange(pct.export["1year"])} and imports 
            ${formatDirectionalChange(pct.import["1year"])}.
            </p>
        `;
    }
    */
    function generateTradeNarrative(features, countryName, isoCode) {
        const latestYear = 2024;
        const initialYear = 1992;
  
        function ordinal(n) {
            const s = ["<sup>th</sup>", "<sup>st</sup>", "<sup>nd</sup>", "<sup>rd</sup>"], v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        }
        
        const safeRank = r => (r === 9999 ? 'N/A' : ordinal(r));
        const formatUSD = val => `${Number(val).toLocaleString()}`;
  
        const tradeRank_latest_raw = features.tradeRank[0];
        const tradeRank_initial_raw = features.tradeRank.at(-1);
  
        const tradeRank_initial = safeRank(tradeRank_initial_raw);
        const tradeRank_latest = safeRank(tradeRank_latest_raw);
  
        let tradeDirection = "";
        if (tradeRank_initial_raw === 9999 || tradeRank_latest_raw === 9999) {
            tradeDirection = "compared to earlier data";
        } else if (tradeRank_latest_raw < tradeRank_initial_raw) {
            tradeDirection = `up from ${tradeRank_initial}`;
        } else if (tradeRank_latest_raw > tradeRank_initial_raw) {
            tradeDirection = `down from ${tradeRank_initial}`;
        } else {
            tradeDirection = `unchanged from ${tradeRank_initial}`;
        }
  
        const importRank_latest_raw = features.importRank[0];
        const exportRank_latest_raw = features.exportRank[0];
        const deficitRank_latest_raw = features.deficitRank[0];
  
        const importRank_latest = safeRank(importRank_latest_raw);
        const exportRank_latest = safeRank(exportRank_latest_raw);
        const deficitRank_latest = safeRank(deficitRank_latest_raw);
  
        const importShare = features.importShare;
        const exportShare = features.exportShare;
        const bilateralDeficit = features.bilateralDeficit;
  
        // Enhanced trade balance narrative with better transitions
        const balanceText = (() => {
            let narrative = '';
            
            if (!features.tradeBalanceAnalysis || !features.tradeBalanceAnalysis.summary_stats) {
                // Fallback to old logic
                if (features.deficitToSurplus === "NO") return `The <strong>U.S.</strong> has consistently run a trade deficit with <strong>${countryName}</strong> since 1992.`;
                if (features.deficitToSurplus === "ALWAYS SURPLUS") return `The <strong>U.S.</strong> has consistently maintained a trade surplus with <strong>${countryName}</strong> since 1992.`;
                return `The <strong>U.S.</strong> ran trade surpluses with <strong>${countryName}</strong> in the following years: ${features.deficitToSurplus.join(", ")}.`;
            }
  
            const analysis = features.tradeBalanceAnalysis;
            const stats = analysis.summary_stats;
            const currentStatus = analysis.current_status;
            const alwaysType = analysis.always_type;
  
            if (alwaysType === "deficit") {
                return `The <strong>U.S.</strong> has consistently run a trade deficit with <strong>${countryName}</strong> since 1992.`;
            } else if (alwaysType === "surplus") {
                return `The <strong>U.S.</strong> has consistently maintained a trade surplus with <strong>${countryName}</strong> since 1992.`;
            } else {
                // Complex case with alternating periods - enhanced transition logic
                const currentStatusText = currentStatus === "surplus" ? "surplus" : "deficit";
                const currentPercentage = currentStatus === "surplus" ? stats.surplus_percentage_total : stats.deficit_percentage_total;
                const recent5yrPct = currentStatus === "surplus" ? stats.surplus_percentage_5yr : stats.deficit_percentage_5yr;
  
                narrative = `While the <strong>U.S.</strong> currently runs a trade ${currentStatusText} with <strong>${countryName}</strong>, this has not always been the case. `;
  
                if (stats.total_years_analyzed > 0) {
                    narrative += `Over the past ${stats.total_years_analyzed} years, the <strong>U.S.</strong> has run a ${currentStatusText} in ${currentPercentage}% of years. `;
                }
  
                // Smart transition based on comparison of historical vs recent patterns
                if (stats.years_analyzed_5yr > 0) {
                    const recent5yrYears = Math.round(recent5yrPct * stats.years_analyzed_5yr / 100);
                    const historicalRate = currentPercentage / 100;
                    const recentRate = recent5yrPct / 100;
                    const rateDifference = Math.abs(recentRate - historicalRate);
  
                    // Determine if pattern has changed substantially (threshold of 0.2 or 20%)
                    if (rateDifference < 0.2) {
                        // Pattern hasn't changed much
                        if (recent5yrPct === 100) {
                            narrative += `This pattern has remained consistent, with the <strong>U.S.</strong> running a ${currentStatusText} in every year over the past 5 years.`;
                        } else if (recent5yrPct === 0) {
                            narrative += `However, this pattern has shifted dramatically in recent years, with the <strong>U.S.</strong> running no ${currentStatusText} in the past 5 years.`;
                        } else {
                            narrative += `This pattern has not changed substantially in recent years, with the <strong>U.S.</strong> running a ${currentStatusText} in ${recent5yrYears} out of ${stats.years_analyzed_5yr} years over the past 5 years.`;
                        }
                    } else {
                        // Pattern has changed significantly
                        if (recentRate > historicalRate) {
                            if (recent5yrPct === 100) {
                                narrative += `This trend has intensified in recent years, with the <strong>U.S.</strong> running a ${currentStatusText} in every year over the past 5 years.`;
                            } else {
                                narrative += `This trend has strengthened in recent years, with the <strong>U.S.</strong> running a ${currentStatusText} in ${recent5yrYears} out of ${stats.years_analyzed_5yr} years over the past 5 years.`;
                            }
                        } else {
                            if (recent5yrPct === 0) {
                                narrative += `However, this pattern has reversed in recent years, with the <strong>U.S.</strong> running no ${currentStatusText} in the past 5 years.`;
                            } else {
                                narrative += `However, this pattern has weakened in recent years, with the <strong>U.S.</strong> running a ${currentStatusText} in only ${recent5yrYears} out of ${stats.years_analyzed_5yr} years over the past 5 years.`;
                            }
                        }
                    }
                }
            }
  
            return narrative;
        })();
  
        const delta = features.valueChanges;
        const pct = features.percentChanges;
  
        return `
            <p>
                As of ${latestYear}, <strong>${countryName}</strong> ranked 
                ${tradeRank_latest} among all <strong>U.S.</strong> trading partners by total goods trade — 
                ${tradeDirection}. It is currently the 
                ${importRank_latest} largest source of imports and the 
                ${exportRank_latest} largest destination for exports.
            </p>
  
            <p>
                Imports from <strong>${countryName}</strong> make up ${importShare} of total <strong>U.S.</strong> imports and is the 
                destination for ${exportShare} of total <strong>U.S.</strong> exports. The <strong>U.S.</strong> currently 
                runs a trade deficit of ${bilateralDeficit}, ranking 
                ${deficitRank_latest} among all bilateral trade deficits.
            </p>
  
            <p>${balanceText}</p>                
            <p>
            More recently, over the past 5 years, imports ${formatDirectionalChange(pct.import["5year"])} and exports 
            ${formatDirectionalChange(pct.export["5year"])}. In the last year, exports 
            ${formatDirectionalChange(pct.export["1year"])} and imports 
            ${formatDirectionalChange(pct.import["1year"])}.
            </p>
        `;
    }
    /**
     * Show the panel and load the charts
     * @param {string} initialTab - The tab to show initially (defaults to 'trade-relations')
     */
    function showPanel(initialTab = 'trade-relations') {
        if (!isInitialized) {
            initialize();
        }
        
        // Load bilateral features data and update narratives
        loadBilateralFeaturesData()
            .then(() => {
                updateTradeNarrative();
                updateTariffExplanationText(); // Make sure tariff explanation is updated when panel is shown
            });
        
        // Show the panel
        const panel = document.getElementById('multi-chart-panel-container');
        if (panel) {
            panel.style.display = 'flex';
            isVisible = true;
            
            // Create the charts (with a small delay to ensure HTML is fully loaded if it was just created)
            setTimeout(() => {
                // Set initial tab content visibility
                const tradeRelationsContent = document.querySelector('.trade-relations-content');
                const tariffRelationshipsContent = document.querySelector('.tariff-relationships-content');
                
                if (tradeRelationsContent && tariffRelationshipsContent) {
                    if (initialTab === 'trade-relations') {
                        tradeRelationsContent.classList.add('active');
                        tariffRelationshipsContent.classList.remove('active');
                    } else {
                        tariffRelationshipsContent.classList.add('active');
                        tradeRelationsContent.classList.remove('active');
                    }
                }
                
                // Switch to the specified tab
                switchToTab(initialTab);
                //console.log('Charts loaded in panel with initial tab:', initialTab);
            }, 100);
        } else {
            // If panel doesn't exist yet (might be loading asynchronously),
            // we'll create it and set a listener to create charts when it's ready
            createPanelContainer();
            
            // Poll for panel creation
            const checkInterval = setInterval(() => {
                const newPanel = document.getElementById('multi-chart-panel-container');
                if (newPanel) {
                    clearInterval(checkInterval);
                    newPanel.style.display = 'flex';
                    isVisible = true;
                    
                    setTimeout(() => {
                        // Set initial tab content visibility
                        const tradeRelationsContent = document.querySelector('.trade-relations-content');
                        const tariffRelationshipsContent = document.querySelector('.tariff-relationships-content');
                        
                        if (tradeRelationsContent && tariffRelationshipsContent) {
                            if (initialTab === 'trade-relations') {
                                tradeRelationsContent.classList.add('active');
                                tariffRelationshipsContent.classList.remove('active');
                            } else {
                                tariffRelationshipsContent.classList.add('active');
                                tradeRelationsContent.classList.remove('active');
                            }
                        }
                        
                        // Make sure the tariff explanation text is updated
                        updateTariffExplanationText();
                        
                        // Switch to the specified tab
                        switchToTab(initialTab);
                        //console.log('Charts loaded in newly created panel with initial tab:', initialTab);
                    }, 100);
                }
            }, 100);
            
            // Safety cleanup in case panel never loads
            setTimeout(() => {
                clearInterval(checkInterval);
            }, 5000);
        }
    }
    
    /**
     * Hide the panel and perform thorough cleanup
     */
    function hidePanel() {
        const panel = document.getElementById('multi-chart-panel-container');
        if (panel) {
            // Clean up any tooltips before hiding the panel
            const globalTooltip = document.getElementById('treemap-tooltip-container');
            if (globalTooltip) {
                globalTooltip.style.visibility = 'hidden';
                // Optional: completely remove tooltip from DOM for complete cleanup
                if (globalTooltip.parentNode) {
                    globalTooltip.parentNode.removeChild(globalTooltip);
                }
            }
            
            panel.style.display = 'none';
            isVisible = false;
            
            // Thorough cleanup to free memory:
            
            // 1. Clear all chart data caches
            clearAllDataCaches();
            
            // 2. Reset all chart containers to empty state
            const chartContainers = [
                'bilateral-tariff-container',
                'industry-tariffs-bar-container',
                'industry-tariffs-time-container',
                'bilateral-trade-container',
                'compressed-treemap-container-imports',
                'compressed-treemap-container-exports'
            ];
            
            chartContainers.forEach(containerId => {
                const container = document.getElementById(containerId);
                if (container) {
                    // Clear container content
                    container.innerHTML = '';
                }
            });
            
            //console.log('Panel hidden and memory cleaned up');
        }
    }
    
    // Cached product features data
    let productFeaturesData = null;
    
    /**
     * Load bilateral features data from DataPaths.features.bilatFeatures
     * @returns {Promise} A promise that resolves when the data is loaded
     */
    function loadBilateralFeaturesData() {
        if (bilateralFeaturesData) {
            return Promise.resolve(bilateralFeaturesData);
        }
        
        // Create promises for both bilateral features and product data
        const bilatFeaturesPromise = fetch(DataPaths.features.bilatFeatures)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load bilateral features data: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                bilateralFeaturesData = data;
                //console.log('Bilateral features data loaded successfully');
                return bilateralFeaturesData;
            });
            
        const productFeaturesPromise = fetch(DataPaths.features.productFeatures)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load product features data: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                productFeaturesData = data;
                //console.log('Product features data loaded successfully');
                return productFeaturesData;
            });
            
        const sectionTimeSeriesPromise = fetch(DataPaths.features.sectionTimeSeries)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load section time series data: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                sectionTimeSeriesData = data;
                //console.log('Section time series data loaded successfully');
                return sectionTimeSeriesData;
            })
            .catch(error => {
                console.error('Error loading section time series data:', error);
                return null;
            });
        
        // Return a promise that resolves when all data fetches are complete
        return Promise.all([bilatFeaturesPromise, productFeaturesPromise, sectionTimeSeriesPromise])
            .then(() => bilateralFeaturesData)
            .catch(error => {
                console.error('Error loading features data:', error);
                return null;
            });
    }
    
    /**
     * Generate time series narrative based on section time series features
     * @param {Object} features - The section time series features data
     * @returns {string} HTML string containing the narrative
     */
    function generateTimeSeriesNarrative(features) {
        const name = features.country_name || "this country";
        const imports = features.top_sectors.imports;
        const exports = features.top_sectors.exports;
        
        function getTitlesOnly(yearData) {
          return yearData.map(d => d.title);
        }
        
        function ordinal(n) {
          const s = ["<sup>th</sup>", "<sup>st</sup>", "<sup>nd</sup>", "<sup>rd</sup>"], v = n % 100;
          return n + (s[(v - 20) % 10] || s[v] || s[0]);
        }
      
        function getSimpleChangeDescription(oldData, newData) {
          const oldTitles = oldData.map(d => d.title);
          const newTitles = newData.map(d => d.title);
          const overlap = oldTitles.filter(t => newTitles.includes(t));
          
          if (overlap.length === 3) return "remained remarkably stable";
          if (overlap.length >= 2) return "shown moderate changes";
          if (overlap.length === 1) return "undergone substantial transformation";
          return "been completely restructured";
        }
    
        // Build the overview paragraphs (for top section)
        let overviewContent = `<p>Over the past three decades (1994-2024), U.S.-${name} trade has evolved significantly. Import patterns have ${getSimpleChangeDescription(imports["1994"], imports["2024"])}, while export composition has ${getSimpleChangeDescription(exports["1994"], exports["2024"])}.</p>`;
        
        // Build the detailed analysis content (for right panel)
        let detailedContent = ``;
        
        const majorExports = features.international_significance?.major_exports_to_us || [];
        const majorDestinations = features.international_significance?.major_destinations || [];
        
        if (majorExports.length || majorDestinations.length) {
          if (majorExports.length && majorDestinations.length) {
            // Both exports and destinations - combine into one paragraph
            const topExports = majorExports.slice(0, 4);
            detailedContent += `<p><strong>${name}</strong> serves as a major supplier to the <strong>U.S.</strong> across several key sectors, including ${getTitlesOnly(topExports).join(", ")}. Conversely, <strong>${name}</strong> represents an important destination for U.S. exports, particularly in ${getTitlesOnly(majorDestinations).join(" and ")}.</p>`;
          } else if (majorExports.length) {
            const topExports = majorExports.slice(0, 4);
            detailedContent += `<p><strong>${name}</strong> serves as a major supplier to the <strong>U.S.</strong> across several key sectors, including ${getTitlesOnly(topExports).join(", ")}.</p>`;
          } else {
            detailedContent += `<p><strong>${name}</strong> represents an important destination for <strong>U.S.</strong> exports, particularly in ${getTitlesOnly(majorDestinations).join(" and ")}.</p>`;
          }
        } else {
          detailedContent += `<p><strong>${name}</strong> does not rank among the top trading partners for the <strong>U.S.</strong> in any specific HS category.</p>`;
        }
    
        // Show significant changes from both long-term and recent periods
        function getSignificantChanges(changes, direction, type, limit = 3) {
          const allChanges = (changes?.[direction] || [])
            .filter(change => {
              const rankDelta = Math.abs(change.rank_change);
              const valueDelta = Math.abs(parseFloat(change.value_change_pct));
              // Include both major long-term shifts and significant recent changes
              return rankDelta >= 3 || valueDelta >= 50;
            })
            .sort((a, b) => {
              // Prioritize larger rank changes, then larger value changes
              const aRankDelta = Math.abs(a.rank_change);
              const bRankDelta = Math.abs(b.rank_change);
              if (aRankDelta !== bRankDelta) return bRankDelta - aRankDelta;
              return Math.abs(parseFloat(b.value_change_pct)) - Math.abs(parseFloat(a.value_change_pct));
            })
            .slice(0, limit)
            .map(change => {
              const directionText = direction === "growing" ? "climbed" : "fell";
              return `${change.title}, which ${directionText} from ${ordinal(change.start_rank)} to ${ordinal(change.end_rank)} place`;
            });
          
          return allChanges;
        }
    
        const impG = getSignificantChanges(features.recent_changes.imports, "growing", "import");
        const impS = getSignificantChanges(features.recent_changes.imports, "shrinking", "import");
        const expG = getSignificantChanges(features.recent_changes.exports, "growing", "export");
        const expS = getSignificantChanges(features.recent_changes.exports, "shrinking", "export");
        
        function joinWithOxfordComma(items) {
            if (items.length <= 1) return items.join("");
            if (items.length === 2) return items.join(" and ");
            return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
          }
        // Group import changes together
        if (impG.length || impS.length) {
            let importParagraph = "";
            if (impG.length && impS.length) {
              importParagraph = `<p>From 1994 to 2024, imports from <strong>${name}</strong> have seen notable growth in ${joinWithOxfordComma(impG)}. Over the same period, some sectors have lost ground, including ${joinWithOxfordComma(impS)}. These changes represent shifts in <strong>${name}'s</strong> competitive position among supplier countries to the <strong>U.S.</strong> market.</p>`;
            } else if (impG.length) {
              importParagraph = `<p>Since 1994, imports from <strong>${name}</strong> have shown notable growth, particularly in ${joinWithOxfordComma(impG)}. These gains represent improvements in <strong>${name}'s</strong> competitive position among supplier countries to the <strong>U.S.</strong> market.</p>`;
            } else {
              importParagraph = `<p>Over the past three decades, some import sectors from <strong>${name}</strong> have lost ground, including ${joinWithOxfordComma(impS)}. These declines represent weakening in <strong>${name}'s</strong> competitive position among supplier countries to the <strong>U.S.</strong> market.</p>`;
            }
            detailedContent += importParagraph;
          }
    
        // Group export changes together
        if (expG.length || expS.length) {
          let exportParagraph = "";
          if (expG.length && expS.length) {
            exportParagraph = `<p>For <strong>U.S.</strong> exports to <strong>${name}</strong>, the 30-year trend shows several sectors gaining prominence, such as ${joinWithOxfordComma(expG)}, though certain categories have seen their significance diminish, including ${joinWithOxfordComma(expS)}. This reflects <strong>${name}'s</strong> evolving importance as a destination market for <strong>U.S.</strong> goods across different sectors.</p>`;
          } else if (expG.length) {
            exportParagraph = `<p><strong>U.S.</strong> export trends to <strong>${name}</strong> since 1994 show several sectors gaining prominence, such as ${joinWithOxfordComma(expG)}. This reflects <strong>${name}'s</strong> growing importance as a destination market for <strong>U.S.</strong> goods in these sectors.</p>`;
          } else {
            exportParagraph = `<p>Over the past three decades, certain <strong>U.S.</strong> export categories to <strong>${name}</strong> have seen their significance diminish, notably ${joinWithOxfordComma(expS)}. This reflects <strong>${name}'s</strong> declining importance as a destination market for <strong>U.S.</strong> goods in these sectors.</p>`;
          }
          detailedContent += exportParagraph;
        }
        detailedContent += `<p><b>Figures 1, 2,</b> and <b>3</b> respectively display the trade balance, value of imports, and value of exports between the <strong>U.S.</strong> and <strong>${name}</strong>. The commodity groups displayed are grouped into four broader categories (select the dropdown to change categories): 
                            <span class="narrative-sector-group-selector-container">
                                <span class="narrative-sector-group-display">Agricultural Sectors</span>
                                <span class="narrative-sector-group-dropdown-toggle">
                                    <img src="assets/fontawesome/chevron-down-solid.svg" alt="Select Sector Group" class="dropdown-icon">
                                </span>
                                <div class="narrative-sector-group-dropdown" id="narrative-sector-group-dropdown">
                                    <div id="narrative-sector-group-dropdown-content">
                                        <div class="narrative-sector-group-option" data-group="agricultural">Agricultural Sectors</div>
                                        <div class="narrative-sector-group-option" data-group="industrial">Industrial Sectors</div>
                                        <div class="narrative-sector-group-option" data-group="manufacturing">Manufacturing Sectors</div>
                                        <div class="narrative-sector-group-option" data-group="materials">Raw Materials</div>
                                    </div>
                                </div>
                            </span></p>`
        detailedContent += `        <p class="selection-note">Note: Use the dropdown to view different categories in the chart.</p>`;
    
        // Return both parts as an object
        return {
          overview: overviewContent,
          detailed: detailedContent
        };
    }
    /**
     * Update the time series narrative based on section time series data
     * @returns {boolean} True if narrative was updated successfully, false otherwise
     */
    function updateTimeSeriesNarrative() {
        // Check if data is available - if not, we'll still set up the dropdown
        if (!sectionTimeSeriesData || !currentCountry || !currentCountry.iso) {
            //console.error('Cannot update time series narrative: missing data or country selection');
            
            // Even if narrative update fails, still set up dropdown
            setupNarrativeSectionDropdownListeners();
            return false;
        }
        
        const features = sectionTimeSeriesData[currentCountry.iso];
        if (!features) {
            console.warn(`No section time series features found for country: ${currentCountry.iso}`);
            
            // Even if narrative update fails, still set up dropdown
            setupNarrativeSectionDropdownListeners();
            return false;
        }
        
        // Add country name to features for use in the narrative
        features.country_name = currentCountry.name;
        
        const narrativeData = generateTimeSeriesNarrative(features);
        
        // Insert overview content into the top section
        const overviewSection = document.querySelector('.section-analysis-content > .text-section');
        if (overviewSection) {
            //overviewSection.innerHTML = narrativeData.overview;
        }
        
        // Insert detailed content into the right panel
        const detailedSection = document.querySelector('.section-analysis-content .split-right .text-section');
        if (detailedSection) {
            detailedSection.innerHTML = narrativeData.detailed;
            
            // Setup section dropdown event listeners after narrative is updated
            // Use a timeout to ensure the DOM is fully updated before attaching listeners
            setTimeout(() => {
                //console.log('Setting up section dropdown listeners after narrative update');
                setupNarrativeSectionDropdownListeners();
            }, 200);
            
            return true;
        }
        
        // If we get here, something went wrong with updating the narrative
        setupNarrativeSectionDropdownListeners();
        return false;
    }
    
    /**
     * Toggle the narrative section dropdown
     * @param {boolean|undefined} forceState - Optional: force dropdown to a specific state (true=open, false=closed)
     */
    function toggleNarrativeSectionDropdown(forceState) {
        const dropdown = document.getElementById('narrative-sector-group-dropdown');
        const toggle = document.querySelector('.narrative-sector-group-dropdown-toggle');
        const container = document.querySelector('.narrative-sector-group-selector-container');
        
        if (dropdown && toggle) {
            // Get container's position information
            const containerRect = container.getBoundingClientRect();
            
            // Position dropdown under the container
            dropdown.style.position = 'absolute';
            dropdown.style.left = (containerRect.left + containerRect.width/2) + 'px';
            dropdown.style.top = (containerRect.bottom + 5) + 'px';
            dropdown.style.zIndex = '1000';
            
            // Toggle active class or set to forced state
            let isExpanded;
            if (forceState !== undefined) {
                isExpanded = forceState;
                if (forceState) {
                    dropdown.classList.add('active');
                    toggle.classList.add('active');
                    container.classList.add('active');
                } else {
                    dropdown.classList.remove('active');
                    toggle.classList.remove('active');
                    container.classList.remove('active');
                }
            } else {
                isExpanded = dropdown.classList.toggle('active');
                toggle.classList.toggle('active');
                container.classList.toggle('active');
            }
            
            // Update ARIA attributes
            toggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            container.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            
            // If opening the dropdown, focus the first option after a short delay
            if (isExpanded) {
                setTimeout(() => {
                    const firstOption = dropdown.querySelector('.narrative-sector-group-option');
                    if (firstOption) {
                        firstOption.focus();
                    }
                }, 50);
            }
        }
    }
    
    /**
     * Cleanup existing event listeners for narrative section dropdown
     * to prevent duplicates when reattaching
     */
    function cleanupNarrativeSectionDropdownListeners() {
        // Get dropdown elements
        const sectionContainer = document.querySelector('.narrative-sector-group-selector-container');
        const sectionDropdown = document.getElementById('narrative-sector-group-dropdown');
        
        // Remove the global document click handler that closes dropdowns
        document.removeEventListener('click', closeNarrativeSectionDropdownOnClickOutside);
        
        // If there's a previous container with listeners, clone and replace it to remove listeners
        if (sectionContainer) {
            const newContainer = sectionContainer.cloneNode(true);
            sectionContainer.parentNode.replaceChild(newContainer, sectionContainer);
        }
        
        // If there's a previous dropdown with listeners, clone and replace it to remove listeners
        if (sectionDropdown) {
            const newDropdown = sectionDropdown.cloneNode(true);
            sectionDropdown.parentNode.replaceChild(newDropdown, sectionDropdown);
        }
    }
    
    /**
     * Handler for closing the narrative dropdown when clicking outside
     */
    function closeNarrativeSectionDropdownOnClickOutside(e) {
        if (!e.target.closest('.narrative-sector-group-selector-container')) {
            toggleNarrativeSectionDropdown(false);
        }
    }
    
    /**
     * Setup event listeners for the narrative section dropdown
     */
    function setupNarrativeSectionDropdownListeners() {
        // Clean up any existing listeners to prevent duplicates
        cleanupNarrativeSectionDropdownListeners();
        
        // Find all the narrative dropdown elements with specific selectors
        const sectionToggle = document.querySelector('.narrative-sector-group-dropdown-toggle');
        const sectionDropdown = document.getElementById('narrative-sector-group-dropdown');
        const sectionDisplay = document.querySelector('.narrative-sector-group-display');
        const sectionContainer = document.querySelector('.narrative-sector-group-selector-container');
        
        if (sectionToggle && sectionContainer) {
            // Add accessibility attributes
            sectionToggle.setAttribute('tabindex', '0');
            sectionToggle.setAttribute('role', 'button');
            sectionToggle.setAttribute('aria-haspopup', 'true');
            sectionToggle.setAttribute('aria-expanded', 'false');
            sectionToggle.setAttribute('aria-label', 'Select sector group');
            
            // Make the entire container clickable
            sectionContainer.style.cursor = 'pointer';
            
            // Make the display text clickable
            if (sectionDisplay) {
                sectionDisplay.style.cursor = 'pointer';
            }
            
            // Add click handler to the entire container
            sectionContainer.addEventListener('click', function(e) {
                // Only toggle if we're not clicking on the dropdown itself
                if (!e.target.closest('.narrative-sector-group-dropdown')) {
                    e.stopPropagation();
                    toggleNarrativeSectionDropdown();
                }
            });
            
            // Add keyboard listener
            sectionContainer.addEventListener('keydown', function(e) {
                // Toggle on Enter or Space
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleNarrativeSectionDropdown();
                }
            });
            
            // Initialize active option
            if (sectionDisplay && sectionDropdown) {
                const currentText = sectionDisplay.textContent.trim();
                // Find the matching option and mark it as active
                const options = sectionDropdown.querySelectorAll('.narrative-sector-group-option');
                options.forEach(option => {
                    if (option.textContent.trim() === currentText) {
                        option.classList.add('active');
                        option.setAttribute('aria-selected', 'true');
                    } else {
                        option.classList.remove('active');
                        option.setAttribute('aria-selected', 'false');
                    }
                });
            }
        } else {
            console.warn('Narrative section toggle or container not found');
        }
        
        // Setup section options
        if (sectionDropdown) {
            // Add role for accessibility
            sectionDropdown.setAttribute('role', 'listbox');
            
            // Set role and tabindex for all options
            const options = sectionDropdown.querySelectorAll('.narrative-sector-group-option');
            options.forEach(option => {
                option.setAttribute('role', 'option');
                option.setAttribute('tabindex', '0');
            });
            
            // Click listener for section options
            sectionDropdown.addEventListener('click', function(e) {
                const option = e.target.closest('.narrative-sector-group-option');
                if (option) {
                    e.stopPropagation();
                    const group = option.getAttribute('data-group');
                    const displayText = option.textContent.trim();
                    
                    // Update the display
                    const displayElement = document.querySelector('.narrative-sector-group-display');
                    if (displayElement) {
                        displayElement.textContent = displayText;
                    }
                    
                    // Update active state on options
                    const allOptions = sectionDropdown.querySelectorAll('.narrative-sector-group-option');
                    allOptions.forEach(opt => {
                        opt.classList.remove('active');
                        opt.setAttribute('aria-selected', 'false');
                    });
                    option.classList.add('active');
                    option.setAttribute('aria-selected', 'true');
                    
                    // Close the dropdown
                    toggleNarrativeSectionDropdown(false);
                    
                    // Update the charts with the selected sector group
                    updateSectionTimeSeriesChartsWithGroup(group);
                }
            });
            
            // Keyboard navigation for dropdown
            sectionDropdown.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Close dropdown on Escape
                    toggleNarrativeSectionDropdown(false);
                    if (sectionContainer) {
                        sectionContainer.focus(); // Return focus to container
                    }
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    // Navigate options with arrow keys
                    e.preventDefault();
                    
                    const options = Array.from(sectionDropdown.querySelectorAll('.narrative-sector-group-option'));
                    if (options.length === 0) return;
                    
                    // Find currently focused option
                    const focusedOption = document.activeElement.closest('.narrative-sector-group-option');
                    let nextIndex = 0;
                    
                    if (focusedOption) {
                        const currentIndex = options.indexOf(focusedOption);
                        if (e.key === 'ArrowDown') {
                            nextIndex = (currentIndex + 1) % options.length;
                        } else {
                            nextIndex = (currentIndex - 1 + options.length) % options.length;
                        }
                    }
                    
                    options[nextIndex].focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    // Select option with Enter or Space
                    e.preventDefault();
                    const option = e.target.closest('.narrative-sector-group-option');
                    if (option) {
                        const group = option.getAttribute('data-group');
                        const displayText = option.textContent.trim();
                        
                        // Update the display
                        const displayElement = document.querySelector('.narrative-sector-group-display');
                        if (displayElement) {
                            displayElement.textContent = displayText;
                        }
                        
                        // Update active state on options
                        const allOptions = sectionDropdown.querySelectorAll('.sector-group-option');
                        allOptions.forEach(opt => {
                            opt.classList.remove('active');
                            opt.setAttribute('aria-selected', 'false');
                        });
                        option.classList.add('active');
                        option.setAttribute('aria-selected', 'true');
                        
                        // Close the dropdown directly
                        sectionDropdown.classList.remove('active');
                        if (sectionToggle) {
                            sectionToggle.classList.remove('active');
                        }
                        
                        // Update the charts with the selected sector group
                        updateSectionTimeSeriesChartsWithGroup(group);
                    }
                }
            });
        } else {
            console.warn('Section dropdown not found');
        }
        
        // Close dropdowns when clicking outside
        // This listener is already set up in the document click handler
    }
    
    /**
     * Toggle the sector group dropdown
     * @param {boolean|undefined} forceState - Optional: force dropdown to a specific state (true=open, false=closed)
     */
    function toggleSectorGroupDropdown(forceState) {
        const sectorGroupDropdown = document.querySelector('#sector-group-dropdown');
        const sectorGroupToggle = document.querySelector('.sector-group-dropdown-toggle');
        
        if (sectorGroupDropdown && sectorGroupToggle) {
            // Get toggle's position information
            const toggleRect = sectorGroupToggle.getBoundingClientRect();
            
            // Position dropdown under the toggle
            sectorGroupDropdown.style.position = 'absolute';
            sectorGroupDropdown.style.left = (toggleRect.left + toggleRect.width/2) + 'px';
            sectorGroupDropdown.style.top = (toggleRect.bottom + 5) + 'px';
            sectorGroupDropdown.style.zIndex = '1000';
            
            // Toggle active class or set to forced state
            let isExpanded;
            if (forceState !== undefined) {
                isExpanded = forceState;
                if (forceState) {
                    sectorGroupDropdown.classList.add('active');
                    sectorGroupToggle.classList.add('active');
                } else {
                    sectorGroupDropdown.classList.remove('active');
                    sectorGroupToggle.classList.remove('active');
                }
            } else {
                isExpanded = sectorGroupDropdown.classList.toggle('active');
                sectorGroupToggle.classList.toggle('active');
            }
            
            // Update ARIA attributes
            sectorGroupToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            
            // If opening the dropdown, focus the first option after a short delay
            if (isExpanded) {
                setTimeout(() => {
                    const firstOption = sectorGroupDropdown.querySelector('.sector-group-option');
                    if (firstOption) {
                        firstOption.focus();
                    }
                }, 50);
            }
        }
    }

    /**
     * Toggle the sector group dropdown in the Section Analysis tab
     * @param {boolean|undefined} forceState - Optional: force dropdown to a specific state (true=open, false=closed)
     */
    function toggleSectionGroupDropdownInAnalysis(forceState) {
        // Look for the narrative sector group dropdown
        const sectionGroupDropdown = document.getElementById('narrative-sector-group-dropdown');
        const sectionGroupToggle = document.querySelector('.narrative-sector-group-dropdown-toggle');
        
        //console.log('Toggle function called, found dropdown:', !!sectionGroupDropdown, 'toggle:', !!sectionGroupToggle);
        
        if (sectionGroupDropdown && sectionGroupToggle) {
            //console.log('Toggling section dropdown, current state:', sectionGroupDropdown.classList.contains('active'));
            
            // Get toggle's position information
            const toggleRect = sectionGroupToggle.getBoundingClientRect();
            
            // Position dropdown under the toggle - use same style as Tab 2
            sectionGroupDropdown.style.position = 'absolute';
            sectionGroupDropdown.style.left = (toggleRect.left + toggleRect.width/2) + 'px';
            sectionGroupDropdown.style.top = (toggleRect.bottom + 5) + 'px';
            sectionGroupDropdown.style.zIndex = '1000';
            
            // Toggle active class or set to forced state
            let isExpanded;
            if (forceState !== undefined) {
                isExpanded = forceState;
                if (forceState) {
                    sectionGroupDropdown.classList.add('active');
                    sectionGroupToggle.classList.add('active');
                } else {
                    sectionGroupDropdown.classList.remove('active');
                    sectionGroupToggle.classList.remove('active');
                }
            } else {
                isExpanded = sectionGroupDropdown.classList.toggle('active');
                sectionGroupToggle.classList.toggle('active');
            }
            
            // Update ARIA attributes
            sectionGroupToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            
            // If opening the dropdown, focus the first option after a short delay
            if (isExpanded) {
                setTimeout(() => {
                    const firstOption = sectionGroupDropdown.querySelector('.sector-group-option');
                    if (firstOption) {
                        firstOption.focus();
                    }
                }, 50);
            }
            
            //console.log('Section dropdown toggled, new state:', sectionGroupDropdown.classList.contains('active'));
        } else {
            // Fallback to using the exact same function as Tab 2 with slightly different selectors
            //console.log('Section dropdown not found, falling back to standard dropdown toggle');
            
            // Get any dropdown in the section-analysis-content
            const dropdown = document.querySelector('.section-analysis-content .sector-group-dropdown');
            const toggle = document.querySelector('.section-analysis-content .sector-group-dropdown-toggle');
            
            if (dropdown && toggle) {
                // Position dropdown under the toggle
                const toggleRect = toggle.getBoundingClientRect();
                dropdown.style.position = 'absolute';
                dropdown.style.left = (toggleRect.left + toggleRect.width/2) + 'px';
                dropdown.style.top = (toggleRect.bottom + 5) + 'px';
                dropdown.style.zIndex = '1000';
                
                // Toggle active class or set to forced state
                let isExpanded;
                if (forceState !== undefined) {
                    isExpanded = forceState;
                    if (forceState) {
                        dropdown.classList.add('active');
                        toggle.classList.add('active');
                    } else {
                        dropdown.classList.remove('active');
                        toggle.classList.remove('active');
                    }
                } else {
                    isExpanded = dropdown.classList.toggle('active');
                    toggle.classList.toggle('active');
                }
                
                // Update ARIA attributes
                toggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
                
                // If opening the dropdown, focus the first option after a short delay
                if (isExpanded) {
                    setTimeout(() => {
                        const firstOption = dropdown.querySelector('.sector-group-option');
                        if (firstOption) {
                            firstOption.focus();
                        }
                    }, 50);
                }
            } else {
                console.warn('No dropdown elements found in section-analysis-content');
            }
        }
    }

    /**
     * Update the section time series charts based on selected sector group
     * @param {string} group - The selected sector group ('agricultural', 'industrial', 'manufacturing', 'materials')
     */
    function updateSectionTimeSeriesChartsWithGroup(group) {
        // Default to agricultural if not specified
        group = group || 'agricultural';
        
        // Define section mappings for each sector group
        const sectionGroups = {
            'agricultural': ['1', '2', '3', '4'], // Live animals, plants, fats, etc.
            'industrial': ['5', '6', '7', '8', '14'], // Minerals, chemicals, plastics, etc.
            'manufacturing': ['11', '12', '13', '15', '16', '18', '19', '20'], // Textiles, footwear, machinery, etc.
            'materials': ['9', '10', '17', '21'] // Wood, paper, stone, misc. articles
        };
        
        // Get the sections for the selected group
        const selectedSections = sectionGroups[group] || [];
        
        // Recreate the time series charts with the selected sections
        if (selectedSections.length > 0) {
            createCountrySectionTimeSeriesChart('trade_deficit', 0, 'country-section-time-series-container-trade_deficit', selectedSections);
            createCountrySectionTimeSeriesChart('impVal_section', 0, 'country-section-time-series-container-impVal_section', selectedSections);
            createCountrySectionTimeSeriesChart('expVal_section', 0, 'country-section-time-series-container-expVal_section', selectedSections);
        } else {
            // Fallback to default behavior
            createCountrySectionTimeSeriesChart('trade_deficit', 5, 'country-section-time-series-container-trade_deficit');
            createCountrySectionTimeSeriesChart('impVal_section', 5, 'country-section-time-series-container-impVal_section');
            createCountrySectionTimeSeriesChart('expVal_section', 5, 'country-section-time-series-container-expVal_section');
        }
    }


    /**
     * Update the trade narrative using the loaded bilateral features data
     */
    function updateTradeNarrative() {
        if (!bilateralFeaturesData || !currentCountry || !currentCountry.iso) {
            console.error('Cannot update trade narrative: missing data or country selection');
            return;
        }
        
        const features = bilateralFeaturesData[currentCountry.iso];
        if (!features) {
            console.warn(`No bilateral features found for country: ${currentCountry.iso}`);
            return;
        }
        
        const narrativeHTML = generateTradeNarrative(features, currentCountry.name, currentCountry.iso);
        const textSection = document.querySelector('.trade-relations-content .text-section');
        if (textSection) {
            textSection.innerHTML = narrativeHTML;
        }
        
        // Update the product narrative if product features data is available
        updateProductNarrative();
        
        // Update the time series narrative if data is available
        updateTimeSeriesNarrative();
        
        // Update the tariff relationship text
        updateTariffExplanationText();
    }
    
    /**
     * Update the product narrative using the loaded product features data
     */
    function updateProductNarrative() {
        if (!productFeaturesData || !currentCountry || !currentCountry.iso) {
            console.error('Cannot update product narrative: missing data or country selection');
            return;
        }
        
        const features = productFeaturesData[currentCountry.iso];
        if (!features) {
            console.warn(`No product features found for country: ${currentCountry.iso}`);
            return;
        }
        
        generateProductNarrative(features, currentCountry.name);
    }
    
    /**
     * Generate the product narrative HTML based on the product features data
     * @param {Object} features - The product features data for the current country
     * @param {string} countryName - The name of the current country
     */
    function generateProductNarrative(features, countryName) {
        const getPercent = s => parseFloat(s.replace("%", ""));
        const shareThreshold = 10.0;
        
        // Helper function for proper Oxford comma formatting
        const formatList = (items, conjunction = "and") => {
            if (items.length === 0) return "";
            if (items.length === 1) return items[0];
            if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
            return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
        };
    
        // Extract all the data
        const numHS4Imp = features["01_numImpCodes"].hs4;
        const numHS2Imp = features["01_numImpCodes"].hs2;
        const numHS4Exp = features["01_numExpCodes"].hs4;
        const numHS2Exp = features["01_numExpCodes"].hs2;
        const pctImpCodes = features["02_pctImpCodes"];
        const pctExpCodes = features["02_pctExpCodes"];
        const topImps = features["05_importantToUS"];
        const topExps = features["06_importantToUSExports"];
        const sections = features["07_topSections"];
        const sim = features["08_tradeSimilarity"];
    
        // Helper function to describe trade relationship breadth
        const getTradeScope = (impPct, expPct, impCodes, expCodes) => {
            const impPctNum = getPercent(impPct);
            const expPctNum = getPercent(expPct);
            const avgPct = (impPctNum + expPctNum) / 2;
            
            // Determine overall scope
            const scope = avgPct >= 75 ? "exceptionally broad" 
                        : avgPct >= 60 ? "diverse" 
                        : avgPct >= 40 ? "moderately focused"
                        : "specialized";
            
            // Check for asymmetry in trade flows
            const diff = Math.abs(impPctNum - expPctNum);
            let asymmetryNote = "";
            
            if (diff >= 25) {
                if (impPctNum > expPctNum) {
                    asymmetryNote = `, with notably broader import diversity than export concentration`;
                } else {
                    asymmetryNote = `, with the <strong> U.S. </strong> exporting across more categories than it imports`;
                }
            }
            
            return `${scope} trade relationship, spanning ${impCodes} HS-4 import categories (${impPct}) and ${expCodes} HS-4 export categories (${expPct})${asymmetryNote}`;
        };
    
        // Helper function for sectoral concentration with transition logic
        const getSectoralConcentration = (sections, tradeScope) => {
            const [s1, s2, s3] = sections;
            const topShare = getPercent(s1.share);
            const secondShare = getPercent(s2.share);
            const thirdShare = getPercent(s3.share);
            
            const concentration = topShare >= 60 ? "highly concentrated" 
                                : topShare >= 40 ? "moderately concentrated" 
                                : "broadly distributed";
            
            // Determine if we need a transition word
            const needsTransition = (tradeScope.includes("exceptionally broad") || tradeScope.includes("diverse")) 
                                   && concentration !== "broadly distributed";
            const transition = needsTransition ? "However, the" : "The";
            
            // Build sectoral description based on meaningful shares
            let sectorText = `${transition} sectoral composition of <strong>U.S.</strong> imports from <strong>${countryName}</strong> is ${concentration}: ${s1.share} in ${s1.title} (${s1.value})`;
            
            if (secondShare >= 15) {
                sectorText += `, ${s2.share} in ${s2.title} (${s2.value})`;
                
                if (thirdShare >= 15) {
                    sectorText += `, and ${s3.share} in ${s3.title} (${s3.value})`;
                } else {
                    sectorText += `, with remaining sectors each below 15%`;
                }
            } else {
                sectorText += `, with <strong>U.S.</strong> imports from <strong>${countryName}</strong> in other sectors each making up less than 15%`;
            }
            
            return sectorText + ".";
        };
    
        // Helper function for import dependencies
        const getImportDependencies = (topImps, countryName, threshold) => {
            const majors = topImps.filter(p => getPercent(p.share) >= threshold);
            
            if (majors.length === 0) {
                return `<strong>${countryName}</strong> does not account for a major share of <strong>U.S.</strong> imports in any HS-4 product categories (no products where <strong>${countryName}</strong> provides ${threshold}% or more of total <strong>U.S.</strong> imports).`;
            }
            
            // Helper to get dominance language based on market share
            const getDominanceLevel = (share) => {
                const pct = getPercent(share);
                if (pct >= 80) return "dominates";
                if (pct >= 60) return "heavily supplies";
                if (pct >= 40) return "is a major supplier of";
                if (pct >= 25) return "has significant market share in";
                return "supplies";
            };
            
            const topProducts = majors.slice(0, 5).map(p => {
                return `${p.hs4_name} (${p.share}${majors.length <= 5 ? ', ' + p.dollar_value : ''})`;
            });
            
            if (majors.length === 1) {
                return `<strong>${countryName}</strong> accounts for a significant share of <strong>U.S.</strong> imports in ${topProducts[0]}.`;
            }
            
            const formattedList = formatList(topProducts);
            return `<strong>${countryName}</strong> accounts for a significant share of total <strong>U.S.</strong> imports across multiple HS-4 categories, with top examples including ${formattedList}${majors.length > 5 ? ` among ${majors.length} total categories where <strong>${countryName}</strong> provides ${threshold}% or more of <strong>U.S.</strong> imports` : ""}.`;
        };


        // Helper function for export strengths  
        const getExportStrengths = (topExps, countryName, threshold) => {
            const majors = topExps.filter(p => getPercent(p.share) >= threshold);
            
            if (majors.length === 0) {
                return `<strong>${countryName}</strong> is not a primary destination for <strong>U.S.</strong> exports in any HS-4 product categories (no products where <strong>${countryName}</strong> receives ${threshold}% or more of total <strong>U.S.</strong> exports).`;
            }
            
            const topProducts = majors.slice(0, 5).map(p => 
                `${p.hs4_name} (${p.share}${majors.length <= 5 ? ', ' + p.dollar_value : ''})`
            );
            
            return majors.length === 1
                ? `<strong>${countryName}</strong> serves as a primary destination for <strong>U.S.</strong> exports in ${topProducts[0]}.`
                : `<strong>${countryName}</strong> serves as a primary destination for <strong>U.S.</strong> exports across at least ${Math.min(majors.length, 5)} HS-4 categories, with top examples including ${formatList(topProducts)}${majors.length > 5 ? `, representing the top ${topProducts.length} categories from our data` : ""}.`;
        };
    
        // Helper function for trade similarity
        const getTradeSimilarity = (sim, countryName) => {
            const hs4Score = getPercent(sim.hs4);
            const alignment = hs4Score >= 70 ? "high structural alignment" 
                             : hs4Score >= 50 ? "moderate overlap" 
                             : "specialized complementarity";
            
            return `Trade similarity analysis reveals ${alignment} between <strong>${countryName}'s U.S.</strong> exports and the United States' global export structure (cosine similarity: ${sim.hs4} at HS-4 level, ${sim.hs2} at HS-2 level).`;
        };
    
        // Build the narrative components
        const tradeScope = getTradeScope(pctImpCodes, pctExpCodes, numHS4Imp, numHS4Exp);
        const sectoralText = getSectoralConcentration(sections, tradeScope);
        const importText = getImportDependencies(topImps, countryName, shareThreshold);
        const exportText = getExportStrengths(topExps, countryName, shareThreshold);
        const similarityText = getTradeSimilarity(sim, countryName);
    
        // Main narrative HTML
        /* OLD VERSIONconst firstHtml = `
    <div class="text-section">
    
        <p>
            The sections above visualize <strong>U.S.</strong> trade with <strong>${countryName}</strong> at the HS section and HS-2 levels. Data sourced from the <strong>U.S.</strong> Census Bureau's USATradeOnline tool. For global trade perspectives, visit the <span class="global-icon-wrapper" style="display: inline-flex; align-items: center; cursor: pointer;" title="Open Global Trade Explorer"><img src="${DataPaths.assets.fontawesome.globeSolid}" alt="Global Trade Explorer Icon" style="width: 16px; height: 16px; transition: transform 0.2s ease;" class="global-trade-icon" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></span><strong>Global Trade Explorer</strong>.
        </p>
        
        <p>The <strong>U.S.</strong> maintains a ${tradeScope} with <strong>${countryName}</strong>. ${sectoralText}</p>
        
        <p>${importText}</p>
        
        <p>${exportText}</p>
        
    </div>`;*/
    const firstHtml = `
    <div class="text-section">
        <p>The <strong>U.S.</strong> maintains a ${tradeScope} with <strong>${countryName}</strong>. ${sectoralText}</p>
        
        <p>${importText}</p>
        
        <p>${exportText}</p>
        
    </div>`;

    
        const secondHtml = ``; // Keep empty as in original
    
        // Insert into DOM
        const firstContainer = document.querySelector('.trade-relations-content .split-section:nth-child(2) .split-left .text-section');
        if (firstContainer) {
            firstContainer.innerHTML = firstHtml;
        } else {
            console.warn('Could not find first container for product narrative');
        }
        
        const secondContainer = document.querySelector('.trade-relations-content .split-section:nth-child(2) .split-right .text-section');
        if (secondContainer) {
            secondContainer.innerHTML = secondHtml;
        } else {
            console.warn('Could not find second container for product narrative');
        }
    }
    
    /**
     * Clear bilateral features data
     */
    function clearBilateralFeaturesData() {
        bilateralFeaturesData = null;
        productFeaturesData = null;
        sectionTimeSeriesData = null;
        ////console.log('All features data cleared');
    }
    
    /**
     * Clear all data caches to free memory
     */
    function clearAllDataCaches() {
        // List of all chart containers in our application
        const chartContainers = [
            'bilateral-tariff-container',
            'industry-tariffs-bar-container',
            'industry-tariffs-time-container',
            'bilateral-trade-container',
            'compressed-treemap-container-imports',
            'compressed-treemap-container-exports',
            'section-time-series-container',
            'country-section-time-series-container',
            'country-section-time-series-container-impVal_section',
            'country-section-time-series-container-expVal_section',
            'section-bilateral-trade-container'
        ];
        
        // Clear cache for each chart type
        chartContainers.forEach(containerId => {
            clearSpecificChartData(containerId);
            
            // Also clear container content to stop any pending chart renders
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
        });
        
        // Also clear any shared data caches
        if (window.sparksDataComponent && window.sparksDataComponent.clearCache) {
            window.sparksDataComponent.clearCache();
            ////console.log('Cleared shared data component cache');
        }
        
        // Clear bilateral features data
        clearBilateralFeaturesData();
        
        // Remove any pending timeouts
        const timeoutIds = window._chartTimeouts || [];
        if (Array.isArray(timeoutIds)) {
            timeoutIds.forEach(id => {
                if (id) clearTimeout(id);
            });
            window._chartTimeouts = [];
        }
        
        //console.log('All data caches cleared');
    }
    
    /**
     * Clear data cache for a specific chart
     * @param {string} containerId - The ID of the chart container to clear data for
     */
    function clearSpecificChartData(containerId) {
        switch (containerId) {
            case 'bilateral-tariff-container':
                if (window.countryBilatTariffRates && window.countryBilatTariffRates.clearCache) {
                    window.countryBilatTariffRates.clearCache();
                    //console.log('Cleared bilateral tariff data cache');
                }
                break;
                
            case 'industry-tariffs-bar-container':
                if (window.industryTariffsBarChart && window.industryTariffsBarChart.clearCache) {
                    window.industryTariffsBarChart.clearCache();
                    //console.log('Cleared industry tariffs bar chart data cache');
                }
                break;
                
            case 'industry-tariffs-time-container':
                if (window.industryTariffsTimeSeries && window.industryTariffsTimeSeries.clearCache) {
                    window.industryTariffsTimeSeries.clearCache();
                    //console.log('Cleared industry tariffs time series data cache');
                }
                break;
                
            case 'bilateral-trade-container':
                if (window.countryBilatTradeRelats && window.countryBilatTradeRelats.clearCache) {
                    window.countryBilatTradeRelats.clearCache();
                    //console.log('Cleared bilateral trade data cache');
                }
                break;
                
            case 'compressed-treemap-container-imports':
            case 'compressed-treemap-container-exports':
                if (window.compressedCountryTreemap && window.compressedCountryTreemap.clearCache) {
                    window.compressedCountryTreemap.clearCache();
                    //console.log('Cleared compressed treemap data cache');
                }
                break;
                
            case 'section-time-series-container':
                if (window.sectionTimeSeries && window.sectionTimeSeries.clearCache) {
                    window.sectionTimeSeries.clearCache();
                    //console.log('Cleared section time series data cache');
                }
                break;
                
            case 'country-section-time-series-container':
            case 'country-section-time-series-container-impVal_section':
            case 'country-section-time-series-container-expVal_section':
                if (window.countrySectionTimeSeriesChart && window.countrySectionTimeSeriesChart.clearCache) {
                    window.countrySectionTimeSeriesChart.clearCache();
                    //console.log('Cleared country section time series data cache');
                }
                break;
                
            case 'section-bilateral-trade-container':
                if (window.sectionBilateralTradeChart && window.sectionBilateralTradeChart.clearCache) {
                    window.sectionBilateralTradeChart.clearCache();
                    //console.log('Cleared section bilateral trade data cache');
                }
                break;
                
            default:
                //console.log(`No specific cache clearing for container: ${containerId}`);
                break;
        }
    }
    
    /**
     * Switch between tabs
     * @param {string} tabId - ID of the tab to switch to
     */
    function switchToTab(tabId) {
        // Get the tabs
        const tradeRelationsTab = document.getElementById('trade-relations-tab');
        const tariffRelationshipsTab = document.getElementById('tariff-relationships-tab');
        const sectionAnalysisTab = document.getElementById('section-analysis-tab');
        
        // Get tab content elements
        const tradeRelationsContent = document.querySelector('.trade-relations-content');
        const tariffRelationshipsContent = document.querySelector('.tariff-relationships-content');
        const sectionAnalysisContent = document.querySelector('.section-analysis-content');
        
        if (!tradeRelationsTab || !tariffRelationshipsTab || 
            !tradeRelationsContent || !tariffRelationshipsContent) {
            console.error('Required DOM elements not found for tab switching');
            return;
        }
        
        // Clear data caches when switching tabs
        clearAllDataCaches();
        
        // First, remove active class from all tabs and content
        const allTabs = [tradeRelationsTab, tariffRelationshipsTab];
        if (sectionAnalysisTab) allTabs.push(sectionAnalysisTab);
        
        allTabs.forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('tabindex', '0');
        });
        
        tradeRelationsContent.classList.remove('active');
        tariffRelationshipsContent.classList.remove('active');
        if (sectionAnalysisContent) sectionAnalysisContent.classList.remove('active');
        
        // Then set the active tab and content based on tabId
        let activeTab, activeContent;
        
        if (tabId === 'trade-relations') {
            activeTab = tradeRelationsTab;
            activeContent = tradeRelationsContent;
        } else if (tabId === 'tariff-relationships') {
            activeTab = tariffRelationshipsTab;
            activeContent = tariffRelationshipsContent;
        } else if (tabId === 'section-analysis' && sectionAnalysisTab && sectionAnalysisContent) {
            activeTab = sectionAnalysisTab;
            activeContent = sectionAnalysisContent;
        } else {
            console.error('Unknown tab ID:', tabId);
            return;
        }
        
        // Set active tab and content
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        activeTab.setAttribute('tabindex', '0');
        activeContent.classList.add('active');
        
        // Set appropriate ARIA attributes on tab panels
        if (tradeRelationsContent) tradeRelationsContent.setAttribute('aria-hidden', activeContent !== tradeRelationsContent);
        if (tariffRelationshipsContent) tariffRelationshipsContent.setAttribute('aria-hidden', activeContent !== tariffRelationshipsContent);
        if (sectionAnalysisContent) sectionAnalysisContent.setAttribute('aria-hidden', activeContent !== sectionAnalysisContent);
        
        // Focus the active tab (only if triggered by a user event, not on initial load)
        if (document.activeElement && document.activeElement.classList.contains('tab')) {
            activeTab.focus();
        }
        
        // Create/show charts based on active tab
        createCharts(tabId);
    }
    
    /**
     * Create all charts for the panel using lazy loading
     * @param {string} activeTab - ID of the currently active tab
     */
    function createCharts(activeTab = 'trade-relations') {
        // Initialize SparksGraphing core components if needed
        if (window.sparksGraphingCore && window.sparksGraphingCore.initialize) {
            window.sparksGraphingCore.initialize();
        }
        
        if (activeTab === 'trade-relations') {
            // Define chart containers and their loader functions for the trade relations tab
            const chartContainers = [
                { id: 'bilateral-trade-container', loader: createBilateralTradeChart },
                { id: 'compressed-treemap-container-imports', loader: createCompressedTreemapChartImports },
                { id: 'compressed-treemap-container-exports', loader: createCompressedTreemapChartExports }
            ];
            
            // Setup lazy loading for the visible charts
            setupLazyLoading(chartContainers);
            
        } else if (activeTab === 'tariff-relationships') {
            // Define chart containers and their loader functions for the tariff relationships tab
            const chartContainers = [
                { id: 'bilateral-tariff-container', loader: createBilateralTariffChart },
                { id: 'industry-tariffs-bar-container', loader: createIndustryTariffsBarChart },
                { id: 'industry-tariffs-time-container', loader: createIndustryTariffsTimeSeriesChart }
            ];
            
            // Setup lazy loading for the visible charts
            setupLazyLoading(chartContainers);
            
        } else if (activeTab === 'section-analysis') {
            // First, set up section dropdown listeners BEFORE any data-dependent operations
            // This ensures the dropdown works even if data isn't loaded yet
           // console.log('Setting up narrative section dropdown listeners immediately');
            setupNarrativeSectionDropdownListeners();
            
            // Set up HS section dropdown for the bilateral trade chart
            setupHsSectionDropdownListeners();
            
            // Style the dropdowns immediately to ensure they're visible
            const sectorGroupDropdown = document.querySelector('.section-analysis-content #sector-group-dropdown');
            if (sectorGroupDropdown) {
                sectorGroupDropdown.style.position = 'absolute';
                sectorGroupDropdown.style.zIndex = '1000';
                //console.log('Found and styled sector group dropdown immediately');
            } else {
                //console.warn('Could not find sector group dropdown to style immediately');
            }
            
            const hsSectionDropdown = document.querySelector('#hs-section-dropdown');
            if (hsSectionDropdown) {
                hsSectionDropdown.style.position = 'absolute';
                hsSectionDropdown.style.zIndex = '1000';
                //console.log('Found and styled HS section dropdown immediately');
            } else {
                //console.warn('Could not find HS section dropdown to style immediately');
            }
            
            // Get the currently selected sector group from the dropdown
            const sectionDisplay = document.querySelector('.section-analysis-content .sector-group-display');
            let selectedGroup = 'agricultural'; // Default group
            
            if (sectionDisplay) {
                const displayText = sectionDisplay.textContent.trim();
                // Match the display text to the appropriate group
                if (displayText.includes('Industrial')) {
                    selectedGroup = 'industrial';
                } else if (displayText.includes('Manufacturing')) {
                    selectedGroup = 'manufacturing';
                } else if (displayText.includes('Materials')) {
                    selectedGroup = 'materials';
                }
            }
            
            // Try to update the time series narrative, but don't depend on it for UI functionality
            try {
                updateTimeSeriesNarrative();
            } catch(e) {
                //console.warn('Error updating time series narrative, but continuing with UI setup:', e);
                // Even if narrative update fails, ensure dropdown setup with another timeout
                setTimeout(() => {
                    //console.log('Re-setting up section dropdown listeners after narrative failure');
                    setupNarrativeSectionDropdownListeners();
                }, 300);
            }
            
            // Define section mappings for each sector group
            const sectionGroups = {
                'agricultural': ['1', '2', '3', '4'], // Live animals, plants, fats, etc.
                'industrial': ['5', '6', '7', '8', '14'], // Minerals, chemicals, plastics, etc.
                'manufacturing': ['11', '12', '13', '15', '16', '18', '19', '20'], // Textiles, footwear, machinery, etc.
                'materials': ['9', '10', '17', '21'] // Wood, paper, stone, misc. articles
            };
            
            // Get the sections for the selected group
            const selectedSections = sectionGroups[selectedGroup] || [];
            
            // Define chart containers and their loader functions for the section analysis tab
            const chartContainers = [
                { 
                    id: 'country-section-time-series-container-trade_deficit', 
                    loader: () => createCountrySectionTimeSeriesChart('trade_deficit', 0, 'country-section-time-series-container-trade_deficit', selectedSections)
                },
                { 
                    id: 'country-section-time-series-container-impVal_section', 
                    loader: () => createCountrySectionTimeSeriesChart('impVal_section', 0, 'country-section-time-series-container-impVal_section', selectedSections)
                },
                { 
                    id: 'country-section-time-series-container-expVal_section', 
                    loader: () => createCountrySectionTimeSeriesChart('expVal_section', 0, 'country-section-time-series-container-expVal_section', selectedSections)
                },
                { 
                    id: 'section-bilateral-trade-container', 
                    loader: createSectionBilateralTradeChart 
                }
            ];
            
            // Setup lazy loading for the visible charts
            setupLazyLoading(chartContainers);
            
        } else {
            console.error('Unknown active tab:', activeTab);
        }
    }
    
    /**
     * Set up lazy loading for chart containers
     * @param {Array} chartContainers - Array of chart container objects with id and loader function
     */
    function setupLazyLoading(chartContainers) {
        // Setup placeholder content for all containers
        chartContainers.forEach(chart => {
            const container = document.getElementById(chart.id);
            if (container) {
                container.innerHTML = '<div class="chart-loading">Chart will load when visible...</div>';
            }
        });
        
        // Create and configure the intersection observer
        const options = {
            root: null, // viewport
            rootMargin: '50px', // Load slightly before becoming visible
            threshold: 0.1 // Trigger when 10% of the element is visible
        };
        
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Get the container ID and find its loader
                    const containerId = entry.target.id;
                    const chartInfo = chartContainers.find(chart => chart.id === containerId);
                    
                    if (chartInfo && chartInfo.loader) {
                        // Show loading indicator
                        entry.target.innerHTML = '<div class="chart-loading">Loading chart...</div>';
                        
                        // Load the chart with a small delay to allow the loading indicator to render
                        setTimeout(() => {
                            try {
                                chartInfo.loader();
                                //console.log(`Lazy loaded chart: ${containerId}`);
                            } catch (error) {
                                console.error(`Error lazy loading chart ${containerId}:`, error);
                                entry.target.innerHTML = `<div class="chart-error">Error loading chart: ${error.message}</div>`;
                            }
                        }, 50);
                    }
                    
                    // Stop observing this element once loaded
                    observer.unobserve(entry.target);
                }
            });
        }, options);
        
        // Start observing each chart container
        chartContainers.forEach(chart => {
            const container = document.getElementById(chart.id);
            if (container) {
                observer.observe(container);
            }
        });
    }
    
    
    /**
     * Create the Bilateral Tariff Rates chart
     */
    function createBilateralTariffChart() {
        if (window.countryBilatTariffRates && window.countryBilatTariffRates.createChart) {
            const tariffParams = {
                country: currentCountry.iso, 
                countryName: currentCountry.name,
                tariffMethod: 'statutory_tariffs',
                showUSTariffs: true,
                showCountryTariffs: true,
                title: `Figure 1. Bilateral Tariff Rates: US and ${currentCountry.name}`
            };
            
            // Show loading indicator
            document.getElementById('bilateral-tariff-container').innerHTML = '<div class="chart-loading">Loading bilateral tariff data...</div>';
            
            window.countryBilatTariffRates.createChart('bilateral-tariff-container', tariffParams, { skipDots: true })
                .catch(error => {
                    console.error('Error creating bilateral tariff chart:', error);
                    document.getElementById('bilateral-tariff-container').innerHTML = `
                        <div class="chart-error">
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                });
        } else {
            console.error('countryBilatTariffRates module not available');
            document.getElementById('bilateral-tariff-container').innerHTML = `
                <div class="chart-error">
                    <p>Error: countryBilatTariffRates module not available</p>
                </div>
            `;
        }
    }
    
    /**
     * Create the Bilateral Trade Relations chart
     */
    function createBilateralTradeChart() {
        if (window.countryBilatTradeRelats && window.countryBilatTradeRelats.createChart) {
            const tradeParams = {
                selectedCountry: currentCountry.iso,
                selectedCountryName: currentCountry.name,
                isShare: false, // Use value instead of share
                title: `Figure 2. Bilateral Trade with ${currentCountry.name}`
            };
            
            // Show loading indicator
            document.getElementById('bilateral-trade-container').innerHTML = '<div class="chart-loading">Loading bilateral trade data...</div>';
            
            window.countryBilatTradeRelats.createChart('bilateral-trade-container', tradeParams, { skipDots: true })
                .catch(error => {
                    console.error('Error creating bilateral trade chart:', error);
                    document.getElementById('bilateral-trade-container').innerHTML = `
                        <div class="chart-error">
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                });
        } else {
            console.error('countryBilatTradeRelats module not available');
            document.getElementById('bilateral-trade-container').innerHTML = `
                <div class="chart-error">
                    <p>Error: countryBilatTradeRelats module not available</p>
                </div>
            `;
        }
    }
    
    /**
     * Create the Industry Tariffs Bar Chart (Row 1, Right)
     */
    function createIndustryTariffsBarChart() {
        if (window.industryTariffsBarChart && window.industryTariffsBarChart.createChart) {
            // Show loading indicator
            document.getElementById('industry-tariffs-bar-container').innerHTML = '<div class="chart-loading">Loading industry tariffs bar chart data...</div>';
            
            const params = {
                country: currentCountry.iso,
                countryName: currentCountry.name,
                aggregation: 'section',
                tariffMethod: 'statutory',
                year: '2021',  // Use most recent year available
                showUSTariffs: true,
                showCountryTariffs: true,
                title: `Figure 3. Bilateral Tariff Rates by Section (2021)`
            };
            
            // Create the chart
            window.industryTariffsBarChart.createChart('industry-tariffs-bar-container', params)
                .catch(error => {
                    console.error('Error creating industry tariffs bar chart:', error);
                    document.getElementById('industry-tariffs-bar-container').innerHTML = `
                        <div class="chart-error">
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                });
        } else {
            console.error('industryTariffsBarChart module not available');
            document.getElementById('industry-tariffs-bar-container').innerHTML = `
                <div class="chart-error">
                    <p>Error: industryTariffsBarChart module not available</p>
                </div>
            `;
        }
    }
    
    /**
     * Create the Industry Tariffs Time Series chart (Row 2, Center)
     * @param {string} [groupParam] - Optional group parameter passed from dropdown selection
     */
    function createIndustryTariffsTimeSeriesChart(groupParam) {
        if (window.industryTariffsTimeSeries && window.industryTariffsTimeSeries.createChart) {
            // Show loading indicator
            document.getElementById('industry-tariffs-time-container').innerHTML = '<div class="chart-loading">Loading industry tariffs time series data...</div>';
            //console.log(groupParam)
            // First, make sure chart configuration is loaded
            const loadConfig = window.industryTariffsTimeSeries.loadChartConfig 
                ? window.industryTariffsTimeSeries.loadChartConfig() 
                : Promise.resolve();
               
            loadConfig
                .then(() => {
                    // Define sector groups
                    const sectorGroups = {
                        agricultural: ['Live Animals', 'Vegetable Products', 'Fats & Oils', 'Food, Bev. & Tobacco'],
                        industrial: ['Mineral Products', 'Chemicals', 'Plastics', 'Leather', 'Wood Products', 'Pulp & Paper', 'Base Metals'],
                        manufacturing: ['Textile & App.', 'Footwear', 'Stone & Glass'],
                        materials: ['Mach. & Elec. Equipment', 'Transportation Rq.', 'Optics', 'Arms & Ammun.']
                    };
                    
                    // Use the passed group parameter if available
                    let selectedGroup = 'agricultural'; // Default
                    
                    if (groupParam && sectorGroups[groupParam]) {
                        // Use the directly passed group parameter
                        selectedGroup = groupParam;
                    } else {
                        // Fall back to getting it from the display element
                        const sectorGroupDisplay = document.querySelector('.sector-group-display');
                        
                        if (sectorGroupDisplay) {
                            const displayText = sectorGroupDisplay.textContent.trim();
                            
                            // Map display text to group key
                            switch(displayText) {
                                case 'Agricultural Sectors': 
                                    selectedGroup = 'agricultural'; 
                                    break;
                                case 'Industrial Sectors': 
                                    selectedGroup = 'industrial'; 
                                    break;
                                case 'Manufacturing Sectors': 
                                    selectedGroup = 'manufacturing'; 
                                    break;
                                case 'Raw Materials': 
                                    selectedGroup = 'materials'; 
                                    break;
                                default:
                                    selectedGroup = 'agricultural';
                            }
                        }
                    }
                    
                    
                    const params = {
                        country: currentCountry.iso,
                        countryName: currentCountry.name,
                        aggregation: 'section',
                        tariffMethod: 'statutory',
                        // Use the selected sector group
                        selectedSectors: sectorGroups[selectedGroup],
                        displayMode: 'pairs',
                        showUSTariffs: true,
                        showCountryTariffs: true,
                        title: `Figure 4. Industry Tariff Rates Over Time`
                    };
                    
                    // Options for the chart creation
                    const options = {
                        skipDots: true // Skip rendering dots for cleaner line charts
                    };
                    
                    // Create the chart
                    return window.industryTariffsTimeSeries.createChart('industry-tariffs-time-container', params, options);
                })
                .catch(error => {
                    console.error('Error creating industry tariffs time series chart:', error);
                    document.getElementById('industry-tariffs-time-container').innerHTML = `
                        <div class="chart-error">
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                });
        } else {
            console.error('industryTariffsTimeSeries module not available');
            document.getElementById('industry-tariffs-time-container').innerHTML = `
                <div class="chart-error">
                    <p>Error: industryTariffsTimeSeries module not available</p>
                </div>
            `;
        }
    }
    
    /**
     * Create the Compressed Treemap chart (Row 3, Right) pre-drilled to China
     */
    function createCompressedTreemapChartImports() {
        if (window.compressedCountryTreemap && window.compressedCountryTreemap.createChart) {
            // Show loading indicator
            document.getElementById('compressed-treemap-container-imports').innerHTML = '<div class="chart-loading">Loading compressed treemap data...</div>';
            
            // Initial params for the treemap
            const params = {
                title: '<strong>Figure 2.</strong> Imports in 2024 by Product Category',
                dataType: 'imports',  // Show imports data
                showLabels: true,
                animate: false,       // No animation needed since we'll drill down immediately
                year: '2024'          // Most recent year
            };
            
            // Create the treemap first, then manually drill down to China after it loads
            window.compressedCountryTreemap.createChart('compressed-treemap-container-imports', params)
                .then(() => {
                    // After the treemap is created, try to find and click on the China node
                    // Use a more robust approach with multiple attempts
                    attemptDrillDown(importExport = 'imports');
                })
                .catch(error => {
                    console.error('Error creating compressed treemap:', error);
                    document.getElementById('compressed-treemap-container-imports').innerHTML = `
                        <div class="chart-error">
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                });
        } else {
            console.error('compressedCountryTreemap module not available');
            document.getElementById('compressed-treemap-container-imports').innerHTML = `
                <div class="chart-error">
                    <p>Error: compressedCountryTreemap module not available</p>
                </div>
            `;
        }
    }
    function createCompressedTreemapChartExports() {
        if (window.compressedCountryTreemap && window.compressedCountryTreemap.createChart) {
            // Show loading indicator
            document.getElementById('compressed-treemap-container-exports').innerHTML = '<div class="chart-loading">Loading compressed treemap data...</div>';
            
            // Initial params for the treemap
            const params = {
                title: '<strong>Figure 3.</strong> Exports in 2024 by Product Category',
                dataType: 'exports',  // Show exports data
                showLabels: true,
                animate: false,       // No animation needed since we'll drill down immediately
                year: '2024'          // Most recent year
            };
            
            // Create the treemap first, then manually drill down to China after it loads
            window.compressedCountryTreemap.createChart('compressed-treemap-container-exports', params)
                .then(() => {
                    // After the treemap is created, try to find and click on the China node
                    // Use a more robust approach with multiple attempts
                    attemptDrillDown(importExport = 'exports');
                })
                .catch(error => {
                    console.error('Error creating compressed treemap:', error);
                    document.getElementById('compressed-treemap-container-exports').innerHTML = `
                        <div class="chart-error">
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                });
        } else {
            console.error('compressedCountryTreemap module not available');
            document.getElementById('compressed-treemap-container-exports').innerHTML = `
                <div class="chart-error">
                    <p>Error: compressedCountryTreemap module not available</p>
                </div>
            `;
        }
    }
    
    /**
     * Try multiple approaches to find and click the country node for drill-down
     * This function will make multiple attempts with different selectors and timing
     */
    function attemptDrillDown(importExport) {
        //console.log(`Attempting to drill down to ${currentCountry.name}...`);
        
        // We'll try different strategies and timings
        let attempts = 0;
        const maxAttempts = 5;
        const interval = 500; // Try every 500ms
        
        const findAndClick = () => {
            attempts++;
            //console.log(`Drill-down attempt ${attempts}...`);
            
            // Try multiple selector strategies
            let countryNode = null;
            
            // Strategy 1: Try to find by data-id attribute
            countryNode = document.querySelector(`#compressed-treemap-container-${importExport} [data-id="${currentCountry.iso}"]`);
            
            // Strategy 2: Try to find rect with country name text nearby
            if (!countryNode) {
                const countryTexts = Array.from(document.querySelectorAll(`#compressed-treemap-container-${importExport} text:not(.treemap-value):not(.treemap-title):not(.treemap-subtitle)`));
                const countryText = countryTexts.find(el => el.textContent.includes(currentCountry.name));
                if (countryText) {
                    // Look for the closest rect
                    const parentG = countryText.closest('g');
                    if (parentG) {
                        countryNode = parentG.querySelector('rect');
                    }
                }
            }
            
            // Strategy 3: Try to find any rect with the continent as a fallback
            // First determine the continent based on the country ISO
            let continent = "Asia"; // Default for China
            // Simple mapping for major countries - in a real implementation this would use a proper continent mapper
            if (currentCountry.iso === "USA" || currentCountry.iso === "CAN" || currentCountry.iso === "MEX") continent = "North America";
            else if (currentCountry.iso === "DEU" || currentCountry.iso === "FRA" || currentCountry.iso === "GBR") continent = "Europe";
            
            if (!countryNode) {
                const continentTexts = Array.from(document.querySelectorAll(`#compressed-treemap-container-${importExport} text`));
                const continentText = continentTexts.find(el => el.textContent.includes(continent));
                if (continentText) {
                    const parentG = continentText.closest('g');
                    if (parentG) {
                        countryNode = parentG.querySelector('rect');
                    }
                }
            }
            
            // If we found a node, try clicking it
            if (countryNode) {
                //console.log('Found node to drill down:', countryNode);
                // Try clicking directly
                countryNode.dispatchEvent(new MouseEvent('click', { 
                    bubbles: true, 
                    cancelable: true, 
                    view: window 
                }));
                
                // Also try clicking the parent g element
                const parentG = countryNode.closest('g');
                if (parentG) {
                    parentG.dispatchEvent(new MouseEvent('click', { 
                        bubbles: true, 
                        cancelable: true, 
                        view: window 
                    }));
                }
                
                return true; // Success
            }
            
            // If we haven't found it yet and haven't reached max attempts, try again
            if (attempts < maxAttempts) {
                setTimeout(findAndClick, interval);
            } else {
                //console.log('Failed to find and drill down to China after maximum attempts');
            }
        };
        
        // Start the attempts after a delay to ensure initial render is complete
        setTimeout(findAndClick, 1);
    }
    
    function createSectionBilateralTradeChart(hsSection="1") {
        if (window.sectionBilateralTradeChart && window.sectionBilateralTradeChart.createChart) {
            // Show loading indicator
            document.getElementById('section-bilateral-trade-container').innerHTML = '<div class="chart-loading">Loading section bilateral trade data...</div>';
            
            // Load HS section title first (just to make the demo nice)
            window.sectionBilateralTradeChart.getAvailableSections()
                .then(sections => {
                    // Find the section title
                    const section = sections.find(s => s.code === hsSection);
                    const sectionTitle = section ? section.title : `HS Section ${hsSection}`;
                    
                    // Update the dropdown display with the proper title
                    const sectionDisplay = document.querySelector('.hs-section-display');
                    if (sectionDisplay) {
                        sectionDisplay.textContent = sectionTitle;
                        sectionDisplay.setAttribute('data-section', hsSection);
                    }
                    
                    // Create the chart
                    window.sectionBilateralTradeChart.createChart(
                        'section-bilateral-trade-container', 
                        currentCountry.iso, 
                        currentCountry.name,
                        hsSection,
                        {
                            skipDots: true, // Skip rendering dots for cleaner line charts
                            title: `Figure 7. Section Bilateral Trade: ${sectionTitle}`,
                            onSuccess: function(config) {
                                //console.log(`Section bilateral trade chart created successfully for ${currentCountry.name}, section ${hsSection}:`, config);
                            },
                            onError: function(error) {
                                console.error(`Error creating section bilateral trade chart for ${currentCountry.name}, section ${hsSection}:`, error);
                                document.getElementById('section-bilateral-trade-container').innerHTML = `
                                    <div class="chart-error">
                                        <p>Error: ${error.message}</p>
                                    </div>
                                `;
                            }
                        }
                    );
                })
                .catch(error => {
                    console.error('Error loading HS sections:', error);
                    document.getElementById('section-bilateral-trade-container').innerHTML = `
                        <div class="chart-error">
                            <p>Error loading HS sections: ${error.message}</p>
                        </div>
                    `;
                });
        } else {
            console.error('sectionBilateralTradeChart module not available');
            document.getElementById('section-bilateral-trade-container').innerHTML = `
                <div class="chart-error">
                    <p>Error: sectionBilateralTradeChart module not available</p>
                </div>
            `;
        }
    }

    // This advanced implementation can be used in the future when we need more flexibility
    // Currently using the simpler implementation below
    /*
    function createCountrySectionTimeSeriesChart(metric = 'impVal_section', numTop = 5, containerId = null) {
        // Implementation moved to the main function below
    }
    */

    /**
     * Toggle the country dropdown
     */
    function toggleCountryDropdown() {
        const dropdown = document.getElementById('country-dropdown');
        const toggle = document.querySelector('.country-dropdown-toggle');
        
        if (dropdown && toggle) {
            // Get toggle's position information
            const toggleRect = toggle.getBoundingClientRect();
            
            // Position dropdown under the toggle
            dropdown.style.left = (toggleRect.left + toggleRect.width/2) + 'px';
            dropdown.style.top = (toggleRect.bottom + 5) + 'px';
            // Ensure the z-index is extremely high to appear above all other elements, including treemaps
            dropdown.style.zIndex = "99999";
            
            // Toggle active class
            const isExpanded = dropdown.classList.toggle('active');
            toggle.classList.toggle('active');
            
            // Update ARIA attributes
            toggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            
            // If opening the dropdown, focus the first option after a short delay
            if (isExpanded) {
                setTimeout(() => {
                    const firstOption = dropdown.querySelector('.country-option');
                    if (firstOption) {
                        firstOption.focus();
                    }
                }, 50);
            }
        }
    }
    
    /**
     * Toggle the sector group dropdown
     * @param {boolean|undefined} forceState - Optional: force dropdown to a specific state (true=open, false=closed)
     */
    function toggleSectorGroupDropdown(forceState) {
        const dropdown = document.getElementById('sector-group-dropdown');
        const toggle = document.querySelector('.sector-group-dropdown-toggle');
        const container = document.querySelector('.sector-group-selector-container');
        
        if (dropdown && toggle) {
            // Get container's position information if it exists, otherwise use toggle
            const rect = container ? container.getBoundingClientRect() : toggle.getBoundingClientRect();
            
            // Position dropdown under the container/toggle
            dropdown.style.left = (rect.left + rect.width/2) + 'px';
            dropdown.style.top = (rect.bottom + 5) + 'px';
            
            // Toggle active class or set to forced state
            let isExpanded;
            if (forceState !== undefined) {
                isExpanded = forceState;
                if (forceState) {
                    dropdown.classList.add('active');
                    toggle.classList.add('active');
                    if (container) container.classList.add('active');
                } else {
                    dropdown.classList.remove('active');
                    toggle.classList.remove('active');
                    if (container) container.classList.remove('active');
                }
            } else {
                isExpanded = dropdown.classList.toggle('active');
                toggle.classList.toggle('active');
                if (container) container.classList.toggle('active');
            }
            
            // Update ARIA attributes
            toggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            if (container) container.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            
            // If opening the dropdown, focus the first option after a short delay
            if (isExpanded) {
                setTimeout(() => {
                    const firstOption = dropdown.querySelector('.sector-group-option');
                    if (firstOption) {
                        firstOption.focus();
                    }
                }, 50);
            }
        }
    }
    
    /**
     * Update the current country and refresh all charts
     * @param {string} iso - Country ISO code
     * @param {string} name - Country name
     */
    function updateCountry(iso, name) {
        //console.log(`Changing country from ${currentCountry.name} to ${name}`);
        
        // Update the current country
        currentCountry.iso = iso;
        currentCountry.name = name;
        
        // Update the UI - find all country name and ISO elements
        const countryNameElements = document.querySelectorAll('.country-name');
        const countryIsoElements = document.querySelectorAll('.country-iso');
        
        countryNameElements.forEach(el => {
            el.textContent = name;
        });
        
        countryIsoElements.forEach(el => {
            el.textContent = iso;
        });
        
        // Close the dropdown
        const dropdown = document.getElementById('country-dropdown');
        const toggle = document.querySelector('.country-dropdown-toggle');
        
        if (dropdown) dropdown.classList.remove('active');
        if (toggle) toggle.classList.remove('active');
        
        // Thorough cleanup to free memory:
        
        // 1. Clear all chart data caches
        clearAllDataCaches();
        
        // 2. Load bilateral features data and update the narrative
        loadBilateralFeaturesData()
            .then(() => {
                // Once data is loaded, update the narrative
                updateTradeNarrative();
            });

        // 2. Determine current active tab
        const tradeRelationsTab = document.getElementById('trade-relations-tab');
        const tariffRelationshipsTab = document.getElementById('tariff-relationships-tab');
        const sectionAnalysisTab = document.getElementById('section-analysis-tab');
        
        let activeTab = 'trade-relations';
        if (tariffRelationshipsTab && tariffRelationshipsTab.classList.contains('active')) {
            activeTab = 'tariff-relationships';
        } else if (sectionAnalysisTab && sectionAnalysisTab.classList.contains('active')) {
            activeTab = 'section-analysis';
        }
        
        // 3. Force garbage collection if possible (browser may ignore this)
        if (window.gc) {
            window.gc();
        }
        
        // Refresh charts based on the current active tab with lazy loading
        //console.log('Starting chart refresh with lazy loading for', activeTab);
        createCharts(activeTab);
    }
    
    /**
     * Toggle the panel visibility
     */
    function togglePanel() {
        if (isVisible) {
            hidePanel();
        } else {
            showPanel();
        }
    }
    
    /**
     * Create the Section Time Series Chart
     */
    // Section Time Series Chart removed - will be implemented in a separate global view
    
    /**
     * Create the Country Section Time Series Chart with specified metric
     * @param {string} metric - The metric to display ('impVal_section', 'expVal_section', 'trade_deficit')
     * @param {number} numTop - Number of top sections to display (default: 5)
     * @param {string} [containerId] - Optional container ID to use instead of the default
     * @param {Array} [customSections] - Optional array of section IDs to display instead of top sections
     */
    function createCountrySectionTimeSeriesChart(metric = 'impVal_section', numTop = 5, containerId = null, customSections = null) {
        if (window.countrySectionTimeSeriesChart && window.countrySectionTimeSeriesChart.createChart) {
            // Define valid metrics and display names
            const validMetrics = {
                'impVal_section': 'Imports', 
                'expVal_section': 'Exports', 
                'trade_deficit': 'Trade Balance'
            };

            const figureNumber = {
                'impVal_section': '2', 
                'expVal_section': '3', 
                'trade_deficit': '1'
            }
            
            // Validate metric
            if (!validMetrics[metric]) {
                console.error(`Invalid metric: ${metric}. Using default 'impVal_section'`);
                metric = 'impVal_section';
            }
            
            // Use provided containerId or create one based on metric
            if (!containerId) {
                containerId = `country-section-time-series-container-${metric}`;
            }
            
            // Check if container exists, if not create it
            let container = document.getElementById(containerId);
            if (!container) {
                // Use the default container as a fallback
                container = document.getElementById('country-section-time-series-container');
                if (!container) {
                    console.error(`Container not found for metric ${metric}`);
                    return;
                }
            }
            
            // Show loading indicator
            container.innerHTML = '<div class="chart-loading">Loading country section time series data...</div>';
            
            // Create chart options with custom title and note for each metric type
            const options = {
                skipDots: true, // Skip rendering dots to avoid inconsistent dots
                // Set the title with HTML tags
                title: `<strong>Figure ${figureNumber[metric]}.</strong> ${validMetrics[metric]} by Commodity Section: U.S. and ${currentCountry.name}`,
                // Add specific notes based on the metric type
                note: metric === 'trade_deficit' 
                    ? `Positive values indicate a U.S. trade surplus (exports > imports) for that commodity section, while negative values indicate a U.S. trade deficit (imports > exports). `
                    : metric === 'impVal_section'
                    ? `U.S. imports from ${currentCountry.name} by HS commodity section. `
                    : `U.S. exports to ${currentCountry.name} by HS commodity section. `,
                // Add source information
                source: "U.S. Census Bureau's USA Trade Online",
                onSuccess: function(config) {
                    // No need to update the title here as it's already set correctly in the options
                },
                onError: function(error) {
                    console.error(`Error creating country section time series chart (${metric}) for ${currentCountry.name}:`, error);
                    container.innerHTML = `
                        <div class="chart-error">
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                }
            };
            
            // If custom sections are provided, add them to the options
            if (customSections && customSections.length > 0) {
                options.selectedSections = customSections;
            }
            
            // Add figure number based on the metric
            const metricName = validMetrics[metric];
            const figureNum = metric === 'trade_deficit' ? 1 : (metric === 'impVal_section' ? 2 : 3);
            options.title = `<strong>Figure ${figureNum}.</strong> ${currentCountry.name} ${metricName} by Section`;
            
            // Add specific notes based on the metric type
            options.note = metric === 'trade_deficit' 
                ? `Trade balance defined as export - imports. Import values as appraised by U.S. Customs, excluding import duties, freight, and insurance for general imports. Export values defined as the total value of the goods for export at the U.S. port of export.`
                : metric === 'impVal_section'
                ? `U.S. imports from ${currentCountry.name} by HS commodity section.  Import values as appraised by U.S. Customs, excluding import duties, freight, and insurance for general imports.`
                : `U.S. exports to ${currentCountry.name} by HS commodity section. Export values defined as the total value of the goods for export at the U.S. port of export.`;
                
            // Add source information
            options.source = "U.S. Census Bureau's USA Trade Online";
            
            // Create the chart with the specified metric and options
            window.countrySectionTimeSeriesChart.createChart(
                containerId, 
                currentCountry.iso, 
                currentCountry.name, 
                metric, 
                numTop,
                options
            );
        } else {
            console.error('Country section time series module not available');
            document.getElementById(containerId || 'country-section-time-series-container').innerHTML = `
                <div class="chart-error">
                    <p>Error: Country section time series module not available</p>
                </div>
            `;
        }
    }
    /**
     * Update the tariff explanation text based on the current country
     */
    function updateTariffExplanationText() {
        // Get the introductory text section at the top of the tab (lines 92-93 in HTML)
        const introTextSection = document.querySelector('.tariff-relationships-content > .text-section');
        
        // Get the detailed text section beside the charts (lines 101-103 in HTML)
        const detailTextSection = document.querySelector('.tariff-relationships-content .split-section .split-left .text-section');
        
        if (!introTextSection || !detailTextSection) {
            console.error("Could not find required text sections");
            return;
        }

        // First paragraph that goes to the introductory text section 
        // (Section 232 (national security tariffs), Section 301 (retaliatory tariffs related to unfair trade practices))
        const introText = `
        <p>
        These statutory tariff rates do not include additional measures such as Section 232 (national security) tariffs, Section 301 (unfair trade practices) tariffs, or anti-dumping duties. 
        For comprehensive up-to-date information, users are encouraged to consult resources such as the <a href="https://www.piie.com/research/piie-charts/2019/us-china-trade-war-tariffs-date-chart" target="_blank" style="color: var(--hyperlink); text-decoration: underline;">Peterson Institute</a>, the <a href="https://budgetlab.yale.edu/topic/trade" target="_blank" style="color: var(--hyperlink); text-decoration: underline;">Yale Budget Lab</a>, or the <a href=https://www.tradecomplianceresourcehub.com/2025/06/17/trump-2-0-tariff-tracker/" target ="_blank" style="color: var(--hyperlink); text-decoration: underline;"> Trade Compliance Resource Hub</a>.
        </p>
        `;
        
        // The rest of the explanation that goes to the detailed text section
        const detailText = `
        <p>
        <b>Figure 1</b> displays the average effective statutory tariff rates imposed by the <strong>United States</strong> on <strong>${currentCountry.name}</strong> and vice versa.
        </p>
        <p><b>Figure 2</b> shows commodity level statutory tariff rates in 2021 across the 21 HS sections.
        </p><p> <b>Figure 3</b> presents a time series of statutory tariff rates from 1995 to 2021, broken out by HS section. Solid lines represent tariffs imposed by the <strong>United States</strong> on imports from <strong>${currentCountry.name}</strong>, while dashed lines represent <strong>${currentCountry.name}'s</strong> tariffs on <strong>U.S.</strong> imports. HS sections are grouped into four broader categories, Agricultural, Industrial, Manufacturing, and Raw Materials. Currently displaying: 
        <span class="sector-group-selector-container">
            <span class="sector-group-display">Agricultural Sectors</span>
                <span class="sector-group-dropdown-toggle">
                    <img src="assets/fontawesome/chevron-down-solid.svg" alt="Select Sector Group" class="dropdown-icon">
                </span>
                <div class="sector-group-dropdown" id="sector-group-dropdown">
                    <div id="sector-group-dropdown-content">
                        <div class="sector-group-option" data-group="agricultural">Agricultural Sectors</div>
                        <div class="sector-group-option" data-group="industrial">Industrial Sectors</div>
                        <div class="sector-group-option" data-group="manufacturing">Manufacturing Sectors</div>
                        <div class="sector-group-option" data-group="materials">Raw Materials</div>
                    </div>
                </div>
            </span>
        </p>
        <p class="selection-note">Note: Use the dropdown to view different categories in the charts.</p>
        `;
        
        // Special case text for specific countries
        let additionalText = '';
        if (currentCountry.iso === 'TWN') {
            additionalText = `
                <p>
                The presented rates are statutory tariff rates, defined as 
                the minimum between the preferential tariff rate and the most-favored-nation (MFN) tariff rate. 
                The MFN rate is the default rate applied to imports from all World Trade Organization (WTO) members, while preferential rates are lower rates extended to select countries or regions.
                </p>
                <p>
                The United Nations does not disseminate trade statistics referring to <strong>Taiwan</strong>. Therefore, the Global Tariff Dataset (Teti 2024) does not create trade-weighted rates for <strong>Taiwan</strong>. The rates presented are the result of unweighted tariff rates winsorized at the 95<sup>th</sup> percentile to reduce the influence of ouliers.
                </p>`;
        } else if (currentCountry.iso === 'LIE') {
            additionalText = `
                <p>
                The presented rates are statutory tariff rates, defined as 
                the minimum between the preferential tariff rate and the most-favored-nation (MFN) tariff rate. 
                The MFN rate is the default rate applied to imports from all World Trade Organization (WTO) members, while preferential rates are lower rates extended to select countries or regions.
                </p>
                <p>
                <strong>Liechtenstein</strong> forms a customs union with Switzerland, so its trade data is reported under Switzerland in the Global Tariff Database's (Teti 2024) underlying trade data. There is accordingly no trade weighted tariff rates for <strong>Liechtenstein</strong> in the Global Tariff Database. The statutory rates here are produced from unweighted tariff rates winsorized at the 95<sup>th</sup> percentile to reduce the influence of outliers. </p>
            `;
        } else if (currentCountry.iso === 'MYT') {
            additionalText = `
                <p>
                The presented rates are statutory tariff rates, defined as 
                the minimum between the preferential tariff rate and the most-favored-nation (MFN) tariff rate. 
                The MFN rate is the default rate applied to imports from all World Trade Organization (WTO) members, while preferential rates are lower rates extended to select countries or regions.
                </p>
                <p>
                <strong>Mayotte</strong> is an overseas department and region of France, with its tariff and trade data is reported under France. Because of this, the Global Tariff Database (Teti 2024) could not create trade-weighted tariff rates for <strong>Mayotte</strong>. The statutory rates here are produced from unweighted tariff rates winsorized at the 95<sup> percentile to reduce the influence of outliers.
                </p>
            `;
        } else {
            additionalText = `
                <p>
                The presented rates are statutory tariff rates, defined as 
                the minimum between the preferential tariff rate and the most-favored-nation (MFN) tariff rate. 
                The MFN rate is the default rate applied to imports from all World Trade Organization (WTO) members, while preferential rates are lower rates extended to select countries or regions.
                
                For <strong>${currentCountry.name}</strong>, the statutory tariff rate is calculated based on trade-weighted MFN and preferential rates winsorized at the 95<sup>th</sup> percentile to reduce the influence of outliers.
                </p>
            `;
        }

        // Add the sector group dropdown placeholder
        const sectorGroupSelector = `<p></p>`;

        // Update the introductory text section with just the intro text
        introTextSection.innerHTML = additionalText + introText ;
        
        // Update the detailed text section with the additionalText, detailText, and sector dropdown
        detailTextSection.innerHTML = detailText + sectorGroupSelector;
        
        // Add event listeners for the sector group dropdown
        setupSectorGroupDropdownListeners();
    }
    
    /**
     * Set up event listeners for the sector group dropdown after it's added to the DOM
     */
    function setupSectorGroupDropdownListeners() {
        const sectorGroupToggle = document.querySelector('.sector-group-dropdown-toggle');
        const sectorGroupDisplay = document.querySelector('.sector-group-display');
        const sectorGroupContainer = document.querySelector('.sector-group-selector-container');
        
        if (sectorGroupToggle) {
            // Add accessibility attributes
            sectorGroupToggle.setAttribute('tabindex', '0');
            sectorGroupToggle.setAttribute('role', 'button');
            sectorGroupToggle.setAttribute('aria-haspopup', 'true');
            sectorGroupToggle.setAttribute('aria-expanded', 'false');
            sectorGroupToggle.setAttribute('aria-label', 'Select sector group');
            
            // Initialize active option
            if (sectorGroupDisplay) {
                const currentText = sectorGroupDisplay.textContent.trim();
                const sectorGroupDropdown = document.querySelector('#sector-group-dropdown');
                if (sectorGroupDropdown) {
                    // Find the matching option and mark it as active
                    const options = sectorGroupDropdown.querySelectorAll('.sector-group-option');
                    options.forEach(option => {
                        if (option.textContent.trim() === currentText) {
                            option.classList.add('active');
                            option.setAttribute('aria-selected', 'true');
                        } else {
                            option.classList.remove('active');
                            option.setAttribute('aria-selected', 'false');
                        }
                    });
                }
            }
            
            // Make the entire container and display text clickable
            if (sectorGroupContainer) {
                sectorGroupContainer.style.cursor = 'pointer';
                
                // Add click handler to the entire container
                sectorGroupContainer.addEventListener('click', function(e) {
                    // Only toggle if we're not clicking on the dropdown itself
                    if (!e.target.closest('.sector-group-dropdown')) {
                        e.stopPropagation();
                        toggleSectorGroupDropdown();
                    }
                });
            }
            
            // Make the display text clickable too
            if (sectorGroupDisplay) {
                sectorGroupDisplay.style.cursor = 'pointer';
            }
            
            // Add click listener for the toggle as a fallback
            sectorGroupToggle.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent click from closing the dropdown immediately
                toggleSectorGroupDropdown();
            });
            
            // Add keyboard listener
            sectorGroupToggle.addEventListener('keydown', function(e) {
                // Toggle on Enter or Space
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSectorGroupDropdown();
                }
            });
        }
        
        // Setup sector group options
        const sectorGroupDropdown = document.querySelector('#sector-group-dropdown');
        if (sectorGroupDropdown) {
            // Add role for accessibility
            sectorGroupDropdown.setAttribute('role', 'listbox');
            
            // Set role and tabindex for all options
            const options = sectorGroupDropdown.querySelectorAll('.sector-group-option');
            options.forEach(option => {
                option.setAttribute('role', 'option');
                option.setAttribute('tabindex', '0');
            });
            
            // Click listener for sector group options
            sectorGroupDropdown.addEventListener('click', function(e) {
                const option = e.target.closest('.sector-group-option');
                if (option) {
                    e.stopPropagation();
                    const group = option.getAttribute('data-group');
                    const displayText = option.textContent.trim();
                    
                    // Update the display
                    const displayElement = document.querySelector('.sector-group-display');
                    if (displayElement) {
                        displayElement.textContent = displayText;
                    }
                    
                    // Update active state on options
                    const allOptions = sectorGroupDropdown.querySelectorAll('.sector-group-option');
                    allOptions.forEach(opt => {
                        opt.classList.remove('active');
                        opt.setAttribute('aria-selected', 'false');
                    });
                    option.classList.add('active');
                    option.setAttribute('aria-selected', 'true');
                    
                    // Close the dropdown
                    toggleSectorGroupDropdown(false);
                    
                    // Reload the chart with the new sector group, passing the selected group
                    createIndustryTariffsTimeSeriesChart(group);
                }
            });
            
            // Keyboard navigation for dropdown
            sectorGroupDropdown.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Close dropdown on Escape
                    toggleSectorGroupDropdown(false);
                    if (sectorGroupToggle) sectorGroupToggle.focus(); // Return focus to toggle
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    // Navigate options with arrow keys
                    e.preventDefault();
                    
                    const options = Array.from(sectorGroupDropdown.querySelectorAll('.sector-group-option'));
                    if (options.length === 0) return;
                    
                    // Find currently focused option
                    const focusedOption = document.activeElement.closest('.sector-group-option');
                    let nextIndex = 0;
                    
                    if (focusedOption) {
                        const currentIndex = options.indexOf(focusedOption);
                        if (e.key === 'ArrowDown') {
                            nextIndex = (currentIndex + 1) % options.length;
                        } else {
                            nextIndex = (currentIndex - 1 + options.length) % options.length;
                        }
                    }
                    
                    options[nextIndex].focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    // Select option with Enter or Space
                    e.preventDefault();
                    const option = e.target.closest('.sector-group-option');
                    if (option) {
                        const group = option.getAttribute('data-group');
                        const displayText = option.textContent.trim();
                        
                        // Update the display
                        const displayElement = document.querySelector('.sector-group-display');
                        if (displayElement) {
                            displayElement.textContent = displayText;
                        }
                        
                        // Update active state on options
                        const allOptions = sectorGroupDropdown.querySelectorAll('.sector-group-option');
                        allOptions.forEach(opt => {
                            opt.classList.remove('active');
                            opt.setAttribute('aria-selected', 'false');
                        });
                        option.classList.add('active');
                        option.setAttribute('aria-selected', 'true');
                        
                        // Close the dropdown
                        toggleSectorGroupDropdown(false);
                        
                        // Reload the chart with the new sector group, passing the selected group
                        createIndustryTariffsTimeSeriesChart(group);
                    }
                }
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.sector-group-selector-container')) {
                    toggleSectorGroupDropdown(false);
                }
            });
        }
    }
    
    /**
     * Toggle the HS Section dropdown
     */
    function toggleHsSectionDropdown(forceState) {
        const dropdown = document.getElementById('hs-section-dropdown');
        const toggle = document.querySelector('.hs-section-dropdown-toggle');
        const container = document.querySelector('.hs-section-selector-container');
        
        if (dropdown && toggle) {
            // Get container's position information
            const containerRect = container.getBoundingClientRect();
            
            // Position dropdown under the container
            dropdown.style.left = (containerRect.left + containerRect.width/2) + 'px';
            dropdown.style.top = (containerRect.bottom + 5) + 'px';
            
            // Toggle active class or set to forced state
            let isExpanded;
            if (forceState !== undefined) {
                isExpanded = forceState;
                if (forceState) {
                    dropdown.classList.add('active');
                    toggle.classList.add('active');
                    container.classList.add('active');
                } else {
                    dropdown.classList.remove('active');
                    toggle.classList.remove('active');
                    container.classList.remove('active');
                }
            } else {
                isExpanded = dropdown.classList.toggle('active');
                toggle.classList.toggle('active');
                container.classList.toggle('active');
            }
            
            // Update ARIA attributes
            toggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            container.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            
            // If opening the dropdown, focus the first option after a short delay
            if (isExpanded) {
                setTimeout(() => {
                    const firstOption = dropdown.querySelector('.hs-section-option');
                    if (firstOption) {
                        firstOption.focus();
                    }
                }, 50);
            }
        }
    }
    
    /**
     * Set up event listeners for the HS section dropdown after it's added to the DOM
     */
    function setupHsSectionDropdownListeners() {
        // First, remove any existing event listeners to prevent duplicates
        cleanupHsSectionDropdownListeners();
        
        // Populate the dropdown with HS sections using the actual section names
        const dropdownContent = document.getElementById('hs-section-dropdown-content');
        if (dropdownContent) {
            // Clear existing content
            dropdownContent.innerHTML = '';
            
            // First, try to get the section names from the sectionBilateralTradeChart module
            if (window.sectionBilateralTradeChart && window.sectionBilateralTradeChart.getAvailableSections) {
                // Show loading state in dropdown
                dropdownContent.innerHTML = '<div class="loading-text">Loading sections...</div>';
                
                window.sectionBilateralTradeChart.getAvailableSections()
                    .then(sections => {
                        // Clear loading message
                        dropdownContent.innerHTML = '';
                        
                        // Create the section options with real names
                        for (let i = 1; i <= 21; i++) {
                            const sectionCode = i.toString();
                            const section = sections.find(s => s.code === sectionCode);
                            const sectionTitle = section ? section.title : `HS Section ${i}`;
                            
                            const option = document.createElement('div');
                            option.className = 'hs-section-option';
                            option.setAttribute('data-section', sectionCode);
                            option.setAttribute('role', 'option');
                            option.setAttribute('tabindex', '0');
                            option.textContent = sectionTitle;
                            
                            // Set active state for the current section
                            const currentSectionElement = document.querySelector('.hs-section-display');
                            const currentSection = currentSectionElement ? 
                                currentSectionElement.getAttribute('data-section') || "1" : "1";
                                
                            if (currentSection === sectionCode) {
                                option.classList.add('active');
                                option.setAttribute('aria-selected', 'true');
                            } else {
                                option.setAttribute('aria-selected', 'false');
                            }
                            
                            dropdownContent.appendChild(option);
                        }
                        
                        // Attach event handlers after options are created
                        attachHsSectionDropdownHandlers();
                    })
                    .catch(error => {
                        console.error('Error loading section names:', error);
                        // Fallback to numeric section names if loading fails
                        createNumericSectionOptions();
                        attachHsSectionDropdownHandlers();
                    });
            } else {
                // Fallback to numeric section names if the module is not available
                createNumericSectionOptions();
                attachHsSectionDropdownHandlers();
            }
        } else {
            // Just attach handlers if dropdownContent is not available
            attachHsSectionDropdownHandlers();
        }
        
        // Helper function to create numeric section options when real names aren't available
        function createNumericSectionOptions() {
            if (!dropdownContent) return;
            
            dropdownContent.innerHTML = ''; // Clear any loading message
            
            // Add options for HS sections 1-21 with generic names
            for (let i = 1; i <= 21; i++) {
                const option = document.createElement('div');
                option.className = 'hs-section-option';
                option.setAttribute('data-section', i.toString());
                option.setAttribute('role', 'option');
                option.setAttribute('tabindex', '0');
                option.textContent = `HS Section ${i}`;
                
                // Set active state for the current section
                const currentSectionElement = document.querySelector('.hs-section-display');
                const currentSection = currentSectionElement ? 
                    currentSectionElement.getAttribute('data-section') || "1" : "1";
                    
                if (currentSection === i.toString()) {
                    option.classList.add('active');
                    option.setAttribute('aria-selected', 'true');
                } else {
                    option.setAttribute('aria-selected', 'false');
                }
                
                dropdownContent.appendChild(option);
            }
        }
    }
    
    /**
     * Cleanup existing event listeners for HS section dropdown
     * to prevent duplicates when reattaching
     */
    function cleanupHsSectionDropdownListeners() {
        // Get dropdown elements
        const hsSectionContainer = document.querySelector('.hs-section-selector-container');
        const hsSectionDropdown = document.querySelector('#hs-section-dropdown');
        
        // Remove the global document click handler that closes dropdowns
        document.removeEventListener('click', closeHsSectionDropdownOnClickOutside);
        
        // If there's a previous container with listeners, clone and replace it to remove listeners
        if (hsSectionContainer) {
            const newContainer = hsSectionContainer.cloneNode(true);
            hsSectionContainer.parentNode.replaceChild(newContainer, hsSectionContainer);
        }
        
        // If there's a previous dropdown with listeners, clone and replace it to remove listeners
        if (hsSectionDropdown) {
            const newDropdown = hsSectionDropdown.cloneNode(true);
            hsSectionDropdown.parentNode.replaceChild(newDropdown, hsSectionDropdown);
        }
    }
    
    /**
     * Handler for closing the dropdown when clicking outside
     */
    function closeHsSectionDropdownOnClickOutside(e) {
        if (!e.target.closest('.hs-section-selector-container')) {
            toggleHsSectionDropdown(false);
        }
    }
    
    /**
     * Attach event handlers to HS section dropdown elements
     */
    function attachHsSectionDropdownHandlers() {
        // Make the entire container (text + chevron) clickable
        const hsSectionContainer = document.querySelector('.hs-section-selector-container');
        const hsSectionToggle = document.querySelector('.hs-section-dropdown-toggle');
        const hsSectionDisplay = document.querySelector('.hs-section-display');
        
        if (hsSectionContainer && hsSectionToggle) {
            // Add accessibility attributes to the toggle
            hsSectionToggle.setAttribute('aria-haspopup', 'true');
            hsSectionToggle.setAttribute('aria-expanded', 'false');
            
            // Make the entire container act as a button
            hsSectionContainer.setAttribute('tabindex', '0');
            hsSectionContainer.setAttribute('role', 'button');
            hsSectionContainer.setAttribute('aria-label', 'Select HS Section');
            hsSectionContainer.style.cursor = 'pointer';
            
            // Add click listener to the entire container
            hsSectionContainer.addEventListener('click', function(e) {
                // Prevent clicks in the dropdown itself from toggling
                if (!e.target.closest('.hs-section-dropdown')) {
                    e.stopPropagation();
                    toggleHsSectionDropdown();
                }
            });
            
            // Add keyboard listener
            hsSectionContainer.addEventListener('keydown', function(e) {
                // Toggle on Enter or Space
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleHsSectionDropdown();
                }
            });
            
            // Make the display text itself look clickable
            if (hsSectionDisplay) {
                hsSectionDisplay.style.cursor = 'pointer';
            }
        }
        
        // Setup HS section options
        const hsSectionDropdown = document.querySelector('#hs-section-dropdown');
        if (hsSectionDropdown) {
            // Add role for accessibility
            hsSectionDropdown.setAttribute('role', 'listbox');
            
            // Click listener for HS section options
            hsSectionDropdown.addEventListener('click', function(e) {
                const option = e.target.closest('.hs-section-option');
                if (option) {
                    e.stopPropagation();
                    const section = option.getAttribute('data-section');
                    const displayText = option.textContent.trim();
                    
                    // Update the display
                    const displayElement = document.querySelector('.hs-section-display');
                    if (displayElement) {
                        displayElement.textContent = displayText;
                        displayElement.setAttribute('data-section', section);
                    }
                    
                    // Update active state on options
                    const allOptions = hsSectionDropdown.querySelectorAll('.hs-section-option');
                    allOptions.forEach(opt => {
                        opt.classList.remove('active');
                        opt.setAttribute('aria-selected', 'false');
                    });
                    option.classList.add('active');
                    option.setAttribute('aria-selected', 'true');
                    
                    // Close the dropdown
                    toggleHsSectionDropdown(false);
                    
                    // Reload the chart with the new HS section
                    createSectionBilateralTradeChart(section);
                }
            });
            
            // Keyboard navigation for dropdown
            hsSectionDropdown.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Close dropdown on Escape
                    toggleHsSectionDropdown(false);
                    const toggle = document.querySelector('.hs-section-dropdown-toggle');
                    if (toggle) toggle.focus(); // Return focus to toggle
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    // Navigate options with arrow keys
                    e.preventDefault();
                    
                    const options = Array.from(hsSectionDropdown.querySelectorAll('.hs-section-option'));
                    if (options.length === 0) return;
                    
                    // Find currently focused option
                    const focusedOption = document.activeElement.closest('.hs-section-option');
                    let nextIndex = 0;
                    
                    if (focusedOption) {
                        const currentIndex = options.indexOf(focusedOption);
                        if (e.key === 'ArrowDown') {
                            nextIndex = (currentIndex + 1) % options.length;
                        } else {
                            nextIndex = (currentIndex - 1 + options.length) % options.length;
                        }
                    }
                    
                    options[nextIndex].focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    // Select option with Enter or Space
                    e.preventDefault();
                    const option = e.target.closest('.hs-section-option');
                    if (option) {
                        const section = option.getAttribute('data-section');
                        const displayText = option.textContent.trim();
                        
                        // Update the display
                        const displayElement = document.querySelector('.hs-section-display');
                        if (displayElement) {
                            displayElement.textContent = displayText;
                            displayElement.setAttribute('data-section', section);
                        }
                        
                        // Update active state on options
                        const allOptions = hsSectionDropdown.querySelectorAll('.hs-section-option');
                        allOptions.forEach(opt => {
                            opt.classList.remove('active');
                            opt.setAttribute('aria-selected', 'false');
                        });
                        option.classList.add('active');
                        option.setAttribute('aria-selected', 'true');
                        
                        // Close the dropdown
                        toggleHsSectionDropdown(false);
                        
                        // Reload the chart with the new HS section
                        createSectionBilateralTradeChart(section);
                    }
                }
            });
            
            // Close dropdown when clicking outside - use named function for easy removal
            document.addEventListener('click', closeHsSectionDropdownOnClickOutside);
        }
    }

    // Expose toggle functions to the window for direct access
    window.toggleNarrativeSectionDropdown = toggleNarrativeSectionDropdown;
    window.toggleHsSectionDropdown = toggleHsSectionDropdown;
    
    // Public API
    return {
        initialize,
        showPanel,
        hidePanel,
        togglePanel,
        updateCountry,
        getCurrentCountry: () => ({ ...currentCountry }), // Return a copy of the current country
        getBilateralFeaturesData: () => bilateralFeaturesData,
        getProductFeaturesData: () => productFeaturesData,
        getSectionTimeSeriesData: () => sectionTimeSeriesData,
        toggleNarrativeSectionDropdown // Expose to the API as well
    };
})();