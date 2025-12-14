/**
 * Image URL Helper
 *
 * Transforms image URLs to use Cloudflare Workers CDN.
 * Supports:
 * - Old CDN: https://cdn.chanomhub.online/{hash}.jpg
 * - New CDN (Cloudflare Workers): https://img.chanomhub.com/i/{hash}.jpg
 * - Hash only: {hash}.jpg (will be prefixed with new CDN)
 */

const OLD_CDN_DOMAIN = 'cdn.chanomhub.online';
const NEW_CDN_BASE = 'https://img.chanomhub.com/i';

// Fields that contain image URLs and should be transformed
const IMAGE_FIELDS = ['coverImage', 'mainImage', 'backgroundImage', 'image', 'url'];

/**
 * Extract the hash/filename from various image URL formats
 */
function extractImagePath(url: string): string | null {
    if (!url) return null;

    // Already using new CDN - extract path after /i/
    if (url.includes('img.chanomhub.com/i/')) {
        const match = url.match(/img\.chanomhub\.com\/i\/(.+?)(?:\?|$)/);
        return match?.[1] || null;
    }

    // Old CDN format - extract path after domain
    if (url.includes(OLD_CDN_DOMAIN)) {
        const match = url.match(/cdn\.chanomhub\.online\/(.+?)(?:\?|$)/);
        return match?.[1] || null;
    }

    // Check if it's a relative path or hash only (no http/https)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Remove leading slash if present
        return url.replace(/^\//, '');
    }

    // External URL - return as-is (will be handled by caller)
    return null;
}

/**
 * Resolve image URL to use Cloudflare Workers CDN
 *
 * @param url - The original image URL (can be old CDN, new CDN, or hash only)
 * @returns The resolved URL using Cloudflare Workers CDN
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // Extract the path/hash from the URL
    const imagePath = extractImagePath(url);

    // If we couldn't extract a path, it's likely an external URL - return as-is
    if (!imagePath) {
        return url;
    }

    // Build the new CDN URL
    return `${NEW_CDN_BASE}/${imagePath}`;
}

/**
 * Check if a field name represents an image URL
 */
function isImageField(key: string): boolean {
    return IMAGE_FIELDS.includes(key);
}

/**
 * Check if a value looks like an image URL from our CDN
 */
function isImageUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    return value.includes(OLD_CDN_DOMAIN) ||
        value.includes('img.chanomhub.com') ||
        /^[a-f0-9]{64}\.(jpg|jpeg|png|gif|webp)$/i.test(value);
}

/**
 * Recursively transform all image URLs in a GraphQL response object
 *
 * @param data - The GraphQL response data object
 * @returns The transformed data with all image URLs converted to new CDN format
 */
export function transformImageUrls<T>(data: T): T {
    if (data === null || data === undefined) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => transformImageUrls(item)) as T;
    }

    if (typeof data === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            if (isImageField(key) && typeof value === 'string') {
                // Transform known image fields
                result[key] = resolveImageUrl(value);
            } else if (key === 'url' && isImageUrl(value)) {
                // Transform 'url' field only if it looks like an image URL
                result[key] = resolveImageUrl(value as string);
            } else if (typeof value === 'object') {
                // Recursively transform nested objects
                result[key] = transformImageUrls(value);
            } else {
                result[key] = value;
            }
        }
        return result as T;
    }

    return data;
}
