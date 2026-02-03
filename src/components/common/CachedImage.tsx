/**
 * CachedImage Component
 * 
 * A lightweight image component for Library sidebar.
 * Shows image immediately while caching in background for future use.
 */

import { useEffect } from 'react';
import { imageCacheService } from '@/services/imageCacheService';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
}

export function CachedImage({ src, className, alt, ...props }: CachedImageProps) {
    // Cache in background for future use (don't block rendering)
    useEffect(() => {
        if (src && src.startsWith('http')) {
            // Fire and forget - cache in background
            imageCacheService.cache(src).catch(() => {
                // Ignore cache failures, image will load normally
            });
        }
    }, [src]);

    if (!src) return null;

    // Always render image immediately - don't wait for cache
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading="lazy"
            {...props}
        />
    );
}
