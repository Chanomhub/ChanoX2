import { useEffect } from 'react';

/**
 * Hook that listens for pending game launch events from shortcuts or second instance
 * @param onLaunch Callback function when a game should be launched
 */
export const usePendingGameLaunch = (onLaunch: (gameId: string) => void) => {
    useEffect(() => {
        if (!window.electronAPI?.onPendingGameLaunch) {
            return;
        }

        console.log('🎮 Setting up pending game launch listener');

        const cleanup = window.electronAPI.onPendingGameLaunch((data) => {
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
