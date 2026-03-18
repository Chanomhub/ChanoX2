// Download manager utility — delegates to native adapter
// Adapted from legacy/utils/electronDownloader.ts

import { native } from '@/lib/native';

interface DownloadProgress {
    totalBytes: number;
    receivedBytes: number;
    speed: number;
}

export class ElectronDownloader {
    /**
     * Navigate to download link within the app
     * Opens in internal window or external browser
     */
    static openDownloadLink(url: string, _router: any) {
        native.shell.openNewWindow(url);
    }

    /**
     * Start a download with custom headers (e.g. for Auth)
     */
    static downloadFile(url: string, headers?: Record<string, string>) {
        console.log('Using authenticated download:', url);
        native.download.downloadFile(url, headers);
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
        // Each listener returns a cleanup function
        const cleanupStarted = native.download.onDownloadStarted((data: any) => {
            onDownloadStarted(data.id, data.filename, data.totalBytes);
        }) as (() => void) | undefined;

        const cleanupProgress = native.download.onDownloadProgress((data: any) => {
            onProgress(data.id, {
                totalBytes: data.totalBytes,
                receivedBytes: data.receivedBytes,
                speed: data.speed
            });
        }) as (() => void) | undefined;

        const cleanupComplete = native.download.onDownloadComplete((data: any) => {
            onComplete(data.id, data.path, data.filename);
        }) as (() => void) | undefined;

        const cleanupError = native.download.onDownloadError((data: any) => {
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

    static cancelDownload(id: number) {
        native.download.cancelDownload(id);
    }

    static showItemInFolder(path: string) {
        native.shell.showItemInFolder(path);
    }

    static openPath(path: string) {
        native.shell.openPath(path);
    }

    static async extractFile(filePath: string, destPath: string) {
        return await native.mod.extractFile(filePath, destPath);
    }
}
