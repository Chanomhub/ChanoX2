/**
 * Web Adapter — fallback INativeAPI implementation for browser environments.
 *
 * Provides no-op or browser-native fallbacks for when the app runs outside
 * a desktop runtime (e.g., during development in a regular browser window).
 */

import type {
    INativeAPI,
    IWindowAPI,
    IShellAPI,
    IDialogAPI,
    IFileSystemAPI,
    IDownloadAPI,
    IGameAPI,
    IStorageAPI,
    IModAPI,
    IOAuthAPI,
    IShortcutAPI,
    IWineAPI,
    INstAPI,
} from '../types';

const noop = () => { };
const fail = async () => ({ success: false as const, error: 'Not available in web mode' });

const windowAPI: IWindowAPI = {
    minimize: noop,
    maximize: noop,
    close: () => window.close(),
};

const shellAPI: IShellAPI = {
    openExternal: (url) => { window.open(url, '_blank'); },
    openPath: noop,
    showItemInFolder: noop,
    openNewWindow: (url) => { window.open(url, '_blank'); },
};

const dialogAPI: IDialogAPI = {
    selectDownloadDirectory: async () => null,
    selectGameFolder: async () => null,
    selectGameArchive: async () => null,
};

const fsAPI: IFileSystemAPI = {
    readFileContent: async () => null,
    writeFileContent: async () => false,
    deleteFile: async () => false,
    fileExists: async () => false,
    readDirectory: async () => ({ success: false, entries: [], error: 'Not available in web mode' }),
    getDiskSpace: async () => null,
    moveArchiveToStorage: async () => fail(),
    deleteArchive: async () => fail(),
    deleteGameFolder: async () => fail(),
};

const downloadAPI: IDownloadAPI = {
    downloadFile: noop,
    cancelDownload: noop,
    installMod: async () => ({ success: false }),
    downloadCoverImage: async () => ({ success: false }),
    onDownloadStarted: () => noop,
    onDownloadProgress: () => noop,
    onDownloadComplete: () => noop,
    onDownloadError: () => noop,
};

const gameAPI: IGameAPI = {
    scanGameExecutables: async () => [],
    launchGame: async () => ({ success: false, error: 'Not available in web mode' }),
    stopGame: async () => fail(),
    isGameRunning: async () => false,
    getGameConfig: async () => null,
    saveGameConfig: async () => false,
    onGameStarted: () => noop,
    onGameStopped: () => noop,
};

const storageAPI: IStorageAPI = {
    getGlobalSettings: async () => ({}),
    saveGlobalSettings: async () => {
        console.warn('[WebAdapter] saveGlobalSettings is a no-op in web mode');
        return false;
    },
    getDownloads: async () => [],
    saveDownloads: async () => false,
    getLibrary: async () => [],
    saveLibrary: async () => false,
    getAuthData: async (key) => localStorage.getItem(`auth_${key}`),
    saveAuthData: async (key, value) => {
        localStorage.setItem(`auth_${key}`, value);
        return true;
    },
    removeAuthData: async (key) => {
        localStorage.removeItem(`auth_${key}`);
        return true;
    },
    getDownloadDirectory: async () => '',
    setDownloadDirectory: async () => false,
};

const modAPI: IModAPI = {
    extractFile: async () => fail(),
    checkExtractionTools: async () => ({ available: false }),
    getLpackMetadata: async () => fail(),
    checkLpackConflicts: async () => fail(),
    extractLpack: async () => fail(),
    readLpackFile: async () => fail(),
    rollbackLpackExtraction: async () => fail(),
    getModBackups: async () => ({ success: false, backups: [] }),
};

const oauthAPI: IOAuthAPI = {
    startOAuthServer: async () => ({ port: 0 }),
    stopOAuthServer: async () => false,
    onOAuthCallback: () => noop,
};

const shortcutAPI: IShortcutAPI = {
    createGameShortcut: async () => fail(),
    deleteGameShortcut: async () => fail(),
    hasGameShortcut: async () => false,
    onPendingGameLaunch: () => noop,
};

const wineAPI: IWineAPI = {
    checkWinetricksInstalled: async () => ({ installed: false }),
    getWinetricksPackages: async () => [],
    installWinetricksPackage: async () => ({ success: false, package: '', error: 'Not available in web mode' }),
    cancelWinetricksInstall: async () => fail(),
    onWinetricksProgress: () => noop,
    listBottles: async () => ({ success: false, bottles: [], error: 'Not available in web mode' }),
};

const nstAPI: INstAPI = {
    openNstCli: async () => fail(),
};

export function createWebAdapter(): INativeAPI {
    return {
        isDesktop: false,
        window: windowAPI,
        shell: shellAPI,
        dialog: dialogAPI,
        fs: fsAPI,
        download: downloadAPI,
        game: gameAPI,
        storage: storageAPI,
        mod: modAPI,
        oauth: oauthAPI,
        shortcut: shortcutAPI,
        wine: wineAPI,
        nst: nstAPI,
    };
}
