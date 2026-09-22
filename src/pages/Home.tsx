import { useState } from 'react';
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
import SearchResultItem from '@/components/common/SearchResultItem';
import SearchFilters from '@/components/common/SearchFilters';
import GameCard from '@/components/common/GameCard';
import { Pagination } from '@/components/common/Pagination';
import { useArticleSearch } from '@/hooks/useArticleSearch';
import { cn } from '@/lib/utils';

export default function Home() {
    const { t } = useTranslation();

    const {
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        isLoading,
        articlesData,
        paginatedArticles,
        totalPages,
        currentPage,
        setCurrentPage,
        availableFilters,
        codeSearch,
        clearSearch,
    } = useArticleSearch();
    
    // UI-specific state
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('chanox2_search_viewmode') as 'grid' | 'list') || 'grid';
    });
    const [showNotice, setShowNotice] = useState(true);

    const handleSetViewMode = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('chanox2_search_viewmode', mode);
    };
    
    const paginationComponent = (
        <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalResults={articlesData.total}
        />
    );

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="bg-card/40 border-b border-border/60 py-4 px-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-[15px] font-bold text-foreground tracking-wider uppercase">
                        {t('store.downloads_catalog')}
                    </h1>

                    <div className="flex items-center gap-3">
                        {/* Layout Toggle Buttons */}
                        <div className="flex items-center gap-1.5 bg-muted/50 border border-border p-1 rounded-md">
                            <button
                                onClick={() => handleSetViewMode('grid')}
                                className={cn(
                                    "p-1.5 rounded transition-all",
                                    viewMode === 'grid'
                                        ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
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
                                        ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                title="List View (Steam)"
                            >
                                <List size={15} />
                            </button>
                        </div>

                        {/* Mobile filter toggle */}
                        <button
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            className="lg:hidden flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                        >
                            <Settings2 size={18} />
                            <span className="text-sm font-medium">{t('store.filters')}</span>
                        </button>
                    </div>
                </div>

                {/* Search Input */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder={t('store.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-3.5 pr-10 py-2 bg-muted/60 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[13px] transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => {}} // SWR in hook handles query changes automatically
                        className="px-4 py-2 bg-muted hover:bg-primary hover:text-primary-foreground text-foreground border border-border hover:border-primary text-[13px] font-medium rounded-md transition-all flex items-center gap-2"
                    >
                        <SearchIcon size={14} />
                        {t('store.search_btn')}
                    </button>
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Results list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
                    <div className="p-4 max-w-[1400px] mx-auto">
                        {showNotice && (
                            <div className="relative flex gap-3 bg-primary/10 border border-primary/25 rounded-lg p-3.5 mb-4 text-xs text-foreground">
                                <AlertCircle size={15} className="text-primary shrink-0 mt-0.5" />
                                <div className="flex-1 pr-6 leading-relaxed">
                                    <p className="font-bold text-foreground mb-0.5 uppercase tracking-wider text-[10px]">{t('store.community_notice')}</p>
                                    <span className="text-muted-foreground">{t('store.notice_content')}</span>
                                </div>
                                <button
                                    onClick={() => setShowNotice(false)}
                                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Dismiss notice"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-80">
                                <Loader2 className="w-9 h-9 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">{t('store.loading_db')}</p>
                            </div>
                        ) : paginatedArticles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-80 text-center">
                                <p className="text-muted-foreground text-base font-semibold">{t('store.no_titles')}</p>
                                <p className="text-muted-foreground/70 text-sm mt-1">{t('store.adjust_filters')}</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 mt-2">{paginationComponent}</div>

                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 py-2">
                                        {paginatedArticles.map((article) => (
                                            <GameCard key={article.id} article={article} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-0.5 bg-card rounded-lg border border-border/60 divide-y divide-border/40 overflow-hidden">
                                        {paginatedArticles.map((article) => (
                                            <SearchResultItem key={article.id} article={article} />
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4">{paginationComponent}</div>
                            </>
                        )}
                    </div>
                </div>

                {/* Filter sidebar - Desktop */}
                <div className="hidden lg:block">
                    <SearchFilters
                        filters={filters}
                        onFiltersChange={setFilters}
                        availableTags={availableFilters.tags}
                        availableCategories={availableFilters.categories}
                        availablePlatforms={availableFilters.platforms}
                        resultsCount={articlesData.total}
                    />
                </div>

                {/* Filter sidebar - Mobile overlay */}
                {showMobileFilters && (
                    <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
                        <div className="absolute right-0 top-0 bottom-0 w-[300px] bg-card border-l border-border shadow-2xl flex flex-col">
                            <div className="flex items-center justify-between p-3.5 border-b border-border bg-muted/40">
                                <span className="text-foreground font-bold tracking-wider uppercase text-xs">{t('store.filters')}</span>
                                <button
                                    onClick={() => setShowMobileFilters(false)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <SearchFilters
                                    filters={filters}
                                    onFiltersChange={setFilters}
                                    availableTags={availableFilters.tags}
                                    availableCategories={availableFilters.categories}
                                    availablePlatforms={availableFilters.platforms}
                                    resultsCount={articlesData.total}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sequential Code Confirmation Dialog */}
            <Dialog open={codeSearch.showDialog} onOpenChange={codeSearch.close}>
                <DialogContent className="sm:max-w-md bg-card border border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">{t('store.adv_search_detected')}</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            {t('store.adv_search_desc', { code: codeSearch.detectedCode })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
                        <Button
                            variant="primary"
                            onClick={codeSearch.confirm}
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        >
                            {t('store.use_adv_search')}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={codeSearch.ignore}
                            className="w-full sm:w-auto bg-muted text-foreground border border-border hover:bg-muted/80"
                        >
                            {t('store.search_normally')}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={codeSearch.close}
                            className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
                        >
                            {t('cancel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
