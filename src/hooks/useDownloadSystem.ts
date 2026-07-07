import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDownloadStore } from '@/stores/downloadStore';
import { Download } from '@/types/download';
import { useSettingsStore } from '@/stores/settingsStore';

type OnExtractionComplete = (download: Download, extractedPath: string) => void;

/**
 * Hook to interact with the global download system (Zustand store).
 * This hook initializes the Electron listeners and provides access to download state and actions.
 * @param onExtractionComplete - Callback function to run when a file extraction is successfully completed.
 * This is used to add the extracted game to the library.
 */
export function useDownloadSystem(onExtractionComplete?: OnExtractionComplete) {
    const navigate = useNavigate();
    const downloads = useDownloadStore(state => state.downloads);
    const { initializeListeners, ...actions } = useDownloadStore(state => state.actions);

    const autoRedirectToDownloads = useSettingsStore(state => state.autoRedirectToDownloads);

    useEffect(() => {
        const handleExtractionComplete = (download: Download, extractedPath: string) => {
            if (onExtractionComplete) {
                onExtractionComplete(download, extractedPath);
            }
        };

        const cleanup = initializeListeners(handleExtractionComplete);

        // This effect should run only once to set up listeners.
        // The onExtractionComplete callback is handled via the wrapper above
        // to avoid re-initializing listeners if the callback function instance changes.
        return () => {
            cleanup?.();
        };
    }, [initializeListeners, onExtractionComplete]);

    // This effect handles the auto-redirect navigation.
    useEffect(() => {
        // Find if there's a new download that just started
        const newDownload = downloads.find(d => d.status === 'downloading' && d.progress === 0 && (Date.now() - d.startTime.getTime()) < 2000);
        if (newDownload && autoRedirectToDownloads) {
            navigate('/downloads');
        }
    }, [downloads, autoRedirectToDownloads, navigate]);


    return {
        downloads,
        ...actions
    };
}

