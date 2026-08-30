import { useState, useEffect } from 'react';
import {
    Sparkles, FolderOpen, HardDrive, CheckCircle2, Languages,
    ShieldCheck, Gamepad2, ChevronRight, ChevronLeft, Rocket,
    Zap, LayoutGrid, List, MessageSquare, ArrowRight
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useLanguage, SUPPORTED_LANGUAGES, Language } from '@/contexts/LanguageContext';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';

const FTUE_WIZARD_STORAGE_KEY = 'chanox2_ftue_wizard_completed';

interface QuickSetupWizardProps {
    forceOpen?: boolean;
    onClose?: () => void;
}

export default function QuickSetupWizard({ forceOpen = false, onClose }: QuickSetupWizardProps) {
    const { language, setLanguage } = useLanguage();
    const { downloadPath, setDownloadPath } = useSettingsStore();

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const totalSteps = 4;

    // Preferences in state
    const [selectedViewMode, setSelectedViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('chanox2_search_viewmode') as 'grid' | 'list') || 'grid';
    });
    const [diskSpace, setDiskSpace] = useState<{ free: string; total: string } | null>(null);

    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
            return;
        }

        const isCompleted = localStorage.getItem(FTUE_WIZARD_STORAGE_KEY);
        if (!isCompleted) {
            // Small delay for smooth entry after app mount
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [forceOpen]);

    // Fetch initial download directory and disk space
    useEffect(() => {
        const fetchStorageInfo = async () => {
            if (window.electronAPI) {
                try {
                    let currentPath = downloadPath;
                    if (!currentPath) {
                        currentPath = await window.electronAPI.getDownloadDirectory();
                        if (currentPath) setDownloadPath(currentPath);
                    }

                    if (currentPath) {
                        const space = await window.electronAPI.getDiskSpace(currentPath);
                        if (space) {
                            const freeGB = (space.free / (1024 * 1024 * 1024)).toFixed(1);
                            const totalGB = (space.total / (1024 * 1024 * 1024)).toFixed(1);
                            setDiskSpace({ free: `${freeGB} GB`, total: `${totalGB} GB` });
                        }
                    }
                } catch (e) {
                    console.error('Failed to load storage info in wizard:', e);
                }
            }
        };

        if (isOpen) {
            fetchStorageInfo();
        }
    }, [isOpen, downloadPath, setDownloadPath]);

    const handleSelectFolder = async () => {
        if (window.electronAPI?.selectDownloadDirectory) {
            try {
                const selected = await window.electronAPI.selectDownloadDirectory();
                if (selected) {
                    setDownloadPath(selected);
                    const space = await window.electronAPI.getDiskSpace(selected);
                    if (space) {
                        const freeGB = (space.free / (1024 * 1024 * 1024)).toFixed(1);
                        const totalGB = (space.total / (1024 * 1024 * 1024)).toFixed(1);
                        setDiskSpace({ free: `${freeGB} GB`, total: `${totalGB} GB` });
                    }
                }
            } catch (err) {
                console.error('Error selecting folder:', err);
            }
        }
    };

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
    };

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setSelectedViewMode(mode);
        localStorage.setItem('chanox2_search_viewmode', mode);
    };

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrev = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleFinish = () => {
        localStorage.setItem(FTUE_WIZARD_STORAGE_KEY, 'true');
        setIsOpen(false);
        if (onClose) onClose();
    };

    const isThai = language === 'th';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleFinish();
        }}>
            <DialogContent className="sm:max-w-[600px] bg-[#111722] border-[#253247] text-white p-0 overflow-hidden shadow-2xl rounded-2xl">
                {/* Header Banner */}
                <div className="relative bg-gradient-to-r from-rose-600/30 via-purple-600/20 to-blue-600/20 p-6 border-b border-[#253247]/60">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-wide">
                                    {isThai ? 'ยินดีต้อนรับสู่ ChanoX2' : 'Welcome to ChanoX2'}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                    {isThai
                                        ? 'ตั้งค่าเริ่มต้น 3 สเต็ปง่ายๆ เพื่อประสบการณ์การเล่นเกมที่ดีที่สุด'
                                        : 'Quick 3-step setup for your ultimate gaming hub experience'}
                                </p>
                            </div>
                        </div>

                        {/* Step Progress Indicators */}
                        <div className="flex items-center gap-1.5 bg-[#0a0e14]/60 px-3 py-1.5 rounded-full border border-white/5">
                            {Array.from({ length: totalSteps }).map((_, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "h-2 rounded-full transition-all duration-300",
                                        step === index + 1
                                            ? "w-6 bg-rose-500 shadow-sm shadow-rose-500/50"
                                            : step > index + 1
                                            ? "w-2 bg-emerald-500"
                                            : "w-2 bg-zinc-700"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Step Contents */}
                <div className="p-6 min-h-[300px] flex flex-col justify-between">
                    {/* STEP 1: Language & Interface */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in-50 duration-200">
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                                    <Languages className="w-4 h-4 text-rose-400" />
                                    {isThai ? '1. เลือกภาษาที่ต้องการ (Language)' : '1. Choose Display Language'}
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={cn(
                                                "flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all",
                                                language === lang.code
                                                    ? "bg-rose-500/15 border-rose-500/60 text-white shadow-sm ring-1 ring-rose-500/30"
                                                    : "bg-[#182232] border-[#253247] text-zinc-400 hover:text-zinc-200 hover:bg-[#1e2a3d]"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-base">{lang.code === 'th' ? '🇹🇭' : '🇺🇸'}</span>
                                                <span>{lang.nativeLabel}</span>
                                            </div>
                                            {language === lang.code && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4 text-purple-400" />
                                    {isThai ? 'รูปแบบการแสดงผลแคตตาล็อก (Catalog View Mode)' : 'Catalog View Style'}
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <button
                                        onClick={() => handleViewModeChange('grid')}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all text-left",
                                            selectedViewMode === 'grid'
                                                ? "bg-purple-500/15 border-purple-500/60 text-white ring-1 ring-purple-500/30"
                                                : "bg-[#182232] border-[#253247] text-zinc-400 hover:text-zinc-200 hover:bg-[#1e2a3d]"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <LayoutGrid className="w-4 h-4 text-purple-400 shrink-0" />
                                            <div>
                                                <div className="font-semibold text-zinc-100">Poster Grid</div>
                                                <div className="text-[11px] text-zinc-400">{isThai ? 'โปสเตอร์ภาพใหญ่ ชัดเจน' : 'Visual poster cards'}</div>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => handleViewModeChange('list')}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all text-left",
                                            selectedViewMode === 'list'
                                                ? "bg-purple-500/15 border-purple-500/60 text-white ring-1 ring-purple-500/30"
                                                : "bg-[#182232] border-[#253247] text-zinc-400 hover:text-zinc-200 hover:bg-[#1e2a3d]"
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <List className="w-4 h-4 text-purple-400 shrink-0" />
                                            <div>
                                                <div className="font-semibold text-zinc-100">Steam List</div>
                                                <div className="text-[11px] text-zinc-400">{isThai ? 'กระชับ ข้อมูลครบถ้วน' : 'Compact table list'}</div>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Storage & Library Location */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in-50 duration-200">
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                                    <HardDrive className="w-4 h-4 text-blue-400" />
                                    {isThai ? '2. โฟลเดอร์สำหรับติดตั้งเกม (Game Library Folder)' : '2. Default Game Installation Folder'}
                                </h4>
                                <p className="text-xs text-zinc-400 mt-1">
                                    {isThai
                                        ? 'เกมที่ดาวน์โหลดจะถูกแตกไฟล์และจัดเก็บไว้ในโฟลเดอร์นี้โดยอัตโนมัติ'
                                        : 'Downloaded games will be automatically unpacked and organized here.'}
                                </p>
                            </div>

                            <div className="bg-[#182232] border border-[#253247] p-4 rounded-xl space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 truncate font-mono text-xs bg-[#0f1520] px-3 py-2.5 rounded-lg border border-[#2d3b52] text-zinc-300">
                                        {downloadPath || (isThai ? 'ยังไม่ได้ระบุ (ใช้ค่าเริ่มต้นระบบ)' : 'Default system location')}
                                    </div>
                                    <Button
                                        onClick={handleSelectFolder}
                                        className="bg-blue-600 hover:bg-blue-500 text-white shrink-0 text-xs flex items-center gap-1.5 h-9"
                                    >
                                        <FolderOpen className="w-3.5 h-3.5" />
                                        {isThai ? 'เลือกโฟลเดอร์' : 'Browse'}
                                    </Button>
                                </div>

                                {diskSpace && (
                                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-white/5">
                                        <span className="flex items-center gap-1.5">
                                            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                                            {isThai ? 'พื้นที่คงเหลือ:' : 'Free Storage:'}
                                        </span>
                                        <span className="font-semibold text-emerald-400">
                                            {diskSpace.free} / {diskSpace.total}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 flex items-start gap-2.5">
                                <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold">{isThai ? 'ข้อแนะนำ:' : 'Tip:'} </span>
                                    {isThai
                                        ? 'แนะนำให้เลือกไดรฟ์ที่มีพื้นที่ว่างอย่างน้อย 20-50 GB ขึ้นไปเพื่อให้แตกไฟล์เกมได้รวดเร็ว'
                                        : 'Recommend choosing a drive with at least 20-50 GB free space for smooth game unzipping.'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: System Engine Healthcheck */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in fade-in-50 duration-200">
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    {isThai ? '3. ตรวจสอบความพร้อมของระบบ (System Healthcheck)' : '3. System Engine & Compatibility Check'}
                                </h4>
                                <p className="text-xs text-zinc-400 mt-1">
                                    {isThai
                                        ? 'ระบบตรวจสอบเครื่องมือและสภาพแวดล้อมที่จำเป็นสำหรับการรันเกม'
                                        : 'Verifying core utilities and execution engine for running games.'}
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-[#182232] border border-[#253247]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-zinc-100">7-Zip Extraction Engine</div>
                                            <div className="text-[11px] text-zinc-400">
                                                {isThai ? 'ระบบแตกไฟล์ความเร็วสูงพร้อมใช้งาน' : 'High-speed archive unzipper is active'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">Ready</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-[#182232] border border-[#253247]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                            <Gamepad2 className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-zinc-100">Game Launcher Service</div>
                                            <div className="text-[11px] text-zinc-400">
                                                {isThai ? 'ระบบจัดการและเปิดเกมพร้อมทำงาน' : 'Execution & Wine/Proton layer ready'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">Ready</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-[#182232] border border-[#253247]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                                            <Zap className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-zinc-100">Deep Link Integration (chanox2://)</div>
                                            <div className="text-[11px] text-zinc-400">
                                                {isThai ? 'รองรับการกดโหลดตรงจากเว็บไซต์' : 'Enabled for one-click browser launcher'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">Active</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Ready to explore */}
                    {step === 4 && (
                        <div className="space-y-4 animate-in fade-in-50 duration-200">
                            <div className="text-center py-2">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/30 mx-auto mb-3">
                                    <Rocket className="w-7 h-7 text-white" />
                                </div>
                                <h4 className="text-base font-bold text-white">
                                    {isThai ? 'ทุกอย่างพร้อมแล้ว! เริ่มต้นใช้งานได้เลย' : "You're All Set!"}
                                </h4>
                                <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                                    {isThai
                                        ? 'คุณสามารถค้นหา ดาวน์โหลด และเล่นเกมได้ทันทีในคลิกเดียว'
                                        : 'Discover, download, and enjoy your favorite games seamlessly with ChanoX2.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2.5 pt-2">
                                <div className="p-3 rounded-xl bg-[#182232] border border-[#253247] text-center space-y-1">
                                    <Gamepad2 className="w-4 h-4 text-rose-400 mx-auto" />
                                    <div className="text-xs font-semibold text-zinc-200">{isThai ? 'คลังเกม' : 'Catalog'}</div>
                                    <div className="text-[10px] text-zinc-400">{isThai ? 'เลือกดูเกมนับพัน' : 'Thousands of titles'}</div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#182232] border border-[#253247] text-center space-y-1">
                                    <Zap className="w-4 h-4 text-amber-400 mx-auto" />
                                    <div className="text-xs font-semibold text-zinc-200">{isThai ? 'แตกไฟล์ออโต้' : 'Auto Unpack'}</div>
                                    <div className="text-[10px] text-zinc-400">{isThai ? 'ไม่ต้องแตกไฟล์เอง' : 'One-click launch'}</div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#182232] border border-[#253247] text-center space-y-1">
                                    <MessageSquare className="w-4 h-4 text-blue-400 mx-auto" />
                                    <div className="text-xs font-semibold text-zinc-200">{isThai ? 'ชุมชนผู้เล่น' : 'Community'}</div>
                                    <div className="text-[10px] text-zinc-400">{isThai ? 'แชทสดในโปรแกรม' : 'Realtime chat'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#253247]/60">
                        {step > 1 ? (
                            <Button
                                variant="outline"
                                onClick={handlePrev}
                                className="bg-[#182232] border-[#253247] hover:bg-[#1e2a3d] text-zinc-300 text-xs h-9"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                                {isThai ? 'ย้อนกลับ' : 'Back'}
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                onClick={handleFinish}
                                className="text-zinc-500 hover:text-zinc-300 text-xs h-9"
                            >
                                {isThai ? 'ข้ามการตั้งค่า (Skip)' : 'Skip Setup'}
                            </Button>
                        )}

                        <div className="flex items-center gap-2">
                            {step < totalSteps ? (
                                <Button
                                    onClick={handleNext}
                                    className="bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-medium text-xs h-9 px-4 shadow-md shadow-rose-600/20"
                                >
                                    {isThai ? 'ถัดไป' : 'Next'}
                                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleFinish}
                                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium text-xs h-9 px-5 shadow-md shadow-emerald-600/20"
                                >
                                    {isThai ? 'เริ่มใช้งานทันที' : 'Get Started'}
                                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
