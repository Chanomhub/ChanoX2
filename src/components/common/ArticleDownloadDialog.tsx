
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

// Temporary interface until we have full GraphQL types
interface DownloadItem {
    url: string;
    name?: string;
    vipOnly?: boolean;
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[#1b2838] border-[#2a475e] text-[#dcdedf]">
                <DialogHeader>
                    <DialogTitle className="text-white">Download Options</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[#8b929a] uppercase">File</label>
                        <div className="text-base font-medium text-white break-all">
                            {download.name || 'Unknown filename'}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-[#8b929a] uppercase">Source</label>
                        <div className="text-sm text-[#dcdedf] break-all bg-[#101214] p-2 rounded border border-[#2a2e36]">
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
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            onDownload(download.url);
                            onOpenChange(false);
                        }}
                        className="bg-[#66c0f4] text-white hover:bg-[#4192c0] shadow-none" // Blue for download usually
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
