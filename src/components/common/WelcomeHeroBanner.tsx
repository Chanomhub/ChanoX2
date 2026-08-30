import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, HardDrive, MessageSquare, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettingsStore } from '@/stores/settingsStore';

const WELCOME_BANNER_STORAGE_KEY = 'chanox2_hide_welcome_banner_v1';

export default function WelcomeHeroBanner() {
    const { language } = useLanguage();
    const isThai = language === 'th';
    const navigate = useNavigate();
    const { downloadPath } = useSettingsStore();

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const isHidden = localStorage.getItem(WELCOME_BANNER_STORAGE_KEY);
        if (!isHidden) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(WELCOME_BANNER_STORAGE_KEY, 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="mx-6 mt-4 mb-2 p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-[#121b2a] border border-rose-500/20 shadow-lg text-white animate-in fade-in-50 duration-300">
            <div className="flex items-start justify-between gap-4">
                {/* Left Info */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-rose-400" />
                            {isThai ? 'ยินดีต้อนรับสู่ ChanoX2 Hub!' : 'Welcome to ChanoX2 Hub!'}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-semibold border border-rose-500/20">
                            v1.6
                        </span>
                    </div>

                    <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                        {isThai
                            ? 'ศูนย์รวมและจัดการเกม ค้นหา ดาวน์โหลด แตกไฟล์อัตโนมัติ และเปิดเล่นได้ทันที พร้อมระบบแชทคอมมูนิตี้แบบเรียลไทม์'
                            : 'Discover, download, auto-unpack, and launch games seamlessly with built-in real-time community chat.'}
                    </p>

                    {/* Quick Feature Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161d28]/80 border border-[#2d3a4f]/50 text-[11px] text-zinc-300">
                            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{isThai ? 'แตกไฟล์ออโต้ (7-Zip)' : 'Auto-Extract (7-Zip)'}</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161d28]/80 border border-[#2d3a4f]/50 text-[11px] text-zinc-300">
                            <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate max-w-[200px]">
                                {downloadPath ? (isThai ? `โฟลเดอร์: ${downloadPath}` : `Path: ${downloadPath}`) : (isThai ? 'โฟลเดอร์เริ่มต้นระบบ' : 'Default Library')}
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161d28]/80 border border-[#2d3a4f]/50 text-[11px] text-zinc-300">
                            <MessageSquare className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>{isThai ? 'แชทสดมุมขวาล่าง' : 'Live Community Chat'}</span>
                        </div>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        onClick={() => navigate('/settings')}
                        variant="outline"
                        size="sm"
                        className="bg-[#182232] hover:bg-[#202d42] border-[#2d3a4f] text-zinc-200 text-xs h-8 flex items-center gap-1.5"
                    >
                        <Settings className="w-3.5 h-3.5 text-zinc-400" />
                        {isThai ? 'ตั้งค่า' : 'Settings'}
                    </Button>

                    <button
                        onClick={handleDismiss}
                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
                        title={isThai ? 'ปิดการแจ้งเตือน' : 'Dismiss banner'}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
