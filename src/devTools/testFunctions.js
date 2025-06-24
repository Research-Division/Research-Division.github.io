/**
 * Test Functions for Sparks Graphing System
 * 
 * 
 *  THIS IS DEPRECIATED NEEDS TO BE REMOVED
 * This module contains test functions for verifying the functionality
 * of various components in the Sparks Graphing system.
 */

// Create a self-executing anonymous function to avoid polluting the global namespace
var testFunctions = (function() {
    // Flag to track if a test should be cancelled
    let shouldCancel = false;
    
    /**
     * Test the North America Agriculture Tariff
     * @returns {Promise<boolean>} Whether the test passed
     */
    async function testNorthAmericaAgTariff() {
        // This is a placeholder - replace with actual test
        console.log('Running North America Agriculture Tariff test...');
        return new Promise(resolve => {
            setTimeout(() => {
                // Simulated test result
                resolve(true);
            }, 500);
        });
    }
    
    /**
     * Test the Global Tariff
     * @returns {Promise<boolean>} Whether the test passed
     */
    async function testGlobalTariff() {
        // This is a placeholder - replace with actual test
        console.log('Running Global Tariff test...');
        return new Promise(resolve => {
            setTimeout(() => {
                // Simulated test result
                resolve(true);
            }, 500);
        });
    }
    
    /**
     * Test the Bilateral Tariff Charts
     * @returns {Promise<boolean>} Whether the test passed
     */
    async function testBilateralTariffCharts() {
        // This is a placeholder - replace with actual test
        console.log('Running Bilateral Tariff Charts test...');
        return new Promise(resolve => {
            setTimeout(() => {
                // Simulated test result
                resolve(true);
            }, 500);
        });
    }
    
    /**
     * Test the Treemap Drill Down functionality
     * This tests the calculateDrillDownData function that transforms continent data to industry sectors
     * @returns {Promise<boolean>} Test result
     */
    async function testTreemapDrillDown() {
        try {
            console.log('Testing Treemap Drill Down function...');
            
            // Make sure the required modules are available
            if (!window.sparksTreemapTransformUtils || !window.sparksTreemapTransformUtils.calculateDrillDownData) {
                console.error('sparksTreemapTransformUtils.calculateDrillDownData not found!');
                return false;
            }
            
            // Load the test data
            const response = await fetch('data/trade_data/country_treemaps/country_trade_hierarchy_bea.json');
            const data = await response.json();
            
            // Check if the data has the expected structure
            if (!data.continents || !Array.isArray(data.continents)) {
                console.error('Invalid data structure: continents array not found');
                return false;
            }
            
            // Log available continents
            const continentNames = data.continents.map(c => c.name).join(', ');
            console.log(`Available continents: ${continentNames}`);
            
            // --- Test 1: Continent to Industry ---
            const continentName = 'Africa';
            console.log(`Test 1: Continent to Industry - Testing drill down for ${continentName}...`);
            
            // Call the calculateDrillDownData function
            const result = window.sparksTreemapTransformUtils.calculateDrillDownData(
                data,
                continentName,
                'continentToIndustry',
                'imports',
                { breakdownType: 'sector' }
            );
            
            // Check if the result has the expected structure
            if (!result || !result[continentName]) {
                console.error(`No data returned for ${continentName}`);
                return false;
            }
            
            // Log the result summary
            const continentData = result[continentName];
            console.log(`${continentName} result:`, continentData);
            
            // Validate the children data (should have sectors)
            if (!continentData.children || !Array.isArray(continentData.children) || continentData.children.length === 0) {
                console.error(`No sector data found for ${continentName}`);
                return false;
            }
            
            // Log the sectors found
            const sectors = continentData.children.map(sector => `${sector.name} (${sector.id}): ${sector.value}`);
            console.log(`Sectors found:`, sectors);
            
            // Format the data for treemap
            const treemapData = {
                name: `${continentName} by Industry`,
                children: continentData.children,
                value: continentData.value
            };
            
            console.log('Formatted data for treemap:', treemapData);
            
            // --- Test 2: Industry to Country ---
            // Get first industry ID from the sectors we found
            const industryId = continentData.children[0]?.id;
            if (!industryId) {
                console.error('No industry ID found for testing industry-to-country');
                return false;
            }
            
            console.log(`Test 2: Industry to Country - Testing drill down for industry ${industryId}...`);
            
            // Call the calculateDrillDownData function for industry to country
            const industryResult = window.sparksTreemapTransformUtils.calculateDrillDownData(
                data,
                industryId,
                'industryToCountry',
                'imports',
                {}
            );
            
            // Check if the result has the expected structure
            if (!industryResult || Object.keys(industryResult).length === 0) {
                console.error(`No data returned for industry ${industryId}`);
                return false;
            }
            
            // Get the industry data
            const industryName = Object.keys(industryResult)[0];
            const industryData = industryResult[industryName];
            console.log(`Industry ${industryId} (${industryName}) result:`, industryData);
            
            // Validate the children data (should have continents)
            if (!industryData.children || !Array.isArray(industryData.children) || industryData.children.length === 0) {
                console.error(`No continent data found for industry ${industryId}`);
                return false;
            }
            
            // Log the continents found
            const continents = industryData.children.map(continent => 
                `${continent.name}: ${continent.value} (${continent.children.length} countries)`
            );
            console.log(`Continents with ${industryName}:`, continents);
            
            // Both tests passed
            return true;
        } catch (error) {
            console.error('Error testing treemap drill down:', error);
            return false;
        }
    }
    
    /**
     * Run all tests in sequence
     * @returns {Promise<Object>} Results of all tests
     */
    async function runAllTests() {
        // Reset cancel flag
        shouldCancel = false;
        
        const results = {};
        
        try {
            // Run each test and store the result
            results['North America Agriculture Tariff'] = await testNorthAmericaAgTariff();
            if (shouldCancel) return results;
            
            results['Global Tariff Test'] = await testGlobalTariff();
            if (shouldCancel) return results;
            
            results['Bilateral Tariff Charts Test'] = await testBilateralTariffCharts();
            if (shouldCancel) return results;
            
            results['Treemap Drill Down Test'] = await testTreemapDrillDown();
            
            return results;
        } catch (error) {
            console.error('Error running all tests:', error);
            return results;
        }
    }
    
    /**
     * Cancel any running tests
     */
    function cancelTest() {
        shouldCancel = true;
        console.log('Test cancelled');
    }
    
    // Return public methods
    return {
        testNorthAmericaAgTariff,
        testGlobalTariff,
        testBilateralTariffCharts,
        testTreemapDrillDown,
        runAllTests,
        cancelTest
    };
})();