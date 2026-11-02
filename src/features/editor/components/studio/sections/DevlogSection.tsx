import React from 'react';
import { Card, CardContent, Input, Label, Textarea } from '@/ui';
import { Sparkles, MessageSquare, ListCheck } from 'lucide-react';

interface DevlogSectionProps {
  message?: string;
  notes?: string;
  onUpdateField: (key: 'message' | 'notes', val: string) => void;
}

export const DevlogSection: React.FC<DevlogSectionProps> = ({
  message = '',
  notes = '',
  onUpdateField,
}) => {
  return (
    <Card className="border-border bg-card shadow-sm border-l-4 border-l-primary">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Version Update & Devlog Notes</h3>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">
          Update Announcement
        </span>
      </div>

      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Update Message */}
        <div className="space-y-2">
          <Label
            htmlFor="message"
            className="text-xs uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            Update Highlight / Summary (Optional)
          </Label>
          <Input
            id="message"
            value={message}
            onChange={(e) => onUpdateField('message', e.target.value)}
            placeholder="e.g. Version 1.2.0 released! Fixed major memory leak and added Chapter 3."
            className="h-10 text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            A quick one-line summary displayed on activity feeds and update cards.
          </p>
        </div>

        {/* Patch Notes */}
        <div className="space-y-2">
          <Label
            htmlFor="notes"
            className="text-xs uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1.5"
          >
            <ListCheck className="h-3.5 w-3.5 text-primary" />
            Detailed Patch Notes & Changelog (Optional)
          </Label>
          <Textarea
            id="notes"
            rows={5}
            value={notes}
            onChange={(e) => onUpdateField('notes', e.target.value)}
            placeholder="- Added 10 new quests&#10;- Balanced boss encounters&#10;- Updated translations for Spanish and Thai"
            className="text-xs font-mono leading-relaxed"
          />
        </div>
      </CardContent>
    </Card>
  );
};
