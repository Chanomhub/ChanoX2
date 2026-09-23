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
    const [isNstRunning, setIsNstRunning] = useState(false);
    const [nstStatusText, setNstStatusText] = useState<string | null>(null);

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
        <div className="flex flex-col h-full bg-background overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-background">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="absolute top-4 left-4 z-10 p-2 bg-background/80 border border-border/60 rounded-full hover:bg-muted text-foreground transition-colors"
            >
                <ArrowLeft className="w-5 h-5 text-foreground" />
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
                    <div className="w-full h-full bg-card" />
                )}
                <div className="absolute inset-x-0 bottom-0 h-[150px] bg-gradient-to-t from-background to-transparent pointer-events-none" />

                <div className="absolute bottom-5 left-8 space-y-2">
                    <h1 className="text-foreground text-4xl font-bold drop-shadow-md">
                        {libraryItem.title}
                    </h1>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center px-8 pb-6 bg-background gap-8">
                {isRunning ? (
                    <Button
                        variant="destructive"
                        className="px-8 py-6 text-base font-bold tracking-wider rounded-md transition-colors"
                        onClick={handleStopGame}
                    >
                        <Square className="w-5 h-5 mr-2 fill-current" />
                        STOP
                    </Button>
                ) : (
                    <Button
                        className={cn(
                            "px-8 py-6 text-base font-bold tracking-wider rounded-md transition-colors",
                            libraryItem.isReExtracting
                                ? "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
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
                                <Play className="w-5 h-5 mr-2 fill-current" />
                                PLAY
                            </>
                        )}
                    </Button>
                )}

                <div className="flex gap-8 mr-auto">
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] font-bold mb-0.5 tracking-wider">LAST PLAYED</span>
                        <span className="text-foreground text-xs font-medium">{formatLastPlayed(libraryItem.lastPlayedAt)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px] font-bold mb-0.5 tracking-wider">PLAY TIME</span>
                        <span className="text-foreground text-xs font-medium">{formatPlayTime(config?.playTime)}</span>
                    </div>
                    {isRunning && gamePid && (
                        <div className="flex flex-col">
                            <span className="text-muted-foreground text-[10px] font-bold mb-0.5 tracking-wider">PID</span>
                            <span className="text-primary text-xs font-mono font-medium">{gamePid}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => handleOpenLaunchOptions()}
                        className="p-2 bg-card border border-border/70 rounded-md hover:bg-muted text-foreground transition-colors"
                        title="Game Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <button
                        className="p-2 bg-card border border-border/70 rounded-md hover:bg-muted text-foreground transition-colors"
                        title="Info"
                    >
                        <Info className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => toggleFavorite(libraryItem.id)}
                        className={cn(
                            "p-2 bg-card border border-border/70 rounded-md hover:bg-muted transition-colors",
                            libraryItem.isFavorite ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Favorite"
                    >
                        <Star className={cn("w-5 h-5", libraryItem.isFavorite && "fill-current")} />
                    </button>
                </div>
            </div>

            {/* Navbar */}
            <div className="flex px-8 py-3 bg-card/60 backdrop-blur-sm gap-8 border-y border-border/60 mb-6">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={cn(
                        "text-sm font-medium pb-2 -mb-3 z-10 transition-colors",
                        activeTab === 'overview'
                            ? "text-primary font-bold border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >Overview</button>
                <button
                    onClick={() => setActiveTab('files')}
                    className={cn(
                        "text-sm font-medium pb-2 -mb-3 z-10 transition-colors",
                        activeTab === 'files'
                            ? "text-primary font-bold border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >Files</button>
                <button
                    onClick={() => setActiveTab('mods')}
                    className={cn(
                        "text-sm font-medium pb-2 -mb-3 z-10 transition-colors",
                        activeTab === 'mods'
                            ? "text-primary font-bold border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >Mods</button>
                <button
                    onClick={() => setDevMode(!devMode)}
                    className={cn(
                        "ml-auto flex items-center gap-1.5 text-xs font-medium transition-colors px-2 py-1 rounded",
                        devMode ? "text-primary bg-primary/10 border border-primary/20" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Code className="w-3.5 h-3.5" />
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
                            <div className="bg-card border border-border/60 rounded-md p-8 text-center text-muted-foreground text-sm">
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
                                <div className="bg-card border border-border/60 p-4 rounded-md" key={refreshKey}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-primary text-xs font-bold uppercase flex items-center gap-2">
                                            <Code className="w-3 h-3" />
                                            Developer Info
                                        </h3>
                                        <button
                                            onClick={handleRefreshConfig}
                                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Refresh
                                        </button>
                                    </div>

                                    <div className="space-y-4 font-mono text-xs">
                                        {/* Playtime Tracking */}
                                        <div className="space-y-2">
                                            <h4 className="text-primary font-bold">⏱️ Playtime Tracking</h4>
                                            <div className="bg-background/80 border border-border/40 p-2.5 rounded-md space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">isRunning:</span>
                                                    <span className={cn(
                                                        "font-bold",
                                                        isRunning ? "text-primary" : "text-muted-foreground"
                                                    )}>
                                                        {isRunning ? '🟢 RUNNING' : '⚫ STOPPED'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">gamePid:</span>
                                                    <span className={cn(
                                                        "font-mono",
                                                        gamePid ? "text-primary" : "text-muted-foreground"
                                                    )}>
                                                        {gamePid ?? 'null'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">playTime (raw):</span>
                                                    <span className="text-primary">{config?.playTime ?? 'null'} seconds</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">playTime (formatted):</span>
                                                    <span className="text-foreground">{formatPlayTime(config?.playTime)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">lastPlayed:</span>
                                                    <span className="text-foreground">{config?.lastPlayed ?? 'Never'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Game Config */}
                                        <div className="space-y-2">
                                            <h4 className="text-primary font-bold">⚙️ Game Config</h4>
                                            <div className="bg-background/80 border border-border/40 p-2.5 rounded-md space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">gameId:</span>
                                                    <span className="text-foreground">{libraryItem.id}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground">executablePath:</span>
                                                    <span className="text-foreground break-all text-[10px] mt-1">{config?.executablePath ?? 'Not set'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">useWine:</span>
                                                    <span className={cn(config?.useWine ? "text-emerald-400" : "text-destructive")}>
                                                        {config?.useWine ? 'true' : 'false'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">args:</span>
                                                    <span className="text-foreground">{config?.args?.length ? config.args.join(' ') : '[]'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">locale:</span>
                                                    <span className="text-foreground">{config?.locale ?? 'default'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Library Item */}
                                        <div className="space-y-2">
                                            <h4 className="text-primary font-bold">📚 Library Item</h4>
                                            <div className="bg-background/80 border border-border/40 p-2.5 rounded-md space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">id:</span>
                                                    <span className="text-foreground">{libraryItem.id}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">articleId:</span>
                                                    <span className="text-foreground">{libraryItem.articleId ?? 'null'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">lastPlayedAt:</span>
                                                    <span className="text-foreground">{libraryItem.lastPlayedAt?.toISOString() ?? 'null'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">addedAt:</span>
                                                    <span className="text-foreground">{libraryItem.addedAt?.toISOString() ?? 'null'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Raw Config JSON */}
                                        <div className="space-y-2">
                                            <h4 className="text-primary font-bold">📄 Raw Config JSON</h4>
                                            <pre className="bg-background/80 border border-border/40 p-2.5 rounded-md text-[10px] text-muted-foreground overflow-x-auto max-h-[150px]">
                                                {JSON.stringify(config, null, 2) || 'null'}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                (libraryItem.description || libraryItem.body) && (
                                    <div className="bg-card border border-border/60 p-6 rounded-md">
                                        <h2 className="text-foreground text-lg font-semibold mb-4 border-b border-border/60 pb-2 uppercase tracking-wider">About This Game</h2>
                                        <div className="text-muted-foreground text-sm leading-6 space-y-4">
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
                        <div className="bg-card border border-border/60 p-4 rounded-md space-y-3">
                            <h3 className="text-muted-foreground text-xs font-bold uppercase mb-2 tracking-wider">Game Info</h3>
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
                        <div className="bg-card border border-border/60 p-4 rounded-md space-y-3">
                            <h3 className="text-muted-foreground text-xs font-bold uppercase mb-2 tracking-wider">Translation</h3>
                            
                            {/* Unity Real-time Auto-Translator */}
                            {isUnityGame && config?.executablePath && (
                                <div className="space-y-2 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                                    <div className="text-xs font-bold text-foreground">Auto-Translator (Unity)</div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        แปลข้อความในเกมแบบเรียลไทม์ (ใช้ BepInEx)
                                    </p>
                                    
                                    {translatorStatus === 'checking' ? (
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground py-1">
                                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                            กำลังตรวจสอบสถานะ...
                                        </div>
                                    ) : translatorStatus === 'not_installed' ? (
                                        <div className="space-y-2 pt-1">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">แปลเป็นภาษา (Target)</span>
                                                <select
                                                    value={translatorLang}
                                                    onChange={(e) => setTranslatorLang(e.target.value)}
                                                    className="flex w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-7"
                                                >
                                                    <option value="th">ภาษาไทย (Thai)</option>
                                                    <option value="en">English</option>
                                                    <option value="ja">日本語 (Japanese)</option>
                                                    <option value="ko">한국어 (Korean)</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">ฟอนต์สำหรับแสดงผล (Font)</span>
                                                <button
                                                    onClick={() => setFontDialogOpen(true)}
                                                    className="flex items-center justify-between w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] text-foreground hover:border-primary/50 hover:bg-muted/50 transition-colors h-8 text-left group"
                                                    disabled={loadingFonts}
                                                >
                                                    <span className="truncate flex-1 mr-2">
                                                        {fonts.find(f => String(f.id) === selectedFontId)?.name || 'Default Font (ระบบเลือกให้อัตโนมัติ)'}
                                                    </span>
                                                    <span className="text-[9px] text-primary group-hover:text-primary/80 shrink-0 font-bold uppercase transition-colors">แก้ไข</span>
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleInstallTranslator}
                                                disabled={isInstallingTranslator}
                                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors disabled:opacity-50"
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
                                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                ถอนการติดตั้ง
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Lingo / NST Translation */}
                            {((libraryItem.engine || 'rpgm') === 'rpgm' || 
                              ['rpgm', 'rpgmaker', 'tyrano'].includes((libraryItem.engine || '').toLowerCase()) ||
                              (libraryItem.engine || '').toLowerCase().includes('rpg') ||
                              isUnityGame) && (
                                <div className="space-y-2 pt-1">
                                    <div className="text-xs font-bold text-foreground">Translate Yourself (Lingo Translate)</div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        สกัดและแปลข้อความด้วยตนเองโดยใช้ Lingo Translate (Go Edition)
                                    </p>
                                    <button
                                        disabled={isNstRunning}
                                        onClick={async () => {
                                            if (!window.electronAPI?.openNstCli) {
                                                alert('ไม่พบ Lingo/NST CLI API ในระบบ');
                                                return;
                                            }
                                            setIsNstRunning(true);
                                            setNstStatusText('กำลังตรวจสอบ...');
                                            try {
                                                const check = await window.electronAPI.checkNstCli?.();
                                                if (check && !check.installed) {
                                                    setIsNstRunning(false);
                                                    setNstStatusText(null);
                                                    const wantDownload = confirm('ยังไม่ได้ติดตั้ง Lingo-Translate (เครื่องมือสกัดและแปลเกม)\n\nต้องการดาวน์โหลดและติดตั้งอัตโนมัติหรือไม่? (~5 MB)');
                                                    if (wantDownload) {
                                                        setIsNstRunning(true);
                                                        setNstStatusText('กำลังดาวน์โหลด...');
                                                        const dl = await window.electronAPI.downloadAndInstallNst?.();
                                                        if (!dl?.success) {
                                                            alert(`ดาวน์โหลดและติดตั้งไม่สำเร็จ: ${dl?.error || 'Unknown error'}`);
                                                            return;
                                                        }
                                                        alert(`ติดตั้ง Lingo-Translate สำเร็จแล้ว (${dl.version || 'v2.3.0'})!`);
                                                    } else {
                                                        return;
                                                    }
                                                }

                                                setIsNstRunning(true);
                                                setNstStatusText('กำลังเปิดเครื่องมือ...');
                                                const result = await window.electronAPI.openNstCli(
                                                    libraryItem.extractedPath,
                                                    libraryItem.engine || 'rpgm'
                                                );
                                                if (!result.success) {
                                                    alert(`ไม่สามารถเปิดเครื่องมือได้: ${result.error || 'Unknown error'}`);
                                                } else {
                                                    alert('สกัดและเตรียมโครงสร้างการแปลภาษาสำเร็จแล้ว!');
                                                }
                                            } catch (err: any) {
                                                alert(`เกิดข้อผิดพลาด: ${err?.message || 'Unknown error'}`);
                                            } finally {
                                                setIsNstRunning(false);
                                                setNstStatusText(null);
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isNstRunning ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                {nstStatusText || 'กำลังทำงาน...'}
                                            </>
                                        ) : (
                                            <>
                                                <Languages className="w-3.5 h-3.5" />
                                                เปิดเครื่องมือแปลภาษา (Lingo)
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Official Sources */}
                    {loadingOfficialSources ? (
                        <div className="bg-card border border-border/60 p-4 rounded-md">
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                        </div>
                    ) : officialSources.length > 0 && (
                        <div className="bg-card border border-border/60 p-4 rounded-md space-y-3">
                            <h3 className="text-muted-foreground text-xs font-bold uppercase mb-2 tracking-wider">Official Links</h3>
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
                                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium bg-background/70 hover:bg-muted/60 border border-border/60 hover:border-primary/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-2">
                                        <ExternalLink className="w-4 h-4 text-primary" />
                                        <span className="text-foreground group-hover:text-primary transition-colors">{source.name}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="bg-card border border-border/60 p-4 rounded-md space-y-3">
                        <h3 className="text-muted-foreground text-xs font-bold uppercase mb-2 tracking-wider">Actions</h3>

                        {/* Re-extract Button */}
                        <button
                            onClick={handleReExtract}
                            disabled={!hasArchive || libraryItem.isReExtracting}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                hasArchive && !libraryItem.isReExtracting
                                    ? "bg-muted hover:bg-muted/80 text-foreground border border-border/50"
                                    : "bg-muted/40 text-muted-foreground/60 border border-transparent cursor-not-allowed"
                            )}
                        >
                            <RotateCcw className="w-4 h-4" />
                            Re-extract from Archive
                        </button>

                        {/* Delete Archive Button */}
                        {hasArchive && (
                            <button
                                onClick={handleDeleteArchive}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-colors"
                            >
                                <Archive className="w-4 h-4" />
                                Delete Archive (Free Space)
                            </button>
                        )}

                        {/* Remove from Library */}
                        <button
                            onClick={handleRemoveFromLibrary}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Remove from Library
                        </button>

                        {/* Desktop Shortcut */}
                        <button
                            onClick={hasShortcut ? handleDeleteShortcut : handleCreateShortcut}
                            disabled={shortcutLoading}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border",
                                shortcutLoading
                                    ? "bg-muted/40 text-muted-foreground/60 border-transparent cursor-not-allowed"
                                    : hasShortcut
                                        ? "bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20"
                                        : "bg-muted hover:bg-muted/80 text-foreground border-border/50"
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
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/50 transition-colors"
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
            let ext = '.patch.json.gz';
            if (downloadLink.includes('.patch.json.gz')) {
                ext = '.patch.json.gz';
            } else if (downloadLink.includes('.patch.json')) {
                ext = '.patch.json';
            } else if (downloadLink.includes('.zip')) {
                ext = '.zip';
            } else if (downloadLink.includes('.lpack')) {
                ext = '.lpack';
            }

            const cleanName = `${mod.name}_${mod.version}`.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
            const safeName = `${cleanName}${ext}`;

            // 4. Call Electron Install
            const result = await window.electronAPI.installMod(
                downloadUrl,
                gamePath,
                safeName,
                { Authorization: `Bearer ${token}` }
            );

            if (result.success) {
                // If it's a patch file (.patch.json or .patch.json.gz), automatically apply it!
                if (safeName.endsWith('.patch.json.gz') || safeName.endsWith('.patch.json')) {
                    const patchFilePath = result.path || `${gamePath}/${safeName}`;
                    const patchResult = await window.electronAPI.applyPatch(gamePath, patchFilePath, mod.id);
                    if (!patchResult.success) {
                        throw new Error(`Patch installation failed: ${patchResult.error}`);
                    }
                }

                // 5. Update Local Manifest
                await addInstalledMod({
                    id: mod.id,
                    name: mod.name,
                    version: mod.version,
                    installedAt: new Date().toISOString(),
                    filename: safeName
                });

                await fetchBackups(mod.id);
                alert(`Installed and applied ${mod.name} successfully!`);
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
                const latestBackup = backups[0];
                setIsExtracting(true);
                try {
                    if (window.electronAPI) {
                        const rollbackResult = await (window.electronAPI.rollbackPatch 
                            ? window.electronAPI.rollbackPatch(gamePath || '', latestBackup.id)
                            : window.electronAPI.rollbackLpackExtraction(gamePath || '', latestBackup.id));
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
            const result = await (window.electronAPI.rollbackPatch 
                ? window.electronAPI.rollbackPatch(gamePath, backupId) 
                : window.electronAPI.rollbackLpackExtraction(gamePath, backupId));
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
                fetchBackups(mod.id);
            });
        }
    }, [installedMods, gamePath]);

    if (!articleId) {
        return (
            <div className="bg-card border border-border/60 rounded-md p-8 text-center text-muted-foreground text-sm">
                No article associated with this game. Cannot fetch mods.
            </div>
        );
    }

    if (isLoading || loadingInstalled) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-card border border-destructive/30 rounded-md p-8 text-center text-destructive text-sm">
                Failed to load mods.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header: Available Mods vs Installed */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-foreground font-semibold">Available Mods</h3>
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
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Open Mod Store
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <span className="text-xs text-muted-foreground">Loading mods...</span>
                </div>
            ) : availableMods && availableMods.length > 0 ? (
                <div className="space-y-2">
                    {availableMods.map((mod) => {
                        const installed = isInstalled(mod.id);
                        return (
                            <div key={mod.id} className="bg-card border border-border/60 rounded-md p-3.5 flex items-center justify-between group hover:border-primary/40 transition-colors">
                                <div className="min-w-0 flex-1 mr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-foreground font-medium text-sm truncate">{mod.name}</h4>
                                        <span className="bg-primary/15 border border-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-mono">
                                            v{mod.version}
                                        </span>
                                    </div>
                                    <div className="text-muted-foreground text-xs flex items-center gap-3">
                                        {installed && (
                                            <span className="text-emerald-400 font-medium flex items-center gap-1">
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
                                                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 h-8"
                                                    >
                                                        Extract
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleUninstall(mod.id)}
                                                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 h-8"
                                                >
                                                    Uninstall
                                                </Button>
                                            </div>
                                            {modBackups[mod.id]?.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-border/50">
                                                    <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">Backups / History</div>
                                                    <div className="flex flex-col gap-1">
                                                        {modBackups[mod.id].slice(0, 3).map(backup => (
                                                            <div key={backup.id} className="flex flex-col bg-background/80 p-2 rounded-md gap-1 border border-border/50 hover:border-primary/40 transition-colors">
                                                                <div className="flex items-center justify-between text-[11px]">
                                                                    <span className="text-foreground font-medium">
                                                                        {new Date(backup.timestamp).toLocaleString()}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleRollback(mod.id, backup.id)}
                                                                        className="text-primary hover:underline font-medium"
                                                                    >
                                                                        Rollback
                                                                    </button>
                                                                </div>
                                                                {backup.files && backup.files.length > 0 && (
                                                                    <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
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
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8"
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
                <div className="bg-card border border-border/60 rounded-md p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
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
                        className="text-primary hover:underline text-xs flex items-center gap-1 font-medium"
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
