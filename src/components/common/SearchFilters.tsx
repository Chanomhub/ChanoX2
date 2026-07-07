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
        <div className="border-b border-[#2d3a4f]/40">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-2.5 px-3 text-[11px] font-bold tracking-wider text-zinc-400 hover:text-white uppercase transition-colors"
            >
                <span>{title}</span>
                {isOpen ? <ChevronUp size={12} className="text-[#66c0f4]" /> : <ChevronDown size={12} className="text-zinc-500" />}
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
                className="w-3.5 h-3.5 rounded border-[#2d3a4f] bg-[#0e141c] text-[#66c0f4] focus:ring-[#66c0f4] focus:ring-offset-0 transition-colors"
            />
            <span className={cn(
                "text-[12px] transition-colors truncate flex-1",
                checked ? "text-[#66c0f4] font-medium" : "text-zinc-400 group-hover:text-zinc-200"
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
        <div className="w-[280px] h-full flex flex-col bg-[#111721] border-l border-[#2d3a4f]/50">
            {/* Filter Panel Header */}
            <div className="p-3 border-b border-[#2d3a4f]/50 bg-[#161d28] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-[#66c0f4]" />
                    <span className="text-xs font-bold text-white tracking-wider uppercase">{t('store.filters')}</span>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded transition-colors"
                    >
                        <RefreshCw size={10} className="animate-spin-slow" />
                        <span>{t('store.reset')}</span>
                    </button>
                )}
            </div>

            {/* Results count indicator */}
            <div className="px-3.5 py-2.5 bg-[#0e141c]/50 border-b border-[#2d3a4f]/30">
                <p className="text-[11px] text-zinc-500">
                    {t('store.showing_results', { count: resultsCount })}
                    {excludedCount > 0 && (
                        <span className="text-rose-400/80 font-medium"> ({excludedCount} {t('store.excluded', { defaultValue: 'excluded' })})</span>
                    )}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">

                {availableCategories.length > 0 && (
                    <div className="p-3 border-b border-[#2d3a4f]/40">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
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
                                                ? "bg-rose-500/15 border-rose-500/50 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                                                : "bg-[#161d28] border-[#2d3a4f]/40 text-zinc-400 hover:border-[#66c0f4]/40 hover:text-white"
                                        )}
                                    >
                                        {getCategoryIcon(category.name)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* SORTING ICON ROW (F95Zone sorting panel style) */}
                <div className="p-3 border-b border-[#2d3a4f]/40">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
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
                                    ? "bg-[#66c0f4]/15 border-[#66c0f4]/50 text-[#66c0f4] shadow-[0_0_8px_rgba(102,192,244,0.15)]"
                                    : "bg-[#161d28] border-[#2d3a4f]/40 text-zinc-400 hover:border-[#66c0f4]/40 hover:text-white"
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
                                    ? "bg-[#66c0f4]/15 border-[#66c0f4]/50 text-[#66c0f4] shadow-[0_0_8px_rgba(102,192,244,0.15)]"
                                    : "bg-[#161d28] border-[#2d3a4f]/40 text-zinc-400 hover:border-[#66c0f4]/40 hover:text-white"
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
                                    ? "bg-[#66c0f4]/15 border-[#66c0f4]/50 text-[#66c0f4] shadow-[0_0_8px_rgba(102,192,244,0.15)]"
                                    : "bg-[#161d28] border-[#2d3a4f]/40 text-zinc-400 hover:border-[#66c0f4]/40 hover:text-white"
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
                                className="w-full bg-[#0e141c] border border-[#2d3a4f]/60 rounded-md px-2.5 py-1.5 text-[11px] text-zinc-200 focus:outline-none focus:border-[#66c0f4] placeholder:text-zinc-600 transition-colors"
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
                                        className="w-3.5 h-3.5 rounded border-[#2d3a4f] bg-[#0e141c] text-[#66c0f4] focus:ring-[#66c0f4] focus:ring-offset-0 transition-colors"
                                    />
                                    <span className={cn(
                                        "flex items-center gap-1.5 text-[12px] transition-colors truncate flex-1",
                                        filters.platforms.includes(platform.id) ? "text-[#66c0f4] font-medium" : "text-zinc-400 group-hover:text-zinc-200"
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
