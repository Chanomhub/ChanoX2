/**
 * Get the best available cover image source
 * Prefers local cached image, falls back to online URL
 */
import { native } from '@/lib/native';

export function getCoverImageSrc(localCoverImage?: string, coverImage?: string): string | undefined {
    // If we have a local path, use file:// protocol for desktop environments
    if (localCoverImage) {
        if (native.isDesktop) {
            return `file://${localCoverImage}`;
        }
        return localCoverImage;
    }

    // Fallback to online URL
    return coverImage;
}
