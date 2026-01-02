import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Loader2, X } from 'lucide-react';
import { sdk, withImageTransform } from '@/libs/sdk';
import type { ArticleListItem } from '@chanomhub/sdk';
import { SafeImage } from '@/components/common/SafeImage';

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
    const [initialLoad, setInitialLoad] = useState(true);

    const debouncedSearchQuery = useDebounce(searchQuery, 400);

    useEffect(() => {
        searchArticles();
    }, [debouncedSearchQuery]);

    const searchArticles = async () => {
        setLoading(true);
        try {
            let result;
            if (debouncedSearchQuery.trim()) {
                // Use SDK search
                result = await sdk.search.articles(debouncedSearchQuery, {
                    limit: 50,
                    offset: 0,
                });
            } else {
                // Fetch all articles when no query
                result = await sdk.articles.getAllPaginated({
                    limit: 50,
                    offset: 0,
                });
            }
            const transformed = withImageTransform(result);
            setArticles(transformed.items);
        } catch (error) {
            console.error('Error searching articles:', error);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
    };

    return (
        <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="bg-chanox-surface border-b border-chanox-border p-6">
                <h1 className="text-2xl font-bold text-chanox-accent tracking-wider mb-4">SEARCH</h1>

                {/* Search Input */}
                <div className="relative max-w-2xl">
                    <SearchIcon
                        size={20}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                        type="text"
                        placeholder="Search for games, articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-12 py-3 bg-chanox-background border border-chanox-border rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-chanox-accent focus:ring-1 focus:ring-chanox-accent text-lg"
                        autoFocus
                    />
                    {searchQuery && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Search Stats */}
                {!loading && !initialLoad && (
                    <p className="text-zinc-400 text-sm mt-3">
                        {articles.length} {articles.length === 1 ? 'result' : 'results'} found
                        {searchQuery && ` for "${searchQuery}"`}
                    </p>
                )}
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader2 className="w-10 h-10 animate-spin text-chanox-accent mb-4" />
                        <p className="text-zinc-400">Searching...</p>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <p className="text-zinc-400 text-lg">No results found</p>
                        <p className="text-zinc-500 text-sm mt-1">Try different keywords</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {articles.map((article) => (
                            <Link
                                key={article.id}
                                to={`/article/${article.slug}`}
                                className="group bg-chanox-surface rounded-lg border border-chanox-border overflow-hidden hover:border-chanox-accent transition-all hover:shadow-lg hover:shadow-chanox-accent/10"
                            >
                                {/* Cover Image */}
                                <div className="aspect-video bg-zinc-800 overflow-hidden">
                                    {article.coverImage || article.mainImage ? (
                                        <SafeImage
                                            src={article.coverImage || article.mainImage || ''}
                                            alt={article.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="text-zinc-600 text-sm">No Image</span>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-3">
                                    <h3 className="text-sm font-medium text-zinc-100 line-clamp-2 group-hover:text-chanox-accent transition-colors">
                                        {article.title}
                                    </h3>
                                    <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                                        {article.description}
                                    </p>

                                    {/* Tags */}
                                    {article.tags && article.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {article.tags.slice(0, 2).map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="text-[10px] px-1.5 py-0.5 bg-chanox-border rounded text-chanox-accent"
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
