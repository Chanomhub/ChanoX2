import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
    Search,
    Type,
    Check,
    Globe,
    Cpu,
    HelpCircle,
    FileText,
    Loader2
} from 'lucide-react';

interface FontAsset {
    id: string;
    key: string;
    url: string;
    bucket: string;
    createdAt?: string;
}

interface Font {
    id: number;
    name: string;
    slug: string;
    engine: string;
    engineVersion?: string | null;
    language: string;
    assets: FontAsset[];
}

interface FontSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fonts: Font[];
    selectedFontId: string;
    onSelectFont: (fontId: string) => void;
    loading?: boolean;
}

export function FontSelectionDialog({
    open,
    onOpenChange,
    fonts,
    selectedFontId,
    onSelectFont,
    loading = false
}: FontSelectionDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFonts = useMemo(() => {
        return fonts.filter(font => {
            const matchesSearch =
                font.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                font.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (font.engineVersion && font.engineVersion.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesSearch;
        });
    }, [fonts, searchQuery]);

    const activeFont = useMemo(() => {
        return fonts.find(f => String(f.id) === selectedFontId);
    }, [fonts, selectedFontId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] max-h-[85vh] bg-[#1b2838] border-[#2a475e] text-[#dcdedf] flex flex-col p-6">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                        <Type className="w-5 h-5 text-[#66c0f4]" />
                        เลือกฟอนต์สำหรับแปลเกม (Select Translation Font)
                    </DialogTitle>
                    <p className="text-xs text-[#8b929a] mt-1">
                        เลือกฟอนต์ที่ต้องการใช้ในการแสดงผลข้อความแปลภาษาของเกมประเภท Unity ในคลังของคุณ
                    </p>
                </DialogHeader>

                {/* Active Font Status */}
                <div className="bg-[#101822] border border-[#2a475e]/60 rounded p-3 flex items-center justify-between gap-4">
                    <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">ฟอนต์ที่เลือกขณะนี้</span>
                        <span className="text-sm font-semibold text-white">
                            {activeFont ? activeFont.name : 'Default Font (ระบบเลือกให้อัตโนมัติ)'}
                        </span>
                        {activeFont && activeFont.engineVersion && (
                            <span className="text-xs text-zinc-400 block mt-0.5">
                                รองรับเวอร์ชั่น: {activeFont.engineVersion}
                            </span>
                        )}
                    </div>
                    {selectedFontId !== '' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectFont('')}
                            className="text-xs text-[#f38181] hover:text-red-400 hover:bg-[#f38181]/10 h-8"
                        >
                            Reset to Default
                        </Button>
                    )}
                </div>

                {/* Search Box */}
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7681]" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาชื่อฟอนต์ หรือเวอร์ชั่นเกมที่รองรับ..."
                        className="pl-10 bg-[#101214] border-[#2a2e36] text-[#dcdedf] focus:border-[#66c0f4] h-9"
                    />
                </div>

                {/* Fonts List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-[#8b929a]">
                        <Loader2 className="w-8 h-8 animate-spin text-[#66c0f4] mb-2" />
                        <span className="text-sm">กำลังโหลดรายการฟอนต์...</span>
                    </div>
                ) : (
                    <ScrollArea className="flex-1 mt-4 rounded-md border border-[#2a2e36] bg-[#101214] max-h-[350px] min-h-[200px] overflow-y-auto">
                        <div className="p-2 space-y-2">
                            {/* Default Font Option */}
                            <div
                                onClick={() => onSelectFont('')}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded cursor-pointer transition-colors border",
                                    selectedFontId === ''
                                        ? "bg-[#1b2838] border-[#66c0f4] text-white"
                                        : "bg-transparent border-transparent hover:bg-[#202b38]/40 hover:border-[#2a475e]/30"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded bg-zinc-800 text-zinc-400">
                                        <HelpCircle className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">Default Font (ระบบเลือกให้อัตโนมัติ)</div>
                                        <div className="text-[10px] text-[#8b929a] mt-0.5">ใช้ฟอนต์เริ่มต้นที่มีอยู่ในระบบติดตั้งของ Auto-Translator</div>
                                    </div>
                                </div>
                                {selectedFontId === '' && (
                                    <div className="p-1 rounded-full bg-[#66c0f4] text-black">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                )}
                            </div>

                            {/* Custom Fonts */}
                            {filteredFonts.map((font) => {
                                const isSelected = String(font.id) === selectedFontId;
                                return (
                                    <div
                                        key={font.id}
                                        onClick={() => onSelectFont(String(font.id))}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded cursor-pointer transition-colors border",
                                            isSelected
                                                ? "bg-[#1b2838] border-[#66c0f4] text-white"
                                                : "bg-transparent border-transparent hover:bg-[#202b38]/40 hover:border-[#2a475e]/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                                            <div className={cn(
                                                "p-2 rounded",
                                                isSelected ? "bg-[#66c0f4]/15 text-[#66c0f4]" : "bg-[#2a475e]/30 text-[#8b929a]"
                                            )}>
                                                <Type className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-sm truncate">{font.name}</div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-[#8b929a]">
                                                    <span className="flex items-center gap-1">
                                                        <Globe className="w-3 h-3" /> Language: <span className="text-zinc-300 uppercase">{font.language}</span>
                                                    </span>
                                                    {font.engineVersion && (
                                                        <span className="flex items-center gap-1">
                                                            <Cpu className="w-3 h-3" /> Version: <span className="text-zinc-300">{font.engineVersion}</span>
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> Files: <span className="text-zinc-300">{font.assets?.length || 0}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="p-1 rounded-full bg-[#66c0f4] text-black shrink-0">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {filteredFonts.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-[#6e7681]">
                                    <Type className="w-8 h-8 mb-2 opacity-50" />
                                    <span className="text-sm">ไม่พบฟอนต์ที่ค้นหา</span>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter className="mt-4 pt-2 border-t border-[#2a2e36] flex items-center justify-between gap-4">
                    <div className="text-[10px] text-[#6e7681]">
                        * ฟอนต์จะถูกนำไปติดตั้งลงในโฟลเดอร์ของเกมและเริ่มใช้งานเมื่อเปิดเกมรอบถัดไป
                    </div>
                    <Button
                        onClick={() => onOpenChange(false)}
                        className="bg-[#2a475e] hover:bg-[#3d5a73] text-white px-4 h-9"
                    >
                        ตกลง
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default FontSelectionDialog;
