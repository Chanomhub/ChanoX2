import useSWRInfinite from 'swr/infinite';
import { sdk, withImageTransform } from '@/libs/sdk';
import type { ArticleListItem, PaginatedResponse } from '@chanomhub/sdk';
import type { Article } from '@/types/graphql';
import FeaturedCarousel from '@/components/common/FeaturedCarousel';
import HorizontalScroll from '@/components/common/HorizontalScroll';
import GameListSection from '@/components/common/GameListSection';
import { Loader2 } from 'lucide-react';

// SDK fetcher for SWR
const sdkFetcher = async ([, limit, offset]: [string, number, number]): Promise<PaginatedResponse<ArticleListItem>> => {
    const result = await sdk.articles.getAllPaginated({ limit, offset });
    return withImageTransform(result);
};

export default function Home() {
    const getKey = (pageIndex: number, previousPageData: PaginatedResponse<ArticleListItem> | null) => {
        // Reached the end
        if (previousPageData && !previousPageData.items.length) return null;

        // First page: limit 20, offset 0
        if (pageIndex === 0) return ['articles', 20, 0] as const;

        // Subsequent pages: limit 10, offset starts at 20 + ((pageIndex - 1) * 10)
        return ['articles', 10, 20 + ((pageIndex - 1) * 10)] as const;
    };

    const { data, size, setSize, isLoading } = useSWRInfinite<PaginatedResponse<ArticleListItem>>(
        getKey,
        sdkFetcher
    );

    const articles = data ? data.flatMap(page => page.items) : [];
    const loading = isLoading;
    const loadingMore = size > 0 && data && typeof data[size - 1] === 'undefined';
    const isEmpty = data?.[0]?.items.length === 0;
    const isReachingEnd = isEmpty || (data && data[data.length - 1]?.items.length < (size === 1 ? 20 : 10));
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
    // Cast to local Article type for component compatibility
    const allArticles = articles as unknown as Article[];
    const featuredArticles = allArticles.slice(0, 5);
    const developersSection = allArticles.slice(5, 13);
    const listSection = allArticles; // Pass all articles for search/list

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
