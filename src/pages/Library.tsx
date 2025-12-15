import { useState, useCallback } from 'react';
import { useLibrary } from '@/contexts/LibraryContext';
import { usePendingGameLaunch } from '@/hooks/usePendingGameLaunch';
import LibrarySidebar from '@/components/common/LibrarySidebar';
import LibraryGameDetail from '@/components/common/LibraryGameDetail';
import { Play, Loader2 } from 'lucide-react';

export default function Library() {
    const { libraryItems } = useLibrary();
    const [selectedGameId, setSelectedGameId] = useState<number | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [autoLaunchGameId, setAutoLaunchGameId] = useState<number | undefined>();

    // Filter games by search
    const filteredGames = libraryItems.filter(item => {
        const name = item.title || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const selectedGame = libraryItems.find(item => item.id === selectedGameId);

    const handleSelectGame = (id: number) => {
        if (id === -1) {
            setSelectedGameId(undefined);
        } else {
            setSelectedGameId(id);
        }
        setAutoLaunchGameId(undefined); // Clear auto-launch when manually selecting
    };

    // Handle pending game launch from shortcuts
    const handlePendingLaunch = useCallback((gameId: string) => {
        console.log('🎮 Library received pending game launch:', gameId);
        const numericId = Number(gameId);
        const game = libraryItems.find(item => item.id === numericId);
        if (game) {
            setSelectedGameId(numericId);
            setAutoLaunchGameId(numericId); // Trigger auto-launch
        } else {
            console.warn('⚠️ Game not found in library:', gameId);
        }
    }, [libraryItems]);

    usePendingGameLaunch(handlePendingLaunch);

    // Clear auto-launch after it's been handled
    const handleAutoLaunchComplete = useCallback(() => {
        setAutoLaunchGameId(undefined);
    }, []);

    return (
        <div className="flex h-full bg-[#1b2838] overflow-hidden">
            <LibrarySidebar
                onSelectGame={handleSelectGame}
                selectedGameId={selectedGameId}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            <div className="flex-1 min-w-0">
                {selectedGame ? (
                    <LibraryGameDetail
                        libraryItem={selectedGame}
                        onBack={() => setSelectedGameId(undefined)}
                        autoLaunch={autoLaunchGameId === selectedGame.id}
                        onAutoLaunchComplete={handleAutoLaunchComplete}
                    />
                ) : (
                    <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#2a475e] scrollbar-track-[#1b2838]">

                        {/* All Games Grid */}
                        <div>
                            <div className="flex items-baseline mb-4">
                                <h2 className="text-[#dcdedf] font-bold text-sm mr-2">All Games</h2>
                                <span className="text-[#6e7681] text-xs">({filteredGames.length})</span>
                            </div>

                            {filteredGames.length === 0 ? (
                                <div className="text-[#8b929a] text-sm py-8 text-center">
                                    {searchQuery ? 'No games match your search' : 'Your library is empty. Download some games!'}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-4">
                                    {filteredGames.map(item => (
                                        <button
                                            key={item.id}
                                            className="group relative w-[160px] flex flex-col items-start transition-transform hover:scale-105"
                                            onClick={() => setSelectedGameId(item.id)}
                                        >
                                            <div className="w-full h-[220px] bg-[#2a475e] rounded shadow-lg overflow-hidden relative mb-2">
                                                {item.coverImage ? (
                                                    <img
                                                        src={item.coverImage}
                                                        className="w-full h-full object-cover"
                                                        alt={item.title}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
                                                )}

                                                {/* Play Overlay or Re-extracting Overlay */}
                                                {item.isReExtracting ? (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <Loader2 className="w-8 h-8 text-[#66c0f4] animate-spin" />
                                                    </div>
                                                ) : (
                                                    <div className="absolute bottom-2 right-2 w-8 h-8 bg-[#66c0f4] rounded-full items-center justify-center hidden group-hover:flex shadow-md">
                                                        <Play className="w-3 h-3 text-white fill-current ml-0.5" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[#dcdedf] text-[13px] font-medium truncate w-full text-left">
                                                {item.title}
                                            </span>
                                        </button>
                                    ))}

                                    {/* Add shelf fake button */}
                                    <button className="w-[160px] h-[220px] border border-dashed border-[#3d4450] rounded flex items-center justify-center text-[#6e7681] text-[13px] hover:text-[#dcdedf] hover:border-[#66c0f4] transition-colors">
                                        + Add shelf
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
