import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { ElectronDownloader } from '@/utils/electronDownloader';
import { Download } from '@/types/download';

export function useDownloadSystem() {
    const [downloads, setDownloads] = useState<Download[]>([]);
    const router = useRouter();
    const isLoadedRef = useRef(false);

    // Load from Electron Store on mount
    useEffect(() => {
        const loadDownloads = async () => {
            try {
                const saved = await window.electronAPI.getDownloads();
                if (saved && Array.isArray(saved)) {
                    // Restore Dates
                    const restored = saved.map((d: any) => ({
                        ...d,
                        startTime: new Date(d.startTime),
                        endTime: d.endTime ? new Date(d.endTime) : undefined,
                        // Reset stuck states
                        status: d.status === 'downloading' ? 'failed' : d.status,
                        error: d.status === 'downloading' ? 'Download interrupted by app close' : d.error
                    }));
                    setDownloads(restored);
                }
            } catch (err) {
                console.error('Failed to load downloads from file system:', err);
            } finally {
                isLoadedRef.current = true;
            }
        };
        loadDownloads();
    }, []);

    // Persist to Electron Store whenever downloads change
    useEffect(() => {
        if (isLoadedRef.current) {
            window.electronAPI.saveDownloads(downloads);
        }
    }, [downloads]);

    // Store pending metadata for the next download started
    const pendingMetadata = useRef<{ title?: string; cover?: string; engine?: string; gameVersion?: string } | null>(null);

    // Setup auto-capture of all downloads
    useEffect(() => {
        ElectronDownloader.setupDownloadListeners(
            // On download started
            (id, filename, totalBytes) => {
                // Check if we have pending metadata
                const metadata = pendingMetadata.current;

                // Clear immediately to avoid attaching to wrong download if concurrent (unlikely here)
                // But better to keep it briefly? No, single thread assumtion is safer for now.
                pendingMetadata.current = null;

                const newDownload: Download = {
                    id,
                    filename,
                    articleTitle: metadata?.title,
                    coverImage: metadata?.cover,
                    engine: metadata?.engine,
                    gameVersion: metadata?.gameVersion,
                    status: 'downloading',
                    progress: 0,
                    downloadedBytes: 0,
                    totalBytes,
                    speed: 0,
                    startTime: new Date(),
                    isFavorite: false,
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
                // Check if file is an archive
                const lowerFilename = filename.toLowerCase();
                const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.xz', '.tgz'];
                const isArchive = archiveExtensions.some(ext => lowerFilename.endsWith(ext));

                if (isArchive) {
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
                } else {
                    // Non-archive file (e.g. .exe), treat as ready immediately
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
                                    isExtracting: false,
                                    extractedPath: savePath // Treat the file itself as the "extracted" content
                                }
                                : d
                        )
                    );
                }
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

    const openDownloadLink = (url: string, articleTitle?: string, coverImage?: string, engine?: string, gameVersion?: string) => {
        // Store metadata for when the download actually starts
        pendingMetadata.current = {
            title: articleTitle,
            cover: coverImage,
            engine,
            gameVersion
        };

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
        const supportedExtensions = ['.zip', '.tar.xz', '.7z', '.rar', '.tar', '.gz', '.tgz', '.xz'];
        const isSupported = download?.filename && supportedExtensions.some(ext => download.filename.toLowerCase().endsWith(ext));

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

    const toggleFavorite = (id: number) => {
        setDownloads(prev => prev.map(d =>
            d.id === id ? { ...d, isFavorite: !d.isFavorite } : d
        ));
    };

    return {
        downloads,
        openDownloadLink,
        cancelDownload,
        removeDownload,
        clearCompleted,
        clearAll,
        showInFolder,
        openFile,
        extractDownload,
        toggleFavorite
    };
}
