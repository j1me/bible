import { bibleLoader } from './bookLoader.js';

class ViewManager {
    constructor() {
        this.viewModes = [
            { id: 'boxed', name: 'Box View', icon: 'grid' },
            { id: 'plain', name: 'Plain View', icon: 'list' },
            { id: 'continuous', name: 'Book View', icon: 'book' }
        ];
        this.currentViewMode = 'boxed'; // Default view
        this.viewControls = null;
        this.verseContent = document.getElementById('verseContent');
        this.viewSettingsToggle = document.getElementById('viewSettingsToggle');
        this.viewLayoutMenu = document.getElementById('viewLayoutMenu');
        
        // Default reader settings
        this.fontSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-size')) || 1;
        this.fontFamily = 'serif';
        this.theme = 'light';
        this.continuousScrolling = false;
        
        // Try to load settings from localStorage
        this.loadSettings();
        
        // Touch handling for swipe navigation
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.minSwipeDistance = 100; // Minimum distance required for a swipe
        this.hasShownSwipeHint = false; // Track if we've shown the swipe hint

        // Initialize when the DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Apply saved settings on load
        this.applySettings();
        
        // Update the font size control UI
        this.replaceFontSizeControl();
        
        // Setup layout view selection
        this.setupLayoutControls();
        
        // Setup tab navigation
        this.setupTabs();
        
        // Setup font family controls
        this.setupFontFamilyControls();
        
        // Setup theme controls
        this.setupThemeControls();
        
        // Set up swipe gestures for mobile
        this.setupSwipeNavigation();
        
        // Listen for reset content events for continuous scrolling mode
        document.addEventListener('resetVerseContent', (e) => {
            if (e.detail && e.detail.chapter) {
                // Reset the continuous scrolling state
                this.isLoadingNextChapter = false;
                
                // In case there are any pending loading indicators
                this.removeLoadingIndicator();
            }
        });
    }
    
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('bibleReaderSettings'));
            if (settings) {
                this.currentViewMode = settings.viewMode || this.currentViewMode;
                // Ensure fontSize is one of our predefined sizes (0.9, 1.0, 1.2, 1.4)
                this.fontSize = settings.fontSize || this.fontSize;
                // Map to closest predefined size
                const predefinedSizes = [0.9, 1.0, 1.2, 1.4];
                const closestSize = predefinedSizes.reduce((prev, curr) => {
                    return (Math.abs(curr - this.fontSize) < Math.abs(prev - this.fontSize) ? curr : prev);
                });
                this.fontSize = closestSize;
                
                this.fontFamily = settings.fontFamily || this.fontFamily;
                this.theme = settings.theme || this.theme;
                this.continuousScrolling = settings.continuousScrolling || this.continuousScrolling;
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
    
    saveSettings() {
        try {
            const settings = {
                viewMode: this.currentViewMode,
                fontSize: this.fontSize,
                fontFamily: this.fontFamily,
                theme: this.theme,
                continuousScrolling: this.continuousScrolling
            };
            localStorage.setItem('bibleReaderSettings', JSON.stringify(settings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }
    
    applySettings() {
        // Apply font size
        document.documentElement.style.setProperty('--font-size', `${this.fontSize}rem`);
        
        // Determine font family value
        let fontValue;
        switch (this.fontFamily) {
            case 'sans':
                fontValue = 'ui-sans-serif, system-ui, sans-serif';
                break;
            case 'mono':
                fontValue = 'ui-monospace, SFMono-Regular, monospace';
                break;
            case 'custom':
                fontValue = 'Georgia, serif';
                break;
            default:
                fontValue = 'serif';
        }
        
        // Apply font family
        document.documentElement.style.setProperty('--font-family', fontValue);
        
        // Apply theme
        document.body.classList.add('themed');
        document.body.classList.remove(
            'theme-light', 'theme-sepia', 'theme-dark', 
            'theme-black', 'theme-tan', 'theme-gray'
        );
        document.body.classList.add(`theme-${this.theme}`);
        
        // Create or update dynamic style elements
        let fontSizeStyle = document.getElementById('dynamic-font-size');
        if (!fontSizeStyle) {
            fontSizeStyle = document.createElement('style');
            fontSizeStyle.id = 'dynamic-font-size';
            document.head.appendChild(fontSizeStyle);
        }
        
        fontSizeStyle.textContent = `
            .verse-content {
                font-size: ${this.fontSize}rem !important;
            }
        `;
        
        let fontFamilyStyle = document.getElementById('dynamic-font-family');
        if (!fontFamilyStyle) {
            fontFamilyStyle = document.createElement('style');
            fontFamilyStyle.id = 'dynamic-font-family';
            document.head.appendChild(fontFamilyStyle);
        }
        
        fontFamilyStyle.textContent = `
            .verse-content {
                font-family: ${fontValue} !important;
            }
        `;
        
        // Update UI elements to match settings
        this.updateUIToMatchSettings();

        // Force update of all verse content by directly applying styles
        const verseContents = document.querySelectorAll('.verse-content');
        verseContents.forEach(element => {
            element.style.setProperty('font-size', `${this.fontSize}rem`, 'important');
            element.style.setProperty('font-family', fontValue, 'important');
        });
    }
    
    updateUIToMatchSettings() {
        // Update view mode UI
        const boxedViewBtn = document.getElementById('boxedViewBtn');
        const plainViewBtn = document.getElementById('plainViewBtn');
        const continuousViewBtn = document.getElementById('continuousViewBtn');
        
        // Reset all view buttons
        [boxedViewBtn, plainViewBtn, continuousViewBtn].forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-white', 'text-gray-600');
        });
        
        // Highlight active view button
        let activeButton;
        switch (this.currentViewMode) {
            case 'boxed':
                activeButton = boxedViewBtn;
                break;
            case 'plain':
                activeButton = plainViewBtn;
                break;
            case 'continuous':
                activeButton = continuousViewBtn;
                break;
        }
        
        if (activeButton) {
            activeButton.classList.remove('bg-white', 'text-gray-600');
            activeButton.classList.add('bg-blue-500', 'text-white');
        }
        
        // Update font size UI
        const fontSizeButtons = document.querySelectorAll('[data-size]');
        fontSizeButtons.forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            
            if (Math.abs(parseFloat(btn.dataset.size) - this.fontSize) < 0.05) {
                btn.classList.add('bg-blue-500', 'text-white');
            }
        });
        
        // Update font family UI
        const fontButtons = document.querySelectorAll('#fontSelector button');
        fontButtons.forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-white', 'text-gray-700');
            
            if (btn.dataset.font === this.fontFamily) {
                btn.classList.remove('bg-white', 'text-gray-700');
                btn.classList.add('bg-blue-500', 'text-white');
            }
        });
        
        // Update theme UI
        const themeButtons = document.querySelectorAll('[data-theme]');
        themeButtons.forEach(btn => {
            btn.classList.remove('border-blue-500', 'active');
            btn.classList.add('border-transparent');
            
            if (btn.dataset.theme === this.theme) {
                btn.classList.remove('border-transparent');
                btn.classList.add('active');
            }
        });
        
        // Update continuous scrolling toggle
        const scrollToggle = document.getElementById('scrollToggle');
        if (scrollToggle) {
            scrollToggle.checked = this.continuousScrolling;
        }
    }
    
    setupTabs() {
        // Setup for slide-in panels instead of tabs
        const textSettingsBtn = document.getElementById('textSettingsBtn');
        const themeSettingsBtn = document.getElementById('themeSettingsBtn');
        const backToMainSettings = document.getElementById('backToMainSettings');
        const backToMainFromTheme = document.getElementById('backToMainFromTheme');
        const closeSettings = document.getElementById('closeSettings');
        
        const textSettingsPanel = document.getElementById('textSettingsPanel');
        const themeSettingsPanel = document.getElementById('themeSettingsPanel');
        const mainSettingsPanel = document.getElementById('mainSettingsPanel');
        
        // Setup continuous scrolling toggle
        const scrollToggle = document.getElementById('scrollToggle');
        scrollToggle.checked = this.continuousScrolling;
        scrollToggle.addEventListener('change', () => {
            this.continuousScrolling = scrollToggle.checked;
            this.saveSettings();
            
            // Set up or remove scroll event listener based on toggle state
            if (this.continuousScrolling) {
                this.setupContinuousScrolling();
            } else {
                this.removeContinuousScrolling();
                
                // Refresh the current chapter to reset the view
                document.dispatchEvent(new CustomEvent('renderChapter', {
                    detail: { chapter: bibleLoader.currentChapter }
                }));
            }
        });
        
        // Initialize continuous scrolling if enabled
        if (this.continuousScrolling) {
            this.setupContinuousScrolling();
        }
        
        // Open text settings panel
        textSettingsBtn.addEventListener('click', () => {
            textSettingsPanel.classList.remove('translate-x-full');
        });
        
        // Show Theme Settings panel
        themeSettingsBtn.addEventListener('click', () => {
            themeSettingsPanel.classList.remove('translate-x-full');
        });
        
        // Back to main from text settings
        backToMainSettings.addEventListener('click', () => {
            textSettingsPanel.classList.add('translate-x-full');
        });
        
        // Back to main from theme settings
        backToMainFromTheme.addEventListener('click', () => {
            themeSettingsPanel.classList.add('translate-x-full');
        });
        
        // Close settings menu
        closeSettings.addEventListener('click', () => {
            document.getElementById('viewLayoutMenu').classList.add('hidden');
        });
    }
    
    setupLayoutControls() {
        const boxedViewBtn = document.getElementById('boxedViewBtn');
        const plainViewBtn = document.getElementById('plainViewBtn');
        const continuousViewBtn = document.getElementById('continuousViewBtn');
        const viewSettingsToggle = document.getElementById('viewSettingsToggle');
        const viewLayoutMenu = document.getElementById('viewLayoutMenu');
        
        // View mode selection
        boxedViewBtn.addEventListener('click', () => {
            this.setViewMode('boxed');
        });
        
        plainViewBtn.addEventListener('click', () => {
            this.setViewMode('plain');
        });
        
        continuousViewBtn.addEventListener('click', () => {
            this.setViewMode('continuous');
        });
        
        // Show/hide settings menu
        viewSettingsToggle.addEventListener('click', () => {
            viewLayoutMenu.classList.toggle('hidden');
            
            // Reset slide-in panels when showing settings
            if (!viewLayoutMenu.classList.contains('hidden')) {
                const textSettingsPanel = document.getElementById('textSettingsPanel');
                const themeSettingsPanel = document.getElementById('themeSettingsPanel');
                
                textSettingsPanel.classList.add('translate-x-full');
                themeSettingsPanel.classList.add('translate-x-full');
            }
        });
    }
    
    setupFontFamilyControls() {
        // Font family controls
        const fontButtons = document.querySelectorAll('#fontSelector button');
        fontButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Reset all buttons
                fontButtons.forEach(btn => {
                    btn.classList.remove('bg-blue-500', 'text-white');
                    btn.classList.add('bg-white', 'text-gray-700');
                });
                
                // Highlight selected button
                button.classList.remove('bg-white', 'text-gray-700');
                button.classList.add('bg-blue-500', 'text-white');
                
                // Set font family
                this.fontFamily = button.dataset.font;
                
                let fontValue;
                switch (this.fontFamily) {
                    case 'sans':
                        fontValue = 'ui-sans-serif, system-ui, sans-serif';
                        break;
                    case 'mono':
                        fontValue = 'ui-monospace, SFMono-Regular, monospace';
                        break;
                    case 'custom':
                        fontValue = 'Georgia, serif';
                        break;
                    default:
                        fontValue = 'serif';
                }
                
                // Apply to CSS variable
                document.documentElement.style.setProperty('--font-family', fontValue);
                
                // Apply more aggressively with dynamic style element
                let fontFamilyStyle = document.getElementById('dynamic-font-family');
                if (!fontFamilyStyle) {
                    fontFamilyStyle = document.createElement('style');
                    fontFamilyStyle.id = 'dynamic-font-family';
                    document.head.appendChild(fontFamilyStyle);
                }
                
                // Override existing styles with high specificity
                fontFamilyStyle.textContent = `
                    .verse-content {
                        font-family: ${fontValue} !important;
                    }
                `;
                
                // Apply to all verse content elements directly
                document.querySelectorAll('.verse-content').forEach(el => {
                    el.style.setProperty('font-family', fontValue, 'important');
                });
                
                // Force refresh content with new font family
                this.refreshVerseContent();
                
                this.saveSettings();
            });
        });
        
        // Continuous scrolling toggle
        const scrollToggle = document.getElementById('scrollToggle');
        scrollToggle.addEventListener('change', () => {
            this.continuousScrolling = scrollToggle.checked;
            this.saveSettings();
        });
    }
    
    setupThemeControls() {
        // Theme selection
        const themeButtons = document.querySelectorAll('[data-theme]');
        themeButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Reset all buttons
                themeButtons.forEach(btn => {
                    btn.classList.remove('border-blue-500', 'active');
                    btn.classList.add('border-transparent');
                });
                
                // Highlight selected button
                button.classList.remove('border-transparent');
                button.classList.add('active');
                
                // Set theme
                this.theme = button.dataset.theme;
                
                // Apply theme
                document.body.classList.remove(
                    'theme-light', 'theme-sepia', 'theme-dark', 
                    'theme-black', 'theme-tan', 'theme-gray'
                );
                document.body.classList.add(`theme-${this.theme}`);
                
                this.saveSettings();
            });
        });
    }
    
    setupSwipeNavigation() {
        // Only set up swipe on mobile devices
        if (window.innerWidth >= 768) return;
        
        this.verseContent.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
            this.startSwipeVisualFeedback();
        }, { passive: true });
        
        this.verseContent.addEventListener('touchmove', (e) => {
            const currentX = e.changedTouches[0].screenX;
            const difference = currentX - this.touchStartX;
            
            // Update visual feedback based on distance
            this.updateSwipeVisualFeedback(difference);
        }, { passive: true });
        
        this.verseContent.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.removeSwipeVisualFeedback();
            this.handleSwipe();
        }, { passive: true });
        
        this.verseContent.addEventListener('touchcancel', () => {
            this.removeSwipeVisualFeedback();
        }, { passive: true });
    }
    
    startSwipeVisualFeedback() {
        // Create navigation indicators
        const indicatorsContainer = document.createElement('div');
        indicatorsContainer.id = 'swipeIndicators';
        indicatorsContainer.className = 'fixed inset-y-0 bottom-28 w-full pointer-events-none flex justify-between items-center px-4 opacity-0 transition-opacity';
        
        // Previous chapter indicator (left arrow)
        const prevIndicator = document.createElement('div');
        prevIndicator.className = 'h-12 w-12 rounded-full bg-blue-500 bg-opacity-70 flex items-center justify-center transform scale-0 transition-transform';
        prevIndicator.id = 'prevChapterIndicator';
        prevIndicator.innerHTML = `
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
        `;
        
        // Next chapter indicator (right arrow)
        const nextIndicator = document.createElement('div');
        nextIndicator.className = 'h-12 w-12 rounded-full bg-blue-500 bg-opacity-70 flex items-center justify-center transform scale-0 transition-transform';
        nextIndicator.id = 'nextChapterIndicator';
        nextIndicator.innerHTML = `
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
        `;
        
        indicatorsContainer.appendChild(prevIndicator);
        indicatorsContainer.appendChild(nextIndicator);
        document.body.appendChild(indicatorsContainer);
        
        // Fade in
        setTimeout(() => {
            indicatorsContainer.style.opacity = '1';
        }, 10);
    }
    
    updateSwipeVisualFeedback(swipeDistance) {
        const container = document.getElementById('swipeIndicators');
        if (!container) return;
        
        const prevIndicator = document.getElementById('prevChapterIndicator');
        const nextIndicator = document.getElementById('nextChapterIndicator');
        
        if (Math.abs(swipeDistance) < 50) {
            // Reset both indicators if movement is small
            if (prevIndicator) prevIndicator.style.transform = 'scale(0)';
            if (nextIndicator) nextIndicator.style.transform = 'scale(0)';
            return;
        }
        
        const scaleFactor = Math.min(1, Math.abs(swipeDistance) / 200);
        
        if (swipeDistance > 0) {
            // Swiping right - show prev indicator
            if (prevIndicator) prevIndicator.style.transform = `scale(${scaleFactor})`;
            if (nextIndicator) nextIndicator.style.transform = 'scale(0)';
        } else {
            // Swiping left - show next indicator
            if (prevIndicator) prevIndicator.style.transform = 'scale(0)';
            if (nextIndicator) nextIndicator.style.transform = `scale(${scaleFactor})`;
        }
    }
    
    removeSwipeVisualFeedback() {
        const container = document.getElementById('swipeIndicators');
        if (!container) return;
        
        container.style.opacity = '0';
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 300);
    }
    
    handleSwipe() {
        const swipeDistance = this.touchEndX - this.touchStartX;
        
        // Ignore small movements that might be just taps
        if (Math.abs(swipeDistance) < this.minSwipeDistance) return;
        
        if (swipeDistance > 0) {
            // Swipe right - go to previous chapter
            this.navigateToPreviousChapter();
        } else {
            // Swipe left - go to next chapter
            this.navigateToNextChapter();
        }
    }
    
    navigateToPreviousChapter() {
        if (!bibleLoader.currentChapter || bibleLoader.currentChapter <= 1) return;
        
        const prevChapter = parseInt(bibleLoader.currentChapter) - 1;
        this.navigateToChapter(prevChapter);
    }
    
    navigateToNextChapter() {
        if (!bibleLoader.currentChapter || !bibleLoader.currentBook) return;
        
        const chapterCount = bibleLoader.getChapterCount();
        if (parseInt(bibleLoader.currentChapter) >= chapterCount) return;
        
        const nextChapter = parseInt(bibleLoader.currentChapter) + 1;
        this.navigateToChapter(nextChapter);
    }
    
    navigateToChapter(chapter) {
        // Create a toast notification to show the navigation
        this.showNavigationToast(chapter);
        
        // Find the matching button in the DOM
        const mobileChapterButton = document.querySelector(`#chapterStrip button[data-chapter="${chapter}"]`);
        const desktopChapterButton = document.querySelector(`#chapterButtons button[data-chapter="${chapter}"]`);
        
        // Use the found button to trigger the normal chapter selection logic
        const chapterButton = mobileChapterButton || desktopChapterButton;
        if (chapterButton) {
            chapterButton.click();
        } else {
            // Fallback for when buttons aren't in the DOM yet
            document.dispatchEvent(new CustomEvent('navigateToChapter', {
                detail: { chapter }
            }));
        }
    }
    
    showSwipeHint() {
        // Create a hint element
        const hint = document.createElement('div');
        hint.className = 'fixed bottom-28 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white py-3 px-5 rounded-lg shadow-lg z-50 transition-opacity duration-500 flex items-center';
        hint.style.opacity = '0';
        hint.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7l4-4m0 0l4 4m-4-4v18"/>
            </svg>
            <span>Swipe left/right to change chapters</span>
        `;
        
        // Add to DOM
        document.body.appendChild(hint);
        
        // Fade in
        setTimeout(() => {
            hint.style.opacity = '1';
        }, 10);
        
        // Fade out and remove after a delay
        setTimeout(() => {
            hint.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(hint);
            }, 500);
        }, 3500);
    }
    
    showNavigationToast(chapter) {
        // Create a toast notification element
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-28 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white py-2 px-4 rounded-full shadow-lg z-50 transition-opacity duration-500';
        toast.style.opacity = '0';
        toast.textContent = `Chapter ${chapter}`;
        
        // Add to DOM
        document.body.appendChild(toast);
        
        // Fade in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);
        
        // Fade out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 500);
        }, 1500);
    }

    getIconSvg(icon) {
        const icons = {
            grid: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>',
            list: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>',
            book: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>'
        };
        
        return icons[icon] || '';
    }
    
    setViewMode(mode) {
        // Store the previous mode for comparison
        const previousMode = this.currentViewMode;
        
        // Update current view mode
        this.currentViewMode = mode;
        
        // Update UI to match new mode
        this.updateUIToMatchSettings();
        
        // If we have verses loaded, re-render them immediately with the new view mode
        if (bibleLoader.currentBook && bibleLoader.currentChapter) {
            // Get current verses
            const verses = bibleLoader.getChapterVerses(bibleLoader.currentChapter);
            if (verses) {
                // Get the verseContent element
                const verseContent = document.getElementById('verseContent');
                
                // Re-render the verses with the new view mode
                if (verseContent) {
                    // Remember scroll position
                    const scrollPos = window.scrollY;
                    
                    // Update the HTML with the new view
                    verseContent.innerHTML = this.renderVerses(verses);
                    
                    // Restore scroll position
                    window.scrollTo(0, scrollPos);
                    
                    console.log(`View mode changed from ${previousMode} to ${mode}`);
                }
            }
        }
        
        // Save the settings
        this.saveSettings();
    }
    
    renderVerses(verses) {
        if (!verses) return '';
        
        let html = '';
        
        // Get font family value
        let fontValue;
        switch (this.fontFamily) {
            case 'sans':
                fontValue = 'ui-sans-serif, system-ui, sans-serif';
                break;
            case 'mono':
                fontValue = 'ui-monospace, SFMono-Regular, monospace';
                break;
            case 'custom':
                fontValue = 'Georgia, serif';
                break;
            default:
                fontValue = 'serif';
        }
        
        // Get the book name properly
        const bookName = bibleLoader.currentBook?.book || 'Unknown Book';
        const chapterNum = bibleLoader.currentChapter;
        
        // Include book name only for Chapter 1
        if (chapterNum == 1) {
            html += `
                <div class="mb-6 text-center">
                    <h1 class="text-2xl font-bold text-primary">${bookName}</h1>
                    <h2 class="text-xl mt-1 text-secondary">Chapter ${chapterNum}</h2>
                </div>
            `;
        } else {
            html += `
                <div class="mb-6 text-center">
                    <h2 class="text-xl font-semibold text-secondary">Chapter ${chapterNum}</h2>
                </div>
            `;
        }
        
        switch (this.currentViewMode) {
            case 'boxed':
                // Box view: each verse in its own card
                html += verses.map(verse => `
                    <div class="mb-4 p-4 bg-white rounded-lg shadow verse-card">
                        <span class="text-sm text-gray-600 mr-2">${verse.verse}</span>
                        <span class="verse-content" style="font-size: ${this.fontSize}rem; font-family: ${fontValue};">${verse.text}</span>
                    </div>
                `).join('');
                break;
                
            case 'plain':
                // Plain view: verses without boxes
                html += verses.map(verse => `
                    <div class="mb-4">
                        <span class="text-sm font-semibold text-gray-600 mr-2">${verse.verse}</span>
                        <span class="verse-content" style="font-size: ${this.fontSize}rem; font-family: ${fontValue};">${verse.text}</span>
                    </div>
                `).join('');
                break;
                
            case 'continuous':
                // Continuous view: book-like with small verse numbers
                html += `<div class="text-lg leading-relaxed">`;
                verses.forEach(verse => {
                    html += `<sup class="text-xs font-semibold text-gray-600 mr-1">${verse.verse}</sup>`;
                    html += `<span class="verse-content" style="font-size: ${this.fontSize}rem; font-family: ${fontValue};">${verse.text} </span>`;
                });
                html += `</div>`;
                break;
        }
        
        // Show swipe hint on mobile for the first chapter view
        if (window.innerWidth < 768 && !this.hasShownSwipeHint && verses.length > 0) {
            // Set timeout to show hint after the content is rendered
            setTimeout(() => this.showSwipeHint(), 1000);
            this.hasShownSwipeHint = true;
        }
        
        return html;
    }

    replaceFontSizeControl() {
        const fontSizesContainer = document.querySelector('#textSettingsPanel .mb-4');
        if (fontSizesContainer) {
            console.log('Replacing font size controls with 4-option selector');
            
            // Clear existing content
            fontSizesContainer.innerHTML = '';
            
            // Add label
            const label = document.createElement('label');
            label.className = 'block text-sm font-medium text-gray-700 mb-2';
            label.textContent = 'Font Size';
            fontSizesContainer.appendChild(label);
            
            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'grid grid-cols-4 gap-2';
            
            // Define the font sizes
            const fontSizes = [
                { size: 0.9, name: 'Small' },
                { size: 1.0, name: 'Medium' },
                { size: 1.2, name: 'Large' },
                { size: 1.4, name: 'XL' }
            ];
            
            // Create the buttons
            fontSizes.forEach(fontSize => {
                const button = document.createElement('button');
                button.dataset.size = fontSize.size;
                button.className = 'py-2 px-3 border rounded-lg text-center';
                
                // Highlight current font size
                if (Math.abs(this.fontSize - fontSize.size) < 0.05) {
                    button.classList.add('bg-blue-500', 'text-white');
                }
                
                const span = document.createElement('span');
                span.style.fontSize = `${fontSize.size}rem`;
                span.textContent = fontSize.name;
                
                button.appendChild(span);
                buttonContainer.appendChild(button);
            });
            
            fontSizesContainer.appendChild(buttonContainer);
            
            // Add event listeners after creating buttons
            this.setupFontButtonListeners();
        }
    }
    
    setupFontButtonListeners() {
        // Add event listeners to font size buttons
        const fontSizeButtons = document.querySelectorAll('[data-size]');
        fontSizeButtons.forEach(button => {
            button.addEventListener('click', () => {
                console.log('Button clicked with size:', button.dataset.size);
                
                // Reset all buttons
                fontSizeButtons.forEach(btn => {
                    btn.classList.remove('bg-blue-500', 'text-white');
                });
                
                // Highlight selected button
                button.classList.add('bg-blue-500', 'text-white');
                
                // Set font size
                this.fontSize = parseFloat(button.dataset.size);
                
                // Apply more aggressively by creating a style element
                let fontSizeStyle = document.getElementById('dynamic-font-size');
                if (!fontSizeStyle) {
                    fontSizeStyle = document.createElement('style');
                    fontSizeStyle.id = 'dynamic-font-size';
                    document.head.appendChild(fontSizeStyle);
                }
                
                // Override any existing styles with high specificity
                fontSizeStyle.textContent = `
                    .verse-content {
                        font-size: ${this.fontSize}rem !important;
                    }
                `;
                
                // Apply to all verse content elements (more forceful approach)
                document.querySelectorAll('.verse-content').forEach(el => {
                    el.style.setProperty('font-size', `${this.fontSize}rem`, 'important');
                });
                
                // Reset verseContent element to ensure styles are reapplied
                const verseContentEl = document.getElementById('verseContent');
                if (verseContentEl) {
                    // Trigger reflow
                    verseContentEl.style.display = 'none';
                    verseContentEl.offsetHeight; // Force reflow
                    verseContentEl.style.display = '';
                }
                
                // Force refresh content with new font size
                this.refreshVerseContent();
                
                this.saveSettings();
            });
        });
    }

    refreshVerseContent() {
        // Force re-render chapter if loaded
        if (bibleLoader.currentBook && bibleLoader.currentChapter) {
            console.log('Refreshing chapter with new font settings');
            // Save current scroll position
            const scrollPos = window.scrollY;
            
            // Trigger re-render using the event system
            document.dispatchEvent(new CustomEvent('navigateToChapter', {
                detail: { chapter: bibleLoader.currentChapter }
            }));
            
            // Apply styles directly after a short delay to ensure content is rendered
            setTimeout(() => {
                // Get font family value
                let fontValue;
                switch (this.fontFamily) {
                    case 'sans':
                        fontValue = 'ui-sans-serif, system-ui, sans-serif';
                        break;
                    case 'mono':
                        fontValue = 'ui-monospace, SFMono-Regular, monospace';
                        break;
                    case 'custom':
                        fontValue = 'Georgia, serif';
                        break;
                    default:
                        fontValue = 'serif';
                }
                
                // Apply font size directly to each verse-content element
                const verseContents = document.querySelectorAll('.verse-content');
                verseContents.forEach(element => {
                    element.style.setProperty('font-size', `${this.fontSize}rem`, 'important');
                    element.style.setProperty('font-family', fontValue, 'important');
                });
                
                // Restore scroll position
                window.scrollTo(0, scrollPos);
            }, 50);
        }
    }

    setupContinuousScrolling() {
        // Remove existing listener if any
        this.removeContinuousScrolling();
        
        // Create the scroll handler
        this.scrollHandler = this.handleContinuousScroll.bind(this);
        
        // Create a visibility tracking scroll handler with throttling
        this.lastScrollUpdate = 0;
        this.visibilityScrollHandler = this.throttle(this.trackVisibleChapter.bind(this), 150);
        
        // Add scroll event listeners - use passive to improve performance
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
        window.addEventListener('scroll', this.visibilityScrollHandler, { passive: true });
        
        // Set flag to track loading state
        this.isLoadingNextChapter = false;
        
        // Initially preload content right away
        setTimeout(() => {
            if (bibleLoader.currentBook && bibleLoader.currentChapter) {
                this.preloadMultipleChapters(bibleLoader.currentBook, parseInt(bibleLoader.currentChapter));
            }
        }, 300);
    }
    
    removeContinuousScrolling() {
        // Remove all scroll handlers if they exist
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
            this.scrollHandler = null;
        }
        
        if (this.visibilityScrollHandler) {
            window.removeEventListener('scroll', this.visibilityScrollHandler);
            this.visibilityScrollHandler = null;
        }
    }
    
    handleContinuousScroll() {
        // If we're already loading the next chapter, don't proceed
        if (this.isLoadingNextChapter) return;
        
        // Get scroll position
        const scrollPos = window.scrollY + window.innerHeight;
        const docHeight = document.body.scrollHeight;
        
        // If we're 75% through the current content, start loading ahead
        // This ensures content is ready well before user reaches the bottom
        if (scrollPos >= docHeight - window.innerHeight * 0.75) {
            this.isLoadingNextChapter = true;
            
            // Get the book data from the bibleLoader
            const currentBook = bibleLoader.currentBook;
            const currentChapter = parseInt(bibleLoader.currentChapter);
            
            if (currentBook && currentChapter) {
                // Preload multiple chapters ahead
                this.preloadMultipleChapters(currentBook, currentChapter);
            }
        }
    }
    
    async preloadMultipleChapters(currentBook, currentChapter) {
        try {
            const totalChapters = bibleLoader.getChapterCount();
            
            // Determine how many chapters to preload
            const chaptersToLoad = [];
            
            // Add next chapters to load list
            for (let i = 1; i <= 2; i++) {
                const nextChapterNum = currentChapter + i;
                
                if (nextChapterNum <= totalChapters) {
                    // We can load more chapters from current book
                    chaptersToLoad.push({ 
                        type: 'chapter', 
                        book: currentBook, 
                        chapter: nextChapterNum 
                    });
                } else {
                    // Need to check for next book
                    const bookList = bibleLoader.bookList;
                    const currentBookIndex = bookList.indexOf(currentBook?.book);
                    
                    if (currentBookIndex !== -1 && currentBookIndex < bookList.length - 1) {
                        // We have another book to load
                        const nextBookName = bookList[currentBookIndex + 1];
                        
                        // Queue up the first chapter(s) of the next book
                        const remainingChapters = i;
                        
                        // Temporarily store current book state
                        const originalBook = bibleLoader.currentBook;
                        const originalChapter = bibleLoader.currentChapter;
                        
                        // Load next book to get chapter count
                        await bibleLoader.loadBook(nextBookName);
                        const nextBookChapters = bibleLoader.getChapterCount();
                        
                        // Add chapters from next book to preload queue
                        for (let j = 1; j <= Math.min(remainingChapters, nextBookChapters); j++) {
                            chaptersToLoad.push({ 
                                type: 'newBook', 
                                book: nextBookName, 
                                chapter: j 
                            });
                        }
                        
                        // Restore original book state
                        await bibleLoader.loadBook(originalBook.book);
                        bibleLoader.currentChapter = originalChapter;
                        
                        break; // Stop after adding next book chapters
                    }
                }
            }
            
            // Now load all the queued chapters
            if (chaptersToLoad.length > 0) {
                // Load the first chapter immediately, queue the rest with small delays
                await this.loadQueuedChapter(chaptersToLoad[0]);
                
                // Queue the rest with slight delays
                for (let i = 1; i < chaptersToLoad.length; i++) {
                    setTimeout(() => {
                        this.loadQueuedChapter(chaptersToLoad[i]);
                    }, i * 200); // Small delay between loads to prevent UI freezing
                }
            }
        } catch (error) {
            console.error('Error preloading chapters:', error);
        } finally {
            // Reset loading state
            setTimeout(() => {
                this.isLoadingNextChapter = false;
            }, 100);
        }
    }
    
    async loadQueuedChapter(chapterInfo) {
        try {
            let verses;
            
            if (chapterInfo.type === 'newBook') {
                // We need to load a new book
                const originalBook = bibleLoader.currentBook;
                const originalChapter = bibleLoader.currentChapter;
                
                // Load the new book
                await bibleLoader.loadBook(chapterInfo.book);
                
                // Get the verses
                verses = bibleLoader.getChapterVerses(chapterInfo.chapter);
                
                // Add the fully rendered new book + chapter to the page
                if (verses) {
                    await this.appendNewBookChapter(chapterInfo.book, chapterInfo.chapter, verses);
                    
                    // Quietly notify the UI about the new book without scrolling or changing view
                    const event = new CustomEvent('bookPreloaded', {
                        detail: { 
                            book: chapterInfo.book, 
                            chapter: chapterInfo.chapter 
                        }
                    });
                    document.dispatchEvent(event);
                }
                
                // Restore original book context
                await bibleLoader.loadBook(originalBook.book);
                bibleLoader.currentChapter = originalChapter;
            } else {
                // Just loading next chapter from current book
                verses = bibleLoader.getChapterVerses(chapterInfo.chapter);
                
                // Add the rendered chapter to the page
                if (verses) {
                    const originalChapter = bibleLoader.currentChapter;
                    bibleLoader.currentChapter = chapterInfo.chapter;
                    await this.appendNextChapter(chapterInfo.chapter, verses);
                    
                    // Quietly notify the UI about the new chapter without scrolling or changing view
                    const event = new CustomEvent('chapterPreloaded', {
                        detail: { chapter: chapterInfo.chapter }
                    });
                    document.dispatchEvent(event);
                    
                    bibleLoader.currentChapter = originalChapter;
                }
            }
        } catch (error) {
            console.error('Error loading queued chapter:', error);
        }
    }
    
    async appendNextChapter(chapterNum, verses) {
        // Create container for new verses with proper spacing (less noticeable divider)
        const chapterContainer = document.createElement('div');
        chapterContainer.className = 'chapter-container pt-5';
        chapterContainer.dataset.chapter = chapterNum;
        chapterContainer.dataset.book = bibleLoader.currentBook?.book || '';
        
        // Add chapter header directly into the container
        const headerDiv = document.createElement('div');
        headerDiv.className = 'mb-3 text-center';
        headerDiv.innerHTML = `
            <h3 class="text-xl font-semibold text-secondary">Chapter ${chapterNum}</h3>
        `;
        chapterContainer.appendChild(headerDiv);
        
        // Render verses with current view mode settings
        const renderedVerses = this.renderVersesOnly(verses);
        const versesDiv = document.createElement('div');
        versesDiv.innerHTML = renderedVerses;
        chapterContainer.appendChild(versesDiv);
        
        // Append the new chapter
        this.verseContent.appendChild(chapterContainer);
    }
    
    async appendNewBookChapter(bookName, chapterNum, verses) {
        // Create container for new verses with proper spacing but more distinct
        const chapterContainer = document.createElement('div');
        chapterContainer.className = 'chapter-container mt-8 pt-6 border-t';
        chapterContainer.dataset.chapter = chapterNum;
        chapterContainer.dataset.book = bookName;
        
        // Add book and chapter header directly into the container
        const headerDiv = document.createElement('div');
        headerDiv.className = 'mb-4 text-center';
        headerDiv.innerHTML = `
            <h2 class="text-2xl font-bold text-primary">${bookName}</h2>
            <h3 class="text-xl font-semibold mt-1 text-secondary">Chapter ${chapterNum}</h3>
        `;
        chapterContainer.appendChild(headerDiv);
        
        // Render verses with current view mode settings
        const renderedVerses = this.renderVersesOnly(verses);
        const versesDiv = document.createElement('div');
        versesDiv.innerHTML = renderedVerses;
        chapterContainer.appendChild(versesDiv);
        
        // Append the new chapter
        this.verseContent.appendChild(chapterContainer);
    }
    
    renderVersesOnly(verses) {
        // This method renders verses without the header - for continuous scrolling
        if (!verses) return '';
        
        let html = '';
        
        // Get font family value
        let fontValue;
        switch (this.fontFamily) {
            case 'sans':
                fontValue = 'ui-sans-serif, system-ui, sans-serif';
                break;
            case 'mono':
                fontValue = 'ui-monospace, SFMono-Regular, monospace';
                break;
            case 'custom':
                fontValue = 'Georgia, serif';
                break;
            default:
                fontValue = 'serif';
        }
        
        // Render according to current view mode (without headers)
        switch (this.currentViewMode) {
            case 'boxed':
                // Box view: each verse in its own card
                html = verses.map(verse => `
                    <div class="mb-4 p-4 bg-white rounded-lg shadow verse-card">
                        <span class="text-sm text-gray-600 mr-2">${verse.verse}</span>
                        <span class="verse-content" style="font-size: ${this.fontSize}rem; font-family: ${fontValue};">${verse.text}</span>
                    </div>
                `).join('');
                break;
                
            case 'plain':
                // Plain view: verses without boxes
                html = verses.map(verse => `
                    <div class="mb-4">
                        <span class="text-sm font-semibold text-gray-600 mr-2">${verse.verse}</span>
                        <span class="verse-content" style="font-size: ${this.fontSize}rem; font-family: ${fontValue};">${verse.text}</span>
                    </div>
                `).join('');
                break;
                
            case 'continuous':
                // Continuous view: book-like with small verse numbers
                html = `<div class="text-lg leading-relaxed">`;
                verses.forEach(verse => {
                    html += `<sup class="text-xs font-semibold text-gray-600 mr-1">${verse.verse}</sup>`;
                    html += `<span class="verse-content" style="font-size: ${this.fontSize}rem; font-family: ${fontValue};">${verse.text} </span>`;
                });
                html += `</div>`;
                break;
        }
        
        return html;
    }
    
    appendLoadingIndicator() {
        // Create and append loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'continuous-loading-indicator';
        loadingIndicator.className = 'text-center py-8';
        loadingIndicator.innerHTML = `
            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent">
            </div>
            <p class="mt-2 text-gray-600">Loading more content...</p>
        `;
        
        this.verseContent.appendChild(loadingIndicator);
    }
    
    removeLoadingIndicator() {
        // Remove loading indicator if it exists
        const loadingIndicator = document.getElementById('continuous-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }

    trackVisibleChapter() {
        // Skip if not in continuous scrolling mode
        if (!this.continuousScrolling) return;
        
        // Get all chapter containers
        const chapterContainers = document.querySelectorAll('.chapter-container');
        if (!chapterContainers.length) return;
        
        // Get viewport height and scroll position
        const viewportHeight = window.innerHeight;
        const scrollPosition = window.scrollY;
        const viewportCenter = scrollPosition + (viewportHeight / 2);
        
        // Find chapter closest to the center of the screen
        let mostVisibleContainer = null;
        let smallestDistance = Infinity;
        
        chapterContainers.forEach(container => {
            const rect = container.getBoundingClientRect();
            const containerCenter = rect.top + (rect.height / 2);
            const distanceFromCenter = Math.abs(containerCenter - (viewportHeight / 2));
            
            // If this container is closer to the center than the previous best
            if (distanceFromCenter < smallestDistance) {
                smallestDistance = distanceFromCenter;
                mostVisibleContainer = container;
            }
        });
        
        // Update UI if we found a visible chapter
        if (mostVisibleContainer) {
            const chapterNum = mostVisibleContainer.dataset.chapter;
            const bookName = mostVisibleContainer.dataset.book;
            
            if (chapterNum && bookName) {
                // Only update if different from current
                if (parseInt(bibleLoader.currentChapter) !== parseInt(chapterNum) || 
                    bibleLoader.currentBook?.book !== bookName) {
                    
                    // Determine if we're changing books
                    if (bibleLoader.currentBook?.book !== bookName) {
                        // Update displayed book/chapter - quietly without scrolling
                        this.updateDisplayedBookChapter(bookName, parseInt(chapterNum));
                    } else {
                        // Just update chapter
                        this.updateDisplayedChapter(parseInt(chapterNum));
                    }
                }
            }
        }
    }
    
    updateDisplayedBookChapter(bookName, chapter) {
        // Update displayed book/chapter without scrolling or changing content
        const event = new CustomEvent('updateCurrentPosition', {
            detail: { 
                book: bookName, 
                chapter: chapter,
                updateType: 'book'
            }
        });
        document.dispatchEvent(event);
    }
    
    updateDisplayedChapter(chapter) {
        // Update displayed chapter without scrolling or changing content
        const event = new CustomEvent('updateCurrentPosition', {
            detail: { 
                chapter: chapter,
                updateType: 'chapter'
            }
        });
        document.dispatchEvent(event);
    }

    // Helper function to throttle scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

export const viewManager = new ViewManager(); 