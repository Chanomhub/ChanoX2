// TypeScript type definitions for Electron API exposed via preload
export interface DownloadStartedData {
    id: number;
    filename: string;
    totalBytes: number;
}

export interface DownloadProgressData {
    id: number;
    receivedBytes: number;
    totalBytes: number;
    speed: number;
}

export interface DownloadCompleteData {
    id: number;
    path: string;
    filename: string;
}

export interface DownloadErrorData {
    id: number;
    error: string;
}

export interface DiskSpaceInfo {
    free: number;
    total: number;
    available: number;
}

export interface GameExecutable {
    path: string;
    type: 'windows-exe' | 'mac-app' | 'native-binary';
}

export interface LaunchGameOptions {
    executablePath: string;
    useWine?: boolean;
    args?: string[];
    locale?: string;
    gameId?: string; // For playtime tracking
}

export interface LaunchGameResult {
    success: boolean;
    error?: string;
    logsPath?: string;
}

export interface GameConfig {
    executablePath?: string;
    lastPlayed?: string;
    playTime?: number;
    [key: string]: unknown;
}

export interface GlobalSettings {
    wineProvider?: 'internal' | 'bottles' | 'custom';
    externalWineCommand?: string;
    [key: string]: unknown;
}

export interface OAuthCallbackData {
    accessToken: string;
    refreshToken: string;
}

export interface ElectronAPI {
    // Download control
    cancelDownload: (id: number) => void;
    showItemInFolder: (path: string) => void;
    openPath: (path: string) => void;
    openExternal: (url: string) => void;
    openNewWindow: (url: string) => void;
    extractFile: (filePath: string, destPath: string) => Promise<{ success: boolean }>;

    // Storage Management
    selectDownloadDirectory: () => Promise<string | null>;
    getDiskSpace: (path: string) => Promise<DiskSpaceInfo | null>;
    setDownloadDirectory: (path: string) => Promise<boolean>;
    getDownloadDirectory: () => Promise<string>;

    // Download event listeners - return cleanup function
    onDownloadStarted: (callback: (data: DownloadStartedData) => void) => (() => void) | void;
    onDownloadProgress: (callback: (data: DownloadProgressData) => void) => (() => void) | void;
    onDownloadComplete: (callback: (data: DownloadCompleteData) => void) => (() => void) | void;
    onDownloadError: (callback: (data: DownloadErrorData) => void) => (() => void) | void;

    // Game Launching
    scanGameExecutables: (directory: string) => Promise<GameExecutable[]>;
    launchGame: (options: LaunchGameOptions) => Promise<LaunchGameResult>;
    stopGame: (gameId: string) => Promise<{ success: boolean; error?: string }>;
    isGameRunning: (gameId: string) => Promise<boolean>;
    getGameConfig: (gameId: string) => Promise<GameConfig | null>;
    saveGameConfig: (data: { gameId: string; config: GameConfig }) => Promise<boolean>;

    // Game event listeners
    onGameStarted: (callback: (data: { gameId: string; pid: number }) => void) => (() => void) | void;
    onGameStopped: (callback: (data: { gameId: string; duration?: number; code?: number; error?: string }) => void) => (() => void) | void;

    // Global Settings
    getGlobalSettings: () => Promise<GlobalSettings>;
    saveGlobalSettings: (settings: GlobalSettings) => Promise<boolean>;

    // Bottles CLI
    listBottles: () => Promise<{ success: boolean; bottles: string[]; error?: string }>;

    // Downloads Persistence
    getDownloads: () => Promise<unknown[]>;
    saveDownloads: (downloads: unknown[]) => Promise<boolean>;

    // Library Persistence
    getLibrary: () => Promise<unknown[]>;
    saveLibrary: (library: unknown[]) => Promise<boolean>;

    // File Management
    moveArchiveToStorage: (sourcePath: string, filename: string) => Promise<{ success: boolean; newPath?: string; error?: string }>;
    deleteArchive: (archivePath: string) => Promise<{ success: boolean; error?: string }>;
    deleteGameFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
    fileExists: (filePath: string) => Promise<boolean>;

    // Auth Persistence
    getAuthData: (key: string) => Promise<string | null>;
    saveAuthData: (key: string, value: string) => Promise<boolean>;
    removeAuthData: (key: string) => Promise<boolean>;

    // Window controls
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;

    // OAuth
    onOAuthCallback: (callback: (data: OAuthCallbackData) => void) => (() => void) | void;
    startOAuthServer: () => Promise<{ port: number }>;
    stopOAuthServer: () => Promise<boolean>;

    // Game Shortcuts
    createGameShortcut: (gameId: string, title: string, iconPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    deleteGameShortcut: (gameId: string, title: string) => Promise<{ success: boolean; error?: string }>;
    hasGameShortcut: (gameId: string, title: string) => Promise<boolean>;

    // Pending game launch (from shortcuts/second instance)
    onPendingGameLaunch: (callback: (data: { gameId: string }) => void) => (() => void) | void;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
