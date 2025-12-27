import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Article } from '@/types/graphql';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { SafeImage } from '@/components/common/SafeImage';

interface GameListSectionProps {
    articles: Article[];
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
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab]);

    const filteredArticles = useMemo(() => {
        if (!searchQuery) {
            return articles;
        }
        return articles.filter(article =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [articles, searchQuery, activeTab]);

    const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);

    const displayedArticles = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredArticles, currentPage]);

    const goToPrevious = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    const goToNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(p => p + 1);
        } else if (hasMore && !searchQuery && onLoadMore) {
            onLoadMore();
        }
    };

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
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Store"
                            className="bg-[#2a475e] border-[#1b2838] text-white pl-8 h-8 text-xs w-[200px] focus-visible:ring-offset-0 focus-visible:border-[#66c0f4]"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-1">
                {displayedArticles.length > 0 ? (
                    displayedArticles.map((article) => (
                        <Link
                            key={article.id}
                            to={`/article/${article.slug}`}
                            className="flex items-center bg-[#16202d] hover:bg-[#1b2838] p-2 gap-4 group transition-colors shadow-sm"
                        >
                            <div className="w-[120px] h-[45px] relative flex-shrink-0">
                                {article.coverImage ? (
                                    <SafeImage
                                        src={article.coverImage}
                                        alt={article.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-[#2a475e]" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h3 className="text-[#c7d5e0] text-sm font-normal group-hover:text-white truncate">{article.title}</h3>
                                <div className="flex gap-2 text-xs text-[#384959] group-hover:text-[#4f6479]">
                                    {article.platforms.map(p => p.name).join(', ')}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {article.tags.slice(0, 2).map((tag) => (
                                    <span key={tag.id} className="text-[#8b929a] text-xs hidden md:inline-block">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            <div className="text-[#dcdedf] text-sm font-normal px-4">
                                Free
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-8 text-center text-[#8b929a] italic">
                        No games found matching "{searchQuery}"
                    </div>
                )}
            </div>

            {/* Pagination */}
            {(filteredArticles.length > ITEMS_PER_PAGE || (hasMore && !searchQuery)) && (
                <div className="flex justify-between items-center mt-4 pt-2 border-t border-[#1a2332]">
                    <span className="text-[#8b929a] text-xs">
                        Page {currentPage} {hasMore && !searchQuery ? '...' : `of ${totalPages}`}
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
