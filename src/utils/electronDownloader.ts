// Electron download manager utility
import { Platform } from 'react-native';

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
    static openDownloadLink(url: string, router: any) {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            // Open in new Electron window
            (window as any).electronAPI.openNewWindow(url);
        } else {
            // Fallback for web/dev
            router.push(`/webview?url=${encodeURIComponent(url)}`);
        }
    }

    /**
     * Setup download auto-capture listeners
     * This will automatically track ALL downloads from the browser
     */
    static setupDownloadListeners(
        onDownloadStarted: (id: number, filename: string, totalBytes: number) => void,
        onProgress: (id: number, progress: DownloadProgress) => void,
        onComplete: (id: number, path: string, filename: string) => void,
        onError: (id: number, error: string) => void
    ) {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            // Download started
            (window as any).electronAPI.onDownloadStarted((data: any) => {
                onDownloadStarted(data.id, data.filename, data.totalBytes);
            });

            // Download progress
            (window as any).electronAPI.onDownloadProgress((data: any) => {
                onProgress(data.id, {
                    totalBytes: data.totalBytes,
                    receivedBytes: data.receivedBytes,
                    speed: data.speed
                });
            });

            // Download complete
            (window as any).electronAPI.onDownloadComplete((data: any) => {
                onComplete(data.id, data.path, data.filename);
            });

            // Download error
            (window as any).electronAPI.onDownloadError((data: any) => {
                onError(data.id, data.error);
            });
        }
    }

    static cancelDownload(id: number) {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.cancelDownload(id);
        }
    }

    static showItemInFolder(path: string) {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.showItemInFolder(path);
        }
    }

    static openPath(path: string) {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.openPath(path);
        }
    }

    static async extractFile(filePath: string, destPath: string) {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            return await (window as any).electronAPI.extractFile(filePath, destPath);
        }
        throw new Error('Extraction not supported in this environment');
    }
}
