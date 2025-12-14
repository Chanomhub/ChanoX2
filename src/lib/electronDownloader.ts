// Electron download manager utility
// Adapted from legacy/utils/electronDownloader.ts

interface DownloadProgress {
    totalBytes: number;
    receivedBytes: number;
    speed: number;
}

export class ElectronDownloader {
    /**
     * Navigate to download link within the app
     * Opens in WebView for upload service links
     */
    static openDownloadLink(url: string, _router: any) {
        if (typeof window !== 'undefined' && window.electronAPI) {
            // Try to open in new internal window (Legacy behavior)
            if (window.electronAPI.openNewWindow) {
                window.electronAPI.openNewWindow(url);
            } else {
                // Fallback to external browser if internal window API is missing
                window.electronAPI.openExternal(url);
            }
        } else {
            console.warn('Electron API not available');
            window.open(url, '_blank');
        }
    }

    /**
     * Setup download auto-capture listeners
     * This will automatically track ALL downloads from the browser
     * Returns a cleanup function to remove all listeners
     */
    static setupDownloadListeners(
        onDownloadStarted: (id: number, filename: string, totalBytes: number) => void,
        onProgress: (id: number, progress: DownloadProgress) => void,
        onComplete: (id: number, savePath: string, filename: string) => void,
        onError: (id: number, error: string) => void
    ): (() => void) | undefined {
        if (typeof window !== 'undefined' && window.electronAPI) {
            // Each listener returns a cleanup function
            const cleanupStarted = window.electronAPI.onDownloadStarted((data: any) => {
                onDownloadStarted(data.id, data.filename, data.totalBytes);
            }) as (() => void) | undefined;

            const cleanupProgress = window.electronAPI.onDownloadProgress((data: any) => {
                onProgress(data.id, {
                    totalBytes: data.totalBytes,
                    receivedBytes: data.receivedBytes,
                    speed: data.speed
                });
            }) as (() => void) | undefined;

            const cleanupComplete = window.electronAPI.onDownloadComplete((data: any) => {
                onComplete(data.id, data.path, data.filename);
            }) as (() => void) | undefined;

            const cleanupError = window.electronAPI.onDownloadError((data: any) => {
                onError(data.id, data.error);
            }) as (() => void) | undefined;

            // Return combined cleanup function
            return () => {
                if (cleanupStarted) cleanupStarted();
                if (cleanupProgress) cleanupProgress();
                if (cleanupComplete) cleanupComplete();
                if (cleanupError) cleanupError();
            };
        }
        return undefined;
    }

    static cancelDownload(id: number) {
        if (typeof window !== 'undefined' && window.electronAPI) {
            window.electronAPI.cancelDownload(id);
        }
    }

    static showItemInFolder(path: string) {
        if (typeof window !== 'undefined' && window.electronAPI) {
            window.electronAPI.showItemInFolder(path);
        }
    }

    static openPath(path: string) {
        if (typeof window !== 'undefined' && window.electronAPI) {
            window.electronAPI.openPath(path);
        }
    }

    static async extractFile(filePath: string, destPath: string) {
        if (typeof window !== 'undefined' && window.electronAPI) {
            return await window.electronAPI.extractFile(filePath, destPath);
        }
        throw new Error('Extraction not supported in this environment');
    }
}
