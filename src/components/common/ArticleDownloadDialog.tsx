
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Download, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

// Temporary interface until we have full GraphQL types
interface DownloadItem {
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
    articleTitle?: string;
}

export function ArticleDownloadDialog({
    open,
    onOpenChange,
    download,
    onDownload,
}: ArticleDownloadDialogProps) {
    if (!download) return null;

    const isPurchase = download.isPurchaseRedirect;

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
                            isPurchase ? "bg-yellow-600 hover:bg-yellow-700" : "bg-[#66c0f4] hover:bg-[#4192c0]"
                        )}
                    >
                        {isPurchase ? (
                            <>
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Unlock Now
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
