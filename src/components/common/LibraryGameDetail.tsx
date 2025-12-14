import { useState, useEffect } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { LibraryItem } from '@/types/libraryItem';
import GameLaunchDialog, { GameLaunchConfig } from './GameLaunchDialog';
import { useGameLauncher } from '@/hooks/useGameLauncher';
import { useGameScanner } from '@/hooks/useGameScanner';
import { Button } from '@/components/ui/Button';
import {
    Play,
    Settings,
    Info,
    Star,
    Loader2,
    RotateCcw,
    Trash2,
    Archive,
    ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

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
}

export default function LibraryGameDetail({ libraryItem, onBack }: LibraryGameDetailProps) {
    const { toggleFavorite, reExtractGame, deleteArchive, archiveExists, removeFromLibrary, updateLibraryItem } = useLibrary();

    const [launchDialogVisible, setLaunchDialogVisible] = useState(false);
    const [hasArchive, setHasArchive] = useState(false);

    // Custom Hooks
    const { config, launchGame, saveConfig } = useGameLauncher(libraryItem.id);
    const { scanDirectory, results: scanResults } = useGameScanner();

    // Check if archive exists on mount
    useEffect(() => {
        const checkArchive = async () => {
            const exists = await archiveExists(libraryItem.id);
            setHasArchive(exists);
        };
        checkArchive();
    }, [libraryItem.id, archiveExists, libraryItem.archivePath]);

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
                    <img
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
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-col md:flex-row px-8 gap-8 pb-12">

                {/* Left Column (Main Feed) */}
                <div className="flex-1 space-y-6">
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
