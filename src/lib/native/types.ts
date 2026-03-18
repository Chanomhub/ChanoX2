/**
 * Native API Abstraction Layer - Type Definitions
 *
 * Runtime-agnostic interfaces for desktop native functionality.
 * Each adapter (Electron, Electrobun, Tauri, Web) implements INativeAPI.
 *
 * Re-exports shared data types from electron.d.ts to keep a single source of truth.
 */

import type {
    DownloadStartedData,
    DownloadProgressData,
    DownloadCompleteData,
    DownloadErrorData,
    DiskSpaceInfo,
    GameExecutable,
    LaunchGameOptions,
    LaunchGameResult,
    GameConfig,
    GlobalSettings,
    OAuthCallbackData,
    WinetricksPackage,
    WinetricksInstallResult,
    WinetricksProgressData,
    ReadDirectoryResult,
} from '@/types/electron.d';

// Re-export all shared types for consumers
export type {
    DownloadStartedData,
    DownloadProgressData,
    DownloadCompleteData,
    DownloadErrorData,
    DiskSpaceInfo,
    GameExecutable,
    LaunchGameOptions,
    LaunchGameResult,
    GameConfig,
    GlobalSettings,
    OAuthCallbackData,
    WinetricksPackage,
    WinetricksInstallResult,
    WinetricksProgressData,
    ReadDirectoryResult,
};

// ─── Sub-interfaces ──────────────────────────────────────────────

export interface IWindowAPI {
    minimize(): void;
    maximize(): void;
    close(): void;
}

export interface IShellAPI {
    openExternal(url: string): void;
    openPath(path: string): void;
    showItemInFolder(path: string): void;
    openNewWindow(url: string): void;
}

export interface IDialogAPI {
    selectDownloadDirectory(): Promise<string | null>;
    selectGameFolder(): Promise<string | null>;
    selectGameArchive(): Promise<string | null>;
}

export interface IFileSystemAPI {
    readFileContent(path: string): Promise<string | null>;
    writeFileContent(path: string, content: string): Promise<boolean>;
    deleteFile(path: string): Promise<boolean>;
    fileExists(filePath: string): Promise<boolean>;
    readDirectory(dirPath: string): Promise<ReadDirectoryResult>;
    getDiskSpace(path: string): Promise<DiskSpaceInfo | null>;
    moveArchiveToStorage(sourcePath: string, filename: string): Promise<{ success: boolean; newPath?: string; error?: string }>;
    deleteArchive(archivePath: string): Promise<{ success: boolean; error?: string }>;
    deleteGameFolder(folderPath: string): Promise<{ success: boolean; error?: string }>;
}

export interface IDownloadAPI {
    downloadFile(url: string, headers?: Record<string, string>): void;
    cancelDownload(id: number): void;
    installMod(url: string, installPath: string, filename: string, headers?: Record<string, string>): Promise<{ success: boolean; path?: string }>;
    downloadCoverImage(gameId: number | string, coverImageUrl: string): Promise<{ success: boolean; localPath?: string }>;

    // Event listeners — return cleanup function
    onDownloadStarted(callback: (data: DownloadStartedData) => void): (() => void) | void;
    onDownloadProgress(callback: (data: DownloadProgressData) => void): (() => void) | void;
    onDownloadComplete(callback: (data: DownloadCompleteData) => void): (() => void) | void;
    onDownloadError(callback: (data: DownloadErrorData) => void): (() => void) | void;
}

export interface IGameAPI {
    scanGameExecutables(directory: string): Promise<GameExecutable[]>;
    launchGame(options: LaunchGameOptions): Promise<LaunchGameResult>;
    stopGame(gameId: string): Promise<{ success: boolean; error?: string }>;
    isGameRunning(gameId: string): Promise<boolean>;
    getGameConfig(gameId: string): Promise<GameConfig | null>;
    saveGameConfig(data: { gameId: string; config: GameConfig }): Promise<boolean>;

    // Event listeners
    onGameStarted(callback: (data: { gameId: string; pid: number }) => void): (() => void) | void;
    onGameStopped(callback: (data: { gameId: string; duration?: number; code?: number; error?: string }) => void): (() => void) | void;
}

export interface IStorageAPI {
    // Global settings
    getGlobalSettings(): Promise<GlobalSettings>;
    saveGlobalSettings(settings: GlobalSettings): Promise<boolean>;

    // Downloads persistence
    getDownloads(): Promise<unknown[]>;
    saveDownloads(downloads: unknown[]): Promise<boolean>;

    // Library persistence
    getLibrary(): Promise<unknown[]>;
    saveLibrary(library: unknown[]): Promise<boolean>;

    // Auth persistence
    getAuthData(key: string): Promise<string | null>;
    saveAuthData(key: string, value: string): Promise<boolean>;
    removeAuthData(key: string): Promise<boolean>;

    // Download directory
    getDownloadDirectory(): Promise<string>;
    setDownloadDirectory(path: string): Promise<boolean>;
}

export interface IModAPI {
    // Extraction
    extractFile(filePath: string, destPath: string): Promise<{ success: boolean; actualPath?: string }>;
    checkExtractionTools(): Promise<unknown>;

    // LayerPack
    getLpackMetadata(filePath: string, key?: string): Promise<{ success: boolean; name?: string; author?: string | null; files?: string[]; error?: string }>;
    checkLpackConflicts(filePath: string, destPath: string, key?: string): Promise<{ success: boolean; conflicts?: string[]; newFiles?: string[]; structureWarning?: boolean; mismatchedDirs?: string[]; suggestedPath?: string | null; error?: string }>;
    extractLpack(filePath: string, destPath: string, key?: string, modId?: number, gamePath?: string): Promise<{ success: boolean; backupId?: string | null; error?: string }>;
    readLpackFile(filePath: string, key: string, innerPath: string): Promise<{ success: boolean; content?: Uint8Array; error?: string }>;
    rollbackLpackExtraction(gamePath: string, backupId: string): Promise<{ success: boolean; error?: string }>;
    getModBackups(gamePath: string, modId: number): Promise<{ success: boolean; backups?: { id: string; timestamp: number; fileCount: number; files?: string[] }[]; error?: string }>;
}

export interface IOAuthAPI {
    startOAuthServer(): Promise<{ port: number }>;
    stopOAuthServer(): Promise<boolean>;
    onOAuthCallback(callback: (data: OAuthCallbackData) => void): (() => void) | void;
}

export interface IShortcutAPI {
    createGameShortcut(gameId: string, title: string, iconPath?: string): Promise<{ success: boolean; path?: string; error?: string }>;
    deleteGameShortcut(gameId: string, title: string): Promise<{ success: boolean; error?: string }>;
    hasGameShortcut(gameId: string, title: string): Promise<boolean>;
    onPendingGameLaunch(callback: (data: { gameId: string }) => void): (() => void) | void;
}

export interface IWineAPI {
    checkWinetricksInstalled(): Promise<{ installed: boolean; version?: string }>;
    getWinetricksPackages(): Promise<WinetricksPackage[]>;
    installWinetricksPackage(packageId: string, winePrefix?: string): Promise<WinetricksInstallResult>;
    cancelWinetricksInstall(): Promise<{ success: boolean; error?: string }>;
    onWinetricksProgress(callback: (data: WinetricksProgressData) => void): (() => void) | void;
    listBottles(): Promise<{ success: boolean; bottles: string[]; error?: string }>;
}

export interface INstAPI {
    openNstCli(projectPath: string, engine: string): Promise<{ success: boolean; error?: string }>;
}

// ─── Combined Interface ──────────────────────────────────────────

export interface INativeAPI {
    /** True if running in a desktop environment with full native APIs */
    readonly isDesktop: boolean;

    readonly window: IWindowAPI;
    readonly shell: IShellAPI;
    readonly dialog: IDialogAPI;
    readonly fs: IFileSystemAPI;
    readonly download: IDownloadAPI;
    readonly game: IGameAPI;
    readonly storage: IStorageAPI;
    readonly mod: IModAPI;
    readonly oauth: IOAuthAPI;
    readonly shortcut: IShortcutAPI;
    readonly wine: IWineAPI;
    readonly nst: INstAPI;
}
