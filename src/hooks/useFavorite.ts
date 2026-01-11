import { useState, useCallback } from 'react';
import { getAuthenticatedClient } from '@/libs/sdk';
import { useAuth } from '@/contexts/AuthContext';

interface UseFavoriteReturn {
    isFavorited: boolean;
    isLoading: boolean;
    favoritesCount: number;
    toggleFavorite: () => Promise<void>;
    error: string | null;
}

export function useFavorite(
    slug: string,
    initialFavorited: boolean = false,
    initialCount: number = 0
): UseFavoriteReturn {
    const { token, isAuthenticated } = useAuth();
    const [isFavorited, setIsFavorited] = useState(initialFavorited);
    const [favoritesCount, setFavoritesCount] = useState(initialCount);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleFavorite = useCallback(async () => {
        if (!isAuthenticated || !token) {
            setError('Please login to favorite articles');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Create authenticated client with current token
            const authClient = getAuthenticatedClient(token);

            if (isFavorited) {
                // Remove from favorites
                await authClient.favorites.remove(slug);
                setIsFavorited(false);
                setFavoritesCount(prev => Math.max(0, prev - 1));
            } else {
                // Add to favorites
                await authClient.favorites.add(slug);
                setIsFavorited(true);
                setFavoritesCount(prev => prev + 1);
            }
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
            setError(err instanceof Error ? err.message : 'Failed to update favorite');
            // Revert optimistic update would go here if needed
        } finally {
            setIsLoading(false);
        }
    }, [slug, isFavorited, isAuthenticated, token]);

    return {
        isFavorited,
        isLoading,
        favoritesCount,
        toggleFavorite,
        error,
    };
}
