import React, { createContext, useContext } from 'react';
import { Download } from '@/types/download';
import { useDownloadSystem } from '@/hooks/useDownloadSystem';

export { Download };

interface DownloadContextType {
    downloads: Download[];
    openDownloadLink: (url: string, articleTitle?: string, coverImage?: string, engine?: string, gameVersion?: string) => void;
    cancelDownload: (id: number) => void;
    removeDownload: (id: number) => void;
    clearCompleted: () => void;
    clearAll: () => void;
    showInFolder: (id: number) => void;
    openFile: (id: number) => void;
    extractDownload: (id: number) => Promise<void>;
    toggleFavorite: (id: number) => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
    const downloadSystem = useDownloadSystem();

    return (
        <DownloadContext.Provider
            value={downloadSystem}
        >
            {children}
        </DownloadContext.Provider>
    );
}

export function useDownloads() {
    const context = useContext(DownloadContext);
    if (context === undefined) {
        throw new Error('useDownloads must be used within a DownloadProvider');
    }
    return context;
}
