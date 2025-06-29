/**
 * Mobile-specific JavaScript functionality
 */

(function() {
    'use strict';

    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeMobileUI();
    });

    /**
     * Wait for receipt to load and add hamburger menu
     */
    function waitForReceiptAndAddHamburger() {
        // Check if receipt header exists
        const checkInterval = setInterval(function() {
            const receiptHeader = document.getElementById('receipt-header');
            if (receiptHeader) {
                clearInterval(checkInterval);
                addHamburgerToReceipt();
            }
        }, 100);
        
        // Stop checking after 5 seconds
        setTimeout(function() {
            clearInterval(checkInterval);
        }, 5000);
    }

    /**
     * Add hamburger menu button to receipt header
     */
    function addHamburgerToReceipt() {
        const receiptHeader = document.getElementById('receipt-header');
        if (!receiptHeader) return;
        
        // Create hamburger button
        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.id = 'mobile-menu-toggle';
        hamburgerBtn.className = 'hamburger-btn';
        hamburgerBtn.setAttribute('aria-label', 'Menu');
        
        const menuIcon = document.createElement('img');
        menuIcon.src = 'assets/fontawesome/bars-solid.svg';
        menuIcon.alt = 'Menu';
        menuIcon.className = 'menu-icon';
        
        hamburgerBtn.appendChild(menuIcon);
        
        // Add to receipt header
        receiptHeader.appendChild(hamburgerBtn);
        
        // Add click event
        hamburgerBtn.addEventListener('click', function() {
            const mobileMenu = document.getElementById('mobile-menu');
            const overlay = document.querySelector('.mobile-menu-overlay');
            const body = document.body;
            
            const isOpen = mobileMenu.classList.contains('active');
            
            if (isOpen) {
                mobileMenu.classList.remove('active');
                overlay.classList.remove('active');
                body.classList.remove('menu-open');
                
                setTimeout(() => {
                    if (!mobileMenu.classList.contains('active')) {
                        mobileMenu.style.display = 'none';
                    }
                }, 300);
            } else {
                mobileMenu.classList.add('active');
                overlay.classList.add('active');
                body.classList.add('menu-open');
                mobileMenu.style.display = 'flex';
            }
        });
    }

    /**
     * Initialize mobile UI components and event handlers
     */
    function initializeMobileUI() {
        // Wait for receipt to load, then add hamburger menu
        waitForReceiptAndAddHamburger();
        
        // Get DOM elements
        const mobileMenu = document.getElementById('mobile-menu');
        const body = document.body;
        
        // Create overlay element
        const overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        document.body.appendChild(overlay);
        
        // Toggle menu function
        function toggleMenu() {
            const isOpen = mobileMenu.classList.contains('active');
            
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        }
        
        function openMenu() {
            mobileMenu.classList.add('active');
            overlay.classList.add('active');
            body.classList.add('menu-open');
            mobileMenu.style.display = 'flex';
        }
        
        function closeMenu() {
            mobileMenu.classList.remove('active');
            overlay.classList.remove('active');
            body.classList.remove('menu-open');
            
            // Hide menu after transition
            setTimeout(() => {
                if (!mobileMenu.classList.contains('active')) {
                    mobileMenu.style.display = 'none';
                }
            }, 300);
        }
        
        // Close menu when clicking overlay
        overlay.addEventListener('click', closeMenu);
        
        // Close menu when clicking the X button
        const closeButton = document.querySelector('.mobile-menu-close');
        if (closeButton) {
            closeButton.addEventListener('click', closeMenu);
        }
        
        // Close menu when clicking outside the menu content
        mobileMenu.addEventListener('click', function(e) {
            if (e.target === mobileMenu) {
                closeMenu();
            }
        });
        
        // Menu item handlers
        setupMenuItemHandlers(closeMenu);
        
        // Handle orientation changes
        window.addEventListener('orientationchange', function() {
            closeMenu();
            // Force a repaint to fix any layout issues
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        });
        
        // Prevent pull-to-refresh on iOS
        let startY = 0;
        document.addEventListener('touchstart', function(e) {
            startY = e.touches[0].pageY;
        }, { passive: true });
        
        document.addEventListener('touchmove', function(e) {
            const scrollY = window.scrollY;
            const moveY = e.touches[0].pageY;
            
            // Prevent overscroll when at the top
            if (scrollY === 0 && moveY > startY) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Fix iOS viewport height issues
        function setViewportHeight() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
        
        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        
        // Initialize receipt functionality
        initializeMobileReceipt();
        
        // Ensure receipt is always sorted by value on mobile
        ensureValueSorting();
        
        // Hide static chevrons and chart icons in receipt totals section
        hideMobileReceiptElements();
        
        // Initialize input select-all functionality
        initializeInputSelectAll();
    }

    /**
     * Setup handlers for menu items
     */
    function setupMenuItemHandlers(closeMenu) {
        // Map View button
        const mapBtn = document.getElementById('mobile-map-btn');
        if (mapBtn) {
            mapBtn.addEventListener('click', function() {
                closeMenu();
                showMobileMapView();
            });
        }
        
        // Charts button
        const chartsBtn = document.getElementById('mobile-charts-btn');
        if (chartsBtn) {
            chartsBtn.addEventListener('click', function() {
                closeMenu();
                // Trigger the same functionality as desktop
                const chartPanel = document.getElementById('show-multi-chart-panel');
                if (chartPanel) {
                    chartPanel.click();
                }
            });
        }
        
        // Global Trade button
        const tradeBtn = document.getElementById('mobile-trade-btn');
        if (tradeBtn) {
            tradeBtn.addEventListener('click', function() {
                closeMenu();
                // Trigger the same functionality as desktop
                const tradePanel = document.getElementById('show-global-trade-panel');
                if (tradePanel) {
                    tradePanel.click();
                }
            });
        }
        
        // Help button
        const helpBtn = document.getElementById('mobile-help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', function() {
                closeMenu();
                // Trigger the same functionality as desktop
                const helpPanel = document.getElementById('show-help-panel');
                if (helpPanel) {
                    helpPanel.click();
                }
            });
        }
        
        // Settings button
        const settingsBtn = document.getElementById('mobile-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', function() {
                closeMenu();
                // Trigger dev tools if available
                const settingsIcon = document.querySelector('.settings-icon');
                if (settingsIcon) {
                    settingsIcon.click();
                }
            });
        }
    }

    /**
     * Initialize mobile-specific receipt functionality
     */
    function initializeMobileReceipt() {
        // Ensure receipt content scrolls smoothly
        const receiptContent = document.getElementById('receipt-content');
        if (receiptContent) {
            // Add momentum scrolling for iOS
            receiptContent.style.webkitOverflowScrolling = 'touch';
            
            // Handle scroll position when keyboard appears
            const inputs = receiptContent.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('focus', function() {
                    setTimeout(() => {
                        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                });
            });
        }
        
        // Make sure touch events work properly on receipt items
        document.addEventListener('click', function(e) {
            // Handle toggle icons
            if (e.target.closest('.toggle-icon')) {
                e.preventDefault();
                const toggle = e.target.closest('.toggle-icon');
                const targetId = toggle.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const isHidden = targetElement.style.display === 'none';
                    targetElement.style.display = isHidden ? 'block' : 'none';
                    
                    // Update toggle icons
                    const plusIcon = toggle.querySelector('.toggle-plus');
                    const minusIcon = toggle.querySelector('.toggle-minus');
                    if (plusIcon && minusIcon) {
                        plusIcon.style.display = isHidden ? 'none' : 'block';
                        minusIcon.style.display = isHidden ? 'block' : 'none';
                    }
                }
            }
        });
        
        // Initialize swipe-to-delete functionality
        initializeSwipeToDelete();
    }
    
    /**
     * Initialize swipe-to-delete functionality for receipt items
     */
    function initializeSwipeToDelete() {
        // Use MutationObserver to handle dynamically added receipt items
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('receipt-item')) {
                        // Only add swipe to country items, not subtotal/total rows
                        if (!node.id || (!node.id.includes('subtotal') && !node.id.includes('global') && !node.id.includes('total-effect'))) {
                            addSwipeToDelete(node);
                        }
                    }
                });
            });
        });
        
        // Start observing the receipt items container
        const receiptItems = document.getElementById('receipt-items');
        if (receiptItems) {
            observer.observe(receiptItems, { childList: true });
            
            // Add swipe to existing items
            const existingItems = receiptItems.querySelectorAll('.receipt-item');
            existingItems.forEach(item => {
                if (!item.id || (!item.id.includes('subtotal') && !item.id.includes('global') && !item.id.includes('total-effect'))) {
                    addSwipeToDelete(item);
                }
            });
        }
    }
    
    /**
     * Add swipe-to-delete functionality to a receipt item
     */
    function addSwipeToDelete(item) {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        let startTime = 0;
        
        // Get the ISO code from the item ID
        const match = item.id ? item.id.match(/receipt-item-(.+)/) : null;
        const iso = match ? match[1] : null;
        
        if (!iso) return; // Skip if no ISO code found
        
        // Touch event handlers
        item.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            currentX = startX;
            isDragging = true;
            startTime = Date.now();
            item.style.transition = 'none';
        }, { passive: true });
        
        item.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            
            // Only allow left swipe (negative deltaX)
            if (deltaX < 0) {
                const progress = Math.min(Math.abs(deltaX) / item.offsetWidth, 1);
                
                // Apply transform
                item.style.transform = `translateX(${deltaX}px)`;
                
                // Get the country name span
                const countrySpan = item.querySelector('.clickable[data-iso]');
                if (countrySpan) {
                    // Interpolate color from text color to danger color
                    if (progress > 0.3) {
                        const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger') || '#dc3545';
                        countrySpan.style.color = dangerColor;
                        countrySpan.style.opacity = 1 - (progress * 0.5); // Fade out as it swipes
                    }
                }
            }
        }, { passive: true });
        
        item.addEventListener('touchend', function(e) {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaX = currentX - startX;
            const progress = Math.abs(deltaX) / item.offsetWidth;
            const velocity = Math.abs(deltaX) / (Date.now() - startTime);
            
            // If swiped more than 50% or with high velocity, delete it
            if (deltaX < 0 && (progress > 0.5 || velocity > 0.5)) {
                // Animate off screen
                item.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
                item.style.transform = `translateX(-${item.offsetWidth}px)`;
                item.style.opacity = '0';
                
                // Remove the country after animation
                setTimeout(() => {
                    if (window.removeCountry && typeof window.removeCountry === 'function') {
                        window.removeCountry(iso);
                    }
                }, 300);
            } else {
                // Snap back to original position
                item.style.transition = 'transform 0.3s ease-out';
                item.style.transform = 'translateX(0)';
                
                // Reset country name color
                const countrySpan = item.querySelector('.clickable[data-iso]');
                if (countrySpan) {
                    countrySpan.style.color = '';
                    countrySpan.style.opacity = '';
                }
            }
        });
        
        // Handle touch cancel
        item.addEventListener('touchcancel', function(e) {
            isDragging = false;
            item.style.transition = 'transform 0.3s ease-out';
            item.style.transform = 'translateX(0)';
            
            // Reset country name color
            const countrySpan = item.querySelector('.clickable[data-iso]');
            if (countrySpan) {
                countrySpan.style.color = '';
                countrySpan.style.opacity = '';
            }
        });
    }

    /**
     * Ensure receipt items are always sorted by value on mobile
     */
    function ensureValueSorting() {
        // Override the CustomReceiptOrder if it exists
        if (window.CustomReceiptOrder) {
            // Force sort order to value
            if (window.CustomReceiptOrder.setSortOrder) {
                window.CustomReceiptOrder.setSortOrder('value');
            }
            
            // Disable the ability to change sort order
            window.CustomReceiptOrder.initialize = function() {
                // Do nothing - prevent dropdown creation
            };
        }
        
        // Also set a flag that other scripts can check
        window.isMobileVersion = true;
        window.forceSortByValue = true;
    }
    
    /**
     * Hide unnecessary elements in the receipt totals section for mobile
     */
    function hideMobileReceiptElements() {
        // Wait for receipt to be loaded
        const checkInterval = setInterval(function() {
            const receiptTotals = document.getElementById('receipt_totals');
            if (receiptTotals) {
                clearInterval(checkInterval);
                
                // Hide chevrons in subtotal row
                const subtotalChevron = receiptTotals.querySelector('#subtotal-row .toggle-icon');
                if (subtotalChevron) {
                    subtotalChevron.style.display = 'none';
                }
                
                // Hide chevrons in rest of world row
                const globalChevron = receiptTotals.querySelector('#global-toggle-icon');
                if (globalChevron) {
                    globalChevron.style.display = 'none';
                }
                
                // Hide chevron and chart icon in potential price effect row
                const totalEffectRow = receiptTotals.querySelector('#total-effect-row');
                if (totalEffectRow) {
                    const chevron = totalEffectRow.querySelector('.toggle-icon');
                    if (chevron) {
                        chevron.style.display = 'none';
                    }
                    
                    const chartIcon = totalEffectRow.querySelector('.effects-summary-btn');
                    if (chartIcon) {
                        chartIcon.style.display = 'none';
                    }
                }
                
                // Also hide the effects detail sections since they won't be toggleable
                const subtotalDetail = document.getElementById('subtotal-effects-detail');
                if (subtotalDetail) {
                    subtotalDetail.style.display = 'none';
                }
                
                const globalDetail = document.getElementById('global-effects-detail');
                if (globalDetail) {
                    globalDetail.style.display = 'none';
                }
                
                const totalDetail = document.getElementById('total-effects-detail');
                if (totalDetail) {
                    totalDetail.style.display = 'none';
                }
            }
        }, 100);
        
        // Stop checking after 5 seconds
        setTimeout(function() {
            clearInterval(checkInterval);
        }, 5000);
    }

    /**
     * Initialize select-all functionality for input fields
     */
    function initializeInputSelectAll() {
        // Add event delegation for dynamically created inputs
        document.addEventListener('focus', function(e) {
            if (e.target.matches('input[type="number"], input[type="text"]')) {
                // Select all text in the input
                e.target.select();
                
                // For mobile devices, sometimes we need to use setSelectionRange
                try {
                    e.target.setSelectionRange(0, e.target.value.length);
                } catch (err) {
                    // Some input types don't support setSelectionRange
                }
            }
        }, true); // Use capture phase to ensure we catch the event
        
        // Also handle click events on inputs (some mobile browsers need this)
        document.addEventListener('click', function(e) {
            if (e.target.matches('input[type="number"], input[type="text"]')) {
                // Only select all if the input was just focused
                if (document.activeElement === e.target) {
                    e.target.select();
                    try {
                        e.target.setSelectionRange(0, e.target.value.length);
                    } catch (err) {
                        // Some input types don't support setSelectionRange
                    }
                }
            }
        });
    }
    
    /**
     * Show mobile map view
     */
    function showMobileMapView() {
        // Check if map overlay already exists
        let mapOverlay = document.getElementById('mobile-map-overlay');
        
        if (mapOverlay) {
            // Map already exists, just show it
            mapOverlay.style.display = 'flex';
            
            // Update map colors with latest tariff data
            if (window.updateMapColors && typeof window.updateMapColors === 'function') {
                setTimeout(() => {
                    window.updateMapColors();
                }, 100);
            }
            return;
        }
        
        // Create a full-page map overlay
        mapOverlay = document.createElement('div');
        mapOverlay.id = 'mobile-map-overlay';
        mapOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: var(--background-color);
            z-index: 2000;
            display: flex;
            flex-direction: column;
        `;
        
        // Create exit button
        const exitButton = document.createElement('button');
        exitButton.textContent = 'EXIT MAP';
        exitButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            color: var(--excellenceOrange);
            text-decoration: underline;
            font-family: var(--font-family-sans-serif);
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            z-index: 2001;
            padding: 8px 12px;
        `;
        
        // Create map container
        const mapContainer = document.createElement('div');
        mapContainer.id = 'map-section';
        mapContainer.className = 'card';
        mapContainer.style.cssText = `
            flex: 1;
            margin: 0;
            border: none;
            border-radius: 0;
            position: relative;
            background-color: var(--map-bg);
        `;
        
        // Add elements to overlay
        mapOverlay.appendChild(exitButton);
        mapOverlay.appendChild(mapContainer);
        
        // Add overlay to body
        document.body.appendChild(mapOverlay);
        
        // Handle exit button
        exitButton.addEventListener('click', function() {
            exitMobileMapView();
        });
        
        // Always ensure map.js is loaded first
        loadMapScript().then(() => {
            // Initialize map after a short delay to ensure DOM is ready
            setTimeout(() => {
                initializeMobileMap();
            }, 100);
        });
    }

    /**
     * Initialize the map for mobile view
     */
    function initializeMobileMap() {
        const mapSection = document.getElementById('map-section');
        if (!mapSection) {
            console.error('Map section not found');
            return;
        }
        
        // First, ensure Leaflet is loaded
        if (typeof L === 'undefined') {
            console.error('Leaflet not loaded');
            mapSection.innerHTML = '<p style="text-align: center; padding: 20px;">Error loading map library</p>';
            return;
        }
        
        // Initialize the map using the global initializeMap function
        if (window.initializeMap && typeof window.initializeMap === 'function') {
            window.initializeMap();
            
            // Load GeoJSON data if available
            if (window.loadGeoJSONData && typeof window.loadGeoJSONData === 'function') {
                window.loadGeoJSONData();
            }
            
            // Update colors after a short delay
            setTimeout(() => {
                if (window.updateMapColors && typeof window.updateMapColors === 'function') {
                    window.updateMapColors();
                }
                
                // Disable country clicks on mobile by removing click handlers
                if (window.geojsonLayer) {
                    window.geojsonLayer.eachLayer(function(layer) {
                        // Remove all event listeners from the layer
                        layer.off('click');
                        
                        // Also disable pointer events via CSS class
                        if (layer._path) {
                            layer._path.style.pointerEvents = 'none';
                        }
                    });
                }
            }, 200); // Give a bit more time for everything to load
        } else {
            console.error('Map initialization function not available');
            mapSection.innerHTML = '<p style="text-align: center; padding: 20px;">Error initializing map</p>';
        }
    }
    
    /**
     * Load map.js script
     */
    function loadMapScript() {
        return new Promise((resolve, reject) => {
            if (window.updateMapColors) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'code/components/map/map.js';
            script.onload = function() {
                console.log('Map.js loaded successfully');
                resolve();
            };
            script.onerror = function() {
                console.error('Failed to load map.js');
                reject(new Error('Failed to load map.js'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Exit mobile map view
     */
    function exitMobileMapView() {
        const mapOverlay = document.getElementById('mobile-map-overlay');
        if (mapOverlay) {
            // Hide instead of remove to preserve the map
            mapOverlay.style.display = 'none';
        }
    }
    
    /**
     * Fix treemap rendering for mobile
     */
    function fixTreemapRendering() {
        // Override the TreemapRenderer height calculation for mobile
        if (window.CompressedTreemap && window.CompressedTreemap.TreemapRenderer) {
            const originalRender = window.CompressedTreemap.TreemapRenderer.prototype.render;
            
            window.CompressedTreemap.TreemapRenderer.prototype.render = function(container, rootNode, layout, metadataProvider) {
                // Store original height option
                const originalHeight = this.options.height;
                
                // On mobile, use a larger fixed height
                if (window.isMobileVersion) {
                    this.options.height = 500;
                    // Override the 75% calculation to use more space
                    this.options.useMobileHeight = true;
                }
                
                // Pre-set container dimensions for mobile to ensure proper calculation
                if (window.isMobileVersion && container) {
                    // Force container to have proper width before getBoundingClientRect is called
                    container.style.width = '100%';
                    container.style.height = '500px';
                    container.style.position = 'relative';
                    
                    // Force a reflow to ensure dimensions are calculated
                    container.offsetHeight;
                    
                    // Override the render method's height calculation
                    const originalGetBoundingClientRect = container.getBoundingClientRect.bind(container);
                    container.getBoundingClientRect = function() {
                        const rect = originalGetBoundingClientRect();
                        // Return modified rect that will result in full height usage
                        return {
                            ...rect,
                            height: 500 / 0.75 // This will make the 75% calculation result in 500px
                        };
                    };
                }
                
                // Call original render
                const result = originalRender.call(this, container, rootNode, layout, metadataProvider);
                
                // Restore original height
                this.options.height = originalHeight;
                
                // Additional mobile fixes after rendering
                if (window.isMobileVersion && container) {
                    // Get the actual viewport width
                    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                    
                    // Fix SVG dimensions
                    const svg = container.querySelector('.treemap-svg');
                    if (svg) {
                        svg.setAttribute('height', '500');
                        svg.setAttribute('width', '100%');
                        svg.setAttribute('viewBox', `0 0 ${viewportWidth} 500`);
                        svg.style.height = '500px';
                        svg.style.width = '100%';
                        svg.style.maxWidth = '100%';
                        
                        // Ensure the g element uses full width
                        const g = svg.querySelector('g.treemap-container');
                        if (g) {
                            g.setAttribute('transform', 'translate(0,0)');
                        }
                    }
                    
                    // Fix container heights
                    container.style.height = '500px';
                    container.style.minHeight = '500px';
                    container.style.maxWidth = '100%';
                    container.style.overflow = 'hidden';
                    
                    // Fix parent container if it exists
                    if (container.parentElement && container.parentElement.classList.contains('chart-visualization')) {
                        container.parentElement.style.height = 'auto';
                        container.parentElement.style.minHeight = 'unset';
                    }
                    
                    // Force recalculation of layout with proper bounds
                    if (layout && rootNode) {
                        // Use the container's actual width for more accurate calculation
                        const containerWidth = container.offsetWidth || viewportWidth;
                        const bounds = {
                            x: 0,
                            y: 0,
                            width: Math.max(300, containerWidth - 20), // Ensure minimum width, account for padding
                            height: 500
                        };
                        layout.calculateLayout(rootNode, bounds);
                        
                        // Update the viewBox to match actual container width
                        if (svg) {
                            svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
                        }
                    }
                }
                
                return result;
            };
        }
    }
    
    // Apply treemap fix when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixTreemapRendering);
    } else {
        fixTreemapRendering();
    }
    
    // Function to fix legend text visibility
    function fixLegendTextVisibility() {
        const legendItems = document.querySelectorAll('.treemap-legend-item');
        
        // Debug: Check if legend items exist and their structure
        if (legendItems.length === 0) {
            console.log('No legend items found');
            return;
        }
        
        legendItems.forEach((item, index) => {
            // Debug the structure
            const hasLabel = item.querySelector('.legend-label');
            const hasValue = item.querySelector('.legend-value');
            const hasColorBox = item.querySelector('.legend-color');
            
            // If legend structure is wrong, try to find text in any div
            if (!hasLabel || !hasValue) {
                // Find all divs and check their content
                const divs = item.querySelectorAll('div');
                divs.forEach(div => {
                    // Skip color boxes
                    if (div.classList.contains('legend-color')) return;
                    
                    // If this div has text content and no class, it might be a label or value
                    if (div.textContent && div.textContent.trim()) {
                        // Store the text content to prevent it from being cleared
                        const textContent = div.textContent;
                        
                        // Apply generic text visibility fixes
                        div.style.display = 'block';
                        div.style.visibility = 'visible';
                        div.style.opacity = '1';
                        div.style.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#212529';
                        
                        // If it contains percentage, it's likely a value
                        if (textContent.includes('%')) {
                            div.style.fontSize = '11px';
                            div.style.color = getComputedStyle(document.documentElement).getPropertyValue('--alt-text-color') || '#666';
                            
                            // Add the legend-value class if missing
                            if (!div.classList.contains('legend-value')) {
                                div.classList.add('legend-value');
                            }
                        } else {
                            div.style.fontSize = '12px';
                            
                            // Add the legend-label class if missing
                            if (!div.classList.contains('legend-label') && !div.classList.contains('legend-value')) {
                                div.classList.add('legend-label');
                            }
                        }
                        
                        // Ensure text content is preserved
                        if (div.textContent !== textContent) {
                            div.textContent = textContent;
                        }
                    }
                });
            }
            
            // Fix legend labels
            const labels = item.querySelectorAll('.legend-label');
            labels.forEach(label => {
                label.style.display = 'block';
                label.style.visibility = 'visible';
                label.style.opacity = '1';
                label.style.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#212529';
                label.style.fontSize = '12px';
                label.style.fontFamily = 'var(--font-family-monospace, monospace)';
            });
            
            // Fix legend values
            const values = item.querySelectorAll('.legend-value');
            values.forEach(value => {
                value.style.display = 'block';
                value.style.visibility = 'visible';
                value.style.opacity = '1';
                value.style.color = getComputedStyle(document.documentElement).getPropertyValue('--alt-text-color') || '#666';
                value.style.fontSize = '11px';
                value.style.fontFamily = 'var(--font-family-monospace, monospace)';
            });
            
            // Ensure the color box doesn't take all the space
            const colorBoxes = item.querySelectorAll('.legend-color');
            colorBoxes.forEach(box => {
                box.style.width = '12px';
                box.style.height = '12px';
                box.style.minWidth = '12px';
                box.style.maxWidth = '12px';
                box.style.flexShrink = '0';
                box.style.display = 'inline-block';
            });
            
            // Ensure proper flex layout
            const headerRow = item.querySelector('div:first-child');
            if (headerRow) {
                headerRow.style.display = 'flex';
                headerRow.style.alignItems = 'center';
                headerRow.style.gap = '4px';
            }
        });
    }
    
    // Also monitor for dynamically created treemaps
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    // Check if this is a treemap container or contains treemaps
                    if (node.classList && (node.classList.contains('treemap-visualization-container') || 
                        node.classList.contains('treemap-svg'))) {
                        // Re-apply fixes after a short delay to ensure rendering is complete
                        setTimeout(() => {
                            const svg = node.classList.contains('treemap-svg') ? node : node.querySelector('.treemap-svg');
                            if (svg && window.isMobileVersion) {
                                const container = svg.parentElement;
                                const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                                const containerWidth = container.offsetWidth || viewportWidth;
                                const width = Math.max(300, containerWidth - 20);
                                
                                svg.setAttribute('viewBox', `0 0 ${width} 500`);
                                svg.style.width = '100%';
                                svg.style.maxWidth = '100%';
                                svg.style.height = '500px';
                            }
                            
                            // Fix legend text visibility
                            fixLegendTextVisibility();
                        }, 100);
                    }
                    
                    // Also check if a legend was added
                    if (node.classList && node.classList.contains('treemap-legend')) {
                        setTimeout(fixLegendTextVisibility, 100);
                    }
                    
                    // Check children for legends
                    const legends = node.querySelectorAll ? node.querySelectorAll('.treemap-legend') : [];
                    if (legends.length > 0) {
                        setTimeout(fixLegendTextVisibility, 100);
                    }
                }
            });
        });
    });
    
    // Start observing when DOM is ready
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Also run a periodic check to ensure legends stay visible
    if (window.isMobileVersion) {
        setInterval(() => {
            // Only run if there are treemap legends on the page
            const legends = document.querySelectorAll('.treemap-legend');
            if (legends.length > 0) {
                fixLegendTextVisibility();
            }
        }, 500); // Check every 500ms
    }
    
    /**
     * Add touch-and-hold functionality for treemap tooltips
     */
    function addTouchTooltipSupport() {
        let touchTimer = null;
        let currentTooltip = null;
        let touchedElement = null;
        let touchStartTime = 0;
        let isDrillDownClick = false;
        
        // Function to show tooltip
        function showTouchTooltip(element, touch) {
            // Find the tooltip container
            const tooltipContainer = document.getElementById('treemap-tooltip-container');
            if (!tooltipContainer) return;
            
            // Trigger the mouseenter event to show tooltip
            const mouseEnterEvent = new MouseEvent('mouseenter', {
                bubbles: true,
                cancelable: true,
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            element.dispatchEvent(mouseEnterEvent);
            
            // Add highlight effect
            element.setAttribute('stroke', 'var(--text-color, #333)');
            element.setAttribute('stroke-width', '4');
            element.style.opacity = '0.8';
            
            // Position tooltip at touch point
            if (tooltipContainer.style.visibility === 'visible') {
                tooltipContainer.style.left = `${touch.clientX + 10}px`;
                tooltipContainer.style.top = `${touch.clientY - 40}px`;
            }
            
            currentTooltip = tooltipContainer;
            touchedElement = element;
        }
        
        // Function to hide tooltip
        function hideTouchTooltip() {
            if (touchedElement) {
                // Trigger mouseleave to hide tooltip
                const mouseLeaveEvent = new MouseEvent('mouseleave', {
                    bubbles: true,
                    cancelable: true
                });
                touchedElement.dispatchEvent(mouseLeaveEvent);
                
                // Remove highlight effect
                touchedElement.setAttribute('stroke', 'var(--background-color, #fff)');
                touchedElement.setAttribute('stroke-width', '1');
                touchedElement.style.opacity = '1';
                
                touchedElement = null;
            }
            
            currentTooltip = null;
        }
        
        // Add touch event listeners to document
        document.addEventListener('touchstart', function(e) {
            // Check if touch is on a treemap rectangle
            const target = e.target;
            if (target && target.classList && target.classList.contains('treemap-rect')) {
                // Hide any existing tooltip first
                hideTouchTooltip();
                
                // Clear any existing timer
                if (touchTimer) {
                    clearTimeout(touchTimer);
                }
                
                // Store touch position and time
                const touch = e.touches[0];
                touchStartTime = Date.now();
                isDrillDownClick = false;
                
                // Start timer for long press (1 second)
                touchTimer = setTimeout(() => {
                    // Only show tooltip if not a drill-down click
                    if (!isDrillDownClick) {
                        showTouchTooltip(target, touch);
                        
                        // Add haptic feedback if available
                        if (window.navigator && window.navigator.vibrate) {
                            window.navigator.vibrate(50);
                        }
                    }
                }, 1000);
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', function(e) {
            // Cancel timer if user moves finger
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
            
            // Update tooltip position if visible
            if (currentTooltip && currentTooltip.style.visibility === 'visible') {
                const touch = e.touches[0];
                currentTooltip.style.left = `${touch.clientX + 10}px`;
                currentTooltip.style.top = `${touch.clientY - 40}px`;
            }
        }, { passive: true });
        
        document.addEventListener('touchend', function(e) {
            // Clear timer
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
            
            // Check if this was a quick tap (potential drill-down)
            const touchDuration = Date.now() - touchStartTime;
            if (touchDuration < 500) { // Quick tap
                isDrillDownClick = true;
                // Hide tooltip immediately for quick taps
                hideTouchTooltip();
            } else {
                // Hide tooltip after a short delay for long presses
                setTimeout(() => {
                    hideTouchTooltip();
                }, 100);
            }
        }, { passive: true });
        
        document.addEventListener('touchcancel', function() {
            // Clear timer and hide tooltip
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
            hideTouchTooltip();
        }, { passive: true });
        
        // Hide tooltip when clicking anywhere (including treemap rects for drill-down)
        document.addEventListener('click', function(e) {
            // Always hide tooltip on any click
            hideTouchTooltip();
            
            // Also cancel any pending timer
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
        }, true); // Use capture phase to ensure this runs before drill-down
        
        // Also listen for the custom treemap drill-down event
        document.addEventListener('treemap-node-click', function() {
            // Hide tooltip when drilling down
            hideTouchTooltip();
            isDrillDownClick = true;
        });
    }
    
    // Initialize touch tooltip support
    if (window.isMobileVersion) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addTouchTooltipSupport);
        } else {
            addTouchTooltipSupport();
        }
    }

    // Expose functions to global scope if needed
    window.mobileUI = {
        initializeMobileUI: initializeMobileUI,
        showMobileMapView: showMobileMapView,
        fixTreemapRendering: fixTreemapRendering,
        fixLegendTextVisibility: fixLegendTextVisibility
    };
})();