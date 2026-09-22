import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Home, MessageSquare, Search, Filter, Plus, Clock, Star, Folder, File, Puzzle } from 'lucide-react';
import { useLibrary } from '@/contexts/LibraryContext';
import { getCoverImageSrc } from '@/lib/coverImage';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LibrarySidebarProps {
    onSelectGame: (id: number) => void;
    selectedGameId?: number;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    collapsed?: boolean;
}

export default function LibrarySidebar({
    searchQuery,
    onSearchChange,
    selectedGameId,
    onSelectGame,
    collapsed = false
}: LibrarySidebarProps) {
    const { libraryItems, addToLibrary } = useLibrary();
    const [isChatVisible, setIsChatVisible] = useState(false);
    // Suppress unused warning
    void isChatVisible;

    const [filterExpanded, setFilterExpanded] = useState(false);

    const filteredItems = libraryItems
        .filter((item) => {
            const name = item.title || '';
            return name.toLowerCase().includes((searchQuery || '').toLowerCase());
        })
        .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return (a.title || '').localeCompare(b.title || '');
        });

    // Separate games and mods
    const filteredGames = filteredItems.filter(item => !item.isMod);
    const filteredMods = filteredItems.filter(item => item.isMod);

    const handleAddGameFolder = async () => {
        if (!window.electronAPI) return;
        try {
            const path = await window.electronAPI.selectGameFolder();
            if (path) {
                // Use folder name as title
                const name = path.split(/[/\\]/).pop() || 'Unknown Game';
                addToLibrary({
                    title: name,
                    extractedPath: path,
                });
            }
        } catch (error) {
            console.error('Failed to add game folder:', error);
        }
    };

    const handleAddGameArchive = async () => {
        if (!window.electronAPI) return;
        try {
            const path = await window.electronAPI.selectGameArchive();
            if (path) {
                // Use filename as title, remove extension
                const filename = path.split(/[/\\]/).pop() || 'Unknown Game';
                const name = filename.substring(0, filename.lastIndexOf('.')) || filename;

                addToLibrary({
                    title: name,
                    extractedPath: path, // Point to archive initially, user can re-extract/install
                    archivePath: path
                });
            }
        } catch (error) {
            console.error('Failed to add game archive:', error);
        }
    };

    if (collapsed) {
        return (
            <div className="w-[60px] bg-card border-r border-border/60 flex flex-col items-center pt-2 h-full">
                <button
                    className="p-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded w-full flex justify-center"
                    onClick={() => onSelectGame(-1)}
                >
                    <Home className="w-5 h-5" />
                </button>
                <button className="p-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded w-full flex justify-center">
                    <Clock className="w-5 h-5" />
                </button>

                <div className="h-px w-4/5 bg-border my-2" />

                <ScrollArea className="flex-1 w-full">
                    <div className="flex flex-col items-center gap-1 pb-2">
                        {filteredGames.map(game => (
                            <button
                                key={game.id}
                                className={cn(
                                    "w-10 h-10 rounded flex items-center justify-center transition-colors",
                                    selectedGameId === game.id ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted hover:bg-muted/80 text-foreground"
                                )}
                                onClick={() => onSelectGame(game.id)}
                                title={game.title}
                            >
                                {getCoverImageSrc(game.localCoverImage, game.coverImage) ? (
                                    <img
                                        src={getCoverImageSrc(game.localCoverImage, game.coverImage)}
                                        alt={game.title}
                                        className="w-full h-full object-cover rounded"
                                    />
                                ) : (
                                    <span className="text-foreground font-bold text-xs">
                                        {(game.title).substring(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </ScrollArea>

                {/* Collapsed Footer */}
                <div className="p-3 border-t border-border/60 bg-card flex justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                                <Plus className="w-5 h-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="right" className="bg-card border-border text-foreground">
                            <DropdownMenuItem onClick={handleAddGameFolder} className="hover:bg-muted cursor-pointer gap-2">
                                <Folder className="w-4 h-4" />
                                <span>Add from Folder</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleAddGameArchive} className="hover:bg-muted cursor-pointer gap-2">
                                <File className="w-4 h-4" />
                                <span>Add from Archive</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    }

    return (
        <div className="w-[280px] bg-card border-r border-border/60 flex flex-col h-full">
            {/* Nav Items */}
            <div className="flex flex-col">
                <button
                    className={cn(
                        "flex items-center px-4 py-2.5 gap-3 text-sm font-medium transition-colors hover:bg-muted/50",
                        selectedGameId === -1 && "bg-primary/15 text-primary"
                    )}
                    onClick={() => onSelectGame(-1)}
                >
                    <Home className={cn("w-4 h-4", selectedGameId === -1 ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn(selectedGameId === -1 ? "text-primary font-semibold" : "text-muted-foreground")}>Home</span>
                </button>

                <button
                    className="flex items-center px-4 py-2.5 gap-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                    onClick={() => setIsChatVisible(true)}
                >
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Global Chat</span>
                </button>
            </div>

            {/* Header */}
            <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-foreground text-lg font-bold tracking-wide">LIBRARY</h2>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search"
                            className="h-8 pl-7 bg-muted/60 border-border text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-primary"
                        />
                    </div>
                    <button
                        className="p-1.5 bg-muted/60 border border-border rounded hover:border-primary transition-colors"
                        onClick={() => setFilterExpanded(!filterExpanded)}
                    >
                        <Filter className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {filterExpanded && (
                <div className="px-4 pb-2">
                    <div className="bg-muted p-3 rounded text-xs text-foreground">
                        Sort by: Name (A-Z)
                    </div>
                </div>
            )}

            {/* Section Header */}
            <div className="flex items-center justify-between px-4 py-2 group cursor-pointer hover:bg-muted/40">
                <span className="text-muted-foreground text-[11px] font-bold group-hover:text-foreground">GAMES AND SOFTWARE</span>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col pb-2">
                    {filteredGames.length === 0 && (
                        <div className="px-4 py-2 text-muted-foreground text-xs italic">
                            No games found
                        </div>
                    )}

                    {filteredGames.map(game => (
                        <button
                            key={game.id}
                            className={cn(
                                "flex items-center px-4 py-1.5 gap-2 w-full text-left transition-colors hover:bg-muted/40 min-w-0 overflow-hidden",
                                selectedGameId === game.id && "bg-primary/15 hover:bg-primary/20 border-l-2 border-primary"
                            )}
                            onClick={() => onSelectGame(game.id)}
                        >
                            <div className="w-4 h-4 bg-muted rounded-sm flex-shrink-0 overflow-hidden">
                                {getCoverImageSrc(game.localCoverImage, game.coverImage) && (
                                    <img src={getCoverImageSrc(game.localCoverImage, game.coverImage)} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>
                            <div className={cn(
                                "text-[13px] text-left truncate flex-1 min-w-0 w-0 flex items-center gap-1.5",
                                selectedGameId === game.id ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                            )}>
                                <span className="truncate">{game.title}</span>
                                {game.isFavorite && (
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    ))}

                    {/* MODS Section */}
                    {filteredMods.length > 0 && (
                        <>
                            <div className="flex items-center gap-2 px-4 py-2 mt-2 border-t border-border">
                                <Puzzle className="w-3 h-3 text-muted-foreground" />
                                <span className="text-muted-foreground text-[11px] font-bold">MODS</span>
                            </div>
                            {filteredMods.map(mod => (
                                <button
                                    key={mod.id}
                                    className={cn(
                                        "flex items-center px-4 py-1.5 gap-2 w-full text-left transition-colors hover:bg-muted/40 min-w-0 overflow-hidden",
                                        selectedGameId === mod.id && "bg-primary/15 hover:bg-primary/20 border-l-2 border-primary"
                                    )}
                                    onClick={() => onSelectGame(mod.id)}
                                >
                                    <div className="w-4 h-4 bg-muted rounded-sm flex-shrink-0 overflow-hidden">
                                        {getCoverImageSrc(mod.localCoverImage, mod.coverImage) && (
                                            <img src={getCoverImageSrc(mod.localCoverImage, mod.coverImage)} className="w-full h-full object-cover" alt="" />
                                        )}
                                    </div>
                                    <div className={cn(
                                        "text-[13px] text-left truncate flex-1 min-w-0 w-0 flex items-center gap-1.5",
                                        selectedGameId === mod.id ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                                    )}>
                                        <span className="truncate">{mod.title}</span>
                                        {mod.isFavorite && (
                                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-border/60 bg-card">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center text-muted-foreground hover:text-foreground transition-colors gap-2 w-full">
                            <Plus className="w-4 h-4" />
                            <span className="text-xs font-bold">Add a Game</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-[200px] bg-card border-border text-foreground">
                        <DropdownMenuItem onClick={handleAddGameFolder} className="hover:bg-muted cursor-pointer gap-2">
                            <Folder className="w-4 h-4" />
                            <span>Add from Folder</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleAddGameArchive} className="hover:bg-muted cursor-pointer gap-2">
                            <File className="w-4 h-4" />
                            <span>Add from Archive</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
