import useSWRInfinite from 'swr/infinite';
import { fetcher } from '@/libs/swr-fetcher';
import { GET_ARTICLES } from '@/libs/api/queries';
import { ArticlesResponse } from '@/types/graphql';
import FeaturedCarousel from '@/components/common/FeaturedCarousel';
import HorizontalScroll from '@/components/common/HorizontalScroll';
import GameListSection from '@/components/common/GameListSection';
import { Loader2 } from 'lucide-react';

export default function Home() {
    const getKey = (pageIndex: number, previousPageData: ArticlesResponse | null) => {
        // Reached the end
        if (previousPageData && !previousPageData.articles.length) return null;

        // First page: limit 20, offset 0
        if (pageIndex === 0) return [GET_ARTICLES, { limit: 20, offset: 0 }];

        // Subsequent pages: limit 10, offset starts at 20 + ((pageIndex - 1) * 10)
        return [GET_ARTICLES, {
            limit: 10,
            offset: 20 + ((pageIndex - 1) * 10)
        }];
    };

    const { data, error, size, setSize, isLoading } = useSWRInfinite<ArticlesResponse>(
        getKey,
        ([query, variables]) => fetcher(query, variables)
    );

    const articles = data ? data.flatMap(page => page.articles) : [];
    const loading = isLoading;
    const loadingMore = size > 0 && data && typeof data[size - 1] === 'undefined';
    const isEmpty = data?.[0]?.articles.length === 0;
    const isReachingEnd = isEmpty || (data && data[data.length - 1]?.articles.length < (size === 1 ? 20 : 10));
    const hasMore = !isReachingEnd;

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            setSize(size + 1);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-full gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#66c0f4]" />
                <p className="text-lg text-zinc-400">กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    // Empty state when no articles
    if (articles.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center h-full gap-6 text-center">
                <div className="text-6xl">🎮</div>
                <h2 className="text-2xl font-semibold text-white">ยังไม่มีข้อมูล</h2>
                <p className="text-zinc-400 max-w-md">
                    ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-[#66c0f4] hover:bg-[#5ab0e4] text-white rounded-md font-medium transition-colors"
                >
                    ลองใหม่
                </button>
            </div>
        );
    }

    // Split articles for different sections
    const featuredArticles = articles.slice(0, 5);
    const developersSection = articles.slice(5, 13);
    const listSection = articles; // Pass all articles for search/list

    return (
        <div className="pb-8">
            <div className="flex justify-between items-center p-6 mb-2">
                <h1 className="text-2xl font-bold text-chanox-accent tracking-wider">STORE</h1>
            </div>

            {/* Featured Carousel */}
            <FeaturedCarousel articles={featuredArticles} />

            {/* From recommend Section */}
            <HorizontalScroll
                title="Recommend"
                articles={developersSection}
            />

            {/* Tabbed List Section */}
            <GameListSection
                articles={listSection}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
            />
        </div>
    );
}
