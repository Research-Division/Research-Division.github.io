/**
 * Help and Information Module with Guided Tour
 * Displays help and information about the application
 */

// Store modal elements and state
let helpModal = null;
let isInitialized = false;
let panelVisible = false;
let guidedTour = null;

// Initialize the help info panel
function initializeHelpPanel() {
    if (isInitialized) return;
    
    // Load the modal HTML with tour options, instructions, acknowledgements, and terms of service
    const modalHtml = `
    <div class="help-info-modal">
        <div class="modal-content" style="max-height: 95vh; height: auto;">
            <div class="modal-header">
                <h2>Help & Information</h2>
                <button class="panel-close-button" id="help-panel-close-button">
                    <img src="assets/fontawesome/xmark.svg" alt="Close" class="close-icon">
                </button>
            </div>
            <div class="modal-body" style="overflow-y: auto; max-height: calc(95vh - 60px); padding-top: 0;">
                <div class="help-receipt">
                    <!-- Section 1: Guided Tour Button -->
                    <div class="help-section">
                        <h3>Take a Guided Tour</h3>
                        <p>Take a step-by-step tour of the application to learn about all the key features and tools.</p>
                        <div class="help-buttons">
                            <button id="start-guided-tour-btn" class="help-action-btn">Start Tour</button>
                            <button id="reset-guided-tour-btn" class="help-action-btn secondary">Reset First-Visit Tour</button>
                        </div>
                    </div>
                    
                    <div class="separator receipt-separator"></div>
                    
                    <!-- Section 2: Getting Started (from final slide of tour) -->
                    <div class="help-section">
                        <h3>Getting Started</h3>
                        <p>To get started, explore country trade relationships using the Global Trade Explorer <img src="assets/fontawesome/globe-solid.svg" alt="Globe icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> or the country-level Trade Data Explorer <img src="assets/fontawesome/chart-line-solid.svg" alt="Chart icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;">. This will help you understand existing trade patterns before implementing policy changes.</p>
                        <p>When you're ready to implement tariffs, click on a country to add a country-specific tariff, select a set of countries in the receipt, or add a global tariff that applies to all trading partners.</p>
                    </div>
                    
                    <div class="separator receipt-separator"></div>
                    
                    <!-- Section 3: Interface Elements (from final slide of tour) -->
                    <div class="help-section">
                        <h3>Interface Elements</h3>
                        <p>Look for these consistent elements throughout the application:</p>
                        <ul>
                            <li>Chevron icons <img src="assets/fontawesome/chevron-down-solid.svg" alt="Chevron down icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> indicate expandable information or dropdowns</li>
                            <li><span style="color: var(--excellenceOrange); font-weight: bold;">Orange</span>/<span style="color: var(--primary); font-weight: bold;">blue</span> text near icons indicates clickable elements or dropdowns</li>
                            <li>Chart icons <img src="assets/fontawesome/chart-line-solid.svg" alt="Chart icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> show that charts are available for that item</li>
                            <li>Press the Escape key to close any modal</li>
                            <li>If a tariff calculation seems incorrect, try refreshing the page or check the trade data explorer for that country to verify expected effects</li>
                        </ul>
                    </div>
                    
                    <div class="separator receipt-separator"></div>
                    
                    <!-- Section 4: Attributions -->
                    <div class="help-section">
                        <h3>Attributions</h3>
                        <p>This application is built on several open-source components and datasets:</p>
                        
                        <h4>Software Components</h4>
                        <ul>
                            <li><strong>Leaflet.js (v1.9.4):</strong> The interactive mapping library used in this application. To learn more about Leaflet, visit <a href="https://leafletjs.com/" target="_blank" style="color: var(--primary); text-decoration: underline;">leafletjs.com</a></li>
                            
                            <li><strong>GeoJSON Countries (v1.1):</strong> World map geographic data (modified to 3 decimal point accuracy).<br>
                            &nbsp;&nbsp;&nbsp;&nbsp;Data available at: <a href="https://github.com/datasets/geo-countries/" target="_blank" style="color: var(--primary); text-decoration: underline;">github.com/datasets/geo-countries</a></li>
                            
                            <li><strong>Country Converter (v1.3):</strong> Used for standardizing country codes and names under GNU General Public License v3.0 (GPLv3).<br>
                            Citation: Stadler, K. (2017). The country converter coco - a Python package for converting country names between different classification schemes. The Journal of Open Source Software. doi: 10.21105/joss.00332<br>
                            &nbsp;&nbsp;&nbsp;&nbsp;Paper available at: <a href="https://joss.theoj.org/papers/10.21105/joss.00332" target="_blank" style="color: var(--primary); text-decoration: underline;">joss.theoj.org/papers/10.21105/joss.00332</a></li>
                        </ul>
                        
                        <h4>Data Sources</h4>
                        <ul>
                            <li><strong>Tariff Data:</strong> Feodora Teti's Global Tariff Database (v_beta1-2024-12).<br>
                            Citation: Teti, F. A. (2024). Missing Tariffs. CESifo Working Papers No. 11590.<br>
                            &nbsp;&nbsp;&nbsp;&nbsp;Data available at: <a href="https://feodorateti.github.io/data.html" target="_blank" style="color: var(--primary); text-decoration: underline;">feodorateti.github.io/data.html</a></li>
                            
                            <li><strong>Trade Data:</strong> U.S. Census Bureau international trade data.<br>
                            &nbsp;&nbsp;&nbsp;&nbsp;Data available at: <a href="https://usatrade.census.gov/" target="_blank" style="color: var(--primary); text-decoration: underline;">usatrade.census.gov</a></li>
                        </ul>
                        
                        <p>For detailed information on our methodology, calculations, and frequently asked questions, please visit the <a href="https://atlantafed.org/research/data-and-tools/tariff-price-tool" target="_blank" style="color: var(--primary); text-decoration: underline;">Tariff Price Tool documentation page</a>.</p>
                        
                        <div id="citation-section" style="display: flex; flex-direction: column; align-items: center; width: 100%; margin-top: 1.5rem;">
                            <h4 style="margin-bottom: 0.75rem; text-align: center;">Suggested Citation</h4>
                            <div id="citation-box" style="max-width: 95%; width: 700px; padding: 0.75rem 2rem 1.25rem 2rem; border-radius: 8px; border: 2px dashed #666; font-family: var(--font-family-monospace); background-color: rgba(0,0,0,0.01); box-shadow: 0 2px 6px rgba(0,0,0,0.05); transition: background-color 0.5s ease;">
                                <p style="margin-bottom: 0; font-style: italic; text-align: justify; line-height: 1.6;">Michael Dwight Sparks, Salomé Baslandze & Simon Fuchs, <i>The Atlanta Fed's Tariff Price Tool: Methodology</i> (SSRN Working Paper No. #####),<br>&#9;https://ssrn.com/abstract=#####</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="separator receipt-separator"></div>
                    
                    <!-- Section 5: Terms of Service -->
                    <div class="help-section">
                        <h3>Terms of Use</h3>
                        <div class="terms-content">
                            <p>By using the Federal Reserve Bank of Atlanta's (Bank's) mobile app, Tariff Price Tool, you implicitly agree that your use is subject to the following disclaimers and other terms of use:</p>
                            <ol>
                                <li>Unauthorized attempts to upload or change information, to defeat or circumvent security measures, or to use this app or its content for other than its intended purpose is prohibited.</li>
                                <li>The Federal Reserve Bank of Atlanta takes reasonable measures to ensure the quality of the data and other information produced by the Bank and made available in this app. However, the Bank makes no warranty, express or implied, nor assumes any liability or responsibility for the accuracy, timeliness, correctness, completeness, merchantability, or fitness for a particular purpose of any information that is available through this app, nor represents that its use would not infringe upon any privately owned rights.</li>
                                <li>Reproduction of Bank content (print and digital) offered through our app may be made without limitation as to number, provided that such reproductions are not for private gain and that appropriate attribution to the Federal Reserve Bank of Atlanta is made on all such reproductions.</li>
                                <li>This app links to the Atlanta Fed's website. Material on that website may be subject to additional copyright restrictions. Please see the <a href="https://www.atlantafed.org/disclaimers-and-terms-of-use" target="_blank" style="color: var(--primary); text-decoration: underline;">Disclaimer and Terms of Use</a> and <a href="https://www.atlantafed.org/online-privacy-policy" target="_blank" style="color: var(--primary); text-decoration: underline;">Online Privacy Policy</a> for the Atlanta Fed's website for more information.</li>
                                <li>The Bank does not endorse any product, service, or company and does not permit the use of its name in any form of advertising or for any other commercial purpose.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
    // Create a div for our modal
    const modalDiv = document.createElement('div');
    modalDiv.id = 'help-info-panel-container';
    modalDiv.className = 'help-info-modal-container';
    modalDiv.style.display = 'flex';
    modalDiv.style.justifyContent = 'center'; // Center horizontally
    modalDiv.style.alignItems = 'center';     // Center vertically 
    modalDiv.style.maxWidth = '100vw';        // Full width
    modalDiv.style.maxHeight = '100vh';       // Full height
    modalDiv.style.height = '100%';           // Full height
    modalDiv.style.padding = '20px';          // Add some padding
    modalDiv.innerHTML = modalHtml;
    
    // Remove any existing modal first
    const existingModal = document.getElementById('help-info-panel-container');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }
    
    // Append directly to the body like other modals
    document.body.appendChild(modalDiv);
    
    // Store reference to the modal
    helpModal = modalDiv;
    
    // Set up event listeners
    setupEventListeners();
    
    isInitialized = true;
}

// Set up event listeners
function setupEventListeners() {
    // Close button
    const closeButton = helpModal.querySelector('#help-panel-close-button');
    if (closeButton) {
        closeButton.addEventListener('click', hideHelpPanel);
    }
    
    // Start guided tour button
    const tourButton = helpModal.querySelector('#start-guided-tour-btn');
    if (tourButton) {
        tourButton.addEventListener('click', function() {
            hideHelpPanel(); // Close help modal first
            setTimeout(() => {
                startGuidedTour(); // Start tour after modal closes
            }, 300);
        });
    }
    
    // Reset guided tour button
    const resetTourButton = helpModal.querySelector('#reset-guided-tour-btn');
    if (resetTourButton) {
        resetTourButton.addEventListener('click', function() {
            // Remove the flag from localStorage to reset the first-visit status
            localStorage.removeItem('hasVisitedSparksTool');
            alert('First-visit tour has been reset. The guided tour will start automatically next time you reload the page.');
        });
    }
    
    // Click outside to close
    const modalContent = helpModal.querySelector('.help-info-modal');
    if (modalContent) {
        modalContent.addEventListener('click', function(event) {
            if (event.target === modalContent) {
                hideHelpPanel();
            }
        });
    }
    
    // Escape key to close
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && panelVisible) {
            hideHelpPanel();
        }
    });
}

// Start the guided tour
function startGuidedTour() {
    // Clean up any existing tour elements first
    cleanupLeftoverTourElements();
    
    // Always create a fresh tour instance to avoid state issues
    addTourHTML();
    guidedTour = new SparksGuidedTourV2();
    
    // Start the tour
    guidedTour.start();
}

// Add tour HTML elements to the page
function addTourHTML() {
    // Check if tour elements already exist and remove them to ensure clean state
    cleanupLeftoverTourElements();
    
    const tourHTML = `
        <!-- Tour Overlay System -->
        <div class="tour-overlay" id="tourOverlay">
            <div class="overlay-piece" id="overlay-top"></div>
            <div class="overlay-piece" id="overlay-right"></div>
            <div class="overlay-piece" id="overlay-bottom"></div>
            <div class="overlay-piece" id="overlay-left"></div>
            <div class="highlight-ring" id="highlightRing"></div>
        </div>

        <!-- Tour Tooltip -->
        <div class="tour-tooltip" id="tourTooltip" role="dialog" aria-labelledby="tooltipTitle" aria-describedby="tooltipContent">
            <div class="tooltip-header">
                <h3 class="tooltip-title" id="tooltipTitle">Welcome to Sparks Graph</h3>
                <button class="close-button" id="closeBtn" aria-label="Skip tour">SKIP TOUR</button>
            </div>
            <div class="tooltip-content" id="tooltipContent">
                Let's take a quick tour of the key features in this application.
                <p class="keyboard-hint">Use arrow keys (←→) to navigate. <strong>Press Esc or click <span style="color: var(--excellenceOrange); text-decoration: underline; font-weight: bold;">SKIP TOUR</span> to exit the tour at any time.</strong></p>
            </div>
            <div class="tooltip-navigation">
                <button class="nav-button" id="prevBtn" disabled aria-label="Previous step"><u>Previous</u></button>
                <div class="progress-dots" id="progressDots" aria-hidden="true"></div>
                <button class="nav-button" id="nextBtn" aria-label="Next step"><u>Next</u></button>
            </div>
        </div>
    `;
    
    // Styles have been moved to an external stylesheet: styles/help_and_info_styles.css
    
    // Add tour HTML to body
    document.body.insertAdjacentHTML('beforeend', tourHTML);
}

// Show the help panel
function showHelpPanel() {
    initializeHelpPanel();
    panelVisible = true;
}

// Hide the help panel
function hideHelpPanel() {
    if (helpModal && panelVisible) {
        document.body.removeChild(helpModal);
        helpModal = null;
        isInitialized = false;
        panelVisible = false;
        
        // Make sure any leftover tour elements are also cleaned up
        cleanupLeftoverTourElements();
    }
}

// Function to clean up any leftover tour elements
function cleanupLeftoverTourElements() {
    const elementsToCheck = [
        'tourOverlay',
        'tourTooltip',
        'tour-a11y-announcer',
        'tour-styles',
        'tour-completion-message',
        'highlightRing',
        'pulse-animation-style'
    ];
    
    elementsToCheck.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.parentNode) {
            console.log(`Cleaning up leftover tour element: ${id}`);
            element.parentNode.removeChild(element);
        }
    });
    
    // Also check for any elements with tour-related classes
    const tourClassElements = document.querySelectorAll('.tour-overlay, .tour-tooltip, .highlight-ring');
    tourClassElements.forEach(element => {
        if (element && element.parentNode) {
            console.log('Cleaning up element with tour class');
            element.parentNode.removeChild(element);
        }
    });
}

// Setup click handler for help button to show the help panel instead of directly starting the tour
document.addEventListener('DOMContentLoaded', function() {
    const helpButton = document.getElementById('show-help-panel');
    
    if (helpButton) {
        helpButton.addEventListener('click', function() {
            // First clean up any leftover tour elements from previous sessions
            cleanupLeftoverTourElements();
            
            // Now show the help panel instead of starting the tour directly
            setTimeout(() => {
                showHelpPanel();
            }, 100);
        });
    }
    
    // Citation link in the footer
    const citationLink = document.getElementById('citation-link');
    if (citationLink) {
        citationLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // First clean up any leftover tour elements
            cleanupLeftoverTourElements();
            
            // Show the help panel
            setTimeout(() => {
                showHelpPanel();
                
                // After panel is visible, scroll to the citation section
                setTimeout(() => {
                    const citationSection = document.getElementById('citation-section');
                    const modalBody = document.querySelector('.modal-body');
                    
                    if (citationSection && modalBody) {
                        // Get the position of the citation section relative to the modal body
                        const citationPosition = citationSection.offsetTop;
                        
                        // Scroll the modal body to the citation section
                        modalBody.scrollTo({
                            top: citationPosition - 100, // Subtract some pixels to show a bit of context above
                            behavior: 'smooth'
                        });
                        
                        // Add a brief highlight effect to just the citation box
                        const citationBox = document.getElementById('citation-box');
                        if (citationBox) {
                            // Highlight with a light blue background
                            citationBox.style.backgroundColor = 'rgba(0, 118, 182, 0.1)';
                            
                            // Slightly enhance the border during highlight
                            citationBox.style.borderColor = 'var(--primary)';
                            citationBox.style.borderWidth = '2px';
                            
                            // Remove highlight after a short delay
                            setTimeout(() => {
                                citationBox.style.backgroundColor = 'rgba(0,0,0,0.01)';
                                citationBox.style.borderColor = '#666';
                            }, 1800);
                        }
                    }
                }, 300); // Wait for panel to be fully visible
            }, 100);
        });
    }
    
    // Check if this is the first visit (using localStorage)
    const hasVisitedBefore = localStorage.getItem('hasVisitedSparksTool');
    console.log('hasVisitedSparksTool value:', hasVisitedBefore);
    
    // If this is the first visit, start the guided tour
    if (!hasVisitedBefore) {
        // Add a slight delay to ensure the page is fully loaded
        setTimeout(() => {
            // Add tour HTML and start the guided tour
            startGuidedTour();
            
            // Set the flag in localStorage to remember that user has seen the tour
            localStorage.setItem('hasVisitedSparksTool', 'true');
        }, 1000); // 1 second delay for page to fully render
    }
});

// Export functions for global access
window.HelpInfoPanel = {
    initialize: initializeHelpPanel,
    show: showHelpPanel, // Changed to show the help panel instead of directly starting the tour
    hide: hideHelpPanel,
    startTour: startGuidedTour,
    resetFirstVisitTour: function() {
        localStorage.removeItem('hasVisitedSparksTool');
    }
};

// Guided Tour Class
class SparksGuidedTourV2 {
    constructor() {
        this.currentStep = 0;
        
        // Define steps array FIRST
        this.tourSteps = [
            {
                target: null,
                title: 'Explore the Price Effects of Tariffs  ',
                content: 'This application helps users understand how tariffs on imports might affect consumer prices in the U.S. economy. It combines trade, tariff, and production data to show both direct and indirect effects—meaning not just what you pay at the store, but how higher input costs ripple through supply chains. This short walkthrough explains how the tool works at a glance.\n\nUse the left and right arrow keys to navigate through the tour.\n\n<strong>To skip the tour at any time, press the Escape key or click <span style="color: var(--excellenceOrange); text-decoration: underline; font-weight: bold;">SKIP TOUR</span> in the upper right corner.</strong>',
                position: 'center',
                isIntro: true,
                beforeStep: function() {
                    // Make the close button pulse to draw attention to it
                    const closeBtn = document.getElementById('closeBtn');
                    if (closeBtn) {
                        // Add a pulsing animation to the close button
                        closeBtn.style.animation = 'pulse-attention 1.5s infinite';
                        
                        // Add the animation style if it doesn't exist
                        if (!document.getElementById('pulse-animation-style')) {
                            const style = document.createElement('style');
                            style.id = 'pulse-animation-style';
                            style.textContent = `
                                @keyframes pulse-attention {
                                    0%, 100% { transform: scale(1); }
                                    50% { transform: scale(1.15); }
                                }
                            `;
                            document.head.appendChild(style);
                        }
                        
                        // Remove the animation when any interaction happens on the first slide
                        setTimeout(() => {
                            // Helper function to remove the animation
                            const removeAnimation = function() {
                                if (closeBtn) {
                                    closeBtn.style.animation = '';
                                    // Add an underline after animation stops
                                    closeBtn.style.textDecoration = 'underline';
                                }
                                
                                // Remove all these event listeners
                                nextBtn.removeEventListener('click', removeAnimation);
                                document.removeEventListener('keydown', keyHandler);
                            };
                            
                            // Function to handle keyboard events
                            const keyHandler = function(e) {
                                if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || 
                                    e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                    removeAnimation();
                                }
                            };
                            
                            // Add event listeners
                            const nextBtn = document.getElementById('nextBtn');
                            if (nextBtn) {
                                nextBtn.addEventListener('click', removeAnimation);
                                // Also listen for keyboard navigation
                                document.addEventListener('keydown', keyHandler);
                            }
                        }, 100);
                    }
                }
            },
            {
                target: null,
                title:"Model Potential Direct and Indirect Effects  ",
                content: '<p>The tool calculates how tariffs might affect prices through two channels:</p> <p><b>Direct effects:</b> These occur when consumers buy imported goods that now cost more due to tariffs.</p> <p><b>Indirect effects:</b> These happen when domestic firms use imported inputs—like lumber or metals—and pass on those higher costs to customers.</p>',
                position: 'center',
                isIntro: true
            },
            /*{
                target: null,
                title:"Powered by Real Trade and Production Data  ",
                content: '<p>The tool uses official U.S. trade data from 2024, and input-output data for 2022. Tariffs can be applied by product group and trading partner, with calculations grounded in actual import patterns.</p> <p>Behind the scenes, the tool connects trade classifications with economic sectors and converts input prices to what consumers actually see.</p> <p>This lets users estimate how a tariff scenario affects prices across products, sectors, and countries.</p>',
                position: 'center',
                isIntro: true
            },*/
            {
                target: null,
                title:"Create and Simulate Scenarios",
                content: '<p>Using official U.S. trade and input-output data, the tool lets users estimate how a tariff scenario affects prices across products, sectors, and countries. </p><p>Try out different policy scenarios. Want to see what happens if tariffs rise on steel from China or electronics from Europe? Just select the country, pick the products, and set your tariff rates.</p> <p>The tool shows how much consumer prices could be expected to change in the short run—across both goods and services.</p> <p>It’s a fast, flexible way to explore the ripple effects of trade policy changes.</p>',
                position: 'center',
                isIntro: true
            },
            
            {
                target: '#map-section',
                title: 'Interactive Trade Map',
                content: 'This interactive map displays global trade relationships. Clicking on a country will let you adjust the current tariff rate, implement a new tariff, implement product level tariffs, and explore the trade and tariff relationships with the U.S.\n\nAfter applying tariffs, countries on the map are shaded according to their share of the overall potential consumer price effect:\n\n<div style="display: flex; flex-direction: column; margin: 15px 0; border: 1px solid var(--borderColor); padding: 10px; border-radius: 4px;">\n  <div style="margin-bottom: 12px;"><strong>Color Scale:</strong></div>\n  <!-- Positive effect gradient bar -->\n  <div style="text-align: center; margin-bottom: 5px; color: rgb(0, 76, 127); font-weight: 500;">If the country contributes to increasing the overall potential price effect</div>\n  <div style="display: flex; align-items: center; margin-bottom: 5px;">\n    <div style="width: 20px; height: 20px; background-color: #eaeaea; border: 1px solid #ccc;"></div>\n    <div style="flex: 1; height: 20px; background-image: linear-gradient(to right, #eaeaea, rgb(0, 76, 127)); margin: 0 4px;"></div>\n    <div style="width: 20px; height: 20px; background-color: rgb(0, 76, 127); border: 1px solid #ccc;"></div>\n  </div>\n  <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 20px;">\n    <span>No Effect</span>\n    <span>Complete Effect</span>\n  </div>\n\n  <!-- Negative effect gradient bar -->\n  <div style="text-align: center; margin-bottom: 5px; color: rgb(139, 27, 75); font-weight: 500;">If the country contributes to decreasing the overall potential price effect</div>\n  <div style="display: flex; align-items: center; margin-bottom: 5px;">\n    <div style="width: 20px; height: 20px; background-color: #eaeaea; border: 1px solid #ccc;"></div>\n    <div style="flex: 1; height: 20px; background-image: linear-gradient(to right, #eaeaea, rgb(139, 27, 75)); margin: 0 4px;"></div>\n    <div style="width: 20px; height: 20px; background-color: rgb(139, 27, 75); border: 1px solid #ccc;"></div>\n  </div>\n  <div style="display: flex; justify-content: space-between; width: 100%;">\n    <span>No Effect</span>\n    <span>Complete Effect</span>\n  </div>\n</div>\n\nLet\'s focus on Canada as an example.',
                position: 'right',
                beforeStep: function() {
                    // Find and zoom to Canada on the map
                    setTimeout(() => {
                        if (window.geojsonLayer) {
                            window.geojsonLayer.eachLayer(function(layer) {
                                if (layer.feature && layer.feature.properties && layer.feature.properties.ISO_A3 === 'CAN') {
                                    // Get the bounds of Canada
                                    const bounds = layer.getBounds();
                                    
                                    // Zoom to Canada with some padding
                                    map.fitBounds(bounds, {
                                        padding: [50, 50],
                                        maxZoom: 4  // Limit how far we zoom in
                                    });
                                }
                            });
                        }
                    }, 500);
                },
                isSpecialStep: true,
                specialAction: 'openCanadaPopup'
            },
            {
                target: '.popup-container',
                title: 'Country Tariff Popup',
                content: 'This popup provides options for adjusting tariff rates for imports from Canada. Let\'s explore each option in detail.',
                position: 'right',
                targetPopup: true
            },
            {
                target: '.country-name-clickable',
                title: 'Clickable Country Name',
                content: 'The country name and chart icon <img src="assets/fontawesome/chart-line-solid.svg" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> are clickable. Clicking here opens the "Trade Data Explorer" panel with detailed charts about trade relationships, tariff data, and sector analysis for Canada.',
                position: 'right',
                targetPopup: true
            },
            {
                target: '#currentTariffInput',
                title: 'Current Tariff Rate',
                content: '<p>This field shows the existing tariff rate currently applied to imports from this country. The baseline current tariff is the average statutory tariff rate in 2021.</p> <p> The statutory tariff rates are from the Global Tariff Database (Teti 2024) are not inclusive of Section 232 (national security) or Section 301 (unfair trade practices) tariffs, or anti-dumping duties.</p> <p><b> This value is only a baseline. Users are encouraged to update the baseline tariff levels to current effective rates in their estimations.</b></p>',
                position: 'right',
                targetPopup: true
            },
            {
                target: '#newTariffInput',
                title: 'New Tariff Rate',
                content: 'Enter the new tariff rate you want to apply. This will be used to calculate the price effects across the economy. Every section of the economy will receive this flat tariff rate.',
                position: 'right',
                targetPopup: true
            },
            {
                target: '#passThroughInput',
                title: 'Pass-Through Rate',
                content: 'This determines what percentage of the tariff increase gets passed on to consumer prices. A value of 100% means the full tariff cost is passed on to consumer and yields the maximum short-run price response, lower values reflect partial absorption by producers.',
                position: 'right',
                targetPopup: true
            },
            {
                target: '#tariffSubmit',
                title: 'Apply Tariff Button',
                content: '<p>Click this button to apply the uniform tariff rate to all products from Canada and calculate the economic effects.</p> <p> This button assumes that there are no sector level differences in current tariffs, or the newly implemented tariffs. Every sector receives the same increase in tariffs.</p>',
                position: 'bottom',
                targetPopup: true
            },
            {
                target: '#productTariffBtn',
                title: 'Product-Specific Tariff',
                content: '<p>Use this option to apply different tariff rates to specific product categories from Canada, allowing for more targeted policy analysis. This opens a screen where you can select individual product categories from the Harmonized System (HS) and apply custom current tarriff rates, new tariff rates, and pass-through rates to each.</p> <p> When selected, use the chevron icon <img src="assets/fontawesome/chevron-down-solid.svg" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> to expand HS section categories into their HS-2 and HS-4 subcomponents.',
                position: 'bottom',
                targetPopup: true
            },
            {
                target: '#receipt-section',
                title: 'Tariff Receipt Overview',
                content: 'This is the Tariff Receipt, it tracks your tariff analysis with real-time calculations showing potential direct, indirect, and total consumer price effects . Let\'s explore key buttons to get started.',
                position: 'left'
            },
            {
                target: '#btn-country-list',
                title: 'Select Country Button',
                content: '<p>Click here to choose specific countries for tariff analysis. This opens a country selection modal where you can pick a country, continent, or sets of countries, and then select different products to raise tariff rates on.</p> <p> The inputs here are Tariff Changes: indicating percentage point increases in tariff rates. For example, inputting 10% would not yield a 10% increase in the tariff rate, but would increase tariffs from, for example, 25% to 35%. </p>',
                position: 'bottom'
            },
            {
                target: '#btn-global-list',
                title: 'Global Tariff Button',
                content: 'Use this button to add global tariffs that affect all trading partners simultaneously. You can then add tariffs on different products, perfect for analyzing broad trade policy changes and their economy-wide effects.',
                position: 'top'
            },
            {
                target: '#receipt-section',
                title: 'Exploring the Receipt',
                content: 'Let\'s look more closely at the receipt itself. I\'ll add some example entries to demonstrate how to use the receipt features.',
                position: 'left',
                isSpecialStep: true,
                specialAction: 'populateReceiptWithExamples'
            },
            {
                target: '#receipt-item-EX1',
                title: 'Country Entry Row',
                content: 'Each country entry shows the total price effect on the right. You can use the expand/collapse chevron icon <img src="assets/fontawesome/chevron-down-solid.svg" alt="Chevron icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> to see the breakdown between direct and indirect effects. The trash icon <img src="assets/fontawesome/trash-solid.svg" alt="Trash icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> allows you to remove a country from your analysis. The chart icon <img src="assets/fontawesome/chart-line-solid.svg" alt="Chart icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> opens detailed visualizations of the tariff effects for this country.',
                position: 'left'
            },
            {
                target: '#receipt_totals',
                title: 'Receipt Summary',
                content: '<p>The receipt footer summarizes your analysis with three key components: the <strong>Subtotal</strong> (sum of all country-specific tariffs), <strong>Rest of World</strong> (adds a constant tariff increase to unselected countries), and the <strong>Total Price Effect</strong> (overall impact on consumer prices across the economy).</p><p>Just like with individual country entries, you can click the chevron icons <img src="assets/fontawesome/chevron-right-solid.svg" alt="Chevron right icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> next to each summary row to decompose the overall effects into their direct and indirect components.</p>',
                position: 'left'
            },
            {
                target: '#clear-btn',
                title: 'Clear History Button',
                content: 'Use this button to remove all countries from your analysis and start fresh. This is useful when you want to create a completely new tariff scenario without manually removing each country.',
                position: 'top'
            },
            {
                target: '#show-multi-chart-panel',
                title: 'Trade Data Explorer',
                content: '<p>Click on this chart icon to open detailed sector-level visualizations of trade and tariff data. This opens the Trade Area Charts panel showing bilateral trade relationships, allowing you to analyze how specific sectors contribute to overall trade patterns and how tariffs affect these relationships.</p><p>Anywhere you see this icon <img src="assets/fontawesome/chart-line-solid.svg" alt="Chart icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;">, there are charts available for view. When clicking a country name, this takes you to sector-specific trade charts, and when in the receipt, it takes you to graphs of the price effects of the tariffs on a given country.</p>',
                position: 'bottom'
            },
            {
                target: '#show-global-trade-panel',
                title: 'Global Trade Data Explorer',
                content: 'This globe icon opens comprehensive global trade visualizations. The Global Trade Data Explorer provides a bird\'s-eye view of worldwide trade flows, allowing you to explore patterns across countries and regions, and understand how tariffs impact global trade relationships.',
                position: 'bottom'
            },
            {
                target: '#show-help-panel',
                title: 'Help & Information',
                content: 'The Question Mark icon restarts this guided tour, allowing you to revisit any part of the application you need help with. This is particularly useful if you want a refresher on specific features or if you\'re showing the application to someone new.',
                position: 'bottom'
            },
            {
                target: '.settings-icon',
                title: 'Developer Tools',
                content: 'The Settings icon opens the Developer Tools panel where you can customize your experience with options like dark mode, chart animation styles, and various visual preferences. This panel provides advanced customization options for the application\'s appearance and behavior.',
                position: 'bottom'
            },
            {
                target: null,
                title: 'Getting Started',
                content: '<p>To get started, explore country trade relationships using the Global Trade Explorer <img src="assets/fontawesome/globe-solid.svg" alt="Globe icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> or the country-level Trade Data Explorer <img src="assets/fontawesome/chart-line-solid.svg" alt="Chart icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;">. This will help you understand existing trade patterns before implementing policy changes.</p><p>When you\'re ready to implement tariffs, click on a country to add a country-specific tariff, select a set of countries in the receipt, or add a global tariff that applies to all trading partners.</p>',
                position: 'center',
                isIntro: true
            },
            {
                target: null,
                title: 'Consistent Interface Elements',
                content: '<p>Look for these consistent elements throughout the application:</p><ul><li>Chevron icons <img src="assets/fontawesome/chevron-down-solid.svg" alt="Chevron icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> indicate expandable information or dropdowns</li><li><span style="color: var(--excellenceOrange); font-weight: bold;">Orange</span>/<span style="color: var(--primary); font-weight: bold;">blue</span> text near icons indicates clickable elements or dropdowns</li><li>Chart icons <img src="assets/fontawesome/chart-line-solid.svg" alt="Chart icon" class="inline-icon" style="width: 18px; height: 18px; display: inline-block; vertical-align: middle;"> show that charts are available for that item</li><li>Press the Escape key to close any modal</li><li>If a tariff calculation seems incorrect, try refreshing the page or check the trade data explorer for that country to verify expected effects</li></ul>',
                position: 'center',
                isIntro: true
            }
        ];
        
        console.log('SparksGuidedTourV2 initialized with', this.tourSteps.length, 'steps');
        console.log('Steps:', this.tourSteps.map(s => s.title));
        
        // Initialize DOM elements
        this.overlay = document.getElementById('tourOverlay');
        this.tooltip = document.getElementById('tourTooltip');
        this.highlightRing = document.getElementById('highlightRing');
        
        this.overlayPieces = {
            top: document.getElementById('overlay-top'),
            right: document.getElementById('overlay-right'),
            bottom: document.getElementById('overlay-bottom'),
            left: document.getElementById('overlay-left')
        };
        
        this.initializeEventListeners();
        this.createProgressDots();
    }
    
    get steps() {
        return this.tourSteps;
    }
    
    initializeEventListeners() {
        document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevStep());
        document.getElementById('closeBtn').addEventListener('click', () => this.closeTour());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // ESC key to close tour
            if (e.key === 'Escape') {
                // Clear any animations before closing
                const closeBtn = document.getElementById('closeBtn');
                if (closeBtn) closeBtn.style.animation = '';
                
                this.closeTour();
            }
            // Right arrow or down arrow for next step
            else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault(); // Prevent scrolling
                
                // If we're on the last step, close the tour with completion animation
                if (this.currentStep === this.tourSteps.length - 1) {
                    this.closeTour();
                }
                // Otherwise, go to the next step
                else if (this.currentStep < this.tourSteps.length - 1) {
                    this.nextStep();
                }
            }
            // Left arrow or up arrow for previous step
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault(); // Prevent scrolling
                if (this.currentStep > 0) {
                    this.prevStep();
                }
            }
        });
    }
    
    createProgressDots() {
        const container = document.getElementById('progressDots');
        container.innerHTML = '';
        
        console.log('Creating progress dots for', this.tourSteps.length, 'steps');
        
        this.tourSteps.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = `progress-dot ${index === 0 ? 'active' : ''}`;
            container.appendChild(dot);
        });
        
        console.log('Created', container.children.length, 'progress dots');
    }
    
    updateProgressDots() {
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentStep);
        });
    }
    
    calculateOverlayPieces(targetRect) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8;
        
        return {
            top: {
                left: 0,
                top: 0,
                width: vw,
                height: Math.max(0, targetRect.top - margin)
            },
            right: {
                left: targetRect.right + margin,
                top: Math.max(0, targetRect.top - margin),
                width: Math.max(0, vw - (targetRect.right + margin)),
                height: targetRect.height + (margin * 2)
            },
            bottom: {
                left: 0,
                top: targetRect.bottom + margin,
                width: vw,
                height: Math.max(0, vh - (targetRect.bottom + margin))
            },
            left: {
                left: 0,
                top: Math.max(0, targetRect.top - margin),
                width: Math.max(0, targetRect.left - margin),
                height: targetRect.height + (margin * 2)
            }
        };
    }
    
    positionTooltip(targetRect, position) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const margin = 25; // Increased margin
        let left, top;
        
        switch (position) {
            case 'center':
                left = (window.innerWidth / 2) - (tooltipRect.width / 2);
                top = (window.innerHeight / 2) - (tooltipRect.height / 2);
                break;
            case 'bottom':
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                top = targetRect.bottom + margin;
                break;
            case 'top':
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                top = targetRect.top - tooltipRect.height - margin;
                break;
            case 'left':
                left = targetRect.left - tooltipRect.width - margin;
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                break;
            case 'right':
                left = targetRect.right + margin;
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                break;
        }
        
        // Keep tooltip on screen (except for center position)
        if (position !== 'center') {
            // Ensure tooltip fits on screen with proper margins
            const screenMargin = 30;
            left = Math.max(screenMargin, Math.min(left, window.innerWidth - tooltipRect.width - screenMargin));
            
            // For vertical positioning, make sure the tooltip doesn't go off-screen
            // If it would go off-screen, position it at the top with a margin
            if (top + tooltipRect.height > window.innerHeight - screenMargin) {
                // If there's not enough space below, try to position above
                if (position === 'bottom' && targetRect.top > tooltipRect.height + margin) {
                    top = targetRect.top - tooltipRect.height - margin;
                } else {
                    // If there's not enough space above either, position at the top of the screen
                    top = screenMargin;
                }
            }
            
            // Ensure it doesn't go off the top of the screen
            top = Math.max(screenMargin, top);
        }
        
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }
    
    showIntroStep(title, content) {
        // Hide highlight ring for intro steps and ensure it's completely cleared
        this.highlightRing.style.opacity = '0';
        this.highlightRing.style.left = '0';
        this.highlightRing.style.top = '0';
        this.highlightRing.style.width = '0';
        this.highlightRing.style.height = '0';
        
        // Show full dark overlay for intro steps
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        this.overlayPieces.top.style.left = '0px';
        this.overlayPieces.top.style.top = '0px';
        this.overlayPieces.top.style.width = `${vw}px`;
        this.overlayPieces.top.style.height = `${vh}px`;
        
        // Hide other overlay pieces
        this.overlayPieces.right.style.width = '0px';
        this.overlayPieces.bottom.style.height = '0px';
        this.overlayPieces.left.style.width = '0px';
        
        // Completely reset highlight ring
        this.highlightRing.style.opacity = '0';
        this.highlightRing.style.width = '0px';
        this.highlightRing.style.height = '0px';
        
        // Update tooltip content and center it
        document.getElementById('tooltipTitle').textContent = title;
        
        // Parse content into paragraphs if it contains multiple paragraphs
        const tooltipContent = document.getElementById('tooltipContent');
        
        // Check if content has multiple paragraphs (containing double line breaks)
        if (content.includes('\n\n')) {
            // Create HTML with proper paragraph tags
            tooltipContent.innerHTML = content.split('\n\n')
                .map(paragraph => `<p>${paragraph.trim()}</p>`)
                .join('');
        } else {
            // Single paragraph - just set as text
            tooltipContent.innerHTML = `<p>${content}</p>`;
        }
        
        // Position tooltip in center
        setTimeout(() => {
            this.positionTooltip({}, 'center');
        }, 10);
    }
    
    highlightElement(selector, title, content, position) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return;
        }
        
        // Briefly hide the highlight ring for a smooth transition
        this.highlightRing.style.opacity = '0';
        
        const rect = element.getBoundingClientRect();
        const overlayPieces = this.calculateOverlayPieces(rect);
        
        // Position overlay pieces
        Object.keys(overlayPieces).forEach(key => {
            const piece = this.overlayPieces[key];
            const config = overlayPieces[key];
            
            piece.style.left = `${config.left}px`;
            piece.style.top = `${config.top}px`;
            piece.style.width = `${config.width}px`;
            piece.style.height = `${config.height}px`;
        });
        
        // Position highlight ring
        const margin = 8;
        this.highlightRing.style.left = `${rect.left - margin}px`;
        this.highlightRing.style.top = `${rect.top - margin}px`;
        this.highlightRing.style.width = `${rect.width + (margin * 2)}px`;
        this.highlightRing.style.height = `${rect.height + (margin * 2)}px`;
        
        // Short delay before showing the highlight ring for smoother transition
        setTimeout(() => {
            this.highlightRing.style.opacity = '1';
        }, 50);
        
        // Update tooltip content and position
        document.getElementById('tooltipTitle').textContent = title;
        
        // Parse content into paragraphs if it contains multiple paragraphs
        const tooltipContent = document.getElementById('tooltipContent');
        
        // Check if content has multiple paragraphs (containing double line breaks)
        if (content.includes('\n\n')) {
            // Create HTML with proper paragraph tags
            tooltipContent.innerHTML = content.split('\n\n')
                .map(paragraph => `<p>${paragraph.trim()}</p>`)
                .join('');
        } else {
            // Single paragraph - just set as text
            tooltipContent.innerHTML = `<p>${content}</p>`;
        }
        this.positionTooltip(rect, position);
    }
    
    // Create or get accessibility announcer element
    getAnnouncerElement() {
        let announcer = document.getElementById('tour-a11y-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'tour-a11y-announcer';
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'sr-only';
            announcer.style.position = 'absolute';
            announcer.style.width = '1px';
            announcer.style.height = '1px';
            announcer.style.padding = '0';
            announcer.style.margin = '-1px';
            announcer.style.overflow = 'hidden';
            announcer.style.clip = 'rect(0, 0, 0, 0)';
            announcer.style.whiteSpace = 'nowrap';
            announcer.style.border = '0';
            document.body.appendChild(announcer);
        }
        return announcer;
    }
    
    // Announce to screen readers
    announce(message) {
        const announcer = this.getAnnouncerElement();
        announcer.textContent = '';
        // Small delay to ensure the DOM update triggers a new announcement
        setTimeout(() => {
            announcer.textContent = message;
        }, 50);
    }
    
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.tourSteps.length) return;
        
        const step = this.tourSteps[stepIndex];
        
        // Announce step for screen readers
        const totalSteps = this.tourSteps.length;
        this.announce(`Step ${stepIndex + 1} of ${totalSteps}: ${step.title}`);
        
        // Execute beforeStep function if defined
        if (step.beforeStep && typeof step.beforeStep === 'function') {
            try {
                step.beforeStep.call(this);
            } catch (err) {
                console.error('Error executing beforeStep function:', err);
            }
        }
        
        console.log(`Showing step ${stepIndex + 1}/${this.tourSteps.length}:`, step.title, step.target);
        
        // For step 16 (country entry row), expand it BEFORE highlighting
        if (stepIndex === 15) {
            console.log('Preparing to show country entry row step...');
            
            // Find and expand EXAMPLE 1 details BEFORE highlighting
            const toggleIcon = document.querySelector('#receipt-item-EX1 .toggle-icon');
            if (toggleIcon) {
                // Expand it immediately
                const minusIcon = toggleIcon.querySelector('.toggle-minus');
                const plusIcon = toggleIcon.querySelector('.toggle-plus');
                
                // First update the icon states
                if (minusIcon) minusIcon.style.display = 'inline';
                if (plusIcon) plusIcon.style.display = 'none';
                
                // Then show the details panel
                const targetId = toggleIcon.getAttribute('data-target');
                if (targetId) {
                    const detailSection = document.getElementById(targetId);
                    if (detailSection) {
                        detailSection.style.display = 'block';
                        console.log('Country details expanded before highlighting');
                        
                        // Delay the highlighting to give time for the expansion to complete visually
                        setTimeout(() => {
                            // Now proceed with normal step display
                            if (step.isIntro) {
                                this.highlightRing.style.opacity = '0';
                                this.showIntroStep(step.title, step.content);
                            } else if (step.isSpecialStep) {
                                if (step.target) {
                                    this.highlightElement(step.target, step.title, step.content, step.position);
                                }
                            } else {
                                this.highlightElement(step.target, step.title, step.content, step.position);
                            }
                            
                            // Update navigation buttons after the delay
                            document.getElementById('prevBtn').disabled = stepIndex === 0;
                            const nextBtn = document.getElementById('nextBtn');
                            
                            if (stepIndex === this.tourSteps.length - 1) {
                                nextBtn.innerHTML = '<u>Finish</u>';
                            } else {
                                nextBtn.innerHTML = '<u>Next</u>';
                            }
                            
                            this.updateProgressDots();
                        }, 500); // Wait a half second before highlighting
                        
                        // Return early to prevent normal step display logic
                        return;
                    }
                }
            }
        }
        
        // Handle intro steps (centered content with no highlighting)
        if (step.isIntro) {
            // Clear any existing highlight
            this.highlightRing.style.opacity = '0';
            this.showIntroStep(step.title, step.content);
        } else if (step.isSpecialStep) {
            if (step.specialAction === 'openCanadaPopup') {
                // Special step to open Canada popup - keep map highlighted
                if (step.target) {
                    this.highlightElement(step.target, step.title, step.content, step.position);
                } else {
                    // Clear any existing highlight
                    this.highlightRing.style.opacity = '0';
                    this.showIntroStep(step.title, step.content);
                }
                
                // Execute special action to open Canada popup with shorter delay
                setTimeout(() => {
                    this.openCanadaPopup();
                }, 300);
            } else if (step.specialAction === 'populateReceiptWithExamples') {
                // Highlight the receipt section
                if (step.target) {
                    this.highlightElement(step.target, step.title, step.content, step.position);
                }
                
                // Execute special action to populate the receipt with examples
                setTimeout(() => {
                    this.populateReceiptWithExamples();
                }, 300);
            }
        } else {
            // Check if target element exists for regular steps
            const targetElement = document.querySelector(step.target);
            if (!targetElement) {
                console.warn(`Target element not found: ${step.target}`);
                
                // For popup targeting steps, popup may not be open yet
                if (step.targetPopup) {
                    // If we can't find popup elements, the popup might have closed
                    // Check if we can still see any popup-related elements
                    const popupContainer = document.querySelector('.popup-container');
                    if (!popupContainer) {
                        console.warn('Popup appears to be closed, attempting to reopen it');
                        
                        // Try to reopen the popup for Canada if it's closed and we're on a popup-related step
                        if (this.currentStep >= 5) {  // Step 5 and beyond need the popup
                            // Reopen the popup
                            this.openCanadaPopup();
                            
                            // Try again after the popup has reopened
                            setTimeout(() => {
                                this.showStep(this.currentStep);
                            }, 1500);
                            return;
                        }
                    }
                    
                    // Popup is visible but target element not found yet, wait longer
                    setTimeout(() => {
                        const retryElement = document.querySelector(step.target);
                        if (retryElement) {
                            this.highlightElement(step.target, step.title, step.content, step.position);
                        } else {
                            // Try one more time with an even longer delay
                            setTimeout(() => {
                                const secondRetryElement = document.querySelector(step.target);
                                if (secondRetryElement) {
                                    this.highlightElement(step.target, step.title, step.content, step.position);
                                } else {
                                    console.warn(`Target element still not found after retry: ${step.target}`);
                                    
                                    // If the popup is visible but we still can't find the element,
                                    // continue to the next step instead of getting stuck
                                    if (document.querySelector('.popup-container')) {
                                        console.log('Popup is open but element not found, continuing to next step');
                                        if (stepIndex < this.tourSteps.length - 1) {
                                            this.currentStep++;
                                            this.showStep(this.currentStep);
                                        }
                                    } else {
                                        // If popup disappeared again, try to reopen it
                                        console.log('Popup disappeared, trying to reopen');
                                        this.openCanadaPopup();
                                        setTimeout(() => {
                                            this.showStep(this.currentStep);
                                        }, 1500);
                                    }
                                }
                            }, 1000);
                        }
                    }, 1000);
                    return;
                }
                
                // Skip to next step if target doesn't exist
                if (stepIndex < this.tourSteps.length - 1) {
                    this.currentStep++;
                    this.showStep(this.currentStep);
                    return;
                }
            }
            
            this.highlightElement(step.target, step.title, step.content, step.position);
        }
        
        // Update navigation buttons
        document.getElementById('prevBtn').disabled = stepIndex === 0;
        const nextBtn = document.getElementById('nextBtn');
        
        // Always use consistent button text with underline
        if (stepIndex === this.tourSteps.length - 1) {
            nextBtn.innerHTML = '<u>Finish</u>';
        } else {
            nextBtn.innerHTML = '<u>Next</u>';
        }
        
        this.updateProgressDots();
    }
    
    start() {
        // Explicitly reset to the first step
        this.currentStep = 0;
        
        // Make overlay active
        this.overlay.classList.add('active');
        
        // Reset all progress dots
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === 0);
        });
        
        // Show the first step after a short delay
        setTimeout(() => {
            this.tooltip.classList.add('visible');
            this.showStep(0);
        }, 100);
    }
    
    nextStep() {
        // Close the popup only AFTER leaving the product-specific tariff step (the last popup step)
        if (this.currentStep === 11) { // Step 11 is when we're moving to the receipt section
            // Close the popup when leaving the very last popup-related step
            if (window.map && typeof window.map.closePopup === 'function') {
                window.map.closePopup();
            } else if (map && typeof map.closePopup === 'function') {
                map.closePopup();
            }
        }
        
        // Special case: If we're on the first popup detail step and moving to the second one, 
        // we need to make sure the popup stays open
        if (this.currentStep === 5) {
            // Keep popup open and ensure we can focus on the input field
            setTimeout(() => {
                // Check if popup is open and highlight the current tariff input
                const currentTariffInput = document.getElementById('currentTariffInput');
                if (currentTariffInput) {
                    // Scroll input into view if needed
                    currentTariffInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }
        
        // The expansion is now handled in showStep() for step 16
        
        // Clear any existing highlight before moving to the next step
        this.highlightRing.style.opacity = '0';
        
        // Check if we're on the last step
        if (this.currentStep === this.tourSteps.length - 1) {
            // If we're on the last step, we want to close the tour with the completion animation
            this.closeTour();
            
            // Close any open popups when finishing the tour
            if (window.map && typeof window.map.closePopup === 'function') {
                window.map.closePopup();
            }
        } else if (this.currentStep < this.tourSteps.length - 1) {
            // If we're not on the last step, proceed to the next step
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    }
    
    // Helper function removed to prevent errors
    
    prevStep() {
        // Only close the popup when navigating from the first popup container step back to the map
        if (this.currentStep === 5) { // First popup step (popup container)
            // Close the popup only when going from popup back to map
            if (window.map && typeof window.map.closePopup === 'function') {
                window.map.closePopup();
            } else if (map && typeof map.closePopup === 'function') {
                map.closePopup();
            }
        }
        
        // Clear any existing highlight
        this.highlightRing.style.opacity = '0';
        
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }
    
    closeTour() {
        // First hide tooltip and overlay
        this.tooltip.classList.remove('visible');
        this.overlay.classList.remove('active');
        this.highlightRing.style.opacity = '0';
        
        // Clean up any animations on the close button
        const closeBtn = document.getElementById('closeBtn');
        if (closeBtn) closeBtn.style.animation = '';
        
        // Remove animation style if it exists
        const animStyle = document.getElementById('pulse-animation-style');
        if (animStyle && animStyle.parentNode) {
            animStyle.parentNode.removeChild(animStyle);
        }
        
        // Close any open popups when closing the tour
        if (window.map && typeof window.map.closePopup === 'function') {
            window.map.closePopup();
        } else if (map && typeof map.closePopup === 'function') {
            map.closePopup();
        }
        
        // Clear receipt examples if they were added for the tour
        try {
            if (typeof devTools !== 'undefined' && typeof devTools.toggleReceipt === 'function') {
                // Turn off the receipt examples
                devTools.toggleReceipt(false);
            }
        } catch (error) {
            console.error('Error clearing receipt examples:', error);
        }
        
        // No completion message - removed for simplicity

        // Immediately clean up all tour elements
        this.cleanupTourElements();
        
        // Also reset the global tour instance to null to ensure fresh start next time
        guidedTour = null;
    }
    
    cleanupTourElements() {
        // Remove tour HTML elements from the DOM
        const elementsToRemove = [
            'tourOverlay',
            'tourTooltip',
            'tour-a11y-announcer',
            'tour-styles',
            'pulse-animation-style'
        ];
        
        elementsToRemove.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        console.log('Tour elements cleaned up');
    }
    
    // Removed product modal opening function
    
    openCanadaPopup() {
        console.log('Opening Canada popup for guided tour...');
        
        // Close any existing popups first to avoid conflicts
        if (window.map && typeof window.map.closePopup === 'function') {
            window.map.closePopup();
        } else if (map && typeof map.closePopup === 'function') {
            map.closePopup();
        }
        
        // Store a reference to the tour instance
        const self = this;
        
        // First, find Canada by ISO code and get its feature data
        if (window.geojsonLayer) {
            let canadaFound = false;
            
            window.geojsonLayer.eachLayer(function(layer) {
                if (layer.feature && layer.feature.properties && layer.feature.properties.ISO_A3 === 'CAN') {
                    // Get the center point of Canada
                    const bounds = layer.getBounds();
                    const center = bounds.getCenter();
                    
                    // Zoom to Canada with some padding
                    map.fitBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 4  // Limit how far we zoom in
                    });
                    
                    // Create a fake click event
                    const fakeEvent = { latlng: center };
                    
                    // Call the handler with the Canada feature and fake event
                    setTimeout(() => {
                        // Close any existing popups first
                        if (window.map && typeof window.map.closePopup === 'function') {
                            window.map.closePopup();
                        } else if (map && typeof map.closePopup === 'function') {
                            map.closePopup();
                        }
                        
                        // Add a minimal delay before opening the popup
                        setTimeout(() => {
                            try {
                                // Call the country click handler to open the popup
                                handleCountryClick(layer.feature, fakeEvent);
                                
                                // Check if popup appears after a short delay
                                setTimeout(() => {
                                    // Verify the popup has opened
                                    const popupContainer = document.querySelector('.popup-container');
                                    if (popupContainer) {
                                        console.log('Canada popup opened successfully for guided tour');
                                        
                                        // Set a value in the new tariff field to make it more obvious
                                        const newTariffInput = document.getElementById('newTariffInput');
                                        if (newTariffInput) {
                                            newTariffInput.value = '10.00';
                                        }
                                    } else {
                                        console.warn('Canada popup did not open as expected for guided tour');
                                    }
                                }, 500);
                            } catch (error) {
                                console.error('Error opening Canada popup:', error);
                            }
                        }, 200);
                    }, 300);
                    
                    canadaFound = true;
                }
            });
            
            if (!canadaFound) {
                console.warn('Could not find Canada on the map for the guided tour');
                
                // If Canada wasn't found, move to the next step after a delay
                setTimeout(() => {
                    if (self.currentStep < self.tourSteps.length - 1) {
                        self.currentStep += 2; // Skip the popup step too
                        self.showStep(self.currentStep);
                    }
                }, 3000);
            }
        } else {
            console.warn('GeoJSON layer not available for the guided tour');
            
            // If geojsonLayer is not available, move to the next step after a delay
            setTimeout(() => {
                if (self.currentStep < self.tourSteps.length - 1) {
                    self.currentStep += 2; // Skip the popup step too
                    self.showStep(self.currentStep);
                }
            }, 3000);
        }
    }
    
    populateReceiptWithExamples() {
        console.log('Populating receipt with examples for guided tour...');
        
        try {
            // Use the devTools function to add example countries to the receipt
            if (typeof devTools !== 'undefined' && typeof devTools.toggleReceipt === 'function') {
                // Show the receipt and populate it with examples
                devTools.toggleReceipt(true);
                
                // Wait a moment for the examples to be added
                setTimeout(() => {
                    // First collapse all examples to ensure clean state
                    document.querySelectorAll('.toggle-icon').forEach(toggle => {
                        const minusIcon = toggle.querySelector('.toggle-minus');
                        const plusIcon = toggle.querySelector('.toggle-plus');
                        if (minusIcon && minusIcon.style.display !== 'none') {
                            // It's expanded, so collapse it first
                            minusIcon.style.display = 'none';
                            if (plusIcon) plusIcon.style.display = 'inline';
                            
                            // Also hide the corresponding detail section
                            const targetId = toggle.getAttribute('data-target');
                            if (targetId) {
                                const detailSection = document.getElementById(targetId);
                                if (detailSection) detailSection.style.display = 'none';
                            }
                        }
                    });
                    
                    // We intentionally don't expand anything yet - we'll do that when we focus on the country row
                    
                    // Make trash icons visible by setting opacity and hover state
                    document.querySelectorAll('.remove-btn').forEach(btn => {
                        btn.style.opacity = '1';
                        
                        // Also add a small animation to draw attention to it
                        btn.style.transition = 'transform 0.3s ease';
                        btn.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            btn.style.transform = 'scale(1)';
                        }, 500);
                    });
                    
                    // Show chart icon if exists (for demonstrating additional features)
                    document.querySelectorAll('.chart-icon').forEach(icon => {
                        if (icon) icon.style.opacity = '1';
                    });
                    
                    // Set the Rest of World input to a non-zero value to show its effect
                    const restOfWorldInput = document.getElementById('global-row-input');
                    if (restOfWorldInput) {
                        restOfWorldInput.value = '5.00';
                        
                        // Trigger a change event to update the UI if needed
                        const event = new Event('change', { bubbles: true });
                        restOfWorldInput.dispatchEvent(event);
                        
                        // Also update the display value
                        const globalRowValue = document.getElementById('global-row-value');
                        if (globalRowValue) {
                            globalRowValue.textContent = '0.50%';
                        }
                        
                        // Make the global toggle icon visible
                        const globalToggleIcon = document.getElementById('global-toggle-icon');
                        if (globalToggleIcon) {
                            globalToggleIcon.style.display = 'inline';
                        }
                    }
                    
                    // Also update subtotal and total values to reflect our example data
                    const subtotalValue = document.getElementById('subtotal-value');
                    if (subtotalValue) subtotalValue.textContent = '3.50%';
                    
                    const totalEffect = document.getElementById('total-effect');
                    if (totalEffect) totalEffect.textContent = '4.00%';
                    
                }, 500);
            } else {
                console.warn('devTools.toggleReceipt function not available');
            }
        } catch (error) {
            console.error('Error populating receipt with examples:', error);
        }
    }
}