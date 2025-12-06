import React, { createContext, useState, useContext, useEffect } from 'react';
import { ElectronDownloader } from '../utils/electronDownloader';
import { useRouter } from 'expo-router';

export interface Download {
    id: number; // Electron download ID
    url?: string;
    filename: string;
    articleTitle?: string;
    status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
    progress: number; // 0-100
    downloadedBytes: number;
    totalBytes: number;
    speed: number; // bytes per second
    startTime: Date;
    endTime?: Date;
    error?: string;
    savePath?: string;
    isExtracting?: boolean;
    extractedPath?: string;
}

interface DownloadContextType {
    downloads: Download[];
    openDownloadLink: (url: string, articleTitle?: string) => void;
    cancelDownload: (id: number) => void;
    removeDownload: (id: number) => void;
    clearCompleted: () => void;
    clearAll: () => void;
    showInFolder: (id: number) => void;
    openFile: (id: number) => void;
    extractDownload: (id: number) => Promise<void>;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
    const [downloads, setDownloads] = useState<Download[]>(() => {
        // Load from localStorage on initial render
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('downloads');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const seenIds = new Set<number>();

                    // Convert date strings back to Date objects and ensure unique IDs
                    return parsed.map((d: any) => {
                        let id = d.id;
                        // If ID collision detected (e.g. multiple 0s from legacy bug), assign new unique ID
                        if (seenIds.has(id)) {
                            id = Date.now() + Math.floor(Math.random() * 100000);
                        }
                        seenIds.add(id);

                        return {
                            ...d,
                            id,
                            startTime: new Date(d.startTime),
                            endTime: d.endTime ? new Date(d.endTime) : undefined,
                            // If app was closed while downloading, mark as failed/interrupted
                            status: d.status === 'downloading' ? 'failed' : d.status,
                            error: d.status === 'downloading' ? 'Download interrupted by app close' : d.error
                        };
                    });
                } catch (e) {
                    console.error('Failed to parse active downloads', e);
                    return [];
                }
            }
        }
        return [];
    });
    const router = useRouter();

    // Persist to localStorage whenever downloads change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('downloads', JSON.stringify(downloads));
        }
    }, [downloads]);

    // Setup auto-capture of all downloads
    useEffect(() => {
        ElectronDownloader.setupDownloadListeners(
            // On download started
            (id, filename, totalBytes) => {
                const newDownload: Download = {
                    id,
                    filename,
                    status: 'downloading',
                    progress: 0,
                    downloadedBytes: 0,
                    totalBytes,
                    speed: 0,
                    startTime: new Date(),
                };
                setDownloads(prev => [newDownload, ...prev]);
            },
            // On progress
            (id, progress) => {
                setDownloads(prev =>
                    prev.map(d =>
                        d.id === id
                            ? {
                                ...d,
                                status: 'downloading' as const,
                                downloadedBytes: progress.receivedBytes,
                                totalBytes: progress.totalBytes,
                                progress: (progress.receivedBytes / progress.totalBytes) * 100,
                                speed: progress.speed
                            }
                            : d
                    )
                );
            },
            // On complete
            (id, savePath, filename) => {
                setDownloads(prev =>
                    prev.map(d =>
                        d.id === id
                            ? {
                                ...d,
                                status: 'completed' as const,
                                progress: 100,
                                endTime: new Date(),
                                savePath,
                                filename,
                                speed: 0,
                                isExtracting: true // Auto-extract
                            }
                            : d
                    )
                );

                // Perform auto-extraction
                // Handle .tar.xz, .tar.gz, etc. by stripping extensions more aggressively
                // tailored for common archive types
                let destPath = savePath.replace(/\.[^/.]+$/, ""); // strip last extension
                if (destPath.endsWith('.tar')) {
                    destPath = destPath.substring(0, destPath.length - 4);
                }

                ElectronDownloader.extractFile(savePath, destPath)
                    .then(() => {
                        console.log('Auto-extraction successful', destPath);
                        setDownloads(prev =>
                            prev.map(d =>
                                d.id === id
                                    ? { ...d, isExtracting: false, extractedPath: destPath }
                                    : d
                            )
                        );
                    })
                    .catch(err => {
                        console.error('Auto-extraction failed', err);
                        setDownloads(prev =>
                            prev.map(d =>
                                d.id === id
                                    ? { ...d, isExtracting: false, error: 'Extraction failed' } // Don't fail the download, just extraction
                                    : d
                            )
                        );
                    });
            },
            // On error
            (id, error) => {
                setDownloads(prev =>
                    prev.map(d =>
                        d.id === id
                            ? {
                                ...d,
                                status: 'failed' as const,
                                error,
                                speed: 0
                            }
                            : d
                    )
                );
            }
        );
    }, []);

    const openDownloadLink = (url: string, articleTitle?: string) => {
        // Open in WebView within the app
        ElectronDownloader.openDownloadLink(url, router);

        // Download will be auto-captured when user clicks download on the upload service page
    };

    const cancelDownload = (id: number) => {
        ElectronDownloader.cancelDownload(id);
        setDownloads(prev =>
            prev.map(d => (d.id === id ? { ...d, status: 'cancelled' as const } : d))
        );
    };

    const removeDownload = (id: number) => {
        setDownloads(prev => prev.filter(d => d.id !== id));
    };

    const clearCompleted = () => {
        setDownloads(prev => prev.filter(d => d.status !== 'completed'));
    };

    const clearAll = () => {
        // Cancel all active downloads
        downloads.forEach(d => {
            if (d.status === 'downloading') {
                ElectronDownloader.cancelDownload(d.id);
            }
        });
        setDownloads([]);
    };

    const showInFolder = (id: number) => {
        const download = downloads.find(d => d.id === id);
        if (download && download.savePath) {
            ElectronDownloader.showItemInFolder(download.savePath);
        }
    };

    const openFile = (id: number) => {
        const download = downloads.find(d => d.id === id);
        if (download) {
            if (download.extractedPath) {
                ElectronDownloader.openPath(download.extractedPath);
            } else if (download.savePath) {
                ElectronDownloader.openPath(download.savePath);
            }
        }
    };

    const extractDownload = async (id: number) => {
        const download = downloads.find(d => d.id === id);
        // Allow common compressed formats
        const supportedExtensions = ['.zip', '.tar.xz', '.7z', '.rar', '.tar', '.gz'];
        const isSupported = download?.filename && supportedExtensions.some(ext => download.filename.endsWith(ext));

        if (!download || !download.savePath || !isSupported) {
            return;
        }

        setDownloads(prev => prev.map(d => d.id === id ? { ...d, isExtracting: true } : d));

        try {
            // Extract to a folder with the same name as the file (minus extension)
            let destPath = download.savePath.replace(/\.[^/.]+$/, "");
            if (destPath.endsWith('.tar')) {
                destPath = destPath.substring(0, destPath.length - 4);
            }
            await ElectronDownloader.extractFile(download.savePath, destPath);
            // Optionally open the folder after extraction
            ElectronDownloader.showItemInFolder(destPath);
        } catch (error) {
            console.error('Extraction failed', error);
            // You might want to update state to show error
        } finally {
            setDownloads(prev => prev.map(d => d.id === id ? { ...d, isExtracting: false } : d));
        }
    };

    return (
        <DownloadContext.Provider
            value={{
                downloads,
                openDownloadLink,
                cancelDownload,
                removeDownload,
                clearCompleted,
                clearAll,
                showInFolder,
                openFile,
                extractDownload,
            }}
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
