/**
 * Global Trade Charts Module
 * 
 * Displays global level trade data using compressed treemap visualization.
 * This module initializes and manages the global trade visualization panel.
 */

window.globalTradeCharts = (function() {
    // Private variables
    let initialized = false;
    let currentTab = 'global-treemap';
    let panelVisible = false;
    let currentYear = '2024'; // Default year
    let currentCountryCount = '5'; // Default number of countries to display
    let currentTradeType = 'imports'; // Default trade type (imports or exports)
    
    // Available years for the dropdown
    const availableYears = [
        { value: '2020', label: '2020' },
        { value: '2021', label: '2021' },
        { value: '2022', label: '2022' },
        { value: '2023', label: '2023' },
        { value: '2024', label: '2024' }
    ];
    
    // Available trade types for the dropdown
    const availableTradeTypes = [
        { value: 'imports', label: 'imports' },
        { value: 'exports', label: 'exports' }
    ];
    
    // Fixed metric - using only values for now
    const currentMetricObj = { value: 'values', label: 'values', importKey: 'impVal', exportKey: 'expVal' };
    
    // Available country count options
    const availableCountryCounts = [
        { value: '3', label: '3' },
        { value: '5', label: '5' },
        { value: '7', label: '7' },
        { value: '10', label: '10' },
        { value: '15', label: '15' }
    ];
    
    /**
     * Initialize the SparksGraphing library components
     */
    function initializeSparksGraphing() {
        // 1. First initialize StyleManager if available
        if (window.sparksStyleManager && window.sparksStyleManager.initialize) {
            window.sparksStyleManager.initialize();
        }
        
        // 2. Then initialize the Core module
        if (window.sparksGraphingCore && window.sparksGraphingCore.initialize) {
            window.sparksGraphingCore.initialize();
        }
        
        // 3. Ensure chart configuration is loaded
        if (window.sparksChartConfigManager && window.sparksChartConfigManager.loadConfig) {
            window.sparksChartConfigManager.loadConfig().catch(err => {
                console.error('Error loading chart configuration:', err);
            });
        }
    }
    
    /**
     * Initialize the global trade charts panel
     */
    function initialize() {
        if (initialized) return;
        
        // Add click handler for the global trade panel button
        const globalTradeButton = document.getElementById('show-global-trade-panel');
        if (globalTradeButton) {
            globalTradeButton.addEventListener('click', function() {
                showPanel();
            });
        }
        
        initialized = true;
    }
    
    /**
     * Show the global trade panel
     */
    function showPanel() {
        // If already visible, don't reload
        if (panelVisible) return;
        
        // Ensure SparksGraphing is initialized
        initializeSparksGraphing();
        
        // Check if the panel container already exists
        let panelContainer = document.getElementById('global-trade-panel-container');
        
        if (!panelContainer) {
            // Create a new container for the panel
            panelContainer = document.createElement('div');
            panelContainer.id = 'global-trade-panel-container';
            panelContainer.className = 'multi-chart-panel-container';
            panelContainer.style.display = 'none'; // Hidden by default
            
            // Add it to the body
            document.body.appendChild(panelContainer);
        }
        
        // All styles are now in styles/combinedSparksCharts.css
        
        // Load the HTML content using DataPaths
        fetch(DataPaths.charts.globalTrade)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load global trade charts: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                // Insert the HTML into the panel container
                panelContainer.innerHTML = html;
                
                // Show the panel
                panelContainer.style.display = 'flex';
                panelVisible = true;
                
                // Setup event listeners for the panel
                setupEventListeners();
                
                // Load all content with a small delay to ensure HTML is fully loaded
                setTimeout(() => {
                    // Render treemaps
                    renderGlobalImportsTreemap();
                    renderGlobalExportsTreemap();
                    
                    // Add loading indicators for time series charts
                    const importsContainer = document.getElementById('country-timeseries-imports-container');
                    const exportsContainer = document.getElementById('country-timeseries-exports-container');
                    
                    if (importsContainer && exportsContainer) {
                        importsContainer.innerHTML = '<div class="chart-loading">Loading import time series data...</div>';
                        exportsContainer.innerHTML = '<div class="chart-loading">Loading export time series data...</div>';
                    }
                    
                    // Render time series charts with a slight additional delay
                    setTimeout(() => {
                        renderTimeSeriesCharts();
                        
                        // Initialize the trade direction text based on the current trade type
                        const tradeDirection = document.getElementById('trade-direction');
                        if (tradeDirection) {
                            tradeDirection.textContent = currentTradeType === 'imports' ? 'from' : 'to';
                        }
                    }, 300);
                }, 100);
            })
            .catch(error => {
                console.error('Error loading global trade charts:', error);
                panelContainer.innerHTML = `
                    <div class="multi-chart-panel-content">
                        <div class="multi-chart-panel-header">
                            <h2>Error Loading Panel</h2>
                            <button class="panel-close-button" id="global-panel-close-button">
                                <img src="assets/fontawesome/xmark.svg" alt="Close" class="close-icon">
                            </button>
                        </div>
                        <div class="multi-chart-panel-body">
                            <p>Failed to load panel content: ${error.message}</p>
                        </div>
                    </div>
                `;
                
                // Show the error panel
                panelContainer.style.display = 'flex';
                panelVisible = true;
                
                // Add close button event even in error state
                const closeButton = panelContainer.querySelector('#global-panel-close-button');
                if (closeButton) {
                    closeButton.addEventListener('click', hidePanel);
                }
            });
    }
    
    /**
     * Hide the global trade panel
     */
    function hidePanel() {
        const panelContainer = document.getElementById('global-trade-panel-container');
        if (panelContainer) {
            // Clean up any tooltips before removing the panel
            const globalTooltip = document.getElementById('treemap-tooltip-container');
            if (globalTooltip) {
                globalTooltip.style.visibility = 'hidden';
                // Optional: completely remove tooltip from DOM for complete cleanup
                if (globalTooltip.parentNode) {
                    globalTooltip.parentNode.removeChild(globalTooltip);
                }
            }
            
            // Properly remove the panel from the DOM rather than just hiding it
            document.body.removeChild(panelContainer);
            panelVisible = false;
            
            // Thorough cleanup to free memory
            if (window.compressedCountryTreemap && window.compressedCountryTreemap.clearCache) {
                window.compressedCountryTreemap.clearCache();
            }
            
            if (window.countryTimeSeriesChart && window.countryTimeSeriesChart.clearCache) {
                window.countryTimeSeriesChart.clearCache();
            }
            
            // Remove all stored event handlers
            tabClickHandlers.forEach(item => {
                const eventType = item.event || 'click';
                item.element.removeEventListener(eventType, item.handler);
            });
            
            dropdownClickHandlers.forEach(item => {
                const eventType = item.event || 'click';
                item.element.removeEventListener(eventType, item.handler);
            });
            
            // Clear handler arrays
            tabClickHandlers = [];
            dropdownClickHandlers = [];
            
            // Remove global document event handlers
            document.removeEventListener('click', closeDropdownsOnClickOutside);
            
            // Reset state to default to ensure clean reopening
            currentTab = 'global-treemap';
        }
    }
    
    // Event handler references for cleanup
    let closeDropdownsOnClickOutside;
    let tabClickHandlers = [];
    let dropdownClickHandlers = [];
    
    /**
     * Setup event listeners for the panel
     */
    function setupEventListeners() {
        // Clear any previously stored handlers
        tabClickHandlers = [];
        dropdownClickHandlers = [];
        
        // Close button event
        const closeButton = document.getElementById('global-panel-close-button');
        if (closeButton) {
            const closeHandler = function() {
                hidePanel();
            };
            closeButton.addEventListener('click', closeHandler);
            tabClickHandlers.push({ element: closeButton, handler: closeHandler });
        }
        
        // Reset treemap buttons
        const resetImportsButton = document.getElementById('reset-global-treemap-imports-button');
        if (resetImportsButton) {
            // Ensure correct styling
            resetImportsButton.className = 'reset-treemap-button';
            const icon = resetImportsButton.querySelector('img');
            if (icon) {
                icon.className = 'reset-icon';
                icon.setAttribute('src', DataPaths.assets.fontawesome.arrowRotateLeft);
            }
            
            const resetHandler = function() {
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
                
                // Reload the imports treemap
                renderGlobalImportsTreemap();
            };
            resetImportsButton.addEventListener('click', resetHandler);
            tabClickHandlers.push({ element: resetImportsButton, handler: resetHandler });
        }
        
        const resetExportsButton = document.getElementById('reset-global-treemap-exports-button');
        if (resetExportsButton) {
            // Ensure correct styling
            resetExportsButton.className = 'reset-treemap-button';
            const icon = resetExportsButton.querySelector('img');
            if (icon) {
                icon.className = 'reset-icon';
                icon.setAttribute('src', DataPaths.assets.fontawesome.arrowRotateLeft);
            }
            
            const resetHandler = function() {
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
                
                // Reload the exports treemap
                renderGlobalExportsTreemap();
            };
            resetExportsButton.addEventListener('click', resetHandler);
            tabClickHandlers.push({ element: resetExportsButton, handler: resetHandler });
        }
        
        // Setup dropdowns - metric dropdown removed as it's now fixed
        //setupYearDropdown();
        setupCountryCountDropdown();
        setupTradeTypeDropdown();
        
        // Listen for escape key to close panel
        const escapeHandler = function(event) {
            if (event.key === 'Escape' && panelVisible) {
                hidePanel();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        tabClickHandlers.push({ element: document, handler: escapeHandler, event: 'keydown' });
        
        // Close all dropdowns when clicking outside
        closeDropdownsOnClickOutside = function(e) {
            const dropdowns = [
                document.getElementById('year-dropdown'),
                document.getElementById('country-count-dropdown'),
                document.getElementById('trade-type-dropdown')
            ];
            
            const toggles = [
                document.querySelector('.year-dropdown-toggle'),
                document.querySelector('.country-count-dropdown-toggle'),
                document.querySelector('.trade-type-dropdown-toggle')
            ];
            
            const displays = [
                document.querySelector('.year-display'),
                document.querySelector('.country-count-display'),
                document.querySelector('.trade-type-display')
            ];
            
            const containers = [
                document.querySelector('.year-selector-container'),
                document.querySelector('.country-count-selector-container'),
                document.querySelector('.trade-type-selector-container')
            ];
            
            dropdowns.forEach((dropdown, index) => {
                if (dropdown && dropdown.classList.contains('active') && 
                    !dropdown.contains(e.target) && 
                    (toggles[index] && !toggles[index].contains(e.target)) &&
                    (displays[index] && !displays[index].contains(e.target)) &&
                    (containers[index] && !containers[index].contains(e.target))) {
                    
                    dropdown.classList.remove('active');
                    if (toggles[index]) toggles[index].classList.remove('active');
                    if (containers[index]) containers[index].classList.remove('active');
                }
            });
        };
        document.addEventListener('click', closeDropdownsOnClickOutside);
    }
    
    /**
     * Setup the year dropdown
     */
    /*    function setupYearDropdown() {
        const dropdownToggle = document.querySelector('.year-dropdown-toggle');
        const dropdown = document.getElementById('year-dropdown');
        const yearDisplay = document.querySelector('.year-display');
        
        if (!dropdownToggle || !dropdown || !yearDisplay) {
            console.error('Year dropdown elements not found');
            return;
        }
        
        // Set initial year display
        yearDisplay.textContent = currentYear;
        
        // Setup toggle click handler
        dropdownToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleDropdown(dropdown, dropdownToggle, yearDisplay);
            populateYearDropdown(dropdown);
        });
        
        // Also trigger on year display click for better UX
        yearDisplay.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleDropdown(dropdown, dropdownToggle, yearDisplay);
            populateYearDropdown(dropdown);
        });
        
        // Handle option selection
        dropdown.addEventListener('click', function(e) {
            const option = e.target.closest('.year-option');
            if (option) {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                
                if (value) {
                    // Update selected year
                    currentYear = value;
                    yearDisplay.textContent = value;
                    
                    // Hide dropdown
                    dropdown.classList.remove('active');
                    dropdownToggle.classList.remove('active');
                    
                    // Update all visualizations with the new year
                    updateAllVisualizations();
                }
            }
        });
    }
    */
    // Metric dropdown functionality removed - using fixed values
    
    /**
     * Setup the country count dropdown for time series
     */
    function setupCountryCountDropdown() {
        const dropdownToggle = document.querySelector('.country-count-dropdown-toggle');
        const dropdown = document.getElementById('country-count-dropdown');
        const countDisplay = document.querySelector('.country-count-display');
        
        if (!dropdownToggle || !dropdown || !countDisplay) {
            // May not be available yet if tab not loaded
            return;
        }
        
        // Set initial count display
        countDisplay.textContent = currentCountryCount;
        
        // Setup toggle click handler
        dropdownToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleDropdown(dropdown, dropdownToggle, countDisplay);
            populateCountryCountDropdown(dropdown);
        });
        
        // Also trigger on count display click for better UX
        countDisplay.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleDropdown(dropdown, dropdownToggle, countDisplay);
            populateCountryCountDropdown(dropdown);
        });
        
        // Handle option selection
        dropdown.addEventListener('click', function(e) {
            const option = e.target.closest('.country-count-option');
            if (option) {
                e.stopPropagation();
                const value = option.getAttribute('data-value');
                
                if (value) {
                    // Update selected count
                    currentCountryCount = value;
                    countDisplay.textContent = value;
                    
                    // Hide dropdown
                    dropdown.classList.remove('active');
                    dropdownToggle.classList.remove('active');
                    
                    // Update all visualizations
                    // First save the current scroll position
                    const scrollPosition = window.pageYOffset;
                    
                    // Define a function to restore scroll position
                    function forceScrollPosition() {
                        window.scrollTo(0, scrollPosition);
                    }
                    
                    // Update the visualizations
                    updateAllVisualizations();
                    
                    // Use requestAnimationFrame for better timing and multiple restoration attempts
                    requestAnimationFrame(() => {
                        forceScrollPosition();
                        // Additional checks with setTimeout at various intervals
                        setTimeout(forceScrollPosition, 50);
                        setTimeout(forceScrollPosition, 150);
                        setTimeout(forceScrollPosition, 300);
                    });
                }
            }
        });
    }
    
    /**
     * Toggle dropdown visibility
     * @param {HTMLElement} dropdown - The dropdown element
     * @param {HTMLElement} toggle - The toggle element
     * @param {HTMLElement} display - The display element
     */
    function toggleDropdown(dropdown, toggle, display) {
        if (dropdown && toggle) {
            // Find the container element that wraps both display and toggle
            const container = display.closest('.year-selector-container') || 
                             display.closest('.country-count-selector-container');
            
            if (container) {
                // Position relative to the container for better alignment
                const containerRect = container.getBoundingClientRect();
                
                // Use fixed positioning with transform for more reliable positioning
                dropdown.style.position = 'fixed';
                dropdown.style.left = (containerRect.left + (containerRect.width/2)) + 'px';
                dropdown.style.top = (containerRect.bottom + 5) + 'px';
                dropdown.style.transform = 'translateX(-50%)'; // Center it
                dropdown.style.zIndex = '1000';
                
                // Toggle active classes for all relevant elements
                dropdown.classList.toggle('active');
                toggle.classList.toggle('active');
                container.classList.toggle('active');
            } else {
                // Fallback to display-based positioning if container not found
                const displayRect = display.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.left = (displayRect.left + displayRect.width/2) + 'px';
                dropdown.style.top = (displayRect.bottom + 5) + 'px';
                dropdown.style.transform = 'translateX(-50%)'; // Center it
                dropdown.style.zIndex = '1000';
                dropdown.classList.toggle('active');
                toggle.classList.toggle('active');
            }
        }
    }
    
    /**
     * Toggle trade type dropdown visibility
     * @param {boolean} forceState - Optional state to force (true to show, false to hide)
     */
    function toggleTradeTypeDropdown(forceState) {
        const tradeTypeDropdown = document.getElementById('trade-type-dropdown');
        const tradeTypeToggle = document.querySelector('.trade-type-dropdown-toggle');
        const tradeTypeContainer = document.querySelector('.trade-type-selector-container');
        
        if (tradeTypeDropdown && tradeTypeToggle && tradeTypeContainer) {
            // Get container's position information for more accurate positioning
            const containerRect = tradeTypeContainer.getBoundingClientRect();
            
            // Calculate scroll offsets
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Position dropdown under the container, centered
            tradeTypeDropdown.style.position = 'fixed';
            tradeTypeDropdown.style.left = (containerRect.left + (containerRect.width/2)) + 'px';
            tradeTypeDropdown.style.top = (containerRect.bottom + 5) + 'px';
            tradeTypeDropdown.style.transform = 'translateX(-50%)'; // Center it
            tradeTypeDropdown.style.zIndex = '1000';
            
            // Toggle active class or set to forced state
            let isExpanded;
            if (forceState !== undefined) {
                isExpanded = forceState;
                if (forceState) {
                    tradeTypeDropdown.classList.add('active');
                    tradeTypeToggle.classList.add('active');
                    tradeTypeContainer.classList.add('active');
                    
                    // Also populate the dropdown when showing
                    populateTradeTypeDropdown(tradeTypeDropdown);
                } else {
                    tradeTypeDropdown.classList.remove('active');
                    tradeTypeToggle.classList.remove('active');
                    tradeTypeContainer.classList.remove('active');
                }
            } else {
                // Toggle the dropdown visibility
                isExpanded = tradeTypeDropdown.classList.toggle('active');
                tradeTypeToggle.classList.toggle('active');
                tradeTypeContainer.classList.toggle('active');
                
                // Populate the dropdown when showing
                if (isExpanded) {
                    populateTradeTypeDropdown(tradeTypeDropdown);
                }
            }
            
            // Update ARIA attributes
            tradeTypeToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            
            // If opening the dropdown, focus the first option after a short delay
            if (isExpanded) {
                setTimeout(() => {
                    const firstOption = tradeTypeDropdown.querySelector('.trade-type-option');
                    if (firstOption) {
                        firstOption.focus();
                    }
                }, 50);
            }
        }
    }
    
    /**
     * Populate dropdown with year options
     * @param {HTMLElement} dropdown - The dropdown element
     */
    /*
    function populateYearDropdown(dropdown) {
        const dropdownContent = dropdown.querySelector('#year-dropdown-content');
        if (!dropdownContent) return;
        
        // Clear existing content
        dropdownContent.innerHTML = '';
        
        // Add year options
        availableYears.forEach(year => {
            const isActive = year.value === currentYear ? ' active' : '';
            const activeStyle = isActive ? 'background-color: var(--blue1, #3581b4); color: white;' : '';
            
            const option = document.createElement('div');
            option.className = `year-option${isActive}`;
            option.setAttribute('data-value', year.value);
            option.style = activeStyle;
            option.textContent = year.label;
            
            dropdownContent.appendChild(option);
        });
    }
    */
    // Metric dropdown population removed - using fixed values
    
    /**
     * Populate dropdown with country count options
     * @param {HTMLElement} dropdown - The dropdown element
     */
    function populateCountryCountDropdown(dropdown) {
        const dropdownContent = dropdown.querySelector('#country-count-dropdown-content');
        if (!dropdownContent) return;
        
        // Clear existing content
        dropdownContent.innerHTML = '';
        
        // Add count options
        availableCountryCounts.forEach(count => {
            const isActive = count.value === currentCountryCount ? ' active' : '';
            const activeStyle = isActive ? 'background-color: var(--blue1, #3581b4); color: white;' : '';
            
            const option = document.createElement('div');
            option.className = `country-count-option${isActive}`;
            option.setAttribute('data-value', count.value);
            option.style = activeStyle;
            option.textContent = count.label;
            
            dropdownContent.appendChild(option);
        });
    }
    
    /**
     * Setup the trade type dropdown (imports/exports)
     */
    function setupTradeTypeDropdown() {
        // Clean up any existing listeners to prevent duplicates
        const dropdownToggle = document.querySelector('.trade-type-dropdown-toggle');
        const dropdown = document.getElementById('trade-type-dropdown');
        const tradeTypeDisplay = document.querySelector('.trade-type-display');
        const tradeTypeContainer = document.querySelector('.trade-type-selector-container');
        
        if (!dropdownToggle || !dropdown || !tradeTypeDisplay || !tradeTypeContainer) {
            console.error('Trade type dropdown elements not found');
            return;
        }
        
        // Set initial trade type display
        tradeTypeDisplay.textContent = currentTradeType;
        
        // Add accessibility attributes
        dropdownToggle.setAttribute('tabindex', '0');
        dropdownToggle.setAttribute('role', 'button');
        dropdownToggle.setAttribute('aria-haspopup', 'true');
        dropdownToggle.setAttribute('aria-expanded', 'false');
        dropdownToggle.setAttribute('aria-label', 'Select trade type');
        
        // Make the entire container clickable
        tradeTypeContainer.style.cursor = 'pointer';
        
        // Make the display text clickable
        tradeTypeDisplay.style.cursor = 'pointer';
        
        // Add click handler to the entire container
        tradeTypeContainer.addEventListener('click', function(e) {
            // Only toggle if we're not clicking on the dropdown itself
            if (!e.target.closest('.trade-type-dropdown')) {
                e.stopPropagation();
                toggleTradeTypeDropdown();
            }
        });
        
        // Add keyboard listener
        tradeTypeContainer.addEventListener('keydown', function(e) {
            // Toggle on Enter or Space
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTradeTypeDropdown();
            }
        });
        
        // Initialize active option
        if (tradeTypeDisplay && dropdown) {
            const currentText = tradeTypeDisplay.textContent.trim();
            // Find the matching option and mark it as active
            populateTradeTypeDropdown(dropdown);
            const options = dropdown.querySelectorAll('.trade-type-option');
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
        
        // Setup dropdown options
        if (dropdown) {
            // Add role for accessibility
            dropdown.setAttribute('role', 'listbox');
            
            // Handle option selection
            dropdown.addEventListener('click', function(e) {
                const option = e.target.closest('.trade-type-option');
                if (option) {
                    e.stopPropagation();
                    const value = option.getAttribute('data-value');
                    const displayText = option.textContent.trim();
                    
                    if (value && value !== currentTradeType) {
                        // Update selected trade type
                        currentTradeType = value;
                        tradeTypeDisplay.textContent = displayText;
                        
                        // Update chart title
                        const chartTitle = document.getElementById('trade-chart-title');
                        if (chartTitle) {
                            chartTitle.textContent = value === 'imports' ? 'Import Trends' : 'Export Trends';
                        }
                        
                        // Update the trade direction text (from/to)
                        const tradeDirection = document.getElementById('trade-direction');
                        if (tradeDirection) {
                            tradeDirection.textContent = value === 'imports' ? 'from' : 'to';
                        }
                        
                        // Update active state on options
                        const allOptions = dropdown.querySelectorAll('.trade-type-option');
                        allOptions.forEach(opt => {
                            opt.classList.remove('active');
                            opt.setAttribute('aria-selected', 'false');
                        });
                        option.classList.add('active');
                        option.setAttribute('aria-selected', 'true');
                        
                        // Close the dropdown
                        toggleTradeTypeDropdown(false);
                        
                        // Update time series chart
                        // First save the current scroll position
                        const scrollPosition = window.pageYOffset;
                        
                        // Define a function to restore scroll position
                        function forceScrollPosition() {
                            window.scrollTo(0, scrollPosition);
                        }
                        
                        // Update the chart
                        renderTimeSeriesCharts();
                        
                        // Use requestAnimationFrame for better timing and multiple restoration attempts
                        requestAnimationFrame(() => {
                            forceScrollPosition();
                            // Additional checks with setTimeout at various intervals
                            setTimeout(forceScrollPosition, 50);
                            setTimeout(forceScrollPosition, 150);
                            setTimeout(forceScrollPosition, 300);
                        });
                    }
                }
            });
            
            // Keyboard navigation for dropdown
            dropdown.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Close dropdown on Escape
                    toggleTradeTypeDropdown(false);
                    if (tradeTypeContainer) {
                        tradeTypeContainer.focus(); // Return focus to container
                    }
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    // Navigate options with arrow keys
                    e.preventDefault();
                    
                    const options = Array.from(dropdown.querySelectorAll('.trade-type-option'));
                    if (options.length === 0) return;
                    
                    // Find currently focused option
                    const focusedOption = document.activeElement.closest('.trade-type-option');
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
                    const option = e.target.closest('.trade-type-option');
                    if (option) {
                        const value = option.getAttribute('data-value');
                        const displayText = option.textContent.trim();
                        
                        // Update selected trade type
                        currentTradeType = value;
                        tradeTypeDisplay.textContent = displayText;
                        
                        // Update chart title
                        const chartTitle = document.getElementById('trade-chart-title');
                        if (chartTitle) {
                            chartTitle.textContent = value === 'imports' ? 'Import Trends' : 'Export Trends';
                        }
                        
                        // Update the trade direction text (from/to)
                        const tradeDirection = document.getElementById('trade-direction');
                        if (tradeDirection) {
                            tradeDirection.textContent = value === 'imports' ? 'from' : 'to';
                        }
                        
                        // Update active state on options
                        const allOptions = dropdown.querySelectorAll('.trade-type-option');
                        allOptions.forEach(opt => {
                            opt.classList.remove('active');
                            opt.setAttribute('aria-selected', 'false');
                        });
                        option.classList.add('active');
                        option.setAttribute('aria-selected', 'true');
                        
                        // Close the dropdown
                        toggleTradeTypeDropdown(false);
                        
                        // Update time series chart
                        // First save the current scroll position
                        const scrollPosition = window.pageYOffset;
                        
                        // Define a function to restore scroll position
                        function forceScrollPosition() {
                            window.scrollTo(0, scrollPosition);
                        }
                        
                        // Update the chart
                        renderTimeSeriesCharts();
                        
                        // Use requestAnimationFrame for better timing and multiple restoration attempts
                        requestAnimationFrame(() => {
                            forceScrollPosition();
                            // Additional checks with setTimeout at various intervals
                            setTimeout(forceScrollPosition, 50);
                            setTimeout(forceScrollPosition, 150);
                            setTimeout(forceScrollPosition, 300);
                        });
                    }
                }
            });
        }
    }
    
    /**
     * Populate dropdown with trade type options (imports/exports)
     * @param {HTMLElement} dropdown - The dropdown element
     */
    function populateTradeTypeDropdown(dropdown) {
        const dropdownContent = dropdown.querySelector('#trade-type-dropdown-content');
        if (!dropdownContent) return;
        
        // Clear existing content
        dropdownContent.innerHTML = '';
        
        // Add trade type options
        availableTradeTypes.forEach(type => {
            const isActive = type.value === currentTradeType ? ' active' : '';
            const activeStyle = isActive ? 'background-color: var(--blue1, #3581b4); color: white;' : '';
            
            const option = document.createElement('div');
            option.className = `trade-type-option${isActive}`;
            option.setAttribute('data-value', type.value);
            option.setAttribute('role', 'option');
            option.setAttribute('tabindex', '0');
            option.setAttribute('aria-selected', isActive ? 'true' : 'false');
            option.style = activeStyle;
            option.textContent = type.label;
            
            dropdownContent.appendChild(option);
        });
    }
    
    /**
     * Update all visualizations with current settings
     * This function is called when year, metric type, or country count changes
     */
    function updateAllVisualizations() {
        // Update treemaps when year changes
        renderGlobalImportsTreemap();
        renderGlobalExportsTreemap();
        
        // Update time series charts with current settings
        renderTimeSeriesCharts();
    }
    
    /**
     * Render the global imports treemap visualization
     */
    function renderGlobalImportsTreemap() {
        // Get the container
        const container = document.getElementById('global-treemap-imports-container');
        if (!container) {
            console.error('Global imports treemap container not found');
            return;
        }
        
        // Show loading message
        container.innerHTML = `<div class="chart-loading">Loading global imports data for ${currentYear}...</div>`;
        
        // Set explicit dimensions to ensure layout is calculated properly
        container.style.width = '100%';
        container.style.minHeight = '500px';
        container.style.height = 'auto';
        
        // Check if the compressedCountryTreemap module is available
        if (!window.compressedCountryTreemap) {
            console.error('Compressed country treemap module not available');
            container.innerHTML = '<div class="chart-error">Error: Compressed treemap module not available</div>';
            return;
        }
        
        // Use setTimeout to ensure DOM is fully rendered and dimensions are calculated
        setTimeout(() => {
            // Render the treemap
            window.compressedCountryTreemap.createChart('global-treemap-imports-container', {
                dataType: 'imports',
                showLabels: true,
                animate: false,
                year: currentYear,
                title: `Global Imports by Country and Section (${currentYear})`,
                subtitle: 'Click on a region to explore details',
                height: 500  // Explicit height to ensure proper rendering
            });
        }, 100);
    }
    
    /**
     * Render the global exports treemap visualization
     */
    function renderGlobalExportsTreemap() {
        // Get the container
        const container = document.getElementById('global-treemap-exports-container');
        if (!container) {
            console.error('Global exports treemap container not found');
            return;
        }
        
        // Show loading message
        container.innerHTML = `<div class="chart-loading">Loading global exports data for ${currentYear}...</div>`;
        
        // Set explicit dimensions to ensure layout is calculated properly
        container.style.width = '100%';
        container.style.minHeight = '500px';
        container.style.height = 'auto';
        
        // Check if the compressedCountryTreemap module is available
        if (!window.compressedCountryTreemap) {
            console.error('Compressed country treemap module not available');
            container.innerHTML = '<div class="chart-error">Error: Compressed treemap module not available</div>';
            return;
        }
        
        // Use setTimeout to ensure DOM is fully rendered and dimensions are calculated
        setTimeout(() => {
            // Render the treemap
            window.compressedCountryTreemap.createChart('global-treemap-exports-container', {
                dataType: 'exports',  // Use exports data
                showLabels: true,
                animate: false,
                year: currentYear,
                title: `Global Exports by Country and Section (${currentYear})`,
                subtitle: 'Click on a region to explore details',
                height: 500  // Explicit height to ensure proper rendering
            });
        }, 100);
    }
    
    /**
     * Render time series chart based on selected trade type
     * Creates either import or export time series chart with current settings
     */
    function renderTimeSeriesCharts() {
        if (!window.countryTimeSeriesChart) {
            console.error('Country time series module not available');
            return;
        }
        
        // Get the correct metric based on trade type
        const metric = currentTradeType === 'imports' ? currentMetricObj.importKey : currentMetricObj.exportKey;
        const countryCount = parseInt(currentCountryCount);
        
        // Configure chart options
        const chartOptions = {
            skipDots: true,  // Skip dots on line chart
            animate: true
        };
        
        // Render the selected chart type
        const chartContainer = document.getElementById('country-timeseries-container');
        if (chartContainer) {
            chartContainer.innerHTML = `<div class="chart-loading">Loading ${currentTradeType} time series data...</div>`;
            
            // Set dimensions
            chartContainer.style.width = '100%';
            chartContainer.style.minHeight = '400px';
            
            setTimeout(() => {
                window.countryTimeSeriesChart.createChart(
                    'country-timeseries-container', 
                    metric, 
                    countryCount,
                    chartOptions
                );
            }, 100);
        }
    }
    
    // Return public API
    return {
        initialize: initialize,
        showPanel: showPanel,
        hidePanel: hidePanel
    };
})();

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.globalTradeCharts.initialize();
});