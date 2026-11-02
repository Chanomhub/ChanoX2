import React from 'react';
import { Button } from '@/ui';
import { RotateCcw, X } from 'lucide-react';

interface DraftBannerProps {
  onRestore: () => void;
  onDiscard: () => void;
}

export const DraftBanner: React.FC<DraftBannerProps> = ({ onRestore, onDiscard }) => {
  return (
    <div className="bg-primary/10 border-b border-primary/20 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-foreground font-medium">
        <RotateCcw className="h-4 w-4 text-primary animate-spin" />
        <span>Found an unsaved draft from your previous session.</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onDiscard}
          className="h-7 text-xs border-border bg-transparent text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Discard
        </Button>
        <Button
          size="sm"
          onClick={onRestore}
          className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Restore Draft
        </Button>
      </div>
    </div>
  );
};
