import { bibleLoader } from './bookLoader.js';
import { searchHandler } from './search.js';
import env from '../env.js';

class ChapterNavigator {
    constructor(app) {
        this.app = app;
        
        // Elements
        this.chapterStrip = document.getElementById('chapterStrip');
        this.chapterStripContainer = document.getElementById('chapterStripContainer');
        this.bookChapterButtons = document.getElementById('bookChapterButtons');
        this.viewAllChaptersBtn = document.getElementById('viewAllChaptersBtn');
        this.viewFullChaptersBtn = document.getElementById('viewFullChaptersBtn');
        this.chapterExpandModal = document.getElementById('chapterExpandModal');
        this.expandedChapterGrid = document.getElementById('expandedChapterGrid');
        this.closeExpandModal = document.getElementById('closeExpandModal');
        this.expandModalBookTitle = document.getElementById('expandModalBookTitle');
        
        // State
        this.chapterCount = 0;
        this.currentChapter = 1;
        this.visibleRange = { start: 1, end: 9 };
        this.isExpanded = false;
        this.initEventListeners();
    }
    
    initEventListeners() {
        // View all chapters buttons
        this.viewAllChaptersBtn.addEventListener('click', () => this.openExpandedView());
        this.viewFullChaptersBtn.addEventListener('click', () => this.openExpandedView());
        
        // Close expanded view
        this.closeExpandModal.addEventListener('click', () => this.closeExpandedView());
        
        // Chapter selection in strip
        this.chapterStrip.addEventListener('click', (e) => {
            const chapterButton = e.target.closest('button[data-chapter]');
            if (!chapterButton) return;
            this.selectChapter(chapterButton);
        });
        
        // Chapter selection in expanded view
        this.expandedChapterGrid.addEventListener('click', (e) => {
            const chapterButton = e.target.closest('button[data-chapter]');
            if (!chapterButton) return;
            this.selectChapter(chapterButton);
            this.closeExpandedView();
        });
        
        // Handle scroll snap on mobile
        this.chapterStrip.addEventListener('scroll', this.debounce(() => {
            // On mobile, we'll check if the user has stopped scrolling and snap to a chapter
            if (window.innerWidth < 768) {
                this.snapToNearestChapter();
            }
        }, 150));
    }
    
    debounce(func, wait) {
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
    
    snapToNearestChapter() {
        const buttons = this.chapterStrip.querySelectorAll('button');
        if (!buttons.length) return;
        
        // Find the button closest to the center of the viewport
        const stripRect = this.chapterStrip.getBoundingClientRect();
        const stripCenter = stripRect.left + stripRect.width / 2;
        
        let closestButton = null;
        let closestDistance = Infinity;
        
        buttons.forEach(button => {
            const rect = button.getBoundingClientRect();
            const buttonCenter = rect.left + rect.width / 2;
            const distance = Math.abs(buttonCenter - stripCenter);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestButton = button;
            }
        });
        
        if (closestButton) {
            closestButton.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest',
                inline: 'center' 
            });
        }
    }
    
    setChapterCount(count) {
        this.chapterCount = count;
        this.updateDisplayMode();
        
        // Create all chapters grid for expanded view
        this.createExpandedChapterGrid();
    }
    
    updateDisplayMode() {
        // Always show chapter strip for consistency
        this.chapterStripContainer.style.display = 'block';
        this.bookChapterButtons.classList.add('hidden');
    }
    
    setCurrentChapter(chapter) {
        this.currentChapter = parseInt(chapter);
        this.updateVisibleRange();
        this.updateStripView();
        this.scrollStripToCurrentChapter();
    }
    
    updateVisibleRange() {
        // Show current chapter and up to 10 on each side
        const visibleCount = 10;
        
        // Get visible range centered on current chapter
        let start = Math.max(1, this.currentChapter - visibleCount);
        let end = Math.min(this.chapterCount, this.currentChapter + visibleCount);
        
        this.visibleRange = { start, end };
    }
    
    updateStripView() {
        const { start, end } = this.visibleRange;
        const chapterButtons = [];
        
        for (let i = start; i <= end; i++) {
            const isActive = i === this.currentChapter;
            const isNear = Math.abs(i - this.currentChapter) <= 3;
            
            let sizeClass = 'min-w-[40px] aspect-square';
            let textClass = '';
            
            // Make buttons smaller as they get further from the current chapter
            if (isActive) {
                sizeClass = 'min-w-[48px] aspect-square';
                textClass = 'text-base font-semibold';
            } else if (isNear) {
                sizeClass = 'min-w-[40px] aspect-square';
                textClass = 'text-sm';
            } else {
                sizeClass = 'min-w-[36px] aspect-square';
                textClass = 'text-xs';
            }
            
            chapterButtons.push(`
                <button 
                    class="${sizeClass} flex items-center justify-center p-2 rounded-lg focus:outline-none snap-center ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-white shadow-sm hover:shadow'
                    } ${textClass} ${isActive ? 'scale-110' : ''} transition-all"
                    data-chapter="${i}">
                    ${i}
                </button>
            `);
        }
        
        // Add three-dot menu button as the last visible button if we're not showing all chapters
        if (this.chapterCount > end) {
            chapterButtons.push(`
                <button 
                    id="moreChaptersBtn"
                    class="min-w-[40px] aspect-square flex items-center justify-center p-2 rounded-lg focus:outline-none snap-center bg-white shadow-sm hover:shadow text-gray-600 transition-all"
                    aria-label="More chapters">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
                    </svg>
                </button>
            `);
        }
        
        this.chapterStrip.innerHTML = chapterButtons.join('');
        
        // Add event listener to the more chapters button
        const moreChaptersBtn = document.getElementById('moreChaptersBtn');
        if (moreChaptersBtn) {
            moreChaptersBtn.addEventListener('click', () => this.openExpandedView());
        }
        
        // Hide the old "+" button since we're now using the three-dot menu
        this.viewAllChaptersBtn.classList.add('hidden');
        
        // Make sure the new "View all chapters" button remains visible
        this.viewFullChaptersBtn.classList.remove('hidden');
    }
    
    scrollStripToCurrentChapter() {
        setTimeout(() => {
            const currentChapterBtn = this.chapterStrip.querySelector(`button[data-chapter="${this.currentChapter}"]`);
            if (currentChapterBtn) {
                currentChapterBtn.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }, 10);
    }
    
    createExpandedChapterGrid() {
        // Organize chapters into a clean grid
        const chapterButtons = [];
        const chaptersPerRow = 5;
        
        // Group chapters into rows of 5 for cleaner visualization
        for (let i = 1; i <= this.chapterCount; i++) {
            const isActive = i === this.currentChapter;
            const rowStart = (i % chaptersPerRow === 1) || i === 1;
            
            // Add row header for multiples of 20 (or first row)
            if (i === 1 || i % 20 === 1) {
                const rangeEnd = Math.min(i + 19, this.chapterCount);
                chapterButtons.push(`
                    <div class="col-span-5 text-sm text-gray-500 mt-4 mb-2 ${i > 1 ? 'border-t pt-4' : ''}">
                        ${i}–${rangeEnd}
                    </div>
                `);
            }
            
            chapterButtons.push(`
                <button 
                    class="aspect-square flex items-center justify-center p-3 rounded-xl text-lg focus:outline-none ${
                        isActive ? 'bg-blue-500 text-white font-semibold' : 'bg-white shadow-sm hover:bg-gray-50'
                    } transition-all"
                    data-chapter="${i}">
                    ${i}
                </button>
            `);
        }
        
        this.expandedChapterGrid.innerHTML = chapterButtons.join('');
    }
    
    openExpandedView() {
        // Create the expanded grid first so it's ready when the modal opens
        this.createExpandedChapterGrid();
        
        // Show modal and lock body scroll
        this.chapterExpandModal.classList.remove('hidden');
        this.expandModalBookTitle.textContent = this.app.currentBook;
        document.body.classList.add('overflow-hidden');
        
        // Add initial transform and then remove it to trigger animation
        const content = document.getElementById('chapterExpandContent');
        // Ensure it starts from the bottom position
        content.style.transform = 'translateY(100%)';
        
        // Use requestAnimationFrame for smoother animation
        requestAnimationFrame(() => {
            setTimeout(() => {
                content.style.transform = 'translateY(0)';
            }, 10);
        });
        
        // Scroll to current chapter in the grid after animation completes
        setTimeout(() => {
            const currentChapterBtn = this.expandedChapterGrid.querySelector(`button[data-chapter="${this.currentChapter}"]`);
            if (currentChapterBtn) {
                currentChapterBtn.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 300);
    }
    
    closeExpandedView() {
        const content = document.getElementById('chapterExpandContent');
        content.style.transform = 'translateY(100%)';
        
        setTimeout(() => {
            this.chapterExpandModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }, 300);
    }
    
    selectChapter(chapterButton) {
        const chapter = chapterButton.dataset.chapter;
        
        // Call app's selectChapter method
        this.app.selectChapter(chapterButton);
        
        // Close the book selection screen to navigate directly to the chapter
        this.app.bookSelectionScreen.classList.add('hidden');
    }
}

class BibleApp {
    constructor() {
        // Desktop elements
        this.bookNav = document.getElementById('bookNav');
        this.searchInput = document.getElementById('searchInput');
        this.chapterButtons = document.getElementById('chapterButtons');
        
        // Mobile elements
        this.mobileBookGrid = document.getElementById('mobileBookGrid');
        this.currentBookChapterBtn = document.getElementById('currentBookChapterBtn');
        this.bookChapterText = document.getElementById('bookChapterText');
        this.bookSelectionScreen = document.getElementById('bookSelectionScreen');
        this.closeBookSelection = document.getElementById('closeBookSelection');
        this.backButton = document.getElementById('backButton');
        this.searchToggle = document.getElementById('searchToggle');
        this.mobileSearch = document.getElementById('mobileSearch');
        this.mobileSearchInput = document.getElementById('mobileSearchInput');
        this.bookSearchInput = document.getElementById('bookSearchInput');
        this.bookChapterButtons = document.getElementById('bookChapterButtons');
        this.currentBookTitle = document.getElementById('currentBookTitle');
        this.selectionScreenTitle = document.getElementById('selectionScreenTitle');
        this.currentBookSection = document.getElementById('currentBookSection');

        // Common elements
        this.installBanner = document.getElementById('installBanner');
        this.installButton = document.getElementById('installButton');
        
        // State
        this.deferredPrompt = null;
        this.currentBookButton = null;
        this.currentChapter = 1;
        this.currentBook = null;
        this.isMobile = window.innerWidth < 768;
        this.filteredBooks = [...bibleLoader.bookList];
        
        // Initialize chapter navigator
        this.chapterNavigator = new ChapterNavigator(this);

        this.init();
    }

    async init() {
        this.setupBookList();
        this.setupChapterSelection();
        this.setupMobileUI();
        await this.registerServiceWorker();
        this.setupInstallPrompt();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth < 768;
        });

        // Hide back button initially
        this.backButton.style.visibility = 'hidden';
        
        // Hide current book section initially
        this.currentBookSection.style.display = 'none';

        // Auto-select the first book (Genesis)
        await this.selectInitialBook();
    }

    async selectInitialBook() {
        // Find the Genesis button in either desktop or mobile view
        const firstBookButton = this.isMobile 
            ? this.mobileBookGrid.querySelector('button[data-book="Genesis"]')
            : this.bookNav.querySelector('button[data-book="Genesis"]');

        if (firstBookButton) {
            await this.handleBookSelection(firstBookButton);
        }
    }

    setupMobileUI() {
        // Setup book selector
        this.currentBookChapterBtn.addEventListener('click', () => {
            // Show the book selection screen
            this.bookSelectionScreen.classList.remove('hidden');
            
            // Show the current book's chapters at the top if we have a book selected
            if (this.currentBook) {
                this.currentBookSection.style.display = 'block';
                this.selectionScreenTitle.textContent = 'References';
                this.currentBookTitle.textContent = this.currentBook;
                
                // First, force scroll to absolute top
                this.bookSelectionScreen.scrollTop = 0;
                
                // Use setTimeout to ensure the DOM has updated
                setTimeout(() => {
                    // Force scroll to the very top again
                    window.scrollTo(0, 0);
                    this.bookSelectionScreen.scrollTop = 0;
                    
                    // Ensure the header is at the very top
                    const header = this.bookSelectionScreen.querySelector('.sticky');
                    if (header) {
                        header.scrollIntoView({ block: 'start', behavior: 'auto' });
                    }
                }, 50);
            } else {
                this.currentBookSection.style.display = 'none';
                this.selectionScreenTitle.textContent = 'Select a Book';
                
                // Scroll to top for consistent behavior
                this.bookSelectionScreen.scrollTop = 0;
            }
        });

        this.closeBookSelection.addEventListener('click', () => {
            this.bookSelectionScreen.classList.add('hidden');
        });

        // Setup search toggle
        this.searchToggle.addEventListener('click', () => {
            this.mobileSearch.classList.toggle('hidden');
            if (!this.mobileSearch.classList.contains('hidden')) {
                this.mobileSearchInput.focus();
            }
        });

        // Setup book search
        this.bookSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filteredBooks = bibleLoader.bookList.filter(book => 
                book.toLowerCase().includes(searchTerm)
            );
            this.updateMobileBookGrid();
            
            // If search is active, hide the current book section
            if (searchTerm.length > 0) {
                this.currentBookSection.style.display = 'none';
            } else if (this.currentBook) {
                this.currentBookSection.style.display = 'block';
            }
        });

        // Sync verse search inputs
        this.mobileSearchInput.addEventListener('input', (e) => {
            this.searchInput.value = e.target.value;
            this.searchInput.dispatchEvent(new Event('input'));
        });

        this.searchInput.addEventListener('input', (e) => {
            this.mobileSearchInput.value = e.target.value;
        });

        // Setup back button
        this.backButton.addEventListener('click', () => {
            this.bookSelectionScreen.classList.remove('hidden');
            
            // Show the current book's chapters
            if (this.currentBook) {
                this.currentBookSection.style.display = 'block';
                this.selectionScreenTitle.textContent = 'References';
                this.currentBookTitle.textContent = this.currentBook;
                
                // First, force scroll to absolute top
                this.bookSelectionScreen.scrollTop = 0;
                
                // Use setTimeout to ensure the DOM has updated
                setTimeout(() => {
                    // Force scroll to the very top again
                    window.scrollTo(0, 0);
                    this.bookSelectionScreen.scrollTop = 0;
                    
                    // Ensure the header is at the very top
                    const header = this.bookSelectionScreen.querySelector('.sticky');
                    if (header) {
                        header.scrollIntoView({ block: 'start', behavior: 'auto' });
                    }
                }, 50);
            }
        });
    }

    setupBookList() {
        // Setup desktop book list
        const desktopBookListHtml = bibleLoader.bookList.map(book => `
            <button 
                class="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-book="${book}">
                ${book}
            </button>
        `).join('');
        
        this.bookNav.innerHTML = desktopBookListHtml;
        
        // Setup initial mobile book grid
        this.updateMobileBookGrid();

        // Handle book selection for desktop
        this.bookNav.addEventListener('click', async (e) => {
            const bookButton = e.target.closest('button[data-book]');
            if (!bookButton) return;
            await this.handleBookSelection(bookButton);
        });

        // Handle book selection for mobile
        this.mobileBookGrid.addEventListener('click', async (e) => {
            const bookButton = e.target.closest('button[data-book]');
            if (!bookButton) return;
            await this.handleBookSelection(bookButton);
        });
    }

    updateMobileBookGrid() {
        const gridHtml = this.filteredBooks.map(book => `
            <button 
                class="flex items-center justify-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow text-center min-h-[100px]"
                data-book="${book}">
                <span class="text-lg text-gray-700">${book}</span>
            </button>
        `).join('');
        
        this.mobileBookGrid.innerHTML = gridHtml;
    }

    async handleBookSelection(bookButton) {
        const bookName = bookButton.dataset.book;
        this.currentBook = bookName;
        
        // Update book title in chapter section
        this.currentBookTitle.textContent = bookName;
        
        // Update active states
        if (this.currentBookButton) {
            this.currentBookButton.classList.remove('bg-blue-100');
        }
        bookButton.classList.add('bg-blue-100');
        this.currentBookButton = bookButton;
        
        // Hide the book selection screen and show back button
        this.bookSelectionScreen.classList.add('hidden');
        this.backButton.style.visibility = 'visible';

        try {
            await this.loadBook(bookName);
        } catch (error) {
            console.error('Error loading book:', error);
            this.showError(`Failed to load ${bookName}`);
        }
    }

    setupChapterSelection() {
        // Desktop chapter selection
        this.chapterButtons.addEventListener('click', (e) => {
            const chapterButton = e.target.closest('button[data-chapter]');
            if (!chapterButton) return;
            this.selectChapter(chapterButton);
        });

        // Book selection screen chapter selection (grid mode)
        this.bookChapterButtons.addEventListener('click', (e) => {
            const chapterButton = e.target.closest('button[data-chapter]');
            if (!chapterButton) return;
            this.selectChapter(chapterButton);
            this.bookSelectionScreen.classList.add('hidden');
        });
    }

    selectChapter(chapterButton) {
        const chapter = chapterButton.dataset.chapter;
        this.currentChapter = chapter;
        
        // Update the chapter navigator
        this.chapterNavigator.setCurrentChapter(chapter);
        
        // Update the combined book and chapter text
        this.updateBookChapterDisplay();

        // Update active state in desktop
        this.chapterButtons.querySelectorAll('button').forEach(btn => 
            btn.classList.remove('bg-blue-100')
        );
        
        // Update active state in book selection screen (grid mode)
        this.bookChapterButtons.querySelectorAll('button').forEach(btn => 
            btn.classList.remove('bg-blue-500', 'text-white')
        );
        
        // Find and highlight the corresponding buttons in grid views
        const desktopBtn = this.chapterButtons.querySelector(`button[data-chapter="${chapter}"]`);
        const bookSelectionBtn = this.bookChapterButtons.querySelector(`button[data-chapter="${chapter}"]`);
        
        if (desktopBtn) desktopBtn.classList.add('bg-blue-100');
        if (bookSelectionBtn) bookSelectionBtn.classList.add('bg-blue-500', 'text-white');

        // Hide the book selection screen (to ensure direct navigation)
        this.bookSelectionScreen.classList.add('hidden');

        searchHandler.displayChapter(chapter);
    }

    updateBookChapterDisplay() {
        // Only update if we have both a book and chapter
        if (this.currentBook && this.currentChapter) {
            this.bookChapterText.textContent = `${this.currentBook} ${this.currentChapter}`;
        } else if (this.currentBook) {
            this.bookChapterText.textContent = this.currentBook;
        } else {
            this.bookChapterText.textContent = 'Select a Book';
        }
    }

    async loadBook(bookName) {
        try {
            await bibleLoader.loadBook(bookName);
            const chapterCount = bibleLoader.getChapterCount();
            
            // Update chapter navigator
            this.chapterNavigator.setChapterCount(chapterCount);
            
            // Create chapter buttons for desktop and grid view
            const createChapterButtonsHtml = (extraClasses = '') => 
                Array.from({ length: chapterCount }, (_, i) => i + 1)
                    .map(chapter => `
                        <button 
                            class="aspect-square flex items-center justify-center p-2 bg-white rounded-lg shadow-sm hover:shadow focus:outline-none ${extraClasses}"
                            data-chapter="${chapter}">
                            ${chapter}
                        </button>
                    `).join('');
            
            // Create desktop chapter buttons
            this.chapterButtons.innerHTML = createChapterButtonsHtml();
            
            // Create chapter buttons for book selection screen (grid mode)
            this.bookChapterButtons.innerHTML = createChapterButtonsHtml();

            // Show current book section in the book selection screen
            this.currentBookSection.style.display = 'block';

            // Auto-select first chapter
            const firstChapterButton = this.chapterButtons.querySelector('button[data-chapter="1"]');
            if (firstChapterButton) {
                this.selectChapter(firstChapterButton);
            } else {
                document.getElementById('verseContent').innerHTML = `
                    <div class="text-gray-500 p-4 bg-white rounded-lg shadow">
                        Select a chapter to start reading
                    </div>`;
            }
        } catch (error) {
            throw error;
        }
    }

    showError(message) {
        const verseContent = document.getElementById('verseContent');
        verseContent.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-lg shadow">
                Error: ${message}
            </div>`;
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('ServiceWorker registered:', registration);
            } catch (error) {
                console.error('ServiceWorker registration failed:', error);
            }
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.installBanner.classList.remove('hidden');
        });

        this.installButton.addEventListener('click', async () => {
            if (!this.deferredPrompt) return;
            
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                this.installBanner.classList.add('hidden');
            }
            
            this.deferredPrompt = null;
        });
    }
}

// Initialize the app
const app = new BibleApp(); 