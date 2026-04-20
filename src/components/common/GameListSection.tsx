import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Article, ArticleImage } from '@/types/graphql';
import {
    Search, ChevronLeft, ChevronRight,
    Monitor, Apple, Terminal,
    ShoppingCart, Heart, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SafeImage } from '@/components/common/SafeImage';
import { getOptimizedImageUrl } from '@/libs/imageUrl';

interface ArticleWithImages extends Article {
    images?: ArticleImage[];
    reviewScore?: number;      // 0-100
    reviewCount?: number;
    price?: number;
    originalPrice?: number;
    discount?: number;
    isFree?: boolean;
    releaseDate?: string;
    excerpt?: string;
}

interface GameListSectionProps {
    articles: ArticleWithImages[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
}

const tabs = ['New & Trending', 'Top Sellers', 'Popular Upcoming', 'Specials'];
const ITEMS_PER_PAGE = 10;

// ─── sub-components ──────────────────────────────────────────────────────────

function ReviewBar({ score, count }: { score?: number; count?: number }) {
    if (score == null) return null;
    const label =
        score >= 95 ? 'Overwhelmingly Positive' :
            score >= 80 ? 'Very Positive' :
                score >= 70 ? 'Mostly Positive' :
                    score >= 40 ? 'Mixed' : 'Negative';
    const color =
        score >= 70 ? '#57cbde' :
            score >= 40 ? '#a0a0a0' : '#c84b4b';
    return (
        <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color }}>{label}</span>
                {count != null && (
                    <span className="text-[10px] text-[#4f6479]">{count.toLocaleString()} reviews</span>
                )}
            </div>
            <div className="h-1 w-full bg-[#0e1923] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

function PriceTag({ price, originalPrice, discount, isFree }: {
    price?: number; originalPrice?: number; discount?: number; isFree?: boolean;
}) {
    if (isFree || price === 0) return (
        <span className="text-xs font-bold text-[#66c0f4]">FREE</span>
    );
    if (price == null) return null;
    if (discount && originalPrice) return (
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold bg-[#4c6b22] text-[#a4d007] px-1.5 py-0.5 rounded leading-none">
                -{discount}%
            </span>
            <div className="flex flex-col items-end leading-none gap-0.5">
                <span className="text-[10px] text-[#626f7f] line-through">${originalPrice.toFixed(2)}</span>
                <span className="text-sm font-bold text-[#a4d007]">${price.toFixed(2)}</span>
            </div>
        </div>
    );
    return <span className="text-sm font-bold text-[#dcdedf]">${price.toFixed(2)}</span>;
}

function PlatformIcons({ platforms }: { platforms?: { name: string }[] }) {
    if (!platforms?.length) return null;
    const names = platforms.map(p => p.name.toLowerCase());
    return (
        <div className="flex items-center gap-1">
            {names.some(n => n.includes('win')) && <Monitor className="w-3 h-3 text-[#566168]" />}
            {names.some(n => n.includes('mac')) && <Apple className="w-3 h-3 text-[#566168]" />}
            {names.some(n => n.includes('linux')) && (
                <svg width="12" height="12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#566168]">
                    <path d="M16.2182,35.9c-3.1368,0-6.8982,1.496-7.2988,5.6766a.916.916,0,0,0,.9061,1.0025h11.97A.9.9,0,0,0,22.7,41.643C22.6175,39.8048,21.7865,35.9,16.2182,35.9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <path d="M18.0508,20.564c-1.35,1.0368-7.3687,7.51-4.3595,15.6667" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <path d="M31.7818,35.9c3.1368,0,6.8982,1.496,7.2988,5.6766a.916.916,0,0,1-.9061,1.0025h-11.97A.9.9,0,0,1,25.3,41.643C25.3825,39.8048,26.2135,35.9,31.7818,35.9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <path d="M35.0148,36.4556c3.1848-2.8438,2.7468-7.5246,2.7468-8.7785,2.8935.82,5.0306,2.9709,5.5941,2.17,1.3744-1.9531-7.5193-7.5461-7.6918-10.8989C35.4951,15.6692,35.1706,5.4214,24,5.4214S12.5049,15.6692,12.3361,18.9484c-.1725,3.3528-9.0662,8.9458-7.6918,10.8989.5635.8007,2.7006-1.35,5.5941-2.17,0,1.2539-.438,5.9347,2.7468,8.7785" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <path d="M29.2763,19.8324c1.9318,1.5032,8.0416,8.242,5.0324,16.3983" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <path d="M24,24.8431l3.9479-4.2791c-.3858-1.0127-1.712-1.929-3.9479-1.929s-3.5621.9163-3.9479,1.929Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <path d="M20.0521,20.564c-3.424.5063-3.9062-2.7247-3.9062-4.7019,0-2.7006,1.4467-4.4367,3.9062-4.4367S23.79,14.7529,23.79,16.3443A3.8486,3.8486,0,0,1,23.181,18.68" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <path d="M27.7205,20.1334c.6751.0482,3.9538-.3892,3.9538-3.331s-1.76-3.7615-4.1232-3.7615a3.7861,3.7861,0,0,0-3.8164,2.6682" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <path d="M22.7012,41.4815a6.8371,6.8371,0,0,0,2.6076,0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    <circle cx="22.1579" cy="16.5888" r="0.75" fill="currentColor"/>
                    <circle cx="25.5497" cy="16.5888" r="0.75" fill="currentColor"/>
                </svg>
            )}
        </div>
    );
}

// ─── utils ───────────────────────────────────────────────────────────────────

const getReviewData = (id: number, favoritesCount: number, viewsCount: number) => {
    const count = favoritesCount;
    if (!viewsCount || viewsCount < 1) return { score: count > 0 ? 88 : 0, count };

    // Like-to-View Ratio calculation (e.g., 5% ratio is very good)
    const ratio = favoritesCount / viewsCount;
    let score = 75 + (ratio * 300); // 5% ratio results in ~90% score

    if (score > 98) score = 98;
    if (score < 65 && count > 0) score = 68;
    if (count === 0) score = 0;

    return { score: Math.round(score), count };
};

// ─── main ────────────────────────────────────────────────────────────────────

export default function GameListSection({
    articles, onLoadMore, hasMore = false, loadingMore = false,
}: GameListSectionProps) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [hoveredArticle, setHoveredArticle] = useState<ArticleWithImages | null>(null);
    const [previewImageIndex, setPreviewImageIndex] = useState(0);
    const [wishlist, setWishlist] = useState<Set<number>>(new Set());
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const thumbnailScrollRef = useRef<HTMLDivElement>(null);
    const [isListHovered, setIsListHovered] = useState(false);

    const handleSearch = () => {
        if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    };

    useEffect(() => { setCurrentPage(1); }, [activeTab]);

    useEffect(() => {
        if (!hoveredArticle?.images?.length || isListHovered) return;
        const t = setInterval(() => {
            setPreviewImageIndex(p => (p + 1) % (hoveredArticle.images?.length || 1));
        }, 2800);
        return () => clearInterval(t);
    }, [hoveredArticle, isListHovered]);

    useEffect(() => { setPreviewImageIndex(0); }, [hoveredArticle?.id]);

    // Scroll active thumbnail into view
    useEffect(() => {
        if (!thumbnailScrollRef.current) return;
        const activeThumb = thumbnailScrollRef.current.children[previewImageIndex] as HTMLElement;
        if (activeThumb) {
            activeThumb.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [previewImageIndex]);

    const totalPages = Math.ceil(articles.length / ITEMS_PER_PAGE);
    const displayedArticles = useMemo(() => {
        const s = (currentPage - 1) * ITEMS_PER_PAGE;
        return articles.slice(s, s + ITEMS_PER_PAGE);
    }, [articles, currentPage]);

    useEffect(() => {
        if (displayedArticles.length > 0 && !hoveredArticle) {
            const t = setTimeout(() => {
                setHoveredArticle(displayedArticles[0]);
            }, 500); // Wait 500ms before showing first preview on page load
            return () => clearTimeout(t);
        }
    }, [displayedArticles]);

    const toggleWishlist = (id: number, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        setWishlist(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    return (
        <div className="mb-12 w-full max-w-[1200px] mx-auto px-4 mt-8">

            {/* ── Tab bar ── */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-[#2a475e] bg-[#1b2838] px-2 rounded-t-sm">
                <div className="flex overflow-x-auto">
                    {tabs.map((tab, i) => (
                        <button key={tab} onClick={() => setActiveTab(i)}
                            className={cn('px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                                activeTab === i
                                    ? 'text-[#dcdedf] border-b-2 border-[#1a9fff]'
                                    : 'text-[#8b929a] hover:text-white')}>
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="py-2 pr-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7681]" />
                        <input type="text" value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Search Store"
                            className="bg-[#2a475e] border border-[#1b2838] text-white pl-8 pr-2 h-8 text-xs w-[200px] rounded-sm focus:outline-none focus:ring-1 focus:ring-[#66c0f4]" />
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex">

                {/* ── List ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {displayedArticles.length > 0 ? displayedArticles.map((article, idx) => {
                        const active = hoveredArticle?.id === article.id;
                        const liked = wishlist.has(article.id);
                        return (
                            <Link key={article.id} to={`/article/${article.slug}`}
                                onMouseEnter={() => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                    hoverTimeoutRef.current = setTimeout(() => {
                                        setHoveredArticle(article);
                                    }, 300); // 300ms debounce
                                    setIsListHovered(true);
                                }}
                                onMouseLeave={() => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                    setIsListHovered(false);
                                }}
                                className={cn(
                                    'relative flex items-stretch border-b border-[#0d1b27] group transition-colors duration-100',
                                    active
                                        ? 'bg-[#255372]'
                                        : idx % 2 === 0 ? 'bg-[#1b2838] hover:bg-[#1e3045]' : 'bg-[#172231] hover:bg-[#1e3045]',
                                )}>

                                {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1a9fff]" />}

                                {/* Cover */}
                                <div className="w-[184px] h-[69px] flex-shrink-0 overflow-hidden relative">
                                    {article.coverImage ? (
                                        <SafeImage
                                            src={getOptimizedImageUrl(article.coverImage, { width: 184, height: 69, fit: 'cover' })}
                                            alt={article.title}
                                            className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-200"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#2a475e] to-[#0e1923] flex items-center justify-center">
                                            <Star className="w-6 h-6 text-[#2a475e]" />
                                        </div>
                                    )}
                                </div>

                                {/* Middle info — fills all remaining horizontal space */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center px-3 py-2 gap-1">
                                    <h3 className={cn(
                                        'text-[13px] font-semibold leading-none truncate',
                                        active ? 'text-white' : 'text-[#c7d5e0] group-hover:text-white',
                                    )}>
                                        {article.title}
                                    </h3>

                                    {/* Tags */}
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {(article.tags ?? []).slice(0, 5).map(tag => (
                                            <span key={tag.id}
                                                className="text-[9px] text-[#8faabb] bg-[#16202d] border border-[#1e3347] px-1.5 py-[2px] rounded-sm leading-none">
                                                {tag.name}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Meta */}
                                    <div className="flex items-center gap-3">
                                        <PlatformIcons platforms={article.platforms ?? []} />
                                        {article.ver && (
                                            <span className="text-[10px] text-[#4f6479] font-mono">v{article.ver}</span>
                                        )}
                                        {(() => {
                                            const { score, count } = getReviewData(article.id, article.favoritesCount, article.viewsCount || 0);
                                            return (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-16 h-1 bg-[#0e1923] rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full"
                                                            style={{
                                                                width: `${article.reviewScore ?? score}%`,
                                                                backgroundColor: (article.reviewScore ?? score) >= 70 ? '#57cbde' : (article.reviewScore ?? score) >= 40 ? '#a0a0a0' : '#c84b4b',
                                                            }} />
                                                    </div>
                                                    <span className="text-[9px] text-[#566168]">{article.reviewScore ?? score}% ({count})</span>
                                                </div>
                                            );
                                        })()}
                                        {article.discount ? (
                                            <span className="text-[9px] font-bold bg-[#4c6b22] text-[#a4d007] px-1.5 py-0.5 rounded leading-none">
                                                -{article.discount}%
                                            </span>
                                        ) : null}
                                        {article.releaseDate && (
                                            <span className="text-[10px] text-[#4f6479]">{article.releaseDate}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Right: price + wishlist */}
                                <div className="flex flex-col items-end justify-center gap-1.5 px-3 w-[130px] flex-shrink-0">
                                    <PriceTag
                                        price={article.price}
                                        originalPrice={article.originalPrice}
                                        discount={article.discount}
                                        isFree={article.isFree}
                                    />
                                    <button onClick={e => toggleWishlist(article.id, e)}
                                        className={cn(
                                            'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-all',
                                            liked
                                                ? 'text-[#e05c5c] border-[#e05c5c]/30 bg-[#e05c5c]/10'
                                                : 'text-[#566168] border-[#2a3f55] hover:text-[#66c0f4] hover:border-[#66c0f4]/40',
                                        )}>
                                        <Heart className={cn('w-2.5 h-2.5 shrink-0', liked && 'fill-current')} />
                                        {liked ? 'Wishlisted' : 'Wishlist'}
                                    </button>
                                </div>
                            </Link>
                        );
                    }) : (
                        <div className="py-16 text-center text-[#566168] bg-[#16202d] italic">
                            No games found matching "{searchQuery}"
                        </div>
                    )}
                </div>

                {/* ── Preview Panel ── */}
                {hoveredArticle && (
                    <div className="w-[340px] flex-shrink-0 hidden lg:flex flex-col bg-[#1b2838] border-l border-[#0d1b27]">

                        {/* Hero image */}
                        <div className="relative w-full h-[158px] overflow-hidden flex-shrink-0">
                            {(hoveredArticle.images?.length ?? 0) > 0 ? (
                                <SafeImage
                                    src={getOptimizedImageUrl(
                                        hoveredArticle.images![previewImageIndex]?.url || hoveredArticle.mainImage || '',
                                        { width: 340, height: 158, fit: 'cover' }
                                    )}
                                    alt={hoveredArticle.title}
                                    className="w-full h-full object-cover transition-opacity duration-300"
                                />
                            ) : hoveredArticle.mainImage ? (
                                <SafeImage
                                    src={getOptimizedImageUrl(hoveredArticle.mainImage, { width: 340, height: 158, fit: 'cover' })}
                                    alt={hoveredArticle.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#2a475e] to-[#0e1923]" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1b2838] to-transparent opacity-60" />

                            {(hoveredArticle.images?.length ?? 0) > 1 && (
                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                    {hoveredArticle.images!.map((_, i) => (
                                        <button key={i}
                                            onClick={e => { e.preventDefault(); setPreviewImageIndex(i); }}
                                            className={cn('w-1.5 h-1.5 rounded-full transition-all',
                                                previewImageIndex === i ? 'bg-[#66c0f4] scale-110' : 'bg-white/30 hover:bg-white/60')} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info block */}
                        <div className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto min-h-0">

                            {/* Title + version */}
                            <div className="flex items-start gap-2">
                                <h3 className="text-white text-[15px] font-semibold leading-snug flex-1">
                                    {hoveredArticle.title}
                                </h3>
                                {hoveredArticle.ver && (
                                    <span className="shrink-0 text-[#67c1f5] text-[9px] bg-[#67c1f5]/10 px-2 py-0.5 rounded border border-[#67c1f5]/20 mt-0.5">
                                        v{hoveredArticle.ver}
                                    </span>
                                )}
                            </div>

                            {/* Excerpt */}
                            {(hoveredArticle.excerpt || hoveredArticle.description) && (
                                <p className="text-[11px] text-[#8b929a] leading-relaxed line-clamp-3">
                                    {hoveredArticle.excerpt || (hoveredArticle.description && hoveredArticle.description.replace(/<[^>]*>?/gm, ''))}
                                </p>
                            )}

                            {/* Review bar */}
                            <div className="bg-[#16202d] border border-[#1a2e42] rounded px-3 py-2.5">
                                <div className="text-[10px] text-[#566168] mb-1.5 uppercase tracking-wider font-medium">
                                    User Reviews
                                </div>
                                {(() => {
                                    const { score, count } = getReviewData(hoveredArticle.id, hoveredArticle.favoritesCount, hoveredArticle.viewsCount || 0);
                                    return <ReviewBar score={hoveredArticle.reviewScore ?? score} count={hoveredArticle.reviewCount ?? count} />;
                                })()}
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11px]">
                                {(hoveredArticle.creators ?? []).length > 0 && <>
                                    <span className="text-[#566168]">Developer</span>
                                    <span className="text-[#c6d4df] text-right truncate">
                                        {hoveredArticle.creators.map(c => c.name).join(', ')}
                                    </span>
                                </>}
                                {hoveredArticle.engine && <>
                                    <span className="text-[#566168]">Engine</span>
                                    <span className="text-[#c6d4df] text-right">{hoveredArticle.engine.name}</span>
                                </>}
                                {hoveredArticle.releaseDate && <>
                                    <span className="text-[#566168]">Release</span>
                                    <span className="text-[#c6d4df] text-right">{hoveredArticle.releaseDate}</span>
                                </>}
                                {(hoveredArticle.platforms ?? []).length > 0 && <>
                                    <span className="text-[#566168]">Platforms</span>
                                    <div className="flex justify-end">
                                        <PlatformIcons platforms={hoveredArticle.platforms ?? []} />
                                    </div>
                                </>}
                            </div>

                            {/* Tags */}
                            {(hoveredArticle.tags ?? []).length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {(hoveredArticle.tags ?? []).slice(0, 8).map(tag => (
                                        <span key={tag.id}
                                            className="text-[#67c1f5] text-[9px] bg-[#67c1f5]/10 px-2 py-0.5 rounded border border-[#67c1f5]/15 leading-none">
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Thumbnail strip */}
                        {(hoveredArticle.images?.length ?? 0) > 1 && (
                            <div
                                ref={thumbnailScrollRef}
                                className="px-4 pb-3 flex gap-1.5 overflow-x-auto flex-shrink-0 scrollbar-none"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {hoveredArticle.images!.map((img, i) => (
                                    <button key={img.id}
                                        onClick={e => { e.preventDefault(); setPreviewImageIndex(i); }}
                                        className={cn(
                                            'flex-shrink-0 w-[66px] h-[44px] rounded-sm overflow-hidden border-2 transition-all',
                                            previewImageIndex === i
                                                ? 'border-[#67c1f5]'
                                                : 'border-transparent opacity-50 hover:opacity-80',
                                        )}>
                                        <SafeImage
                                            src={getOptimizedImageUrl(img.url, { width: 66, height: 44, fit: 'cover' })}
                                            alt={`Screen ${i + 1}`}
                                            className="w-full h-full object-cover"
                                            skipNSFW // Skip NSFW for small thumbnails
                                        />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Price + CTA — pinned to bottom */}
                        <div className="px-4 py-3 border-t border-[#0d1b27] flex items-center justify-between gap-3 flex-shrink-0 bg-[#16202d]">
                            <PriceTag
                                price={hoveredArticle.price}
                                originalPrice={hoveredArticle.originalPrice}
                                discount={hoveredArticle.discount}
                                isFree={hoveredArticle.isFree}
                            />
                            <Link to={`/article/${hoveredArticle.slug}`}
                                className="flex items-center gap-1.5 bg-[#4c6b22] hover:bg-[#5c7e28] text-[#a4d007] text-xs font-semibold px-4 py-2 rounded transition-colors">
                                <ShoppingCart className="w-3.5 h-3.5" />
                                View Game
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Pagination ── */}
            {(articles.length > ITEMS_PER_PAGE || hasMore) && (
                <div className="flex justify-between items-center px-3 py-2 bg-[#16202d] border border-t-0 border-[#0d1b27] rounded-b-sm">
                    <span className="text-[#4f6479] text-xs">
                        {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, articles.length)} of {hasMore ? `${articles.length}+` : articles.length} results
                    </span>
                    <div className="flex gap-1.5">
                        <button disabled={currentPage === 1 || loadingMore}
                            onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}
                            className="px-3 py-1 bg-[#1b2838] text-[#66c0f4] text-xs rounded border border-[#2a475e] hover:bg-[#2a475e] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>
                        <button
                            disabled={(currentPage === totalPages && !hasMore) || loadingMore}
                            onClick={() => {
                                if (currentPage < totalPages) setCurrentPage(p => p + 1);
                                else if (hasMore && onLoadMore) onLoadMore();
                            }}
                            className="px-3 py-1 bg-[#1b2838] text-[#66c0f4] text-xs rounded border border-[#2a475e] hover:bg-[#2a475e] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                            {loadingMore ? 'Loading…' : 'Next'} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}