/**
 * Continent Mapper Example
 * 
 * This file demonstrates how to use the continentMapper utility
 * to add continent information to trade and tariff data.
 * 
 *  Not used frequently. Might be depreciated with newer direct mapping. 
 */

// Example function to demonstrate using the continentMapper
async function continentMapperDemo() {
    //console.log
('Starting continentMapper demo...');
    
    try {
        // Step 1: Initialize the continentMapper
        await window.continentMapper.initialize();
        //console.log
('ContinentMapper initialized');
        
        // Step 2: Load sample trade data (DataPaths.trade_data.country_series)
        const tradeResponse = await fetch(window.DataPaths.trade_data.country_series);
        const tradeData = await tradeResponse.json();
        //console.log
(`Loaded ${tradeData.length} country trade records`);
        
        // Step 3: Load sample tariff data (window.DataPaths.bilateral_tariffs.all_countries)
        const tariffResponse = await fetch(window.DataPaths.trade_data.country_series);
        const tariffData = await tariffResponse.json();
        //console.log
(`Loaded tariff data with ${Object.keys(tariffData).length} countries`);
        
        // Step 4: Enrich trade data with continents
        // This automatically detects the 'iso3' field
        const enrichedTradeData = window.continentMapper.enrichDataWithContinents(
            tradeData.slice(0, 5), // Just use first 5 items for demo
            { inPlace: false }
        );
        //console.log
('Enriched trade data sample:', enrichedTradeData);
        
        // Step 5: Enrich tariff data with continents
        // This handles object structure with country_code inside
        const sampleTariffCountries = Object.keys(tariffData).slice(0, 5);
        const sampleTariffData = {};
        sampleTariffCountries.forEach(code => {
            sampleTariffData[code] = tariffData[code];
        });
        
        const enrichedTariffData = window.continentMapper.enrichDataWithContinents(
            sampleTariffData,
            { inPlace: false }
        );
        //console.log
('Enriched tariff data sample:', enrichedTariffData);
        
        // Step 6: Group trade data by continent
        const groupedTradeData = window.continentMapper.groupDataByContinents(
            tradeData.filter(item => item.metric === 'impVal').slice(0, 20) // Filter for demo
        );
        //console.log
('Grouped trade data by continent:', 
            Object.fromEntries(
                Object.entries(groupedTradeData).map(([continent, items]) => 
                    [continent, `${items.length} countries`])
            )
        );
        
        // Step 7: Get continent statistics
        const continentStats = window.continentMapper.getContinentStats(tradeData.slice(0, 50));
        ////console.log

('Continent statistics:', continentStats);
        
        // Step 8: Individual ISO3 lookup examples
        //console.log
('Continent for CHN:', window.continentMapper.getContinentForIso3('CHN'));
        //console.log
('Continent for GBR:', window.continentMapper.getContinentForIso3('GBR'));
        //console.log
('Continent for CAN:', window.continentMapper.getContinentForIso3('CAN'));
        //console.log
('Continent for BRA:', window.continentMapper.getContinentForIso3('BRA'));
        //console.log
('Continent for ZAF:', window.continentMapper.getContinentForIso3('ZAF'));
        //console.log
('Continent for AUS:', window.continentMapper.getContinentForIso3('AUS'));
        
        return {
            status: 'success',
            message: 'Demo completed successfully'
        };
    } catch (error) {
        console.error('Error in continentMapper demo:', error);
        return {
            status: 'error',
            message: error.message
        };
    }
}

// Execute the demo function if this file is loaded directly
if (typeof window !== 'undefined' && window.location.pathname.includes('continentMapperExample')) {
    document.addEventListener('DOMContentLoaded', async () => {
        const result = await continentMapperDemo();
        
        // Display result on page if available
        const resultContainer = document.getElementById('result-container');
        if (resultContainer) {
            resultContainer.textContent = JSON.stringify(result, null, 2);
        }
    });
}