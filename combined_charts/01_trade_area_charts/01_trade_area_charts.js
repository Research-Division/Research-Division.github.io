/**
 * Multi-Chart Display Panel
 * 
 * This file implements a panel-based approach for displaying multiple charts
 * in a scrollable container that can be shown/hidden like a modal.
 */

// Immediately load section mapping to ensure it's available for treemap
(function loadSectionMappingImmediately() {
    try {
        console.log('Loading section mapping in 01_trade_area_charts.js');
        const xhr = new XMLHttpRequest();
        xhr.open('GET', DataPaths.meta.section_to_chapters, false); // Synchronous
        xhr.send(null);
        
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            window.sectionToChaptersMapping = data;
            console.log('Section mapping loaded:', Object.keys(data).length, 'sections available');
            console.log('First section title:', data['1'] ? data['1'].title : 'not found');
        }
    } catch (error) {
        console.error('Error loading section mapping:', error);
    }
})();

window.multiChartPanel = (function() {
    // Flag to track if the panel has been initialized
    let isInitialized = false;
    let isVisible = false;
    
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
        
        console.log('Initializing multi-chart panel');
        
        // Create panel container if it doesn't exist
        createPanelContainer();
        
        // Add styles for the panel
        addPanelStyles();
        
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
        
        // Fetch the HTML content from the external file
        fetch('combined_charts/01_trade_area_charts.html')
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
        
        // Add event listener for the country dropdown toggle
        const dropdownToggle = panelContainer.querySelector('.country-dropdown-toggle');
        if (dropdownToggle) {
            dropdownToggle.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent click from closing the dropdown immediately
                toggleCountryDropdown();
                
                // Load country list if not already loaded
                loadCountryList();
            });
        }
        
        // Setup delegated event listener for country options (which will be added dynamically)
        const dropdown = document.getElementById('country-dropdown');
        if (dropdown) {
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
        }
        
        // Add event listener for the reset treemap button
        const resetTreemapButton = panelContainer.querySelector('#reset-treemap-button');
        if (resetTreemapButton) {
            resetTreemapButton.addEventListener('click', function() {
                console.log('Resetting treemap to initial state');
                createCompressedTreemapChart();
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('country-dropdown');
            const toggle = document.querySelector('.country-dropdown-toggle');
            
            if (dropdown && dropdown.classList.contains('active') && 
                !dropdown.contains(e.target) && 
                (!toggle || !toggle.contains(e.target))) {
                dropdown.classList.remove('active');
                if (toggle) toggle.classList.remove('active');
            }
        });
        
        // Add event listener for escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && isVisible) {
                // If dropdown is open, close it first
                const dropdown = document.getElementById('country-dropdown');
                if (dropdown && dropdown.classList.contains('active')) {
                    dropdown.classList.remove('active');
                    const toggle = document.querySelector('.country-dropdown-toggle');
                    if (toggle) toggle.classList.remove('active');
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
                        <div class="country-option" data-iso="${country.iso}" data-name="${country.name}">
                            ${country.name} (${country.iso})
                        </div>
                    `;
                });
            });
            
            // Update the dropdown content
            dropdownContent.innerHTML = dropdownHtml;
            
            console.log('Country dropdown populated successfully');
        } catch (error) {
            console.error('Error loading country list:', error);
            dropdownContent.innerHTML = '<div class="dropdown-error">Error loading countries</div>';
        }
    }
    
    /**
     * Add CSS styles for the panel
     */
    function addPanelStyles() {
        // This function is now a no-op since we use the external CSS file (combinedSparksCharts.css)
        // All styles are defined in that file, which is loaded in testing_environment.html
        console.log('Using styles from combinedSparksCharts.css');
    }
    
    /**
     * Show the panel and load the charts
     */
    function showPanel() {
        if (!isInitialized) {
            initialize();
        }
        
        // Show the panel
        const panel = document.getElementById('multi-chart-panel-container');
        if (panel) {
            panel.style.display = 'flex';
            isVisible = true;
            
            // Create the charts (with a small delay to ensure HTML is fully loaded if it was just created)
            setTimeout(() => {
                createCharts();
                console.log('Charts loaded in panel');
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
                        createCharts();
                        console.log('Charts loaded in newly created panel');
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
     * Hide the panel
     */
    function hidePanel() {
        const panel = document.getElementById('multi-chart-panel-container');
        if (panel) {
            panel.style.display = 'none';
            isVisible = false;
        }
    }
    
    /**
     * Create all charts for the panel
     */
    function createCharts() {
        // Initialize SparksGraphing core components if needed
        if (window.sparksGraphingCore && window.sparksGraphingCore.initialize) {
            window.sparksGraphingCore.initialize();
        }
        
        // Create Bilateral Tariff Rates chart (Row 1, Left)
        createBilateralTariffChart();
        
        
        // Create Industry Tariffs Bar Chart (Row 1, Right)
        createIndustryTariffsBarChart();
        
        // Create Industry Tariffs Time Series chart (Row 2, Center)
        createIndustryTariffsTimeSeriesChart();
        
        //Create Bilateral Trade Relations chart (Row 3, Left)
        createBilateralTradeChart();
        
        // Create Compressed Treemap drilled to China (Row 3, Right)
        createCompressedTreemapChart();
        
    }
    
    /**
     * Create the Bilateral Tariff Rates chart
     */
    function createBilateralTariffChart() {
        if (window.countryBilatTariffRates && window.countryBilatTariffRates.createChart) {
            const tariffParams = {
                country: currentCountry.iso, 
                countryName: currentCountry.name,
                tariffMethod: 'weighted_winsorized',
                showUSTariffs: true,
                showCountryTariffs: true
            };
            
            // Show loading indicator
            document.getElementById('bilateral-tariff-container').innerHTML = '<div class="chart-loading">Loading bilateral tariff data...</div>';
            
            window.countryBilatTariffRates.createChart('bilateral-tariff-container', tariffParams)
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
                isShare: false // Use value instead of share
            };
            
            // Show loading indicator
            document.getElementById('bilateral-trade-container').innerHTML = '<div class="chart-loading">Loading bilateral trade data...</div>';
            
            window.countryBilatTradeRelats.createChart('bilateral-trade-container', tradeParams)
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
                tariffMethod: 'weighted_winsorized',
                year: '2021',  // Use most recent year available
                showUSTariffs: true,
                showCountryTariffs: true
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
     */
    function createIndustryTariffsTimeSeriesChart() {
        if (window.industryTariffsTimeSeries && window.industryTariffsTimeSeries.createChart) {
            // Show loading indicator
            document.getElementById('industry-tariffs-time-container').innerHTML = '<div class="chart-loading">Loading industry tariffs time series data...</div>';
            
            // First, make sure chart configuration is loaded
            const loadConfig = window.industryTariffsTimeSeries.loadChartConfig 
                ? window.industryTariffsTimeSeries.loadChartConfig() 
                : Promise.resolve();
            
            loadConfig
                .then(() => {
                    const params = {
                        country: currentCountry.iso,
                        countryName: currentCountry.name,
                        aggregation: 'section',
                        tariffMethod: 'weighted_winsorized',
                        // Select first few sectors for paired comparison
                        selectedSectors: ['Live Animals', 'Vegetable Products', 'Fats & Oils', 'Food, Bev. & Tobacco'], 
                        displayMode: 'pairs',
                        showUSTariffs: true,
                        showCountryTariffs: true
                    };
                    
                    // Create the chart
                    return window.industryTariffsTimeSeries.createChart('industry-tariffs-time-container', params);
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
    function createCompressedTreemapChart() {
        if (window.compressedCountryTreemap && window.compressedCountryTreemap.createChart) {
            // Show loading indicator
            document.getElementById('compressed-treemap-container').innerHTML = '<div class="chart-loading">Loading compressed treemap data...</div>';
            
            // Initial params for the treemap
            const params = {
                title: 'Imports in 2024 by Product Category',
                dataType: 'imports',  // Show imports data
                showLabels: true,
                animate: false,       // No animation needed since we'll drill down immediately
                year: '2024'          // Most recent year
            };
            
            // Create the treemap first, then manually drill down to China after it loads
            window.compressedCountryTreemap.createChart('compressed-treemap-container', params)
                .then(() => {
                    // After the treemap is created, try to find and click on the China node
                    // Use a more robust approach with multiple attempts
                    attemptDrillDown();
                })
                .catch(error => {
                    console.error('Error creating compressed treemap:', error);
                    document.getElementById('compressed-treemap-container').innerHTML = `
                        <div class="chart-error">
                            <p>Error: ${error.message}</p>
                        </div>
                    `;
                });
        } else {
            console.error('compressedCountryTreemap module not available');
            document.getElementById('compressed-treemap-container').innerHTML = `
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
    function attemptDrillDown() {
        console.log(`Attempting to drill down to ${currentCountry.name}...`);
        
        // We'll try different strategies and timings
        let attempts = 0;
        const maxAttempts = 5;
        const interval = 500; // Try every 500ms
        
        const findAndClick = () => {
            attempts++;
            console.log(`Drill-down attempt ${attempts}...`);
            
            // Try multiple selector strategies
            let countryNode = null;
            
            // Strategy 1: Try to find by data-id attribute
            countryNode = document.querySelector(`#compressed-treemap-container [data-id="${currentCountry.iso}"]`);
            
            // Strategy 2: Try to find rect with country name text nearby
            if (!countryNode) {
                const countryTexts = Array.from(document.querySelectorAll('#compressed-treemap-container text:not(.treemap-value):not(.treemap-title):not(.treemap-subtitle)'));
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
                const continentTexts = Array.from(document.querySelectorAll('#compressed-treemap-container text'));
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
                console.log('Found node to drill down:', countryNode);
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
                console.log('Failed to find and drill down to China after maximum attempts');
            }
        };
        
        // Start the attempts after a delay to ensure initial render is complete
        setTimeout(findAndClick, 1000);
    }
    
    /**
     * Toggle the country dropdown
     */
    function toggleCountryDropdown() {
        const dropdown = document.getElementById('country-dropdown');
        const toggle = document.querySelector('.country-dropdown-toggle');
        
        if (dropdown) {
            dropdown.classList.toggle('active');
            if (toggle) toggle.classList.toggle('active');
        }
    }
    
    /**
     * Update the current country and refresh all charts
     * @param {string} iso - Country ISO code
     * @param {string} name - Country name
     */
    function updateCountry(iso, name) {
        // Update the current country
        currentCountry.iso = iso;
        currentCountry.name = name;
        
        // Update the UI
        const countryNameElem = document.querySelector('.country-name');
        const countryIsoElem = document.querySelector('.country-iso');
        
        if (countryNameElem) countryNameElem.textContent = name;
        if (countryIsoElem) countryIsoElem.textContent = iso;
        
        // Close the dropdown
        const dropdown = document.getElementById('country-dropdown');
        const toggle = document.querySelector('.country-dropdown-toggle');
        
        if (dropdown) dropdown.classList.remove('active');
        if (toggle) toggle.classList.remove('active');
        
        // Refresh all charts with the new country
        createCharts();
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
    
    // Public API
    return {
        initialize,
        showPanel,
        hidePanel,
        togglePanel,
        updateCountry,
        getCurrentCountry: () => ({ ...currentCountry }) // Return a copy of the current country
    };
})();