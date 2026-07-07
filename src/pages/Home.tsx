import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon, Loader2, X, Settings2, LayoutGrid, List, AlertCircle } from 'lucide-react';
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
import type { ArticleListItem } from '@chanomhub/sdk';
import SearchResultItem from '@/components/common/SearchResultItem';
import SearchFilters, { type FilterState, type FilterEntity } from '@/components/common/SearchFilters';
import GameCard from '@/components/common/GameCard';
import { cn } from '@/lib/utils';

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

export default function Home() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // Sequential Code Search Detection
    const [showCodeDialog, setShowCodeDialog] = useState(false);
    const [detectedCode, setDetectedCode] = useState<string | null>(null);
    const [activeCodeSearch, setActiveCodeSearch] = useState<string | null>(null);
    const ignoredCodesRef = useRef<Set<string>>(new Set());

    // Filter state
    const [filters, setFilters] = useState<FilterState>({
        tags: [],
        categories: [],
        platforms: [],
        sortBy: 'date',
    });

    // Available filter options - accumulated from search results
    const [availableTags, setAvailableTags] = useState<FilterEntity[]>([]);
    const [availableCategories, setAvailableCategories] = useState<FilterEntity[]>([]);
    const [availablePlatforms, setAvailablePlatforms] = useState<FilterEntity[]>([]);

    // Use refs to access current filter options without triggering re-renders
    const tagsRef = useRef<FilterEntity[]>([]);
    const categoriesRef = useRef<FilterEntity[]>([]);
    const platformsRef = useRef<FilterEntity[]>([]);

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

    // F95Zone Layout/Pagination/Notice States
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('chanox2_search_viewmode') as 'grid' | 'list') || 'grid';
    });
    const [showNotice, setShowNotice] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 24;

    const handleSetViewMode = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('chanox2_search_viewmode', mode);
    };

    // Helper map
    const mapToEntity = useCallback((items: any[]): FilterEntity[] => 
        (items || []).map((item) => 
            typeof item === 'string' 
                ? { id: item, name: item } 
                : { id: String(item.id), name: item.name }
        ), []
    );

    // 1. Fetch tags, categories, platforms via SWR (De-duplicated & Cached)
    const { data: rawTags } = useSWR('system-tags', () => sdk.articles.getTags(), {
        revalidateOnFocus: false,
        dedupingInterval: 10000,
    });
    const { data: rawCategories } = useSWR('system-categories', () => sdk.articles.getCategories(), {
        revalidateOnFocus: false,
        dedupingInterval: 10000,
    });
    const { data: rawPlatforms } = useSWR('system-platforms', () => sdk.articles.getPlatforms(), {
        revalidateOnFocus: false,
        dedupingInterval: 10000,
    });

    // Populate initial filters when SWR finishes
    useEffect(() => {
        if (rawTags) setAvailableTags(mapToEntity(rawTags));
    }, [rawTags, mapToEntity]);

    useEffect(() => {
        if (rawCategories) setAvailableCategories(mapToEntity(rawCategories));
    }, [rawCategories, mapToEntity]);

    useEffect(() => {
        if (rawPlatforms) setAvailablePlatforms(mapToEntity(rawPlatforms));
    }, [rawPlatforms, mapToEntity]);

    const hasMultipleFilters = useMemo(() => {
        return debouncedFilters.tags.length > 1 || 
               debouncedFilters.categories.length > 1 || 
               debouncedFilters.platforms.length > 1;
    }, [debouncedFilters]);

    // 2. Fetch main catalog via SWR (De-duplicated & Cached with Server-side Pagination)
    const { data: searchResult, isLoading: loading } = useSWR(
        ['articles-catalog', debouncedSearchQuery, debouncedFilters, activeCodeSearch, currentPage, hasMultipleFilters],
        async ([, q, fState, codeSearch, page, multiFilter]) => {
            // Detect sequential code in background first (if codeSearch is not set yet)
            if (!codeSearch) {
                const queryTrimmed = q.trim();
                const codeMatch = queryTrimmed.match(/^(HJ|RJ)\d{2,}/i);
                if (codeMatch && !ignoredCodesRef.current.has(codeMatch[0].toUpperCase())) {
                    setDetectedCode(codeMatch[0].toUpperCase());
                    setShowCodeDialog(true);
                }
            }

            const apiFilter: any = {};
            const urlParams = new URLSearchParams(window.location.search);
            const urlTag = urlParams.get('tag');
            const urlCategory = urlParams.get('category');
            const urlPlatform = urlParams.get('platform');

            if (fState.tags.length > 0) {
                const selectedTag = tagsRef.current.find(t => t.id === fState.tags[0]);
                if (selectedTag) apiFilter.tag = selectedTag.name;
            } else if (urlTag) {
                apiFilter.tag = urlTag;
            }

            if (fState.categories.length > 0) {
                const selectedCat = categoriesRef.current.find(c => c.id === fState.categories[0]);
                if (selectedCat) apiFilter.category = selectedCat.name;
            } else if (urlCategory) {
                apiFilter.category = urlCategory;
            }

            if (fState.platforms.length > 0) {
                const selectedPlat = platformsRef.current.find(p => p.id === fState.platforms[0]);
                if (selectedPlat) apiFilter.platform = selectedPlat.name;
            } else if (urlPlatform) {
                apiFilter.platform = urlPlatform;
            }

            if (multiFilter) {
                delete apiFilter.tag;
                delete apiFilter.category;
                delete apiFilter.platform;
            }

            if (codeSearch) {
                apiFilter.sequentialCode = codeSearch;
            } else if (q.trim()) {
                apiFilter.q = q.trim();
            }

            // Server-side sorting
            switch (fState.sortBy) {
                case 'date':
                    apiFilter.sortBy = 'updatedAt';
                    apiFilter.sortOrder = 'desc';
                    break;
                case 'popularity':
                    apiFilter.sortBy = 'viewsCount';
                    apiFilter.sortOrder = 'desc';
                    break;
                case 'title':
                    apiFilter.sortBy = 'title';
                    apiFilter.sortOrder = 'asc';
                    break;
            }

            const limit = multiFilter ? 500 : itemsPerPage;
            const offset = multiFilter ? 0 : (page - 1) * itemsPerPage;

            const options = {
                limit,
                offset,
                filter: apiFilter
            };

            const result = await sdk.articles.getAllPaginated(options);
            return withImageTransform(result);
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 5000,
        }
    );

    // Client-side filtering and sorting
    const articlesData = useMemo(() => {
        if (!searchResult?.items) return { items: [], total: 0 };
        
        let items = [...searchResult.items];
        let total = searchResult.total || 0;

        if (hasMultipleFilters) {
            if (debouncedFilters.tags.length > 1) {
                items = items.filter((article) =>
                    debouncedFilters.tags.every((tagId) => 
                        article.tags?.some((t) => String(t.id) === tagId)
                    )
                );
            }
            if (debouncedFilters.categories.length > 1) {
                items = items.filter((article) =>
                    debouncedFilters.categories.every((catId) => 
                        article.categories?.some((c) => String(c.id) === catId)
                    )
                );
            }
            if (debouncedFilters.platforms.length > 1) {
                items = items.filter((article) =>
                    debouncedFilters.platforms.every((platId) => 
                        article.platforms?.some((p) => String(p.id) === platId)
                    )
                );
            }

            switch (debouncedFilters.sortBy) {
                case 'date':
                    items.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
                    break;
                case 'popularity':
                    items.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
                    break;
                case 'title':
                    items.sort((a, b) => a.title.localeCompare(b.title));
                    break;
            }

            total = items.length;
            const startIdx = (currentPage - 1) * itemsPerPage;
            items = items.slice(startIdx, startIdx + itemsPerPage);
        } else {
            switch (debouncedFilters.sortBy) {
                case 'date':
                    items.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
                    break;
                case 'popularity':
                    items.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0));
                    break;
                case 'title':
                    items.sort((a, b) => a.title.localeCompare(b.title));
                    break;
            }
        }

        return { items, total };
    }, [searchResult, debouncedFilters, hasMultipleFilters, currentPage]);

    // Reset page index on search query or filters update
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, debouncedFilters]);

    const totalPages = Math.ceil(articlesData.total / itemsPerPage);
    const paginatedArticles = articlesData.items;

    // Sync URL params to local state
    useEffect(() => {
        const urlQuery = searchParams.get('q');
        if (urlQuery !== null && urlQuery !== searchQuery) {
            setSearchQuery(urlQuery);
        }

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

    // Accumulate filter options from search results
    const accumulateFilterOptions = useCallback((items: ArticleListItem[]) => {
        const newTagsMap = new Map<string, FilterEntity>();
        tagsRef.current.forEach(tag => newTagsMap.set(tag.id, tag));
        items.forEach((article) => {
            article.tags?.forEach((tag) => newTagsMap.set(String(tag.id), { id: String(tag.id), name: tag.name }));
        });
        const newTags = Array.from(newTagsMap.values());
        if (newTags.length !== tagsRef.current.length) {
            setAvailableTags(newTags);
        }

        const newCategoriesMap = new Map<string, FilterEntity>();
        categoriesRef.current.forEach(cat => newCategoriesMap.set(cat.id, cat));
        items.forEach((article) => {
            article.categories?.forEach((cat) => newCategoriesMap.set(String(cat.id), { id: String(cat.id), name: cat.name }));
        });
        const newCategories = Array.from(newCategoriesMap.values());
        if (newCategories.length !== categoriesRef.current.length) {
            setAvailableCategories(newCategories);
        }

        const newPlatformsMap = new Map<string, FilterEntity>();
        platformsRef.current.forEach(plat => newPlatformsMap.set(plat.id, plat));
        items.forEach((article) => {
            article.platforms?.forEach((plat) => newPlatformsMap.set(String(plat.id), { id: String(plat.id), name: plat.name }));
        });
        const newPlatforms = Array.from(newPlatformsMap.values());
        if (newPlatforms.length !== platformsRef.current.length) {
            setAvailablePlatforms(newPlatforms);
        }
    }, []);

    // Call accumulate filter options
    useEffect(() => {
        if (searchResult?.items) {
            accumulateFilterOptions(searchResult.items);
        }
    }, [searchResult, accumulateFilterOptions]);

    const confirmCodeSearch = () => {
        if (detectedCode) {
            setShowCodeDialog(false);
            ignoredCodesRef.current.add(detectedCode);
            setActiveCodeSearch(detectedCode);
        }
    };

    const ignoreCodeSearch = () => {
        if (detectedCode) {
            ignoredCodesRef.current.add(detectedCode);
            setShowCodeDialog(false);
            setActiveCodeSearch(null);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setActiveCodeSearch(null);
        setFilters({
            tags: [],
            categories: [],
            platforms: [],
            sortBy: 'date',
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

    // Helper to render pagination controls
    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const getPageNumbers = () => {
            const pages = [];
            const maxVisible = 5;
            if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
                if (currentPage <= 3) {
                    pages.push(1, 2, 3, 4, '...', totalPages);
                } else if (currentPage >= totalPages - 2) {
                    pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                } else {
                    pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                }
            }
            return pages;
        };

        return (
            <div className="flex items-center justify-between bg-[#111721] border border-[#2d3a4f]/40 p-2 rounded-md mb-4 mt-2">
                <div className="flex gap-1">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="px-3 py-1.5 rounded bg-[#161d28] hover:bg-[#202936] text-xs font-semibold text-zinc-300 disabled:opacity-40 disabled:hover:bg-[#161d28] transition-colors"
                    >
                        {t('store.prev')}
                    </button>
                    {getPageNumbers().map((p, idx) => (
                        <button
                            key={idx}
                            disabled={p === '...'}
                            onClick={() => typeof p === 'number' && setCurrentPage(p)}
                            className={cn(
                                "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                                p === currentPage
                                    ? "bg-rose-600 text-white"
                                    : p === '...'
                                        ? "text-zinc-500 cursor-default bg-transparent"
                                        : "bg-[#161d28] hover:bg-[#202936] text-zinc-300"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="px-3 py-1.5 rounded bg-[#161d28] hover:bg-[#202936] text-xs font-semibold text-zinc-300 disabled:opacity-40 disabled:hover:bg-[#161d28] transition-colors"
                    >
                        {t('store.next')}
                    </button>
                </div>

                <span className="text-[11px] text-zinc-500 hidden sm:inline">
                    {t('store.pagination_info', { current: currentPage, total: totalPages, count: articlesData.total })}
                </span>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0e14]">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#111721] to-[#0a0e14] border-b border-[#2d3a4f]/30 py-4 px-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[15px] font-bold text-white tracking-wider uppercase">
                        {t('store.downloads_catalog')}
                    </h1>

                    <div className="flex items-center gap-3">
                        {/* Layout Toggle Buttons */}
                        <div className="flex items-center gap-1.5 bg-[#161d28] border border-[#2d3a4f]/40 p-1 rounded-md">
                            <button
                                onClick={() => handleSetViewMode('grid')}
                                className={cn(
                                    "p-1.5 rounded transition-all",
                                    viewMode === 'grid'
                                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                                title="Grid View (F95Zone)"
                            >
                                <LayoutGrid size={15} />
                            </button>
                            <button
                                onClick={() => handleSetViewMode('list')}
                                className={cn(
                                    "p-1.5 rounded transition-all",
                                    viewMode === 'list'
                                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                                title="List View (Steam)"
                            >
                                <List size={15} />
                            </button>
                        </div>

                        {/* Mobile filter toggle */}
                        <button
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className="lg:hidden flex items-center gap-2 text-[#66c0f4] hover:text-white transition-colors"
                        >
                            <Settings2 size={18} />
                            <span className="text-sm">{t('store.filters')}</span>
                        </button>
                    </div>
                </div>

                {/* Search Input - Sleek F95 style */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder={t('store.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-3.5 pr-10 py-2 bg-[#111721] border border-[#2d3a4f]/50 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 text-[13px] transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => {}} // SWR handles query changes automatically
                        className="px-4 py-2 bg-[#161d28] hover:bg-rose-600 hover:text-white text-zinc-300 border border-[#2d3a4f]/50 hover:border-rose-500 text-[13px] rounded-md transition-all flex items-center gap-2"
                    >
                        <SearchIcon size={14} />
                        {t('store.search_btn')}
                    </button>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Results list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0e14]">
                    <div className="p-4 max-w-[1400px] mx-auto">
                        {/* Notice Alert Banner */}
                        {showNotice && (
                            <div className="relative flex gap-3 bg-rose-500/10 border border-rose-500/25 rounded-lg p-3.5 mb-4 text-xs text-rose-200">
                                <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                                <div className="flex-1 pr-6 leading-relaxed">
                                    <p className="font-bold text-white mb-0.5 uppercase tracking-wider text-[10px]">{t('store.community_notice')}</p>
                                    {t('store.notice_content')}
                                </div>
                                <button
                                    onClick={() => setShowNotice(false)}
                                    className="absolute top-3 right-3 text-rose-400 hover:text-white transition-colors"
                                    title="Dismiss notice"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-80">
                                <Loader2 className="w-9 h-9 animate-spin text-[#66c0f4] mb-4" />
                                <p className="text-zinc-500 text-sm font-semibold tracking-wider uppercase">{t('store.loading_db')}</p>
                            </div>
                        ) : articlesData.items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-80 text-center">
                                <p className="text-zinc-400 text-base font-semibold">{t('store.no_titles')}</p>
                                <p className="text-zinc-600 text-sm mt-1">
                                    {t('store.adjust_filters')}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Top Pagination */}
                                {renderPagination()}

                                {/* Results Grid / List */}
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 py-2">
                                        {paginatedArticles.map((article) => (
                                            <GameCard key={article.id} article={article} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-0.5 bg-[#111721] rounded-lg border border-[#2d3a4f]/25 divide-y divide-[#2d3a4f]/15 overflow-hidden">
                                        {paginatedArticles.map((article) => (
                                            <SearchResultItem key={article.id} article={article} />
                                        ))}
                                    </div>
                                )}

                                {/* Bottom Pagination */}
                                <div className="mt-4">
                                    {renderPagination()}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Filter sidebar - Desktop */}
                <div className="hidden lg:block">
                    <SearchFilters
                        filters={filters}
                        onFiltersChange={setFilters}
                        availableTags={availableTags}
                        availableCategories={availableCategories}
                        availablePlatforms={availablePlatforms}
                        resultsCount={articlesData.total}
                    />
                </div>

                {/* Filter sidebar - Mobile overlay */}
                {showMobileFilters && (
                    <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
                        <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-[#111721] shadow-2xl flex flex-col">
                            <div className="flex items-center justify-between p-3.5 border-b border-[#2d3a4f]/50 bg-[#161d28]">
                                <span className="text-white font-bold tracking-wider uppercase text-xs">{t('store.filters')}</span>
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="text-zinc-400 hover:text-white"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <SearchFilters
                                    filters={filters}
                                    onFiltersChange={setFilters}
                                    availableTags={availableTags}
                                    availableCategories={availableCategories}
                                    availablePlatforms={availablePlatforms}
                                    resultsCount={articlesData.total}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sequential Code Confirmation Dialog */}
            <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
                <DialogContent className="sm:max-w-md bg-[#111721] border-[#2d3a4f]/50 text-zinc-300">
                    <DialogHeader>
                        <DialogTitle className="text-white">{t('store.adv_search_detected')}</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            {t('store.adv_search_desc', { code: detectedCode })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
                        <Button
                            variant="primary"
                            onClick={confirmCodeSearch}
                            className="w-full sm:w-auto bg-[#66c0f4] hover:bg-[#5ab0e4] text-[#0a0e14]"
                        >
                            {t('store.use_adv_search')}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={ignoreCodeSearch}
                            className="w-full sm:w-auto bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                        >
                            {t('store.search_normally')}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setShowCodeDialog(false)}
                            className="w-full sm:w-auto text-zinc-500 hover:text-zinc-300"
                        >
                            {t('cancel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
