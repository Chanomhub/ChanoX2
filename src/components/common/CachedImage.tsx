/**
 * CachedImage Component
 * 
 * A lightweight image component that uses IndexedDB cache for fast loading.
 * Designed for Library sidebar where many thumbnails need to load quickly.
 * Local file paths are used directly without caching.
 */

import { useState, useEffect } from 'react';
import { imageCacheService } from '@/services/imageCacheService';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
}

export function CachedImage({ src, className, alt, ...props }: CachedImageProps) {
    const [cachedSrc, setCachedSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadImage = async () => {
            if (!src) {
                setLoading(false);
                return;
            }

            // Local files (file://, absolute paths, or relative paths) - use directly
            const isLocalFile = src.startsWith('file://') ||
                src.startsWith('/') ||
                src.startsWith('C:') ||
                src.startsWith('D:') ||
                !src.startsWith('http');

            if (isLocalFile) {
                setCachedSrc(src);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(false);

            try {
                // Try to get from cache or fetch and cache
                const cached = await imageCacheService.cache(src);
                if (!cancelled) {
                    setCachedSrc(cached || src);
                    setLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setCachedSrc(src);
                    setLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            cancelled = true;
        };
    }, [src]);

    if (!src || error) return null;

    if (loading) {
        // Return nothing while loading to avoid flashing gray boxes
        return null;
    }

    return (
        <img
            src={cachedSrc || src}
            alt={alt}
            className={className}
            onError={() => setError(true)}
            {...props}
        />
    );
}
