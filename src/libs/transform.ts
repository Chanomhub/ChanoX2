/**
 * Data Transformation Helpers
 * 
 * Strict context-based transformation to ensure Images and Downloads are NEVER mixed.
 * Images -> cdn.chanomhub.com / imgproxy.chanomhub.com
 * Downloads -> storage.chanomhub.com
 */
import { resolveImageUrl } from './imageUrl';
import { resolveDownloadUrl } from './downloadUrl';

// Definitive image fields (Top-level or specific)
const IMAGE_FIELDS = new Set(['coverImage', 'mainImage', 'backgroundImage', 'image']);

// Definitive download fields (Top-level or specific)
const DOWNLOAD_FIELDS = new Set(['downloadLink']);

// Structural containers that define the nature of their child 'url' fields
const CONTEXT_MAPPING: Record<string, 'image' | 'download'> = {
    'downloads': 'download',
    'officialDownloadSources': 'download',
    'mods': 'download',
    'images': 'image',
    'author': 'image',
    'creator': 'image'
};

/**
 * Recursively transform all data URLs in a GraphQL response.
 * Uses strict structural context - if we don't know what it is, we don't touch it.
 * 
 * @param data - The data object to transform
 * @param context - The enforced context inherited from parent
 */
export function transformDataUrls<T>(data: T, context: 'image' | 'download' | null = null): T {
    if (data === null || data === undefined) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => transformDataUrls(item, context)) as T;
    }

    if (typeof data === 'object') {
        const result: Record<string, unknown> = {};
        
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            // Determine the context for this field and its children
            // A key in CONTEXT_MAPPING always overrides the inherited context
            const currentContext = CONTEXT_MAPPING[key] || context;

            if (typeof value === 'string') {
                // RULE 1: Explicit field name match (Highest priority)
                if (IMAGE_FIELDS.has(key)) {
                    result[key] = resolveImageUrl(value);
                } 
                else if (DOWNLOAD_FIELDS.has(key)) {
                    result[key] = resolveDownloadUrl(value);
                }
                // RULE 2: Structural 'url' resolution (Based strictly on context)
                else if (key === 'url') {
                    if (currentContext === 'image') {
                        result[key] = resolveImageUrl(value);
                    } else if (currentContext === 'download') {
                        result[key] = resolveDownloadUrl(value);
                    } else {
                        // Unknown context for 'url' field - DO NOT TRANSFORM
                        result[key] = value;
                    }
                } 
                else {
                    result[key] = value;
                }
            } 
            else if (typeof value === 'object' && value !== null) {
                // Recursive step: pass the determined context down
                result[key] = transformDataUrls(value, currentContext);
            } 
            else {
                result[key] = value;
            }
        }
        return result as T;
    }

    return data;
}
