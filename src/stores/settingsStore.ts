import { create } from 'zustand';

export type SettingsSection = 'account' | 'general' | 'storage' | 'linux' | 'mac' | 'notifications' | 'security';

interface SettingsStore {
    isOpen: boolean;
    activeSection: SettingsSection;
    downloadPath: string;
    nsfwFilterEnabled: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    setActiveSection: (section: SettingsSection) => void;
    setDownloadPath: (path: string) => void;
    setNsfwFilterEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
    isOpen: false,
    activeSection: 'general',
    downloadPath: '',
    nsfwFilterEnabled: false,
    openSettings: () => set({ isOpen: true }),
    closeSettings: () => set({ isOpen: false }),
    setActiveSection: (section) => set({ activeSection: section }),
    setDownloadPath: (path) => set({ downloadPath: path }),
    setNsfwFilterEnabled: (enabled) => set({ nsfwFilterEnabled: enabled }),
}));
