/**
 * sectionMetadataLoader.js
 * 
 * Utility module to load section and chapter metadata from HS nomenclature
 * for use in the compressed treemap visualization.
 */

// Make sure the CompressedTreemap namespace exists
window.CompressedTreemap = window.CompressedTreemap || {};

/**
 * Loads section and chapter metadata and enhances the metadata provider
 * @param {Object} metadataProvider - MetadataProvider instance to enhance
 * @returns {Promise} Promise resolving when metadata is loaded and applied
 */
window.CompressedTreemap.loadSectionMetadata = function(metadataProvider) {
    return new Promise((resolve, reject) => {
        // Check if we already have section titles cached
        if (window.sectionTitlesMap) {
            //console.log('Using cached section titles');
            enhanceMetadataWithSectionTitles(metadataProvider, window.sectionTitlesMap, window.chapterTitlesMap);
            resolve(metadataProvider);
            return;
        }

        // Fetch the section metadata
        fetch(DataPaths.meta.section_to_chapters)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load section metadata: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Store section and chapter titles in global cache
                window.sectionTitlesMap = {};
                window.chapterTitlesMap = {};
                
                // Process section and chapter data
                Object.keys(data).forEach(sectionId => {
                    const section = data[sectionId];
                    // Store section title
                    window.sectionTitlesMap[sectionId] = section.title || `Section ${sectionId}`;
                    
                    // Store chapter titles
                    if (section.chapters) {
                        Object.keys(section.chapters).forEach(chapterId => {
                            const chapter = section.chapters[chapterId];
                            window.chapterTitlesMap[chapterId] = chapter.short || `Chapter ${chapterId}`;
                        });
                    }
                });
                
                // Enhance the provided metadata provider
                enhanceMetadataWithSectionTitles(metadataProvider, window.sectionTitlesMap, window.chapterTitlesMap);
                
                resolve(metadataProvider);
            })
            .catch(error => {
                console.error('Error loading section and chapter metadata:', error);
                // Still resolve but with a warning
                resolve(metadataProvider);
            });
    });
};

/**
 * Synchronously loads section metadata (for use during initialization)
 * @param {Object} metadataProvider - MetadataProvider instance to enhance
 * @returns {Object} Enhanced metadata provider
 */
window.CompressedTreemap.loadSectionMetadataSync = function(metadataProvider) {
    // Check if we already have section titles cached
    if (window.sectionTitlesMap) {
        //console.log('loadSectionMetadataSync: Using cached section titles');
        enhanceMetadataWithSectionTitles(metadataProvider, window.sectionTitlesMap, window.chapterTitlesMap);
        return metadataProvider;
    }
    
    //console.log('loadSectionMetadataSync: No cached titles found, loading from file');
    
    // We need to load section titles synchronously
    try {
        //console.log('Loading section titles synchronously');
        const xhr = new XMLHttpRequest();
        xhr.open('GET', DataPaths.meta.section_to_chapters, false); // false makes it synchronous
        xhr.send(null);
        
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            
            // Store section and chapter titles in global cache
            window.sectionTitlesMap = {};
            window.chapterTitlesMap = {};
            
            // Process section and chapter data
            Object.keys(data).forEach(sectionId => {
                const section = data[sectionId];
                // Store section title
                window.sectionTitlesMap[sectionId] = section.title || `Section ${sectionId}`;
                
                // Store chapter titles
                if (section.chapters) {
                    Object.keys(section.chapters).forEach(chapterId => {
                        const chapter = section.chapters[chapterId];
                        window.chapterTitlesMap[chapterId] = chapter.short || `Chapter ${chapterId}`;
                    });
                }
            });
            
            // Enhance the provided metadata provider
            enhanceMetadataWithSectionTitles(metadataProvider, window.sectionTitlesMap, window.chapterTitlesMap);
            
            //console.log('Section and chapter titles loaded successfully');
        } else {
            console.error('Failed to load section titles, status:', xhr.status);
        }
    } catch (error) {
        console.warn('Error loading section titles, using default names:', error);
    }
    
    return metadataProvider;
};

/**
 * Helper function to enhance metadata provider with section and chapter titles
 * @param {Object} metadataProvider - The metadata provider to enhance
 * @param {Object} sectionTitles - Map of section ID to title
 * @param {Object} chapterTitles - Map of chapter ID to title
 * @private
 */
function enhanceMetadataWithSectionTitles(metadataProvider, sectionTitles, chapterTitles = {}) {
    //console.log('Enhancing metadata with section and chapter titles');
    //console.log('Section titles count:', Object.keys(sectionTitles).length);
    //console.log('Chapter titles count:', Object.keys(chapterTitles).length);
    
    // Store our raw section and chapter mappings for direct access
    // This will help us differentiate between sections and chapters even if they have the same ID numbers
    metadataProvider._rawSectionMap = sectionTitles;
    metadataProvider._rawChapterMap = chapterTitles;
    
    // Add section titles to metadata with prefix to avoid ID collisions
    Object.keys(sectionTitles).forEach(sectionId => {
        // Create a special ID for sections to avoid confusion with chapters
        const prefixedSectionId = `section_${sectionId}`;
        
        // Add metadata with the special prefixed ID
        metadataProvider.addMetadata(prefixedSectionId, {
            name: sectionTitles[sectionId],
            type: 'section',
            originalId: sectionId
        });
        
        // Also add with the original ID for backward compatibility
        metadataProvider.addMetadata(sectionId, {
            name: sectionTitles[sectionId],
            type: 'section'
        });
        
        //console.log(`Set section ${sectionId} name to: ${sectionTitles[sectionId]}`);
    });
    
    // Add chapter titles to metadata with prefix
    Object.keys(chapterTitles).forEach(chapterId => {
        // Create a special ID for chapters
        const prefixedChapterId = `chapter_${chapterId}`;
        
        // Add metadata with the special prefixed ID
        metadataProvider.addMetadata(prefixedChapterId, {
            name: chapterTitles[chapterId],
            type: 'chapter',
            originalId: chapterId
        });
        
        // Also add with the original ID, but check if it conflicts with a section ID
        // If it does, we'll add extra type information to help disambiguate
        if (sectionTitles[chapterId]) {
            // This chapter ID conflicts with a section ID
            // Add special context to help the renderer disambiguate
            metadataProvider.addMetadata(chapterId, {
                name: chapterTitles[chapterId],
                type: 'chapter',
                conflictsWith: 'section'
            });
            //console.log(`Chapter ${chapterId} conflicts with section ID, adding special metadata`);
        } else {
            // No conflict, add normally
            metadataProvider.addMetadata(chapterId, {
                name: chapterTitles[chapterId],
                type: 'chapter'
            });
        }
        
        //console.log(`Set chapter ${chapterId} name to: ${chapterTitles[chapterId]}`);
    });
    
    // Log a sample of the metadata
    const sampleSectionId = Object.keys(sectionTitles)[0];
    const sampleChapterId = Object.keys(chapterTitles)[0];
    
    if (sampleSectionId) {
        /*console.log(`Sample section metadata for ID ${sampleSectionId}:`, 
                    metadataProvider.getAllMetadata(sampleSectionId));
        console.log(`Sample section name from metadata: ${metadataProvider.getName(sampleSectionId)}`);
        */
    }
    
    if (sampleChapterId) {
        /*console.log(`Sample chapter metadata for ID ${sampleChapterId}:`, 
                    metadataProvider.getAllMetadata(sampleChapterId));
        console.log(`Sample chapter name from metadata: ${metadataProvider.getName(sampleChapterId)}`);
        */
    }
}