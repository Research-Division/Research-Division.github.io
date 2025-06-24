/**
 * Sparks Chart Style Manager
 * A comprehensive system for managing chart styles, themes, and appearance
 */

window.sparksStyleManager = (function() {
    // Style registry for storing all available styles
    const styleRegistry = new Map();
    let activeStyleName = 'standard';
    let styleElement = null;
    
    // CSS properties that can be themed with variables
    const cssVariableProperties = [
        'font-family',
        'title-color',
        'title-align',
        'title-font-size',
        'title-font-weight',
        'title-padding',
        'subtitle-color',
        'legend-align',
        'axis-color',
        'axis-tick-color',
        'grid-color',
        'grid-opacity',
        'grid-style',
        'background-color'
    ];
    
    /**
     * Initialize the style manager
     */
    function initialize() {
        createStyleElement();
        
        // Register default styles
        registerDefaultStyles();
        // Apply the default style
        setActiveStyle('standard');
        
        // Listen for style change events from outside
        document.addEventListener('chartWizStyleChanged', (event) => {
            // For backward compatibility with the original toggleChartWizStyle function
            const useChartWiz = event.detail?.enabled;
            setActiveStyle(useChartWiz ? 'chartWiz' : 'standard');
        });
    }
    
    /**
     * Create the style element for dynamic CSS rules
     */
    function createStyleElement() {
        styleElement = document.getElementById('sparks-chart-styles');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'sparks-chart-styles';
            document.head.appendChild(styleElement);
            
            // Add base styles that aren't theme-dependent
            styleElement.textContent = `
                /* Base chart styles that apply regardless of theme */
                .chart-y-title-horizontal {
                    display: none;
                    text-align: left;
                    padding-left: 10px;
                    font-weight: normal;
                    margin-top: 10px;
                    font-size: 14px;
                }
                
                /* Accessibility helpers */
                .visually-hidden {
                    opacity: 0;
                    position: absolute;
                    pointer-events: none;
                }
                
                /* Animation for transitions and shared properties */
                .tariff-chart-container * {
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    font-family: inherit;
                }
                
                /* Base class for all charts */
                .tariff-chart-container {
                    position: relative;
                    box-sizing: border-box;
                }
                
                /* Ensure SVG fills available space */
                .chart-visualization svg {
                    width: 100%;
                    display: block;
                }
                
                /* Ensure SVG text elements use the container's font-family */
                .chart-visualization svg text {
                    font-family: inherit;
                }
            `;
        }
    }
    
    /**
     * Register the default chart styles
     */
    function registerDefaultStyles() {
        // Standard style (default)
        registerStyle('standard', {
            name: 'Standard',
            description: 'Classic chart style with centered title and full axes',
            properties: {
                // Global properties
                global: {
                    fontFamily: 'monospace'
                },
                // Title properties
                title: {
                    align: 'center',
                    padding: '0px',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: 'var(--text-color)',
                    marginBottom: '15px'
                },
                // Y-axis properties
                yAxis: {
                    visible: true,
                    position: 'left',
                    titlePosition: 'rotate',
                    titleVisible: true,
                    ticksVisible: true,
                    lineVisible: true,
                    color: 'var(--text-color)',
                    gridLines: true
                },
                // X-axis properties
                xAxis: {
                    visible: true,
                    position: 'bottom',
                    ticksVisible: true,
                    lineVisible: true,
                    color: 'var(--text-color)'
                },
                // Legend properties
                legend: {
                    position: 'bottom',
                    align: 'center',
                    itemSpacing: '4px' // Reduced spacing between color box and label
                },
                // Grid properties
                grid: {
                    visible: true,
                    style: 'dashed',
                    opacity: 0.2,
                    color: 'var(--text-color)'
                },
                // Notes and source citation
                notes: {
                    align: 'left',
                    fontSize: '12px',
                    color: 'var(--alt-text-color)',
                    marginTop: '10px',
                    paddingLeft: '10px'
                }
            },
            // CSS rules specific to this style
            cssRules: `
                .chart-style-standard .chart-title {
                    text-align: center;
                    font-weight: bold;
                }
                
                .chart-style-standard .chart-notes {
                    text-align: left;
                }
                
                .chart-style-standard .y-axis-title-horizontal {
                    display: none;
                }
                
                .chart-style-standard .chart-legend {
                    justify-content: center;
                }
            `
        });
        
        // Chart Wiz style (alternative)
        registerStyle('chartWiz', {
            name: 'Chart Wiz',
            description: 'Modern style with left-aligned title and simplified axes',
            properties: {
                // Global properties
                global: {
                    fontFamily: 'monospace'
                },
                // Title properties
                title: {
                    align: 'left',
                    padding: '10px',
                    fontWeight: 'normal',
                    fontSize: '18px',
                    color: 'var(--text-color)',
                    marginBottom: '5px' // Reduced margin to decrease gap with y-title
                },
                // Y-axis properties
                yAxis: {
                    visible: true,
                    position: 'none',
                    titlePosition: 'horizontal',
                    titleVisible: true,
                    ticksVisible: false,
                    lineVisible: false,
                    color: 'var(--text-color)',
                    gridLines: true
                },
                // X-axis properties
                xAxis: {
                    visible: true,
                    position: 'bottom',
                    ticksVisible: true, // Always show x-axis ticks for all chart types
                    lineVisible: true,
                    color: 'var(--text-color)'
                },
                // Legend properties
                legend: {
                    position: 'bottom',
                    align: 'center', // Changed from 'left' to 'center' to maintain consistent legend centering
                    itemSpacing: '4px' // Reduced spacing between color box and label
                },
                // Grid properties
                grid: {
                    visible: true,
                    style: 'dashed',
                    opacity: 0.2,
                    color: 'var(--text-color)'
                },
                // Notes and source citation
                notes: {
                    align: 'left',
                    fontSize: '12px',
                    color: 'var(--alt-text-color)',
                    marginTop: '10px',
                    paddingLeft: '10px'
                }
            },
            // CSS rules specific to this style
            cssRules: `
                .chart-style-chartWiz .chart-title {
                    text-align: left;
                    padding-left: 10px;
                    font-weight: normal;
                }
                
                .chart-style-chartWiz .chart-notes {
                    text-align: left;
                    padding-left: 10px;
                }
                
                .chart-style-chartWiz .chart-y-title-horizontal {
                    display: block;
                    margin-top: 5px;
                    padding-bottom: 5px;
                }
                
                .chart-style-chartWiz .y-axis-title-vertical {
                    opacity: 0;
                }
                
                .chart-style-chartWiz .y-axis-line {
                    opacity: 0;
                }
                
                .chart-style-chartWiz .y-axis-tick {
                    opacity: 0;
                }
                
                /* Ensure x-axis ticks are visible for Chart Wiz style */
                .chart-style-chartWiz .x-axis-tick {
                    opacity: 1;
                    stroke: var(--text-color);
                }
                
                .chart-style-chartWiz .chart-legend {
                    justify-content: center;
                    /* Removed left padding to ensure centered alignment */
                }
            `
        });
        
        // Add a Minimal style variant
        registerStyle('minimal', {
            name: 'Minimal',
            description: 'Clean, minimal style with reduced visual elements',
            properties: {
                // Global properties
                global: {
                    fontFamily: 'monospace'
                },
                // Title properties
                title: {
                    align: 'left',
                    padding: '5px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: 'var(--text-color)',
                    marginBottom: '5px'
                },
                // Y-axis properties
                yAxis: {
                    visible: true,
                    position: 'left',
                    titlePosition: 'rotate',
                    titleVisible: false,  // No axis title
                    ticksVisible: true,
                    lineVisible: false,  // No axis line
                    color: 'var(--alt-text-color)',
                    gridLines: false
                },
                // X-axis properties
                xAxis: {
                    visible: true,
                    position: 'bottom',
                    ticksVisible: true, // Always show x-axis ticks for all chart types
                    lineVisible: false,  // No axis line
                    color: 'var(--alt-text-color)'
                },
                // Legend properties
                legend: {
                    position: 'bottom',
                    align: 'center', // Changed from 'left' to 'center' for consistent legend centering
                    itemSpacing: '4px' // Reduced spacing between color box and label
                },
                // Grid properties
                grid: {
                    visible: false,  // No grid lines
                    style: 'solid',
                    opacity: 0.1,
                    color: 'var(--alt-text-color)'
                },
                // Notes and source citation
                notes: {
                    align: 'left',  // Always left-aligned
                    fontSize: '10px',
                    color: 'var(--alt-text-color)',
                    marginTop: '5px',
                    paddingLeft: '10px',
                    fontStyle: 'italic'
                }
            },
            // CSS rules specific to this style
            cssRules: `
                .chart-style-minimal .chart-title {
                    text-align: left;
                    border-bottom: 1px solid var(--alt-text-color);
                    padding-bottom: 5px;
                }
                
                .chart-style-minimal .chart-notes {
                    text-align: left;
                    font-style: italic;
                }
                
                .chart-style-minimal .y-axis-line,
                .chart-style-minimal .x-axis-line {
                    opacity: 0;
                }
                
                .chart-style-minimal .y-axis-title-vertical {
                    opacity: 0;
                }
                
                .chart-style-minimal .chart-legend {
                    justify-content: center; /* Changed from flex-start to center */
                    margin-top: 5px;
                }
                
                .chart-style-minimal .grid-line {
                    opacity: 0;
                }
                
                .chart-style-minimal text.tick-label {
                    font-size: 10px;
                    fill: var(--alt-text-color);
                }
                
                /* Ensure x-axis ticks are visible for minimal style */
                .chart-style-minimal line.x-axis-tick {
                    opacity: 1;
                    stroke: var(--alt-text-color);
                }
            `
        });
    }
    
    /**
     * Register a new chart style
     * @param {string} styleName - Unique identifier for the style
     * @param {Object} styleConfig - Configuration for the style
     * @returns {boolean} Success indicator
     */
    function registerStyle(styleName, styleConfig) {
        if (!styleName || !styleConfig || typeof styleConfig !== 'object') {
            console.error('Invalid style configuration');
            return false;
        }
        
        // Set defaults for missing properties
        const fullConfig = {
            name: styleConfig.name || styleName,
            description: styleConfig.description || '',
            properties: styleConfig.properties || {},
            cssRules: styleConfig.cssRules || '',
            customApply: styleConfig.customApply || null
        };
        
        // Add to registry
        styleRegistry.set(styleName, fullConfig);
        
        // Update style element with the CSS rules for this style
        updateStyleElement();
        
        return true;
    }
    
    /**
     * Update the style element with CSS rules for all registered styles
     */
    function updateStyleElement() {
        if (!styleElement) createStyleElement();
        
        // Start with base styles
        let cssRules = styleElement.textContent.split('/* Style-specific rules */')[0];
        cssRules += '/* Style-specific rules */\n';
        
        // Add rules for each style
        styleRegistry.forEach((styleConfig, styleName) => {
            cssRules += styleConfig.cssRules + '\n';
        });
        
        // Update the style element
        styleElement.textContent = cssRules;
    }
    
    /**
     * Set the active chart style
     * @param {string} styleName - Name of the style to activate
     * @returns {boolean} Success indicator
     */
    function setActiveStyle(styleName) {
        // Check if the style exists
        if (!styleRegistry.has(styleName)) {
            console.error(`Style '${styleName}' not found`);
            return false;
        }
        
        // Update active style
        activeStyleName = styleName;
        
        // Remove all style classes from body
        document.body.classList.remove(...Array.from(styleRegistry.keys()).map(name => `chart-style-${name}`));
        
        // Add the new style class
        document.body.classList.add(`chart-style-${styleName}`);
        
        // Apply to all existing charts
        document.querySelectorAll('.tariff-chart-container').forEach(chart => {
            applyStyleToChart(chart, styleName);
        });
        
        // Dispatch event for other components to react
        const event = new CustomEvent('sparksStyleChanged', {
            detail: {
                styleName,
                style: getStyleConfig(styleName)
            }
        });
        document.dispatchEvent(event);
        
        return true;
    }
    
    /**
     * Get configuration for a registered style
     * @param {string} styleName - Name of the style
     * @returns {Object|null} Style configuration or null if not found
     */
    function getStyleConfig(styleName) {
        return styleRegistry.has(styleName) 
            ? {...styleRegistry.get(styleName)} 
            : null;
    }
    
    /**
     * Apply a style to a specific chart
     * @param {HTMLElement} chartContainer - Chart container element
     * @param {string} styleName - Name of the style to apply (defaults to active style)
     */
    function applyStyleToChart(chartContainer, styleName = activeStyleName) {
        if (!chartContainer) return;
        
        // Get style configuration
        const styleConfig = getStyleConfig(styleName);
        if (!styleConfig) return;
        
        // Add style class to the container
        const styleClasses = Array.from(styleRegistry.keys()).map(name => `chart-style-${name}`);
        chartContainer.classList.remove(...styleClasses);
        chartContainer.classList.add(`chart-style-${styleName}`);
        
        // Apply basic styling through classes
        
        // 1. Get chart elements
        const chartTitle = chartContainer.querySelector('.chart-title');
        const chartVisualization = chartContainer.querySelector('.chart-visualization');
        const chartLegend = chartContainer.querySelector('.chart-legend');
        const chartNotes = chartContainer.querySelector('.chart-notes');
        const svg = chartVisualization?.querySelector('svg');
        
        if (!svg) return;
        
        // Apply global styles first (like font-family)
        if (styleConfig.properties.global) {
            const globalProps = styleConfig.properties.global;
            
            // Apply font family to the entire chart container
            if (globalProps.fontFamily) {
                chartContainer.style.fontFamily = globalProps.fontFamily;
                
                // Also apply to SVG text elements for consistency
                svg.querySelectorAll('text').forEach(textElement => {
                    textElement.style.fontFamily = globalProps.fontFamily;
                });
            }
        }
        
        // 2. Style the title
        if (chartTitle && styleConfig.properties.title) {
            const titleProps = styleConfig.properties.title;
            chartTitle.style.textAlign = titleProps.align;
            chartTitle.style.paddingLeft = titleProps.align === 'left' ? titleProps.padding : '0px';
            chartTitle.style.fontWeight = titleProps.fontWeight;
            chartTitle.style.fontSize = titleProps.fontSize;
            chartTitle.style.color = titleProps.color;
            chartTitle.style.marginBottom = titleProps.marginBottom;
        }
        
        // 3. Style the Y-axis
        if (styleConfig.properties.yAxis) {
            const yAxisProps = styleConfig.properties.yAxis;
            
            // Y-axis title handling
            const yAxisTitle = svg.querySelector('g text[transform*="rotate(-90)"]');
            if (yAxisTitle) {
                // Add a consistent class
                yAxisTitle.classList.add('y-axis-title-vertical');
                
                // Handle title positioning
                if (yAxisProps.titlePosition === 'horizontal') {
                    // Hide vertical title, show horizontal
                    yAxisTitle.style.opacity = '0';
                    
                    // Create or update horizontal title
                    let horizontalTitle = chartContainer.querySelector('.chart-y-title-horizontal');
                    const titleText = yAxisTitle.textContent;
                    
                    if (!horizontalTitle && titleText) {
                        horizontalTitle = document.createElement('div');
                        horizontalTitle.className = 'chart-y-title-horizontal';
                        horizontalTitle.textContent = titleText;
                        horizontalTitle.style.color = yAxisProps.color;
                        chartTitle.after(horizontalTitle);
                    } else if (horizontalTitle) {
                        horizontalTitle.textContent = titleText;
                        horizontalTitle.style.display = 'block';
                        horizontalTitle.style.color = yAxisProps.color;
                    }
                    
                    // Trigger chart centering for horizontal y-axis title
                    // This will be handled by the UIComponent.applyChartStyle function
                    const chartId = chartContainer.id;
                    if (chartId && window.sparksUIComponent && window.sparksUIComponent.applyChartStyle) {
                        // Use setTimeout to ensure style is fully applied first
                        setTimeout(() => {
                            window.sparksUIComponent.applyChartStyle(chartId);
                        }, 0);
                    }
                } else {
                    // Show vertical title (if configured to be visible)
                    yAxisTitle.style.opacity = yAxisProps.titleVisible ? '1' : '0';
                    
                    // Hide horizontal title if it exists
                    const horizontalTitle = chartContainer.querySelector('.chart-y-title-horizontal');
                    if (horizontalTitle) {
                        horizontalTitle.style.display = 'none';
                    }
                }
                
                // Set title color
                yAxisTitle.style.fill = yAxisProps.color;
            }
            
            // Y-axis line
            svg.querySelectorAll('g line[x1="0"][x2="0"]').forEach(line => {
                line.classList.add('y-axis-line');
                line.style.stroke = yAxisProps.lineVisible ? yAxisProps.color : 'transparent';
            });
            
            // Y-axis ticks
            svg.querySelectorAll('g line[x1^="-"][x2="0"][y1][y2]').forEach(tick => {
                tick.classList.add('y-axis-tick');
                tick.style.stroke = yAxisProps.ticksVisible ? yAxisProps.color : 'transparent';
            });
            
            // Y-axis labels
            svg.querySelectorAll('g text.tick-label-y').forEach(label => {
                label.style.fill = yAxisProps.color;
                label.style.opacity = yAxisProps.ticksVisible ? '1' : '0';
            });
        }
        
        // 4. Style the X-axis
        if (styleConfig.properties.xAxis) {
            const xAxisProps = styleConfig.properties.xAxis;
            
            // X-axis line
            svg.querySelectorAll('g line.x-axis-line').forEach(line => {
                line.style.stroke = xAxisProps.lineVisible ? xAxisProps.color : 'transparent';
            });
            
            // X-axis ticks
            svg.querySelectorAll('g line.x-axis-tick').forEach(tick => {
                tick.style.stroke = xAxisProps.ticksVisible ? xAxisProps.color : 'transparent';
                tick.style.opacity = xAxisProps.ticksVisible ? '1' : '0';
            });
            
            // X-axis labels
            svg.querySelectorAll('g text.tick-label-x').forEach(label => {
                label.style.fill = xAxisProps.color;
                label.style.opacity = xAxisProps.ticksVisible ? '1' : '0';
            });
        }
        
        // 5. Style the grid
        if (styleConfig.properties.grid) {
            const gridProps = styleConfig.properties.grid;
            
            svg.querySelectorAll('g line.grid-line').forEach(line => {
                line.style.opacity = gridProps.visible ? gridProps.opacity : '0';
                line.style.stroke = gridProps.color;
                line.style.strokeDasharray = gridProps.style === 'dashed' ? '4,4' : 'none';
            });
        }
        
        // 6. Style the legend
        if (chartLegend && styleConfig.properties.legend) {
            const legendProps = styleConfig.properties.legend;
            
            // Set alignment - force center alignment for consistency
            chartLegend.style.justifyContent = 'center';
            
            // Set spacing between items
            chartLegend.querySelectorAll('.legend-row').forEach(row => {
                row.style.gap = legendProps.itemSpacing;
            });
        }
        
        // 7. Style the notes - always left-aligned regardless of style
        if (chartNotes && styleConfig.properties.notes) {
            const notesProps = styleConfig.properties.notes;
            
            // Always left align, regardless of style configuration
            chartNotes.style.textAlign = 'left';
            chartNotes.style.fontSize = notesProps.fontSize;
            chartNotes.style.color = notesProps.color;
            chartNotes.style.marginTop = notesProps.marginTop;
            
            // Use padding instead of margin for better alignment with chart content
            chartNotes.style.paddingLeft = notesProps.paddingLeft || '10px';
            chartNotes.style.marginLeft = '0';
            chartNotes.style.marginRight = '0';
            
            if (notesProps.fontStyle) {
                chartNotes.style.fontStyle = notesProps.fontStyle;
            }
        }
        
        // 8. Apply custom styling function if provided
        if (typeof styleConfig.customApply === 'function') {
            styleConfig.customApply(chartContainer, styleConfig.properties);
        }
    }
    
    /**
     * Create a new style based on an existing one
     * @param {string} newStyleName - Name for the new style
     * @param {string} baseStyleName - Name of the style to base on
     * @param {Object} overrides - Properties to override in the base style
     * @returns {boolean} Success indicator
     */
    function createStyleVariant(newStyleName, baseStyleName, overrides = {}) {
        // Check if base style exists
        if (!styleRegistry.has(baseStyleName)) {
            console.error(`Base style '${baseStyleName}' not found`);
            return false;
        }
        
        // Get base style
        const baseStyle = styleRegistry.get(baseStyleName);
        
        // Create new style with overrides
        const newStyle = {
            name: overrides.name || `${baseStyle.name} Variant`,
            description: overrides.description || `Variant of ${baseStyle.name}`,
            properties: {
                ...JSON.parse(JSON.stringify(baseStyle.properties)),
                ...overrides.properties
            },
            cssRules: overrides.cssRules || baseStyle.cssRules.replace(
                new RegExp(`\\.chart-style-${baseStyleName}`, 'g'), 
                `.chart-style-${newStyleName}`
            ),
            customApply: overrides.customApply || baseStyle.customApply
        };
        
        // Register the new style
        return registerStyle(newStyleName, newStyle);
    }
    
    /**
     * Get the list of all available styles
     * @returns {Array} Array of style information objects
     */
    function getAvailableStyles() {
        return Array.from(styleRegistry.entries()).map(([id, config]) => ({
            id,
            name: config.name,
            description: config.description
        }));
    }
    
    /**
     * Toggle between standard and ChartWiz styles (for backward compatibility)
     * @param {boolean} useChartWiz - Whether to use ChartWiz style
     */
    function toggleChartWizStyle(useChartWiz) {
        setActiveStyle(useChartWiz ? 'chartWiz' : 'standard');
    }
    
    // Public API
    return {
        initialize,
        registerStyle,
        setActiveStyle,
        getStyleConfig,
        applyStyleToChart,
        getAvailableStyles,
        createStyleVariant,
        toggleChartWizStyle,
        getActiveStyle: () => activeStyleName
    };
})();