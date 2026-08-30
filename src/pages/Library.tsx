import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '@/contexts/LibraryContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePendingGameLaunch } from '@/hooks/usePendingGameLaunch';
import LibrarySidebar from '@/components/common/LibrarySidebar';
import LibraryGameDetail from '@/components/common/LibraryGameDetail';
import { Play, Loader2, Gamepad2, Compass, Zap, Sparkles, Clock, HardDrive } from 'lucide-react';
import { SafeImage } from '@/components/common/SafeImage';
import { Button } from '@/components/ui/Button';

export default function Library() {
    const { libraryItems } = useLibrary();
    const { language } = useLanguage();
    const navigate = useNavigate();
    const isThai = language === 'th';
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
        console.log('Library received pending game launch:', gameId);
        const numericId = Number(gameId);
        const game = libraryItems.find(item => item.id === numericId);
        if (game) {
            setSelectedGameId(numericId);
            setAutoLaunchGameId(numericId); // Trigger auto-launch
        } else {
            console.warn('Game not found in library:', gameId);
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
                                searchQuery ? (
                                    <div className="text-[#8b929a] text-sm py-12 text-center bg-[#151f2c] rounded-xl border border-[#253247]">
                                        <p>{isThai ? 'ไม่พบเกมที่ตรงกับการค้นหา' : 'No games match your search'}</p>
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="mt-2 text-xs text-rose-400 hover:underline"
                                        >
                                            {isThai ? 'ล้างคำค้นหา' : 'Clear search'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl bg-gradient-to-b from-[#16202e]/80 to-[#101722]/80 border border-[#253247] shadow-xl text-center max-w-2xl mx-auto my-6 animate-in fade-in-50 duration-300">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500/20 via-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shadow-lg shadow-rose-500/10 mb-4">
                                            <Gamepad2 className="w-8 h-8 text-rose-400" />
                                        </div>

                                        <h3 className="text-lg font-bold text-white tracking-wide">
                                            {isThai ? 'คลังเกมของคุณยังว่างอยู่' : 'Your Library is Empty'}
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-1.5 max-w-md leading-relaxed">
                                            {isThai
                                                ? 'เริ่มต้นดาวน์โหลดเกมจาก Store แล้วระบบจะจัดการแตกไฟล์ จัดเก็บลงไดรฟ์ และนำมาแสดงที่นี่ให้คุณกดเล่นได้ทันที!'
                                                : 'Discover and download titles from the Store. ChanoX2 will automatically unpack and organize them here ready to play!'}
                                        </p>

                                        <div className="flex items-center gap-3 mt-6">
                                            <Button
                                                onClick={() => navigate('/')}
                                                className="bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-semibold px-5 h-9 shadow-lg shadow-rose-600/20 flex items-center gap-2"
                                            >
                                                <Compass className="w-4 h-4" />
                                                {isThai ? 'ไปสำรวจเกมใน Store' : 'Explore Games'}
                                            </Button>

                                            <Button
                                                onClick={() => navigate('/settings')}
                                                variant="outline"
                                                className="bg-[#182232] border-[#253247] hover:bg-[#202d42] text-zinc-300 text-xs h-9 flex items-center gap-2"
                                            >
                                                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                                                {isThai ? 'ตั้งค่าโฟลเดอร์' : 'Storage Path'}
                                            </Button>
                                        </div>

                                        {/* Value Props Row */}
                                        <div className="grid grid-cols-3 gap-3 w-full max-w-lg mt-8 pt-6 border-t border-white/5 text-left">
                                            <div className="p-2.5 rounded-lg bg-[#111722] border border-white/5">
                                                <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-semibold">
                                                    <Zap className="w-3.5 h-3.5" />
                                                    <span>{isThai ? 'แตกไฟล์ออโต้' : 'Auto Unpack'}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-400 mt-1">
                                                    {isThai ? 'ระบบ 7-Zip ทำงานอัตโนมัติ' : 'Fast 7-Zip integration'}
                                                </p>
                                            </div>

                                            <div className="p-2.5 rounded-lg bg-[#111722] border border-white/5">
                                                <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{isThai ? 'นับเวลาเล่น' : 'Playtime Track'}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-400 mt-1">
                                                    {isThai ? 'บันทึกชั่วโมงเล่นทุกเกม' : 'Track your game hours'}
                                                </p>
                                            </div>

                                            <div className="p-2.5 rounded-lg bg-[#111722] border border-white/5">
                                                <div className="flex items-center gap-1.5 text-purple-400 text-[11px] font-semibold">
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    <span>{isThai ? 'เปิดเล่นง่าย' : 'One-Click Play'}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-400 mt-1">
                                                    {isThai ? 'รองรับ Wine/Proton ครบ' : 'Wine & Proton support'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
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
                                                    <SafeImage
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
