import React, { useCallback } from 'react';
import { Card, CardContent, RichTextEditor } from '@/ui';
import { FileCode2 } from 'lucide-react';
import { getSdk } from '@/lib/sdk';
import { resolveArticleImageUrl } from '@/lib/articleImageUrl';

interface ContentSectionProps {
  content: string;
  slug?: string;
  showValidationErrors: boolean;
  onUpdate: (html: string) => void;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  content,
  slug,
  showValidationErrors,
  onUpdate,
}) => {
  const handleEditorImageUpload = useCallback(
    async (file: File): Promise<string> => {
      const sdk = await getSdk();
      const res = await sdk.storage.upload(file, {
        bucket: 'images',
        path: 'body',
        game: slug || 'temp',
      });
      return (res as any).full_url || resolveArticleImageUrl(res.url) || res.url;
    },
    [slug]
  );

  const isInvalid = showValidationErrors && (!content || content === '<p></p>');

  return (
    <Card
      className={`border-border bg-card shadow-sm transition-all ${
        isInvalid ? 'ring-2 ring-destructive/20 border-destructive' : ''
      }`}
    >
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            Story, Description & Details <span className="text-destructive">*</span>
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">Full Rich Text / Markdown</span>
      </div>
      <CardContent className="p-0 min-h-[420px]">
        <RichTextEditor
          content={content || ''}
          onUpdate={onUpdate}
          onImageUpload={handleEditorImageUpload}
        />
      </CardContent>
    </Card>
  );
};
