/*
This is the central link-bibliography management file. All the links used anywhere in the application are defined here and
are mapped accordingly. When updating links, please update here and DO NOT hardcode them. This makes life a hell for those 
who come after you and must maintain the code. 

Everything needed to create an appropriate citation and hyperlink is included here.


TEMPLATE: 
    key: {
        name: "Name of the link",
        site_description: "Description of the site",
        description: "Description of the person or organization",
        author: "Author of the site", 
        socials: {
            twitter_handle: "@twitter_handle",
            twitter_url : "x.com/twitter_handle",
            bsky_handle: "@bsky_handle",
            bsky_url: "bsky.app/bsky_handle",
            email: "email@email.com"
            },
        affiliations:['PhD granting institution (if person)', 'Professional Affiliatios', Current Institution']






*/


export const LINKS = {
// INSTITUTIONS INSTITUTIONS INSTITUTIONS INSTITUTIONS INSTITUTIONS INSTITUTIONS
    ies: {title: "International Economics Section", acronym: "IES", link: 'https://ies.princeton.edu/', category: 'institution'},
    cesifo: {title: 'CESifo Network', acronym: "CESifo", link:'https://ww.ifo.ed/en/cesifo/cesifo-homepage/', category: 'institution'},
    cepr: {title: 'Centre for Economic Policy Research', acronym: 'CEPR', link:'https://www.cepr.org/', category: 'institution'},

// PERSONS PERSONS PERSONS PERSONS PERSONS PERSONS PERSONS PERSONS
    feodoraTeti: {
        name: "Feodora Teti Personal Webpage",
        site_description: "Feodora Teti, PhD Personal Webpage. Links to their Curriculum Vitae, research publications, and publicly available datasets.",
        description: "Feodora teti is an IES Postdoctoral Fellow at Princeton University and an Assistant Professor (non-tenure) and Economist at LMU Munich and the ifo Institute. She focuses on international trade and trade policy, with an emphasis on how firms and consumers respond to policy-induced changes in trade costs. To address these questions, I rely on large-scale data and innovate methods to construct new datasets. She is affiliated with the CESifo and CEPR.",
        author: "Feodora Teti, Ph.D.", 
        contact: {
            twitter_handle: "@FeodoraTeti",
            bsky_handle: "@feodorateti.bsky.social",
            twitter_url: "x.com/FeodoraTeti",
            bsky_url: "bsky.app/feodorateti.bsky.social",
            email: "f.teti@princeton.edu",
            github: "https://github.com/FeodoraTeti/"
        },
        affiliations:['ies', 'cesifo', 'cepr'],
        link:"https://feodorateti.github.io/",
        category:'persons',
        date_updated: '2025-04-30',
    },
    simonFuchs: {
        name: "Simon Fuchs Personal Webpage",
        site_description: "Simon Fuchs, PhD Personal Webpage. Links to their Curriculum Vitae, research publications, and publicly available datasets.",
        description: "Simon Fuchs is visiting as a lecturer at Dartmouth College and a research economist at the Federal Reserve Bank of Atlanta. He received his PhD from the Toulouse School of Economics in 2018. They focus on the macroeconomic effects of the spatial distribution of economic activity. They work on topics of spatial, international, transportation and urban economics. They are one of the co-organizers of the Atlanta International Economics Workshop and an affiliate of the CESIfo research network.",
        author: "Simon Fuchs, Ph.D.",
        contact: {
            twitter_handle: "@SimonFuchs4",
            twitter_url : "x.com/SimonFuchs4",
            email: 'sfuchs.de@gmail.com',
            github: 'https://gihthub.com/sfuchs-de/'
        },
        affiliations:['cesifo'],
        link: "https://sfuchs-de.github.io/",
        category: 'persons',
        date_updated: '2025-04-30',
    },
// GOVERNMENT AGENCIES GOVERNMENT AGENCIES GOVERNMENT AGENCIES GOVERNMENT
    commerce: {
        name: "United States Department of Commerce",
        author: 'United States Department of Commerce',
        link: 'https://www.commerce.gov',
        category:'govAgency',
    },
    bea: {
        name: "Bureau of Economic Analysis",
        acronym: "BEA",
        parent_dept: "United States Department of Commerce",
        misc: "",
        site_description: "The home page of the United States Department of Commerce's Bureau of Economic Analysis (BEA). Provides access to research, tools, news, and data pertaining the the economy of the United States of America.",
        author: 'Bureau of Economic Analysis',
        contact: {
            twitter_handle: '@BEA_News',
            twitter_url: 'x.com/BEA_News',
            linkedin_url: 'https://www.linkedin.com/company/bureau-of-economic-analysis/',
        },
        affiliations:['commerce'],
        link:'https://www.bea.gov',
        category:'govAgency',
        date_updated: '2025-04-30'
    },
    census: {
        name: "United States Census Bureau", 
        misc: "",
        site_description: "The home page of the United States Census Bureau. Provides access to research, tools, news, and data pertaining to the population and economy of the United States of America.",
        author: 'United States Census Bureau',
        contact:{
            twitter_handle: '@uscensusbureau',
            twitter_url: 'https://x.com/uscensusbureau/',
            linkedin_url: 'https://www.linkedin.com/company/us-census-bureau/',
        },
        link: 'https://www.census.gov',
        category:'govAgency',
        date_updated: '2025-04-30'
    },
    usitc: { 
        name: "United States International Trade Commission", 
        acronym: "USITC",
        misc: "",
        site_description: 'The home page for the United States International Trade Commission (USITC). Provides access to investigations, commission notes, publications, tariff information, harmonized tariff schedule, and data.',
        author: 'United States International Trade Commission',
        contact:{
            media: 'publicaffaits@usitc.gov',
        },
        link:'https://www.usitc.gov',
        category:'govAgency',
        date_updated: '2025-04-30'
    },
// DATA SOURCES DATA SOURCES DATA SOURCES DATA SOURCES DATA SOURCES DATA SOURCES
    beaIO: {
        name: "BEA Input-Output Accounts Data",
        site_description: "Page contains the BEA's Input-Output Accounts Data. This data is used to measure the interdependencies between different sectors of the economy.",
        misc: "",
        author: 'Bureau of Economic Analysis',
        contact:{
            email: 'industryeconomicaccounts@bea.gov',
        },
        link:'https://www.bea.gov/industry/input-output-accounts-data',
        affiliations:['bea'],
        category:'dataSource',
        date_updated: '2025-04-30'
    },
    censusTrade: { 
        link:'https://usatrade.census.gov/',
        misc: "",
        affiliations:['census'],
        category:'dataSource',
        date_updated: '2025-04-30'
    },
    usitcHTS: { 
        link:'https://hts.usitc.gov',
        misc: "",
        affiliations:['usitc'],
        category:'dataSource',
        date_updated: '2025-04-30'
    },
    usitcTariffDataweb: {
        link:'https://dataweb.usitc.gov/tariff/database',
        misc: "",
        affiliations:['usitc'],
        category:'dataSource',
        date_updated: '2025-04-30'
    },
    tetiGTD:{
        link:'https://feodorateti.github.io/data.html',
        site_description: "Link to Feodora Teti's Global Trade Database (GTD): a comprehensive dataset of bilateral tariffs between countries.",
        description: "The Global Tariff Database (GTD) provides bilateral statutory tariff rates for 200 importers and their partners, spanning 34 years (1988–2021). It includes both MFN and preferential tariffs and is based on HS6-level tariff rates (HS88/92 Nomenclature), covering over 6.9 billion observations.",
        misc: "",
        version_no: 'v_beta1-2024', 
        author: 'Feodora Teti',
        affiliations:['feodoraTeti'],
        suggested_citation: "Feodora Teti's Global Tariff Database (v_beta1-2024-12) from Teti(2024).",
        category:'attribution',
        date_updated: '2025-04-30'
    },

// ATTRIBUTION ATTRIBUTION ATTRIBUTION ATTRIBUTION ATTRIBUTION ATTRIBUTION 
    leaflet:{ 
        link:'https://leafletjs.com/',
        site_description: "Leaflet.js homepage. Leaflet is a JavaScript library for interactive maps.",
        description: "Leaflet provides the interactive functionality for maps in this application", 
        version_no: '1.9.4',
        category:'attribution',
        date_updated: '2025-04-30'

    },
    geojsonGithub: {
        link:'https://github.com/datasets/geo-countries/',
        site_description: "Github page for the geojson file used to create the map of the world.",
        description: "The geojson file used to create the map of the world. This file contains the coordinates for the countries in the world.",
        version_no: '1.1',
        category:'attribution',
        date_updated: '2025-04-30',
    },
    countryConverter:{
        link: 'https://pypi.org/project/country-converter/',
        site_description: 'Country Converter Python Package Homepage and Documentation',
        description: 'The country converter coco - a Python package for converting country names between different classifications schemes', 
        version: '1.3',
        licesne: 'GNU General Public Liscense v3.0 (GPLv3)', 
        author: 'Konstantin Stadler',
        contact:{
            email: 'konstantin.stadler@ntnu.no'
        },
        journal: 'Journal of Open Source Software', 
        doi: '10.21105/joss.00332', 
        year: '2017',
        citation: 'Stadler, K. (2017). The country converter coco - a Python package for converting country names between different classification scnemes. The Journal of Open Source Software. doi: 10.21105/joss.00332',
        date_updated: '2025-05-28'
    }

// CITATIONS CITATIONS CITATIONS CITATIONS CITATIONS CITATIONS CITATIONS

// MISC MISC MISC MISC MISC MISC MISC MISC MISC MISC MISC MISC MISC MISC 

}
