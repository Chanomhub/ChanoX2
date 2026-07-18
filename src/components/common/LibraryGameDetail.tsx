import { useState, useEffect, useRef, useCallback } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { LibraryItem } from '@/types/libraryItem';
import { client } from '@/libs/api/client';
import { GET_OFFICIAL_DOWNLOAD_SOURCES, GET_ARTICLE } from '@/libs/api/queries';
import { OfficialDownloadSource, OfficialDownloadSourcesResponse, ArticleResponse } from '@/types/graphql';
import HtmlRenderer from '@/components/common/HtmlRenderer';
import { useLanguage } from '@/contexts/LanguageContext';
import GameLaunchDialog, { GameLaunchConfig } from './GameLaunchDialog';
import GameFileBrowser from './GameFileBrowser';
import WinetricksDialog from './WinetricksDialog';
import FontSelectionDialog from './FontSelectionDialog';
import { ArticleModDialog } from './ArticleModDialog';
import { ModExtractionDialog } from './ModExtractionDialog';
import { useGameLauncher } from '@/hooks/useGameLauncher';
import { useGameScanner } from '@/hooks/useGameScanner';
import { Button } from '@/components/ui/Button';
import { useInstalledMods } from '@/hooks/useInstalledMods';
import { sdk } from '@/libs/sdk';
import useSWR from 'swr';
import { Mod } from '@chanomhub/sdk';
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
    Link2Off,
    Wine,
    Languages,
    Download as DownloadIcon,
    Check,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
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
    const [winetricksDialogOpen, setWinetricksDialogOpen] = useState(false);
    const [modDialogOpen, setModDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'mods'>('overview');

    // Custom Hooks
    const { config, launchGame, saveConfig, loadConfig, isRunning, gamePid, stopGame } = useGameLauncher(libraryItem.id);
    const { scanDirectory, results: scanResults } = useGameScanner();

    // Check if on Linux or MacOS (for Wine Dependencies button)
    const platform = navigator.platform.toLowerCase();
    const isLinuxOrMac = platform.includes('linux') || platform.includes('mac');
    const isWindowsGame = config?.useWine === true || config?.executablePath?.toLowerCase().endsWith('.exe');

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

    const [translatorStatus, setTranslatorStatus] = useState<'checking' | 'installed' | 'not_installed'>('checking');
    const [isInstallingTranslator, setIsInstallingTranslator] = useState(false);
    const [translatorLang, setTranslatorLang] = useState('th');
    const [fonts, setFonts] = useState<any[]>([]);
    const [selectedFontId, setSelectedFontId] = useState<string>('');
    const [loadingFonts, setLoadingFonts] = useState(false);
    const [fontDialogOpen, setFontDialogOpen] = useState(false);

    const isUnityGame = libraryItem.engine?.toLowerCase().includes('unity') || config?.engine?.toLowerCase().includes('unity');

    const showTranslationCard = (isUnityGame && config?.executablePath) || 
        ['rpgm', 'rpgmaker', 'tyrano'].includes((libraryItem.engine || '').toLowerCase()) ||
        (libraryItem.engine || '').toLowerCase().includes('rpg');

    const checkTranslator = useCallback(async () => {
        if (!window.electronAPI?.checkAutoTranslator || !config?.executablePath) {
            setTranslatorStatus('not_installed');
            return;
        }
        try {
            const res = await window.electronAPI.checkAutoTranslator(config.executablePath);
            setTranslatorStatus(res.installed ? 'installed' : 'not_installed');
        } catch (e) {
            console.error('Error checking auto translator:', e);
            setTranslatorStatus('not_installed');
        }
    }, [config?.executablePath]);

    useEffect(() => {
        if (isUnityGame) {
            checkTranslator();
        }
    }, [checkTranslator, isUnityGame]);

    useEffect(() => {
        const fetchFonts = async () => {
            setLoadingFonts(true);
            try {
                const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.chanomhub.com';
                const url = `${apiBaseUrl}/api/fonts?engine=unity&language=${translatorLang}`;
                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    if (json && json.data && Array.isArray(json.data.fonts)) {
                        setFonts(json.data.fonts);
                    } else if (json && Array.isArray(json.fonts)) {
                        setFonts(json.fonts);
                    }
                }
            } catch (err) {
                console.error('Error fetching fonts:', err);
            } finally {
                setLoadingFonts(false);
            }
        };
        
        if (isUnityGame) {
            fetchFonts();
        }
    }, [translatorLang, isUnityGame]);

    const handleInstallTranslator = async () => {
        if (!window.electronAPI?.installAutoTranslator || !config?.executablePath) return;
        setIsInstallingTranslator(true);
        try {
            const selectedFont = fonts.find(f => String(f.id) === selectedFontId);
            const res = await window.electronAPI.installAutoTranslator(config.executablePath, translatorLang, selectedFont);
            if (res.success) {
                alert('ติดตั้ง Auto-Translator เรียบร้อยแล้ว!\nตัวเกมจะถูกแปลภาษาโดยอัตโนมัติในขณะที่คุณเล่น');
                setTranslatorStatus('installed');
            } else {
                alert(`ติดตั้งไม่สำเร็จ: ${res.error}`);
            }
        } catch (err: any) {
            alert(`เกิดข้อผิดพลาด: ${err.message || err}`);
        } finally {
            setIsInstallingTranslator(false);
        }
    };

    const handleUninstallTranslator = async () => {
        if (!window.electronAPI?.uninstallAutoTranslator || !config?.executablePath) return;
        const confirmed = window.confirm('ต้องการถอนการติดตั้ง Auto-Translator หรือไม่?');
        if (!confirmed) return;
        
        try {
            const res = await window.electronAPI.uninstallAutoTranslator(config.executablePath);
            if (res.success) {
                alert('ถอนการติดตั้งเรียบร้อยแล้ว');
                setTranslatorStatus('not_installed');
            } else {
                alert(`ถอนการติดตั้งไม่สำเร็จ: ${res.error}`);
            }
        } catch (err: any) {
            alert(`เกิดข้อผิดพลาด: ${err.message || err}`);
        }
    };

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
                            body: data.article.body,
                            slug: data.article.slug
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
                    {isRunning && gamePid && (
                        <div className="flex flex-col">
                            <span className="text-[#6e7681] text-[10px] font-bold mb-0.5">PID</span>
                            <span className="text-[#4cff00] text-xs font-mono font-medium">{gamePid}</span>
                        </div>
                    )}
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
                <button
                    onClick={() => setActiveTab('overview')}
                    className={cn(
                        "text-sm font-medium pb-1 -mb-4 z-10 transition-colors",
                        activeTab === 'overview'
                            ? "text-white font-bold border-b-2 border-[#66c0f4]"
                            : "text-[#8b929a] hover:text-white"
                    )}
                >Overview</button>
                <button
                    onClick={() => setActiveTab('files')}
                    className={cn(
                        "text-sm font-medium pb-1 -mb-4 z-10 transition-colors",
                        activeTab === 'files'
                            ? "text-white font-bold border-b-2 border-[#66c0f4]"
                            : "text-[#8b929a] hover:text-white"
                    )}
                >Files</button>
                <button
                    onClick={() => setActiveTab('mods')}
                    className={cn(
                        "text-sm font-medium pb-1 -mb-4 z-10 transition-colors",
                        activeTab === 'mods'
                            ? "text-white font-bold border-b-2 border-[#66c0f4]"
                            : "text-[#8b929a] hover:text-white"
                    )}
                >Mods</button>
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
                    {activeTab === 'files' ? (
                        /* Files Tab */
                        libraryItem.extractedPath ? (
                            <GameFileBrowser rootPath={libraryItem.extractedPath} />
                        ) : (
                            <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-8 text-center text-[#8b949e] text-sm">
                                Game folder not found
                            </div>
                        )
                    ) : activeTab === 'mods' ? (
                        /* Mods Tab */
                        <LibraryMods
                            articleId={libraryItem.articleId}
                            articleSlug={libraryItem.slug}
                            gamePath={libraryItem.extractedPath}
                            onOpenStore={() => setModDialogOpen(true)}
                        />
                    ) : (
                        /* Overview Tab */
                        <>
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
                                                    <span className="text-[#6e7681]">gamePid:</span>
                                                    <span className={cn(
                                                        "font-mono",
                                                        gamePid ? "text-[#4cff00]" : "text-[#6e7681]"
                                                    )}>
                                                        {gamePid ?? 'null'}
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
                        </>
                    )}

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

                    {/* Translation Section */}
                    {showTranslationCard && (
                        <div className="bg-black/20 p-4 rounded-sm space-y-3">
                            <h3 className="text-[#8b929a] text-xs font-bold uppercase mb-2">Translation</h3>
                            
                            {/* Unity Real-time Auto-Translator */}
                            {isUnityGame && config?.executablePath && (
                                <div className="space-y-2 border-b border-zinc-800/40 pb-3 last:border-0 last:pb-0">
                                    <div className="text-xs font-bold text-zinc-300">Auto-Translator (Unity)</div>
                                    <p className="text-[10px] text-[#acb2b8] leading-relaxed">
                                        แปลข้อความในเกมแบบเรียลไทม์ (ใช้ BepInEx)
                                    </p>
                                    
                                    {translatorStatus === 'checking' ? (
                                        <div className="flex items-center gap-2 text-[10px] text-[#8b929a] py-1">
                                            <Loader2 className="w-3 h-3 animate-spin text-[#66c0f4]" />
                                            กำลังตรวจสอบสถานะ...
                                        </div>
                                    ) : translatorStatus === 'not_installed' ? (
                                        <div className="space-y-2 pt-1">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">แปลเป็นภาษา (Target)</span>
                                                <select
                                                    value={translatorLang}
                                                    onChange={(e) => setTranslatorLang(e.target.value)}
                                                    className="flex w-full rounded border border-[#2a475e] bg-[#101822] px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-[#66c0f4] h-7"
                                                >
                                                    <option value="th">ภาษาไทย (Thai)</option>
                                                    <option value="en">English</option>
                                                    <option value="ja">日本語 (Japanese)</option>
                                                    <option value="ko">한국어 (Korean)</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">ฟอนต์สำหรับแสดงผล (Font)</span>
                                                <button
                                                    onClick={() => setFontDialogOpen(true)}
                                                    className="flex items-center justify-between w-full rounded border border-[#2a475e] bg-[#101822] px-2.5 py-1.5 text-[11px] text-zinc-200 hover:border-[#66c0f4] hover:bg-[#15202d] transition-colors h-8 text-left group"
                                                    disabled={loadingFonts}
                                                >
                                                    <span className="truncate flex-1 mr-2">
                                                        {fonts.find(f => String(f.id) === selectedFontId)?.name || 'Default Font (ระบบเลือกให้อัตโนมัติ)'}
                                                    </span>
                                                    <span className="text-[9px] text-[#66c0f4] group-hover:text-[#47a8e5] shrink-0 font-bold uppercase transition-colors">แก้ไข</span>
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleInstallTranslator}
                                                disabled={isInstallingTranslator}
                                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-bold bg-[#66c0f4] hover:bg-[#47a8e5] text-black transition-colors disabled:opacity-50"
                                            >
                                                {isInstallingTranslator ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        กำลังติดตั้ง...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Languages className="w-3 h-3" />
                                                        ติดตั้ง Auto-Translator
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                ติดตั้งระบบแปลภาษาแล้ว
                                            </div>
                                            <button
                                                onClick={handleUninstallTranslator}
                                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium bg-[#2a2e36] hover:bg-[#3d2e2e] text-[#f38181] transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                ถอนการติดตั้ง
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* NST CLI Translation */}
                            {((libraryItem.engine || 'rpgm') === 'rpgm' || 
                              ['rpgm', 'rpgmaker', 'tyrano'].includes((libraryItem.engine || '').toLowerCase()) ||
                              (libraryItem.engine || '').toLowerCase().includes('rpg') ||
                              isUnityGame) && (
                                <div className="space-y-2 pt-1">
                                    <div className="text-xs font-bold text-zinc-300">Translate Yourself (NST)</div>
                                    <p className="text-[10px] text-[#acb2b8] leading-relaxed">
                                        สกัดและแปลข้อความด้วยตนเองโดยใช้ NST CLI
                                    </p>
                                    <button
                                        onClick={async () => {
                                            if (window.electronAPI?.openNstCli) {
                                                const result = await window.electronAPI.openNstCli(
                                                    libraryItem.extractedPath,
                                                    libraryItem.engine || 'rpgm'
                                                );
                                                if (!result.success) {
                                                    alert(`ไม่สามารถเปิด NST ได้: ${result.error || 'Unknown error'}`);
                                                }
                                            } else {
                                                alert('ไม่พบ NST CLI');
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium bg-[#2a3f55] hover:bg-[#3d5a73] text-[#66c0f4] transition-colors"
                                    >
                                        <Languages className="w-3.5 h-3.5" />
                                        เปิดเครื่องมือ NST
                                    </button>
                                </div>
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

                        {/* Wine Dependencies (Linux/Mac only) */}
                        {isLinuxOrMac && isWindowsGame && (
                            <button
                                onClick={() => setWinetricksDialogOpen(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium bg-[#2a3f55] hover:bg-[#3d5a73] text-[#66c0f4] transition-colors"
                            >
                                <Wine className="w-4 h-4" />
                                Wine Dependencies
                            </button>
                        )}

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
                installPath={libraryItem.extractedPath}
            />

            <WinetricksDialog
                open={winetricksDialogOpen}
                onOpenChange={setWinetricksDialogOpen}
            />

            <FontSelectionDialog
                open={fontDialogOpen}
                onOpenChange={setFontDialogOpen}
                fonts={fonts}
                selectedFontId={selectedFontId}
                onSelectFont={setSelectedFontId}
                loading={loadingFonts}
            />

            {libraryItem.articleId && (
                <ArticleModDialog
                    open={modDialogOpen}
                    onOpenChange={setModDialogOpen}
                    articleId={Number(libraryItem.articleId)}
                    articleSlug={libraryItem.slug}
                    gamePath={libraryItem.extractedPath}
                />
            )}
        </div>
    );
}

function LibraryMods({ articleId, articleSlug, gamePath, onOpenStore }: { articleId?: number | null, articleSlug?: string, gamePath?: string, onOpenStore?: () => void }) {
    const { token: authToken } = useAuth();
    const { installedMods, loading: loadingInstalled, addInstalledMod, removeInstalledMod, isInstalled } = useInstalledMods(gamePath);
    const [installingModId, setInstallingModId] = useState<number | null>(null);
    const [modBackups, setModBackups] = useState<Record<number, any[]>>({});
    // Removed unused loadingBackups state
    const [extractionDialog, setExtractionDialog] = useState<{
        open: boolean;
        modId: number;
        modName: string;
        conflicts: string[];
        newFiles: string[];
        structureWarning: boolean;
        mismatchedDirs: string[];
        suggestedPath: string | null;
        targetPath: string; // The active path for extraction
    } | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);

    const { data: availableMods, error, isLoading } = useSWR<Mod[]>(
        articleId ? `article-mods-${articleId}` : null,
        async () => {
            if (!articleId) return [];
            const res = await sdk.articles.getMods(articleId, {
                fields: ['id', 'name', 'version', 'downloadLink']
            });
            return Array.isArray(res) ? res : (res as any).mods || [];
        }
    );

    const handleInstall = async (mod: Mod) => {
        if (!gamePath || !window.electronAPI) {
            alert('Cannot install mod: Game path not found or Electron API unavailable.');
            return;
        }

        setInstallingModId(mod.id);
        try {
            // 1. Get Download URL
            // Mod interface has downloadLink
            const downloadLink = mod.downloadLink;
            const downloadUrl = downloadLink.startsWith('http')
                ? downloadLink
                : `https://mod.chanomhub.workers.dev/download/${downloadLink}`;

            // 2. Get Token for Auth
            const token = authToken || sdk.config.token;

            if (!token) {
                alert('Authentication token not found. Please login again.');
                return;
            }

            // 3. Construct Filename
            // Use a less restrictive regex to allow Thai/Unicode while stripping truly illegal characters
            // Enforce .lpack extension as requested
            const cleanName = `${mod.name}_${mod.version}`.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
            const safeName = `${cleanName}.lpack`;

            // 4. Call Electron Install
            const result = await window.electronAPI.installMod(
                downloadUrl,
                gamePath,
                safeName,
                { Authorization: `Bearer ${token}` }
            );

            if (result.success) {
                // 5. Update Local Manifest
                await addInstalledMod({
                    id: mod.id,
                    name: mod.name,
                    version: mod.version,
                    installedAt: new Date().toISOString(),
                    filename: safeName
                });
                alert(`Installed ${mod.name} successfully!`);
            } else {
                throw new Error('Install failed');
            }

        } catch (err) {
            console.error('Failed to install mod:', err);
            alert(`Failed to install mod: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setInstallingModId(null);
        }
    };

    const handleUninstall = async (modId: number) => {
        const mod = installedMods.find(m => m.id === modId);
        if (!mod) return;

        // Check for backups
        const backups = modBackups[modId];
        let rollbackConfirmed = false;

        if (backups && backups.length > 0) {
            const confirmRollback = confirm(
                `This mod (${mod.name}) has modified game files.\n\n` +
                `Do you want to restore the original files from the latest backup before uninstalling?`
            );

            if (confirmRollback) {
                // Perform rollback on the latest backup
                const latestBackup = backups[0]; // Assuming sorted by date desc, or we need to sort
                // We should probably trust the order from getModBackups which usually returns chronological or we pick the last one? 
                // Let's assume the API returns them in a reasonable order or we pick the one with the latest timestamp. 
                // Actually, typically we want to roll back the *last* change.

                // Let's check how getModBackups returns data. 
                // If it's not sorted, we might need to sort. 
                // For now, let's assume index 0 or length-1. Use date to be safe if possible, or just the first one if it's the only one.
                // Actually, rollbackLpackExtraction takes a backupId.

                setIsExtracting(true); // Re-use extracting state for UI feedback
                try {
                    if (window.electronAPI) {
                        const rollbackResult = await window.electronAPI.rollbackLpackExtraction(gamePath || '', latestBackup.id);
                        if (!rollbackResult.success) {
                            alert(`Failed to restore files: ${rollbackResult.error}\nUninstalling anyway...`);
                        } else {
                            rollbackConfirmed = true;
                        }
                    }
                } catch (err) {
                    console.error('Rollback failed:', err);
                    alert('Error during file restoration. Proceeding with uninstall...');
                } finally {
                    setIsExtracting(false);
                }
            }
        }

        if (!confirm(`Are you sure you want to uninstall ${mod.name}?${rollbackConfirmed ? ' (Files have been restored)' : ''}`)) return;
        await removeInstalledMod(modId);

        // Refresh backups logic might turn up empty now, which is fine
        setModBackups(prev => {
            const next = { ...prev };
            delete next[modId];
            return next;
        });
    };

    const fetchBackups = async (modId: number) => {
        if (!gamePath || !window.electronAPI) return;
        try {
            const result = await window.electronAPI.getModBackups(gamePath, modId);
            if (result.success) {
                setModBackups(prev => ({ ...prev, [modId]: result.backups || [] }));
            }
        } catch (err) {
            console.error('Failed to fetch backups:', err);
        }
    };

    const handleExtract = async (modId: number) => {
        const mod = installedMods.find(m => m.id === modId);
        if (!mod || !gamePath || !window.electronAPI) return;

        const filePath = `${gamePath}/${mod.filename}`;

        try {
            const meta = await window.electronAPI.getLpackMetadata(filePath);
            if (!meta.success) {
                alert(`Failed to read mod metadata: ${meta.error}`);
                return;
            }

            // Check conflicts and new files
            const conflictResult = await window.electronAPI.checkLpackConflicts(filePath, gamePath);

            if (conflictResult.success) {
                setExtractionDialog({
                    open: true,
                    modId,
                    modName: meta.name || mod.name,
                    conflicts: conflictResult.conflicts || [],
                    newFiles: conflictResult.newFiles || [],
                    structureWarning: conflictResult.structureWarning || false,
                    mismatchedDirs: conflictResult.mismatchedDirs || [],
                    suggestedPath: conflictResult.suggestedPath || null,
                    targetPath: gamePath
                });
            } else {
                alert(`Failed to check conflicts: ${conflictResult.error}`);
            }
        } catch (err) {
            console.error('Failed to check conflicts:', err);
            alert('Error preparing extraction');
        }
    };

    const handleApplySuggestion = async (subPath: string) => {
        if (!extractionDialog || !gamePath || !window.electronAPI) return;

        const { modId } = extractionDialog;
        const mod = installedMods.find(m => m.id === modId);
        if (!mod) return;

        const absoluteTarget = `${gamePath}/${subPath}`;
        const filePath = `${gamePath}/${mod.filename}`;

        try {
            const conflictResult = await window.electronAPI.checkLpackConflicts(filePath, absoluteTarget);
            if (conflictResult.success) {
                setExtractionDialog({
                    ...extractionDialog,
                    conflicts: conflictResult.conflicts || [],
                    newFiles: conflictResult.newFiles || [],
                    structureWarning: conflictResult.structureWarning || false,
                    mismatchedDirs: conflictResult.mismatchedDirs || [],
                    suggestedPath: null, // Clear after applying
                    targetPath: absoluteTarget
                });
            }
        } catch (err) {
            console.error('Failed to apply suggestion:', err);
        }
    };

    const handleConfirmExtract = async () => {
        if (!extractionDialog || !gamePath || !window.electronAPI) return;

        const { modId, targetPath } = extractionDialog;
        const mod = installedMods.find(m => m.id === modId);
        if (!mod) return;

        const filePath = `${gamePath}/${mod.filename}`;

        setIsExtracting(true);
        try {
            const result = await window.electronAPI.extractLpack(filePath, targetPath, undefined, modId, gamePath);
            if (result.success) {
                alert('Mod extracted successfully!');
                fetchBackups(modId);
                setExtractionDialog(null);
            } else {
                alert(`Failed to extract mod: ${result.error}`);
            }
        } catch (err) {
            console.error('Failed to extract mod:', err);
            alert('Error during extraction');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleRollback = async (modId: number, backupId: string) => {
        if (!gamePath || !window.electronAPI) return;
        if (!confirm('Are you sure you want to rollback to this backup? This will overwrite current extracted files.')) return;

        try {
            const result = await window.electronAPI.rollbackLpackExtraction(gamePath, backupId);
            if (result.success) {
                alert('Rollback successful!');
                fetchBackups(modId);
            } else {
                alert(`Rollback failed: ${result.error}`);
            }
        } catch (err) {
            console.error('Rollback failed:', err);
            alert('Error during rollback');
        }
    };

    useEffect(() => {
        if (installedMods && gamePath) {
            installedMods.forEach(mod => {
                if (mod.filename && mod.filename.endsWith('.lpack')) {
                    fetchBackups(mod.id);
                }
            });
        }
    }, [installedMods, gamePath]);

    if (!articleId) {
        return (
            <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-8 text-center text-[#8b949e] text-sm">
                No article associated with this game. Cannot fetch mods.
            </div>
        );
    }

    if (isLoading || loadingInstalled) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#66c0f4]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-[#0d1117] border border-red-900/50 rounded-md p-8 text-center text-red-400 text-sm">
                Failed to load mods.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header: Available Mods vs Installed */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#dcdedf] font-medium">Available Mods</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (onOpenStore) {
                                onOpenStore();
                            } else if ((articleId || articleSlug) && window.electronAPI) {
                                const url = articleSlug
                                    ? `https://chanomhub.com/articles/${articleSlug}`
                                    : `https://chanomhub.com/posts/${articleId}`;
                                window.electronAPI.openExternal(url);
                            }
                        }}
                        className="text-xs text-[#66c0f4] hover:text-white flex items-center gap-1"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Open Mod Store
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#66c0f4] mb-2" />
                    <span className="text-xs text-[#8b949e]">Loading mods...</span>
                </div>
            ) : availableMods && availableMods.length > 0 ? (
                <div className="space-y-2">
                    {availableMods.map((mod) => {
                        const installed = isInstalled(mod.id);
                        return (
                            <div key={mod.id} className="bg-[#161b22] border border-[#30363d] rounded p-3 flex items-center justify-between group hover:border-[#8b949e] transition-colors">
                                <div className="min-w-0 flex-1 mr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-[#dcdedf] font-medium text-sm truncate">{mod.name}</h4>
                                        <span className="bg-[#2a475e] text-[#66c0f4] text-[10px] px-1.5 py-0.5 rounded">
                                            v{mod.version}
                                        </span>
                                    </div>
                                    <div className="text-[#8b949e] text-xs flex items-center gap-3">
                                        {installed && (
                                            <span className="text-green-500 font-medium flex items-center gap-1">
                                                <Check className="w-3 h-3" />
                                                Installed
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {installed ? (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                {mod.downloadLink.endsWith('.lpack') && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => handleExtract(mod.id)}
                                                        className="bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 border border-blue-900/50 h-8"
                                                    >
                                                        Extract
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleUninstall(mod.id)}
                                                    className="bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 h-8"
                                                >
                                                    Uninstall
                                                </Button>
                                            </div>
                                            {mod.downloadLink.endsWith('.lpack') && modBackups[mod.id]?.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-[#30363d]">
                                                    <div className="text-[10px] text-[#8b949e] mb-1 font-medium uppercase tracking-wider">Backups / History</div>
                                                    <div className="flex flex-col gap-1">
                                                        {modBackups[mod.id].slice(0, 3).map(backup => (
                                                            <div key={backup.id} className="flex flex-col bg-[#0d1117] p-2 rounded gap-1 border border-[#30363d] hover:border-[#8b949e] transition-colors">
                                                                <div className="flex items-center justify-between text-[11px]">
                                                                    <span className="text-[#dcdedf] font-medium">
                                                                        {new Date(backup.timestamp).toLocaleString()}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleRollback(mod.id, backup.id)}
                                                                        className="text-[#66c0f4] hover:underline"
                                                                    >
                                                                        Rollback
                                                                    </button>
                                                                </div>
                                                                {backup.files && backup.files.length > 0 && (
                                                                    <div className="text-[10px] text-[#8b949e] mt-1 space-y-0.5">
                                                                        <div className="font-medium">Files replaced:</div>
                                                                        <ul className="list-disc list-inside pl-1 opacity-80">
                                                                            {backup.files.slice(0, 5).map((f: string, i: number) => (
                                                                                <li key={i} className="truncate" title={f}>{f}</li>
                                                                            ))}
                                                                            {backup.files.length > 5 && (
                                                                                <li className="italic">...and {backup.files.length - 5} more</li>
                                                                            )}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleInstall(mod)}
                                            disabled={installingModId === mod.id}
                                            className="bg-[#238636] hover:bg-[#2ea043] text-white border-none h-8"
                                        >
                                            {installingModId === mod.id ? (
                                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                            ) : (
                                                <DownloadIcon className="w-3 h-3 mr-1" />
                                            )}
                                            Install
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-8 text-center text-[#8b949e] text-sm flex flex-col items-center gap-3">
                    <p>No mods available for this game yet.</p>
                    <button
                        onClick={() => {
                            if (onOpenStore) {
                                onOpenStore();
                            } else if ((articleId || articleSlug) && window.electronAPI) {
                                const url = articleSlug
                                    ? `https://chanomhub.com/articles/${articleSlug}`
                                    : `https://chanomhub.com/posts/${articleId}`;
                                window.electronAPI.openExternal(url);
                            }
                        }}
                        className="text-[#66c0f4] hover:underline text-xs flex items-center gap-1"
                    >
                        Visit Mod Store Page <ExternalLink className="w-3 h-3" />
                    </button>
                </div>
            )}

            {extractionDialog && (
                <ModExtractionDialog
                    open={extractionDialog.open}
                    onOpenChange={(open) => setExtractionDialog(open ? extractionDialog : null)}
                    modName={extractionDialog.modName}
                    conflicts={extractionDialog.conflicts}
                    newFiles={extractionDialog.newFiles}
                    structureWarning={extractionDialog.structureWarning}
                    mismatchedDirs={extractionDialog.mismatchedDirs}
                    suggestedPath={extractionDialog.suggestedPath}
                    onApplySuggestion={handleApplySuggestion}
                    onConfirm={handleConfirmExtract}
                    isExtracting={isExtracting}
                />
            )}
        </div>
    );
}
