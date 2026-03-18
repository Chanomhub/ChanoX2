/**
 * Native API Entry Point
 *
 * Auto-detects the runtime and exports the appropriate adapter.
 * All renderer code should import from here:
 *
 *   import { native } from '@/lib/native';
 *   native.shell.openExternal('https://...');
 *   await native.storage.getLibrary();
 */

import type { INativeAPI } from './types';
import { createElectronAdapter } from './adapters/electron';
import { createWebAdapter } from './adapters/web';

// Re-export types for convenience
export type { INativeAPI } from './types';
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
} from './types';

function detectAndCreate(): INativeAPI {
    const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

    if (isElectron) {
        return createElectronAdapter();
    }

    // Future: add detection for Electrobun, Tauri, etc.
    // if (typeof window !== 'undefined' && window.__ELECTROBUN__) {
    //     return createElectrobunAdapter();
    // }

    return createWebAdapter();
}

/** The active native API adapter for the current runtime */
export const native: INativeAPI = detectAndCreate();
