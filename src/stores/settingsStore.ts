import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SettingsSection = 'account' | 'general' | 'storage' | 'linux' | 'mac' | 'notifications' | 'security' | 'application';
export type NsfwFilterLevel = 'low' | 'medium' | 'high';

interface SettingsStore {
    isOpen: boolean;
    activeSection: SettingsSection;
    downloadPath: string;
    nsfwFilterEnabled: boolean;
    nsfwFilterLevel: NsfwFilterLevel;
    discordRPCEnabled: boolean;
    autoRedirectToDownloads: boolean;
    keepArchiveAfterExtraction: boolean;
    autoUpdateEnabled: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    setActiveSection: (section: SettingsSection) => void;
    setDownloadPath: (path: string) => void;
    setNsfwFilterEnabled: (enabled: boolean) => void;
    setNsfwFilterLevel: (level: NsfwFilterLevel) => void;
    setDiscordRPCEnabled: (enabled: boolean) => void;
    setAutoRedirectToDownloads: (enabled: boolean) => void;
    setKeepArchiveAfterExtraction: (enabled: boolean) => void;
    setAutoUpdateEnabled: (enabled: boolean) => void;
    loadFromElectron: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            isOpen: false,
            activeSection: 'general',
            downloadPath: '',
            nsfwFilterEnabled: false,
            nsfwFilterLevel: 'medium',
            discordRPCEnabled: true,
            autoRedirectToDownloads: true,
            keepArchiveAfterExtraction: false,
            autoUpdateEnabled: true,
            openSettings: () => set({ isOpen: true }),
            closeSettings: () => set({ isOpen: false }),
            setActiveSection: (section) => set({ activeSection: section }),
            setDownloadPath: (path) => set({ downloadPath: path }),
            setNsfwFilterEnabled: (enabled) => {
                set({ nsfwFilterEnabled: enabled });
                // Also save to electron global settings
                if (window.electronAPI) {
                    window.electronAPI.getGlobalSettings().then(settings => {
                        window.electronAPI?.saveGlobalSettings({ ...settings, nsfwFilterEnabled: enabled });
                    });
                }
            },
            setNsfwFilterLevel: (level) => {
                set({ nsfwFilterLevel: level });
                // Clear NSFW cache so images are re-evaluated with new threshold
                import('@/services/nsfwService').then(({ nsfwService }) => {
                    nsfwService.clearCache();
                    console.log('🔄 NSFW cache cleared due to sensitivity level change');
                });
                // Also save to electron global settings
                if (window.electronAPI) {
                    window.electronAPI.getGlobalSettings().then(settings => {
                        window.electronAPI?.saveGlobalSettings({ ...settings, nsfwFilterLevel: level });
                    });
                }
            },
            setDiscordRPCEnabled: (enabled) => {
                set({ discordRPCEnabled: enabled });
                if (window.electronAPI) {
                    window.electronAPI.getGlobalSettings().then(settings => {
                        window.electronAPI?.saveGlobalSettings({ ...settings, discordRPCEnabled: enabled });
                    });
                }
            },
            setAutoRedirectToDownloads: (enabled) => set({ autoRedirectToDownloads: enabled }),
            setKeepArchiveAfterExtraction: (enabled) => set({ keepArchiveAfterExtraction: enabled }),
            setAutoUpdateEnabled: (enabled) => {
                set({ autoUpdateEnabled: enabled });
                if (window.electronAPI) {
                    window.electronAPI.getGlobalSettings().then(settings => {
                        window.electronAPI?.saveGlobalSettings({ ...settings, autoUpdateEnabled: enabled });
                    });
                }
            },
            loadFromElectron: async () => {
                if (window.electronAPI) {
                    const settings = await window.electronAPI.getGlobalSettings();
                    if (settings.nsfwFilterEnabled !== undefined) {
                        set({ nsfwFilterEnabled: settings.nsfwFilterEnabled as boolean });
                    }
                    if (settings.nsfwFilterLevel !== undefined) {
                        set({ nsfwFilterLevel: settings.nsfwFilterLevel as NsfwFilterLevel });
                    }
                    if (settings.discordRPCEnabled !== undefined) {
                        set({ discordRPCEnabled: settings.discordRPCEnabled as boolean });
                    }
                    if (settings.autoUpdateEnabled !== undefined) {
                        set({ autoUpdateEnabled: settings.autoUpdateEnabled as boolean });
                    }
                }
            },
        }),
        {
            name: 'chanox-settings',
            partialize: (state) => ({
                nsfwFilterEnabled: state.nsfwFilterEnabled,
                nsfwFilterLevel: state.nsfwFilterLevel,
                discordRPCEnabled: state.discordRPCEnabled,
                autoRedirectToDownloads: state.autoRedirectToDownloads,
                keepArchiveAfterExtraction: state.keepArchiveAfterExtraction,
                autoUpdateEnabled: state.autoUpdateEnabled,
            }),
        }
    )
);

// Load settings from electron on startup
if (typeof window !== 'undefined') {
    // Small delay to ensure electron API is ready
    setTimeout(() => {
        useSettingsStore.getState().loadFromElectron();
    }, 100);
}
