/**
 * Download URL Helper
 *
 * Resolves download paths or full URLs.
 */
import { resolveDownloadUrl as sdkResolveDownloadUrl } from '@chanomhub/sdk';

const STORAGE_DOWNLOAD_URL = 'https://storage.chanomhub.com';

/**
 * Resolve download URL
 * 
 * @param url - The original download URL or path
 * @returns The resolved full download URL
 */
export function resolveDownloadUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    return sdkResolveDownloadUrl(url, STORAGE_DOWNLOAD_URL);
}
