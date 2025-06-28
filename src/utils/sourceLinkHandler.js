/**
 * Source Link Handler
 * Makes source citations in charts clickable and links them to appropriate help sections
 */

window.sourceLinkHandler = (function() {
    
    /**
     * Initialize source link handlers for a container
     * @param {HTMLElement} container - Container element to search for source notes
     */
    function initializeSourceLinks(container) {
        if (!container) {
            container = document;
        }
        
        // Find all source note elements
        const sourceElements = container.querySelectorAll('.chart-notes p, .chart-source-note');
        
        sourceElements.forEach(element => {
            const text = element.textContent || element.innerText;
            
            // Check if this is a source line and contains one of our target citations
            if (text.includes('Source:')) {
                makeSourceClickable(element, text);
            }
        });
    }
    
    /**
     * Make a source element clickable based on its content
     * @param {HTMLElement} element - The source element to make clickable
     * @param {string} text - The text content of the element
     */
    function makeSourceClickable(element, text) {
        let highlightText = null;
        
        // Determine which section to link to based on content
        if (text.includes('Global Tariff Database') && text.includes('Teti')) {
            highlightText = 'Feodora Teti\'s Global Tariff Database';
        } else if (text.includes('USA Trade Online') || text.includes('U.S. Census Bureau')) {
            highlightText = 'U.S. Census Bureau international trade data';
        }
        
        if (highlightText) {
            // Find the "Source:" part and the actual citation part
            const sourceIndex = text.indexOf('Source:');
            if (sourceIndex !== -1) {
                const beforeSource = text.substring(0, sourceIndex);
                const sourceLabel = 'Source:';
                const afterSource = text.substring(sourceIndex + sourceLabel.length).trim();
                
                // Replace the element content with styled HTML
                element.innerHTML = `${beforeSource}<strong>${sourceLabel}</strong> <span class="clickable-citation" style="color: var(--primary); text-decoration: underline; cursor: pointer;" title="Click to view data source information">${afterSource}</span>`;
                
                // Add click handler to just the citation span
                const citationSpan = element.querySelector('.clickable-citation');
                if (citationSpan) {
                    citationSpan.addEventListener('click', function(e) {
                        e.preventDefault();
                        openHelpPanelToSource(highlightText);
                    });
                }
            } else {
                // Fallback if "Source:" is not found - make entire element clickable
                element.style.cursor = 'pointer';
                element.style.textDecoration = 'underline';
                element.style.color = 'var(--primary)';
                element.title = 'Click to view data source information';
                
                element.addEventListener('click', function(e) {
                    e.preventDefault();
                    openHelpPanelToSource(highlightText);
                });
            }
        }
    }
    
    /**
     * Open help panel and scroll to specific data source section
     * @param {string} highlightText - Text to highlight in the section
     */
    function openHelpPanelToSource(highlightText) {
        // Show the help panel (same function used by FAQ and citation links)
        if (window.showHelpPanel && typeof window.showHelpPanel === 'function') {
            window.showHelpPanel();
            
            // After panel is visible, scroll to the data source section
            setTimeout(() => {
                const modalBody = document.querySelector('.modal-body');
                
                if (modalBody) {
                    // Look for the specific data source
                    const allElements = modalBody.querySelectorAll('li, p');
                    let targetElement = null;
                    
                    for (let el of allElements) {
                        const elementText = el.textContent || el.innerText;
                        if (elementText.includes(highlightText)) {
                            targetElement = el;
                            break;
                        }
                    }
                    
                    if (targetElement) {
                        // Get the position relative to the modal body
                        const elementPosition = targetElement.offsetTop;
                        
                        // Scroll the modal body to the data source section
                        modalBody.scrollTo({
                            top: elementPosition - 100, // Subtract some pixels to show context above
                            behavior: 'smooth'
                        });
                        
                        // Add a brief highlight effect to the element
                        targetElement.style.backgroundColor = 'rgba(0, 118, 182, 0.1)';
                        targetElement.style.transition = 'background-color 0.5s ease';
                        
                        // Remove highlight after 3 seconds
                        setTimeout(() => {
                            targetElement.style.backgroundColor = '';
                        }, 3000);
                    } else {
                        // Fallback: scroll to Data Sources section header
                        const dataSources = modalBody.querySelectorAll('h4');
                        for (let h4 of dataSources) {
                            if (h4.textContent.includes('Data Sources')) {
                                const headerPosition = h4.offsetTop;
                                modalBody.scrollTo({
                                    top: headerPosition - 100,
                                    behavior: 'smooth'
                                });
                                break;
                            }
                        }
                    }
                }
            }, 500); // Wait a bit longer for the modal to fully render
        }
    }
    
    /**
     * Auto-initialize source links when DOM is ready
     */
    function autoInitialize() {
        // Initialize immediately if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initializeSourceLinks();
            });
        } else {
            initializeSourceLinks();
        }
        
        // Also set up a MutationObserver to handle dynamically added charts
        if (window.MutationObserver) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Check if this node or its descendants contain source notes
                                const sourceNotes = node.querySelectorAll ? 
                                    node.querySelectorAll('.chart-notes p, .chart-source-note') : [];
                                
                                if (sourceNotes.length > 0) {
                                    initializeSourceLinks(node);
                                }
                            }
                        });
                    }
                });
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }
    
    // Auto-initialize
    autoInitialize();
    
    // Public API
    return {
        initializeSourceLinks,
        makeSourceClickable,
        openHelpPanelToSource
    };
})();