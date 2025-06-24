/**
 * tariffModalIntegration.js - Integration for tariff modals
 * 
 * This file provides a unified interface for tariff modals functionality,
 * connecting the receipt placeholder buttons with the correct tariff modals.
 */

// Create the tariff modals namespace
window.tariffModals = (function() {
    
    /**
     * Initialize all tariff modals
     */
    function initialize() {
        // Initialize the product tariff modal if needed
        if (window.initializeProductTariffModal && typeof window.initializeProductTariffModal === 'function') {
            window.initializeProductTariffModal();
        }
        
        // Replace inline onclick handlers with proper event listeners
        setupEventListeners();
        
    }
    
    /**
     * Setup event listeners for tariff modal buttons
     */
    function setupEventListeners() {
        // Find buttons and replace onclick handlers
        const countryBtn = document.getElementById('btn-country-list');
        const globalBtn = document.getElementById('btn-global-list');
        
        if (countryBtn) {
            // Remove any existing event listeners by cloning the node
            const newCountryBtn = countryBtn.cloneNode(true);
            countryBtn.parentNode.replaceChild(newCountryBtn, countryBtn);
            
            // Add fresh event listener
            newCountryBtn.addEventListener('click', openCountryModal);
        }
        
        if (globalBtn) {
            // Remove any existing event listeners by cloning the node
            const newGlobalBtn = globalBtn.cloneNode(true);
            globalBtn.parentNode.replaceChild(newGlobalBtn, globalBtn);
            
            // Add fresh event listener
            newGlobalBtn.addEventListener('click', openGlobalModal);
        }
        
        // Add event listener to document to ensure modals can be properly reinitialized 
        // when the country button is pressed after the modal was closed with Escape - Fix for Jareds error.
        /*
        document.addEventListener('DOMNodeInserted', function(e) {
            if (e.target && e.target.id === 'btn-country-list') {
                // New country button inserted, add event listener
                e.target.addEventListener('click', openCountryModal);
            }
            if (e.target && e.target.id === 'btn-global-list') {
                // New global button inserted, add event listener
                e.target.addEventListener('click', openGlobalModal);
            }
        }); */
    }
    
    /**
     * Open the country selection modal
     */
    function openCountryModal() {        
        // Use the country selection modal if available
        if (window.openCountrySelectionModal && typeof window.openCountrySelectionModal === 'function') {
            window.openCountrySelectionModal();
        } else {
            console.error('Country selection modal not available');
            alert('Country selection modal not available. Please try again later.');
        }
    }
    
    /**
     * Open the global tariff modal
     */
    function openGlobalModal() {
        
        // Use the GlobalTariffModule if available
        if (window.GlobalTariffModule && typeof window.GlobalTariffModule.openGlobalTariffModal === 'function') {
            window.GlobalTariffModule.openGlobalTariffModal();
        } else {
            console.error('Global tariff module not available');
            alert('Global tariff module not available. Please try again later.');
        }
    }
        
    // Initialize right away and also on DOMContentLoaded
    initialize();
    document.addEventListener('DOMContentLoaded', initialize);
    
    // Public API
    return {
        initialize,
        openCountryModal,
        openGlobalModal
    };
})();