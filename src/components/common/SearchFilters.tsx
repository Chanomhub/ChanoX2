import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ChevronDown, ChevronUp,
    Gamepad2, Image as ImageIcon, Film, BookOpen, LayoutGrid,
    Clock, ThumbsUp, ArrowUpDown, SlidersHorizontal, RefreshCw, Monitor, Apple, Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterState {
    tags: string[];
    categories: string[];
    platforms: string[];
    sortBy: 'date' | 'popularity' | 'title';
}

export interface FilterEntity {
    id: string;
    name: string;
}

interface SearchFiltersProps {
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    availableTags: FilterEntity[];
    availableCategories: FilterEntity[];
    availablePlatforms: FilterEntity[];
    resultsCount: number;
    excludedCount?: number;
}

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-border/60">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-2.5 px-3 text-[11px] font-bold tracking-wider text-muted-foreground hover:text-foreground uppercase transition-colors"
            >
                <span>{title}</span>
                {isOpen ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-muted-foreground" />}
            </button>
            {isOpen && <div className="pb-3.5 px-3">{children}</div>}
        </div>
    );
}

interface CheckboxItemProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function CheckboxItem({ label, checked, onChange }: CheckboxItemProps) {
    return (
        <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group select-none">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border bg-muted/60 text-primary focus:ring-primary focus:ring-offset-0 transition-colors"
            />
            <span className={cn(
                "text-[12px] transition-colors truncate flex-1",
                checked ? "text-primary font-medium" : "text-muted-foreground group-hover:text-foreground"
            )}>
                {label}
            </span>
        </label>
    );
}

export default function SearchFilters({
    filters,
    onFiltersChange,
    availableTags,
    availableCategories,
    availablePlatforms,
    resultsCount,
    excludedCount = 0,
}: SearchFiltersProps) {
    const { t } = useTranslation();
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const hasActiveFilters =
        filters.tags.length > 0 || filters.categories.length > 0 || filters.platforms.length > 0;

    const clearAllFilters = () => {
        onFiltersChange({
            ...filters,
            tags: [],
            categories: [],
            platforms: [],
        });
    };

    const toggleTag = (tagId: string) => {
        const newTags = filters.tags.includes(tagId)
            ? filters.tags.filter((id) => id !== tagId)
            : [...filters.tags, tagId];
        onFiltersChange({ ...filters, tags: newTags });
    };

    const toggleCategory = (categoryId: string) => {
        const newCategories = filters.categories.includes(categoryId)
            ? filters.categories.filter((id) => id !== categoryId)
            : [...filters.categories, categoryId];
        onFiltersChange({ ...filters, categories: newCategories });
    };

    const togglePlatform = (platformId: string) => {
        const newPlatforms = filters.platforms.includes(platformId)
            ? filters.platforms.filter((id) => id !== platformId)
            : [...filters.platforms, platformId];
        onFiltersChange({ ...filters, platforms: newPlatforms });
    };

    // Category icon helper
    const getCategoryIcon = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('game')) return <Gamepad2 size={16} />;
        if (lowerName.includes('photo') || lowerName.includes('image') || lowerName.includes('art') || lowerName.includes('cosplay')) return <ImageIcon size={16} />;
        if (lowerName.includes('video') || lowerName.includes('animation') || lowerName.includes('anime')) return <Film size={16} />;
        if (lowerName.includes('comic') || lowerName.includes('manga') || lowerName.includes('novel') || lowerName.includes('book')) return <BookOpen size={16} />;
        return <LayoutGrid size={16} />;
    };

    // Platform icon helper
    const getPlatformIcon = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('win')) return <Monitor size={12} />;
        if (lowerName.includes('mac') || lowerName.includes('apple')) return <Apple size={12} />;
        return <Terminal size={12} />;
    };

    return (
        <div className="w-[280px] h-full flex flex-col bg-card border-l border-border/60">
            {/* Filter Panel Header */}
            <div className="p-3 border-b border-border/60 bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-primary" />
                    <span className="text-xs font-bold text-foreground tracking-wider uppercase">{t('store.filters')}</span>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1 text-[10px] text-destructive hover:text-destructive/80 bg-destructive/10 hover:bg-destructive/20 px-2 py-1 rounded transition-colors"
                    >
                        <RefreshCw size={10} className="animate-spin-slow" />
                        <span>{t('store.reset')}</span>
                    </button>
                )}
            </div>

            {/* Results count indicator */}
            <div className="px-3.5 py-2.5 bg-muted/20 border-b border-border/40">
                <p className="text-[11px] text-muted-foreground">
                    {t('store.showing_results', { count: resultsCount })}
                    {excludedCount > 0 && (
                        <span className="text-destructive font-medium"> ({excludedCount} {t('store.excluded', { defaultValue: 'excluded' })})</span>
                    )}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {availableCategories.length > 0 && (
                    <div className="p-3 border-b border-border/60">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                            {t('store.category')}
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {availableCategories.map((category) => {
                                const active = filters.categories.includes(category.id);
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => toggleCategory(category.id)}
                                        title={category.name}
                                        className={cn(
                                            "flex flex-col items-center justify-center p-2 rounded border aspect-square transition-all",
                                            active
                                                ? "bg-primary/15 border-primary/50 text-primary shadow-sm"
                                                : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                        )}
                                    >
                                        {getCategoryIcon(category.name)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SORTING ICON ROW */}
                <div className="p-3 border-b border-border/60">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                        {t('store.sorting')}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {/* Clock -> Release Date */}
                        <button
                            onClick={() => onFiltersChange({ ...filters, sortBy: 'date' })}
                            title={t('store.sort_by_date')}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded border transition-all text-xs gap-1",
                                filters.sortBy === 'date'
                                    ? "bg-primary/15 border-primary/50 text-primary shadow-sm"
                                    : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            )}
                        >
                            <Clock size={15} />
                        </button>

                        {/* ThumbsUp -> Popularity / Likes */}
                        <button
                            onClick={() => onFiltersChange({ ...filters, sortBy: 'popularity' })}
                            title={t('store.sort_by_popularity')}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded border transition-all text-xs gap-1",
                                filters.sortBy === 'popularity'
                                    ? "bg-primary/15 border-primary/50 text-primary shadow-sm"
                                    : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            )}
                        >
                            <ThumbsUp size={14} />
                        </button>

                        {/* Name -> Name / Title */}
                        <button
                            onClick={() => onFiltersChange({ ...filters, sortBy: 'title' })}
                            title={t('store.sort_by_name')}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded border transition-all text-xs gap-1",
                                filters.sortBy === 'title'
                                    ? "bg-primary/15 border-primary/50 text-primary shadow-sm"
                                    : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            )}
                        >
                            <ArrowUpDown size={14} />
                        </button>
                    </div>
                </div>

                {/* TAGS FILTER */}
                {availableTags.length > 0 && (
                    <CollapsibleSection title={t('store.narrow_tag')} defaultOpen>
                        <div className="mb-2">
                            <input
                                type="text"
                                placeholder={t('store.search_tags')}
                                value={tagSearchQuery}
                                onChange={(e) => setTagSearchQuery(e.target.value)}
                                className="w-full bg-muted/60 border border-border rounded-md px-2.5 py-1.5 text-[11px] text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground transition-colors"
                            />
                        </div>
                        <div className="space-y-0.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                            {availableTags
                                .filter(tag => tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                                .map((tag) => (
                                    <CheckboxItem
                                        key={tag.id}
                                        label={tag.name}
                                        checked={filters.tags.includes(tag.id)}
                                        onChange={() => toggleTag(tag.id)}
                                    />
                                ))}
                        </div>
                    </CollapsibleSection>
                )}

                {/* PLATFORMS FILTER */}
                {availablePlatforms.length > 0 && (
                    <CollapsibleSection title={t('store.narrow_platform')}>
                        <div className="space-y-0.5">
                            {availablePlatforms.map((platform) => (
                                <label key={platform.id} className="flex items-center gap-2.5 py-1.5 cursor-pointer group select-none">
                                    <input
                                        type="checkbox"
                                        checked={filters.platforms.includes(platform.id)}
                                        onChange={() => togglePlatform(platform.id)}
                                        className="w-3.5 h-3.5 rounded border-border bg-muted/60 text-primary focus:ring-primary focus:ring-offset-0 transition-colors"
                                    />
                                    <span className={cn(
                                        "flex items-center gap-1.5 text-[12px] transition-colors truncate flex-1",
                                        filters.platforms.includes(platform.id) ? "text-primary font-medium" : "text-muted-foreground group-hover:text-foreground"
                                    )}>
                                        {getPlatformIcon(platform.name)}
                                        {platform.name}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </CollapsibleSection>
                )}
            </div>
        </div>
    );
}
