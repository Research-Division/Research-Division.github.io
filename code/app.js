/**
 * Main Application Script
 * 
 * This file initializes the application and loads all required components.
 */

// Application state and configuration
const AppState = {
    isInitialized: false,
    dataLoaded: false,
    selectedCountries: []
};

// Initialize the application
function initApp() {
    
    // Initialize global arrays
    window.selectedISOs = [];
    if (!window.isoToCountryName) {
        window.isoToCountryName = {};
    }
    
    // Load essential components
    loadEssentialComponents()
        .then(() => {
            
            // Set up DOM event listeners
            setupEventListeners();
            
            // Initialize modules
            initializeModules();
            
            // Mark app as initialized
            AppState.isInitialized = true;
            
            // Load data after initialization
            loadData();
        })
        .catch(error => {
            console.error("Error initializing application:", error);
            showErrorMessage("Failed to initialize application. Please refresh the page.");
        });
}

// Load essential components (CSS, JS libraries)
async function loadEssentialComponents() {
    // Add any additional component loading here
    
    // Ensure the modal container exists
    if (!document.getElementById('modal-container')) {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        document.body.appendChild(modalContainer);
    }
    
    // Ensure the receipt container exists
    const receiptSection = document.querySelector('.receipt-section');
    if (receiptSection) {
        if (!document.getElementById('receipt-container')) {
            const receiptContainer = document.createElement('div');
            receiptContainer.id = 'receipt-container';
            receiptSection.appendChild(receiptContainer);
        }
        
        // Load the initial receipt template
        try {
            const response = await fetch(DataPaths.components.receipt.container);
            const html = await response.text();
            document.getElementById('receipt-container').innerHTML = html;
        } catch (error) {
            console.warn("Could not load receipt template:", error);
            // Create a default empty receipt
            document.getElementById('receipt-container').innerHTML = `
                <div class="receipt-paper">
                    <div class="receipt-header">
                        <h3>Tariff Effects Receipt</h3>
                        <p class="receipt-subtitle">No tariff changes applied yet</p>
                    </div>
                    <div class="receipt-body">
                        <p class="receipt-empty-message">Select countries and apply tariffs to see economic effects</p>
                    </div>
                    <div class="receipt-footer">
                        <p>Ready for your tariff analysis</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Create tariff-tree element if needed
    if (!document.getElementById('tariff-tree')) {
        const treeContainer = document.createElement('div');
        treeContainer.id = 'tariff-tree';
        
        // Append to modal-container as a placeholder - will be properly positioned by the product modal HTML
        document.getElementById('modal-container').appendChild(treeContainer);
    }
    
    return Promise.resolve();
}

// Set up DOM event listeners
function setupEventListeners() {
    // Global click handlers for buttons
    document.addEventListener('click', function(event) {
        // Country selection modal button
        if (event.target.matches('#open-country-modal-btn')) {
            if (window.tariffModals && typeof window.tariffModals.openCountryModal === 'function') {
                window.tariffModals.openCountryModal();
            }
        }
        
        // Global tariff modal button
        if (event.target.matches('#open-global-modal-btn')) {
            if (window.tariffModals && typeof window.tariffModals.openGlobalModal === 'function') {
                window.tariffModals.openGlobalModal();
            }
        }
        
        // Clear calculations button
        if (event.target.matches('#clear-calculations-btn')) {
            // Use the more comprehensive clearCountries function that ensures complete cleanup
            if (window.clearCountries && typeof window.clearCountries === 'function') {
                window.clearCountries();
            } else if (window.TariffCalculations && typeof window.TariffCalculations.clearScenarioResults === 'function') {
                // Fallback to the basic clearScenarioResults if clearCountries is not available
                window.TariffCalculations.clearScenarioResults();
            }
        }
    });
    
    // Listen for custom events
    document.addEventListener('calculationComplete', function(event) {
        
        // Update the receipt display
        if (window.ReceiptModule && typeof window.ReceiptModule.updateReceiptDisplay === 'function') {
            window.ReceiptModule.updateReceiptDisplay();
        }
        
        // Update map colors if available
        if (window.updateMapColors && typeof window.updateMapColors === 'function') {
            window.updateMapColors();
        }
    });
    
    document.addEventListener('calculationsCleared', function() {
        
        // Update the receipt display
        if (window.ReceiptModule && typeof window.ReceiptModule.updateReceiptDisplay === 'function') {
            window.ReceiptModule.updateReceiptDisplay();
        }
        
        // Reset map colors if available
        if (window.resetMapColors && typeof window.resetMapColors === 'function') {
            window.resetMapColors();
        }
    });
}

// Initialize modules
function initializeModules() {
    // Initialize receipt module if available
    if (window.ReceiptModule && typeof window.ReceiptModule.initReceipt === 'function') {
        window.ReceiptModule.initReceipt();
    }
    
    // Make sure we have a global productListModule object
    if (!window.productListModule) {
        window.productListModule = {};
        
        // Add setCurrentCountry method if the function exists in the global scope
        if (typeof setCurrentCountry === 'function') {
            window.productListModule.setCurrentCountry = setCurrentCountry;
        }
        
        // Add handleTariffSubmit method if the function exists in the global scope
        if (typeof handleTariffSubmit === 'function') {
            window.productListModule.handleTariffSubmit = handleTariffSubmit;
        } else {
            // Create a default implementation
            window.productListModule.handleTariffSubmit = function() {
                // Close modals
                if (window.tariffModals && window.tariffModals.closeAllModals) {
                    window.tariffModals.closeAllModals();
                }
            };
        }
    }
}

// Load application data
function loadData() {
    
    // Load country ISO mapping
    fetch(DataPaths.meta.country_iso_mapping)
        .then(response => response.json())
        .then(data => {
            window.isoToCountryName = data;
            
            // Load matrices for calculations
            return loadCalculationMatrices();
        })
        .then(() => {
            AppState.dataLoaded = true;
        })
        .catch(error => {
            console.error("Error loading application data:", error);
            showErrorMessage("Failed to load application data. Some features may not work correctly.");
        });
}

// Load calculation matrices
async function loadCalculationMatrices() {
    if (window.TariffCalculations) {
        try {
            // Load and cache the matrices
            await fetch(DataPaths.calculations.direct_matrix)
                .then(response => response.json())
                .then(data => {
                });
                
            await fetch(DataPaths.calculations.indirect_matrix)
                .then(response => response.json())
                .then(data => {
                });
                
        } catch (error) {
            console.error("Error loading calculation matrices:", error);
            throw error;
        }
    } else {
        console.warn("TariffCalculations module not available, skipping matrix loading");
    }
}

// Show error message to user
function showErrorMessage(message) {
    alert(message);
}

// Expose functions needed by productList.js
window.addISO = function(iso) {
    if (!window.selectedISOs) {
        window.selectedISOs = [];
    }
    
    if (!window.selectedISOs.includes(iso)) {
        window.selectedISOs.push(iso);
    }
};

window.removeISO = function(iso) {
    if (!window.selectedISOs) return;
    
    window.selectedISOs = window.selectedISOs.filter(item => item !== iso);
};

window.clearSelectedCountries = function() {
    window.selectedISOs = [];
};

// Initialize the application when the document is ready
document.addEventListener('DOMContentLoaded', initApp);