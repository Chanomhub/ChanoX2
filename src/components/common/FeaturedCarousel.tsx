import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Article } from '@/types/graphql';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SafeImage } from '@/components/common/SafeImage';
import { getOptimizedImageUrl } from '@/libs/imageUrl';


interface FeaturedCarouselProps {
    articles: Article[];
    sponsored?: boolean;
}

export default function FeaturedCarousel({ articles, sponsored }: FeaturedCarouselProps) {
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
            <h2 className="text-foreground text-sm font-bold tracking-wider mb-1">{sponsored ? 'FEATURED & SPONSORED' : 'THE COMMUNITY RECOMMENDS'}</h2>
            <h3 className="text-muted-foreground text-xs mb-4">{sponsored ? 'PROMOTED GAMES' : 'THESE GAMES TODAY'}</h3>

            <div className="relative flex items-center group">
                {/* Navigation Arrows */}
                <button
                    onClick={goToPrevious}
                    className="absolute left-[-20px] z-10 p-2 text-foreground hover:text-primary bg-background/80 hover:bg-background border border-border/60 rounded-full shadow-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>

                <Link to={`/article/${currentArticle.slug}`} className="flex-1 flex flex-row bg-card rounded-xl border border-border/60 overflow-hidden shadow-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:border-primary/40 transition-all duration-300 min-h-[320px] relative">
                    {/* Sponsored Badge */}
                    {sponsored && (
                        <div className="absolute top-4 left-4 z-20">
                            <div className="flex items-center gap-2
                  bg-background/80 backdrop-blur
                  text-primary text-[10px] font-medium
                  px-3 py-1 rounded-md
                  uppercase tracking-wider
                  border border-primary/30">
                                Sponsored
                            </div>
                        </div>
                    )}
                    {/* Image */}
                    <div className="w-[65%] min-h-[320px] relative self-stretch">
                        {currentArticle.coverImage ? (
                            <SafeImage
                                src={getOptimizedImageUrl(currentArticle.coverImage, { height: 320, fit: 'cover' })}
                                alt={currentArticle.title}
                                className="w-full h-full object-cover absolute inset-0"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full bg-muted absolute inset-0" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card" />
                    </div>

                    {/* Info Section */}
                    <div className="flex-1 p-6 flex flex-col justify-between bg-card">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl text-foreground font-semibold truncate max-w-[calc(100%-80px)]">{currentArticle.title}</h2>
                                {currentArticle.ver && (
                                    <span className="shrink-0 text-primary text-xs bg-primary/10 px-2 py-0.5 rounded-full border border-primary/25 font-medium">
                                        v{currentArticle.ver}
                                    </span>
                                )}
                            </div>

                            {/* Creator Info */}
                            {(currentArticle.creators ?? []).length > 0 && (
                                <div className="mb-2 text-xs text-foreground/90">
                                    <span className="text-muted-foreground">Developer: </span>
                                    {currentArticle.creators!.map(c => c.name).join(', ')}
                                </div>
                            )}

                            {/* Engine Info */}
                            {currentArticle.engine && (
                                <div className="mb-4 text-xs text-foreground/90">
                                    <span className="text-muted-foreground">Engine: </span>
                                    {currentArticle.engine.name}
                                </div>
                            )}

                            <div className="bg-muted/60 border border-border/40 p-4 rounded-lg mb-4">
                                <h4 className="text-muted-foreground text-[10px] uppercase mb-2">Description</h4>
                                <p className="text-foreground/90 text-sm line-clamp-4">
                                    {currentArticle.description || 'No description available'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {(currentArticle.tags ?? []).slice(0, 4).map((tag) => (
                                    <span key={tag.id} className="bg-muted border border-border/40 text-primary text-xs px-2.5 py-1 rounded-md hover:border-primary/40 transition-colors cursor-default">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            {(currentArticle.platforms ?? []).length > 0 && (
                                <div className="text-muted-foreground text-xs">
                                    Available for: <span className="text-foreground">{currentArticle.platforms?.map(p => p.name).join(', ')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Link>

                <button
                    onClick={goToNext}
                    className="absolute right-[-20px] z-10 p-2 text-foreground hover:text-primary bg-background/80 hover:bg-background border border-border/60 rounded-full shadow-lg transition-colors opacity-0 group-hover:opacity-100"
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
                            "h-2 rounded-full transition-all duration-200",
                            index === currentIndex ? "bg-primary w-6" : "bg-muted w-2 hover:bg-muted-foreground/40"
                        )}
                        onClick={() => setCurrentIndex(index)}
                    />
                ))}
            </div>
        </div>
    );
}
