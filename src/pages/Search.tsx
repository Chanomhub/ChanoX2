import { useState, useEffect, useCallback, useRef } from 'react';
import { Search as SearchIcon, Loader2, X, Settings2 } from 'lucide-react';
import { sdk, withImageTransform } from '@/libs/sdk';
import type { ArticleListItem, NamedEntity } from '@chanomhub/sdk';
import SearchResultItem from '@/components/common/SearchResultItem';
import SearchFilters, { type FilterState } from '@/components/common/SearchFilters';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function Search() {
    const [searchQuery, setSearchQuery] = useState('');
    const [articles, setArticles] = useState<ArticleListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Filter state
    const [filters, setFilters] = useState<FilterState>({
        tags: [],
        categories: [],
        platforms: [],
        sortBy: 'relevance',
    });

    // Available filter options - accumulated from search results
    const [availableTags, setAvailableTags] = useState<NamedEntity[]>([]);
    const [availableCategories, setAvailableCategories] = useState<NamedEntity[]>([]);
    const [availablePlatforms, setAvailablePlatforms] = useState<NamedEntity[]>([]);

    // Use refs to access current filter options without triggering re-renders
    const tagsRef = useRef<NamedEntity[]>([]);
    const categoriesRef = useRef<NamedEntity[]>([]);
    const platformsRef = useRef<NamedEntity[]>([]);

    // Keep refs in sync with state
    useEffect(() => {
        tagsRef.current = availableTags;
    }, [availableTags]);
    useEffect(() => {
        categoriesRef.current = availableCategories;
    }, [availableCategories]);
    useEffect(() => {
        platformsRef.current = availablePlatforms;
    }, [availablePlatforms]);

    const debouncedSearchQuery = useDebounce(searchQuery, 400);
    const debouncedFilters = useDebounce(filters, 300);

    // Accumulate filter options from search results
    const accumulateFilterOptions = useCallback((items: ArticleListItem[]) => {
        const newTagsMap = new Map<string, NamedEntity>();
        tagsRef.current.forEach(tag => newTagsMap.set(tag.id, tag));
        items.forEach((article) => {
            article.tags?.forEach((tag) => newTagsMap.set(tag.id, tag));
        });
        const newTags = Array.from(newTagsMap.values());
        if (newTags.length !== tagsRef.current.length) {
            setAvailableTags(newTags);
        }

        const newCategoriesMap = new Map<string, NamedEntity>();
        categoriesRef.current.forEach(cat => newCategoriesMap.set(cat.id, cat));
        items.forEach((article) => {
            article.categories?.forEach((cat) => newCategoriesMap.set(cat.id, cat));
        });
        const newCategories = Array.from(newCategoriesMap.values());
        if (newCategories.length !== categoriesRef.current.length) {
            setAvailableCategories(newCategories);
        }

        const newPlatformsMap = new Map<string, NamedEntity>();
        platformsRef.current.forEach(plat => newPlatformsMap.set(plat.id, plat));
        items.forEach((article) => {
            article.platforms?.forEach((plat) => newPlatformsMap.set(plat.id, plat));
        });
        const newPlatforms = Array.from(newPlatformsMap.values());
        if (newPlatforms.length !== platformsRef.current.length) {
            setAvailablePlatforms(newPlatforms);
        }
    }, []);

    // Search articles with filters - sends API request
    const searchArticles = useCallback(async () => {
        setLoading(true);
        try {
            // Build filter object for API using refs (no dependency on state)
            const apiFilter: {
                tag?: string;
                category?: string;
                platform?: string;
            } = {};

            // API accepts single filter values, so we use the first selected one
            if (debouncedFilters.tags.length > 0) {
                const selectedTag = tagsRef.current.find(t => t.id === debouncedFilters.tags[0]);
                if (selectedTag) apiFilter.tag = selectedTag.name;
            }
            if (debouncedFilters.categories.length > 0) {
                const selectedCat = categoriesRef.current.find(c => c.id === debouncedFilters.categories[0]);
                if (selectedCat) apiFilter.category = selectedCat.name;
            }
            if (debouncedFilters.platforms.length > 0) {
                const selectedPlat = platformsRef.current.find(p => p.id === debouncedFilters.platforms[0]);
                if (selectedPlat) apiFilter.platform = selectedPlat.name;
            }

            let result;
            if (debouncedSearchQuery.trim()) {
                // Search with query
                result = await sdk.search.articles(debouncedSearchQuery, {
                    limit: 100,
                    offset: 0,
                });
            } else {
                // Get all with filters
                const hasFilters = Object.keys(apiFilter).length > 0;
                result = await sdk.articles.getAllPaginated({
                    limit: 100,
                    offset: 0,
                    filter: hasFilters ? apiFilter : undefined,
                });
            }

            const transformed = withImageTransform(result);
            let items = [...transformed.items];

            // Apply additional client-side filtering for multiple selections
            if (debouncedFilters.tags.length > 1) {
                items = items.filter((article: ArticleListItem) =>
                    article.tags?.some((tag) => debouncedFilters.tags.includes(tag.id))
                );
            }
            if (debouncedFilters.categories.length > 1) {
                items = items.filter((article: ArticleListItem) =>
                    article.categories?.some((cat) => debouncedFilters.categories.includes(cat.id))
                );
            }
            if (debouncedFilters.platforms.length > 1) {
                items = items.filter((article: ArticleListItem) =>
                    article.platforms?.some((plat) => debouncedFilters.platforms.includes(plat.id))
                );
            }

            // Apply sorting
            switch (debouncedFilters.sortBy) {
                case 'date':
                    items.sort(
                        (a, b) =>
                            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                    );
                    break;
                case 'popularity':
                    items.sort((a, b) => (b.favoritesCount || 0) - (a.favoritesCount || 0));
                    break;
                case 'title':
                    items.sort((a, b) => a.title.localeCompare(b.title));
                    break;
                case 'relevance':
                default:
                    break;
            }

            setArticles(items);

            // Accumulate filter options from the results
            accumulateFilterOptions(transformed.items);
        } catch (error) {
            console.error('Error searching articles:', error);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchQuery, debouncedFilters, accumulateFilterOptions]);

    // Search when query or filters change
    useEffect(() => {
        searchArticles();
    }, [searchArticles]);

    const clearSearch = () => {
        setSearchQuery('');
    };

    return (
        <div className="flex flex-col h-full bg-[#1b2838]">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#1b2838] to-[#171a21] border-b border-[#2a475e] py-4 px-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-lg font-medium text-[#c7d5e0] tracking-wide">
                        All Products
                    </h1>

                    {/* Mobile filter toggle */}
                    <button
                        onClick={() => setShowMobileFilters(!showMobileFilters)}
                        className="lg:hidden flex items-center gap-2 text-[#67c1f5] hover:text-white transition-colors"
                    >
                        <Settings2 size={18} />
                        <span className="text-sm">Filters</span>
                    </button>
                </div>

                {/* Search Input - Steam style */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="enter search term or tag"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-3 pr-10 py-1.5 bg-[#316282] border-none rounded-sm text-[#c7d5e0] placeholder-[#8f98a0] focus:outline-none focus:ring-1 focus:ring-[#67c1f5] text-[13px]"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8f98a0] hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => searchArticles()}
                        className="px-4 py-1.5 bg-[#395566] hover:bg-[#45677a] text-[#c7d5e0] text-[13px] rounded-sm transition-colors flex items-center gap-2"
                    >
                        <SearchIcon size={14} />
                        Search
                    </button>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Results list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-[#67c1f5] mb-4" />
                                <p className="text-[#8f98a0] text-sm">Searching...</p>
                            </div>
                        ) : articles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <p className="text-[#8f98a0] text-base">No results found</p>
                                <p className="text-zinc-600 text-sm mt-1">
                                    Try different keywords or adjust filters
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-0">
                                {articles.map((article) => (
                                    <SearchResultItem key={article.id} article={article} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Filter sidebar - Desktop */}
                <div className="hidden lg:block border-l border-[#2a475e]">
                    <SearchFilters
                        filters={filters}
                        onFiltersChange={setFilters}
                        availableTags={availableTags}
                        availableCategories={availableCategories}
                        availablePlatforms={availablePlatforms}
                        resultsCount={articles.length}
                    />
                </div>

                {/* Filter sidebar - Mobile overlay */}
                {showMobileFilters && (
                    <div className="lg:hidden fixed inset-0 z-50 bg-black/70">
                        <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-[#1b2838] shadow-xl">
                            <div className="flex items-center justify-between p-3 border-b border-[#2a475e]">
                                <span className="text-[#c7d5e0] font-medium">Filters</span>
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="text-[#8f98a0] hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <SearchFilters
                                filters={filters}
                                onFiltersChange={setFilters}
                                availableTags={availableTags}
                                availableCategories={availableCategories}
                                availablePlatforms={availablePlatforms}
                                resultsCount={articles.length}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
