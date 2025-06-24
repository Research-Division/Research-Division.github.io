/**
 * Testing Environment for Sparks Graph Functions
 * Initializes the library and sets up event handlers
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the Sparks Graph Functions
    if (window.sparksGraphFunctions && window.sparksGraphFunctions.initialize) {
        window.sparksGraphFunctions.initialize();
        //console.log('Sparks Graph Functions initialized');
    } else {
        //console.error('sparksGraphFunctions not available');
    }
    
    // Initialize the modal manager
    if (window.sparksGraphModal && window.sparksGraphModal.initialize) {
        window.sparksGraphModal.initialize();
        //console.log('Sparks Graph Modal initialized');
    }
    
    // Initialize the multi-chart panel
    if (window.multiChartPanel && window.multiChartPanel.initialize) {
        window.multiChartPanel.initialize();
        //console.log('Multi-chart panel initialized');
    } else {
        //console.error('multiChartPanel not available');
    }
    
    // Add click handler for the multi-chart panel button
    const multiChartButton = document.getElementById('show-multi-chart-panel');
    if (multiChartButton) {
        multiChartButton.addEventListener('click', function() {
            //console.log('Multi-chart panel button clicked');
            
            if (window.multiChartPanel && window.multiChartPanel.showPanel) {
                window.multiChartPanel.showPanel();
            } else {
                //console.error('multiChartPanel.showPanel not available');
            }
        });
        
        //console.log('Click handler added to multi-chart panel button');
    } else {
        //console.error('Multi-chart panel button not found');
    }
    
    // Add click handler for the globe icon (global trade charts)
    const globalTradeButton = document.getElementById('show-global-trade-panel');
    if (globalTradeButton) {
        globalTradeButton.addEventListener('click', function() {
            //console.log('Global trade panel button clicked');
            
            if (window.globalTradeCharts && window.globalTradeCharts.showPanel) {
                window.globalTradeCharts.showPanel();
            } else {
                //console.error('globalTradeCharts.showPanel not available');
            }
        });
        
        //console.log('Click handler added to global trade panel button');
    } else {
        //console.error('Global trade panel button not found');
    }
    
    // Add click handler for the line chart icon
    const chartIcon = document.getElementById('open-charts-modal');
    if (chartIcon) {
        chartIcon.addEventListener('click', function() {
            //console.log('Line chart icon clicked');
            
            // Open the line chart modal
            if (window.sparksGraphModal && window.sparksGraphModal.openLineChartsModal) {
                window.sparksGraphModal.openLineChartsModal();
            } else {
                //console.error('sparksGraphModal.openLineChartsModal not available');
            }
        });
        
        //console.log('Click handler added to line chart icon');
    } else {
        //console.error('Line chart icon element not found');
    }
    
    // Add click handler for the bar chart icon (industry icon class is obsolete, checking for ID instead)
    const barChartIcon = document.querySelector('.industry-icon:not(#show-global-trade-panel)');
    if (barChartIcon) {
        barChartIcon.addEventListener('click', function() {
            //console.log('Bar chart icon clicked');
            
            // Open the bar chart modal
            if (window.sparksGraphModal && window.sparksGraphModal.openBarChartsModal) {
                window.sparksGraphModal.openBarChartsModal();
            } else {
                //console.error('sparksGraphModal.openBarChartsModal not available');
            }
        });
        
        //console.log('Click handler added to bar chart icon');
    } else {
        //console.error('Bar chart icon element not found');
    }
    
    // Settings icon opens dev tools
    const settingsIcon = document.querySelector('.settings-icon');
    if (settingsIcon) {
        settingsIcon.addEventListener('click', function() {
            if (typeof devTools !== 'undefined' && devTools.open) {
                devTools.open();
            }
        });
    }
    
    // Tariff test button removed as per requirements
    const headerRight = document.getElementById('header-right');
});