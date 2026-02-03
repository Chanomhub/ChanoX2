/**
 * Image Cache Service
 * 
 * Caches images in IndexedDB for fast loading in Library sidebar.
 * Thumbnails are pre-fetched and stored locally so they load instantly.
 */

const DB_NAME = 'chanox-image-cache';
const DB_VERSION = 1;
const STORE_NAME = 'thumbnails';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedImage {
    url: string;
    blob: Blob;
    timestamp: number;
}

class ImageCacheService {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;
    private memoryCache: Map<string, string> = new Map(); // url -> objectURL

    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open image cache DB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'url' });
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Get cached image as object URL (fast, from memory or IndexedDB)
     */
    async get(url: string): Promise<string | null> {
        // Check memory cache first
        const memCached = this.memoryCache.get(url);
        if (memCached) return memCached;

        await this.init();
        if (!this.db) return null;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(url);

            request.onsuccess = () => {
                const result = request.result as CachedImage | undefined;
                if (result && Date.now() - result.timestamp < MAX_AGE_MS) {
                    const objectUrl = URL.createObjectURL(result.blob);
                    this.memoryCache.set(url, objectUrl);
                    resolve(objectUrl);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => resolve(null);
        });
    }

    /**
     * Cache an image from URL
     */
    async cache(url: string): Promise<string | null> {
        // Already cached in memory?
        const memCached = this.memoryCache.get(url);
        if (memCached) return memCached;

        // Skip non-http URLs (local files, data URLs, etc.)
        if (!url.startsWith('http')) {
            return url;
        }

        try {
            // Try to get from IndexedDB first
            const cached = await this.get(url);
            if (cached) return cached;

            // Fetch and cache
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) return null;

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            this.memoryCache.set(url, objectUrl);

            // Store in IndexedDB
            await this.store(url, blob);

            return objectUrl;
        } catch (error) {
            console.warn('Failed to cache image:', url, error);
            return null;
        }
    }

    /**
     * Store blob in IndexedDB
     */
    private async store(url: string, blob: Blob): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const data: CachedImage = {
                url,
                blob,
                timestamp: Date.now(),
            };
            store.put(data);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
        });
    }

    /**
     * Pre-fetch multiple images in background
     */
    async prefetch(urls: string[]): Promise<void> {
        const uniqueUrls = [...new Set(urls.filter(Boolean))];

        // Use small batch size to avoid overwhelming network
        const batchSize = 5;
        for (let i = 0; i < uniqueUrls.length; i += batchSize) {
            const batch = uniqueUrls.slice(i, i + batchSize);
            await Promise.all(batch.map(url => this.cache(url)));
        }
    }

    /**
     * Clear old cached images
     */
    async cleanup(): Promise<void> {
        await this.init();
        if (!this.db) return;

        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();

        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                const item = cursor.value as CachedImage;
                if (Date.now() - item.timestamp > MAX_AGE_MS) {
                    cursor.delete();
                }
                cursor.continue();
            }
        };
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.clear();
            transaction.oncomplete = () => {
                // Also clear memory cache
                this.memoryCache.forEach(url => URL.revokeObjectURL(url));
                this.memoryCache.clear();
                resolve();
            };
        });
    }
}

export const imageCacheService = new ImageCacheService();
