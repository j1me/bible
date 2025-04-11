const env = {
    isProd: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    version: '1.0.0',
    bibleDataPath: '/bible_books'
};

Object.freeze(env);
export default env; 