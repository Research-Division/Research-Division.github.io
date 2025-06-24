/**
 * Creates a bar chart data configuration object from two series of values and a set of category names.
 * 
 * @param {Array<number>} seriesA - Array of values for the first series
 * @param {Array<number>} seriesB - Array of values for the second series
 * @param {Array<string>} categoryNames - Array of category names corresponding to each index
 * @param {string} seriesAName - Display name for the first series
 * @param {string} seriesBName - Display name for the second series
 * @returns {Object} Bar chart configuration object ready for use with sparksBarChart
 */
function createBarChartData(seriesA, seriesB, categoryNames, seriesAName, seriesBName) {
    // Validate inputs
    if (!Array.isArray(seriesA) || !Array.isArray(seriesB) || !Array.isArray(categoryNames)) {
        throw new Error('Series A, Series B, and category names must be arrays');
    }
    
    if (seriesA.length !== categoryNames.length || seriesB.length !== categoryNames.length) {
        throw new Error('Series A, Series B, and category names arrays must have the same length');
    }
    
    // Create the data structure for Series A
    const seriesAData = seriesA.map((value, index) => ({
        x: categoryNames[index],
        y: value
    }));
    
    // Create the data structure for Series B
    const seriesBData = seriesB.map((value, index) => ({
        x: categoryNames[index],
        y: value
    }));
    
    // Construct the configuration object
    return {
        series: [
            {
                name: seriesAName || "Series 1",
                data: seriesAData
            },
            {
                name: seriesBName || "Series 2",
                data: seriesBData
            }
        ],
        xAxis: { type: "string" }
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createBarChartData };
} else {
    // Make available in browser environment
    window.barChartDataUtils = window.barChartDataUtils || {};
    window.barChartDataUtils.createBarChartData = createBarChartData;
}