export interface ElectronAPI {
    cancelDownload: (id: number) => void;
    openNewWindow: (url: string) => void;
    showItemInFolder: (path: string) => void;
    openPath: (path: string) => void;
    extractFile: (filePath: string, destPath: string) => Promise<{ success: boolean }>;

    // Storage Management
    selectDownloadDirectory: () => Promise<string | null>;
    getDiskSpace: (path: string) => Promise<{ free: number; total: number; available: number } | null>;
    setDownloadDirectory: (path: string) => Promise<boolean>;
    getDownloadDirectory: () => Promise<string>;

    // Events
    onDownloadStarted: (callback: (data: any) => void) => void;
    onDownloadProgress: (callback: (data: any) => void) => void;
    onDownloadComplete: (callback: (data: any) => void) => void;
    onDownloadError: (callback: (data: any) => void) => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
