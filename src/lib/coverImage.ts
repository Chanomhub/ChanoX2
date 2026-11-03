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

/**
 * Get the best available background image source for a library item.
 * Priority:
 * 1. customBackgroundImage (User selected custom background image: local file path or URL)
 * 2. backgroundImage (Official background image from article)
 * 3. coverImage (Fallback to cover image)
 * 4. localCoverImage (Fallback to offline cached cover)
 */
export function getGameBackgroundSrc(item?: {
    customBackgroundImage?: string;
    backgroundImage?: string;
    coverImage?: string;
    localCoverImage?: string;
}): string | undefined {
    if (!item) return undefined;

    if (item.customBackgroundImage) {
        if (
            typeof window !== 'undefined' &&
            window.electronAPI &&
            !item.customBackgroundImage.startsWith('http://') &&
            !item.customBackgroundImage.startsWith('https://') &&
            !item.customBackgroundImage.startsWith('file://') &&
            !item.customBackgroundImage.startsWith('data:') &&
            !item.customBackgroundImage.startsWith('blob:')
        ) {
            return `file://${item.customBackgroundImage}`;
        }
        return item.customBackgroundImage;
    }

    if (item.backgroundImage) {
        return item.backgroundImage;
    }

    return getCoverImageSrc(item.localCoverImage, item.coverImage);
}
