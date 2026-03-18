import { useEffect } from 'react';
import { native } from '@/lib/native';

/**
 * Hook that listens for pending game launch events from shortcuts or second instance
 * @param onLaunch Callback function when a game should be launched
 */
export const usePendingGameLaunch = (onLaunch: (gameId: string) => void) => {
    useEffect(() => {
        if (!native.isDesktop) return;

        console.log('🎮 Setting up pending game launch listener');

        const cleanup = native.shortcut.onPendingGameLaunch((data) => {
            console.log('🎮 Received pending game launch:', data);
            if (data.gameId) {
                onLaunch(data.gameId);
            }
        });

        return () => {
            if (cleanup) cleanup();
        };
    }, [onLaunch]);
};
