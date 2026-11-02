import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Label,
  Input,
  Badge,
  Button
} from '@/ui';
import { Sparkles, X, Plus, Loader2, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { getSdk } from '@/lib/sdk';

interface TaxonomyCardProps {
  categories: string[];
  tags: string[];
  availableCategories: string[];
  availableTags: string[];
  title?: string;
  description?: string;
  onUpdateCategories: (categories: string[]) => void;
  onUpdateTags: (tags: string[]) => void;
}

export const TaxonomyCard: React.FC<TaxonomyCardProps> = ({
  categories = [],
  tags = [],
  availableCategories = [],
  availableTags = [],
  title = '',
  description = '',
  onUpdateCategories,
  onUpdateTags,
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  const toggleCategory = (cat: string) => {
    const next = categories.includes(cat)
      ? categories.filter((c) => c !== cat)
      : [...categories, cat];
    onUpdateCategories(next);
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onUpdateTags([...tags, trimmed]);
    }
    setNewTagInput('');
  };

  const removeTag = (tag: string) => {
    onUpdateTags(tags.filter((t) => t !== tag));
  };

  const handleSuggestTags = async () => {
    if (!title && !description) {
      toast.error('Please enter a Title or Summary first to get AI tag suggestions.');
      return;
    }

    setIsSuggesting(true);
    try {
      const sdk = await getSdk();
      let suggested: string[] = [];
      if (typeof (sdk.articles as any).suggestTags === 'function') {
        const res = await (sdk.articles as any).suggestTags({ title, description });
        suggested = res.tags || res;
      }

      if (!Array.isArray(suggested) || suggested.length === 0) {
        const text = `${title} ${description}`.toLowerCase();
        suggested = availableTags
          .filter((t) => text.includes(t.toLowerCase()))
          .slice(0, 6);
      }

      if (suggested.length > 0) {
        const merged = Array.from(new Set([...tags, ...suggested]));
        onUpdateTags(merged);
        toast.success(`Added ${suggested.length} suggested tags!`);
      } else {
        toast.info('No new tags suggested based on current text.');
      }
    } catch (err) {
      console.error('AI tag suggestion error:', err);
      toast.error('Could not fetch AI suggestions');
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Genres & Tags
          </h3>
        </div>
      </div>

      <CardContent className="p-4 space-y-5">
        {/* Categories / Genres */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Genres / Categories</span>
            <span className="text-[10px] text-muted-foreground/70 font-normal">Pick all that apply</span>
          </Label>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
            {availableCategories.map((cat) => {
              const isSelected = categories.includes(cat);
              return (
                <Badge
                  key={cat}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => toggleCategory(cat)}
                  className={`cursor-pointer text-xs py-1 px-2.5 transition-all select-none ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'hover:bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {cat}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground">
              Descriptive Tags
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSuggestTags}
              disabled={isSuggesting}
              className="h-6 text-[10px] text-primary hover:text-primary hover:bg-primary/10 flex items-center gap-1 px-2"
            >
              {isSuggesting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI Suggest
            </Button>
          </div>

          {/* Add custom tag */}
          <div className="flex gap-1.5">
            <Input
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(newTagInput);
                }
              }}
              placeholder="Add tag and press Enter..."
              className="h-8 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addTag(newTagInput)}
              className="h-8 px-2.5 text-xs shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Active Tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="text-xs pl-2 pr-1 py-0.5 flex items-center gap-1 group font-normal bg-muted hover:bg-muted/80 text-foreground"
              >
                <span>#{t}</span>
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="rounded-full hover:bg-black/20 dark:hover:bg-white/20 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Available tags pool */}
          {availableTags.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Popular Tags:
              </span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {availableTags
                  .filter((t) => !tags.includes(t))
                  .slice(0, 20)
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      className="text-[10px] bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border/50 transition-colors"
                    >
                      +{t}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
