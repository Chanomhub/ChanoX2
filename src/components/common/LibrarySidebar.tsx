import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Home, MessageSquare, Search, Filter, Plus, Clock, Star } from 'lucide-react';
import { useLibrary } from '@/contexts/LibraryContext';

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
    const { libraryItems } = useLibrary();
    const [isChatVisible, setIsChatVisible] = useState(false);
    // Suppress unused warning
    void isChatVisible;

    const [filterExpanded, setFilterExpanded] = useState(false);

    const filteredGames = libraryItems
        .filter((item) => {
            const name = item.title || '';
            return name.toLowerCase().includes((searchQuery || '').toLowerCase());
        })
        .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return (a.title || '').localeCompare(b.title || '');
        });

    if (collapsed) {
        return (
            <div className="w-[60px] bg-[#161920] border-r border-[#1a1d26] flex flex-col items-center pt-2 h-full">
                <button
                    className="p-3 text-[#b8b6b4] hover:text-white hover:bg-[#1f242e] rounded w-full flex justify-center"
                    onClick={() => onSelectGame(-1)}
                >
                    <Home className="w-5 h-5" />
                </button>
                <button className="p-3 text-[#b8b6b4] hover:text-white hover:bg-[#1f242e] rounded w-full flex justify-center">
                    <Clock className="w-5 h-5" />
                </button>

                <div className="h-px w-4/5 bg-[#2b2f38] my-2" />

                <ScrollArea className="flex-1 w-full">
                    <div className="flex flex-col items-center gap-1 pb-2">
                        {filteredGames.map(game => (
                            <button
                                key={game.id}
                                className={cn(
                                    "w-10 h-10 rounded flex items-center justify-center transition-colors",
                                    selectedGameId === game.id ? "bg-[#3d4450]" : "bg-[#2a2e36] hover:bg-[#32363e]"
                                )}
                                onClick={() => onSelectGame(game.id)}
                                title={game.title}
                            >
                                {game.coverImage ? (
                                    <img
                                        src={game.coverImage}
                                        alt={game.title}
                                        className="w-full h-full object-cover rounded"
                                    />
                                ) : (
                                    <span className="text-white font-bold text-xs">
                                        {(game.title).substring(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        );
    }

    return (
        <div className="w-[280px] bg-[#161920] border-r border-[#1a1d26] flex flex-col h-full">
            {/* Nav Items */}
            <div className="flex flex-col">
                <button
                    className={cn(
                        "flex items-center px-4 py-2.5 gap-3 text-sm font-medium transition-colors hover:bg-[#1f242e]",
                        selectedGameId === -1 && "bg-[#1f242e]"
                    )}
                    onClick={() => onSelectGame(-1)}
                >
                    <Home className="w-4 h-4 text-[#b8b6b4]" />
                    <span className="text-[#b8b6b4]">Home</span>
                </button>

                <button
                    className="flex items-center px-4 py-2.5 gap-3 text-sm font-medium hover:bg-[#1f242e] transition-colors"
                    onClick={() => setIsChatVisible(true)}
                >
                    <MessageSquare className="w-4 h-4 text-[#b8b6b4]" />
                    <span className="text-[#b8b6b4]">Global Chat</span>
                </button>
            </div>

            {/* Header */}
            <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-[#fff] text-lg font-bold tracking-wide">LIBRARY</h2>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#565b64]" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search"
                            className="h-8 pl-7 bg-[#1f2126] border-[#2b2f38] text-[13px] text-[#dcdedf] placeholder:text-[#565b64] focus-visible:ring-0 focus-visible:border-[#66c0f4]"
                        />
                    </div>
                    <button
                        className="p-1.5 bg-[#1f2126] border border-[#2b2f38] rounded hover:border-[#66c0f4] transition-colors"
                        onClick={() => setFilterExpanded(!filterExpanded)}
                    >
                        <Filter className="w-4 h-4 text-[#565b64]" />
                    </button>
                </div>
            </div>

            {filterExpanded && (
                <div className="px-4 pb-2">
                    <div className="bg-[#1f2126] p-3 rounded text-xs text-[#dcdedf]">
                        Sort by: Name (A-Z)
                    </div>
                </div>
            )}

            {/* Section Header */}
            <div className="flex items-center justify-between px-4 py-2 group cursor-pointer hover:bg-[#1f242e]">
                <span className="text-[#6e7681] text-[11px] font-bold group-hover:text-[#dcdedf]">GAMES AND SOFTWARE</span>
            </div>

            <ScrollArea className="flex-1">
                <div className="flex flex-col pb-2">
                    {filteredGames.length === 0 && (
                        <div className="px-4 py-2 text-[#6e7681] text-xs italic">
                            No games found
                        </div>
                    )}

                    {filteredGames.map(game => (
                        <button
                            key={game.id}
                            className={cn(
                                "flex items-center px-4 py-1.5 gap-2 w-full text-left transition-colors hover:bg-[#1f242e] min-w-0 overflow-hidden",
                                selectedGameId === game.id && "bg-[#3d4450] hover:bg-[#3d4450]"
                            )}
                            onClick={() => onSelectGame(game.id)}
                        >
                            <div className="w-4 h-4 bg-[#2a2e36] flex-shrink-0">
                                {game.coverImage && (
                                    <img src={game.coverImage} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>
                            <div className={cn(
                                "text-[13px] text-left truncate flex-1 min-w-0 w-0 flex items-center gap-1.5",
                                selectedGameId === game.id ? "text-white" : "text-[#969696]"
                            )}>
                                <span className="truncate">{game.title}</span>
                                {game.isFavorite && (
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-[#2b2f38] bg-[#161920]">
                <button className="flex items-center text-[#6e7681] hover:text-white transition-colors gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="text-xs font-bold">Add a Game</span>
                </button>
            </div>
        </div>
    );
}
