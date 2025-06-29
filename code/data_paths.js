/**
 * Centralized data path configuration for the Tariff Price Pulse application
 * 
 * This file contains all data paths used throughout the application.
 * It allows easy switching between different datasets and configurations.
 * Supports both local development paths and CMS paths.
 */

// Path configuration
const DataPathsConfig = {
    // Flag to determine which path type to use
    useCmsPaths: false,
    
    // CMS ID mappings for each file (to be filled with actual IDs from CMS)
    cmsIds: {
        // Geography
        'data/geographic_data/countries_small_converted.geo.json': '12345',
        
        // Metadata
        'data/metadata/countries_by_continent.json': '23456',
        'data/metadata/section_to_chapters_full_rewritten.json': '34567',
        'data/metadata/country_iso_mapping.json': '45678',
        'data/metadata/nipa_descendants.json': '56789',
        
        // Calculations
        'data/calculations/weighting/bea_import_weights.json': '67890',
        'data/calculations/weighting/bea_section_weights.json': '78901',
        'data/calculations/weighting/bea_hs4_weights_FINAL.json': '89012',
        'data/calculations/weighting/section_weights.json': '89012',
        'data/calculations/direct_matrix_prodPrice_normPurch_Real.json': '90123',
        'data/calculations/indirect_matrix_prodPrice_normPurch_Real.json': '01234',
        
        // Feature Extractions -- 
        'data/feature_extraction/bilateral_trade_features.json':'V1234',
        'data/feature_extraction/country_product_features.json':'W2345',
        'data/feature_extraction/section_time_series_features.json':'X3456',
        // Trade data
        'data/trade_data/chart_ready_country_series_hs.json': 'A1234',
        'data/trade_data/chart_ready_hsSection_series.json': 'B2345',
        'data/trade_data/chart_ready_country_hsSection_series.json': 'C3456',
        'data/trade_data/SHORT_hs_trade_data_combined_2024.json': 'D4567',
        
        // Tariff data
        'data/tariff_data/base_tariff.json': 'E5678',
        'data/tariff_data/all_countries_statutory_tariffs.json': 'F6789',
        'data/tariff_data/statutory.json': 'G7890',
        'data/tariff_data/simple.json': 'H8901',
        'data/tariff_data/weighted.json': 'I9012',
        'data/tariff_data/winsorized.json': 'J0123',
        'data/tariff_data/weighted_winsorized.json': 'K1234',
        
        // Component paths -- THE FIRST THREE ARE MODAL PAGES
        'code/components/tariffModals/countryList/countrySearchModal.html': 'L2345',
        'code/components/tariffModals/productList/simple_tariff_integration.html': 'M3456',
        'code/components/map/tariff_popup/tariffPopup.html': 'N4567',
        'code/components/map/tariff_popup/tariffTooltip.html': 'O5678',
        'code/components/receipt/receipt.html': 'P6789',
        'code/components/receipt/placeholder_message.html': 'Q7890',
        'code/components/help_and_info/help_and_info.html': 'H1234',
        
        // Chart templates  -- THESE ARE THE MODAL PAGES 
        'combined_charts/tariff_comparison_chart.html': 'R8901',
        'combined_charts/00_Global_Trade_Charts.html': 'S9012',
        'combined_charts/01_trade_area_charts.html': 'T0123',
        'combined_charts/02_effects_and_rates.html': 'U1234',
        
        // Dev tools -- This is modal but low value added. 
        'src/devTools/devTools.html': 'V2345',
        
        // Font Awesome assets
        'assets/fontawesome/arrow-rotate-left.svg': 'FA001',
        'assets/fontawesome/bolt-solid.svg': 'FA002',
        'assets/fontawesome/chart-bar-solid.svg': 'FA003',
        'assets/fontawesome/chart-bar-vertical-solid.svg': 'FA004',
        'assets/fontawesome/chart-line-solid.svg': 'FA005',
        'assets/fontawesome/chevron-down-solid.svg': 'FA006',
        'assets/fontawesome/chevron-right-solid.svg': 'FA007',
        'assets/fontawesome/circle-dot-solid.svg': 'FA008',
        'assets/fontawesome/circle-question.svg': 'FA009',
        'assets/fontawesome/circle-question-solid.svg': 'FA010',
        'assets/fontawesome/circle-regular.svg': 'FA011',
        'assets/fontawesome/circle-solid.svg': 'FA012',
        'assets/fontawesome/forward.svg': 'FA013',
        'assets/fontawesome/globe-solid.svg': 'FA014',
        'assets/fontawesome/globe.svg': 'FA015',
        'assets/fontawesome/hat-wizard-solid.svg': 'FA016',
        'assets/fontawesome/info-circle.svg': 'FA017',
        'assets/fontawesome/magnifying-glass-solid.svg': 'FA018',
        'assets/fontawesome/minus-solid.svg': 'FA019',
        'assets/fontawesome/plus-solid.svg': 'FA020',
        'assets/fontawesome/settings.svg': 'FA021',
        'assets/fontawesome/solid-bolt.svg': 'FA022',
        'assets/fontawesome/square-solid.svg': 'FA023',
        'assets/fontawesome/toggle-off-solid.svg': 'FA024',
        'assets/fontawesome/toggle-on-solid.svg': 'FA025',
        'assets/fontawesome/trash-solid.svg': 'FA026',
        'assets/fontawesome/triangle-warning.svg': 'FA027',
        'assets/fontawesome/wheat-awn-solid.svg': 'FA028',
        'assets/fontawesome/xmark.svg': 'FA029',
        
        // FRBA logos
        'assets/frba/Michael Assets/frba_black_logo.png': 'FB001',
        'assets/frba/Michael Assets/frba_white_logo.png': 'FB002',
        'assets/frba/Michael Assets/frba_line_logo.png': 'FB003',
        'assets/frba/Michael Assets/frba_mobile_logo.png': 'FB004',
        'assets/frba/FRBAlogo-Box-2Line.png': 'FB005',
        'assets/frba/FRBAlogo-Column-1Line.png': 'FB006',
        'assets/frba/FRBAlogo-Column-2Line.png': 'FB007'
    },
    
    // Convert a local path to CMS path
    getPath: function(localPath) {
        if (this.useCmsPaths) {
            const cmsId = this.cmsIds[localPath];
            if (cmsId) {
                return `-media/${cmsId}.ashx`;
            } else {
                console.warn(`No CMS ID mapping found for path: ${localPath}`);
                return localPath; // Fallback to local path
            }
        } else {
            return localPath;
        }
    },
    
    // Set path mode
    setPathMode: function(useRemotePaths) {
        this.useCmsPaths = !!useRemotePaths;
        console.log(`Using ${this.useCmsPaths ? 'CMS' : 'local'} paths`);
    }
};

const DataPaths = {
    // Configuration access
    config: DataPathsConfig,
    
    // Toggle path mode
    useLocalPaths: function() {
        this.config.setPathMode(false);
        return this;
    },
    
    useCmsPaths: function() {
        this.config.setPathMode(true);
        return this;
    },
    
    // Update CMS ID for a specific path
    setCmsId: function(localPath, cmsId) {
        this.config.cmsIds[localPath] = cmsId;
        return this;
    },
    
    // Geography data
    geography: {
        get map() { return DataPathsConfig.getPath('data/geographic_data/countries_small_converted.geo.json'); }
    },
    
    // Metadata
    meta: {
        get country_continent() { return DataPathsConfig.getPath('data/metadata/countries_by_continent.json'); },
        get section_to_chapters() { return DataPathsConfig.getPath('data/metadata/section_to_chapters_full_rewritten.json'); },
        get country_iso_mapping() { return DataPathsConfig.getPath('data/metadata/country_iso_mapping.json'); },
        get nipa_map() { return DataPathsConfig.getPath('data/metadata/nipa_descendants.json'); }
    },
    
    // Calculation data
    calculations: {
        get importVector() { return DataPathsConfig.getPath('data/calculations/weighting/bea_import_weights.json'); },
        get bea_section_weights() { return DataPathsConfig.getPath('data/calculations/weighting/bea_section_weights.json'); },
        get bea_hs4_weights() { return DataPathsConfig.getPath('data/calculations/weighting/bea_hs4_weights_FINAL.json');},
        get hs_section_weights() { return DataPathsConfig.getPath('data/calculations/weighting/section_weights.json'); },
        get direct_matrix() { return DataPathsConfig.getPath('data/calculations/direct_matrix_prodPrice_normPurch_Real.json'); },
        get indirect_matrix() { return DataPathsConfig.getPath('data/calculations/indirect_matrix_prodPrice_normPurch_Real.json'); }
    },
    
    // Trade data
    trade_data: {
        get country_series() { return DataPathsConfig.getPath('data/trade_data/chart_ready_country_series_hs.json'); },
        get hsSection_series() { return DataPathsConfig.getPath('data/trade_data/chart_ready_hsSection_series.json'); },
        get country_section_series() { return DataPathsConfig.getPath('data/trade_data/chart_ready_country_hsSection_series.json'); },
        get country_country_section_series() { return DataPathsConfig.getPath('data/trade_data/chart_ready_country_hsSection_series.json'); },
        
        // Multi-year data
        multi_year: {
            get short_hs_trade() { return DataPathsConfig.getPath('data/trade_data/SHORT_hs_trade_data_combined_2024.json'); }
        }
    },
    
    // Bilateral tariff data
    bilateral_tariffs: {
        get basic_tariffs() { return DataPathsConfig.getPath('data/tariff_data/base_tariff.json'); },
        get all_countries() { return DataPathsConfig.getPath('data/tariff_data/all_countries_statutory_tariffs.json'); },
        
        // Section level tariffs
        section: {
            get statutory() { return DataPathsConfig.getPath('data/tariff_data/statutory.json'); },
            get simple() { return DataPathsConfig.getPath('data/tariff_data/simple.json'); },
            get weighted() { return DataPathsConfig.getPath('data/tariff_data/weighted.json'); },
            get winsorized() { return DataPathsConfig.getPath('data/tariff_data/winsorized.json'); },
            get weighted_winsorized() { return DataPathsConfig.getPath('data/tariff_data/weighted_winsorized.json'); }
        }
    },
    features:{
        get bilatFeatures() { return DataPathsConfig.getPath('data/feature_extraction/bilateral_trade_features.json'); },
        get productFeatures() {return DataPathsConfig.getPath('data/feature_extraction/country_product_features.json'); },
        get sectionTimeSeries() {return DataPathsConfig.getPath('data/feature_extraction/section_time_series_features.json'); }
    },
    
    // Component paths
    components: {
        // Paths for modal HTML files
        tariffModals: {
            get countrySearch() { return DataPathsConfig.getPath('code/components/tariffModals/countryList/countrySearchModal.html'); },
            get productList() { return DataPathsConfig.getPath('code/components/tariffModals/productList/simple_tariff_integration.html'); }
        },
        
        // Paths for map components
        map: {
            get tariffPopup() { return DataPathsConfig.getPath('code/components/map/tariff_popup/tariffPopup.html'); },
            get tariffTooltip() { return DataPathsConfig.getPath('code/components/map/tariff_popup/tariffTooltip.html'); }
        },
        
        // Path for receipt component
        receipt: {
            get container() { return DataPathsConfig.getPath('code/components/receipt/receipt.html'); },
            get placeholder() { return DataPathsConfig.getPath('code/components/receipt/placeholder_message.html'); }
        },
        
        // Path for help and info component
        helpInfo: {
            get modal() { return DataPathsConfig.getPath('code/components/help_and_info/help_and_info.html'); }
        }
    },
    
    // Chart templates
    charts: {
        get tariffComparison() { return DataPathsConfig.getPath('combined_charts/tariff_comparison_chart.html'); },
        get globalTrade() { return DataPathsConfig.getPath('combined_charts/00_Global_Trade_Charts.html'); },
        get tradeArea() { return DataPathsConfig.getPath('combined_charts/01_trade_area_charts.html'); },
        get effectsAndRates() { return DataPathsConfig.getPath('combined_charts/02_effects_and_rates.html'); }
    },
    
    // Development tools
    devTools: {
        get main() { return DataPathsConfig.getPath('src/devTools/devTools.html'); }
    },
    
    // Assets
    assets: {
        // FontAwesome icons
        fontawesome: {
            get arrowRotateLeft() { return DataPathsConfig.getPath('assets/fontawesome/arrow-rotate-left.svg'); },
            get boltSolid() { return DataPathsConfig.getPath('assets/fontawesome/bolt-solid.svg'); },
            get chartBarSolid() { return DataPathsConfig.getPath('assets/fontawesome/chart-bar-solid.svg'); },
            get chartBarVerticalSolid() { return DataPathsConfig.getPath('assets/fontawesome/chart-bar-vertical-solid.svg'); },
            get chartLineSolid() { return DataPathsConfig.getPath('assets/fontawesome/chart-line-solid.svg'); },
            get chevronDownSolid() { return DataPathsConfig.getPath('assets/fontawesome/chevron-down-solid.svg'); },
            get chevronRightSolid() { return DataPathsConfig.getPath('assets/fontawesome/chevron-right-solid.svg'); },
            get circleDotSolid() { return DataPathsConfig.getPath('assets/fontawesome/circle-dot-solid.svg'); },
            get circleQuestion() { return DataPathsConfig.getPath('assets/fontawesome/circle-question.svg'); },
            get circleQuestionSolid() { return DataPathsConfig.getPath('assets/fontawesome/circle-question-solid.svg'); },
            get circleRegular() { return DataPathsConfig.getPath('assets/fontawesome/circle-regular.svg'); },
            get circleSolid() { return DataPathsConfig.getPath('assets/fontawesome/circle-solid.svg'); },
            get forward() { return DataPathsConfig.getPath('assets/fontawesome/forward.svg'); },
            get globeSolid() { return DataPathsConfig.getPath('assets/fontawesome/globe-solid.svg'); },
            get globe() { return DataPathsConfig.getPath('assets/fontawesome/globe.svg'); },
            get hatWizardSolid() { return DataPathsConfig.getPath('assets/fontawesome/hat-wizard-solid.svg'); },
            get infoCircle() { return DataPathsConfig.getPath('assets/fontawesome/info-circle.svg'); },
            get magnifyingGlassSolid() { return DataPathsConfig.getPath('assets/fontawesome/magnifying-glass-solid.svg'); },
            get minusSolid() { return DataPathsConfig.getPath('assets/fontawesome/minus-solid.svg'); },
            get plusSolid() { return DataPathsConfig.getPath('assets/fontawesome/plus-solid.svg'); },
            get settings() { return DataPathsConfig.getPath('assets/fontawesome/settings.svg'); },
            get solidBolt() { return DataPathsConfig.getPath('assets/fontawesome/solid-bolt.svg'); },
            get squareSolid() { return DataPathsConfig.getPath('assets/fontawesome/square-solid.svg'); },
            get toggleOffSolid() { return DataPathsConfig.getPath('assets/fontawesome/toggle-off-solid.svg'); },
            get toggleOnSolid() { return DataPathsConfig.getPath('assets/fontawesome/toggle-on-solid.svg'); },
            get trashSolid() { return DataPathsConfig.getPath('assets/fontawesome/trash-solid.svg'); },
            get triangleWarning() { return DataPathsConfig.getPath('assets/fontawesome/triangle-warning.svg'); },
            get wheatAwnSolid() { return DataPathsConfig.getPath('assets/fontawesome/wheat-awn-solid.svg'); },
            get xmark() { return DataPathsConfig.getPath('assets/fontawesome/xmark.svg'); }
        },
        
        // FRBA logos
        frba: {
            get blackLogo() { return DataPathsConfig.getPath('assets/frba/Michael Assets/frba_black_logo.png'); },
            get whiteLogo() { return DataPathsConfig.getPath('assets/frba/Michael Assets/frba_white_logo.png'); },
            get lineLogo() { return DataPathsConfig.getPath('assets/frba/Michael Assets/frba_line_logo.png'); },
            get mobileLogo() { return DataPathsConfig.getPath('assets/frba/Michael Assets/frba_mobile_logo.png'); },
            get box2Line() { return DataPathsConfig.getPath('assets/frba/FRBAlogo-Box-2Line.png'); },
            get column1Line() { return DataPathsConfig.getPath('assets/frba/FRBAlogo-Column-1Line.png'); },
            get column2Line() { return DataPathsConfig.getPath('assets/frba/FRBAlogo-Column-2Line.png'); }
        }
    }
};

// Helper function to get the path based on current basket setting
DataPaths.getCurrentPath = function(pathType) {
    if (!this.basket[pathType]) {
        console.error(`Invalid path type: ${pathType}`);
        return null;
    }
    
    const currentBasket = this.basket.current;
    return this.basket[pathType][currentBasket];
};

// Helper function to get a specific data path
DataPaths.getPath = function(section, subsection, item) {
    if (!this[section]) {
        console.error(`Invalid section: ${section}`);
        return null;
    }
    
    if (subsection && !this[section][subsection]) {
        console.error(`Invalid subsection: ${subsection} in section ${section}`);
        return null;
    }
    
    if (subsection && item && !this[section][subsection][item]) {
        console.error(`Invalid item: ${item} in subsection ${subsection} of section ${section}`);
        return null;
    }
    
    if (subsection && item) {
        return this[section][subsection][item];
    } else if (subsection) {
        return this[section][subsection];
    } else {
        return this[section];
    }
};

// Helper to set the current basket type
DataPaths.setBasketType = function(basketType) {
    if (basketType !== 'consumer' && basketType !== 'total') {
        console.error(`Invalid basket type: ${basketType}. Must be 'consumer' or 'total'.`);
        return false;
    }
    
    this.basket.current = basketType;
    //console.log(`Basket type set to: ${basketType}`);
    return true;
};

// Export the data paths object
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataPaths;
} else {
    // For browser environment
    window.DataPaths = DataPaths;
}