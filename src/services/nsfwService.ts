// Dynamic import for optional nsfwjs dependency
// Users need to install @tensorflow/tfjs and nsfwjs manually to enable NSFW detection
// npm install @tensorflow/tfjs nsfwjs

type NSFWJS = {
    classify(element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<{ className: string; probability: number }[]>;
};

type NSFWJSModule = {
    load(path?: string): Promise<NSFWJS>;
};

let nsfwjsModule: NSFWJSModule | null = null;
let nsfwjsLoadAttempted = false;
let nsfwjsAvailable = false;

async function loadNsfwjsModule(): Promise<NSFWJSModule | null> {
    if (nsfwjsLoadAttempted) {
        return nsfwjsModule;
    }
    nsfwjsLoadAttempted = true;

    try {
        // Try to dynamically import nsfwjs
        const module = await import('nsfwjs');
        nsfwjsModule = module as unknown as NSFWJSModule;
        nsfwjsAvailable = true;
        console.log('✅ nsfwjs module loaded successfully');
        return nsfwjsModule;
    } catch (err) {
        console.warn('⚠️ nsfwjs is not installed. NSFW detection is disabled.');
        console.warn('   To enable, run: npm install @tensorflow/tfjs nsfwjs');
        nsfwjsAvailable = false;
        return null;
    }
}

/**
 * Check if nsfwjs is available
 */
export function isNsfwjsAvailable(): boolean {
    return nsfwjsAvailable;
}

/**
 * Check availability of nsfwjs module (async check on first call)
 */
export async function checkNsfwjsAvailability(): Promise<boolean> {
    await loadNsfwjsModule();
    return nsfwjsAvailable;
}

// Sensitivity thresholds for each level (optimized for anime content)
// Hentai thresholds are lower because the model is specifically trained for anime NSFW
// low = less sensitive (blocks only very explicit content)
// medium = balanced (default, reasonable detection)
// high = more sensitive (blocks suggestive content too)
const THRESHOLDS = {
    low: { hentai: 0.4, porn: 0.5, sexy: 0.8, combined: 0.8 },
    medium: { hentai: 0.2, porn: 0.3, sexy: 0.5, combined: 0.6 },
    high: { hentai: 0.1, porn: 0.15, sexy: 0.3, combined: 0.4 },
};

export type NsfwSensitivityLevel = 'low' | 'medium' | 'high';

// Cache key for localStorage
const CACHE_STORAGE_KEY = 'nsfwCheckCache';
const CUSTOM_MODEL_KEY = 'nsfwCustomModelUrl';
const MAX_CACHE_SIZE = 500;

// Load cache from localStorage on startup
function loadCacheFromStorage(): Map<string, boolean> {
    try {
        const stored = localStorage.getItem(CACHE_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            console.log(`📦 Loaded ${Object.keys(parsed).length} NSFW cache entries from storage`);
            return new Map(Object.entries(parsed));
        }
    } catch (err) {
        console.warn('Failed to load NSFW cache from storage:', err);
    }
    return new Map();
}

// Save cache to localStorage
function saveCacheToStorage(cache: Map<string, boolean>): void {
    try {
        const obj = Object.fromEntries(cache);
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch (err) {
        console.warn('Failed to save NSFW cache to storage:', err);
    }
}

// Cache for NSFW check results (URL -> isNSFW)
const nsfwCache = loadCacheFromStorage();

class NSFWService {
    private model: NSFWJS | null = null;
    private loadingPromise: Promise<NSFWJS> | null = null;
    private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private customModelUrl: string | null = null;
    private currentModelUrl: string | null = null;

    constructor() {
        // Load custom model URL from storage
        this.customModelUrl = localStorage.getItem(CUSTOM_MODEL_KEY);
        if (this.customModelUrl) {
            console.log('🔧 Dev Mode: Custom NSFW model configured:', this.customModelUrl);
        }
    }

    /**
     * Check if nsfwjs module is available
     */
    isAvailable(): boolean {
        return nsfwjsAvailable;
    }

    /**
     * Set a custom model URL (Dev Mode)
     * @param url Path or URL to TensorFlow.js model (e.g., 'file:///path/to/model/' or 'http://localhost:8080/model/')
     */
    setCustomModelUrl(url: string | null): void {
        this.customModelUrl = url;
        if (url) {
            localStorage.setItem(CUSTOM_MODEL_KEY, url);
            console.log('🔧 Dev Mode: Custom model URL set:', url);
        } else {
            localStorage.removeItem(CUSTOM_MODEL_KEY);
            console.log('🔧 Dev Mode: Custom model URL cleared, using default nsfwjs');
        }
        // Force model reload on next check
        this.model = null;
        this.loadingPromise = null;
        this.currentModelUrl = null;
        this.clearCache();
    }

    /**
     * Get the current custom model URL
     */
    getCustomModelUrl(): string | null {
        return this.customModelUrl;
    }

    /**
     * Check if dev mode (custom model) is enabled
     */
    isDevMode(): boolean {
        return !!this.customModelUrl;
    }

    /**
     * Load the NSFW model if not already loaded
     * Returns null if nsfwjs is not installed
     */
    async loadModel(): Promise<NSFWJS | null> {
        // First, ensure the module is loaded
        const module = await loadNsfwjsModule();
        if (!module) {
            return null;
        }

        const targetUrl = this.customModelUrl || 'default';

        // If model is loaded and URL hasn't changed, return it
        if (this.model && this.currentModelUrl === targetUrl) {
            return this.model;
        }

        // If model URL changed, reset and reload
        if (this.currentModelUrl !== targetUrl) {
            this.model = null;
            this.loadingPromise = null;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        // Load model from custom URL or default
        if (this.customModelUrl) {
            console.log('🔧 Loading custom NSFW model from:', this.customModelUrl);
            this.loadingPromise = module.load(this.customModelUrl);
        } else {
            this.loadingPromise = module.load();
        }

        try {
            this.model = await this.loadingPromise;
            this.currentModelUrl = targetUrl;
            console.log(`NSFW Model loaded successfully${this.customModelUrl ? ' (custom)' : ' (default)'}`);
            return this.model;
        } catch (error) {
            console.error('Failed to load NSFW model:', error);
            this.loadingPromise = null;
            throw error;
        }
    }

    /**
     * Debounced save to avoid too frequent writes
     */
    private scheduleCacheSave(): void {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = setTimeout(() => {
            saveCacheToStorage(nsfwCache);
        }, 1000);
    }

    /**
     * Check an image element for NSFW content
     * @param imgElement Must be an HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement
     * @param imageUrl Optional URL to use as cache key
     * @param sensitivityLevel Sensitivity level for detection
     * @returns True if NSFW content is detected, False otherwise. Returns false if nsfwjs is not installed.
     */
    async isNSFW(
        imgElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
        imageUrl?: string,
        sensitivityLevel: NsfwSensitivityLevel = 'medium'
    ): Promise<boolean> {
        // Check cache first
        const cacheKey = imageUrl || (imgElement instanceof HTMLImageElement ? imgElement.src : undefined);

        if (cacheKey && nsfwCache.has(cacheKey)) {
            console.log('NSFW Check (cached):', cacheKey.substring(0, 50), '→', nsfwCache.get(cacheKey) ? 'NSFW' : 'Safe');
            return nsfwCache.get(cacheKey)!;
        }

        try {
            const model = await this.loadModel();

            // If nsfwjs is not installed, return safe (false)
            if (!model) {
                console.log('NSFW Check skipped: nsfwjs not installed');
                return false;
            }

            const predictions = await model.classify(imgElement);

            // Get thresholds for current sensitivity level
            const threshold = THRESHOLDS[sensitivityLevel];

            // Find individual class probabilities
            const hentaiProb = predictions.find((p: { className: string; probability: number }) => p.className === 'Hentai')?.probability || 0;
            const pornProb = predictions.find((p: { className: string; probability: number }) => p.className === 'Porn')?.probability || 0;
            const sexyProb = predictions.find((p: { className: string; probability: number }) => p.className === 'Sexy')?.probability || 0;

            // Calculate combined NSFW score
            const nsfwScore = hentaiProb + pornProb + sexyProb;

            // Consider NSFW based on sensitivity level thresholds
            let isUnsafe = false;
            if (hentaiProb > threshold.hentai || pornProb > threshold.porn) {
                isUnsafe = true;
            } else if (sexyProb > threshold.sexy) {
                isUnsafe = true;
            } else if (nsfwScore > threshold.combined) {
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
                this.scheduleCacheSave();
            }

            // Log for debugging
            const devLabel = this.isDevMode() ? '[DEV] ' : '';
            console.log(`${devLabel}NSFW Check [${sensitivityLevel}]:`, cacheKey?.substring(0, 50) || 'unknown', '→', isUnsafe ? 'NSFW' : 'Safe',
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
        localStorage.removeItem(CACHE_STORAGE_KEY);
        console.log('NSFW cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; maxSize: number } {
        return { size: nsfwCache.size, maxSize: MAX_CACHE_SIZE };
    }

    /**
     * Get model info for dev mode
     */
    getModelInfo(): { isCustom: boolean; url: string | null; isAvailable: boolean } {
        return {
            isCustom: this.isDevMode(),
            url: this.customModelUrl,
            isAvailable: nsfwjsAvailable
        };
    }
}

export const nsfwService = new NSFWService();
