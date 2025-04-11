import { bibleLoader } from './bookLoader.js';

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

        const html = verses.map(verse => `
            <div class="mb-4 p-4 bg-white rounded-lg shadow">
                <span class="text-sm text-gray-600 mr-2">${verse.verse}</span>
                <span class="text-lg">${verse.text}</span>
            </div>
        `).join('');

        this.verseContent.innerHTML = html;
    }

    highlightText(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    }
}

export const searchHandler = new SearchHandler(); 