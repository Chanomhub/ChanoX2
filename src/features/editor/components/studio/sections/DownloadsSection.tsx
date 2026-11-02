import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Button,
  Badge,
} from '@/ui';
import {
  Download,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  HardDrive,
} from 'lucide-react';
import { DownloadItem } from '../../../types/studio.types';
import { DownloadFileDialog } from '../dialogs/DownloadFileDialog';

interface DownloadsSectionProps {
  downloads: DownloadItem[];
  defaultVersion?: string;
  gameSlug?: string;
  onAddDownload: (item: Omit<DownloadItem, 'tempId'>) => Promise<void>;
  onUpdateDownload: (tempId: string, updates: Partial<DownloadItem>) => Promise<void>;
  onRemoveDownload: (tempId: string) => Promise<void>;
}

export const DownloadsSection: React.FC<DownloadsSectionProps> = ({
  downloads = [],
  defaultVersion = '',
  gameSlug = 'game',
  onAddDownload,
  onUpdateDownload,
  onRemoveDownload,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DownloadItem | null>(null);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: DownloadItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDialogSave = async (savedData: Omit<DownloadItem, 'tempId'>) => {
    if (editingItem) {
      await onUpdateDownload(editingItem.tempId, savedData);
    } else {
      await onAddDownload(savedData);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Download Links & Files</h3>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {downloads.length} Links
          </Badge>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Download
          </Button>
        </div>
      </div>

      <CardContent className="p-6 md:p-8 space-y-4">
        {downloads.length === 0 ? (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/10 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={handleOpenAdd}
          >
            <Download className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground">No download links added yet</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Add external mirrors (Google Drive, Mega, MediaFire) or upload direct game files
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {downloads.map((item) => {
              const isDirect = item.type === 'DIRECT_UPLOAD' || item.url.startsWith('public/') || item.url.startsWith('premium/');

              return (
                <div
                  key={item.tempId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground truncate">
                        {item.name || 'Unnamed Download'}
                      </span>
                      {item.forVersion && (
                        <Badge variant="secondary" className="text-[10px] font-mono h-5">
                          {item.forVersion}
                        </Badge>
                      )}
                      {isDirect ? (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                          <HardDrive className="h-2.5 w-2.5" />
                          Direct File
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="h-2.5 w-2.5" />
                          Mirror Link
                        </Badge>
                      )}
                      {item.fileSize && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {item.fileSize}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-mono text-muted-foreground truncate max-w-md">
                      {item.url}
                    </p>

                    {item.platforms && item.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {item.platforms.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.submitNote && (
                      <p className="text-[11px] text-amber-500/80 italic">
                        Note: {item.submitNote}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(item)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Edit link"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveDownload(item.tempId)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <DownloadFileDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialItem={editingItem}
        defaultVersion={defaultVersion}
        gameSlug={gameSlug}
        onSave={handleDialogSave}
      />
    </Card>
  );
};
