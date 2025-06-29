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
                mobileMenu.style.display = 'block';
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
            mobileMenu.style.display = 'block';
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
            }, 100);
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

    // Expose functions to global scope if needed
    window.mobileUI = {
        initializeMobileUI: initializeMobileUI,
        showMobileMapView: showMobileMapView
    };
})();