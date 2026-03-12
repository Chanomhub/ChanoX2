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
    fit?: 'fit' | 'fill' | 'fill-down' | 'force' | 'auto' | 'cover';
}

/**
 * Get optimized image URL using imgproxy
 */
export function getOptimizedImageUrl(src: string, options: ImageOptions = {}): string {
    if (!src) return '';

    // Check if it's a local blob/data URL which we can't optimize
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;

    // Convert 'cover' to 'fill' for imgproxy
    const resizeType = options.fit === 'cover' ? 'fill' : (options.fit ?? 'fit');

    // Convert ImageOptions to ImgproxyOptions
    const imgproxyOptions: ImgproxyOptions = {
        width: options.width,
        height: options.height,
        quality: options.quality ?? 80,
        format: options.format ?? 'webp',
        resizeType: resizeType,
    };

    return sdkResolveImageUrl(src, IMGPROXY_URL, STORAGE_URL, imgproxyOptions) || src;
}

/**
 * Get the original storage URL without optimization (fallback URL)
 */
export function getStorageUrl(src: string): string {
    if (!src) return '';
    if (src.startsWith('data:') || src.startsWith('blob:')) return src;
    return getFallbackUrl(src, IMGPROXY_URL, STORAGE_URL) || src;
}
