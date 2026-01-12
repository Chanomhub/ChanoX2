import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export interface FilterState {
    tags: string[];
    categories: string[];
    platforms: string[];
    sortBy: 'relevance' | 'date' | 'popularity' | 'title';
}

interface FilterEntity {
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
        <div className="border-b border-[#2a475e]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-2 px-1 text-[12px] font-medium text-[#c7d5e0] hover:text-white transition-colors"
            >
                <span>{title}</span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isOpen && <div className="pb-3 px-1">{children}</div>}
        </div>
    );
}

interface CheckboxItemProps {
    label: string;
    count?: number;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

function CheckboxItem({ label, count, checked, onChange }: CheckboxItemProps) {
    return (
        <label className="flex items-center gap-2 py-1 cursor-pointer group">
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-600 bg-[#1b2838] text-[#67c1f5] focus:ring-[#67c1f5] focus:ring-offset-0"
            />
            <span className="text-[12px] text-[#8f98a0] group-hover:text-[#c7d5e0] transition-colors flex-1 truncate">
                {label}
            </span>
            {count !== undefined && (
                <span className="text-[10px] text-zinc-600">{count.toLocaleString()}</span>
            )}
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

    return (
        <div className="w-[280px] flex-shrink-0 bg-[#1b2838] rounded-sm overflow-hidden">
            {/* Results info */}
            <div className="p-3 border-b border-[#2a475e] bg-[#16202d]">
                <p className="text-[11px] text-[#8f98a0]">
                    {resultsCount.toLocaleString()} results match your search.
                    {excludedCount > 0 && (
                        <span className="text-zinc-600">
                            {' '}
                            {excludedCount.toLocaleString()} titles have been excluded.
                        </span>
                    )}
                </p>
            </div>

            {/* Sort by */}
            <div className="p-3 border-b border-[#2a475e]">
                <label className="text-[11px] text-zinc-500 block mb-2">Sort by</label>
                <select
                    value={filters.sortBy}
                    onChange={(e) =>
                        onFiltersChange({
                            ...filters,
                            sortBy: e.target.value as FilterState['sortBy'],
                        })
                    }
                    className="w-full bg-[#316282] text-[#c7d5e0] text-[12px] px-3 py-1.5 rounded border-none focus:outline-none focus:ring-1 focus:ring-[#67c1f5] cursor-pointer"
                >
                    <option value="relevance">Relevance</option>
                    <option value="date">Release Date</option>
                    <option value="popularity">Popularity</option>
                    <option value="title">Name</option>
                </select>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
                <div className="px-3 py-2 border-b border-[#2a475e]">
                    <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1 text-[11px] text-[#67c1f5] hover:text-white transition-colors"
                    >
                        <X size={12} />
                        Clear all filters
                    </button>
                </div>
            )}

            {/* Scrollable filters area */}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                {/* Tags filter */}
                {availableTags.length > 0 && (
                    <CollapsibleSection title="Narrow by tag" defaultOpen>
                        <div className="space-y-0.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {availableTags.slice(0, 20).map((tag) => (
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

                {/* Categories filter */}
                {availableCategories.length > 0 && (
                    <CollapsibleSection title="Narrow by category" defaultOpen>
                        <div className="space-y-0.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {availableCategories.map((category) => (
                                <CheckboxItem
                                    key={category.id}
                                    label={category.name}
                                    checked={filters.categories.includes(category.id)}
                                    onChange={() => toggleCategory(category.id)}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>
                )}

                {/* Platforms filter */}
                {availablePlatforms.length > 0 && (
                    <CollapsibleSection title="Narrow by platform">
                        <div className="space-y-0.5">
                            {availablePlatforms.map((platform) => (
                                <CheckboxItem
                                    key={platform.id}
                                    label={platform.name}
                                    checked={filters.platforms.includes(platform.id)}
                                    onChange={() => togglePlatform(platform.id)}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>
                )}
            </div>
        </div>
    );
}
