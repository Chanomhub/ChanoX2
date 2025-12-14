import { create } from 'zustand';

export type SettingsSection = 'account' | 'general' | 'storage' | 'linux' | 'notifications' | 'security';

interface SettingsStore {
    isOpen: boolean;
    activeSection: SettingsSection;
    downloadPath: string;
    openSettings: () => void;
    closeSettings: () => void;
    setActiveSection: (section: SettingsSection) => void;
    setDownloadPath: (path: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
    isOpen: false,
    activeSection: 'general',
    downloadPath: '',
    openSettings: () => set({ isOpen: true }),
    closeSettings: () => set({ isOpen: false }),
    setActiveSection: (section) => set({ activeSection: section }),
    setDownloadPath: (path) => set({ downloadPath: path }),
}));
