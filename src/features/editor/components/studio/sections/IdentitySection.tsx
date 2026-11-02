import React from 'react';
import { Card, CardContent, Input, Label, Textarea } from '@/ui';
import { Link } from 'react-router';
import { Hash, Type, AlertTriangle } from 'lucide-react';
import { ArticleMode, ArticleStudioFormData } from '../../../types/studio.types';

interface SimilarArticle {
  id: number;
  title: string;
  slug: string;
  ver: string | null;
}

interface IdentitySectionProps {
  formData: ArticleStudioFormData;
  mode: ArticleMode;
  showValidationErrors: boolean;
  isReservingSlug: boolean;
  similarArticles: SimilarArticle[];
  onUpdateField: <K extends keyof ArticleStudioFormData>(key: K, val: ArticleStudioFormData[K]) => void;
  onTitleBlur: () => void;
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({
  formData,
  mode,
  showValidationErrors,
  similarArticles,
  onUpdateField,
  onTitleBlur,
}) => {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-6 md:p-8 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label
            htmlFor="title"
            className="text-xs uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1.5"
          >
            <Type className="h-3.5 w-3.5 text-primary" />
            Project Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={formData.title || ''}
            onChange={(e) => onUpdateField('title', e.target.value)}
            onBlur={onTitleBlur}
            placeholder="e.g. Echoes of the Abyss"
            className={`text-lg font-semibold h-12 px-4 border-input focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${
              showValidationErrors && !formData.title ? 'border-destructive ring-2 ring-destructive/10' : ''
            }`}
            required
          />
          {mode === 'create' && similarArticles.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">
                  A game with a similar title may already exist. Double-check before creating a duplicate —
                  sequels or different versions are fine.
                </p>
                <ul className="space-y-0.5">
                  {similarArticles.map((a) => (
                    <li key={a.id}>
                      <Link
                        to={`/article/${a.slug}`}
                        target="_blank"
                        className="underline underline-offset-2 hover:text-amber-500"
                      >
                        {a.title}
                        {a.ver ? ` (v${a.ver})` : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Slug (URL) */}
        <div className="space-y-2">
          <Label
            htmlFor="slug"
            className="text-xs uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1.5"
          >
            <Hash className="h-3.5 w-3.5 text-primary" />
            URL Slug <span className="text-destructive">*</span>
            <span className="text-[11px] text-muted-foreground/60 lowercase font-normal ml-1">
              — unique web address
            </span>
          </Label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-input focus-within:border-primary/50 transition-colors">
            <span className="shrink-0 font-mono text-xs text-muted-foreground/70 select-none">
              chanomhub.com/articles/
            </span>
            <input
              id="slug"
              type="text"
              value={formData.slug || ''}
              onChange={(e) => {
                const cleaned = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-_]/g, '-');
                onUpdateField('slug', cleaned);
              }}
              placeholder="echoes-of-the-abyss"
              disabled={mode === 'edit'}
              className="w-full bg-transparent border-none outline-none font-mono text-xs text-foreground placeholder:text-muted-foreground/40 disabled:opacity-60"
            />
          </div>
          {showValidationErrors && !formData.slug && (
            <p className="text-[11px] text-destructive font-medium">URL slug is required.</p>
          )}
        </div>

        {/* Short Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="description"
              className="text-xs uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1.5"
            >
              Short Summary / Teaser <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] text-muted-foreground font-mono">
              {(formData.description || '').length}/300
            </span>
          </div>
          <Textarea
            id="description"
            rows={3}
            maxLength={300}
            value={formData.description || ''}
            onChange={(e) => onUpdateField('description', e.target.value)}
            placeholder="A compelling 1-2 sentence hook describing your game for search engines and cards..."
            className={`resize-none text-xs leading-relaxed border-input focus:border-primary transition-all ${
              showValidationErrors && !formData.description ? 'border-destructive ring-2 ring-destructive/10' : ''
            }`}
          />
          {showValidationErrors && !formData.description && (
            <p className="text-[11px] text-destructive font-medium">Please provide a short summary.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
