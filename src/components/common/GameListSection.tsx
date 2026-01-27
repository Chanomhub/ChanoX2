import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Article, ArticleImage } from '@/types/graphql';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SafeImage } from '@/components/common/SafeImage';
import { getOptimizedImageUrl } from '@/libs/image';

interface ArticleWithImages extends Article {
    images?: ArticleImage[];
}

interface GameListSectionProps {
    articles: ArticleWithImages[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
}

const tabs = ['New & Trending', 'Top Sellers', 'Popular Upcoming', 'Specials'];
const ITEMS_PER_PAGE = 10;

export default function GameListSection({
    articles,
    onLoadMore,
    hasMore = false,
    loadingMore = false
}: GameListSectionProps) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hoveredArticle, setHoveredArticle] = useState<ArticleWithImages | null>(null);
    const [previewImageIndex, setPreviewImageIndex] = useState(0);

    // Navigate to search page with query
    const handleSearch = () => {
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    // Auto-rotate preview images
    useEffect(() => {
        if (!hoveredArticle?.images?.length) return;

        const interval = setInterval(() => {
            setPreviewImageIndex(prev =>
                (prev + 1) % (hoveredArticle.images?.length || 1)
            );
        }, 2000);

        return () => clearInterval(interval);
    }, [hoveredArticle]);

    // Reset image index when hovered article changes
    useEffect(() => {
        setPreviewImageIndex(0);
    }, [hoveredArticle?.id]);

    const totalPages = Math.ceil(articles.length / ITEMS_PER_PAGE);

    const displayedArticles = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return articles.slice(start, start + ITEMS_PER_PAGE);
    }, [articles, currentPage]);

    const goToPrevious = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    const goToNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(p => p + 1);
        } else if (hasMore && onLoadMore) {
            onLoadMore();
        }
    };

    // Set first article as default hovered
    useEffect(() => {
        if (displayedArticles.length > 0 && !hoveredArticle) {
            setHoveredArticle(displayedArticles[0]);
        }
    }, [displayedArticles]);

    return (
        <div className="mb-12 w-full max-w-[1200px] mx-auto px-4 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 border-b border-[#2a475e] bg-[#1b2838] px-2 rounded-t-sm">
                <div className="flex overflow-x-auto">
                    {tabs.map((tab, index) => (
                        <button
                            key={tab}
                            className={cn(
                                "px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                                activeTab === index
                                    ? "text-[#dcdedf] border-b-2 border-[#1a9fff]"
                                    : "text-[#8b929a] hover:text-white"
                            )}
                            onClick={() => setActiveTab(index)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="py-2 pr-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7681]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Search Store"
                            className="bg-[#2a475e] border border-[#1b2838] text-white pl-8 pr-2 h-8 text-xs w-[200px] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#66c0f4]"
                        />
                    </div>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="flex gap-4">
                {/* Left: Game List */}
                <div className="flex-1 flex flex-col gap-1">
                    {displayedArticles.length > 0 ? (
                        displayedArticles.map((article) => (
                            <Link
                                key={article.id}
                                to={`/article/${article.slug}`}
                                className={cn(
                                    "flex items-center p-2 gap-4 group transition-all duration-200",
                                    hoveredArticle?.id === article.id
                                        ? "bg-gradient-to-r from-[#1b2838] to-[#2a475e] shadow-lg"
                                        : "bg-[#16202d] hover:bg-[#1b2838]"
                                )}
                                onMouseEnter={() => setHoveredArticle(article)}
                            >
                                {/* Game Banner */}
                                <div className="w-[184px] h-[69px] relative flex-shrink-0 overflow-hidden rounded-sm">
                                    {article.coverImage ? (
                                        <SafeImage
                                            src={getOptimizedImageUrl(article.coverImage, { width: 184, height: 69, fit: 'cover' })}
                                            alt={article.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-[#2a475e]" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className="text-[#c7d5e0] text-sm font-normal group-hover:text-white truncate">
                                        {article.title}
                                    </h3>
                                    <div className="flex gap-2 flex-wrap mt-1">
                                        {(article.tags ?? []).slice(0, 3).map((tag) => (
                                            <span
                                                key={tag.id}
                                                className="text-[#8b929a] text-[10px] bg-[#1b2838] px-1.5 py-0.5 rounded"
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-[#384959] group-hover:text-[#4f6479] mt-1">
                                        <span className="truncate">{(article.platforms ?? []).map(p => p.name).join(', ')}</span>
                                        {article.ver && (
                                            <>
                                                <span className="select-none">•</span>
                                                <span className="shrink-0">v{article.ver}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-8 text-center text-[#8b929a] italic">
                            No games found matching "{searchQuery}"
                        </div>
                    )}
                </div>

                {/* Right: Preview Panel */}
                {hoveredArticle && (
                    <div className="w-[324px] flex-shrink-0 bg-[#1b2838] rounded-sm overflow-hidden hidden lg:block">
                        {/* Main Preview Image */}
                        <div className="w-full h-[151px] relative overflow-hidden">
                            {hoveredArticle.images && hoveredArticle.images.length > 0 ? (
                                <SafeImage
                                    src={getOptimizedImageUrl(hoveredArticle.images[previewImageIndex]?.url || hoveredArticle.mainImage || '', { width: 324, height: 151, fit: 'cover' })}
                                    alt={hoveredArticle.title}
                                    className="w-full h-full object-cover transition-opacity duration-300"
                                />
                            ) : hoveredArticle.mainImage ? (
                                <SafeImage
                                    src={getOptimizedImageUrl(hoveredArticle.mainImage, { width: 324, height: 151, fit: 'cover' })}
                                    alt={hoveredArticle.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#2a475e]" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <h3 className="text-white text-base font-normal truncate" title={hoveredArticle.title}>
                                    {hoveredArticle.title}
                                </h3>
                                {hoveredArticle.ver && (
                                    <span className="shrink-0 text-[#67c1f5] text-xs bg-[#67c1f5]/10 px-2 py-0.5 rounded border border-[#67c1f5]/20">
                                        {hoveredArticle.ver}
                                    </span>
                                )}
                            </div>

                            {/* Creators */}
                            {(hoveredArticle.creators ?? []).length > 0 && (
                                <div className="mb-2 text-xs text-[#c6d4df]">
                                    <span className="text-[#566168]">Developer: </span>
                                    {hoveredArticle.creators.map(c => c.name).join(', ')}
                                </div>
                            )}

                            {/* Engine */}
                            {hoveredArticle.engine && (
                                <div className="mb-2 text-xs text-[#c6d4df]">
                                    <span className="text-[#566168]">Engine: </span>
                                    {hoveredArticle.engine.name}
                                </div>
                            )}

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {(hoveredArticle.tags ?? []).slice(0, 5).map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="text-[#67c1f5] text-[10px] bg-[#67c1f5]/20 px-2 py-0.5 rounded"
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            {/* Thumbnail column - vertical layout */}
                            {hoveredArticle.images && hoveredArticle.images.length > 1 && (
                                <div className="flex flex-col gap-2 mt-3">
                                    {hoveredArticle.images.map((img, idx) => (
                                        <button
                                            key={img.id}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setPreviewImageIndex(idx);
                                            }}
                                            className={cn(
                                                "w-full h-[80px] rounded-sm overflow-hidden border-2 transition-colors",
                                                previewImageIndex === idx
                                                    ? "border-[#67c1f5]"
                                                    : "border-transparent hover:border-[#67c1f5]/50"
                                            )}
                                        >
                                            <SafeImage
                                                src={getOptimizedImageUrl(img.url, { width: 292, height: 80, fit: 'cover' })}
                                                alt={`Screenshot ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {(articles.length > ITEMS_PER_PAGE || hasMore) && (
                <div className="flex justify-between items-center mt-4 pt-2 border-t border-[#1a2332]">
                    <span className="text-[#8b929a] text-xs">
                        Page {currentPage} {hasMore ? '...' : `of ${totalPages}`}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1 || loadingMore}
                            onClick={goToPrevious}
                            className="px-3 py-1 bg-[#1b2838] text-[#66c0f4] text-sm rounded hover:bg-[#2a475e] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </button>
                        <button
                            disabled={(currentPage === totalPages && !hasMore) || loadingMore}
                            onClick={goToNext}
                            className="px-3 py-1 bg-[#1b2838] text-[#66c0f4] text-sm rounded hover:bg-[#2a475e] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {loadingMore ? 'Loading...' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
