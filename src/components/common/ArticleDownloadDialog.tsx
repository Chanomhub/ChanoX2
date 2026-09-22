import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Download as DownloadIcon, ShoppingCart } from 'lucide-react';
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
            <DialogContent className="sm:max-w-[425px] bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-foreground font-semibold">
                        {isPurchase ? 'Unlock Required' : 'Download Options'}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">File</label>
                        <div className="text-base font-medium text-foreground break-all">
                            {download.name || 'Unknown filename'}
                        </div>
                    </div>

                    {/* Status Badges */}
                    {(isAlreadyInLibrary || isAlreadyDownloading) && (
                        <div className="flex flex-wrap gap-2">
                            {isAlreadyInLibrary && (
                                <Badge
                                    label="In Library"
                                    className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                                    labelClassName="text-emerald-400 text-xs font-bold"
                                />
                            )}
                            {isAlreadyDownloading && (
                                <Badge
                                    label="Downloading..."
                                    className="bg-primary/15 border border-primary/30 text-primary"
                                    labelClassName="text-primary text-xs font-bold"
                                />
                            )}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {isPurchase ? 'Store / Purchase Link' : 
                             (download.url.includes('google.com') ? 'Google Drive' : 
                             download.url.includes('mega.nz') ? 'MEGA' : 
                             download.url.includes('mediafire.com') ? 'MediaFire' : 'Download Link')}
                        </label>
                        <div className="text-sm text-foreground break-all bg-background p-2.5 rounded-md border border-border font-mono">
                            {download.url}
                        </div>
                    </div>

                    {download.vipOnly && (
                        <div className="flex">
                            <Badge
                                label="VIP Only"
                                className="bg-amber-500/15 border border-amber-500/30 text-amber-400"
                                labelClassName="text-amber-400 text-xs font-bold"
                            />
                        </div>
                    )}

                    {isPurchase && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-md text-xs text-amber-400 leading-relaxed">
                            This content is locked. You need to purchase the article on the store to access the files.
                        </div>
                    )}

                    {isAlreadyInLibrary && !isPurchase && (
                        <div className="bg-primary/10 border border-primary/25 p-3 rounded-md text-xs text-primary leading-relaxed">
                            You already have this item in your library. Downloading it again may create a duplicate.
                        </div>
                    )}

                    {isAlreadyDownloading && (
                        <div className="bg-primary/15 border border-primary/30 p-3 rounded-md text-xs text-primary leading-relaxed">
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
                            "shadow-none",
                            isPurchase
                                ? "bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                : (isAlreadyInLibrary
                                    ? "bg-muted text-foreground hover:bg-muted/80"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground font-bold")
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

