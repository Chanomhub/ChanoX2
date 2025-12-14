import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useDownloadSystem } from '@/hooks/useDownloadSystem';
import { Download } from '@/types/download';
import { useLibrary } from '@/contexts/LibraryContext';

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

export function DownloadProvider({ children }: { children: ReactNode }) {
    const { addToLibrary } = useLibrary();

    // Callback when extraction completes - add to library and move archive
    const onExtractionComplete = useCallback(async (download: Download, extractedPath: string) => {
        // Move archive to storage subfolder if it exists
        let finalArchivePath = download.savePath;
        if (download.savePath && window.electronAPI) {
            const filename = download.filename;
            const result = await window.electronAPI.moveArchiveToStorage(download.savePath, filename);
            if (result.success && result.newPath) {
                finalArchivePath = result.newPath;
            }
        }

        // Add to library
        addToLibrary({
            title: download.articleTitle || download.filename,
            coverImage: download.coverImage,
            extractedPath: extractedPath,
            archivePath: finalArchivePath,
            engine: download.engine,
            gameVersion: download.gameVersion,
        });
    }, [addToLibrary]);

    const downloadSystem = useDownloadSystem(onExtractionComplete);

    return (
        <DownloadContext.Provider value={downloadSystem}>
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
