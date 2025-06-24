/**
 * Sparks Data Component
 * Core component for fetching, caching, and manipulating data
 */

window.sparksDataComponent = (function() {
    // Global data cache
    const dataCache = {};
    
    /**
     * Fetches data from URL with caching
     * @param {string} url - URL to fetch from
     * @returns {Promise<Object>} Fetched data
     */
    async function fetchWithCache(url) {
        // Check cache first
        if (dataCache[url]) {
            return dataCache[url];
        }
        
        // Show loading message in console        
        try {
            // Fetch the data
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Cache the data
            dataCache[url] = data;
            
            return data;
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
            throw error;
        }
    }
    
    /**
     * Clear cached data for a specific URL or all URLs
     * @param {string} [url] - Specific URL to clear from cache (if omitted, clears all)
     */
    function clearCache(url) {
        if (url) {
            // Clear specific URL cache
            delete dataCache[url];
        } else {
            // Clear all cache
            Object.keys(dataCache).forEach(key => {
                delete dataCache[key];
            });
        }
    }
    
    // Public API
    return {
        fetchWithCache,
        clearCache
    };
})();