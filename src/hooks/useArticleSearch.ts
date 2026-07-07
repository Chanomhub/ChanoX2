import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { sdk, withImageTransform } from '@/libs/sdk';
import type { ArticleListItem } from '@chanomhub/sdk';
import { type FilterState, type FilterEntity } from '@/components/common/SearchFilters';

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

const ITEMS_PER_PAGE = 24;

export function useArticleSearch() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    
    // Sequential Code Search Detection
    const [showCodeDialog, setShowCodeDialog] = useState(false);
    const [detectedCode, setDetectedCode] = useState<string | null>(null);
    const [activeCodeSearch, setActiveCodeSearch] = useState<string | null>(null);
    const ignoredCodesRef = useRef<Set<string>>(new Set());

    const [filters, setFilters] = useState<FilterState>({
        tags: [],
        categories: [],
        platforms: [],
        sortBy: 'date',
    });

    const [availableTags, setAvailableTags] = useState<FilterEntity[]>([]);
    const [availableCategories, setAvailableCategories] = useState<FilterEntity[]>([]);
    const [availablePlatforms, setAvailablePlatforms] = useState<FilterEntity[]>([]);

    const tagsRef = useRef<FilterEntity[]>([]);
    const categoriesRef = useRef<FilterEntity[]>([]);
    const platformsRef = useRef<FilterEntity[]>([]);

    useEffect(() => { tagsRef.current = availableTags; }, [availableTags]);
    useEffect(() => { categoriesRef.current = availableCategories; }, [availableCategories]);
    useEffect(() => { platformsRef.current = availablePlatforms; }, [availablePlatforms]);

    const debouncedSearchQuery = useDebounce(searchQuery, 400);
    const debouncedFilters = useDebounce(filters, 300);
    
    const [currentPage, setCurrentPage] = useState(1);
    
    const mapToEntity = useCallback((items: any[]): FilterEntity[] => 
        (items || []).map((item) => 
            typeof item === 'string' 
                ? { id: item, name: item } 
                : { id: String(item.id), name: item.name }
        ), []
    );

    const { data: rawTags } = useSWR('system-tags', () => sdk.articles.getTags(), { revalidateOnFocus: false, dedupingInterval: 10000 });
    const { data: rawCategories } = useSWR('system-categories', () => sdk.articles.getCategories(), { revalidateOnFocus: false, dedupingInterval: 10000 });
    const { data: rawPlatforms } = useSWR('system-platforms', () => sdk.articles.getPlatforms(), { revalidateOnFocus: false, dedupingInterval: 10000 });

    useEffect(() => { if (rawTags) setAvailableTags(mapToEntity(rawTags)); }, [rawTags, mapToEntity]);
    useEffect(() => { if (rawCategories) setAvailableCategories(mapToEntity(rawCategories)); }, [rawCategories, mapToEntity]);
    useEffect(() => { if (rawPlatforms) setAvailablePlatforms(mapToEntity(rawPlatforms)); }, [rawPlatforms, mapToEntity]);

    const hasMultipleFilters = useMemo(() => {
        return debouncedFilters.tags.length > 1 || 
               debouncedFilters.categories.length > 1 || 
               debouncedFilters.platforms.length > 1;
    }, [debouncedFilters]);

    const { data: searchResult, isLoading } = useSWR(
        ['articles-catalog', debouncedSearchQuery, debouncedFilters, activeCodeSearch, currentPage, hasMultipleFilters],
        async ([, q, fState, codeSearch, page, multiFilter]) => {
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

            if (codeSearch) apiFilter.sequentialCode = codeSearch;
            else if (q.trim()) apiFilter.q = q.trim();

            switch (fState.sortBy) {
                case 'date': apiFilter.sortBy = 'updatedAt'; apiFilter.sortOrder = 'desc'; break;
                case 'popularity': apiFilter.sortBy = 'viewsCount'; apiFilter.sortOrder = 'desc'; break;
                case 'title': apiFilter.sortBy = 'title'; apiFilter.sortOrder = 'asc'; break;
            }

            const limit = multiFilter ? 500 : ITEMS_PER_PAGE;
            const offset = multiFilter ? 0 : (page - 1) * ITEMS_PER_PAGE;

            const result = await sdk.articles.getAllPaginated({ limit, offset, filter: apiFilter });
            return withImageTransform(result);
        },
        { revalidateOnFocus: false, dedupingInterval: 5000 }
    );

    const articlesData = useMemo(() => {
        if (!searchResult?.items) return { items: [], total: 0 };
        
        let items = [...searchResult.items];
        let total = searchResult.total || 0;

        if (hasMultipleFilters) {
            if (debouncedFilters.tags.length > 1) items = items.filter(a => debouncedFilters.tags.every(tId => a.tags?.some(t => String(t.id) === tId)));
            if (debouncedFilters.categories.length > 1) items = items.filter(a => debouncedFilters.categories.every(cId => a.categories?.some(c => String(c.id) === cId)));
            if (debouncedFilters.platforms.length > 1) items = items.filter(a => debouncedFilters.platforms.every(pId => a.platforms?.some(p => String(p.id) === pId)));

            switch (debouncedFilters.sortBy) {
                case 'date': items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()); break;
                case 'popularity': items.sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)); break;
                case 'title': items.sort((a, b) => a.title.localeCompare(b.title)); break;
            }

            total = items.length;
            const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
            items = items.slice(startIdx, startIdx + ITEMS_PER_PAGE);
        }

        return { items, total };
    }, [searchResult, debouncedFilters, hasMultipleFilters, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [debouncedSearchQuery, debouncedFilters]);
    
    useEffect(() => {
        const urlQuery = searchParams.get('q');
        if (urlQuery !== null && urlQuery !== searchQuery) setSearchQuery(urlQuery);

        const urlTag = searchParams.get('tag');
        const urlCategory = searchParams.get('category');
        const urlPlatform = searchParams.get('platform');
        if (!urlTag && !urlCategory && !urlPlatform) return;

        setFilters(prev => {
            const newFilters = { ...prev };
            let changed = false;
            if (urlTag && availableTags.length > 0) {
                const tag = availableTags.find(t => t.name.toLowerCase() === urlTag.toLowerCase());
                if (tag && !newFilters.tags.includes(tag.id)) { newFilters.tags = [tag.id]; changed = true; }
            }
            if (urlCategory && availableCategories.length > 0) {
                const cat = availableCategories.find(c => c.name.toLowerCase() === urlCategory.toLowerCase());
                if (cat && !newFilters.categories.includes(cat.id)) { newFilters.categories = [cat.id]; changed = true; }
            }
            if (urlPlatform && availablePlatforms.length > 0) {
                const plat = availablePlatforms.find(p => p.name.toLowerCase() === urlPlatform.toLowerCase());
                if (plat && !newFilters.platforms.includes(plat.id)) { newFilters.platforms = [plat.id]; changed = true; }
            }
            return changed ? newFilters : prev;
        });
    }, [searchParams, availableTags, availableCategories, availablePlatforms]);

    const accumulateFilterOptions = useCallback((items: ArticleListItem[]) => {
        const update = (current: FilterEntity[], key: 'tags' | 'categories' | 'platforms', name: string) => {
            const map = new Map<string, FilterEntity>();
            current.forEach(item => map.set(item.id, item));
            items.forEach(article => article[key]?.forEach(item => map.set(String(item.id), { id: String(item.id), name: item.name })));
            const newArray = Array.from(map.values());
            if (newArray.length > current.length) {
                if (name === 'tags') setAvailableTags(newArray);
                else if (name === 'categories') setAvailableCategories(newArray);
                else if (name === 'platforms') setAvailablePlatforms(newArray);
            }
        };
        update(tagsRef.current, 'tags', 'tags');
        update(categoriesRef.current, 'categories', 'categories');
        update(platformsRef.current, 'platforms', 'platforms');
    }, []);

    useEffect(() => {
        if (searchResult?.items) accumulateFilterOptions(searchResult.items);
    }, [searchResult, accumulateFilterOptions]);

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        let changed = false;

        const updateParam = (key: string, value: string | null) => {
            if (value && params.get(key) !== value) { params.set(key, value); changed = true; } 
            else if (!value && params.has(key)) { params.delete(key); changed = true; }
        };

        updateParam('q', debouncedSearchQuery || null);
        updateParam('tag', debouncedFilters.tags.length > 0 ? availableTags.find(t => t.id === debouncedFilters.tags[0])?.name || null : null);
        updateParam('category', debouncedFilters.categories.length > 0 ? availableCategories.find(c => c.id === debouncedFilters.categories[0])?.name || null : null);
        updateParam('platform', debouncedFilters.platforms.length > 0 ? availablePlatforms.find(p => p.id === debouncedFilters.platforms[0])?.name || null : null);
        
        if (changed) setSearchParams(params, { replace: true });
    }, [debouncedSearchQuery, debouncedFilters, availableTags, availableCategories, availablePlatforms, searchParams, setSearchParams]);

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
        setFilters({ tags: [], categories: [], platforms: [], sortBy: 'date' });
        setSearchParams({});
    };

    return {
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        isLoading,
        articlesData,
        paginatedArticles: articlesData.items,
        totalPages: Math.ceil(articlesData.total / ITEMS_PER_PAGE),
        currentPage,
        setCurrentPage,
        availableFilters: {
            tags: availableTags,
            categories: availableCategories,
            platforms: availablePlatforms,
        },
        codeSearch: {
            showDialog: showCodeDialog,
            detectedCode,
            confirm: confirmCodeSearch,
            ignore: ignoreCodeSearch,
            close: () => setShowCodeDialog(false)
        },
        clearSearch,
    };
}
