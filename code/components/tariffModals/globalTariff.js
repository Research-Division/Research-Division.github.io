/**
 * globalTariff.js - Global tariff handling module
 * 
 * This module handles applying tariffs globally to all countries.
 * It uses the CountrySelectionModal's "Select All Countries" functionality
 * to apply tariffs to all countries at once.
 */

// Create a simple global function for opening the global tariff modal
window.openGlobalTariffModal = function() {
    // First, make sure we have the required modules
    if (!window.CountrySelectionModal) {
        console.error('CountrySelectionModal not available. Please try again later.');
        alert('Error: Required modules not properly initialized. Please try again later.');
        return;
    }
    
    // Check for existing modals and remove them first
    const existingModals = document.querySelectorAll('.modal');
    existingModals.forEach(modal => {
        // Check if this is our modal or a different one
        if (modal.id === 'modal-country-selection' || modal.id === 'modal-product-list') {
            // Close it properly first to ensure event listeners are cleaned up
            if (modal.id === 'modal-country-selection' && window.CountrySelectionModal) {
                window.CountrySelectionModal.closeModal();
            }
            if (modal.id === 'modal-product-list' && window.ProductTariffModal) {
                window.ProductTariffModal.closeModal('modal-product-list', true);
            }
            // Then remove it from the DOM
            modal.parentNode.removeChild(modal);
        }
    });
    
    // Force re-initialization to ensure a clean state
    window.CountrySelectionModal.initialize().then(() => {
        // Open the modal
        window.CountrySelectionModal.openModal();
        
        // Find the "Select All Countries" button and click it programmatically
        setTimeout(() => {
            const selectAllBtn = document.getElementById('select-all-countries');
            if (selectAllBtn) {
                selectAllBtn.click();
                
                // Then click the "Continue to Tariff Selection" button
                setTimeout(() => {
                    const continueBtn = document.getElementById('continue-to-tariff');
                    if (continueBtn) {
                        continueBtn.click();
                    } else {
                        console.error('Continue to Tariff button not found');
                    }
                }, 100);
            } else {
                console.error('Select All Countries button not found');
            }
        }, 100);
    });
};

// Module pattern for encapsulation
var GlobalTariffModule = (function() {
    // Module state
    let countryList = [];
    
    /**
     * Initialize the global tariff module
     */
    function initialize() {
        // Load country list when needed
        loadCountryList();
        
        // Update the placeholder message button if it exists
        const globalBtn = document.getElementById('btn-global-list');
        if (globalBtn) {
            globalBtn.onclick = window.openGlobalTariffModal;
        }
        
        return true;
    }
    
    /**
     * Load the list of all available countries
     */
    async function loadCountryList() {
        try {
            // Load country ISO mapping
            const response = await fetch(DataPaths.meta.country_iso_mapping);
            if (!response.ok) {
                console.error(`Failed to load country mapping: ${response.status}`);
                return;
            }
            
            const countryMapping = await response.json();
            
            // Extract all country ISOs from the mapping
            countryList = Object.keys(countryMapping);
            
        } catch (error) {
            console.error('Error loading country list:', error);
        }
    }
    
    /**
     * Get the list of countries
     */
    function getCountryList() {
        // If the country list is empty, return a default list of major economies
        if (!countryList || countryList.length === 0) {
            return ['USA', 'CAN', 'MEX', 'CHN', 'JPN', 'GBR', 'DEU', 'FRA', 'ITA', 'BRA', 'IND'];
        }
        return countryList;
    }
    
    /**
     * Open the product tariff modal in global mode
     */
    function openGlobalTariffModal() {
        // Use the global function for simplicity
        window.openGlobalTariffModal();
    }
    
    // Initialize immediately
    initialize();
    
    // Public API
    return {
        initialize,
        openGlobalTariffModal,
        getCountryList
    };
})();
