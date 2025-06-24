// Country Data Module
const countryDataHelperModule = (function() {
    // Private variables and functions will go here
    
    async function getCountrySimpleTariffs(isoCode){
        /*
            Fetches basic country data from the server : returns simply the current tariff rate. 
            @params isoCode: string of ISO code, maps via countryToIsoCode

            returns: tariffs [] 
                - vector of 1 x 8, 8 different tariffs: 
                - tariff95_w
                - mfn95_w
                - tariff95
                - mfn95
                - tariff_w
                - mfn_w
                - tariff
                - mfn
        */
        const response = await fetch(DataPaths.bilateral_tariffs.basic_tariffs);
        const tariffData = await response.json();
        const countryTariffs = tariffData[isoCode] || null;
        
        // Get country name from global mapping
        let countryName = null;
        if (window.isoToCountryName && window.isoToCountryName[isoCode]) {
            countryName = window.isoToCountryName[isoCode];
        } else {
            countryName = isoCode; // Fall back to ISO code if no name found
        }
        
        const statutory_weighted = Math.min(countryTariffs[0] || Infinity, countryTariffs[1] || Infinity);
        const statutory_unweighted = Math.min(countryTariffs[2]||Infinity, countryTariffs[3] ||Infinity)

        return {
            iso: isoCode, 
            name: countryName, 
            current_tariff: statutory_weighted || statutory_unweighted || 0.0, 
            import_intensity: 0.01,  // This is old, might not even be needed anymore.
            default_pass_through: 100.0 // 100% pass-through
        };
    }
    

    async function getFullCountryTariffInfo(isoCode){


        return{
            iso: isoCode, 
            name: countryName, 
            country_hs_section_weights: countrySectionHSWeights, // These are the weights for the HS -> Section level mapping
            country_sector_tariffs: countrySectorTariffs, // These are the tariffs for the country at the sector level
            country_sector_bea_weights: countrySectorWeights // These ar the weights for the sector -> BEA mapping
        }
    }

    async function getTauVector(isoCode){

        return{
            iso: isoCode, 
            name: countryName, 
            tau_vector: tauVector // This is the vector of tariffs 

        }
    }


    // Public API
    return {
        getCountrySimpleTariffs: getCountrySimpleTariffs
    };
})();
