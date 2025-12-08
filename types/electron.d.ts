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

    // Game Launching
    scanGameExecutables: (directory: string) => Promise<{ path: string; type: string }[]>;
    launchGame: (options: { executablePath: string; useWine: boolean; args?: string[]; locale?: string }) => Promise<{ success: boolean; error?: string }>;
    getGameConfig: (gameId: number | string) => Promise<any>;
    saveGameConfig: (data: { gameId: number | string; config: any }) => Promise<boolean>;
    saveGlobalSettings: (settings: any) => Promise<boolean>;

    // Downloads Persistence
    getDownloads: () => Promise<Download[]>;
    saveDownloads: (downloads: Download[]) => Promise<boolean>;

    // Auth Persistence
    getAuthData: (key: string) => Promise<string | null>;
    saveAuthData: (key: string, value: string) => Promise<boolean>;
    removeAuthData: (key: string) => Promise<boolean>;

    // Window controls
    getGlobalSettings: () => Promise<{ wineProvider?: 'internal' | 'bottles'; externalWineCommand?: string }>;
    saveGlobalSettings: (settings: { wineProvider: 'internal' | 'bottles'; externalWineCommand?: string }) => Promise<boolean>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
