import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { LibraryItem } from '@/types/libraryItem';
import { ElectronDownloader } from '@/lib/electronDownloader';

interface LibraryContextType {
    libraryItems: LibraryItem[];
    addToLibrary: (item: Omit<LibraryItem, 'id' | 'addedAt'>) => Promise<void>;
    removeFromLibrary: (id: number) => Promise<void>;
    updateLibraryItem: (id: number, updates: Partial<LibraryItem>) => void;
    reExtractGame: (id: number) => Promise<void>;
    toggleFavorite: (id: number) => void;
    deleteArchive: (id: number) => Promise<boolean>;
    archiveExists: (id: number) => Promise<boolean>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const isLoadedRef = useRef(false);

    // Load library from storage on mount
    useEffect(() => {
        const loadLibrary = async () => {
            try {
                if (window.electronAPI) {
                    const saved = await window.electronAPI.getLibrary();
                    if (saved && Array.isArray(saved)) {
                        // Restore dates
                        const restored = saved.map((item: any) => ({
                            ...item,
                            addedAt: new Date(item.addedAt),
                            lastPlayedAt: item.lastPlayedAt ? new Date(item.lastPlayedAt) : undefined,
                        }));
                        setLibraryItems(restored as LibraryItem[]);
                    }
                }
            } catch (err) {
                console.error('Failed to load library:', err);
            } finally {
                isLoadedRef.current = true;
            }
        };
        loadLibrary();
    }, []);

    // Persist library whenever it changes
    useEffect(() => {
        if (isLoadedRef.current && window.electronAPI) {
            window.electronAPI.saveLibrary(libraryItems);
        }
    }, [libraryItems]);

    const addToLibrary = async (item: Omit<LibraryItem, 'id' | 'addedAt'>) => {
        const newItem: LibraryItem = {
            ...item,
            id: Date.now(),
            addedAt: new Date(),
        };

        // Download cover image for offline support
        if (item.coverImage && window.electronAPI?.downloadCoverImage) {
            try {
                const result = await window.electronAPI.downloadCoverImage(newItem.id, item.coverImage);
                if (result.success && result.localPath) {
                    newItem.localCoverImage = result.localPath;
                    console.log('✅ Cover image cached for offline:', result.localPath);
                }
            } catch (err) {
                console.warn('⚠️ Failed to cache cover image:', err);
            }
        }

        setLibraryItems(prev => {
            // Avoid duplicates based on extractedPath
            if (prev.some(i => i.extractedPath === item.extractedPath)) {
                return prev;
            }
            return [newItem, ...prev];
        });
    };

    const removeFromLibrary = async (id: number) => {
        const item = libraryItems.find(i => i.id === id);
        if (!item) return;

        // Optionally delete game folder
        if (item.extractedPath && window.electronAPI) {
            try {
                await window.electronAPI.deleteGameFolder(item.extractedPath);
            } catch (err) {
                console.error('Failed to delete game folder:', err);
            }
        }

        // Also delete archive if present
        if (item.archivePath && window.electronAPI) {
            try {
                await window.electronAPI.deleteArchive(item.archivePath);
            } catch (err) {
                console.error('Failed to delete archive:', err);
            }
        }

        setLibraryItems(prev => prev.filter(i => i.id !== id));
    };

    const updateLibraryItem = (id: number, updates: Partial<LibraryItem>) => {
        setLibraryItems(prev =>
            prev.map(item => (item.id === id ? { ...item, ...updates } : item))
        );
    };

    const reExtractGame = async (id: number) => {
        const item = libraryItems.find(i => i.id === id);
        if (!item || !item.archivePath) {
            console.error('No archive available for re-extraction');
            return;
        }

        // Check if archive exists
        if (window.electronAPI) {
            const exists = await window.electronAPI.fileExists(item.archivePath);
            if (!exists) {
                alert('Archive file not found. Cannot re-extract.');
                return;
            }
        }

        // Mark as extracting
        updateLibraryItem(id, { isReExtracting: true });

        try {
            await ElectronDownloader.extractFile(item.archivePath, item.extractedPath);
            updateLibraryItem(id, { isReExtracting: false });
        } catch (err) {
            console.error('Re-extraction failed:', err);
            updateLibraryItem(id, { isReExtracting: false });
            alert('Re-extraction failed. Please try again.');
        }
    };

    const toggleFavorite = (id: number) => {
        setLibraryItems(prev =>
            prev.map(item =>
                item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
            )
        );
    };

    const deleteArchive = async (id: number): Promise<boolean> => {
        const item = libraryItems.find(i => i.id === id);
        if (!item || !item.archivePath) return false;

        if (window.electronAPI) {
            const result = await window.electronAPI.deleteArchive(item.archivePath);
            if (result.success) {
                // Clear archivePath from item
                updateLibraryItem(id, { archivePath: undefined });
                return true;
            }
        }
        return false;
    };

    const archiveExists = async (id: number): Promise<boolean> => {
        const item = libraryItems.find(i => i.id === id);
        if (!item || !item.archivePath) return false;

        if (window.electronAPI) {
            return await window.electronAPI.fileExists(item.archivePath);
        }
        return false;
    };

    return (
        <LibraryContext.Provider
            value={{
                libraryItems,
                addToLibrary,
                removeFromLibrary,
                updateLibraryItem,
                reExtractGame,
                toggleFavorite,
                deleteArchive,
                archiveExists,
            }}
        >
            {children}
        </LibraryContext.Provider>
    );
}

export function useLibrary() {
    const context = useContext(LibraryContext);
    if (context === undefined) {
        throw new Error('useLibrary must be used within a LibraryProvider');
    }
    return context;
}
