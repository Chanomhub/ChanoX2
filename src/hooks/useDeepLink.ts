import { useEffect } from 'react';

/**
 * Hook that listens for deep link events (chanox2:// protocol)
 * @param onDeepLink Callback function when a deep link is received
 */
export const useDeepLink = (onDeepLink: (url: string) => void) => {
    useEffect(() => {
        if (!window.electronAPI?.onDeepLink) {
            return;
        }

        console.log('🔗 Setting up deep link listener');

        const cleanup = window.electronAPI.onDeepLink((data) => {
            console.log('🔗 Received deep link:', data);
            if (data.url) {
                onDeepLink(data.url);
            }
        });

        return () => {
            if (cleanup) cleanup();
        };
    }, [onDeepLink]);
};
