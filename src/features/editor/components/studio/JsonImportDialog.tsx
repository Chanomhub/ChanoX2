import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea
} from '@/ui';
import { toast } from 'sonner';
import { ClipboardPaste, FileCode } from 'lucide-react';
import { ArticleStudioFormData } from '../../types/studio.types';

interface JsonImportDialogProps {
  onImport: (data: Partial<ArticleStudioFormData>) => void;
}

export function JsonImportDialog({ onImport }: JsonImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const repairMalformedHtml = (html: string): string => {
    if (!html) return html;
    let repaired = html;

    try {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = repaired;
      repaired = textarea.value;
    } catch {
      repaired = repaired
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }

    const messyLinkRegex = /<a\s+[^>]*href=["']<a\s+href=["']([^"']+)["'][^>]*>(.*?)["'][^>]*>(.*?)<\/a>/gi;
    repaired = repaired.replace(messyLinkRegex, (_match, url, innerTitle, outerContent) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${innerTitle || outerContent || url}</a>`;
    });

    const nestedLinkRegex = /<a\s+[^>]*href=["']\s*<a\s+href=['"]([^'"]+)['"][^>]*>.*?<\/a>\s*["'][^>]*>(.*?)<\/a>/gi;
    repaired = repaired.replace(nestedLinkRegex, (_match, url, text) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    return repaired;
  };

  const handleImport = () => {
    try {
      setError(null);
      if (!jsonInput.trim()) {
        setError('Please paste some JSON data.');
        return;
      }

      const parsedData = JSON.parse(jsonInput);

      if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
        throw new Error('Input must be a valid JSON object.');
      }

      if (parsedData.body && typeof parsedData.body === 'string') {
        parsedData.body = repairMalformedHtml(parsedData.body);
      }

      if (parsedData.status && typeof parsedData.status === 'string') {
        const validArticleStatuses = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'];
        if (!validArticleStatuses.includes(parsedData.status.toUpperCase())) {
          if (!parsedData.tags) parsedData.tags = [];
          if (Array.isArray(parsedData.tags) && !parsedData.tags.includes(parsedData.status)) {
            parsedData.tags.push(parsedData.status);
          }
          delete parsedData.status;
        }
      }

      onImport(parsedData as Partial<ArticleStudioFormData>);
      setJsonInput('');
      setOpen(false);
    } catch (e: any) {
      console.error('JSON Import Error:', e);
      setError(e.message || 'Invalid JSON format.');
      toast.error('Failed to parse JSON.');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonInput(text);
      setError(null);
      toast.success('Pasted from clipboard!');
    } catch (e) {
      console.error('Clipboard paste failed:', e);
      toast.error('Could not read from clipboard.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          <FileCode className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Import JSON</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileCode className="h-5 w-5 text-primary" />
            Import Game Data from JSON
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Paste structured project JSON (e.g. from scrapers or local backup) to prefill the editor fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePasteFromClipboard}
              className="h-7 text-xs flex items-center gap-1"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste from Clipboard
            </Button>
          </div>

          <Textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder='{ "title": "Game Name", "ver": "1.0", "description": "...", "body": "..." }'
            className="h-64 font-mono text-xs bg-muted/20 border-input"
          />

          {error && (
            <p className="text-xs text-destructive font-medium">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            Import and Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
