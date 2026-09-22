import { useState, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { useParams, Link } from 'react-router';
import { sdk, withDataTransform } from '@/libs/sdk';
import { client } from '@/libs/api/client';
import { GET_OFFICIAL_DOWNLOAD_SOURCES, GET_DOWNLOADS } from '@/libs/api/queries';
import type { ArticleWithDownloads, Download } from '@chanomhub/sdk';
import { OfficialDownloadSourcesResponse, DownloadsResponse } from '@/types/graphql';
import { useDownloads } from '@/contexts/DownloadContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { useFavorite } from '@/hooks/useFavorite';
import { ArticleDownloadDialog } from '@/components/common/ArticleDownloadDialog';
import HtmlRenderer from '@/components/common/HtmlRenderer';
import { ElectronDownloader } from '@/lib/electronDownloader';
import {
    ChevronLeft,
    ChevronRight,
    Heart,
    Download as DownloadIcon,
    Gamepad2,
    ArrowLeft,
    Image as ImageIcon,
    Gem,
    CloudDownload,
    ExternalLink,
    Lock,
    ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { SafeImage } from '@/components/common/SafeImage';

// SDK fetcher for article with downloads
const articleFetcher = async ([, slug, language]: [string, string, string]): Promise<ArticleWithDownloads> => {
    // 1. Get article details (this won't have downloadLinks anymore which was causing errors)
    // Using any cast for options to avoid strict type check if the SDK version and local types differ slightly
    const article = await sdk.articles.getBySlug(slug, { language } as any);

    if (!article) return { article: null, downloads: [] };

    // 2. Get downloads for this article using a separate root query
    try {
        const downloadsData = await client.request<DownloadsResponse>(
            GET_DOWNLOADS,
            { articleId: Number(article.id) }
        );

        // Map types carefully to satisfy the SDK's ArticleWithDownloads interface
        const downloads = (downloadsData.downloads || []).map(d => ({
            ...d,
            name: d.name || '', // Ensure name is not null as required by SDK types
            type: (d as any).type || ((d as any).isPurchaseRedirect ? 'PURCHASE_REDIRECT' : 'DIRECT_FILE')
        })) as Download[];

        return withDataTransform({
            article: article as any,
            downloads
        });
    } catch (err) {
        console.error('Failed to fetch downloads:', err);
        return withDataTransform({
            article: article as any,
            downloads: []
        });
    }
};

// GraphQL fetcher for official sources (not yet in SDK)
const officialSourcesFetcher = async ([, articleId]: [string, number]) => {
    const data = await client.request<OfficialDownloadSourcesResponse>(
        GET_OFFICIAL_DOWNLOAD_SOURCES,
        { articleId }
    );
    return data.officialDownloadSources || [];
};

export default function ArticleDetail() {
    const { slug } = useParams<{ slug: string }>();
    const { openDownloadLink } = useDownloads();
    const { language } = useLanguage();

    const [selectedDownload, setSelectedDownload] = useState<Download | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const downloadsRef = useRef<HTMLDivElement>(null);

    // Fetch Article with Downloads using SDK
    const { data: articleData, error: articleError, isLoading: articleLoading } = useSWR<ArticleWithDownloads>(
        slug ? ['article-with-downloads', slug, language] : null,
        articleFetcher
    );

    // Favorite functionality
    const article = articleData?.article;
    const {
        isFavorited,
        isLoading: favoriteLoading,
        favoritesCount,
        toggleFavorite,
    } = useFavorite(
        slug || '',
        article?.favorited || false,
        article?.favoritesCount || 0
    );

    // Check if the article is actually unlocked/purchased based on JWT context
    const isUnlocked = article?.isUnlocked || article?.price === 0;

    // Filter downloads based on purchase status
    const actualDownloads = useMemo(() =>
        articleData?.downloads?.filter(d => d.isActive && !d.isPurchaseRedirect) || [],
        [articleData]
    );

    const purchaseLinks = useMemo(() => {
        // If already unlocked, we don't need to show purchase links anymore
        if (isUnlocked) return [];
        return articleData?.downloads?.filter(d => d.isActive && d.isPurchaseRedirect) || [];
    }, [articleData, isUnlocked]);

    const downloads = actualDownloads;

    // Fetch Official Sources (still using GraphQL - not in SDK yet)
    const articleId = article ? Number(article.id) : null;
    const { data: officialSources = [] } = useSWR(
        articleId ? ['official-sources', articleId] : null,
        officialSourcesFetcher
    );

    // Derived states
    const loading = articleLoading;
    const error = articleError ? (articleError.message || 'Unknown error') : (!article && !loading ? 'Article not found' : null);

    // Combine all images for the gallery
    const allImages = useMemo(() => {
        if (!article) return [];
        const images: { id: string; url: string }[] = [];

        // Add main/cover/background image as first
        const heroImage = article.backgroundImage || article.mainImage || article.coverImage;
        if (heroImage) {
            images.push({ id: 'hero', url: heroImage });
        }

        // Add all article images
        if (article.images) {
            article.images.forEach((img, index) => {
                images.push({ id: img.id ?? `img-${index}`, url: img.url });
            });
        }
        return images;
    }, [article]);

    const scrollToDownloads = () => {
        downloadsRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-4">
                <Gamepad2 className="w-16 h-16 text-muted-foreground" />
                <h2 className="text-xl text-foreground font-semibold">{error || 'Article not found'}</h2>
                <Link to="/" className="text-primary hover:underline flex items-center gap-2 font-medium">
                    <ArrowLeft className="w-4 h-4" /> Go Back Home
                </Link>
            </div>
        );
    }

    const currentImage = allImages[selectedImageIndex]?.url;

    return (
        <div className="pb-12 max-w-[1200px] mx-auto px-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 mt-6">
                <Link to="/" className="hover:text-foreground transition-colors">All Games</Link>
                <ChevronRight className="w-3 h-3" />
                {article.categories[0] && (
                    <>
                        <span className="hover:text-foreground cursor-pointer transition-colors">{article.categories[0].name}</span>
                        <ChevronRight className="w-3 h-3" />
                    </>
                )}
                <span className="text-foreground font-bold">{article.title}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-foreground mb-6 tracking-wide">{article.title}</h1>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
                {/* Left Side - Gallery */}
                <div className="lg:flex-[1.8] min-w-0 flex flex-col">
                    <div className="relative flex-1 bg-card border border-border/60 rounded-md overflow-hidden mb-2 group min-h-[300px]">
                        {currentImage ? (
                            <SafeImage
                                src={currentImage}
                                alt={article.title}
                                className="w-full h-full object-contain bg-background"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-card">
                                <ImageIcon className="w-16 h-16 text-muted-foreground" />
                            </div>
                        )}

                        {/* Navigation Arrows */}
                        {allImages.length > 1 && (
                            <>
                                <button
                                    onClick={() => setSelectedImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1)}
                                    className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-background/50 hover:bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={() => setSelectedImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0)}
                                    className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center bg-background/50 hover:bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Thumbnail Strip */}
                    {allImages.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-background">
                            {allImages.map((img, index) => (
                                <button
                                    key={img.id}
                                    onClick={() => setSelectedImageIndex(index)}
                                    className={cn(
                                        "flex-shrink-0 w-[160px] h-[90px] rounded border-2 transition-all overflow-hidden",
                                        selectedImageIndex === index
                                            ? "border-primary opacity-100"
                                            : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <SafeImage src={img.url} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Side - Info Panel */}
                <div className="lg:flex-1 bg-card p-4 rounded-md border border-border/60">
                    <div className="w-full aspect-[16/9] mb-4 bg-muted/40 rounded overflow-hidden">
                        {article.coverImage ? (
                            <SafeImage src={article.coverImage} className="w-full h-full object-cover" alt="Cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Gamepad2 className="w-10 h-10 text-muted-foreground" />
                            </div>
                        )}
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-3">
                        {article.description}
                    </p>

                    <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                        {article.updatedAt && (
                            <div className="flex justify-between">
                                <span className="uppercase font-semibold">Last Updated:</span>
                                <span className="text-foreground">
                                    {new Date(article.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        {article.author && (
                            <div className="flex justify-between">
                                <span className="uppercase font-semibold">Developer:</span>
                                <Link to={`/profile/${article.author.username || article.author.name}`} className="text-primary hover:underline truncate max-w-[200px]">{article.author.name}</Link>
                            </div>
                        )}
                        {article.creators.length > 0 && (
                            <div className="flex justify-between">
                                <span className="uppercase font-semibold">Creators:</span>
                                <span className="text-foreground truncate max-w-[200px]">
                                    {article.creators.map(c => c.name).join(', ')}
                                </span>
                            </div>
                        )}
                        {article.ver && (
                            <div className="flex justify-between">
                                <span className="uppercase font-semibold">Version:</span>
                                <span className="text-foreground font-mono">{article.ver}</span>
                            </div>
                        )}
                        {article.engine && (
                            <div className="flex justify-between">
                                <span className="uppercase font-semibold">Engine:</span>
                                <span className="text-foreground">{article.engine.name}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {article.categories.map(cat => (
                            <span key={cat.id} className="bg-primary/10 text-primary border border-primary/20 text-xs px-2.5 py-1 rounded-md font-medium hover:bg-primary/20 cursor-pointer transition-colors">
                                {cat.name}
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={toggleFavorite}
                            disabled={favoriteLoading}
                            className={cn(
                                "flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-colors text-sm font-medium border",
                                isFavorited
                                    ? "bg-primary/15 text-primary border-primary/30"
                                    : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                            )}
                        >
                            {favoriteLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                                <Heart className={cn("w-4 h-4", isFavorited && "fill-current text-primary")} />
                            )}
                            {isFavorited ? 'Favorited' : 'Favorite'}
                            {favoritesCount > 0 && (
                                <span className="text-xs opacity-70">({favoritesCount})</span>
                            )}
                        </button>
                        {downloads.length > 0 && (
                            <button
                                onClick={scrollToDownloads}
                                className="flex-[1.5] bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-md flex items-center justify-center gap-2 transition-all shadow-md text-sm font-bold"
                            >
                                <DownloadIcon className="w-4 h-4" /> Download
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* About & Downloads Two-Column Section */}
            <div className="flex flex-col lg:flex-row gap-8 mt-12">
                {/* About Section */}
                <div className="flex-[2]">
                    <h2 className="text-foreground text-lg font-semibold mb-2 pb-2 border-b border-border/60 uppercase tracking-wider">About This Game</h2>
                    <div className="mt-4 text-muted-foreground text-sm leading-6">
                        {article.body ? (
                            <HtmlRenderer html={article.body} />
                        ) : (
                            <p>{article.description}</p>
                        )}
                    </div>
                </div>

                {/* Downloads Section (Right Sidebar) */}
                <div className="flex-1" ref={downloadsRef}>
                    <div className="bg-card p-5 rounded-md border border-border/60 sticky top-6">

                        {(downloads.length > 0 || officialSources.length > 0 || purchaseLinks.length > 0) ? (
                            <>
                                {/* Purchase / Unlock Section */}
                                {purchaseLinks.length > 0 && (
                                    <div className="mb-6 pb-6 border-b border-border/60">
                                        <h2 className="text-primary text-base font-bold mb-3 flex items-center gap-2">
                                            <Lock className="w-4 h-4" />
                                            {language === 'th' ? 'ปลดล็อกเนื้อหา' : 'Unlock Content'}
                                        </h2>
                                        <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
                                            {language === 'th' ? 'ต้องซื้อบทความเพื่อเข้าถึงไฟล์ดาวน์โหลดทั้งหมด' : 'Purchase the article to access all download files.'}
                                        </p>
                                        <div className="space-y-3">
                                            {purchaseLinks.map((link) => (
                                                <a
                                                    key={link.id}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        ElectronDownloader.openDownloadLink(link.url, null);
                                                    }}
                                                    className="block bg-primary hover:bg-primary/90 p-3 rounded-md border border-primary/30 text-primary-foreground transition-all shadow-md group"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <ShoppingCart className="w-4 h-4" />
                                                            <span className="text-sm font-bold uppercase tracking-wider">
                                                                {link.name && link.name !== 'Source' ? link.name : (language === 'th' ? 'ไปที่หน้าร้านค้า' : 'Go to Store')}
                                                            </span>
                                                        </div>
                                                        <ExternalLink className="w-4 h-4 opacity-80 group-hover:opacity-100" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Official Sources */}
                                {officialSources.length > 0 && (
                                    <div className="mb-6">
                                        <h2 className="text-foreground text-base font-semibold mb-3 border-b border-border/60 pb-2">
                                            {language === 'th' ? 'ลิงก์อย่างเป็นทางการ' : 'Official Links'}
                                        </h2>
                                        <div className="space-y-2.5">
                                            {officialSources.map((source) => (
                                                <a
                                                    key={source.id}
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        ElectronDownloader.openDownloadLink(source.url, null);
                                                    }}
                                                    className="block bg-background/70 p-3 rounded-md border border-border/60 hover:border-primary/50 hover:bg-muted/50 transition-colors group"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <ExternalLink className="w-4 h-4 text-primary" />
                                                            <span className="text-foreground text-sm font-medium group-hover:text-primary transition-colors">
                                                                {source.name}
                                                            </span>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Downloads */}
                                {downloads.length > 0 && (
                                    <>
                                        <h2 className="text-foreground text-base font-semibold mb-3 border-b border-border/60 pb-2">
                                            {language === 'th' ? 'ไฟล์เกมที่มีให้โหลด' : 'Available Game Files'}
                                        </h2>

                                        <div className="space-y-3">
                                            {downloads.map((download) => (
                                                <div
                                                    key={download.id}
                                                    className={cn(
                                                        "bg-background/80 p-3 rounded-md border transition-colors group relative overflow-hidden",
                                                        !isUnlocked ? "opacity-60 grayscale-[0.5]" : (download.vipOnly ? "border-amber-500/40 bg-amber-500/5" : "border-border/60 hover:border-primary/50")
                                                    )}
                                                >
                                                    <div className="flex items-start justify-between gap-3 mb-2.5">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                {!isUnlocked ? (
                                                                    <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                                ) : download.vipOnly ? (
                                                                    <Gem className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                                ) : (
                                                                    <CloudDownload className="w-4 h-4 text-primary flex-shrink-0" />
                                                                )}
                                                                <h3 className="text-foreground font-medium text-sm truncate group-hover:text-primary transition-colors">
                                                                    {(!download.name || download.name === 'Source') ? (language === 'th' ? 'ไฟล์หลัก' : 'Game Files') : download.name}
                                                                </h3>
                                                            </div>
                                                            {download.vipOnly && (
                                                                <span className="text-[10px] text-amber-400 font-bold ml-6 uppercase tracking-wider">VIP Only</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isUnlocked ? (
                                                        <button
                                                            onClick={() => setSelectedDownload(download)}
                                                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-2 rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <DownloadIcon className="w-3.5 h-3.5" /> DOWNLOAD
                                                        </button>
                                                    ) : (
                                                        <div className="w-full bg-muted/40 text-muted-foreground text-[10px] font-bold py-2 rounded-md flex items-center justify-center gap-2 uppercase tracking-wider border border-border/40">
                                                            Purchase Required to Access
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground text-sm italic">
                                {language === 'th' ? 'ยังไม่มีไฟล์ให้ดาวน์โหลด' : 'No downloads available yet.'}
                            </div>
                        )}

                        {/* System Requirements Placeholder */}
                        <div className="mt-6 pt-6 border-t border-border/60">
                            <h3 className="text-muted-foreground text-xs font-bold uppercase mb-3 tracking-wider">System Requirements</h3>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">OS:</span>
                                    <span className="text-foreground">{article.platforms.map(p => p.name).join(' / ') || 'Windows 10'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Memory:</span>
                                    <span className="text-foreground">4 GB RAM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Storage:</span>
                                    <span className="text-foreground">Varies</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ArticleDownloadDialog
                    open={!!selectedDownload}
                    onOpenChange={(isOpen) => !isOpen && setSelectedDownload(null)}
                    articleId={article?.id ? Number(article.id) : undefined}
                    articleTitle={article?.title}
                    download={selectedDownload ? {
                        id: selectedDownload.id ? Number(selectedDownload.id) : undefined,
                        url: selectedDownload.url,
                        name: selectedDownload.name || undefined,
                        vipOnly: selectedDownload.vipOnly
                    } : null}
                    onDownload={(url) => {
                        openDownloadLink(url, {
                            articleId: article?.id ? Number(article.id) : undefined,
                            title: article?.title,
                            cover: article?.coverImage || article?.mainImage || article?.backgroundImage || undefined,
                            engine: article?.engine?.name || undefined,
                            gameVersion: article?.ver || undefined,
                            description: article?.description || undefined,
                            body: article?.body || undefined,
                            apiDownloadId: selectedDownload?.id ? Number(selectedDownload.id) : undefined
                        });
                        setSelectedDownload(null);
                    }}
                />
            </div>
        </div>
    );
}
