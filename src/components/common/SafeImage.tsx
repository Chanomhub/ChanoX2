import React, { useState, useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { nsfwService } from '@/services/nsfwService';
import { EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackIcon?: React.ReactNode;
    fallbackSrc?: string; // Fallback URL if primary src fails (e.g., local file deleted)
}

export function SafeImage({ className, src, fallbackSrc, alt, ...props }: SafeImageProps) {
    const { nsfwFilterEnabled, nsfwFilterLevel } = useSettingsStore();
    const [isChecking, setIsChecking] = useState(false);
    const [isNSFW, setIsNSFW] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const [showAnyway, setShowAnyway] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);
    const [hasErrored, setHasErrored] = useState(false);

    // Reset state when src changes
    useEffect(() => {
        setIsChecking(false);
        setIsNSFW(false);
        setShowAnyway(false);
        setCurrentSrc(src);
        setHasErrored(false);
    }, [src]);

    const handleError = () => {
        // If primary src fails and we have a fallback, try it
        if (!hasErrored && fallbackSrc && currentSrc !== fallbackSrc) {
            console.log('Image failed to load, trying fallback:', fallbackSrc);
            setCurrentSrc(fallbackSrc);
            setHasErrored(true);
        }
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
        return (
            <img
                src={currentSrc}
                alt={alt}
                className={className}
                loading="lazy"
                onError={handleError}
                {...props}
            />
        );
    }

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <img
                ref={imgRef}
                src={currentSrc}
                alt={alt}
                crossOrigin="anonymous"
                onLoad={handleLoad}
                onError={handleError}
                className={cn(
                    "w-full h-full object-cover transition-all duration-300",
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
