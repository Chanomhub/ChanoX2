import { Link } from 'react-router';
import { Article } from '@/types/graphql';
import { ChevronRight } from 'lucide-react';
import { SafeImage } from '@/components/common/SafeImage';
import { getOptimizedImageUrl } from '@/libs/imageUrl';

interface HorizontalScrollProps {
    title: string;
    articles: Article[];
}

export default function HorizontalScroll({ title, articles }: HorizontalScrollProps) {
    if (articles.length === 0) return null;

    return (
        <div className="mb-8 w-full max-w-[1200px] mx-auto px-4">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-foreground text-sm font-bold tracking-wider">{title}</h2>
                <button className="text-muted-foreground text-xs font-semibold border border-border px-2.5 py-1 rounded hover:text-primary hover:border-primary/50 transition-colors flex items-center gap-1">
                    BROWSE ALL <ChevronRight className="w-3 h-3" />
                </button>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
                {articles.map((article) => (
                    <Link
                        key={article.id}
                        to={`/article/${article.slug}`}
                        className="flex-shrink-0 w-[200px] bg-card hover:bg-muted/80 border border-border/60 hover:border-primary/40 rounded-lg overflow-hidden transition-all duration-200 group cursor-pointer shadow-md"
                    >
                        <div className="w-full h-[120px] relative overflow-hidden">
                            {article.coverImage ? (
                                <SafeImage
                                    src={getOptimizedImageUrl(article.coverImage, { width: 200, height: 120, fit: 'cover' })}
                                    alt={article.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted" />
                            )}
                        </div>
                        <div className="p-3">
                            <h3 className="text-foreground text-sm font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">{article.title}</h3>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {(article.platforms ?? []).length > 0 && (
                                    <span className="text-muted-foreground text-[10px]">
                                        {article.platforms?.map(p => p.name).join(', ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

