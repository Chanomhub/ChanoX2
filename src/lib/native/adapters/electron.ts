/**
 * Electron Adapter — implements INativeAPI by delegating to window.electronAPI
 *
 * This is a thin passthrough layer. All logic remains in the Electron main process.
 * When migrating to another runtime, create a new adapter file instead of modifying this one.
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

function getAPI() {
    const api = window.electronAPI;
    if (!api) throw new Error('electronAPI not available');
    return api;
}

const windowAPI: IWindowAPI = {
    minimize: () => getAPI().minimizeWindow(),
    maximize: () => getAPI().maximizeWindow(),
    close: () => getAPI().closeWindow(),
};

const shellAPI: IShellAPI = {
    openExternal: (url) => getAPI().openExternal(url),
    openPath: (path) => getAPI().openPath(path),
    showItemInFolder: (path) => getAPI().showItemInFolder(path),
    openNewWindow: (url) => getAPI().openNewWindow(url),
};

const dialogAPI: IDialogAPI = {
    selectDownloadDirectory: () => getAPI().selectDownloadDirectory(),
    selectGameFolder: () => getAPI().selectGameFolder(),
    selectGameArchive: () => getAPI().selectGameArchive(),
};

const fsAPI: IFileSystemAPI = {
    readFileContent: (path) => getAPI().readFileContent(path),
    writeFileContent: (path, content) => getAPI().writeFileContent(path, content),
    deleteFile: (path) => getAPI().deleteFile(path),
    fileExists: (filePath) => getAPI().fileExists(filePath),
    readDirectory: (dirPath) => getAPI().readDirectory(dirPath),
    getDiskSpace: (path) => getAPI().getDiskSpace(path),
    moveArchiveToStorage: (sourcePath, filename) => getAPI().moveArchiveToStorage(sourcePath, filename),
    deleteArchive: (archivePath) => getAPI().deleteArchive(archivePath),
    deleteGameFolder: (folderPath) => getAPI().deleteGameFolder(folderPath),
};

const downloadAPI: IDownloadAPI = {
    downloadFile: (url, headers) => getAPI().downloadFile(url, headers),
    cancelDownload: (id) => getAPI().cancelDownload(id),
    installMod: (url, installPath, filename, headers) => getAPI().installMod(url, installPath, filename, headers),
    downloadCoverImage: (gameId, coverImageUrl) => getAPI().downloadCoverImage(gameId, coverImageUrl),
    onDownloadStarted: (cb) => getAPI().onDownloadStarted(cb),
    onDownloadProgress: (cb) => getAPI().onDownloadProgress(cb),
    onDownloadComplete: (cb) => getAPI().onDownloadComplete(cb),
    onDownloadError: (cb) => getAPI().onDownloadError(cb),
};

const gameAPI: IGameAPI = {
    scanGameExecutables: (dir) => getAPI().scanGameExecutables(dir),
    launchGame: (options) => getAPI().launchGame(options),
    stopGame: (gameId) => getAPI().stopGame(gameId),
    isGameRunning: (gameId) => getAPI().isGameRunning(gameId),
    getGameConfig: (gameId) => getAPI().getGameConfig(gameId),
    saveGameConfig: (data) => getAPI().saveGameConfig(data),
    onGameStarted: (cb) => getAPI().onGameStarted(cb),
    onGameStopped: (cb) => getAPI().onGameStopped(cb),
};

const storageAPI: IStorageAPI = {
    getGlobalSettings: () => getAPI().getGlobalSettings(),
    saveGlobalSettings: (settings) => getAPI().saveGlobalSettings(settings),
    getDownloads: () => getAPI().getDownloads(),
    saveDownloads: (downloads) => getAPI().saveDownloads(downloads),
    getLibrary: () => getAPI().getLibrary(),
    saveLibrary: (library) => getAPI().saveLibrary(library),
    getAuthData: (key) => getAPI().getAuthData(key),
    saveAuthData: (key, value) => getAPI().saveAuthData(key, value),
    removeAuthData: (key) => getAPI().removeAuthData(key),
    getDownloadDirectory: () => getAPI().getDownloadDirectory(),
    setDownloadDirectory: (path) => getAPI().setDownloadDirectory(path),
};

const modAPI: IModAPI = {
    extractFile: (filePath, destPath) => getAPI().extractFile(filePath, destPath),
    checkExtractionTools: () => getAPI().checkExtractionTools(),
    getLpackMetadata: (filePath, key) => getAPI().getLpackMetadata(filePath, key),
    checkLpackConflicts: (filePath, destPath, key) => getAPI().checkLpackConflicts(filePath, destPath, key),
    extractLpack: (filePath, destPath, key, modId, gamePath) => getAPI().extractLpack(filePath, destPath, key, modId, gamePath),
    readLpackFile: (filePath, key, innerPath) => getAPI().readLpackFile(filePath, key, innerPath),
    rollbackLpackExtraction: (gamePath, backupId) => getAPI().rollbackLpackExtraction(gamePath, backupId),
    getModBackups: (gamePath, modId) => getAPI().getModBackups(gamePath, modId),
};

const oauthAPI: IOAuthAPI = {
    startOAuthServer: () => getAPI().startOAuthServer(),
    stopOAuthServer: () => getAPI().stopOAuthServer(),
    onOAuthCallback: (cb) => getAPI().onOAuthCallback(cb),
};

const shortcutAPI: IShortcutAPI = {
    createGameShortcut: (gameId, title, iconPath) => getAPI().createGameShortcut(gameId, title, iconPath),
    deleteGameShortcut: (gameId, title) => getAPI().deleteGameShortcut(gameId, title),
    hasGameShortcut: (gameId, title) => getAPI().hasGameShortcut(gameId, title),
    onPendingGameLaunch: (cb) => getAPI().onPendingGameLaunch(cb),
};

const wineAPI: IWineAPI = {
    checkWinetricksInstalled: () => getAPI().checkWinetricksInstalled(),
    getWinetricksPackages: () => getAPI().getWinetricksPackages(),
    installWinetricksPackage: (packageId, winePrefix) => getAPI().installWinetricksPackage(packageId, winePrefix),
    cancelWinetricksInstall: () => getAPI().cancelWinetricksInstall(),
    onWinetricksProgress: (cb) => getAPI().onWinetricksProgress(cb),
    listBottles: () => getAPI().listBottles(),
};

const nstAPI: INstAPI = {
    openNstCli: (projectPath, engine) => getAPI().openNstCli(projectPath, engine),
};

export function createElectronAdapter(): INativeAPI {
    return {
        isDesktop: true,
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
