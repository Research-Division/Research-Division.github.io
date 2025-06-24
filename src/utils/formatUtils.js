/**
 * Format utility functions for numbers, currency, and other display formats
 */

// Utility object to hold all format-related functions
window.formatUtils = (function() {
    /**
     * Formats a number as currency with suffix (K, M, B, T) or commas
     * 
     * @param {number|string} value - The value to format
     * @param {Object} options - Formatting options
     * @param {boolean} options.useSuffix - Whether to use K, M, B, T suffixes (default: true)
     * @param {boolean} options.includePrefix - Whether to include $ prefix (default: true)
     * @param {number} options.decimals - Number of decimal places to include (default: 2)
     * @param {boolean} options.forceDecimals - Force showing decimal places even if they're zeros (default: false)
     * @param {boolean} options.useCommas - Whether to use commas for non-suffix format (default: true)
     * @returns {string} Formatted string
     */
    function formatCurrency(value, options = {}) {
        // Set default options
        const defaults = {
            useSuffix: true,
            includePrefix: true,
            decimals: 2,
            forceDecimals: false,
            useCommas: true
        };
        
        // Merge options with defaults
        const settings = { ...defaults, ...options };
        
        // Convert to number if string
        const num = typeof value === 'string' ? parseFloat(value) : value;
        
        // Handle NaN, null, undefined
        if (isNaN(num) || num === null || num === undefined) {
            return settings.includePrefix ? '$0' : '0';
        }
        
        // Handle special case of zero
        if (num === 0) {
            return settings.includePrefix ? '$0' : '0';
        }
        
        // Create the prefix
        const prefix = settings.includePrefix ? '$' : '';
        
        // If using suffixes
        if (settings.useSuffix) {
            // Determine the appropriate suffix based on magnitude
            const absNum = Math.abs(num);
            let formatted;
            let suffix = '';
            
            if (absNum >= 1e12) { // Trillion
                formatted = (num / 1e12);
                suffix = 'T';
            } else if (absNum >= 1e9) { // Billion
                formatted = (num / 1e9);
                suffix = 'B';
            } else if (absNum >= 1e6) { // Million
                formatted = (num / 1e6);
                suffix = 'M';
            } else if (absNum >= 1e3) { // Thousand
                formatted = (num / 1e3);
                suffix = 'K';
            } else {
                formatted = num;
            }
            
            // Format the number with the specified number of decimal places
            if (settings.forceDecimals) {
                formatted = formatted.toFixed(settings.decimals);
            } else {
                // Only show decimal places if they're non-zero
                formatted = formatted.toFixed(settings.decimals);
                // Remove trailing zeros after decimal point
                formatted = formatted.replace(/\.0+$/, '');
                // Remove trailing zeros but keep decimal point
                formatted = formatted.replace(/(\.\d*[1-9])0+$/, '$1');
            }
            
            // Add commas for thousands within the suffix notation
            if (settings.useCommas && absNum >= 1e3) {
                const parts = formatted.toString().split('.');
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                formatted = parts.join('.');
            }
            
            return `${prefix}${formatted}${suffix}`;
        } 
        // If not using suffixes, just use commas
        else {
            // Format with commas
            let formatted = num.toFixed(settings.decimals);
            
            // Remove trailing zeros if not forcing decimals
            if (!settings.forceDecimals) {
                formatted = formatted.replace(/\.0+$/, '');
                formatted = formatted.replace(/(\.\d*[1-9])0+$/, '$1');
            }
            
            // Add commas for thousands
            if (settings.useCommas) {
                const parts = formatted.toString().split('.');
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                formatted = parts.join('.');
            }
            
            return `${prefix}${formatted}`;
        }
    }
    
    /**
     * Formats a large number with suffixes (K, M, B, T)
     * Wrapper around formatCurrency with currency prefix disabled
     * 
     * @param {number|string} value - The value to format
     * @param {Object} options - Formatting options
     * @returns {string} Formatted string
     */
    function formatLargeNumber(value, options = {}) {
        return formatCurrency(value, { ...options, includePrefix: false });
    }
    
    /**
     * Formats a number with commas as thousands separators
     * 
     * @param {number|string} value - The value to format 
     * @param {number} decimals - Number of decimal places (default: 0)
     * @returns {string} Formatted string with commas
     */
    function formatWithCommas(value, decimals = 0) {
        return formatCurrency(value, {
            useSuffix: false,
            includePrefix: false,
            decimals: decimals,
            useCommas: true
        });
    }
    
    /**
     * Formats a percentage value
     * 
     * @param {number|string} value - The value to format (0.01 = 1%)
     * @param {number} decimals - Number of decimal places (default: 2)
     * @param {boolean} includeSymbol - Whether to include % symbol (default: true)
     * @returns {string} Formatted percentage string
     */
    function formatPercent(value, decimals = 2, includeSymbol = true) {
        // Convert to number if string
        const num = typeof value === 'string' ? parseFloat(value) : value;
        
        // Handle NaN, null, undefined
        if (isNaN(num) || num === null || num === undefined) {
            return includeSymbol ? '0%' : '0';
        }
        
        // ALWAYS convert decimal to percentage (0.01 -> 1), for consistency across the app
        // We treat all incoming values as decimal form (0.05 = 5%)
        const percentage = num * 100;
        
        // Always use fixed decimal places format (no scientific notation)
        // Use at least 3 decimal places for very small numbers
        const decimalPlaces = Math.abs(percentage) < 0.01 ? Math.max(3, decimals) : decimals;
        const formatted = percentage.toFixed(decimalPlaces);
        
        // Add % symbol if requested
        return includeSymbol ? `${formatted}%` : formatted;
    }
    
    /**
     * Creates a tooltip-friendly formatted value with both full number and abbreviated version
     * 
     * @param {number|string} value - The value to format
     * @param {boolean} isCurrency - Whether to format as currency (default: true)
     * @returns {string} Formatted string like "$1.23M ($1,234,567)"
     */
    function formatTooltipValue(value, isCurrency = true) {
        // Convert to number if string
        const num = typeof value === 'string' ? parseFloat(value) : value;
        
        // Handle NaN, null, undefined
        if (isNaN(num) || num === null || num === undefined) {
            return isCurrency ? '$0' : '0';
        }
        
        // Format both ways
        const abbreviated = isCurrency ? 
            formatCurrency(num, { useSuffix: true }) : 
            formatLargeNumber(num, { useSuffix: true });
            
        const full = isCurrency ? 
            formatCurrency(num, { useSuffix: false }) : 
            formatWithCommas(num, 2);
        
        // Return combined format
        return `${abbreviated} (${full})`;
    }
    
    /**
     * Parses a formatted string back to a number
     * Handles currency, percentage, and large number formats with suffixes
     * 
     * @param {string} formattedValue - The formatted string to parse
     * @param {boolean} isPercentage - Whether the value is a percentage
     * @returns {number} The parsed number value
     */
    function parseFormattedNumber(formattedValue, isPercentage = false) {
        if (!formattedValue || typeof formattedValue !== 'string') {
            return 0;
        }
        
        // Handle empty string or non-numeric content
        if (formattedValue.trim() === '' || formattedValue === 'Error') {
            return 0;
        }
        
        // Remove currency symbols, commas, and whitespace
        let cleaned = formattedValue.replace(/[$£€¥]/g, '')
            .replace(/,/g, '')
            .replace(/\s/g, '');
        
        // Handle percentage symbol
        if (cleaned.includes('%')) {
            cleaned = cleaned.replace(/%/g, '');
            isPercentage = true;
        }
        
        // Handle suffixes (K, M, B, T)
        let multiplier = 1;
        if (cleaned.endsWith('K') || cleaned.endsWith('k')) {
            multiplier = 1e3;
            cleaned = cleaned.slice(0, -1);
        } else if (cleaned.endsWith('M') || cleaned.endsWith('m')) {
            multiplier = 1e6;
            cleaned = cleaned.slice(0, -1);
        } else if (cleaned.endsWith('B') || cleaned.endsWith('b')) {
            multiplier = 1e9;
            cleaned = cleaned.slice(0, -1);
        } else if (cleaned.endsWith('T') || cleaned.endsWith('t')) {
            multiplier = 1e12;
            cleaned = cleaned.slice(0, -1);
        }
        
        // Parse the numeric value
        const numericValue = parseFloat(cleaned);
        
        // Handle scientific notation
        if (cleaned.includes('e') || cleaned.includes('E')) {
            return numericValue;
        }
        
        // Apply multiplier for suffixes
        let result = numericValue * multiplier;
        
        // Convert percentage to decimal if needed
        // This maintains consistency with formatPercent expecting decimal values (0.05 = 5%)
        if (isPercentage) {
            result = result / 100;
        }
        
        return result;
    }

    // Public API
    return {
        formatCurrency,
        formatLargeNumber,
        formatWithCommas,
        formatPercent,
        formatTooltipValue,
        parseFormattedNumber
    };
})();