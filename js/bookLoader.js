import env from '../env.js';

class BibleLoader {
    constructor() {
        this.currentBook = null;
        this.currentChapter = null;
        this.bookList = [
            'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
            'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
            '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
            'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
            'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
            'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
            'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
            'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
            'Matthew', 'Mark', 'Luke', 'John', 'Acts',
            'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
            'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
            '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
            '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
            'Jude', 'Revelation'
        ];
    }

    async loadBook(bookName) {
        try {
            const fileName = bookName.toLowerCase()
                .replace(/ /g, '_')
                .replace(/[^a-z0-9_]/g, ''); // Remove any special chars but keep numbers and underscores
            
            const response = await fetch(`${env.bibleDataPath}/${fileName}.json`);
            if (!response.ok) throw new Error(`Failed to load ${bookName}`);
            
            const bookData = await response.json();
            this.currentBook = bookData;
            this.currentChapter = null;
            return bookData;
        } catch (error) {
            console.error('Error loading book:', error);
            throw error;
        }
    }

    getChapterCount() {
        return this.currentBook ? this.currentBook.chapters.length : 0;
    }

    getChapterVerses(chapterNum) {
        if (!this.currentBook) return null;
        
        const chapter = this.currentBook.chapters.find(c => c.chapter === chapterNum.toString());
        if (!chapter) return null;
        
        this.currentChapter = chapterNum;
        return chapter.verses;
    }

    searchCurrentBook(query) {
        if (!this.currentBook || !query) return [];
        const results = [];
        const searchTerm = query.toLowerCase();
        
        this.currentBook.chapters.forEach(chapter => {
            chapter.verses.forEach(verse => {
                if (verse.text.toLowerCase().includes(searchTerm)) {
                    results.push({
                        chapter: parseInt(chapter.chapter),
                        verse: parseInt(verse.verse),
                        text: verse.text
                    });
                }
            });
        });
        return results;
    }
}

export const bibleLoader = new BibleLoader(); 