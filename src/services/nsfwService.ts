import * as nsfwjs from 'nsfwjs';

// Cache for NSFW check results (URL -> isNSFW)
const nsfwCache = new Map<string, boolean>();
const MAX_CACHE_SIZE = 500;

class NSFWService {
    private model: nsfwjs.NSFWJS | null = null;
    private loadingPromise: Promise<nsfwjs.NSFWJS> | null = null;

    constructor() {
        // Optional: Preload model or wait for first use
    }

    /**
     * Load the NSFW model if not already loaded
     */
    async loadModel(): Promise<nsfwjs.NSFWJS> {
        if (this.model) {
            return this.model;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = nsfwjs.load();

        try {
            this.model = await this.loadingPromise;
            console.log('NSFW Model loaded successfully');
            return this.model;
        } catch (error) {
            console.error('Failed to load NSFW model:', error);
            this.loadingPromise = null;
            throw error;
        }
    }

    /**
     * Check an image element for NSFW content
     * @param imgElement Must be an HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement
     * @param imageUrl Optional URL to use as cache key
     * @returns True if NSFW content is detected, False otherwise
     */
    async isNSFW(imgElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement, imageUrl?: string): Promise<boolean> {
        // Check cache first
        const cacheKey = imageUrl || (imgElement instanceof HTMLImageElement ? imgElement.src : undefined);

        if (cacheKey && nsfwCache.has(cacheKey)) {
            console.log('NSFW Check (cached):', cacheKey.substring(0, 50), '→', nsfwCache.get(cacheKey) ? 'NSFW' : 'Safe');
            return nsfwCache.get(cacheKey)!;
        }

        try {
            const model = await this.loadModel();
            const predictions = await model.classify(imgElement);

            // Classes: Drawing, Hentai, Neutral, Porn, Sexy
            // Calculate combined NSFW score (Hentai + Porn + Sexy)
            let nsfwScore = 0;
            for (const pred of predictions) {
                if (['Hentai', 'Porn', 'Sexy'].includes(pred.className)) {
                    nsfwScore += pred.probability;
                }
            }

            // Find individual class probabilities
            const hentaiProb = predictions.find(p => p.className === 'Hentai')?.probability || 0;
            const pornProb = predictions.find(p => p.className === 'Porn')?.probability || 0;
            const sexyProb = predictions.find(p => p.className === 'Sexy')?.probability || 0;

            // Consider NSFW if:
            // 1. Hentai or Porn probability > 30%
            // 2. Sexy probability > 50%
            // 3. Combined NSFW score > 60%
            let isUnsafe = false;
            if (hentaiProb > 0.3 || pornProb > 0.3) {
                isUnsafe = true;
            } else if (sexyProb > 0.5) {
                isUnsafe = true;
            } else if (nsfwScore > 0.6) {
                isUnsafe = true;
            }

            // Store in cache
            if (cacheKey) {
                // Limit cache size
                if (nsfwCache.size >= MAX_CACHE_SIZE) {
                    const firstKey = nsfwCache.keys().next().value;
                    if (firstKey) nsfwCache.delete(firstKey);
                }
                nsfwCache.set(cacheKey, isUnsafe);
            }

            // Log for debugging
            console.log('NSFW Check:', cacheKey?.substring(0, 50) || 'unknown', '→', isUnsafe ? 'NSFW' : 'Safe',
                `(H:${(hentaiProb * 100).toFixed(0)}% P:${(pornProb * 100).toFixed(0)}% S:${(sexyProb * 100).toFixed(0)}%)`);

            return isUnsafe;
        } catch (error) {
            console.error('Error checking image safety:', error);
            // Fail safe: assume safe if check fails
            return false;
        }
    }

    /**
     * Clear the NSFW cache
     */
    clearCache(): void {
        nsfwCache.clear();
        console.log('NSFW cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; maxSize: number } {
        return { size: nsfwCache.size, maxSize: MAX_CACHE_SIZE };
    }
}

export const nsfwService = new NSFWService();
