/**
 * Get the best available cover image source
 * Prefers local cached image, falls back to online URL
 */
export function getCoverImageSrc(localCoverImage?: string, coverImage?: string): string | undefined {
    // If we have a local path, use file:// protocol for Electron
    if (localCoverImage) {
        // Check if running in Electron and path is absolute
        if (typeof window !== 'undefined' && window.electronAPI) {
            return `file://${localCoverImage}`;
        }
        return localCoverImage;
    }

    // Fallback to online URL
    return coverImage;
}
