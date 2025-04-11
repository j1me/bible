import { bibleLoader } from './bookLoader.js';
import { viewManager } from './viewManager.js';

class SearchHandler {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.verseContent = document.getElementById('verseContent');
        this.setupEventListeners();
    }

    setupEventListeners() {
        let debounceTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => this.handleSearch(e.target.value), 300);
        });
        
        // Listen for render chapter events from the ViewManager
        document.addEventListener('renderChapter', (e) => {
            this.displayChapter(e.detail.chapter);
        });
        
        // Listen for reset content events (for continuous scrolling mode)
        document.addEventListener('resetVerseContent', (e) => {
            if (e.detail && e.detail.chapter) {
                // Force a complete reset and display of the chapter
                this.forceDisplayChapter(e.detail.chapter);
            }
        });
    }

    handleSearch(query) {
        if (!query) {
            // If search is cleared, show current chapter if any
            if (bibleLoader.currentChapter) {
                this.displayChapter(bibleLoader.currentChapter);
            }
            return;
        }

        const results = bibleLoader.searchCurrentBook(query);
        this.displaySearchResults(results, query);
    }

    displaySearchResults(results, query) {
        if (!results.length) {
            this.verseContent.innerHTML = `
                <div class="text-gray-500 p-4 bg-white rounded-lg shadow">
                    No results found for "${query}"
                </div>`;
            return;
        }

        const html = results.map(result => `
            <div class="mb-4 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div class="text-sm text-gray-600 mb-1">Chapter ${result.chapter}, Verse ${result.verse}</div>
                <div class="text-lg">${this.highlightText(result.text, query)}</div>
            </div>
        `).join('');

        this.verseContent.innerHTML = html;
    }

    displayChapter(chapter) {
        const verses = bibleLoader.getChapterVerses(chapter);
        if (!verses) return;

        // Check if we need to append or replace content
        if (viewManager.continuousScrolling && 
            this.verseContent.querySelector('.chapter-container')) {
            // In continuous scrolling mode with existing content,
            // content will be appended by the viewManager
            return;
        }

        // Use the ViewManager to render verses according to the selected view mode
        const html = viewManager.renderVerses(verses);
        
        // Create a wrapper div with data attributes
        const containerDiv = document.createElement('div');
        containerDiv.className = 'chapter-container';
        containerDiv.dataset.chapter = chapter;
        containerDiv.dataset.book = bibleLoader.currentBook?.book || '';
        containerDiv.innerHTML = html;
        
        // Replace the content
        this.verseContent.innerHTML = '';
        this.verseContent.appendChild(containerDiv);
        
        // Scroll to top to show the headers
        window.scrollTo(0, 0);
    }

    highlightText(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    }

    // Force display without checking continuous scrolling mode
    forceDisplayChapter(chapter) {
        const verses = bibleLoader.getChapterVerses(chapter);
        if (!verses) return;
        
        // Use the ViewManager to render verses according to the selected view mode
        const html = viewManager.renderVerses(verses);
        this.verseContent.innerHTML = html;
        
        // Scroll to top to show the headers
        window.scrollTo(0, 0);
    }
}

export const searchHandler = new SearchHandler(); 