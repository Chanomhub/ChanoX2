import { Link } from 'react-router-dom';
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
                <h2 className="text-[#dcdedf] text-sm font-bold tracking-wider">{title}</h2>
                <button className="text-[#dcdedf] text-xs font-bold border border-[#dcdedf] px-2 py-1 rounded-sm hover:text-white hover:border-white transition-colors flex items-center">
                    BROWSE ALL <ChevronRight className="w-3 h-3 ml-1" />
                </button>
            </div>

            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
                {articles.map((article) => (
                    <Link
                        key={article.id}
                        to={`/article/${article.slug}`}
                        className="flex-shrink-0 w-[200px] bg-[#16202d] hover:bg-[#1b2838] transition-colors group cursor-pointer shadow-lg"
                    >
                        <div className="w-full h-[120px] relative overflow-hidden">
                            {article.coverImage ? (
                                <SafeImage
                                    src={getOptimizedImageUrl(article.coverImage, { width: 200, height: 120, fit: 'cover' })}
                                    alt={article.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full bg-[#2a475e]" />
                            )}
                        </div>
                        <div className="p-3">
                            <h3 className="text-[#dcdedf] text-sm font-semibold mb-1 line-clamp-1 group-hover:text-white">{article.title}</h3>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {(article.platforms ?? []).length > 0 && (
                                    <span className="text-[#8b929a] text-[10px]">
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

