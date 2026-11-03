import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { SafeImage } from '@/components/common/SafeImage';
import { LibraryItem } from '@/types/libraryItem';
import { useLibrary } from '@/contexts/LibraryContext';
import { getGameBackgroundSrc } from '@/lib/coverImage';
import { client } from '@/libs/api/client';
import { GET_ARTICLE } from '@/libs/api/queries';
import { ArticleResponse } from '@/types/graphql';
import {
    Image as ImageIcon,
    FolderOpen,
    Link as LinkIcon,
    RotateCcw,
    Check,
    Loader2,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChangeBackgroundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    libraryItem: LibraryItem;
}

interface GalleryImageOption {
    id: string;
    url: string;
    label: string;
}

export function ChangeBackgroundDialog({
    open,
    onOpenChange,
    libraryItem
}: ChangeBackgroundDialogProps) {
    const { updateLibraryItem } = useLibrary();

    const [activeTab, setActiveTab] = useState<'local' | 'gallery' | 'url'>('local');
    const [selectedLocalPath, setSelectedLocalPath] = useState<string | null>(null);
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
    const [inputUrl, setInputUrl] = useState('');
    const [previewSrc, setPreviewSrc] = useState<string | null>(null);

    const [galleryImages, setGalleryImages] = useState<GalleryImageOption[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Initial background currently active
    const currentActiveBg = getGameBackgroundSrc(libraryItem);

    // Reset state whenever dialog opens
    useEffect(() => {
        if (open) {
            setSelectedLocalPath(null);
            setSelectedUrl(null);
            setInputUrl('');
            setErrorMsg(null);
            setIsSubmitting(false);
            setPreviewSrc(currentActiveBg || null);

            // Fetch game gallery if articleId exists
            if (libraryItem.articleId) {
                fetchGallery(Number(libraryItem.articleId));
            } else {
                setGalleryImages([]);
            }
        }
    }, [open, libraryItem.id, libraryItem.articleId, currentActiveBg]);

    const fetchGallery = async (articleId: number) => {
        setLoadingGallery(true);
        try {
            const data = await client.request<ArticleResponse>(GET_ARTICLE, {
                id: articleId
            });

            if (data?.article) {
                const options: GalleryImageOption[] = [];
                const addedUrls = new Set<string>();

                const addOpt = (url: string | null | undefined, label: string, id: string) => {
                    if (url && !addedUrls.has(url)) {
                        addedUrls.add(url);
                        options.push({ id, url, label });
                    }
                };

                addOpt(data.article.backgroundImage, 'พื้นหลังหลัก (Official Background)', 'bg');
                addOpt(data.article.mainImage, 'ภาพหลัก (Main Image)', 'main');
                addOpt(data.article.coverImage, 'ภาพปก (Cover Image)', 'cover');

                if (Array.isArray(data.article.images)) {
                    data.article.images.forEach((img, idx) => {
                        if (img?.url) {
                            addOpt(img.url, `ภาพตัวอย่างที่ ${idx + 1} (Screenshot)`, `ss-${idx}`);
                        }
                    });
                }

                setGalleryImages(options);
            }
        } catch (err) {
            console.warn('[ChangeBackgroundDialog] Failed to fetch gallery:', err);
        } finally {
            setLoadingGallery(false);
        }
    };

    // Handle picking local file from disk
    const handleBrowseLocal = async () => {
        setErrorMsg(null);
        if (!window.electronAPI?.selectGameBackground) {
            setErrorMsg('Electron API ไม่พร้อมใช้งาน');
            return;
        }

        try {
            const filePath = await window.electronAPI.selectGameBackground();
            if (filePath) {
                setSelectedLocalPath(filePath);
                setSelectedUrl(null);
                setPreviewSrc(`file://${filePath}`);
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการเลือกไฟล์');
        }
    };

    // Handle selecting an image from gallery
    const handleSelectGallery = (url: string) => {
        setSelectedUrl(url);
        setSelectedLocalPath(null);
        setPreviewSrc(url);
    };

    // Handle previewing typed URL
    const handleApplyInputUrl = () => {
        setErrorMsg(null);
        const trimmed = inputUrl.trim();
        if (!trimmed) {
            setErrorMsg('กรุณากรอก URL รูปภาพ');
            return;
        }
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            setErrorMsg('URL ต้องขึ้นต้นด้วย http:// หรือ https://');
            return;
        }

        setSelectedUrl(trimmed);
        setSelectedLocalPath(null);
        setPreviewSrc(trimmed);
    };

    // Save and apply background
    const handleSave = async () => {
        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            let finalBgPath: string | undefined = undefined;

            if (selectedLocalPath) {
                // Copy selected file to userData/game-backgrounds
                if (window.electronAPI?.saveGameBackground) {
                    const res = await window.electronAPI.saveGameBackground(libraryItem.id, selectedLocalPath);
                    if (res.success && res.localPath) {
                        finalBgPath = res.localPath;
                    } else {
                        throw new Error(res.error || 'ไม่สามารถบันทึกไฟล์ภาพพื้นหลังได้');
                    }
                } else {
                    finalBgPath = selectedLocalPath;
                }
            } else if (selectedUrl) {
                // Download remote image to cache locally for offline use
                if (window.electronAPI?.downloadGameBackground && selectedUrl.startsWith('http')) {
                    try {
                        const res = await window.electronAPI.downloadGameBackground(libraryItem.id, selectedUrl);
                        if (res.success && res.localPath) {
                            finalBgPath = res.localPath;
                        } else {
                            finalBgPath = selectedUrl;
                        }
                    } catch {
                        finalBgPath = selectedUrl;
                    }
                } else {
                    finalBgPath = selectedUrl;
                }
            } else {
                // No changes made
                onOpenChange(false);
                return;
            }

            if (finalBgPath) {
                updateLibraryItem(libraryItem.id, {
                    customBackgroundImage: finalBgPath
                });
            }

            onOpenChange(false);
        } catch (err: any) {
            console.error('Failed to save game background:', err);
            setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกภาพพื้นหลัง');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset background to default
    const handleReset = async () => {
        setIsSubmitting(true);
        try {
            if (window.electronAPI?.removeGameBackground) {
                await window.electronAPI.removeGameBackground(libraryItem.id);
            }
            updateLibraryItem(libraryItem.id, {
                customBackgroundImage: undefined
            });
            onOpenChange(false);
        } catch (err: any) {
            console.error('Failed to reset background:', err);
            setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการคืนค่าเริ่มต้น');
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasNewSelection = Boolean(selectedLocalPath || selectedUrl);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-card border border-border text-foreground p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 pb-4 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">
                                เปลี่ยนภาพพื้นหลังจอเกม
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                ปรับแต่งภาพพื้นหลังสำหรับ {libraryItem.title}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    {/* Live Preview Box */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                            <span>ตัวอย่างการแสดงผล (Preview)</span>
                            {libraryItem.customBackgroundImage && (
                                <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
                                    <Sparkles className="w-3 h-3" /> ใช้พื้นหลังกำหนดเองอยู่
                                </span>
                            )}
                        </div>

                        <div className="relative h-44 w-full rounded-lg overflow-hidden border border-border/80 bg-background/50 shadow-inner group">
                            {previewSrc ? (
                                <SafeImage
                                    src={previewSrc}
                                    className="w-full h-full object-cover"
                                    alt="Background preview"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                    <ImageIcon className="w-8 h-8 opacity-40" />
                                    <span className="text-xs">ยังไม่มีภาพพื้นหลัง</span>
                                </div>
                            )}

                            {/* Gradient Overlay & Title Preview */}
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent pointer-events-none" />
                            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between pointer-events-none">
                                <span className="text-foreground text-xl font-bold drop-shadow-md truncate max-w-[80%]">
                                    {libraryItem.title}
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm border border-border/60 text-muted-foreground">
                                    {selectedLocalPath ? 'ไฟล์ในเครื่อง' : selectedUrl ? 'ภาพออนไลน์' : 'ปัจจุบัน'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Source Selection Tabs */}
                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                        <TabsList className="grid grid-cols-3 w-full bg-muted/70 p-1">
                            <TabsTrigger value="local" className="text-xs font-medium gap-1.5">
                                <FolderOpen className="w-3.5 h-3.5" />
                                เครื่องนี้ (Local)
                            </TabsTrigger>
                            <TabsTrigger
                                value="gallery"
                                className="text-xs font-medium gap-1.5"
                                disabled={galleryImages.length === 0 && !loadingGallery}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                ภาพจากเกม ({galleryImages.length})
                            </TabsTrigger>
                            <TabsTrigger value="url" className="text-xs font-medium gap-1.5">
                                <LinkIcon className="w-3.5 h-3.5" />
                                ลิงก์รูปภาพ (URL)
                            </TabsTrigger>
                        </TabsList>

                        {/* Local File Tab */}
                        <TabsContent value="local" className="space-y-3 mt-3">
                            <div
                                onClick={handleBrowseLocal}
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all",
                                    selectedLocalPath
                                        ? "border-primary/80 bg-primary/5 hover:bg-primary/10"
                                        : "border-border hover:border-primary/50 hover:bg-muted/40"
                                )}
                            >
                                <div className="p-3 bg-muted rounded-full text-primary">
                                    <FolderOpen className="w-6 h-6" />
                                </div>
                                <div className="text-center space-y-0.5">
                                    <p className="text-sm font-semibold text-foreground">
                                        คลิกเพื่อเลือกไฟล์รูปภาพจากเครื่อง
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        รองรับ PNG, JPG, JPEG, WEBP, GIF, BMP
                                    </p>
                                </div>
                                {selectedLocalPath && (
                                    <div className="mt-1 px-3 py-1 bg-background/80 border border-primary/40 rounded-full text-[11px] text-primary font-mono truncate max-w-[90%]">
                                        {selectedLocalPath}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* Game Gallery Tab */}
                        <TabsContent value="gallery" className="mt-3">
                            {loadingGallery ? (
                                <div className="h-44 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <span className="text-xs">กำลังโหลดภาพจากระบบ...</span>
                                </div>
                            ) : galleryImages.length === 0 ? (
                                <div className="h-44 flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-4">
                                    ไม่มีภาพอาร์ตเวิร์กหรือภาพตัวอย่างสำหรับเกมนี้
                                </div>
                            ) : (
                                <ScrollArea className="h-48 rounded-md border border-border/60 p-2">
                                    <div className="grid grid-cols-3 gap-2.5">
                                        {galleryImages.map((img) => {
                                            const isSelected = selectedUrl === img.url;
                                            return (
                                                <button
                                                    key={img.id}
                                                    type="button"
                                                    onClick={() => handleSelectGallery(img.url)}
                                                    className={cn(
                                                        "group relative aspect-video rounded-md overflow-hidden border transition-all text-left focus:outline-none",
                                                        isSelected
                                                            ? "border-primary ring-2 ring-primary/40 shadow-md"
                                                            : "border-border/60 hover:border-primary/50"
                                                    )}
                                                >
                                                    <SafeImage
                                                        src={img.url}
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                        alt={img.label}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                                                    <span className="absolute bottom-1 left-1.5 right-1.5 text-[10px] text-white font-medium truncate">
                                                        {img.label}
                                                    </span>
                                                    {isSelected && (
                                                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            )}
                        </TabsContent>

                        {/* Image URL Tab */}
                        <TabsContent value="url" className="space-y-3 mt-3">
                            <div className="flex gap-2">
                                <Input
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    placeholder="https://example.com/wallpaper.jpg"
                                    className="text-xs h-9 bg-background"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleApplyInputUrl();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleApplyInputUrl}
                                    className="text-xs h-9 px-3 flex-shrink-0"
                                >
                                    ดูตัวอย่าง
                                </Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                ป้อนลิงก์รูปภาพโดยตรง ระบบจะทำการดาวน์โหลดและเก็บไว้ในเครื่องเพื่อรองรับการใช้งานออฟไลน์
                            </p>
                        </TabsContent>
                    </Tabs>

                    {errorMsg && (
                        <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 px-6 bg-muted/30 border-t border-border/60 flex items-center justify-between sm:justify-between">
                    <div>
                        {libraryItem.customBackgroundImage && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                disabled={isSubmitting}
                                className="text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                คืนค่าเริ่มต้น
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="text-xs"
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSubmitting || !hasNewSelection}
                            className="text-xs font-semibold px-4"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Check className="w-3.5 h-3.5 mr-1.5" />
                                    ใช้ภาพนี้เป็นพื้นหลัง
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
export default ChangeBackgroundDialog;
