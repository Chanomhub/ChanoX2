/**
 * Image URL Helper
 *
 * Transforms image URLs to use imgproxy for optimization.
 * Supports:
 * - Old CDN: https://cdn.chanomhub.online/{hash}.jpg
 * - Hash only: {hash}.jpg (will be prefixed with storage URL)
 */

import { resolveImageUrl as sdkResolveImageUrl, getFallbackUrl, ImgproxyOptions } from '@chanomhub/sdk';

const CDN_DOMAIN = 'cdn.chanomhub.com';
const IMGPROXY_URL = 'https://imgproxy.chanomhub.com';
const STORAGE_URL = `https://${CDN_DOMAIN}`;

// Fields that contain image URLs and should be transformed
const IMAGE_FIELDS = ['coverImage', 'mainImage', 'backgroundImage', 'image', 'url'];

/**
 * Extract the hash/filename from various image URL formats
 */
function extractImagePath(url: string): string | null {
    if (!url) return null;

    // 1. Check for imgproxy URL format
    if (url.includes('imgproxy.chanomhub.com')) {
        // Extract original URL from imgproxy path
        const match = url.match(/imgproxy\.chanomhub\.com\/insecure\/(?:[^/]+\/)?plain\/(.+?)(?:@\w+)?$/);
        if (match?.[1]) {
            const decoded = decodeURIComponent(match[1]);
            // Extract hash from the decoded URL
            const hashMatch = decoded.match(/([a-f0-9]{64}\.[a-z]+)$/i);
            return hashMatch?.[1] || null;
        }
    }

    // 2. Check for standard CDN path
    if (url.includes(CDN_DOMAIN)) {
        const match = url.match(new RegExp(`${CDN_DOMAIN}/([a-f0-9]{64}\\.[a-z]+)`, 'i'));
        return match?.[1] || null;
    }

    // 3. Check for hash/filename only
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const cleaned = url.replace(/^\//, '');
        if (/^[a-f0-9]{64}\.[a-z]+$/i.test(cleaned)) {
            return cleaned;
        }
    }

    return null;
}

/**
 * Resolve image URL to use imgproxy
 *
 * @param url - The original image URL (can be old CDN, new CDN, or hash only)
 * @returns The resolved URL using imgproxy
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    return sdkResolveImageUrl(url, IMGPROXY_URL, STORAGE_URL);
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
        value.includes('imgproxy.chanomhub.com') ||
        /^[a-f0-9]{64}\.(jpg|jpeg|png|gif|webp)$/i.test(value);
}

/**
 * Recursively transform all image URLs in a GraphQL response object
 *
 * @param data - The GraphQL response data object
 * @returns The transformed data with all image URLs converted to imgproxy format
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
    format?: 'webp' | 'avif' | 'jpg' | 'png';
    fit?: 'fit' | 'fill' | 'fill-down' | 'force' | 'auto';
}

/**
 * Get optimized image URL using imgproxy
 */
export function getOptimizedImageUrl(src: string, options: ImageOptions = {}): string {
    if (!src) return '';

    // Check if it's a local blob/data URL which we can't optimize
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;

    // Convert ImageOptions to ImgproxyOptions
    const imgproxyOptions: ImgproxyOptions = {
        width: options.width,
        height: options.height,
        quality: options.quality ?? 80,
        format: options.format ?? 'webp',
        resizeType: options.fit ?? 'fit',
    };

    return sdkResolveImageUrl(src, IMGPROXY_URL, STORAGE_URL, imgproxyOptions) || src;
}

/**
 * Get the original storage URL without optimization (fallback URL)
 * Use this when the imgproxy returns errors
 */
export function getStorageUrl(src: string): string {
    if (!src) return '';

    // Already a data/blob URL
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;

    return getFallbackUrl(src, IMGPROXY_URL, STORAGE_URL) || src;
}
