// Global state
let allBlogs = [];
let filteredBlogs = [];
let activeTags = new Set();
let currentPage = 1;
const blogsPerPage = 9;

// URL state management functions
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    return {
        page: (page && !isNaN(page) && page > 0) ? page : 1,
        tags: params.get('tags') ? params.get('tags').split(',').filter(t => t) : [],
        search: params.get('search') || ''
    };
}

function updateURL() {
    const params = new URLSearchParams();
    
    // Always include page parameter for easier debugging and state management
    params.set('page', currentPage.toString());
    
    if (activeTags.size > 0) {
        params.set('tags', Array.from(activeTags).join(','));
    }
    
    const searchInput = document.getElementById('searchInput');
    const searchInputMobile = document.getElementById('searchInputMobile');
    const searchQuery = (searchInput?.value || searchInputMobile?.value || '').trim();
    if (searchQuery) {
        params.set('search', searchQuery);
    }
    
    const pathname = window.location.pathname.endsWith('/') && window.location.pathname !== '/' 
        ? window.location.pathname.slice(0, -1) 
        : window.location.pathname;
    const newURL = `${pathname}?${params.toString()}`;
    const currentURL = window.location.pathname + window.location.search;
    
    console.log('updateURL called:', { 
        currentPage, 
        newURL, 
        currentURL, 
        willUpdate: newURL !== currentURL 
    });
    
    // Always update URL to ensure it's in sync
    try {
        window.history.replaceState({ page: currentPage }, '', newURL);
        console.log('URL updated successfully to:', window.location.href);
    } catch (error) {
        console.error('Error updating URL:', error);
    }
}

function restoreStateFromURL() {
    const urlParams = getURLParams();
    
    console.log('Restoring state from URL:', urlParams);
    
    // Restore page
    currentPage = urlParams.page;
    console.log('Restored currentPage to:', currentPage);
    
    // Restore search query
    const searchInput = document.getElementById('searchInput');
    const searchInputMobile = document.getElementById('searchInputMobile');
    if (urlParams.search) {
        if (searchInput) searchInput.value = urlParams.search;
        if (searchInputMobile) searchInputMobile.value = urlParams.search;
        console.log('Restored search query:', urlParams.search);
    }
    
    // Restore active tags
    if (urlParams.tags.length > 0) {
        activeTags = new Set(urlParams.tags);
        console.log('Restored active tags:', Array.from(activeTags));
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Restore state from URL first
        restoreStateFromURL();
        
        // Load blogs data with cache-busting to ensure fresh data
        const cacheBuster = `?v=${Date.now()}`;
        const response = await fetch(`blogs.json${cacheBuster}`, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allBlogs = await response.json();
        
        console.log(`Loaded ${allBlogs.length} blogs (cache-busted)`);
        
        // Initialize tags first
        initializeTags();
        
        // Restore active tag buttons after tags are initialized
        if (activeTags.size > 0) {
            activeTags.forEach(tag => {
                const tagButtons = document.querySelectorAll(`[data-tag="${tag}"]`);
                tagButtons.forEach(btn => btn.classList.add('active'));
            });
        }
        
        // Then apply filters without resetting page (to preserve restored page from URL)
        applyFilters(false);
        setupEventListeners();
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            console.log('popstate event - restoring from URL');
            restoreStateFromURL();
            // Restore active tag buttons
            if (activeTags.size > 0) {
                document.querySelectorAll('.tag-filter').forEach(btn => {
                    const tag = btn.dataset.tag;
                    if (activeTags.has(tag)) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
            applyFilters(false);
        });
        
        // Update URL after initial load to ensure it matches current state
        // This ensures the URL is always in sync with the page state
        updateURL();
        
        console.log('Initialization complete. Current page:', currentPage, 'URL:', window.location.href);
    } catch (error) {
        console.error('Error loading blogs:', error);
        document.getElementById('blogGrid').innerHTML = 
            '<p style="text-align: center; color: #ef4444;">Error loading blogs. Please check blogs.json file.</p>';
    }
});

// Extract unique tags from all blogs
function initializeTags() {
    const tagSet = new Set();
    allBlogs.forEach(blog => {
        if (blog.tags && Array.isArray(blog.tags)) {
            blog.tags.forEach(tag => {
                // Trim whitespace and ensure tag is not empty
                const cleanTag = tag.trim();
                if (cleanTag) {
                    tagSet.add(cleanTag);
                }
            });
        }
    });
    
    const sortedTags = Array.from(tagSet).sort();
    const tagFiltersContainer = document.getElementById('tagFilters');
    const mobileTagFiltersContainer = document.getElementById('mobileTagFilters');
    
    if (!tagFiltersContainer) {
        console.error('tagFilters container not found!');
        return;
    }
    
    // Clear existing tags first
    tagFiltersContainer.innerHTML = '';
    if (mobileTagFiltersContainer) {
        mobileTagFiltersContainer.innerHTML = '';
    }
    
    console.log(`Found ${sortedTags.length} unique tags from ${allBlogs.length} blogs`);
    
    if (sortedTags.length === 0) {
        console.warn('No tags found in blogs!');
        const noTagsMsg = '<span style="color: var(--text-secondary); font-size: 0.875rem;">No tags available</span>';
        tagFiltersContainer.innerHTML = noTagsMsg;
        if (mobileTagFiltersContainer) {
            mobileTagFiltersContainer.innerHTML = noTagsMsg;
        }
        return;
    }
    
    // Create and append tag buttons to both containers
    sortedTags.forEach((tag, index) => {
        try {
            // Desktop container
            const tagButton = createTagButton(tag);
            tagFiltersContainer.appendChild(tagButton);
            
            // Mobile container
            if (mobileTagFiltersContainer) {
                const mobileTagButton = createTagButton(tag);
                mobileTagFiltersContainer.appendChild(mobileTagButton);
            }
        } catch (error) {
            console.error(`Error creating tag button for "${tag}":`, error);
        }
    });
    
    console.log(`Successfully created ${sortedTags.length} tag buttons`);
}

// Helper function to create a tag button
function createTagButton(tag) {
    const tagButton = document.createElement('button');
    tagButton.className = 'tag-filter';
    tagButton.textContent = tag;
    tagButton.dataset.tag = tag;
    tagButton.setAttribute('type', 'button');
    tagButton.setAttribute('aria-label', `Filter by ${tag}`);
    tagButton.addEventListener('click', () => toggleTagFilter(tag));
    return tagButton;
}

// Toggle tag filter
function toggleTagFilter(tag) {
    const tagButtons = document.querySelectorAll(`[data-tag="${tag}"]`);
    
    if (tagButtons.length === 0) return;
    
    if (activeTags.has(tag)) {
        activeTags.delete(tag);
        tagButtons.forEach(btn => btn.classList.remove('active'));
    } else {
        activeTags.add(tag);
        tagButtons.forEach(btn => btn.classList.add('active'));
    }
    
    applyFilters(true); // Reset to page 1 when filters change
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchInputMobile = document.getElementById('searchInputMobile');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const mobileClearFiltersBtn = document.getElementById('mobileClearFilters');
    
    // Sync both search inputs
    const handleSearch = debounce(() => {
        applyFilters(true); // Reset to page 1 when search changes
    }, 300);
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        // Sync desktop input with mobile input
        searchInput.addEventListener('input', (e) => {
            if (searchInputMobile) searchInputMobile.value = e.target.value;
        });
    }
    if (searchInputMobile) {
        searchInputMobile.addEventListener('input', handleSearch);
        // Sync mobile input with desktop input
        searchInputMobile.addEventListener('input', (e) => {
            if (searchInput) searchInput.value = e.target.value;
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
    if (mobileClearFiltersBtn) {
        mobileClearFiltersBtn.addEventListener('click', clearAllFilters);
    }
    
    // Mobile menu handlers
    setupMobileMenu();
}


// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply search and tag filters
function applyFilters(resetPage = true) {
    const searchInput = document.getElementById('searchInput');
    const searchInputMobile = document.getElementById('searchInputMobile');
    const searchQuery = (searchInput?.value || searchInputMobile?.value || '').toLowerCase().trim();
    
    filteredBlogs = allBlogs.filter(blog => {
        // Search filter
        const matchesSearch = !searchQuery || 
            blog.title.toLowerCase().includes(searchQuery) ||
            (blog.tags && blog.tags.some(tag => tag.toLowerCase().includes(searchQuery)));
        
        // Tag filter
        const matchesTags = activeTags.size === 0 || 
            (blog.tags && blog.tags.some(tag => activeTags.has(tag)));
        
        return matchesSearch && matchesTags;
    });
    
    // Reverse order to show newest first
    filteredBlogs.reverse();
    
    // Reset to first page when filters change (unless explicitly told not to)
    if (resetPage) {
        currentPage = 1;
        console.log('applyFilters: Reset page to 1');
    } else {
        // Ensure current page is valid after filtering
        const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
        console.log('applyFilters: Preserving page', currentPage, 'totalPages:', totalPages);
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
            console.log('applyFilters: Adjusted page to', currentPage);
        } else if (currentPage < 1) {
            currentPage = 1;
            console.log('applyFilters: Adjusted page to 1');
        }
    }
    
    console.log('applyFilters: Rendering with currentPage:', currentPage);
    renderBlogs(filteredBlogs);
    updateResultsCount(filteredBlogs.length);
    renderPagination();
    updateURL();
}

// Clear all filters
function clearAllFilters() {
    const searchInput = document.getElementById('searchInput');
    const searchInputMobile = document.getElementById('searchInputMobile');
    
    if (searchInput) {
        searchInput.value = '';
    }
    if (searchInputMobile) {
        searchInputMobile.value = '';
    }
    
    activeTags.clear();
    
    // Remove active class from all tag buttons (both desktop and mobile)
    document.querySelectorAll('.tag-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Ensure tags are still present (safeguard against accidental clearing)
    const tagFiltersContainer = document.getElementById('tagFilters');
    const mobileTagFiltersContainer = document.getElementById('mobileTagFilters');
    
    // If tags are missing, re-initialize them
    if (tagFiltersContainer && tagFiltersContainer.children.length === 0) {
        console.warn('Tags container is empty, re-initializing tags...');
        initializeTags();
    }
    if (mobileTagFiltersContainer && mobileTagFiltersContainer.children.length === 0) {
        console.warn('Mobile tags container is empty, re-initializing tags...');
        initializeTags();
    }
    
    applyFilters(true); // Reset to page 1 when clearing filters
}

// Render blog cards
function renderBlogs(blogs) {
    const blogGrid = document.getElementById('blogGrid');
    const noResults = document.getElementById('noResults');
    const pagination = document.getElementById('pagination');
    
    if (blogs.length === 0) {
        blogGrid.style.display = 'none';
        noResults.style.display = 'block';
        pagination.style.display = 'none';
        return;
    }
    
    blogGrid.style.display = 'grid';
    noResults.style.display = 'none';
    
    // Calculate pagination
    const totalPages = Math.ceil(blogs.length / blogsPerPage);
    const startIndex = (currentPage - 1) * blogsPerPage;
    const endIndex = startIndex + blogsPerPage;
    const blogsToShow = blogs.slice(startIndex, endIndex);
    
    console.log('renderBlogs:', { 
        totalBlogs: blogs.length, 
        currentPage, 
        totalPages, 
        startIndex, 
        endIndex, 
        blogsToShowCount: blogsToShow.length 
    });
    
    blogGrid.innerHTML = blogsToShow.map(blog => createBlogCard(blog)).join('');
}

// Create a blog card HTML
function createBlogCard(blog) {
    const thumbnail = blog.thumbnail || 'https://via.placeholder.com/400x200?text=No+Image';
    const title = escapeHtml(blog.title || 'Untitled');
    const url = blog.url || '#';
    const tags = blog.tags || [];
    
    const tagsHtml = tags.map(tag => 
        `<span class="blog-card-tag">${escapeHtml(tag)}</span>`
    ).join('');
    
    return `
        <a href="${url}" target="_blank" rel="noopener noreferrer" class="blog-card">
            <img src="${thumbnail}" alt="${title}" class="blog-card-image" onerror="this.src='https://via.placeholder.com/400x200?text=Image+Not+Found'">
            <div class="blog-card-content">
                <h3 class="blog-card-title">${title}</h3>
                <div class="blog-card-tags">
                    ${tagsHtml}
                </div>
            </div>
        </a>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update results count
function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    const total = allBlogs.length;
    const startIndex = (currentPage - 1) * blogsPerPage + 1;
    const endIndex = Math.min(currentPage * blogsPerPage, count);
    
    if (count === total && total <= blogsPerPage) {
        resultsCount.textContent = `Showing all ${total} blogs`;
    } else {
        resultsCount.textContent = `Showing ${startIndex}-${endIndex} of ${count} blogs`;
    }
}

// Render pagination controls
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const paginationControls = pagination.querySelector('.pagination-controls');
    const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    // Clear existing content
    paginationControls.innerHTML = '';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn prev';
    prevBtn.textContent = 'Previous';
    const prevPage = currentPage - 1;
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Previous button clicked, going to page:', prevPage);
        if (prevPage >= 1) {
            goToPage(prevPage);
        }
    }, { passive: false });
    paginationControls.appendChild(prevBtn);
    
    // Page numbers
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page and ellipsis
    if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.className = 'pagination-btn';
        firstBtn.textContent = '1';
        firstBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Page 1 button clicked');
            goToPage(1);
        }, { passive: false });
        paginationControls.appendChild(firstBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-info';
            ellipsis.textContent = '...';
            paginationControls.appendChild(ellipsis);
        }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i.toString();
        const pageNum = i; // Capture the page number
        pageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Page button clicked:', pageNum);
            goToPage(pageNum);
        }, { passive: false });
        paginationControls.appendChild(pageBtn);
    }
    
    // Last page and ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-info';
            ellipsis.textContent = '...';
            paginationControls.appendChild(ellipsis);
        }
        const lastBtn = document.createElement('button');
        lastBtn.className = 'pagination-btn';
        lastBtn.textContent = totalPages.toString();
        const lastPageNum = totalPages;
        lastBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Last page button clicked:', lastPageNum);
            goToPage(lastPageNum);
        }, { passive: false });
        paginationControls.appendChild(lastBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn next';
    nextBtn.textContent = 'Next';
    const nextPage = currentPage + 1;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Next button clicked, going to page:', nextPage);
        if (nextPage <= totalPages) {
            goToPage(nextPage);
        }
    }, { passive: false });
    paginationControls.appendChild(nextBtn);
}

// Go to specific page
function goToPage(page) {
    const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
    console.log('goToPage called:', { page, totalPages, currentPage, filteredBlogsLength: filteredBlogs.length });
    
    if (page < 1 || page > totalPages) {
        console.warn('Invalid page:', page);
        return;
    }
    
    currentPage = page;
    console.log('Updated currentPage to:', currentPage);
    
    // Update URL immediately before rendering to ensure it's in sync
    updateURL();
    
    // Render blogs first
    renderBlogs(filteredBlogs);
    
    // Then update count and pagination
    updateResultsCount(filteredBlogs.length);
    renderPagination();
    
    // Force a reflow to ensure content is updated
    const blogGrid = document.getElementById('blogGrid');
    if (blogGrid) {
        blogGrid.offsetHeight; // Force reflow
    }
    
    // Scroll to top of blog grid on mobile (after a small delay to ensure content is rendered)
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            const blogGrid = document.getElementById('blogGrid');
            if (blogGrid) {
                blogGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }
}

// Make it available globally for debugging
window.goToPage = goToPage;

// Mobile menu functionality
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileTagsDrawer = document.getElementById('mobileTagsDrawer');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const closeTagsDrawer = document.getElementById('closeTagsDrawer');
    
    // Toggle tags drawer
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileTagsDrawer?.classList.add('active');
            mobileOverlay?.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    // Close tags drawer
    function closeDrawer() {
        mobileTagsDrawer?.classList.remove('active');
        mobileOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (closeTagsDrawer) {
        closeTagsDrawer.addEventListener('click', closeDrawer);
    }
    
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', closeDrawer);
    }
    
    // Close drawer on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileTagsDrawer?.classList.contains('active')) {
            closeDrawer();
        }
    });
}

