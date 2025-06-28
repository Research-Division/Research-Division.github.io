/**
 * tariff_comparison_chart.js - Tariff Comparison Bar Chart
 * 
 * This module creates a bar chart modal comparing original vs current tariff rates
 * for a selected country, using the static vectors stored in TariffCalculations results.
 */

window.tariffComparisonChart = (function() {
    let currentIsoCode = null;
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modal = document.getElementById('tariff-comparison-modal');
            if (modal && modal.style.display === 'block') {
                closeModal();
            }
        }
    });
    
    /**
     * Open the tariff comparison modal for a specific country
     * @param {string} isoCode - ISO code of the country to display
     */
    function openModal(isoCode) {
        if (!isoCode) {
            console.error('No ISO code provided');
            return;
        }
        
        currentIsoCode = isoCode;
        
        let existingContainer = document.getElementById('tariff-comparison-panel-container');
        if (existingContainer) {
            document.body.removeChild(existingContainer);
        }
        
        const panelContainer = document.createElement('div');
        panelContainer.id = 'tariff-comparison-panel-container';
        panelContainer.className = 'multi-chart-panel-container';
        panelContainer.style.display = 'flex';
        panelContainer.style.overflow = 'auto'; // Add scrolling support
        
        fetch(DataPaths.charts.tariffComparison)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load tariff comparison chart template: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                panelContainer.innerHTML = html;
                document.body.appendChild(panelContainer);
                
                // Add CSS for household income dropdown styling
                const styleElement = document.createElement('style');
                styleElement.textContent = `
                    .household-income-display {
                        color: var(--orange1);
                        font-weight: bold;
                        cursor: pointer;
                    }
                    
                    .household-income-dropdown-toggle {
                        display: inline-block;
                        margin-left: 0;
                        cursor: pointer;
                        vertical-align: middle;
                    }
                    
                    .household-income-dropdown-toggle img {
                        height: 10px;
                        width: 10px;
                        filter: var(--icon-filter, none); /* Apply color inversion in dark mode */
                        transition: transform 0.2s ease;
                    }
                    
                    .household-income-dropdown-toggle.active img {
                        transform: rotate(180deg);
                    }
                    
                    .household-income-dropdown {
                        position: fixed;
                        transform: translateX(-50%);
                        background-color: var(--background-color);
                        border: 1px solid var(--borderColor, #ddd);
                        border-radius: var(--borderRadius);
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                        display: none;
                        z-index: 1100; /* Higher z-index to appear above other elements */
                        max-height: 300px;
                        width: 150px;
                        overflow-y: auto;
                        padding: 5px 0;
                    }
                    
                    .household-income-dropdown.active {
                        display: block;
                    }
                    
                    .household-income-option {
                        padding: 8px 15px;
                        cursor: pointer;
                        font-family: var(--font-family-monospace);
                        font-size: 14px;
                        color: var(--text-color);
                    }
                    
                    .household-income-option:hover {
                        background-color: var(--borderColor);
                    }
                    
                    .household-income-option.active {
                        background-color: var(--blue1, #3581b4);
                        color: white;
                    }
                `;
                document.head.appendChild(styleElement);
                
                const countryName = window.isoToCountryName && window.isoToCountryName[isoCode] 
                    ? window.isoToCountryName[isoCode] 
                    : isoCode;
                
                const countryNameElements = panelContainer.querySelectorAll('.country-name');
                countryNameElements.forEach(el => {
                    el.textContent = countryName;
                });
                
                const countryIsoElements = panelContainer.querySelectorAll('.country-iso');
                countryIsoElements.forEach(el => {
                    el.textContent = isoCode;
                });
                
                const modal = panelContainer.querySelector('#tariff-comparison-modal');
                if (modal) {
                    modal.style.display = 'block';
                }
                
                const closeButton = panelContainer.querySelector('.panel-close-button');
                if (closeButton) {
                    closeButton.addEventListener('click', closeModal);
                }
                
                // Setup FAQ link to open help panel and scroll to methodology section
                const faqLink = panelContainer.querySelector('#faq-link');
                if (faqLink) {
                    faqLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        // Show the help panel (same function used by citation link)
                        if (window.showHelpPanel && typeof window.showHelpPanel === 'function') {
                            window.showHelpPanel();
                            
                            // After panel is visible, scroll to the methodology/FAQ section
                            setTimeout(() => {
                                const modalBody = document.querySelector('.modal-body');
                                
                                if (modalBody) {
                                    // Look for the paragraph containing methodology/FAQ text
                                    const methodologyParagraphs = modalBody.querySelectorAll('p');
                                    let methodologyParagraph = null;
                                    
                                    for (let p of methodologyParagraphs) {
                                        if (p.textContent.includes('For detailed information on our methodology, calculations, and frequently asked questions')) {
                                            methodologyParagraph = p;
                                            break;
                                        }
                                    }
                                    
                                    if (methodologyParagraph) {
                                        // Get the position relative to the modal body
                                        const paragraphPosition = methodologyParagraph.offsetTop;
                                        
                                        // Scroll the modal body to the methodology section
                                        modalBody.scrollTo({
                                            top: paragraphPosition - 100, // Subtract some pixels to show context above
                                            behavior: 'smooth'
                                        });
                                        
                                        // Add a brief highlight effect to the paragraph
                                        methodologyParagraph.style.backgroundColor = 'rgba(0, 118, 182, 0.1)';
                                        methodologyParagraph.style.transition = 'background-color 0.5s ease';
                                        
                                        // Remove highlight after 3 seconds
                                        setTimeout(() => {
                                            methodologyParagraph.style.backgroundColor = '';
                                        }, 3000);
                                    }
                                }
                            }, 500); // Wait a bit longer for the modal to fully render
                        }
                    });
                }
                
                setupCountryDropdown(panelContainer);
                setupHouseholdIncomeDropdown(panelContainer);
                createTariffComparisonChart(isoCode, 'total');
            })
            .catch(error => {
                console.error('Error loading tariff comparison modal:', error);
                alert('Error loading tariff comparison chart: ' + error.message);
            });
    }
    
    /**
     * Setup dropdown for country selection
     * @param {HTMLElement} container - The container element with the dropdown
     */
    function setupCountryDropdown(container) {
        const dropdownToggle = container.querySelector('.country-dropdown-toggle');
        const dropdown = container.querySelector('#country-dropdown');
        
        if (dropdownToggle && dropdown) {
            dropdownToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleCountryDropdown(dropdown, dropdownToggle);
                populateCountryDropdown(container);
            });
            
            dropdown.addEventListener('click', function(e) {
                const option = e.target.closest('.country-option');
                if (option) {
                    e.stopPropagation();
                    const iso = option.getAttribute('data-iso');
                    const name = option.getAttribute('data-name');
                    
                    if (iso && name) {
                        currentIsoCode = iso;
                        
                        const countryNameElements = container.querySelectorAll('.country-name');
                        countryNameElements.forEach(el => {
                            el.textContent = name;
                        });
                        
                        const countryIsoElements = container.querySelectorAll('.country-iso');
                        countryIsoElements.forEach(el => {
                            el.textContent = iso;
                        });
                        
                        // Clear all treemap caches when changing country
                        if (window.tariffEffectsTreemap && window.tariffEffectsTreemap.clearCache) {
                            window.tariffEffectsTreemap.clearCache();  // Clear all caches
                        }
                        createTariffComparisonChart(iso, selectedEffectType);
                        
                        dropdown.classList.remove('active');
                        dropdownToggle.classList.remove('active');
                    }
                }
            });
            
            document.addEventListener('click', function(e) {
                if (dropdown.classList.contains('active') && 
                    !dropdown.contains(e.target) && 
                    !dropdownToggle.contains(e.target)) {
                    dropdown.classList.remove('active');
                    dropdownToggle.classList.remove('active');
                }
            });
        }
    }
    
    /**
     * Toggle the country dropdown visibility
     * @param {HTMLElement} dropdown - The dropdown element
     * @param {HTMLElement} toggle - The toggle element
     */
    function toggleCountryDropdown(dropdown, toggle) {
        if (dropdown && toggle) {
            const toggleRect = toggle.getBoundingClientRect();
            dropdown.style.left = (toggleRect.left + toggleRect.width/2) + 'px';
            dropdown.style.top = (toggleRect.bottom + 5) + 'px';
            dropdown.classList.toggle('active');
            toggle.classList.toggle('active');
        }
    }
    
    /**
     * Setup dropdown for household income selection
     * @param {HTMLElement} container - The container element with the dropdown
     */
    function setupHouseholdIncomeDropdown(container) {
        const dropdownToggle = container.querySelector('.household-income-dropdown-toggle');
        const dropdown = container.querySelector('#household-income-dropdown');
        const incomeDisplay = container.querySelector('.household-income-display');
        
        if (dropdownToggle && dropdown && incomeDisplay) {
            // Set initial value display
            incomeDisplay.textContent = householdIncomePresets.find(p => p.value === selectedHouseholdIncome)?.label || '$100,000';
            
            // Setup toggle click handler
            dropdownToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleHouseholdIncomeDropdown(dropdown, dropdownToggle, incomeDisplay);
                populateHouseholdIncomeDropdown(dropdown);
            });
            
            // Also trigger on income display click for better UX
            incomeDisplay.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleHouseholdIncomeDropdown(dropdown, dropdownToggle, incomeDisplay);
                populateHouseholdIncomeDropdown(dropdown);
            });
            
            // Handle option selection
            dropdown.addEventListener('click', function(e) {
                const option = e.target.closest('.household-income-option');
                if (option) {
                    e.stopPropagation();
                    const value = parseInt(option.getAttribute('data-value'), 10);
                    const label = option.textContent;
                    
                    if (value && label) {
                        // Update selected income value
                        selectedHouseholdIncome = value;
                        incomeDisplay.textContent = label;
                        
                        // Hide dropdown
                        dropdown.classList.remove('active');
                        dropdownToggle.classList.remove('active');
                        
                        // Clear all treemap caches when changing income
                        if (window.tariffEffectsTreemap && window.tariffEffectsTreemap.clearCache) {
                            window.tariffEffectsTreemap.clearCache();  // Clear all caches
                        }
                        
                        // Recreate chart with new income value
                        createTariffEffectsTreemap(selectedEffectType);
                    }
                }
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (dropdown.classList.contains('active') && 
                    !dropdown.contains(e.target) && 
                    !dropdownToggle.contains(e.target) &&
                    !incomeDisplay.contains(e.target)) {
                    dropdown.classList.remove('active');
                    dropdownToggle.classList.remove('active');
                }
            });
        }
    }
    
    /**
     * Toggle the household income dropdown visibility
     * @param {HTMLElement} dropdown - The dropdown element
     * @param {HTMLElement} toggle - The toggle element
     * @param {HTMLElement} display - The income display element
     */
    function toggleHouseholdIncomeDropdown(dropdown, toggle, display) {
        if (dropdown && toggle) {
            const displayRect = display.getBoundingClientRect();
            // Position the dropdown centered under the display element, matching country dropdown style
            dropdown.style.left = (displayRect.left + displayRect.width/2) + 'px';
            dropdown.style.top = (displayRect.bottom + 5) + 'px';
            dropdown.classList.toggle('active');
            toggle.classList.toggle('active');
        }
    }
    
    /**
     * Populate dropdown with household income options
     * @param {HTMLElement} dropdown - The dropdown element
     */
    function populateHouseholdIncomeDropdown(dropdown) {
        const dropdownContent = dropdown.querySelector('#household-income-dropdown-content');
        if (!dropdownContent) return;
        
        // Clear existing content
        dropdownContent.innerHTML = '';
        
        // Add income options header
        const headerEl = document.createElement('div');
        headerEl.className = 'country-group-header';  // Reuse the same class for consistency
        headerEl.textContent = 'Household Income';
        dropdownContent.appendChild(headerEl);
        
        // Add income options
        householdIncomePresets.forEach(preset => {
            const isActive = preset.value === selectedHouseholdIncome ? ' active' : '';
            const activeStyle = isActive ? 'background-color: var(--blue1, #3581b4); color: white;' : '';
            
            const option = document.createElement('div');
            option.className = `household-income-option${isActive}`;
            option.setAttribute('data-value', preset.value);
            option.style = activeStyle;
            option.textContent = preset.label;
            
            dropdownContent.appendChild(option);
        });
    }
    
    /**
     * Populate dropdown with countries from the receipt, grouped by continent
     * @param {HTMLElement} container - The container element
     */
    function populateCountryDropdown(container) {
        const dropdownContent = container.querySelector('#country-dropdown-content');
        if (!dropdownContent) return;
        
        // Clear existing content
        dropdownContent.innerHTML = '<div class="dropdown-loading">Loading countries...</div>';
        
        // Get countries from the receipt/calculation results
        const countryList = [];
        
        // Check if we have calculation results with country data
        if (window.TariffCalculations && typeof window.TariffCalculations.getMostRecentResults === 'function') {
            const results = window.TariffCalculations.getMostRecentResults();
            if (results && results.length > 0) {
                // Filter out WLD and WRLD from the results
                results.filter(r => r.isoCode !== 'WLD' && r.isoCode !== 'WRLD').forEach(result => {
                    const iso = result.isoCode;
                    const name = window.isoToCountryName && window.isoToCountryName[iso] 
                        ? window.isoToCountryName[iso] 
                        : iso;
                    
                    countryList.push({ iso, name });
                });
            }
        }
        
        // If no countries found in calculation results, try selectedISOs array
        if (countryList.length === 0 && window.selectedISOs && window.selectedISOs.length > 0) {
            window.selectedISOs.filter(iso => iso !== 'WLD' && iso !== 'WRLD').forEach(iso => {
                const name = window.isoToCountryName && window.isoToCountryName[iso] 
                    ? window.isoToCountryName[iso] 
                    : iso;
                
                countryList.push({ iso, name });
            });
        }
        
        // If still no countries found, show message
        if (countryList.length === 0) {
            dropdownContent.innerHTML = '<div class="dropdown-error">No countries available</div>';
            return;
        }
        
        // Load continent data and group countries
        fetch(DataPaths.meta.country_continent)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load continent data');
                }
                return response.json();
            })
            .then(continentData => {
                // Group countries by continent
                const countriesByContinent = {};
                
                // Initialize continents with empty arrays
                Object.keys(continentData).forEach(continent => {
                    countriesByContinent[continent] = [];
                });
                
                // Add an "Other" category for countries without continent data
                countriesByContinent['Other'] = [];
                
                // Assign each country to its continent
                countryList.forEach(country => {
                    let continentFound = false;
                    
                    // Look through each continent to find the country
                    Object.keys(continentData).forEach(continent => {
                        const countryInContinent = continentData[continent].find(c => {
                            // Handle both string and array ISO codes
                            const iso = Array.isArray(c.ISO_A3) ? c.ISO_A3 : [c.ISO_A3];
                            return iso.includes(country.iso);
                        });
                        
                        if (countryInContinent) {
                            countriesByContinent[continent].push(country);
                            continentFound = true;
                        }
                    });
                    
                    // If continent not found, add to "Other"
                    if (!continentFound) {
                        countriesByContinent['Other'].push(country);
                    }
                });
                
                // Sort countries within each continent
                Object.keys(countriesByContinent).forEach(continent => {
                    countriesByContinent[continent].sort((a, b) => a.name.localeCompare(b.name));
                });
                
                // Build dropdown HTML with continent grouping
                let dropdownHtml = '';
                
                // Get list of continents with at least one country
                const continentsWithCountries = Object.keys(countriesByContinent)
                    .filter(continent => countriesByContinent[continent].length > 0)
                    // Custom sort order with "Other" at the end
                    .sort((a, b) => {
                        if (a === 'Other') return 1;
                        if (b === 'Other') return -1;
                        return a.localeCompare(b);
                    });
                
                // Add each continent and its countries
                continentsWithCountries.forEach(continent => {
                    const countries = countriesByContinent[continent];
                    if (countries.length > 0) {
                        // Add continent header
                        dropdownHtml += `<div class="country-group-header">${continent} (${countries.length})</div>`;
                        
                        // Add countries in this continent
                        countries.forEach(country => {
                            // Highlight current country
                            const isActive = country.iso === currentIsoCode ? ' active' : '';
                            const activeStyle = isActive ? 'background-color: var(--blue1, #3581b4); color: white;' : '';
                            
                            dropdownHtml += `
                                <div class="country-option${isActive}" data-iso="${country.iso}" data-name="${country.name}" style="${activeStyle}">
                                    ${country.name} (${country.iso})
                                </div>
                            `;
                        });
                    }
                });
                
                // Update dropdown content
                dropdownContent.innerHTML = dropdownHtml;
            })
            .catch(error => {
                console.error('Error loading continent data:', error);
                
                // Fallback to alphabetical list if continent data fails to load
                countryList.sort((a, b) => a.name.localeCompare(b.name));
                
                let dropdownHtml = '';
                countryList.forEach(country => {
                    // Highlight current country
                    const isActive = country.iso === currentIsoCode ? ' active' : '';
                    const activeStyle = isActive ? 'background-color: var(--blue1, #3581b4); color: white;' : '';
                    
                    dropdownHtml += `
                        <div class="country-option${isActive}" data-iso="${country.iso}" data-name="${country.name}" style="${activeStyle}">
                            ${country.name} (${country.iso})
                        </div>
                    `;
                });
                
                // Update dropdown content with the fallback list
                dropdownContent.innerHTML = dropdownHtml;
            });
    }
    
    /**
     * Close the modal
     */
    function closeModal() {
        // Clean up any tooltips before removing the panel
        const globalTooltip = document.getElementById('treemap-tooltip-container');
        if (globalTooltip) {
            globalTooltip.style.visibility = 'hidden';
            // Completely remove tooltip from DOM for complete cleanup
            if (globalTooltip.parentNode) {
                globalTooltip.parentNode.removeChild(globalTooltip);
            }
        }
        
        // Find and remove the entire panel container
        const panelContainer = document.getElementById('tariff-comparison-panel-container');
        if (panelContainer) {
            document.body.removeChild(panelContainer);
        }
    }
    
    // Default effect type for treemap visualization
    let selectedEffectType = 'total';
    
    // Household income presets for dollar impact calculations
    const householdIncomePresets = [
        { value: 50000, label: '$50,000' },
        { value: 75000, label: '$75,000' },
        { value: 100000, label: '$100,000' },
        { value: 150000, label: '$150,000' },
        { value: 200000, label: '$200,000' }
    ];
    
    // Default household income value
    let selectedHouseholdIncome = 100000;
    
    /**
     * Create the tariff comparison chart for a specific country
     * @param {string} isoCode - ISO code of the country to display
     * @param {string} initialEffectType - Initial effect type to show ('direct', 'indirect', or 'total')
     */
    function createTariffComparisonChart(isoCode, initialEffectType = 'direct') {
        // Set the selected effect type
        selectedEffectType = initialEffectType;
        // Check required dependencies
        if (!window.barChartDataUtils || typeof window.barChartDataUtils.createBarChartData !== 'function') {
            displayError('barChartDataUtils not available for chart creation');
            loadDependencies(isoCode);
            return;
        }
        
        // Check if sparksBarChart is available
        if (!window.sparksBarChart) {
            displayError('sparksBarChart not available for rendering');
            loadDependencies(isoCode);
            return;
        }
        
        // Check if TariffCalculations is available
        if (!window.TariffCalculations || !window.TariffCalculations.getMostRecentResults) {
            displayError('TariffCalculations module not available');
            return;
        }
        
        // Ensure formatUtils is available - add minimal fallback if needed
        if (!window.formatUtils) {
            window.formatUtils = {
                formatPercent: function(value, decimals = 1) {
                    return (value * 100).toFixed(decimals) + '%';
                }
            };
        }
        
        // Try to load chart configuration if not already loaded
        if (window.sparksChartConfigManager && !window.chartConfig) {
            window.sparksChartConfigManager.loadConfig();
        }
        
        // Get the chart container
        const chartContainer = document.getElementById('tariff-comparison-chart-container');
        if (!chartContainer) {
            displayError('Chart container not found');
            return;
        }
        
        // Get the most recent calculation results
        const results = window.TariffCalculations.getMostRecentResults();
        
        // Find the country in the results
        const isoList = results.map(r => r.isoCode);
        const isoCodeIndex = isoList.indexOf(isoCode);
        
        if (isoCodeIndex === -1) {
            displayError(`No calculation results found for country: ${isoCode}`);
            return;
        }
        
        const countryResult = results[isoCodeIndex];
        
        // Check if we have section tariffs data
        if (!countryResult.sectionTariffs || 
            !countryResult.sectionTariffs.original || 
            !countryResult.sectionTariffs.current) {
            displayError('Section tariff data not available for this country');
            return;
        }
        
        // Get original and current tariff values
        const originalTariffs = countryResult.sectionTariffs.original;
        const currentTariffs = countryResult.sectionTariffs.current;
        const directEffectVector = countryResult.directEffectVector;
        const indirectEffectVector = countryResult.indirectEffectVector;
        const totalEffectVector = countryResult.totalEffectVector;
        
        // Debug log to check what's in the vectors
        /*
        console.log('Effect vectors:', {
            direct: directEffectVector ? directEffectVector.length : 'not available',
            indirect: indirectEffectVector ? indirectEffectVector.length : 'not available',
            total: totalEffectVector ? totalEffectVector.length : 'not available'
        });
        */
        // Check if at least one effect vector is available
        if (!directEffectVector && !indirectEffectVector && !totalEffectVector) {
            console.error('No effect vectors available for treemap visualization');
            // Show error in the treemap container
            const container = document.getElementById('tariff-effect-chart-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <h3>Data Not Available</h3>
                        <p>No tariff effect data is available for this country. Please use a country with calculated effects.</p>
                    </div>
                `;
            }
        } else {
            // Create aggregations for the effect vectors using Aggregations.js
            createEffectAggregations(directEffectVector, indirectEffectVector, totalEffectVector)
                .then(() => {
                    // Clear all caches before initial treemap creation
                    if (window.tariffEffectsTreemap && window.tariffEffectsTreemap.clearCache) {
                        window.tariffEffectsTreemap.clearCache();  // Clear all caches
                    }
                    // Only create the treemap after aggregations are complete
                    createTariffEffectsTreemap(selectedEffectType);
                })
                .catch(error => {
                    console.error('Error during effect aggregation:', error);
                    // Show error in the treemap container
                    const container = document.getElementById('tariff-effect-chart-container');
                    if (container) {
                        container.innerHTML = `
                            <div class="error-message">
                                <h3>Error Processing Data</h3>
                                <p>Could not create tariff effect visualization: ${error}</p>
                            </div>
                        `;
                    }
                });
        }
        
        // Use previously loaded section titles or load them now
        if (!window.sectionTitlesMap) {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', DataPaths.meta.section_to_chapters, false);
                xhr.send(null);
                
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    window.sectionTitlesMap = {};
                    Object.keys(data).forEach(id => {
                        window.sectionTitlesMap[id] = data[id].title || `Section ${id}`;
                    });
                } else {
                    window.sectionTitlesMap = {};
                }
            } catch (error) {
                window.sectionTitlesMap = {};
            }
        }
        
        // Convert to vectors for the chart
        const sectionIds = Object.keys(originalTariffs).sort((a, b) => parseInt(a) - parseInt(b));
        const originalVector = sectionIds.map(id => originalTariffs[id] || 0);
        const currentVector = sectionIds.map(id => currentTariffs[id] || 0);
        
        // Create mapping between section IDs, display names, and full titles
        const sectionNameMapping = {};
        
        // Generate both shortened display names and keep full titles for tooltips
        const categoryNames = sectionIds.map(id => {
            // Get the title from our map
            const fullTitle = window.sectionTitlesMap[id];
            let displayName = `Section ${id}`;
            
            if (fullTitle) {
                // Format the title for better display in the chart
                // Keep it short, focus on key terms
                
                // Handle very long title for section 3 specially
                if (id === '3' && fullTitle.includes('Fats & Oils')) {
                    displayName = 'Fats & Oils';
                } else { 
                    // Simplify common sections using shorter names
                    const simplifiedTitles = {
                        'Live Animals and Animal Products': 'Live Animals & Products',
                        'Vegetable Products': 'Vegetable Products',
                        'Animal or Vegetable Fats and Oils and Their Cleavage Products; Prepared Edible Fats; Animal or Vegetable Waxes': 'Fats & Oils',
                        'Prepared Foodstuffs; Beverages, Spirits and Vinegar; Tobacco and Manufactured Tobacco Substitutes': 'Food, Bev. & Tobacco',
                        'Mineral Products': 'Minerals',
                        'Products of the Chemical or Allied Industries': 'Chemicals',
                        'Plastics and Articles Thereof; Rubber and Articles Thereof': 'Plastics & Rubber',
                        'Raw Hides and Skins, Leather, Furskins and Articles Thereof; Saddlery and Harness; Travel Goods, Handbags and Similar Containers; Articles of Animal Gut (Other Than Silkworm Gut)': 'Leather & Fur',
                        'Wood and Articles of Wood; Wood Charcoal; Cork and Articles of Cork; Manufactures of Straw, of Esparto or of Other Plaiting Materials; Basketware and Wickerwork': 'Wood Products',
                        'Pulp of Wood or of Other Fibrous Cellulosic Material; Recovered (Waste and Scrap) Paper or Paperboard; Paper and Paperboard and Articles Thereof': 'Paper & Pulp',
                        'Textiles and Textile Articles': 'Textiles',
                        'Footwear, Headgear, Umbrellas, Walking-Sticks, Whips, Riding-Crops and Parts Thereof; Prepared Feathers and Articles Made Therewith; Artificial Flowers; Articles of Human Hair': 'Footwear & Acc.',
                        'Articles of Stone, Plaster, Cement, Asbestos, Mica or Similar Materials; Ceramic Products; Glass and Glassware': 'Stone & Ceramics',
                        'Natural or Cultured Pearls, Precious or Semi-Precious Stones, Precious Metals, Metals Clad with Precious Metal and Articles Thereof; Imitation Jewelry; Coin': 'Jewelry & Gems',
                        'Base Metals and Articles of Base Metal': 'Metals',
                        'Machinery and Mechanical Appliances; Electrical Equipment; Parts Thereof': 'Machinery',
                        'Vehicles, Aircraft, Vessels and Associated Transport Equipment': 'Transportation',
                        'Optical, Photographic, Cinematographic, Measuring, Checking, Precision, Medical or Surgical Instruments and Apparatus; Clocks and Watches; Musical Instruments; Parts and Accessories Thereof': 'Precision Instruments',
                        'Arms and Ammunition; Parts and Accessories Thereof': 'Arms & Ammun.',
                        'Miscellaneous Manufactured Articles': 'Misc. Manufactured',
                        "Works of Art, Collectors' Pieces and Antiques": 'Art & Antiques'
                    };
                    
                    // Check for matches in our simplified titles
                    let matched = false;
                    for (const [key, simplified] of Object.entries(simplifiedTitles)) {
                        if (fullTitle.includes(key)) {
                            displayName = simplified;
                            matched = true;
                            break;
                        }
                    }
                    
                    // Default - take first part of title (up to first "and" or "or")
                    // and limit length to avoid overlapping
                    if (!matched) {
                        let shortTitle = fullTitle.split(' and ')[0].split(' or ')[0];
                        if (shortTitle.length > 15) {
                            shortTitle = shortTitle.substring(0, 12) + '...';
                        }
                        displayName = shortTitle;
                    }
                }
            }
            
            // Store both display name and full title in the mapping
            sectionNameMapping[id] = {
                displayName: displayName,
                fullTitle: fullTitle || `Section ${id}` 
            };
            
            return displayName;
        });
        
        // Get country name
        const countryName = window.isoToCountryName && window.isoToCountryName[isoCode] 
            ? window.isoToCountryName[isoCode] 
            : isoCode;
        
        // Create bar chart data
        const chartData = window.barChartDataUtils.createBarChartData(
            originalVector,
            currentVector,
            categoryNames,
            'Original Tariffs',
            'New Tariffs'
        );
        
        // Attach the section mapping to the chart data for use in tooltips
        chartData.sectionMapping = sectionNameMapping;
        chartData.sectionIds = sectionIds;
        
        // Use FRBA color palette from chartConfig.json if possible
        let originalColor = 'var(--primary)';
        let currentColor = 'var(--excellenceOrange)';
        
        if (window.chartConfig && window.chartConfig.colors && window.chartConfig.colors.bilateral) {
            originalColor = window.chartConfig.colors.bilateral[0];
            currentColor = window.chartConfig.colors.bilateral[1];
        } else if (window.sparksColorUtils && window.sparksColorUtils.getBilatColor) {
            originalColor = window.sparksColorUtils.getBilatColor(0);
            currentColor = window.sparksColorUtils.getBilatColor(1);
        }
        
        chartData.series[0].color = originalColor; // Original tariffs
        chartData.series[1].color = currentColor; // Current tariffs
        
        // Generate an appropriate subtitle based on tariff source
        let subtitle = 'Initial tariff rates versus user imposed current tariff rates. Missing bars indicate no tariff or no import data for that country and HS-Section.';
        
        // Check if we have tariff source information
        if (countryResult.tariffSource === 'uniformPopup') {
            // For uniform tariffs applied via popup
            const metadata = countryResult.tariffMetadata || {};
            const originalValue = metadata.originalValue !== undefined ? metadata.originalValue.toFixed(1) + '%' : 'baseline';
            const newValue = metadata.newValue !== undefined ? metadata.newValue.toFixed(1) + '%' : 'new';
            const passThrough = metadata.passThroughRate !== undefined ? metadata.passThroughRate.toFixed(0) + '%' : '100%';
            
            subtitle = `Simplified view showing uniform <span style="color:var(--blue1);font-weight:bold">${originalValue}</span> baseline tariff vs. <span style="color:var(--orange1);font-weight:bold">${newValue}</span> updated tariff across all product categories. ${passThrough} pass-through rate applied. For detailed analysis, use the <span style="font-weight:bold;text-decoration:underline">Product Specific Tariffs</span> button.`;
        }
        
        // Add additional configuration
        const chartConfig = {
            ...chartData,
            title: `Tariff Comparison for ${countryName}`,
            subtitle: subtitle,
            source: "Global Tariff Database (Teti 2024)",
            yAxis: {
                title: 'Tariff Rate (%)',
                type: 'number',
                min: 0,
                max: Math.max(...originalVector, ...currentVector) * 1.1 // 10% headroom
            },
            xAxis: {
                type: 'string',
                title: '',
                labelAngle: -45, // Increased angle for better readability of longer labels
                labelOffset: 15   // Add more offset for angled labels
            },
            // Custom tooltip formatter function that will be passed to sparksBarChart
            tooltipFormatter: function(value) {
                // Default simple formatter in case we don't have additional arguments
                if (arguments.length === 1) {
                    return value.toFixed(1) + '%';
                }
                
                // If we have xValue (from bar chart implementation), find the corresponding section
                const xValue = arguments.length >= 3 ? arguments[2] : null;
                const seriesName = arguments.length >= 2 ? arguments[1] : '';
                
                if (xValue) {
                    // Get the section index from the x value position in categoryNames
                    const index = categoryNames.indexOf(xValue);
                    if (index !== -1 && index < sectionIds.length) {
                        const sectionId = sectionIds[index];
                        const fullTitle = sectionNameMapping[sectionId].fullTitle;
                        
                        // Return an enhanced tooltip with section info
                        return `${seriesName}: ${value.toFixed(1)}%<br>Section ${sectionId}: ${fullTitle}`;
                    }
                }
                
                // Fallback to simple formatting
                return `${seriesName}: ${value.toFixed(1)}%`;
            },
            // Configure percentage handling - values are already percentages (not decimals)
            percentageConfig: {
                valuesArePercentages: true
            },
            // Apply standard formatter for consistency
            formatter: 'percentage',
            legend: {
                enabled: true,
                position: 'bottom'
            },
            // Adjust legend spacing and layout to match other charts
            legendConfig: {
                offsetLeft: 80,
                itemsPerRow: 2,
                maxRows: 1,
                useLines: false
            },
            animation: {
                enabled: true,
                duration: 500
            },
            preserveXOrder: true, 
            transform: 'translate(100,30)',
            svgHeight: 400,
            margin: {
                bottom: 140, 
                left: 100,
                right: 50,
                top: 30
            },
            postRender: {
                enabled: true,
                bottomSpaceHeight: '60px',
                applyTransform: true,
                enforceHeight: true
            }
        };
        
        // Clear previous chart
        chartContainer.innerHTML = '';
        
        // Create the chart
        window.sparksBarChart('tariff-comparison-chart-container', chartConfig);
    }
    
    /**
     * Create NIPA layer aggregations for the effect vectors
     * @param {Array} directEffectVector - Direct effect vector from calculations
     * @param {Array} indirectEffectVector - Indirect effect vector from calculations
     * @param {Array} totalEffectVector - Total effect vector from calculations
     */
    function createEffectAggregations(directEffectVector, indirectEffectVector, totalEffectVector) {
        // Check if Aggregations is available, if not load it
        if (!window.Aggregations || !window.Aggregations.aggregateVector) {
            //console.log('Trying to load Aggregations module...');
            
            // Create a script element to load the Aggregations module
            const script = document.createElement('script');
            script.src = 'code/components/calculations/aggregations.js';
            
            return new Promise((resolve, reject) => {
                script.onload = function() {
                    //console.log('Aggregations module loaded successfully');
                    if (window.Aggregations && window.Aggregations.aggregateVector) {
                        // Now the module is loaded, continue with aggregations
                        performAggregations(directEffectVector, indirectEffectVector, totalEffectVector)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject('Aggregations module failed to initialize properly');
                    }
                };
                
                script.onerror = function() {
                    console.error('Failed to load Aggregations module');
                    reject('Failed to load Aggregations module');
                };
                
                document.head.appendChild(script);
            });
        }
        
        // If Aggregations is already available, use it directly
        return performAggregations(directEffectVector, indirectEffectVector, totalEffectVector);
    }
    
    /**
     * Perform the actual aggregations using the Aggregations module
     * @param {Array} directEffectVector - Direct effect vector from calculations
     * @param {Array} indirectEffectVector - Indirect effect vector from calculations
     * @param {Array} totalEffectVector - Total effect vector from calculations
     * @returns {Promise} Promise that resolves when all aggregations are complete
     */
    function performAggregations(directEffectVector, indirectEffectVector, totalEffectVector) {
        // Clear any existing aggregations
        window.nipaDirectLayerAggregations = null;
        window.nipaIndirectLayerAggregations = null;
        window.nipaTotalLayerAggregations = null;
        
        // Create promises for each aggregation
        const promises = [];
        
        // Only process vectors that exist
        if (directEffectVector && directEffectVector.length > 0) {
            promises.push(
                window.Aggregations.aggregateVector(directEffectVector)
                    .then(result => {
                        window.nipaDirectLayerAggregations = result.layerAggregations;
                        //console.log('Direct effect aggregations created');
                    })
            );
        }
        
        if (indirectEffectVector && indirectEffectVector.length > 0) {
            promises.push(
                window.Aggregations.aggregateVector(indirectEffectVector)
                    .then(result => {
                        window.nipaIndirectLayerAggregations = result.layerAggregations;
                        //console.log('Indirect effect aggregations created');
                    })
            );
        }
        
        if (totalEffectVector && totalEffectVector.length > 0) {
            promises.push(
                window.Aggregations.aggregateVector(totalEffectVector)
                    .then(result => {
                        window.nipaTotalLayerAggregations = result.layerAggregations;
                        //console.log('Total effect aggregations created');
                    })
            );
        }
        
        // Return a promise that resolves when all aggregations are complete
        return Promise.all(promises)
            .then(() => {
                //console.log('All effect aggregations created successfully');
            })
            .catch(error => {
                console.error('Error creating effect aggregations:', error);
            });
    }
    
    /**
     * Create the tariff effects treemap visualization
     * @param {string} effectType - Type of effect to display ('direct', 'indirect', or 'total')
     */
    function createTariffEffectsTreemap(effectType = 'direct') {
        // Check if dependencies are loaded
        if (!window.tariffEffectsTreemap) {
            console.error('Tariff effects treemap module not available');
            loadTreemapDependencies().then(() => {
                createTariffEffectsTreemap(effectType);
            });
            return;
        }
        
        // Update selectedEffectType global variable
        selectedEffectType = effectType;
        
        // Get the container
        const container = document.getElementById('tariff-effect-chart-container');
        if (!container) {
            console.error('Tariff effect chart container not found');
            return;
        }
        
        // Show loading indicator
        container.innerHTML = '<div class="chart-loading">Loading tariff effect data...</div>';
        
        // Check if we have the required data
        let dataAvailable = false;
        let effectAggregations = null;
        let totalEffectValue = 0;
        
        switch (effectType) {
            case 'direct':
                dataAvailable = !!window.nipaDirectLayerAggregations;
                effectAggregations = window.nipaDirectLayerAggregations;
                break;
            case 'indirect':
                dataAvailable = !!window.nipaIndirectLayerAggregations;
                effectAggregations = window.nipaIndirectLayerAggregations;
                break;
            case 'total':
                dataAvailable = !!window.nipaTotalLayerAggregations;
                effectAggregations = window.nipaTotalLayerAggregations;
                break;
        }
        
        if (!dataAvailable) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>No Data Available</h3>
                    <p>Tariff ${effectType} effect data is not available.</p>
                </div>
            `;
            return;
        }
        
        // Calculate the total effect value (from layer 0 aggregation)
        if (effectAggregations && effectAggregations['0'] && effectAggregations['0'].sum) {
            totalEffectValue = effectAggregations['0'].sum;
        }
        
        // Format the total effect value as a percentage
        const formattedTotalEffect = window.formatUtils && window.formatUtils.formatPercent ? 
            window.formatUtils.formatPercent(totalEffectValue, 2) : 
            (totalEffectValue * 100).toFixed(2) + '%';
        
        // Create a simplified structure that exactly matches 02_effects_and_rates.html
        const chartContainerWithActions = document.createElement('div');
        chartContainerWithActions.className = 'chart-container-with-actions';
        
        // Create actions container for the reset button
        const chartActions = document.createElement('div');
        chartActions.className = 'chart-actions';
        
        // Create the reset button
        const resetButton = document.createElement('button');
        resetButton.id = `reset-treemap-button-${effectType}`;
        resetButton.className = 'reset-treemap-button';
        resetButton.title = 'Reset Treemap';
        resetButton.setAttribute('aria-label', 'Reset treemap');
        resetButton.innerHTML = '<img src="assets/fontawesome/arrow-rotate-left.svg" alt="" class="reset-icon"><span class="tooltip">Click to reset treemap</span>';
        resetButton.addEventListener('click', function() {
            // Clear cache for the current effect type before redrawing
            if (window.tariffEffectsTreemap && window.tariffEffectsTreemap.clearCache) {
                window.tariffEffectsTreemap.clearCache(selectedEffectType);
            }
            createTariffEffectsTreemap(selectedEffectType);
        });
        
        // Add button to actions
        chartActions.appendChild(resetButton);
        
        // Create the treemap container
        const treemapContainer = document.createElement('div');
        treemapContainer.id = 'tariff-effect-treemap';
        treemapContainer.className = 'chart-container';
        
        // Add elements to the DOM in the correct order
        chartContainerWithActions.appendChild(chartActions);
        chartContainerWithActions.appendChild(treemapContainer);
        
        // Clear container and add our elements
        container.innerHTML = '';
        
        // Add tabs above the chart
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs-container';
        tabsContainer.id = 'chart-tabs-container';
        
        const tabs = [
            { id: 'total', label: 'Total Effects' },
            { id: 'direct', label: 'Direct Effects' },
            { id: 'indirect', label: 'Indirect Effects' }
        ];
        
        tabs.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = `tab ${tab.id === selectedEffectType ? 'active' : ''}`;
            tabElement.setAttribute('data-tab', tab.id);
            tabElement.id = `${tab.id}-effects-tab`;
            
            const span = document.createElement('span');
            span.textContent = tab.label;
            tabElement.appendChild(span);
            
            tabElement.addEventListener('click', function() {
                // Remove active class from all tabs
                tabsContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                
                // Add active class to this tab
                tabElement.classList.add('active');
                
                // Create the treemap with the selected effect type
                if (tab.id !== selectedEffectType) {
                    // Clear cache for the previously selected effect type to prevent cross-contamination
                    if (window.tariffEffectsTreemap && window.tariffEffectsTreemap.clearCache) {
                        window.tariffEffectsTreemap.clearCache(selectedEffectType);
                    }
                    createTariffEffectsTreemap(tab.id);
                }
            });
            
            tabsContainer.appendChild(tabElement);
        });
        
        // Add the tabs and chart container to the main container
        container.appendChild(tabsContainer);
        container.appendChild(chartContainerWithActions);
        
        // No custom styling or patching needed - use the standard rendering approach
        //console.log('Creating treemap with standard rendering');
        
        // Create the treemap with standard options
        const options = {
            showLabels: true,
            showValues: true, // Explicitly set to show values 
            animate: false,
            title: `Tariff ${capitalizeFirstLetter(effectType)} Effects`,
            subtitle: `Total ${effectType} effect: ${formattedTotalEffect} price increase. Values show % of total effect and $ impact on a $${selectedHouseholdIncome.toLocaleString()} household.`,
            preserveTitles: true,
            resetToRoot: true,
            height: 500,
            legendLevel: 1, // Important: This ensures the legend is shown
            valuePrefix: '$',  // Show dollar sign for the values
            valueSuffix: '%', // Try to add percentage suffix
            note: 'Hover over a sector for details and click to drill down. Values show percentage of total effect and dollar impact.',
            householdIncome: selectedHouseholdIncome, // Use the selected household income value
            sourceNote: 'Tariff effect calculations by Federal Reserve Bank of Atlanta',
            maxDepth: 10,
            drillDownManagerOptions: {
                drillDownLevels: ['level0', 'level1', 'level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9'],
                maxDrillLevel: 10,
                disabledLevels: []
            },
            showLegend: true, // Explicitly request legend to be shown
            onSuccess: function() {
                //console.log(`${effectType} effects treemap created successfully`);
            }
        };
        
        // Create the treemap
        window.tariffEffectsTreemap.createChart('tariff-effect-treemap', effectType, options);
    }
    
    /**
     * Helper function to capitalize the first letter of a string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    function capitalizeFirstLetter(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Load all treemap dependencies
     * @returns {Promise} Promise that resolves when all dependencies are loaded
     */
    function loadTreemapDependencies() {
        // If dependencies are already loaded, return resolved promise
        if (window.tariffEffectsTreemap) {
            return Promise.resolve();
        }
        
        // List of required scripts in the correct order
        const dependencies = [
            'src/utils/dataUtils/CompressedTreemap/metadataProvider.js',
            'src/utils/dataUtils/CompressedTreemap/treemapNode.js',
            'src/utils/dataUtils/CompressedTreemap/compressedDataAdapter.js',
            'src/utils/dataUtils/CompressedTreemap/treemapLayout.js',
            'src/utils/dataUtils/CompressedTreemap/treemapRenderer.js',
            'src/utils/dataUtils/CompressedTreemap/drillDownManager.js',
            'src/utils/dataUtils/CompressedTreemap/index.js',
            'src/renderers/sparksCompressedTreemap.js',
            'src/dataAux/tariffTreemapData.js',
            'src/auxiliaryGraphTypes/tariffEffectsTreemap.js'
        ];
        
        return new Promise((resolve, reject) => {
            // Function to load scripts sequentially
            function loadScriptsSequentially(scripts, index = 0) {
                if (index >= scripts.length) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = scripts[index];
                script.async = false;
                
                script.onload = () => {
                    //console.log(`Loaded script: ${scripts[index]}`);
                    loadScriptsSequentially(scripts, index + 1);
                };
                
                script.onerror = () => {
                    console.error(`Error loading script: ${scripts[index]}`);
                    reject(new Error(`Failed to load ${scripts[index]}`));
                };
                
                document.head.appendChild(script);
            }
            
            // Start loading scripts
            loadScriptsSequentially(dependencies);
        });
    }
    
    /**
     * Load required dependencies
     * @param {string} isoCode - ISO code to retry with after dependencies are loaded
     */
    function loadDependencies(isoCode) {
        // Create an array of dependencies to load
        const dependencies = [];
        
        // Add barChartDataUtils if needed
        if (!window.barChartDataUtils) {
            dependencies.push({
                name: 'barChartDataUtils',
                src: 'src/dataAux/barChartData.js'
            });
        }
        
        // Add sparksBarChart if needed
        if (!window.sparksBarChart) {
            dependencies.push({
                name: 'sparksBarChart',
                src: 'src/renderers/sparksBarChart.js'
            });
        }
        
        // Add Aggregations if needed
        if (!window.Aggregations) {
            dependencies.push({
                name: 'Aggregations',
                src: 'code/components/calculations/aggregations.js'
            });
        }
        
        // Add treemap dependencies if needed
        if (!window.tariffEffectsTreemap) {
            dependencies.push({
                name: 'MetadataProvider',
                src: 'src/utils/dataUtils/CompressedTreemap/metadataProvider.js'
            });
            dependencies.push({
                name: 'TreemapNode',
                src: 'src/utils/dataUtils/CompressedTreemap/treemapNode.js'
            });
            dependencies.push({
                name: 'CompressedDataAdapter',
                src: 'src/utils/dataUtils/CompressedTreemap/compressedDataAdapter.js'
            });
            dependencies.push({
                name: 'TreemapLayout',
                src: 'src/utils/dataUtils/CompressedTreemap/treemapLayout.js'
            });
            dependencies.push({
                name: 'TreemapRenderer',
                src: 'src/utils/dataUtils/CompressedTreemap/treemapRenderer.js'
            });
            dependencies.push({
                name: 'DrillDownManager',
                src: 'src/utils/dataUtils/CompressedTreemap/drillDownManager.js'
            });
            dependencies.push({
                name: 'CompressedTreemapIndex',
                src: 'src/utils/dataUtils/CompressedTreemap/index.js'
            });
            dependencies.push({
                name: 'SparksCompressedTreemap',
                src: 'src/renderers/sparksCompressedTreemap.js'
            });
            dependencies.push({
                name: 'TariffTreemapData',
                src: 'src/dataAux/tariffTreemapData.js'
            });
            dependencies.push({
                name: 'TariffEffectsTreemap',
                src: 'src/auxiliaryGraphTypes/tariffEffectsTreemap.js'
            });
        }
        
        // If no dependencies needed, return immediately
        if (dependencies.length === 0) {
            return;
        }
        
        // Load dependencies sequentially
        function loadNextDependency(index) {
            if (index >= dependencies.length) {
                // All dependencies loaded, now refresh the chart
                setTimeout(() => createTariffComparisonChart(isoCode, selectedEffectType), 100);
                return;
            }
            
            const dep = dependencies[index];
            //console.log(`Loading dependency: ${dep.name}`);
            
            const script = document.createElement('script');
            script.src = dep.src;
            script.onload = function() {
                //console.log(`Loaded dependency: ${dep.name}`);
                loadNextDependency(index + 1);
            };
            script.onerror = function() {
                console.error(`Failed to load dependency: ${dep.name}`);
                loadNextDependency(index + 1);
            };
            
            document.head.appendChild(script);
        }
        
        // Start loading dependencies
        loadNextDependency(0);
    }
    
    /**
     * Update the chart title with the country name (but not the modal title)
     */
    function updateChartTitle(countryName) {
        // This function intentionally left empty since we update the country name separately
    }
    
    /**
     * Display an error message in the chart container
     * @param {string} message - Error message to display
     */
    function displayError(message) {
        const chartContainer = document.getElementById('tariff-comparison-chart-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="chart-error">
                    <p>Error: ${message}</p>
                </div>
            `;
        }
    }
    
    // Public API
    return {
        open: openModal,
        close: closeModal
    };
})();