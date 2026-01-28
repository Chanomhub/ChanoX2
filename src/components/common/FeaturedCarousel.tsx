import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Article } from '@/types/graphql';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SafeImage } from '@/components/common/SafeImage';
import { getOptimizedImageUrl } from '@/libs/imageUrl';


interface FeaturedCarouselProps {
    articles: Article[];
}

export default function FeaturedCarousel({ articles }: FeaturedCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (articles.length > 0) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % articles.length);
            }, 5000); // Auto-play every 5 seconds
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [articles.length]);

    const goToPrevious = (e: React.MouseEvent) => {
        e.preventDefault();
        setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);
    };

    const goToNext = (e: React.MouseEvent) => {
        e.preventDefault();
        setCurrentIndex((prev) => (prev + 1) % articles.length);
    };

    if (articles.length === 0) return null;

    const currentArticle = articles[currentIndex];

    return (
        <div className="mb-8 w-full max-w-[1200px] mx-auto px-4">
            <h2 className="text-[#dcdedf] text-sm font-bold tracking-wider mb-1">THE COMMUNITY RECOMMENDS</h2>
            <h3 className="text-[#8b929a] text-xs mb-4">THESE GAMES TODAY</h3>

            <div className="relative flex items-center group">
                {/* Navigation Arrows */}
                <button
                    onClick={goToPrevious}
                    className="absolute left-[-20px] z-10 p-2 text-[#dcdedf] hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>

                <Link to={`/article/${currentArticle.slug}`} className="flex-1 flex flex-row bg-[#0f1922] rounded overflow-hidden shadow-lg hover:shadow-[0_0_15px_rgba(102,192,244,0.4)] transition-shadow duration-300 h-[320px]">
                    {/* Image */}
                    <div className="w-[65%] h-full relative">
                        {currentArticle.coverImage ? (
                            <SafeImage
                                src={getOptimizedImageUrl(currentArticle.coverImage, { height: 320, fit: 'cover' })}
                                alt={currentArticle.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-[#2a475e]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0f1922]" />
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 p-6 flex flex-col justify-between bg-[#0f1922]">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl text-white font-normal truncate max-w-[calc(100%-80px)]">{currentArticle.title}</h2>
                                {currentArticle.ver && (
                                    <span className="shrink-0 text-[#67c1f5] text-xs bg-[#67c1f5]/10 px-2 py-0.5 rounded border border-[#67c1f5]/20">
                                        v{currentArticle.ver}
                                    </span>
                                )}
                            </div>

                            {/* Creator Info */}
                            {(currentArticle.creators ?? []).length > 0 && (
                                <div className="mb-2 text-xs text-[#c6d4df]">
                                    <span className="text-[#566168]">Developer: </span>
                                    {currentArticle.creators!.map(c => c.name).join(', ')}
                                </div>
                            )}

                            {/* Engine Info */}
                            {currentArticle.engine && (
                                <div className="mb-4 text-xs text-[#c6d4df]">
                                    <span className="text-[#566168]">Engine: </span>
                                    {currentArticle.engine.name}
                                </div>
                            )}

                            <div className="bg-[#1b2838] p-4 rounded mb-4">
                                <h4 className="text-[#8b929a] text-[10px] uppercase mb-2">Description</h4>
                                <p className="text-[#dcdedf] text-sm line-clamp-4">
                                    {currentArticle.description || 'No description available'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {(currentArticle.tags ?? []).slice(0, 4).map((tag) => (
                                    <span key={tag.id} className="bg-[#1b2838] text-[#66c0f4] text-xs px-2 py-1 rounded hover:text-white transition-colors cursor-default">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            {(currentArticle.platforms ?? []).length > 0 && (
                                <div className="text-[#8b929a] text-xs">
                                    Available for: <span className="text-[#dcdedf]">{currentArticle.platforms?.map(p => p.name).join(', ')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Link>

                <button
                    onClick={goToNext}
                    className="absolute right-[-20px] z-10 p-2 text-[#dcdedf] hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                    <ChevronRight className="w-8 h-8" />
                </button>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center mt-4 gap-2">
                {articles.map((_, index) => (
                    <button
                        key={index}
                        className={cn(
                            "w-4 h-2 rounded-sm transition-colors",
                            index === currentIndex ? "bg-[#dcdedf]" : "bg-[#3a475e] hover:bg-[#6e7681]"
                        )}
                        onClick={() => setCurrentIndex(index)}
                    />
                ))}
            </div>
        </div>
    );
}
