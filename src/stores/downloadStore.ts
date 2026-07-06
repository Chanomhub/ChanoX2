import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Download } from '@/types/download';
import { ElectronDownloader } from '@/lib/electronDownloader';
import { useSettingsStore } from './settingsStore';
import { sdk } from '@/libs/sdk';

interface DownloadState {
    downloads: Download[];
    pendingMetadata: Record<string, any> | null;
    setDownloads: (downloads: Download[]) => void;
    actions: {
        initializeListeners: (onExtractionComplete: (download: Download, extractedPath: string) => void) => () => void;
        openDownloadLink: (url: string, metadata: Record<string, any>) => void;
        cancelDownload: (id: number) => void;
        removeDownload: (id: number) => void;
        clearCompleted: () => void;
        clearAll: () => void;
        showInFolder: (id: number) => void;
        openFile: (id: number) => void;
        retryDownload: (id: number) => void;
    };
}

export const useDownloadStore = create<DownloadState>()(
    persist(
        (set, get) => ({
            downloads: [],
            pendingMetadata: null,
            setDownloads: (downloads) => set({ downloads }),
            actions: {
                initializeListeners: (onExtractionComplete) => {
                    const cleanup = ElectronDownloader.setupDownloadListeners(
                        // onDownloadStarted
                        (id, filename, totalBytes) => {
                            const metadata = get().pendingMetadata;
                            set({ pendingMetadata: null });

                            const newDownload: Download = {
                                id,
                                filename,
                                articleId: metadata?.articleId,
                                apiDownloadId: metadata?.apiDownloadId,
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
                            set(state => ({ downloads: [newDownload, ...state.downloads.filter(d => d.id !== id)] }));
                        },
                        // onProgress
                        (id, progress) => {
                            set(state => ({
                                downloads: state.downloads.map(d =>
                                    d.id === id
                                        ? {
                                            ...d,
                                            status: 'downloading',
                                            downloadedBytes: progress.receivedBytes,
                                            totalBytes: progress.totalBytes,
                                            progress: progress.totalBytes > 0 ? (progress.receivedBytes / progress.totalBytes) * 100 : 0,
                                            speed: progress.speed
                                        }
                                        : d
                                )
                            }));
                        },
                        // onComplete
                        (id, savePath, filename) => {
                            const isArchive = ['.zip', '.rar', '.7z', '.tar', '.gz', '.xz', '.tgz'].some(ext => filename.toLowerCase().endsWith(ext));

                            const download = get().downloads.find(d => d.id === id);
                            if (!download) return;

                            if (isArchive) {
                                set(state => ({
                                    downloads: state.downloads.map(d => d.id === id ? { ...d, status: 'extracting', isExtracting: true, savePath } : d)
                                }));

                                let destPath = savePath.replace(/\.[^/.]+$/, "");
                                if (destPath.endsWith('.tar')) {
                                    destPath = destPath.substring(0, destPath.length - 4);
                                }

                                ElectronDownloader.extractFile(savePath, destPath)
                                    .then((result) => {
                                        const finalPath = result.actualPath || destPath;
                                        console.log('Auto-extraction successful', finalPath);
                                        onExtractionComplete({ ...download, savePath, filename }, finalPath);

                                        const { keepArchiveAfterExtraction } = useSettingsStore.getState();
                                        if (!keepArchiveAfterExtraction) {
                                            ElectronDownloader.deletePath(savePath);
                                        }

                                        set(state => ({
                                            downloads: state.downloads.map(d => d.id === id ? { ...d, status: 'completed', isExtracting: false, extractedPath: finalPath, progress: 100, endTime: new Date() } : d)
                                        }));
                                    })
                                    .catch(err => {
                                        console.error('Auto-extraction failed', err);
                                        // Clean up the failed extraction attempt
                                        ElectronDownloader.deletePath(destPath);
                                        set(state => ({
                                            downloads: state.downloads.map(d => d.id === id ? { ...d, status: 'failed', isExtracting: false, error: 'Extraction failed' } : d)
                                        }));
                                    });
                            } else {
                                onExtractionComplete({ ...download, savePath, filename }, savePath);
                                set(state => ({
                                    downloads: state.downloads.map(d => d.id === id ? { ...d, status: 'completed', extractedPath: savePath, progress: 100, endTime: new Date() } : d)
                                }));
                            }
                        },
                        // onError
                        (id, error) => {
                            set(state => ({
                                downloads: state.downloads.map(d => d.id === id ? { ...d, status: 'failed', error, speed: 0 } : d)
                            }));
                        }
                    );
                    return cleanup || (() => { /* no-op */ });
                },
                openDownloadLink: (url, metadata) => {
                    set({ pendingMetadata: metadata });

                    if (url.includes('storage.chanomhub.com') && sdk.config.token) {
                        const headers = { 'Authorization': `Bearer ${sdk.config.token}` };
                        ElectronDownloader.downloadFile(url, headers);
                    } else {
                        ElectronDownloader.openDownloadLink(url, null);
                    }
                },
                cancelDownload: (id) => {
                    ElectronDownloader.cancelDownload(id);
                    set(state => ({
                        downloads: state.downloads.map(d => (d.id === id ? { ...d, status: 'cancelled', speed: 0 } : d))
                    }));
                },
                removeDownload: (id) => {
                    set(state => ({ downloads: state.downloads.filter(d => d.id !== id) }));
                },
                clearCompleted: () => {
                    set(state => ({ downloads: state.downloads.filter(d => d.status !== 'completed') }));
                },
                clearAll: () => {
                    get().downloads.forEach(d => {
                        if (d.status === 'downloading') {
                            ElectronDownloader.cancelDownload(d.id);
                        }
                    });
                    set({ downloads: [] });
                },
                showInFolder: (id) => {
                    const download = get().downloads.find(d => d.id === id);
                    if (download?.savePath) {
                        ElectronDownloader.showItemInFolder(download.savePath);
                    }
                },
                openFile: (id) => {
                    const download = get().downloads.find(d => d.id === id);
                    if (download) {
                        const path = download.extractedPath || download.savePath;
                        if (path) ElectronDownloader.openPath(path);
                    }
                },
                retryDownload: (id) => {
                    // This logic would need to re-trigger the download.
                    // For now, it's a placeholder.
                    console.log('Retrying download:', id);
                },
            }
        }),
        {
            name: 'chanox-downloads',
            storage: {
                getItem: async () => {
                    if (!window.electronAPI) return null;
                    const saved = await window.electronAPI.getDownloads();
                    const restored = saved
                        .map((d: any) => ({
                            ...d,
                            startTime: new Date(d.startTime),
                            endTime: d.endTime ? new Date(d.endTime) : undefined,
                            status: d.status === 'downloading' ? 'failed' : d.status,
                            error: d.status === 'downloading' ? 'Download interrupted' : d.error
                        }))
                        .filter((d: any) => d.status !== 'completed');

                    return { state: { downloads: restored } };
                },
                setItem: async (_name, value) => {
                    if (!window.electronAPI) return;
                    const toSave = value.state.downloads.filter((d: Download) => d.status !== 'completed');
                    await window.electronAPI.saveDownloads(toSave);
                },
                removeItem: async () => {
                    if (!window.electronAPI) return;
                    await window.electronAPI.saveDownloads([]);
                },
            },
        }
    )
);
