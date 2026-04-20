import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { nsfwService } from '@/services/nsfwService';
import { EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveImageUrl, getFallbackUrl, ImgproxyOptions, ImgproxyResizeType, ImgproxyFormat } from '@chanomhub/sdk';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackIcon?: React.ReactNode;
    fallbackSrc?: string;
    options?: ImgproxyOptions;
    width?: number;
    height?: number;
    quality?: number;
    resizeType?: ImgproxyResizeType;
    format?: ImgproxyFormat;
}

// imgproxy server URL
const CDN_URL = 'https://imgproxy.chanomhub.com';
// Original storage URL (source images)
const STORAGE_URL = 'https://cdn.chanomhub.com';

export function SafeImage({
    className,
    src,
    fallbackSrc,
    alt,
    options,
    width,
    height,
    quality,
    resizeType,
    format,
    ...props
}: SafeImageProps) {
    const { nsfwFilterEnabled, nsfwFilterLevel } = useSettingsStore();
    const [isChecking, setIsChecking] = useState(false);
    const [isNSFW, setIsNSFW] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const [showAnyway, setShowAnyway] = useState(false);

    const mergedOptions = useMemo(() => ({
        ...options,
        width: width ?? options?.width,
        height: height ?? options?.height,
        quality: quality ?? options?.quality,
        resizeType: resizeType ?? options?.resizeType,
        format: format ?? options?.format,
    }), [options, width, height, quality, resizeType, format]);

    const resolvedSrc = useMemo(() => resolveImageUrl(src, CDN_URL, STORAGE_URL, mergedOptions) || src, [src, mergedOptions]);
    const [currentSrc, setCurrentSrc] = useState(resolvedSrc);
    const [hasErrored, setHasErrored] = useState(false);

    // Auto-generate fallback URL from CDN URL if not provided
    const effectiveFallbackSrc = useMemo(() => {
        if (fallbackSrc) return fallbackSrc;
        const autoFallback = getFallbackUrl(src, CDN_URL, STORAGE_URL);
        return autoFallback || undefined;
    }, [fallbackSrc, src]);

    // Reset state when resolvedSrc changes
    useEffect(() => {
        setIsChecking(false);
        setIsNSFW(false);
        setShowAnyway(false);
        setCurrentSrc(resolvedSrc);
        setHasErrored(false);
    }, [resolvedSrc]);

    const handleError = () => {
        // If primary src fails and we have a fallback, try it
        if (!hasErrored && effectiveFallbackSrc && currentSrc !== effectiveFallbackSrc) {
            console.log('Image failed to load, trying fallback:', effectiveFallbackSrc);
            setCurrentSrc(effectiveFallbackSrc);
            setHasErrored(true);
        }
    };

    // Check if image loaded correctly (sometimes CDN returns 422 but browser doesn't trigger onError)
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.target as HTMLImageElement;

        // If image has 0 dimensions, it's likely broken
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            handleError();
            return;
        }

        // Call the original handleLoad for NSFW check
        handleLoad(e);
    };

    const handleLoad = async (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        if (!nsfwFilterEnabled) return;

        const img = e.target as HTMLImageElement;

        // Skip check if we already decided to show it
        if (showAnyway) return;

        setIsChecking(true);
        try {
            // Needed to avoid cross-origin issues with canvas if image is from another domain
            if (img.crossOrigin !== 'anonymous') {
                img.crossOrigin = 'anonymous';
            }

            const isUnsafe = await nsfwService.isNSFW(img, undefined, nsfwFilterLevel);
            setIsNSFW(isUnsafe);
        } catch (error) {
            console.error('Failed to check image safety:', error);
        } finally {
            setIsChecking(false);
        }
    };

    // If filter is disabled, render normal image with fallback support
    if (!nsfwFilterEnabled) {
        if (!currentSrc) return null;
        return (
            <img
                key={currentSrc}
                src={currentSrc}
                alt={alt}
                className={className}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleError}
                {...props}
            />
        );
    }

    if (!currentSrc) return <div className={cn("bg-slate-800 animate-pulse", className)} />;

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <img
                key={currentSrc}
                ref={imgRef}
                src={currentSrc}
                alt={alt}
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                onError={handleError}
                className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-all duration-300",
                    // Hide while checking or if NSFW (and not overridden)
                    (isChecking || (isNSFW && !showAnyway)) ? "blur-xl opacity-50" : "blur-0 opacity-100"
                )}
                {...props}
            />

            {/* Loading Overlay */}
            {isChecking && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
            )}

            {/* NSFW Warning Overlay */}
            {isNSFW && !showAnyway && !isChecking && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20 transition-all p-4 text-center">
                    <div className="mb-2 p-3 bg-red-500/20 rounded-full">
                        <EyeOff className="w-6 h-6 text-red-400" />
                    </div>
                    <p className="text-white font-medium text-sm mb-3">Sensitive Content</p>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAnyway(true);
                        }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full border border-white/20 transition-colors backdrop-blur-md"
                    >
                        Show Anyway
                    </button>
                </div>
            )}
        </div>
    );
}
