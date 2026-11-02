import React from 'react';
import {
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@/ui';
import { Globe, Star } from 'lucide-react';
import { ArticleMode } from '../../../types/studio.types';

interface PublishingCardProps {
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  favorited?: boolean;
  mode: ArticleMode;
  onStatusChange: (status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED') => void;
  onFavoritedChange: (favorited: boolean) => void;
}

export const PublishingCard: React.FC<PublishingCardProps> = ({
  status,
  favorited = false,
  onStatusChange,
  onFavoritedChange,
}) => {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'PUBLISHED':
        return 'bg-emerald-500';
      case 'PENDING_REVIEW':
        return 'bg-amber-500';
      case 'ARCHIVED':
        return 'bg-zinc-500';
      default:
        return 'bg-zinc-400';
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Publishing
          </h3>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground block">
            Article Status
          </Label>
          <Select
            value={status}
            onValueChange={(val: any) => onStatusChange(val)}
          >
            <SelectTrigger className="w-full text-xs h-9">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${getStatusColor(status)}`} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" />
                  <span>Draft (Private)</span>
                </div>
              </SelectItem>
              <SelectItem value="PENDING_REVIEW">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Pending Review</span>
                </div>
              </SelectItem>
              <SelectItem value="PUBLISHED">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Published (Public)</span>
                </div>
              </SelectItem>
              <SelectItem value="ARCHIVED">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-600" />
                  <span>Archived (Hidden)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {status === 'PUBLISHED'
              ? 'Visible immediately to everyone in library and search.'
              : 'Only accessible by you and administrators.'}
          </p>
        </div>

        {/* Staff Pick / Favorited Toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="space-y-0.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Star className={`h-3.5 w-3.5 ${favorited ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
              Staff Pick / Highlight
            </Label>
            <p className="text-[11px] text-muted-foreground">Feature in recommendations</p>
          </div>
          <Switch
            checked={favorited}
            onCheckedChange={onFavoritedChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};
