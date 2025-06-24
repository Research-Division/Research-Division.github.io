/**
 * Load and process real trade data
 * 
 * This script tests loading and processing the actual SHORT_hs_trade_data_combined.json file
 * which will be used in the final implementation.
 * 
 * Might be repreciated 
 */

// In a browser environment, this would be imported via script tags
// Here we'll simulate a Node.js environment for testing
const fs = require('fs');
const path = require('path');

// Import our modules
const CompressedTreemap = require('./index');
const { MetadataProvider, CompressedDataAdapter, TreemapLayout } = CompressedTreemap;

// Load the real data
const dataPath = path.join(
  __dirname, 
  '../../../../data/trade_data/multi_year/SHORT_hs_trade_data_combined.json'
);

// Test function
async function loadRealData() {
 // console.log('Loading real trade data...');
  
  try {
    // Check if file exists
    if (!fs.existsSync(dataPath)) {
      console.error(`Data file not found at ${dataPath}`);
      return;
    }
    
    // Load data
    const rawData = fs.readFileSync(dataPath, 'utf8');
    //console.log(`Loaded data file (${(rawData.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Parse JSON
    //console.log('Parsing JSON...');
    const data = JSON.parse(rawData);
    //console.log('JSON parsed successfully');
    
    // Basic data structure check
    //console.log('Data structure:');
    //console.log('- Metadata entries:', Object.keys(data.metadata || {}).length);
    //console.log('- Years:', data.years?.join(', '));
    /*console.log('- Data types:', Object.keys(data).filter(key => 
      typeof data[key] === 'object' && 
      !Array.isArray(data[key]) && 
      key !== 'metadata' && 
      key !== 'years' &&
      key !== 'configTemplate'
    ));*/
    
    // Process with our adapter
    //console.log('\nTesting data adapter...');
    const metadataProvider = new MetadataProvider(data.metadata || {});
    const adapter = new CompressedDataAdapter(metadataProvider);
    
    // Get the latest year
    const year = data.years ? data.years[data.years.length - 1] : '2023';
    const dataType = 'imports';
    
    //console.log(`Processing ${dataType} data for ${year}...`);
    const startTime = Date.now();
    
    const convertedData = adapter.convertMultiYearData(data, {
      year,
      dataType
    });
    
    const processingTime = Date.now() - startTime;
    //console.log(`Data processed in ${processingTime}ms`);
    
    if (!convertedData || !convertedData.rootNode) {
      console.error('Failed to convert data');
      return;
    }
    
    // Show some information about the converted data
    //console.log('\nConverted data:');
    //console.log('- Root node name:', convertedData.rootNode.name);
    //console.log('- Child count:', convertedData.rootNode.children.length);
    if (convertedData.rootNode.children.length > 0) {
      //console.log('- First child name:', convertedData.rootNode.children[0].name);
      //console.log('- First child value:', convertedData.rootNode.children[0].value);
      
      if (convertedData.rootNode.children[0].children.length > 0) {
        //console.log('- First grandchild name:', convertedData.rootNode.children[0].children[0].name);
        //console.log('- First grandchild value:', convertedData.rootNode.children[0].children[0].value);
      }
    }
    
    // Try layout calculation
    //console.log('\nTesting layout calculation...');
    const layoutStart = Date.now();
    
    const layout = new TreemapLayout({ animate: false });
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    layout.calculateLayout(convertedData.rootNode, bounds);
    
    const layoutTime = Date.now() - layoutStart;
    //console.log(`Layout calculated in ${layoutTime}ms`);
    
    // Test drill-down functionality
    //console.log('\nTesting drill-down functionality...');
    
    // Get a continent ID from the first child
    const continentId = convertedData.rootNode.children[0].id;
    //console.log(`Extracting data for continent: ${continentId} (${convertedData.rootNode.children[0].name})`);
    
    const continentData = CompressedTreemap.extractContinentData(data, year, dataType, continentId);
    if (continentData) {
      //console.log(`- Extracted continent data: ${continentData.continentName}`);
      //console.log(`- Child count: ${continentData.rootNode.children.length}`);
    }
    
    // Get industry breakdown
    //console.log('\nTesting industry breakdown...');
    const industryData = CompressedTreemap.getIndustryBreakdown(data, year, dataType, continentId);
    if (industryData) {
      //console.log(`- Industry breakdown for: ${industryData.rootNode.name}`);
      //console.log(`- Industry categories: ${industryData.rootNode.children.length}`);
      industryData.rootNode.children.forEach(category => {
        //console.log(`  - ${category.name}: $${(category.value / 1e9).toFixed(2)} billion`);
      });
    }
    
    consol//e.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
loadRealData();