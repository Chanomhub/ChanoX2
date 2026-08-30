import { useState, useEffect } from 'react';
import {
    Compass, LayoutGrid, Download, MessageSquare,
    ChevronRight, ChevronLeft, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const SPOTLIGHT_STORAGE_KEY = 'chanox2_ftue_spotlight_completed';

interface TourStep {
    id: string;
    titleTh: string;
    titleEn: string;
    descTh: string;
    descEn: string;
    icon: any;
    accentColor: string;
    badgeTh: string;
    badgeEn: string;
    highlightPosition: 'top-left' | 'top-right' | 'center' | 'bottom-right';
}

const TOUR_STEPS: TourStep[] = [
    {
        id: 'store-search',
        titleTh: '1. คลังเกม & ระบบค้นหาอัจฉริยะ',
        titleEn: '1. Game Catalog & Smart Search',
        descTh: 'สำรวจเกมมากมายในแคตตาล็อก กรองตามหมวดหมู่ แท็กยอดนิยม หรือพิมพ์ค้นหาตามชื่อได้อย่างแม่นยำ',
        descEn: 'Discover a massive catalog of games. Filter by tags, categories, or search by title seamlessly.',
        icon: Compass,
        accentColor: 'from-rose-500 to-amber-500',
        badgeTh: 'ค้นหาง่าย',
        badgeEn: 'Easy Discovery',
        highlightPosition: 'top-left',
    },
    {
        id: 'view-mode',
        titleTh: '2. ปรับแต่งมุมมอง (Grid & List Mode)',
        titleEn: '2. Customizable View Modes',
        descTh: 'สลับมุมมองได้อิสระระหว่าง Poster Grid (ภาพโปสเตอร์ขนาดใหญ่) หรือ Steam-style List (ข้อมูลกระชับ อ่านง่าย)',
        descEn: 'Switch between rich visual Poster Grid or compact Steam-style Table List based on your preference.',
        icon: LayoutGrid,
        accentColor: 'from-purple-500 to-indigo-500',
        badgeTh: 'ยืดหยุ่น',
        badgeEn: 'Customizable',
        highlightPosition: 'top-right',
    },
    {
        id: 'auto-extract',
        titleTh: '3. แตกไฟล์ & พร้อมเล่นอัตโนมัติ',
        titleEn: '3. One-Click Auto-Extract & Play',
        descTh: 'เมื่อดาวน์โหลดเสร็จ ระบบ 7-Zip จะทำการแตกไฟล์ จัดการโฟลเดอร์ และเพิ่มเข้า Library พร้อมกดเล่นได้ทันที โดยไม่ต้องแตกไฟล์เอง',
        descEn: 'Once downloaded, our built-in 7-Zip engine unpacks the game automatically and adds it to your Library ready to play.',
        icon: Download,
        accentColor: 'from-emerald-500 to-teal-500',
        badgeTh: 'ไม่ต้องแตกไฟล์เอง',
        badgeEn: 'Auto Unpack',
        highlightPosition: 'center',
    },
    {
        id: 'community-chat',
        titleTh: '4. คอมมูนิตี้ & เว็บไซต์ Deep Link',
        titleEn: '4. Realtime Chat & Web Deep Linking',
        descTh: 'พูดคุยแลกเปลี่ยนกับผู้เล่นอื่นผ่านแชทสดมุมขวาล่าง และสามารถกดปุ่ม "เปิดด้วย ChanoX2" จากหน้าเว็บ ChanomHub เพื่อสั่งโหลดตรงได้ทันที!',
        descEn: 'Chat with other players live at the bottom-right, and click "Open with ChanoX2" from the website to trigger instant downloads!',
        icon: MessageSquare,
        accentColor: 'from-blue-500 to-cyan-500',
        badgeTh: 'เชื่อมต่อครบวงจร',
        badgeEn: 'Seamless Ecosystem',
        highlightPosition: 'bottom-right',
    },
];

interface SpotlightTourProps {
    forceOpen?: boolean;
    onClose?: () => void;
}

export default function SpotlightTour({ forceOpen = false, onClose }: SpotlightTourProps) {
    const { language } = useLanguage();
    const isThai = language === 'th';

    const [isVisible, setIsVisible] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        if (forceOpen) {
            setIsVisible(true);
            setCurrentStepIndex(0);
            return;
        }

        const isCompleted = localStorage.getItem(SPOTLIGHT_STORAGE_KEY);
        if (!isCompleted) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [forceOpen]);

    const handleNext = () => {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem(SPOTLIGHT_STORAGE_KEY, 'true');
        setIsVisible(false);
        if (onClose) onClose();
    };

    if (!isVisible) return null;

    const currentStep = TOUR_STEPS[currentStepIndex];
    const IconComponent = currentStep.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Spotlight Card */}
            <div className="relative w-full max-w-lg bg-[#111722] border border-[#2d3a4f] rounded-2xl shadow-2xl overflow-hidden text-white animate-in zoom-in-95 duration-200">
                {/* Top Glowing Gradient Bar */}
                <div className={cn("h-1.5 w-full bg-gradient-to-r", currentStep.accentColor)} />

                {/* Card Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-white/10 text-zinc-300 border border-white/5">
                                {isThai ? currentStep.badgeTh : currentStep.badgeEn}
                            </span>
                            <span className="text-xs text-zinc-400 font-mono">
                                Step {currentStepIndex + 1} / {TOUR_STEPS.length}
                            </span>
                        </div>

                        <button
                            onClick={handleComplete}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            title={isThai ? 'ข้ามคำแนะนำ' : 'Skip tour'}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Step Icon & Title */}
                    <div className="flex items-center gap-3.5 mt-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-tr shadow-lg shrink-0", currentStep.accentColor)}>
                            <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white tracking-wide">
                                {isThai ? currentStep.titleTh : currentStep.titleEn}
                            </h3>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                {isThai ? 'ฟีเจอร์เด่นของ ChanoX2 Hub' : 'Key ChanoX2 feature'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Step Description */}
                <div className="px-6 py-3">
                    <div className="p-4 rounded-xl bg-[#182232] border border-[#253247] text-xs text-zinc-300 leading-relaxed">
                        {isThai ? currentStep.descTh : currentStep.descEn}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 pt-3 flex items-center justify-between">
                    {/* Step Dots */}
                    <div className="flex items-center gap-1.5">
                        {TOUR_STEPS.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentStepIndex(idx)}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    currentStepIndex === idx
                                        ? "w-6 bg-rose-500 shadow-sm shadow-rose-500/50"
                                        : "w-2 bg-zinc-700 hover:bg-zinc-500"
                                )}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {currentStepIndex > 0 ? (
                            <Button
                                variant="outline"
                                onClick={handlePrev}
                                className="bg-[#182232] border-[#253247] hover:bg-[#1e2a3d] text-zinc-300 text-xs h-8 px-3"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                                {isThai ? 'ก่อนหน้า' : 'Back'}
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                onClick={handleComplete}
                                className="text-zinc-500 hover:text-zinc-300 text-xs h-8 px-2"
                            >
                                {isThai ? 'ข้าม' : 'Skip'}
                            </Button>
                        )}

                        {currentStepIndex < TOUR_STEPS.length - 1 ? (
                            <Button
                                onClick={handleNext}
                                className="bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-medium text-xs h-8 px-3.5 shadow-md shadow-rose-600/20"
                            >
                                {isThai ? 'ถัดไป' : 'Next'}
                                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleComplete}
                                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-xs h-8 px-4 shadow-md shadow-emerald-600/20"
                            >
                                {isThai ? 'เข้าใจแล้ว' : 'Got it!'}
                                <Check className="w-3.5 h-3.5 ml-1" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
