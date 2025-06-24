/**
 * Sparks Color Utilities
 * Functions for chart color management and highlighting
 */

window.sparksColorUtils = (function() {
    // Define chart color palette
    const chartColorPalette = [
        'var(--blue1)', 'var(--green1)', 'var(--yellow1)', 'var(--blue2)',
        'var(--orange1)', 'var(--teal1)', 'var(--pink1)', 'var(--purple1)',
        'var(--maroon1)', 'var(--blue3)', 'var(--green2)', 'var(--gray1)'
    ];
    
    const bilatColorPalette = [
        'var(--primary)', 'var(--excellenceOrange)'
    ];
    
    /**
     * Updates the opacity of SVG elements based on highlighting state
     * 
     * @param {string} containerSelector - CSS selector for the SVG container
     * @param {Array} highlightedItems - Array of item names that are highlighted
     * @param {Object} options - Configuration options
     * @param {string} options.seriesSelector - CSS selector for series elements (default: '.animated-path')
     * @param {string} options.pointSelector - CSS selector for point elements (default: '.data-point')
     * @param {Function} options.getSeriesName - Function to extract series name from element (default: uses data-series)
     * @param {number} options.dimOpacity - Opacity for dimmed items (default: 0.25)
     */
    function updateChartHighlighting(containerSelector, highlightedItems, options = {}) {
        // Default options
        const defaultOptions = {
            seriesSelector: '.animated-path',
            pointSelector: '.data-point',
            legendSelector: '.legend-item',
            getSeriesName: (el) => el.dataset.series,
            dimOpacity: 0.25
        };
        
        // Merge with user options
        const settings = { ...defaultOptions, ...options };
        
        // Get container
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error(`Chart container not found: ${containerSelector}`);
            return;
        }
        
        // If no items are highlighted, show everything
        const showAll = !highlightedItems || highlightedItems.length === 0;
        
        // Update line series
        const lines = container.querySelectorAll(settings.seriesSelector);
        lines.forEach(line => {
            const seriesName = settings.getSeriesName(line);
            if (!seriesName) return;
            
            const isHighlighted = showAll || highlightedItems.includes(seriesName);
            line.style.opacity = isHighlighted ? 1 : settings.dimOpacity;
        });
        
        // Update points/circles
        const points = container.querySelectorAll(settings.pointSelector);
        points.forEach(point => {
            const seriesName = settings.getSeriesName(point);
            if (!seriesName) return;
            
            const isHighlighted = showAll || highlightedItems.includes(seriesName);
            point.style.opacity = isHighlighted ? 1 : settings.dimOpacity;
            // Also reduce the stroke-width for dimmed points
            if (!isHighlighted) {
                point.setAttribute('stroke-width', '0.5');
            } else {
                point.setAttribute('stroke-width', '1');
            }
        });
    }
    
    /**
     * Get a color from the chart color palette based on index
     * 
     * @param {number} index - The index to get a color for
     * @returns {string} CSS color variable or value
     */
    function getChartColor(index) {
        return chartColorPalette[index % chartColorPalette.length];
    }
    
    /**
     * Get a color from the bilateral chart color palette based on index
     * Index 0 = US (exports or tariff rate)
     * Index 1 = Other Country (imports or tariff rate)
     * 
     * @param {number} index - The index to get a color for (0 for US, 1 for other country)
     * @returns {string} CSS color variable or value
     */
    function getBilatColor(index) {
        return bilatColorPalette[index % bilatColorPalette.length];
    }
    
    // Public API
    return {
        updateChartHighlighting,
        getChartColor,
        getBilatColor
    };
})();