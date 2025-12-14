import { useState, useEffect, useRef, useCallback } from 'react';
import { ElectronDownloader } from '@/lib/electronDownloader';
import { Download } from '@/types/download';

type OnExtractionComplete = (download: Download, extractedPath: string) => void;

export function useDownloadSystem(onExtractionComplete?: OnExtractionComplete) {
    const [downloads, setDownloads] = useState<Download[]>([]);
    const isLoadedRef = useRef(false);

    // Store callback in ref to avoid stale closures
    const onExtractionCompleteRef = useRef(onExtractionComplete);
    useEffect(() => {
        onExtractionCompleteRef.current = onExtractionComplete;
    }, [onExtractionComplete]);

    // Load from Electron Store on mount - only load active/failed downloads (not completed)
    useEffect(() => {
        const loadDownloads = async () => {
            try {
                if (window.electronAPI) {
                    const saved = await window.electronAPI.getDownloads();
                    if (saved && Array.isArray(saved)) {
                        // Restore Dates and filter out completed (they go to Library now)
                        const restored = saved
                            .map((d: any) => ({
                                ...d,
                                startTime: new Date(d.startTime),
                                endTime: d.endTime ? new Date(d.endTime) : undefined,
                                // Reset stuck downloading states
                                status: d.status === 'downloading' ? 'failed' : d.status,
                                error: d.status === 'downloading' ? 'Download interrupted by app close' : d.error
                            }))
                            // Filter: only keep non-completed (completed items are in Library)
                            .filter((d: any) => d.status !== 'completed');

                        // Deduplicate based on ID
                        const uniqueDownloads = Array.from(new Map(restored.map((item: any) => [item.id, item])).values());

                        setDownloads(uniqueDownloads as Download[]);
                    }
                }
            } catch (err) {
                console.error('Failed to load downloads from file system:', err);
            } finally {
                isLoadedRef.current = true;
            }
        };
        loadDownloads();
    }, []);

    // Persist to Electron Store whenever downloads change - only persist non-completed
    useEffect(() => {
        if (isLoadedRef.current && window.electronAPI) {
            // Don't persist completed downloads - they are now in Library
            const toSave = downloads.filter(d => d.status !== 'completed');
            window.electronAPI.saveDownloads(toSave);
        }
    }, [downloads]);

    // Store pending metadata for the next download started
    const pendingMetadata = useRef<{ articleId?: number; title?: string; cover?: string; engine?: string; gameVersion?: string } | null>(null);

    // Helper to call extraction complete callback
    const handleExtractionComplete = useCallback((download: Download, extractedPath: string) => {
        if (onExtractionCompleteRef.current) {
            onExtractionCompleteRef.current(download, extractedPath);
        }
    }, []);

    // Setup auto-capture of all downloads
    useEffect(() => {
        const cleanup = ElectronDownloader.setupDownloadListeners(
            // On download started
            (id, filename, totalBytes) => {
                setDownloads(prev => {
                    if (prev.some(d => d.id === id)) return prev;

                    const metadata = pendingMetadata.current;
                    pendingMetadata.current = null;

                    const newDownload: Download = {
                        id,
                        filename,
                        articleId: metadata?.articleId,
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
                    return [newDownload, ...prev];
                });
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
                                progress: progress.totalBytes > 0 ? (progress.receivedBytes / progress.totalBytes) * 100 : 0,
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
                    // First update state to show extracting
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
                                    isExtracting: true
                                }
                                : d
                        )
                    );

                    // Perform auto-extraction
                    let destPath = savePath.replace(/\.[^/.]+$/, ""); // strip last extension
                    if (destPath.endsWith('.tar')) {
                        destPath = destPath.substring(0, destPath.length - 4);
                    }

                    // Get the download object for callback
                    setDownloads(prev => {
                        const download = prev.find(d => d.id === id);
                        if (download) {
                            ElectronDownloader.extractFile(savePath, destPath)
                                .then(() => {
                                    console.log('Auto-extraction successful', destPath);
                                    // Call the callback to add to library
                                    handleExtractionComplete({ ...download, savePath, filename }, destPath);
                                    // Update state
                                    setDownloads(p =>
                                        p.map(d =>
                                            d.id === id
                                                ? { ...d, isExtracting: false, extractedPath: destPath }
                                                : d
                                        )
                                    );
                                })
                                .catch(err => {
                                    console.error('Auto-extraction failed', err);
                                    setDownloads(p =>
                                        p.map(d =>
                                            d.id === id
                                                ? { ...d, isExtracting: false, error: 'Extraction failed' }
                                                : d
                                        )
                                    );
                                });
                        }
                        return prev;
                    });
                } else {
                    // Non-archive file - complete directly
                    setDownloads(prev => {
                        const download = prev.find(d => d.id === id);
                        if (download) {
                            // Call callback for non-archive files too
                            handleExtractionComplete({ ...download, savePath, filename }, savePath);
                        }
                        return prev.map(d =>
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
                                    extractedPath: savePath
                                }
                                : d
                        );
                    });
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

        // Cleanup listeners on unmount to prevent duplicate callbacks
        return () => {
            cleanup?.();
        };
    }, [handleExtractionComplete]);

    const openDownloadLink = (url: string, articleId?: number, articleTitle?: string, coverImage?: string, engine?: string, gameVersion?: string) => {
        pendingMetadata.current = {
            articleId,
            title: articleTitle,
            cover: coverImage,
            engine,
            gameVersion
        };
        ElectronDownloader.openDownloadLink(url, null);
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
            let destPath = download.savePath.replace(/\.[^/.]+$/, "");
            if (destPath.endsWith('.tar')) {
                destPath = destPath.substring(0, destPath.length - 4);
            }
            await ElectronDownloader.extractFile(download.savePath, destPath);
            // Call callback after manual extraction too
            handleExtractionComplete(download, destPath);
            ElectronDownloader.showItemInFolder(destPath);
        } catch (error) {
            console.error('Extraction failed', error);
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
