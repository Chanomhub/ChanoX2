import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge
} from '@/ui';
import {
  ShoppingBag,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { OfficialStoreItem } from '../../../types/studio.types';

interface OfficialStoresSectionProps {
  items: OfficialStoreItem[];
  onAddStore: (item: Omit<OfficialStoreItem, 'tempId'>) => Promise<void>;
  onRemoveStore: (tempId: string) => Promise<void>;
}

const STORE_PRESETS = [
  { name: 'Steam', placeholder: 'https://store.steampowered.com/app/...' },
  { name: 'itch.io', placeholder: 'https://username.itch.io/...' },
  { name: 'DLsite', placeholder: 'https://www.dlsite.com/...' },
  { name: 'Patreon', placeholder: 'https://www.patreon.com/...' },
  { name: 'Booth', placeholder: 'https://booth.pm/...' },
];

export const OfficialStoresSection: React.FC<OfficialStoresSectionProps> = ({
  items = [],
  onAddStore,
  onRemoveStore,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error('Please enter both a store name and URL');
      return;
    }

    let cleanedUrl = url.trim();
    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      cleanedUrl = `https://${cleanedUrl}`;
    }

    setIsAdding(true);
    try {
      await onAddStore({
        name: name.trim(),
        url: cleanedUrl,
        submitNote: 'Added via Studio',
        status: 'PENDING',
      });
      setName('');
      setUrl('');
    } catch {
      toast.error('Failed to add store source');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground text-sm">Official Purchase & Store Links</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Support the original developer with links to Steam, DLsite, itch.io, etc.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {items.length} Stores
        </Badge>
      </div>

      <CardContent className="p-6 md:p-8 space-y-4">
        {/* Preset Store Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2">
          <span className="text-[11px] text-muted-foreground mr-1">Quick Select:</span>
          {STORE_PRESETS.map((p) => (
            <Button
              key={p.name}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setName(p.name);
                if (!url) setUrl(p.placeholder);
              }}
              className="h-6 text-[10px] px-2 py-0 border-border bg-card text-muted-foreground hover:text-foreground"
            >
              {p.name}
            </Button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Store name (e.g. Steam)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="sm:w-1/3 h-9 text-xs"
          />
          <Input
            placeholder="Store URL (e.g. https://store.steampowered.com/...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 h-9 text-xs font-mono"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={isAdding}
            className="h-9 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Store
          </Button>
        </div>

        {/* Existing Store Items */}
        {items.length > 0 && (
          <div className="space-y-2 pt-2">
            {items.map((src) => {
              const isApproved = src.status === 'APPROVED';

              return (
                <div
                  key={src.tempId}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {src.name}
                        </span>
                        {isApproved ? (
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 flex items-center gap-1 h-4 px-1.5">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-1 h-4 px-1.5">
                            <Clock className="h-2.5 w-2.5" />
                            Pending Review
                          </Badge>
                        )}
                      </div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 truncate mt-0.5"
                      >
                        <span className="truncate">{src.url}</span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
                      </a>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveStore(src.tempId)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 ml-2"
                    title="Remove store"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
