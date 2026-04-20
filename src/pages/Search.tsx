import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Loader2, X, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/Dialog';
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
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [articles, setArticles] = useState<ArticleListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Sequential Code Search Detection
    const [showCodeDialog, setShowCodeDialog] = useState(false);
    const [detectedCode, setDetectedCode] = useState<string | null>(null);
    const ignoredCodesRef = useRef<Set<string>>(new Set());

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

    // Sync URL params to local state
    useEffect(() => {
        // Sync search query
        const urlQuery = searchParams.get('q');
        if (urlQuery !== null && urlQuery !== searchQuery) {
            setSearchQuery(urlQuery);
        }

        // Sync filters if available options are loaded
        const urlTag = searchParams.get('tag');
        const urlCategory = searchParams.get('category');
        const urlPlatform = searchParams.get('platform');

        if (!urlTag && !urlCategory && !urlPlatform) return;

        setFilters(prev => {
            const newFilters = { ...prev };
            let changed = false;

            if (urlTag && availableTags.length > 0) {
                const tag = availableTags.find(t => 
                    t.id.toLowerCase() === urlTag.toLowerCase() || 
                    t.name.toLowerCase() === urlTag.toLowerCase()
                );
                if (tag && !newFilters.tags.includes(tag.id)) {
                    newFilters.tags = [tag.id];
                    changed = true;
                }
            }

            if (urlCategory && availableCategories.length > 0) {
                const cat = availableCategories.find(c => 
                    c.id.toLowerCase() === urlCategory.toLowerCase() || 
                    c.name.toLowerCase() === urlCategory.toLowerCase()
                );
                if (cat && !newFilters.categories.includes(cat.id)) {
                    newFilters.categories = [cat.id];
                    changed = true;
                }
            }

            if (urlPlatform && availablePlatforms.length > 0) {
                const plat = availablePlatforms.find(p => 
                    p.id.toLowerCase() === urlPlatform.toLowerCase() || 
                    p.name.toLowerCase() === urlPlatform.toLowerCase()
                );
                if (plat && !newFilters.platforms.includes(plat.id)) {
                    newFilters.platforms = [plat.id];
                    changed = true;
                }
            }

            return changed ? newFilters : prev;
        });
    }, [searchParams, availableTags, availableCategories, availablePlatforms]);

    // Initial load of filter options
    useEffect(() => {
        const fetchInitialFilters = async () => {
            try {
                const [tags, cats, plats] = await Promise.all([
                    sdk.articles.getTags(),
                    sdk.articles.getCategories(),
                    sdk.articles.getPlatforms(),
                ]);
                
                // Map API strings/objects to FilterEntity format if needed
                const mapToEntity = (items: any[]) => items.map((item) => 
                    typeof item === 'string' ? { id: item, name: item } : item
                );

                setAvailableTags(mapToEntity(tags || []));
                setAvailableCategories(mapToEntity(cats || []));
                setAvailablePlatforms(mapToEntity(plats || []));
            } catch (err) {
                console.error('Failed to fetch initial filters:', err);
            }
        };
        fetchInitialFilters();
    }, []);

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
    const searchArticles = useCallback(async (overrideParams?: { sequentialCode?: string }) => {
        // Sequential Code Detection
        if (!overrideParams?.sequentialCode) {
            const queryTrimmed = debouncedSearchQuery.trim();
            // Detect HJ/RJ followed by digits (at least 2 to avoid noise)
            const codeMatch = queryTrimmed.match(/^(HJ|RJ)\d{2,}/i);

            if (codeMatch && !ignoredCodesRef.current.has(codeMatch[0].toUpperCase())) {
                setDetectedCode(codeMatch[0].toUpperCase());
                setShowCodeDialog(true);
                return;
            }
        }

        setLoading(true);
        try {
            // Build filter object for API
            const apiFilter: any = {};

            // 1. Get initial filters from URL query parameters (as fallback)
            const urlTag = searchParams.get('tag');
            const urlCategory = searchParams.get('category');
            const urlPlatform = searchParams.get('platform');

            // 2. Override with UI-selected filters if any are active
            // Note: API currently supports single tag/category/platform string
            if (debouncedFilters.tags.length > 0) {
                const selectedTag = availableTags.find(t => t.id === debouncedFilters.tags[0]);
                if (selectedTag) apiFilter.tag = selectedTag.name;
            } else if (urlTag) {
                apiFilter.tag = urlTag;
            }

            if (debouncedFilters.categories.length > 0) {
                const selectedCat = availableCategories.find(c => c.id === debouncedFilters.categories[0]);
                if (selectedCat) apiFilter.category = selectedCat.name;
            } else if (urlCategory) {
                apiFilter.category = urlCategory;
            }

            if (debouncedFilters.platforms.length > 0) {
                const selectedPlat = availablePlatforms.find(p => p.id === debouncedFilters.platforms[0]);
                if (selectedPlat) apiFilter.platform = selectedPlat.name;
            } else if (urlPlatform) {
                apiFilter.platform = urlPlatform;
            }

            // If multiple tags/categories/platforms are selected, we need to fetch more 
            // and filter client-side because the API currently only supports one of each
            const hasMultipleFilters = debouncedFilters.tags.length > 1 || 
                                     debouncedFilters.categories.length > 1 || 
                                     debouncedFilters.platforms.length > 1;
            
            // If multiple tags are selected, we don't send a specific tag to the API
            // to get a broader result set that we can filter client-side
            if (debouncedFilters.tags.length > 1) delete apiFilter.tag;
            if (debouncedFilters.categories.length > 1) delete apiFilter.category;
            if (debouncedFilters.platforms.length > 1) delete apiFilter.platform;

            // Sequential code override
            if (overrideParams?.sequentialCode) {
                apiFilter.sequentialCode = overrideParams.sequentialCode;
            }

            // Search query
            if (debouncedSearchQuery.trim()) {
                apiFilter.q = debouncedSearchQuery.trim();
            }

            const options = {
                limit: hasMultipleFilters ? 500 : 100, // Fetch more if we need to filter client-side
                offset: 0,
                filter: apiFilter
            };

            const result = await sdk.articles.getAllPaginated(options);
            const transformed = withImageTransform(result);
            let items = [...transformed.items];

            // Apply client-side filtering for multiple selections (AND logic - must have ALL selected tags)
            if (debouncedFilters.tags.length > 1) {
                items = items.filter((article: ArticleListItem) =>
                    debouncedFilters.tags.every((tagId) => 
                        article.tags?.some((t) => t.id === tagId)
                    )
                );
            }
            if (debouncedFilters.categories.length > 1) {
                items = items.filter((article: ArticleListItem) =>
                    debouncedFilters.categories.every((catId) => 
                        article.categories?.some((c) => c.id === catId)
                    )
                );
            }
            if (debouncedFilters.platforms.length > 1) {
                items = items.filter((article: ArticleListItem) =>
                    debouncedFilters.platforms.every((platId) => 
                        article.platforms?.some((p) => p.id === platId)
                    )
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
    }, [debouncedSearchQuery, debouncedFilters, accumulateFilterOptions, searchParams, availableTags, availableCategories, availablePlatforms]);


    // Search when query or filters change
    useEffect(() => {
        searchArticles();
    }, [searchArticles]);

    const confirmCodeSearch = () => {
        if (detectedCode) {
            setShowCodeDialog(false);
            // Ignore this code from future prompts just in case
            ignoredCodesRef.current.add(detectedCode);
            searchArticles({ sequentialCode: detectedCode });
        }
    };

    const ignoreCodeSearch = () => {
        if (detectedCode) {
            ignoredCodesRef.current.add(detectedCode);
            setShowCodeDialog(false);
            // Search normally
            searchArticles();
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setFilters({
            tags: [],
            categories: [],
            platforms: [],
            sortBy: 'relevance',
        });
        setSearchParams({});
    };

    // Update URL params when local state changes
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        let changed = false;

        if (debouncedSearchQuery !== (searchParams.get('q') || '')) {
            if (debouncedSearchQuery) params.set('q', debouncedSearchQuery);
            else params.delete('q');
            changed = true;
        }

        const currentTag = searchParams.get('tag');
        if (debouncedFilters.tags.length > 0) {
            const tag = availableTags.find(t => t.id === debouncedFilters.tags[0]);
            if (tag && tag.name !== currentTag) {
                params.set('tag', tag.name);
                changed = true;
            }
        } else if (currentTag) {
            params.delete('tag');
            changed = true;
        }

        const currentCat = searchParams.get('category');
        if (debouncedFilters.categories.length > 0) {
            const cat = availableCategories.find(c => c.id === debouncedFilters.categories[0]);
            if (cat && cat.name !== currentCat) {
                params.set('category', cat.name);
                changed = true;
            }
        } else if (currentCat) {
            params.delete('category');
            changed = true;
        }

        const currentPlat = searchParams.get('platform');
        if (debouncedFilters.platforms.length > 0) {
            const plat = availablePlatforms.find(p => p.id === debouncedFilters.platforms[0]);
            if (plat && plat.name !== currentPlat) {
                params.set('platform', plat.name);
                changed = true;
            }
        } else if (currentPlat) {
            params.delete('platform');
            changed = true;
        }

        if (changed) {
            setSearchParams(params, { replace: true });
        }
    }, [debouncedSearchQuery, debouncedFilters, availableTags, availableCategories, availablePlatforms, searchParams, setSearchParams]);

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

            {/* Sequential Code Confirmation Dialog */}
            <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
                <DialogContent className="sm:max-w-md bg-[#1b2838] border-[#2a475e] text-[#c7d5e0]">
                    <DialogHeader>
                        <DialogTitle className="text-white">Advanced Search Detected</DialogTitle>
                        <DialogDescription className="text-[#8f98a0]">
                            We detected a sequential code: <span className="text-white font-mono font-bold">{detectedCode}</span>.
                            <br />
                            Do you want to use the Advanced Search for this specific code?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
                        <Button
                            variant="primary"
                            onClick={confirmCodeSearch}
                            className="w-full sm:w-auto"
                        >
                            Use Advanced Search
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={ignoreCodeSearch}
                            className="w-full sm:w-auto"
                        >
                            Search Normally
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setShowCodeDialog(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
