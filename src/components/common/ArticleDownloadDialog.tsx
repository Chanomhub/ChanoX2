import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Download as DownloadIcon, ShoppingCart, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useLibrary } from '@/contexts/LibraryContext';
import { useDownloads } from '@/contexts/DownloadContext';

// Temporary interface until we have full GraphQL types
interface DownloadItem {
    id?: number;
    url: string;
    name?: string;
    vipOnly?: boolean;
    isPurchaseRedirect?: boolean;
}

interface ArticleDownloadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    download: DownloadItem | null;
    onDownload: (url: string) => void;
    articleId?: number;
    articleTitle?: string;
}

export function ArticleDownloadDialog({
    open,
    onOpenChange,
    download,
    onDownload,
    articleId,
    articleTitle,
}: ArticleDownloadDialogProps) {
    const { libraryItems } = useLibrary();
    const { downloads: activeDownloads } = useDownloads();

    const existingLibraryItem = useMemo(() => {
        if (!download) return null;
        return libraryItems.find(item => 
            (download.id && item.apiDownloadId === download.id) || 
            (item.articleId === articleId && item.title === (download.name || articleTitle))
        );
    }, [libraryItems, download, articleId, articleTitle]);

    const activeDownload = useMemo(() => {
        if (!download) return null;
        return activeDownloads.find(d => 
            (download.id && d.apiDownloadId === download.id) || 
            (d.status === 'downloading' && d.articleId === articleId && d.filename === (download.name || articleTitle))
        );
    }, [activeDownloads, download, articleId, articleTitle]);

    if (!download) return null;

    const isPurchase = download.isPurchaseRedirect;
    const isAlreadyInLibrary = !!existingLibraryItem;
    const isAlreadyDownloading = !!activeDownload;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[#1b2838] border-[#2a475e] text-[#dcdedf]">
                <DialogHeader>
                    <DialogTitle className="text-white">
                        {isPurchase ? 'Unlock Required' : 'Download Options'}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[#8b929a] uppercase">File</label>
                        <div className="text-base font-medium text-white break-all">
                            {download.name || 'Unknown filename'}
                        </div>
                    </div>

                    {/* Status Badges */}
                    {(isAlreadyInLibrary || isAlreadyDownloading) && (
                        <div className="flex flex-wrap gap-2">
                            {isAlreadyInLibrary && (
                                <Badge
                                    label="In Library"
                                    className="bg-green-500/10 border border-green-500 text-green-500"
                                    labelClassName="text-green-500 text-xs font-bold"
                                    icon={<CheckCircle className="w-3 h-3 mr-1" />}
                                />
                            )}
                            {isAlreadyDownloading && (
                                <Badge
                                    label="Downloading..."
                                    className="bg-[#66c0f4]/10 border border-[#66c0f4] text-[#66c0f4]"
                                    labelClassName="text-[#66c0f4] text-xs font-bold"
                                    icon={<Clock className="w-3 h-3 mr-1" />}
                                />
                            )}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[#8b929a] uppercase">
                            {isPurchase ? 'Store / Purchase Link' : 
                             (download.url.includes('google.com') ? 'Google Drive' : 
                             download.url.includes('mega.nz') ? 'MEGA' : 
                             download.url.includes('mediafire.com') ? 'MediaFire' : 'Download Link')}
                        </label>
                        <div className="text-sm text-[#dcdedf] break-all bg-[#101214] p-2 rounded border border-[#2a2e36] font-mono">
                            {download.url}
                        </div>
                    </div>

                    {download.vipOnly && (
                        <div className="flex">
                            <Badge
                                label="VIP Only"
                                className="bg-yellow-500/10 border border-yellow-500 text-yellow-500"
                                labelClassName="text-yellow-500 text-xs font-bold"
                            />
                        </div>
                    )}

                    {isPurchase && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded text-xs text-yellow-500 leading-relaxed">
                            This content is locked. You need to purchase the article on the store to access the files.
                        </div>
                    )}

                    {isAlreadyInLibrary && !isPurchase && (
                        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded text-xs text-blue-400 leading-relaxed">
                            You already have this item in your library. Downloading it again may create a duplicate.
                        </div>
                    )}

                    {isAlreadyDownloading && (
                        <div className="bg-[#66c0f4]/10 border border-[#66c0f4]/30 p-3 rounded text-xs text-[#66c0f4] leading-relaxed">
                            This file is currently being downloaded. Check the downloads page for progress.
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    
                    <Button
                        variant={isPurchase ? "secondary" : "primary"}
                        onClick={() => {
                            onDownload(download.url);
                            onOpenChange(false);
                        }}
                        className={cn(
                            "text-white shadow-none",
                            isPurchase ? "bg-yellow-600 hover:bg-yellow-700" : (isAlreadyInLibrary ? "bg-slate-600 hover:bg-slate-700" : "bg-[#66c0f4] hover:bg-[#4192c0]")
                        )}
                    >
                        {isPurchase ? (
                            <>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Unlock Now
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="w-4 h-4 mr-2" />
                                {isAlreadyInLibrary ? 'Download Again' : 'Download'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

