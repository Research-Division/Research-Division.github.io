let selectedISOs = [];

function updateSelectedDisplay(){
    // We only update the receipt when submit buttons are clicked,
    // either from the product modal or from the map popup tariff submit

}

// Make addISO globally available to be used from map popups as well
window.addISO = function(iso){
    if (!selectedISOs.includes(iso)){
        selectedISOs.push(iso);
        updateSelectedDisplay();
    }
}

function removeISO(iso){
    selectedISOs = selectedISOs.filter(item => item != iso);
    updateSelectedDisplay();
}

// We'll no longer define window.removeCountry here
// Receipt.js has its own implementation that will call removeISO

//Initializes the modal by fetching our json
function initCountryModal(){
    fetch(DataPaths.common.country_continent_mapping)
        .then(response => response.json())
        .then(data => {
            initializeUI(data);
            
            // Add Enter key functionality to the country search input
            setTimeout(() => {
                const searchInput = document.getElementById('country-search-input');
                if (searchInput) {
                    // Add keydown event listener
                    searchInput.addEventListener('keydown', function(event) {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            
                            // Find the next button and click it
                            const nextButton = document.querySelector('#next-button-container button');
                            if (nextButton) {
                                nextButton.click();
                            }
                        }
                    });
                }
            }, 300); // Small delay to ensure DOM is ready
        }).catch(error => console.error('Error loading countries:', error));
}

function initializeUI(data){
    renderContinents(data);
    
    // Add event listener for the "Select All Countries" button
    const selectAllBtn = document.getElementById('select-all-countries');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
            // Find all continent checkboxes
            const continentCheckboxes = document.querySelectorAll('.continent-select');
            
            // Click each one that isn't already checked
            continentCheckboxes.forEach(checkbox => {
                if (!checkbox.checked) {
                    checkbox.click();
                }
            });
        });
    }
    
    // Handle search functionality
    const searchBox = document.getElementById('country-search-input');
    if (searchBox) {
        searchBox.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            let filteredData = {};

            Object.keys(data)
            .forEach(continent => {
                const filteredCountries = data[continent].filter(country =>
                    country.name.toLowerCase().includes(searchTerm)
                );
                if (filteredCountries.length >0){
                    filteredData[continent] = filteredCountries;
                }
            });
            renderContinents(filteredData);
        });
    }
}

function renderContinents(data){
    const container = document.getElementById('continent-list');
    container.innerHTML = ''; // Clear previous content

    Object.keys(data).forEach(continent => {
        const countries = data[continent];

        // Create a container for the continent block
        const block = document.createElement('div');
        block.classList.add('continent-block');

        // Create the header that includes a toggle icon, the continent name, and a "select all" checkbox
        const header = document.createElement('div');
        header.classList.add('continent-header');

        const toggleIcon = document.createElement('span');
        toggleIcon.classList.add('toggle-icon', 'dropdown-triangle');
        toggleIcon.textContent = '►'; // Initially collapsed

        const titleSpan = document.createElement('span');
        titleSpan.classList.add('title');
        titleSpan.textContent = continent;

        // Create a container div for the checkbox and label
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.display = 'flex';
        checkboxContainer.style.alignItems = 'center';

        // Create a wrapper label element that will contain the checkbox
        // This is a different approach that is more reliably detected by accessibility tools
        const continentLabel = document.createElement('label');
        continentLabel.style.display = 'flex';
        continentLabel.style.alignItems = 'center';
        continentLabel.style.marginRight = '25px'; // Keep the original spacing
        
        // Create checkbox inside the label for better accessibility detection
        const continentCheckbox = document.createElement('input');
        continentCheckbox.type = 'checkbox';
        continentCheckbox.classList.add('continent-select');
        continentCheckbox.id = `continent-select-${continent.replace(/\s+/g, '-').toLowerCase()}`;
        
        // Add event listener
        continentCheckbox.addEventListener('click', function(e){
            e.stopPropagation();
            if (continentCheckbox.checked){
                countries.forEach(country =>{
                    // Handle special case for Israel/Palestine where country might be an array
                    const countryName = Array.isArray(country.country) ? country.country[0] : country.country;
                    const isoCode = Array.isArray(country.ISO_A3) ? country.ISO_A3[0] : country.ISO_A3;
                    
                    // Store each country name in the global map before adding the ISO
                    isoToCountryName[isoCode] = countryName;
                    addISO(isoCode);
                    const countryCheckbox = document.querySelector(`input[data-iso='${isoCode}']`);
                    if (countryCheckbox){
                        countryCheckbox.checked = true;
                    }
                });
            } else{
                countries.forEach(country =>{
                    const isoCode = Array.isArray(country.ISO_A3) ? country.ISO_A3[0] : country.ISO_A3;
                    removeISO(isoCode);
                    const countryCheckbox = document.querySelector(`input[data-iso='${isoCode}']`);
                    if (countryCheckbox){
                        countryCheckbox.checked = false;
                    }
                });
            }
            updateSelectedDisplay();
        });
        
        // Add checkbox to the label
        continentLabel.appendChild(continentCheckbox);
        
        // Add a text node for screen readers that explains the checkbox function
        const labelText = document.createTextNode(`Select all ${continent} countries`);
        
        // Create a span to visually hide the text but keep it available for screen readers
        const hiddenSpan = document.createElement('span');
        hiddenSpan.classList.add('visually-hidden');
        hiddenSpan.appendChild(labelText);
        
        // Add the hidden text to the label
        continentLabel.appendChild(hiddenSpan);
        
        // Add the label (which now contains the checkbox) to the container
        checkboxContainer.appendChild(continentLabel);
        
        header.appendChild(toggleIcon);
        header.appendChild(titleSpan);
        header.appendChild(checkboxContainer);

        header.addEventListener('click', function(e){
            if (e.target.tagName.toLowerCase() !== 'input'){
                if (countryList.style.display == 'none'){
                    countryList.style.display = 'block';
                    toggleIcon.textContent = '▼';
                } else{
                    countryList.style.display = 'none';
                    toggleIcon.textContent = '►';
                }
            }
        });
        block.appendChild(header);

        const countryList = document.createElement('ul');
        countryList.classList.add('country-list');
        countryList.style.display = 'none';

        countries.forEach(country =>{
            const li = document.createElement('li');
            li.classList.add('country-item');

            const countryName = Array.isArray(country.country) ? country.country[0] : country.country;
            const isoCode = Array.isArray(country.ISO_A3) ? country.ISO_A3[0] : country.ISO_A3;
            
            // Create unique ID for this checkbox
            const countryCheckboxId = `country-checkbox-${isoCode}`;
            
            // Create the checkbox with a proper ID
            const countryCheckbox = document.createElement('input');
            countryCheckbox.type = 'checkbox';
            countryCheckbox.id = countryCheckboxId;
            countryCheckbox.setAttribute('data-iso', isoCode);
            countryCheckbox.addEventListener('click', function(e){
                e.stopPropagation();
                if (countryCheckbox.checked){
                    // Store the country name in the global map before adding the ISO
                    isoToCountryName[isoCode] = countryName;
                    addISO(isoCode);
                } else{
                    removeISO(isoCode);
                }
                const allSelected = Array.from(countryList.querySelectorAll("input[type='checkbox']")).every(cb => cb.checked);
                continentCheckbox.checked = allSelected;
                updateSelectedDisplay();
            });
            
            // Create label element properly associated with the checkbox
            const label = document.createElement('label');
            label.htmlFor = countryCheckboxId;
            label.textContent = countryName;
            
            // Add elements to the list item
            li.appendChild(countryCheckbox);
            li.appendChild(label);
            countryList.appendChild(li);
        });
        block.appendChild(countryList);
        container.appendChild(block);
    });
}