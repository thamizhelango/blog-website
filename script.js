// Global state
let allBlogs = [];
let filteredBlogs = [];
let activeTags = new Set();
let currentPage = 1;
const blogsPerPage = 9;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
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
        
        // Then apply filters and setup event listeners
        applyFilters();
        setupEventListeners();
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
    
    applyFilters();
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const mobileClearFiltersBtn = document.getElementById('mobileClearFilters');
    
    searchInput.addEventListener('input', debounce(applyFilters, 300));
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
function applyFilters() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
    
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
    
    // Reset to first page when filters change
    currentPage = 1;
    renderBlogs(filteredBlogs);
    updateResultsCount(filteredBlogs.length);
    renderPagination();
}

// Clear all filters
function clearAllFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
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
    
    applyFilters();
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
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="pagination-btn prev" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
            Previous
        </button>
    `;
    
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
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-info">...</span>`;
        }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Last page and ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-info">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    paginationHTML += `
        <button class="pagination-btn next" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
            Next
        </button>
    `;
    
    paginationControls.innerHTML = paginationHTML;
}

// Go to specific page
window.goToPage = function(page) {
    const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderBlogs(filteredBlogs);
    updateResultsCount(filteredBlogs.length);
    renderPagination();
    
    // Scroll to top of blog grid
    document.getElementById('blogGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Mobile menu functionality
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    const mobileTagsDrawer = document.getElementById('mobileTagsDrawer');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const closeTagsDrawer = document.getElementById('closeTagsDrawer');
    const searchContainer = document.querySelector('.search-container');
    
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
    
    // Toggle search on mobile
    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', () => {
            searchContainer?.classList.toggle('active');
            if (searchContainer?.classList.contains('active')) {
                // Focus search input when opened
                setTimeout(() => {
                    document.getElementById('searchInput')?.focus();
                }, 100);
            }
        });
    }
    
    // Close drawer on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileTagsDrawer?.classList.contains('active')) {
            closeDrawer();
        }
    });
}

