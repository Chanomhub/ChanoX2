import { useState, useEffect, useRef } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { LibraryItem } from '@/types/libraryItem';
import { client } from '@/libs/api/client';
import { GET_OFFICIAL_DOWNLOAD_SOURCES, GET_ARTICLE } from '@/libs/api/queries';
import { OfficialDownloadSource, OfficialDownloadSourcesResponse, ArticleResponse } from '@/types/graphql';
import HtmlRenderer from '@/components/common/HtmlRenderer';
import { useLanguage } from '@/contexts/LanguageContext';
import GameLaunchDialog, { GameLaunchConfig } from './GameLaunchDialog';
import { useGameLauncher } from '@/hooks/useGameLauncher';
import { useGameScanner } from '@/hooks/useGameScanner';
import { Button } from '@/components/ui/Button';
import {
    Play,
    Square,
    Settings,
    Info,
    Star,
    Loader2,
    RotateCcw,
    Trash2,
    Archive,
    ArrowLeft,
    ExternalLink,
    ChevronRight,
    Code,
    RefreshCw,
    Link,
    Link2Off
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { SafeImage } from '@/components/common/SafeImage';

const formatPlayTime = (seconds?: number) => {
    if (!seconds) return "0.0 hrs";
    const hours = seconds / 3600;
    return `${hours.toFixed(1)} hrs`;
};

const formatLastPlayed = (date?: Date) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString();
};

interface LibraryGameDetailProps {
    libraryItem: LibraryItem;
    onBack: () => void;
    autoLaunch?: boolean;
    onAutoLaunchComplete?: () => void;
}

export default function LibraryGameDetail({ libraryItem, onBack, autoLaunch, onAutoLaunchComplete }: LibraryGameDetailProps) {
    const { toggleFavorite, reExtractGame, deleteArchive, archiveExists, removeFromLibrary, updateLibraryItem } = useLibrary();
    const { language } = useLanguage();

    const [launchDialogVisible, setLaunchDialogVisible] = useState(false);
    const [hasArchive, setHasArchive] = useState(false);
    const [officialSources, setOfficialSources] = useState<OfficialDownloadSource[]>([]);
    const [loadingOfficialSources, setLoadingOfficialSources] = useState(false);
    const [devMode, setDevMode] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [hasShortcut, setHasShortcut] = useState(false);
    const [shortcutLoading, setShortcutLoading] = useState(false);

    // Custom Hooks
    const { config, launchGame, saveConfig, loadConfig, isRunning, stopGame } = useGameLauncher(libraryItem.id);
    const { scanDirectory, results: scanResults } = useGameScanner();

    // Refresh config for dev mode
    const handleRefreshConfig = async () => {
        await loadConfig();
        setRefreshKey(prev => prev + 1);
    };

    // Check if archive exists on mount
    useEffect(() => {
        const checkArchive = async () => {
            const exists = await archiveExists(libraryItem.id);
            setHasArchive(exists);
        };
        checkArchive();
    }, [libraryItem.id, archiveExists, libraryItem.archivePath]);

    // Check if shortcut exists on mount
    useEffect(() => {
        const checkShortcut = async () => {
            if (window.electronAPI?.hasGameShortcut) {
                const exists = await window.electronAPI.hasGameShortcut(
                    String(libraryItem.id),
                    libraryItem.title
                );
                setHasShortcut(exists);
            }
        };
        checkShortcut();
    }, [libraryItem.id, libraryItem.title]);

    // Fetch official download sources if articleId is available
    useEffect(() => {
        const fetchOfficialSources = async () => {
            if (!libraryItem.articleId) return;

            setLoadingOfficialSources(true);
            try {
                const data = await client.request<OfficialDownloadSourcesResponse>(
                    GET_OFFICIAL_DOWNLOAD_SOURCES,
                    { articleId: Number(libraryItem.articleId) }
                );
                setOfficialSources(data.officialDownloadSources);
            } catch (err) {
                console.error('Error fetching official sources:', err);
            } finally {
                setLoadingOfficialSources(false);
            }
        };
        fetchOfficialSources();
    }, [libraryItem.articleId]);

    // Fetch missing article content (description/body)
    useEffect(() => {
        const fetchContent = async () => {
            // Only fetch if we have an ID but missing content
            if (libraryItem.articleId && (!libraryItem.description && !libraryItem.body)) {
                try {
                    const data = await client.request<ArticleResponse>(GET_ARTICLE, {
                        id: Number(libraryItem.articleId),
                        language
                    });
                    if (data.article) {
                        console.log('Fetched missing article content for library item:', libraryItem.title);
                        updateLibraryItem(libraryItem.id, {
                            description: data.article.description,
                            body: data.article.body
                        });
                    }
                } catch (err) {
                    console.error('Failed to fetch missing article content:', err);
                }
            }
        };
        fetchContent();
    }, [libraryItem.articleId, libraryItem.description, libraryItem.body, libraryItem.id, language, updateLibraryItem]);

    // Auto-launch effect when triggered from shortcut
    const autoLaunchTriggered = useRef(false);
    useEffect(() => {
        if (autoLaunch && config?.executablePath && !isRunning && !autoLaunchTriggered.current) {
            autoLaunchTriggered.current = true;
            console.log('🚀 Auto-launching game from shortcut...');

            // Small delay to ensure UI is ready
            const timer = setTimeout(async () => {
                updateLibraryItem(libraryItem.id, { lastPlayedAt: new Date() });
                const result = await launchGame();
                if (!result.success) {
                    alert(`Launch Failed: ${result.error || 'Unknown error'}`);
                }
                onAutoLaunchComplete?.();
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [autoLaunch, config?.executablePath, isRunning, libraryItem.id, launchGame, updateLibraryItem, onAutoLaunchComplete]);

    // Reset auto-launch trigger when component unmounts or game changes
    useEffect(() => {
        autoLaunchTriggered.current = false;
    }, [libraryItem.id]);

    const handlePlayPress = async () => {
        if (libraryItem.isReExtracting) return;

        if (config?.executablePath) {
            // Update last played
            updateLibraryItem(libraryItem.id, { lastPlayedAt: new Date() });
            const result = await launchGame();
            if (!result.success) {
                alert(`Launch Failed: ${result.error || 'Unknown error'}`);
            }
        } else {
            handleOpenLaunchOptions();
        }
    };

    const handleStopGame = async () => {
        const confirmed = window.confirm('หยุดเกม?\\n\\nเกมจะถูกปิดและบันทึกเวลาเล่น');
        if (confirmed) {
            const result = await stopGame();
            if (!result.success) {
                alert(`Stop Failed: ${result.error || 'Unknown error'}`);
            }
        }
    };

    const handleOpenLaunchOptions = async () => {
        if (libraryItem.isReExtracting) return;

        const pathToCheck = libraryItem.extractedPath;
        if (!pathToCheck) {
            alert('Error: Game path not found.');
            return;
        }

        const results = await scanDirectory(pathToCheck);

        if (results.length === 0) {
            alert('No Executables Found: Could not find any executable files in the game directory.');
            return;
        }

        setLaunchDialogVisible(true);
    };

    const handleSaveAndPlay = async (newConfig: GameLaunchConfig) => {
        setLaunchDialogVisible(false);
        const success = await saveConfig(newConfig as any);
        if (success) {
            updateLibraryItem(libraryItem.id, { lastPlayedAt: new Date() });
            const result = await launchGame(newConfig as any);
            if (!result.success) {
                alert(`Launch Failed: ${result.error || 'Unknown error'}`);
            }
        }
    };

    const handleReExtract = async () => {
        if (!hasArchive) {
            alert('Archive not available. Cannot re-extract.');
            return;
        }
        await reExtractGame(libraryItem.id);
    };

    const handleDeleteArchive = async () => {
        const confirmed = window.confirm(
            '⚠️ คำเตือน: หากลบไฟล์ Archive แล้ว คุณจะไม่สามารถแตกไฟล์ใหม่ได้หากเกมมีปัญหา\n\nต้องการลบไฟล์ Archive หรือไม่?'
        );
        if (confirmed) {
            const success = await deleteArchive(libraryItem.id);
            if (success) {
                setHasArchive(false);
            }
        }
    };

    const handleRemoveFromLibrary = async () => {
        const confirmed = window.confirm(
            '⚠️ ลบเกมออกจากคลัง?\n\nจะลบทั้งโฟลเดอร์เกมและไฟล์ Archive (ถ้ามี)'
        );
        if (confirmed) {
            await removeFromLibrary(libraryItem.id);
            onBack();
        }
    };

    const handleCreateShortcut = async () => {
        if (!window.electronAPI?.createGameShortcut) return;

        setShortcutLoading(true);
        try {
            const result = await window.electronAPI.createGameShortcut(
                String(libraryItem.id),
                libraryItem.title,
                libraryItem.coverImage
            );
            if (result.success) {
                setHasShortcut(true);
            } else {
                alert(`Failed to create shortcut: ${result.error}`);
            }
        } catch (err) {
            console.error('Error creating shortcut:', err);
            alert('Failed to create shortcut');
        } finally {
            setShortcutLoading(false);
        }
    };

    const handleDeleteShortcut = async () => {
        if (!window.electronAPI?.deleteGameShortcut) return;

        setShortcutLoading(true);
        try {
            const result = await window.electronAPI.deleteGameShortcut(
                String(libraryItem.id),
                libraryItem.title
            );
            if (result.success) {
                setHasShortcut(false);
            } else {
                alert(`Failed to delete shortcut: ${result.error}`);
            }
        } catch (err) {
            console.error('Error deleting shortcut:', err);
            alert('Failed to delete shortcut');
        } finally {
            setShortcutLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#1b2838] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a475e] scrollbar-track-[#1b2838]">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="absolute top-4 left-4 z-10 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
                <ArrowLeft className="w-5 h-5 text-white" />
            </button>

            {/* Hero Section */}
            <div className="relative h-[300px] w-full flex-shrink-0">
                {libraryItem.coverImage ? (
                    <SafeImage
                        src={libraryItem.coverImage}
                        className="w-full h-full object-cover opacity-80"
                        alt={libraryItem.title}
                    />
                ) : (
                    <div className="w-full h-full bg-[#1b2838]" />
                )}
                <div className="absolute inset-x-0 bottom-0 h-[150px] bg-gradient-to-t from-[#1b2838] to-transparent pointer-events-none" />

                <div className="absolute bottom-5 left-8 space-y-2">
                    <h1 className="text-white text-4xl font-bold drop-shadow-md">
                        {libraryItem.title}
                    </h1>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center px-8 pb-6 bg-[#1b2838] gap-8">
                {isRunning ? (
                    <Button
                        className="px-8 py-6 text-base font-bold tracking-wider rounded-sm transition-colors bg-[#f85149] hover:bg-[#da3633] text-white"
                        onClick={handleStopGame}
                    >
                        <Square className="w-5 h-5 mr-2 fill-white" />
                        STOP
                    </Button>
                ) : (
                    <Button
                        className={cn(
                            "px-8 py-6 text-base font-bold tracking-wider rounded-sm transition-colors",
                            libraryItem.isReExtracting
                                ? "bg-[#3d4450] text-[#8b929a] cursor-not-allowed hover:bg-[#3d4450]"
                                : "bg-[#4cff00] hover:bg-[#3de000] text-black"
                        )}
                        onClick={handlePlayPress}
                        disabled={libraryItem.isReExtracting}
                    >
                        {libraryItem.isReExtracting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                RE-EXTRACTING...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5 mr-2 fill-black" />
                                PLAY
                            </>
                        )}
                    </Button>
                )}

                <div className="flex gap-8 mr-auto">
                    <div className="flex flex-col">
                        <span className="text-[#6e7681] text-[10px] font-bold mb-0.5">LAST PLAYED</span>
                        <span className="text-[#dcdedf] text-xs font-medium">{formatLastPlayed(libraryItem.lastPlayedAt)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[#6e7681] text-[10px] font-bold mb-0.5">PLAY TIME</span>
                        <span className="text-[#dcdedf] text-xs font-medium">{formatPlayTime(config?.playTime)}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => handleOpenLaunchOptions()} className="p-2 bg-[#2a3f55] rounded hover:bg-[#3d5a73] text-[#66c0f4]">
                        <Settings className="w-5 h-5" />
                    </button>
                    <button className="p-2 bg-[#2a3f55] rounded hover:bg-[#3d5a73] text-[#66c0f4]">
                        <Info className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => toggleFavorite(libraryItem.id)}
                        className={cn(
                            "p-2 bg-[#2a3f55] rounded hover:bg-[#3d5a73] transition-colors",
                            libraryItem.isFavorite ? "text-yellow-400" : "text-[#66c0f4]"
                        )}
                    >
                        <Star className={cn("w-5 h-5", libraryItem.isFavorite && "fill-current")} />
                    </button>
                </div>
            </div>

            {/* Navbar */}
            <div className="flex px-8 py-3 bg-[#181d26] gap-8 border-b border-[#2a2e36] mb-6">
                <button className="text-white text-sm font-bold border-b-2 border-[#66c0f4] pb-1 -mb-4 z-10">Overview</button>
                <button className="text-[#8b929a] text-sm font-medium hover:text-white transition-colors">Files</button>
                <button
                    onClick={() => setDevMode(!devMode)}
                    className={cn(
                        "ml-auto flex items-center gap-1 text-xs font-medium transition-colors",
                        devMode ? "text-[#4cff00]" : "text-[#6e7681] hover:text-[#8b929a]"
                    )}
                >
                    <Code className="w-3 h-3" />
                    Dev
                </button>
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-col md:flex-row px-8 gap-8 pb-12">

                {/* Left Column (Main Feed) */}
                <div className="flex-1 space-y-6">
                    {/* Dev Mode Panel OR Article Content */}
                    {devMode ? (
                        <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-sm" key={refreshKey}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[#4cff00] text-xs font-bold uppercase flex items-center gap-2">
                                    <Code className="w-3 h-3" />
                                    Developer Info
                                </h3>
                                <button
                                    onClick={handleRefreshConfig}
                                    className="flex items-center gap-1 text-xs text-[#8b929a] hover:text-[#4cff00] transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Refresh
                                </button>
                            </div>

                            <div className="space-y-4 font-mono text-xs">
                                {/* Playtime Tracking */}
                                <div className="space-y-2">
                                    <h4 className="text-[#58a6ff] font-bold">⏱️ Playtime Tracking</h4>
                                    <div className="bg-black/40 p-2 rounded space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">isRunning:</span>
                                            <span className={cn(
                                                "font-bold",
                                                isRunning ? "text-[#4cff00]" : "text-[#6e7681]"
                                            )}>
                                                {isRunning ? '🟢 RUNNING' : '⚫ STOPPED'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">playTime (raw):</span>
                                            <span className="text-[#f0883e]">{config?.playTime ?? 'null'} seconds</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">playTime (formatted):</span>
                                            <span className="text-[#dcdedf]">{formatPlayTime(config?.playTime)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">lastPlayed:</span>
                                            <span className="text-[#dcdedf]">{config?.lastPlayed ?? 'Never'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Game Config */}
                                <div className="space-y-2">
                                    <h4 className="text-[#58a6ff] font-bold">⚙️ Game Config</h4>
                                    <div className="bg-black/40 p-2 rounded space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">gameId:</span>
                                            <span className="text-[#dcdedf]">{libraryItem.id}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[#6e7681]">executablePath:</span>
                                            <span className="text-[#dcdedf] break-all text-[10px] mt-1">{config?.executablePath ?? 'Not set'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">useWine:</span>
                                            <span className={cn(config?.useWine ? "text-[#4cff00]" : "text-[#f85149]")}>
                                                {config?.useWine ? 'true' : 'false'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">args:</span>
                                            <span className="text-[#dcdedf]">{config?.args?.length ? config.args.join(' ') : '[]'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">locale:</span>
                                            <span className="text-[#dcdedf]">{config?.locale ?? 'default'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Library Item */}
                                <div className="space-y-2">
                                    <h4 className="text-[#58a6ff] font-bold">📚 Library Item</h4>
                                    <div className="bg-black/40 p-2 rounded space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">id:</span>
                                            <span className="text-[#dcdedf]">{libraryItem.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">articleId:</span>
                                            <span className="text-[#dcdedf]">{libraryItem.articleId ?? 'null'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">lastPlayedAt:</span>
                                            <span className="text-[#dcdedf]">{libraryItem.lastPlayedAt?.toISOString() ?? 'null'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#6e7681]">addedAt:</span>
                                            <span className="text-[#dcdedf]">{libraryItem.addedAt?.toISOString() ?? 'null'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Raw Config JSON */}
                                <div className="space-y-2">
                                    <h4 className="text-[#58a6ff] font-bold">📄 Raw Config JSON</h4>
                                    <pre className="bg-black/40 p-2 rounded text-[10px] text-[#8b949e] overflow-x-auto max-h-[150px]">
                                        {JSON.stringify(config, null, 2) || 'null'}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        (libraryItem.description || libraryItem.body) && (
                            <div className="bg-black/20 p-6 rounded-sm">
                                <h2 className="text-[#dcdedf] text-lg font-normal mb-4 border-b border-[#2a475e] pb-2 uppercase tracking-wider">About This Game</h2>
                                <div className="text-[#acb2b8] text-sm leading-6 space-y-4">
                                    {libraryItem.body ? (
                                        <HtmlRenderer html={libraryItem.body} />
                                    ) : (
                                        <p>{libraryItem.description}</p>
                                    )}
                                </div>
                            </div>
                        )
                    )}

                    {/* Game Path Info */}
                    <div className="bg-black/20 p-4 rounded-sm">
                        <h3 className="text-[#8b929a] text-xs font-bold uppercase mb-3">Installation</h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[#6e7681]">Game Folder:</span>
                                <span className="text-[#dcdedf] truncate max-w-[300px]" title={libraryItem.extractedPath}>
                                    {libraryItem.extractedPath}
                                </span>
                            </div>
                            {libraryItem.archivePath && (
                                <div className="flex justify-between">
                                    <span className="text-[#6e7681]">Archive:</span>
                                    <span className={cn(
                                        "truncate max-w-[300px]",
                                        hasArchive ? "text-[#dcdedf]" : "text-[#8b929a] line-through"
                                    )} title={libraryItem.archivePath}>
                                        {libraryItem.archivePath}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (Sidebar Info) */}
                <div className="w-full md:w-[300px] flex-shrink-0 space-y-6">

                    {/* Game Info */}
                    {(libraryItem.engine || libraryItem.gameVersion) && (
                        <div className="bg-black/20 p-4 rounded-sm space-y-3">
                            <h3 className="text-[#8b929a] text-xs font-bold uppercase mb-2">Game Info</h3>
                            {libraryItem.engine && (
                                <Badge
                                    label="ENGINE"
                                    value={libraryItem.engine}
                                    className="w-full justify-between"
                                />
                            )}
                            {libraryItem.gameVersion && (
                                <Badge
                                    label="VERSION"
                                    value={libraryItem.gameVersion}
                                    className="w-full justify-between"
                                />
                            )}
                        </div>
                    )}

                    {/* Official Sources */}
                    {loadingOfficialSources ? (
                        <div className="bg-black/20 p-4 rounded-sm">
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-[#66c0f4]" />
                            </div>
                        </div>
                    ) : officialSources.length > 0 && (
                        <div className="bg-black/20 p-4 rounded-sm space-y-3">
                            <h3 className="text-[#8b929a] text-xs font-bold uppercase mb-2">Official Links</h3>
                            {officialSources.map((source) => (
                                <a
                                    key={source.id}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (window.electronAPI) {
                                            window.electronAPI.openExternal(source.url);
                                        } else {
                                            window.open(source.url, '_blank');
                                        }
                                    }}
                                    className="flex items-center justify-between gap-2 px-3 py-2 rounded text-sm font-medium bg-[#101822] hover:bg-[#1a2634] border border-[#2a475e] hover:border-[#66c0f4] transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        <ExternalLink className="w-4 h-4 text-[#66c0f4]" />
                                        <span className="text-[#dcdedf] group-hover:text-white">{source.name}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-[#4b5563] group-hover:text-white" />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="bg-black/20 p-4 rounded-sm space-y-3">
                        <h3 className="text-[#8b929a] text-xs font-bold uppercase mb-2">Actions</h3>

                        {/* Re-extract Button */}
                        <button
                            onClick={handleReExtract}
                            disabled={!hasArchive || libraryItem.isReExtracting}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
                                hasArchive && !libraryItem.isReExtracting
                                    ? "bg-[#2a3f55] hover:bg-[#3d5a73] text-[#66c0f4]"
                                    : "bg-[#2a2e36] text-[#6e7681] cursor-not-allowed"
                            )}
                        >
                            <RotateCcw className="w-4 h-4" />
                            Re-extract from Archive
                        </button>

                        {/* Delete Archive Button */}
                        {hasArchive && (
                            <button
                                onClick={handleDeleteArchive}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium bg-[#2a2e36] hover:bg-[#3d2e2e] text-[#f38181] transition-colors"
                            >
                                <Archive className="w-4 h-4" />
                                Delete Archive (Free Space)
                            </button>
                        )}

                        {/* Remove from Library */}
                        <button
                            onClick={handleRemoveFromLibrary}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium bg-[#2a2e36] hover:bg-[#3d2e2e] text-[#f38181] transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Remove from Library
                        </button>

                        {/* Desktop Shortcut */}
                        <button
                            onClick={hasShortcut ? handleDeleteShortcut : handleCreateShortcut}
                            disabled={shortcutLoading}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
                                shortcutLoading
                                    ? "bg-[#2a2e36] text-[#6e7681] cursor-not-allowed"
                                    : hasShortcut
                                        ? "bg-[#2a3f55] hover:bg-[#3d2e2e] text-[#f38181]"
                                        : "bg-[#2a3f55] hover:bg-[#3d5a73] text-[#66c0f4]"
                            )}
                        >
                            {shortcutLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : hasShortcut ? (
                                <Link2Off className="w-4 h-4" />
                            ) : (
                                <Link className="w-4 h-4" />
                            )}
                            {shortcutLoading
                                ? 'Processing...'
                                : hasShortcut
                                    ? 'Remove Desktop Shortcut'
                                    : 'Create Desktop Shortcut'
                            }
                        </button>
                    </div>

                </div>
            </div>

            <GameLaunchDialog
                open={launchDialogVisible}
                onOpenChange={setLaunchDialogVisible}
                onSaveAndPlay={handleSaveAndPlay}
                initialConfig={config as GameLaunchConfig}
                scanResults={scanResults}
                gameTitle={libraryItem.title}
                defaultEngine={libraryItem.engine}
                defaultVersion={libraryItem.gameVersion}
            />
        </div>
    );
}
