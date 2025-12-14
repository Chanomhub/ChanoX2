import { useState, useEffect } from 'react';
import { client } from '@/libs/api/client';
import { GET_ARTICLES } from '@/libs/api/queries';
import { Article, ArticlesResponse } from '@/types/graphql';
import FeaturedCarousel from '@/components/common/FeaturedCarousel';
import HorizontalScroll from '@/components/common/HorizontalScroll';
import GameListSection from '@/components/common/GameListSection';
import { Loader2 } from 'lucide-react';

export default function Home() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const data = await client.request<ArticlesResponse>(GET_ARTICLES, {
                limit: 20,
                offset: 0,
            });
            setArticles(data.articles);
            setHasMore(data.articles.length === 20);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching articles:', error);
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const currentCount = articles.length;
            const data = await client.request<ArticlesResponse>(GET_ARTICLES, {
                limit: 10,
                offset: currentCount,
            });

            if (data.articles.length > 0) {
                setArticles((prev) => [...prev, ...data.articles]);
                if (data.articles.length < 10) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading more articles:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-[#66c0f4]" />
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

            {/* From Developers Section */}
            <HorizontalScroll
                title="FROM DEVELOPERS AND PUBLISHERS YOU KNOW"
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
