import { useState, useEffect, useCallback } from 'react';
import { Folder, File, FileCode, FileImage, FileAudio, FileVideo, ChevronRight, ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DirectoryEntry } from '@/types/electron';

interface GameFileBrowserProps {
    rootPath: string;
}

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getFileIcon = (name: string, isDirectory: boolean) => {
    if (isDirectory) return <Folder className="w-4 h-4 text-primary" />;

    const ext = name.split('.').pop()?.toLowerCase() || '';

    // Images
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(ext))
        return <FileImage className="w-4 h-4 text-amber-400" />;

    // Audio
    if (['mp3', 'ogg', 'wav', 'flac', 'aac', 'm4a', 'wma', 'mid', 'midi'].includes(ext))
        return <FileAudio className="w-4 h-4 text-amber-500" />;

    // Video
    if (['mp4', 'avi', 'mkv', 'webm', 'mov', 'wmv', 'ogv'].includes(ext))
        return <FileVideo className="w-4 h-4 text-rose-400" />;

    // Code / config
    if (['js', 'ts', 'json', 'xml', 'yml', 'yaml', 'ini', 'cfg', 'conf', 'toml', 'bat', 'sh', 'py', 'rb', 'lua', 'cs', 'cpp', 'h', 'java', 'html', 'css'].includes(ext))
        return <FileCode className="w-4 h-4 text-emerald-400" />;

    return <File className="w-4 h-4 text-muted-foreground" />;
};

export default function GameFileBrowser({ rootPath }: GameFileBrowserProps) {
    const [currentPath, setCurrentPath] = useState(rootPath);
    const [entries, setEntries] = useState<DirectoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDirectory = useCallback(async (dirPath: string) => {
        if (!window.electronAPI?.readDirectory) return;
        setLoading(true);
        setError(null);
        try {
            const result = await window.electronAPI.readDirectory(dirPath);
            if (result.success) {
                setEntries(result.entries);
                setCurrentPath(dirPath);
            } else {
                setError(result.error || 'Failed to read directory');
            }
        } catch (err) {
            setError('Failed to read directory');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDirectory(rootPath);
    }, [rootPath, loadDirectory]);

    // Build breadcrumb segments relative to rootPath
    const getBreadcrumbs = () => {
        const rootParts = rootPath.split('/').filter(Boolean);
        const currentParts = currentPath.split('/').filter(Boolean);

        const crumbs: { label: string; path: string }[] = [
            { label: rootParts[rootParts.length - 1] || 'Root', path: rootPath }
        ];

        for (let i = rootParts.length; i < currentParts.length; i++) {
            crumbs.push({
                label: currentParts[i],
                path: '/' + currentParts.slice(0, i + 1).join('/')
            });
        }

        return crumbs;
    };

    const isAtRoot = currentPath === rootPath;
    const breadcrumbs = getBreadcrumbs();

    const handleNavigateUp = () => {
        if (isAtRoot) return;
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        if (parentPath.length >= rootPath.length) {
            loadDirectory(parentPath);
        } else {
            loadDirectory(rootPath);
        }
    };

    const handleEntryClick = (entry: DirectoryEntry) => {
        if (entry.isDirectory) {
            loadDirectory(entry.path);
        } else {
            // Open file location in system file manager
            if (window.electronAPI?.showItemInFolder) {
                window.electronAPI.showItemInFolder(entry.path);
            }
        }
    };

    return (
        <div className="bg-card border border-border/60 rounded-md overflow-hidden">
            {/* Breadcrumb Header */}
            <div className="flex items-center gap-1 px-4 py-3 bg-muted/40 border-b border-border/60 text-sm overflow-x-auto">
                {!isAtRoot && (
                    <button
                        onClick={handleNavigateUp}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-1 flex-shrink-0"
                        title="Go up"
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                )}
                {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.path} className="flex items-center gap-1 flex-shrink-0">
                        {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        <button
                            onClick={() => loadDirectory(crumb.path)}
                            className={cn(
                                "px-1 py-0.5 rounded hover:bg-muted transition-colors",
                                index === breadcrumbs.length - 1
                                    ? "text-foreground font-semibold"
                                    : "text-primary hover:underline font-medium"
                            )}
                        >
                            {crumb.label}
                        </button>
                    </div>
                ))}
            </div>

            {/* File List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="flex items-center justify-center py-12 text-destructive text-sm">
                    {error}
                </div>
            ) : entries.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    Empty directory
                </div>
            ) : (
                <div className="divide-y divide-border/40">
                    {entries.map((entry) => (
                        <button
                            key={entry.path}
                            onClick={() => handleEntryClick(entry)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/40 transition-colors text-left group"
                        >
                            {getFileIcon(entry.name, entry.isDirectory)}
                            <span className={cn(
                                "flex-1 text-sm truncate",
                                entry.isDirectory
                                    ? "text-primary group-hover:underline font-medium"
                                    : "text-foreground"
                            )}>
                                {entry.name}
                            </span>
                            {!entry.isDirectory && entry.size > 0 && (
                                <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                                    {formatFileSize(entry.size)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
