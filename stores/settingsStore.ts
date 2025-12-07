import { create } from 'zustand';

interface SettingsState {
    isOpen: boolean;
    activeSection: string;
    openSettings: (section?: string) => void;
    closeSettings: () => void;
    setActiveSection: (section: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
    isOpen: false,
    activeSection: 'general',
    openSettings: (section = 'general') => set({ isOpen: true, activeSection: section }),
    closeSettings: () => set({ isOpen: false }),
    setActiveSection: (section) => set({ activeSection: section }),
}));
