/**
 * Image URL Helper
 *
 * Transforms image URLs to use Cloudflare Workers CDN.
 * Supports:
 * - Old CDN: https://cdn.chanomhub.online/{hash}.jpg
 * - New CDN (Cloudflare Images): https://img.chanomhub.com/cdn-cgi/image/format=auto/{hash}.jpg
 * - Hash only: {hash}.jpg (will be prefixed with new CDN)
 */

const CDN_DOMAIN = 'cdn.chanomhub.com';
// Toggle this to false to fallback to original images if optimized CDN has issues/quota limits
const ENABLE_IMAGE_OPTIMIZATION = true;

// Fields that contain image URLs and should be transformed
const IMAGE_FIELDS = ['coverImage', 'mainImage', 'backgroundImage', 'image', 'url'];

/**
 * Extract the hash/filename from various image URL formats
 */
function extractImagePath(url: string): string | null {
    if (!url) return null;

    // 1. Check for optimization path from our CDN
    if (url.includes(`${CDN_DOMAIN}/cdn-cgi/image`)) {
        // match everything after format=auto/ or other params
        const match = url.match(new RegExp(`${CDN_DOMAIN}\/cdn-cgi\/image\/[^/]+\/(.+?)(?:\\?|$)`));
        return match?.[1] || null;
    }

    // 2. Check for legacy cloudflare worker path (img.chanomhub.com/i/)
    if (url.includes('img.chanomhub.com/i/')) {
        const match = url.match(/img\.chanomhub\.com\/i\/(.+?)(?:\?|$)/);
        return match?.[1] || null;
    }

    // 3. Check for standard CDN path (cdn.chanomhub.online)
    // Avoid matching if it was already caught by step 1 (though logic shouldn't reach here if 1 matched)
    if (url.includes(CDN_DOMAIN)) {
        const match = url.match(new RegExp(`${CDN_DOMAIN}\/(.+?)(?:\\?|$)`));
        // Be careful not to match the cdn-cgi part as the filename if regex is loose, 
        // but simple extraction after domain should work for raw files.
        // However, if we have nested paths that look like cdn-cgi but aren't, it's tricky. 
        // Assuming raw files are valid if they don't start with cdn-cgi.
        if (match?.[1] && !match[1].startsWith('cdn-cgi/')) {
            return match[1];
        }
        // If it starts with cdn-cgi but didn't match step 1, it might be malformed or handled by regex in step 1.
    }

    // 4. Check for hash/filename only
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return url.replace(/^\//, '');
    }

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

    // Build the new URL based on configuration
    const baseUrl = `https://${CDN_DOMAIN}`;

    if (ENABLE_IMAGE_OPTIMIZATION) {
        return `${baseUrl}/cdn-cgi/image/format=auto/${imagePath}`;
    }

    // Fallback to original image
    return `${baseUrl}/${imagePath}`;
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
    return value.includes(CDN_DOMAIN) ||
        value.includes('img.chanomhub.com') || // Keep checking legacy domain
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

export interface ImageOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'json';
    fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
}

export function getOptimizedImageUrl(src: string, options: ImageOptions = {}): string {
    if (!src) return '';

    // Check if it's already optimized or a local blob/data URL which we can't optimize via CF easily
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;

    const params: string[] = [];

    // Default to auto format and 80 quality if not specified
    if (!options.format) params.push('format=auto');
    if (!options.quality) params.push('quality=80');

    if (options.width) params.push(`width=${options.width}`);
    if (options.height) params.push(`height=${options.height}`);
    if (options.quality && options.quality !== 80) params.push(`quality=${options.quality}`);
    if (options.format && options.format !== 'auto') params.push(`format=${options.format}`);
    if (options.fit) params.push(`fit=${options.fit}`);

    const baseUrl = `https://${CDN_DOMAIN}`;
    const imagePath = extractImagePath(src);

    if (!imagePath) {
        // If we can't extract a path, consistent with previous logic, we might just return the src
        // But the user wants to ensure valid CDN URLs. 
        // If it is a full http URL that isn't our CDN, we can try to proxy it if we want to resize it.
        if (src.startsWith('http')) {
            return `${baseUrl}/cdn-cgi/image/${params.join(',')}/${src}`;
        }
        // Fallback
        return src;
    }

    return `${baseUrl}/cdn-cgi/image/${params.join(',')}/${imagePath}`;
}
