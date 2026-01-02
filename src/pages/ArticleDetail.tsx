import { useState, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { useParams, Link } from 'react-router-dom';
import { sdk, withImageTransform } from '@/libs/sdk';
import { client } from '@/libs/api/client';
import { GET_OFFICIAL_DOWNLOAD_SOURCES } from '@/libs/api/queries';
import type { ArticleWithDownloads, Download } from '@chanomhub/sdk';
import { OfficialDownloadSourcesResponse } from '@/types/graphql';
import { useDownloads } from '@/contexts/DownloadContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { SafeImage } from '@/components/common/SafeImage';

// SDK fetcher for article with downloads
const articleFetcher = async ([, slug, language]: [string, string, string]): Promise<ArticleWithDownloads> => {
    const result = await sdk.articles.getWithDownloads(slug, language);
    return withImageTransform(result);
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

    const article = articleData?.article;
    const downloads = useMemo(() =>
        articleData?.downloads?.filter(d => d.isActive) || [],
        [articleData]
    );

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
                <Loader2 className="w-8 h-8 animate-spin text-[#66c0f4]" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-4">
                <Gamepad2 className="w-16 h-16 text-[#8b929a]" />
                <h2 className="text-xl text-[#dcdedf]">{error || 'Article not found'}</h2>
                <Link to="/" className="text-[#66c0f4] hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Go Back Home
                </Link>
            </div>
        );
    }

    const currentImage = allImages[selectedImageIndex]?.url;

    return (
        <div className="pb-12 max-w-[1200px] mx-auto px-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-[#8b929a] mb-4 mt-6">
                <Link to="/" className="hover:text-white">All Games</Link>
                <ChevronRight className="w-3 h-3" />
                {article.categories[0] && (
                    <>
                        <span className="hover:text-white cursor-pointer">{article.categories[0].name}</span>
                        <ChevronRight className="w-3 h-3" />
                    </>
                )}
                <span className="text-[#dcdedf] font-bold">{article.title}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-[#dcdedf] mb-6 tracking-wide">{article.title}</h1>

            {/* Main Content Area */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
                {/* Left Side - Gallery */}
                <div className="lg:flex-[1.8] min-w-0">
                    <div className="relative aspect-video bg-black rounded-sm overflow-hidden mb-2 group">
                        {currentImage ? (
                            <SafeImage
                                src={currentImage}
                                alt={article.title}
                                className="w-full h-full object-contain bg-[#0f1922]"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#2a475e]">
                                <ImageIcon className="w-16 h-16 text-[#8b929a]" />
                            </div>
                        )}

                        {/* Navigation Arrows */}
                        {allImages.length > 1 && (
                            <>
                                <button
                                    onClick={() => setSelectedImageIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1)}
                                    className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-black/30 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <ChevronLeft className="w-8 h-8 text-white" />
                                </button>
                                <button
                                    onClick={() => setSelectedImageIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0)}
                                    className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center bg-black/30 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <ChevronRight className="w-8 h-8 text-white" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Thumbnail Strip */}
                    {allImages.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#2a475e] scrollbar-track-[#1b2838]">
                            {allImages.map((img, index) => (
                                <button
                                    key={img.id}
                                    onClick={() => setSelectedImageIndex(index)}
                                    className={cn(
                                        "flex-shrink-0 w-[120px] h-[68px] border-2 transition-all",
                                        selectedImageIndex === index
                                            ? "border-[#dcdedf] opacity-100"
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
                <div className="lg:flex-1 bg-[#1b2838] p-4 rounded-sm border border-black/20 h-fit">
                    <div className="w-full aspect-[16/9] mb-4 bg-black/20 rounded overflow-hidden">
                        {article.coverImage ? (
                            <SafeImage src={article.coverImage} className="w-full h-full object-cover" alt="Cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Gamepad2 className="w-10 h-10 text-[#8b929a]" />
                            </div>
                        )}
                    </div>

                    <p className="text-[#c6d4df] text-sm leading-relaxed mb-4 line-clamp-6">
                        {article.description}
                    </p>

                    <div className="space-y-2 text-xs text-[#556772] mb-6">
                        {article.createdAt && (
                            <div className="flex">
                                <span className="w-24 flex-shrink-0 uppercase">Release Date:</span>
                                <span className="text-[#8f98a0]">
                                    {new Date(article.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        {article.author && (
                            <div className="flex">
                                <span className="w-24 flex-shrink-0 uppercase">Developer:</span>
                                <Link to="#" className="text-[#66c0f4] hover:text-white truncate">{article.author.name}</Link>
                            </div>
                        )}
                        {article.creators.length > 0 && (
                            <div className="flex">
                                <span className="w-24 flex-shrink-0 uppercase">Creators:</span>
                                <span className="text-[#66c0f4] truncate">
                                    {article.creators.map(c => c.name).join(', ')}
                                </span>
                            </div>
                        )}
                        {article.ver && (
                            <div className="flex">
                                <span className="w-24 flex-shrink-0 uppercase">Version:</span>
                                <span className="text-[#8f98a0]">{article.ver}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                        {article.categories.map(cat => (
                            <span key={cat.id} className="bg-[#2a475e] text-[#67c1f5] text-xs px-2 py-1 rounded hover:bg-[#3d5a73] cursor-pointer">
                                {cat.name}
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button className="flex-1 bg-[#2a475e] hover:bg-[#31536f] text-[#67c1f5] py-2 rounded flex items-center justify-center gap-2 transition-colors text-sm font-medium">
                            <Heart className="w-4 h-4" /> Add to Wishlist
                        </button>
                        {downloads.length > 0 && (
                            <button
                                onClick={scrollToDownloads}
                                className="flex-[1.5] bg-gradient-to-r from-[#75b022] to-[#588a1b] hover:from-[#8ed629] hover:to-[#6aa621] text-white py-2 rounded flex items-center justify-center gap-2 transition-all shadow-lg text-sm font-bold"
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
                    <h2 className="text-[#dcdedf] text-lg font-normal mb-1 pb-1 border-b border-[#2a475e] uppercase tracking-wider">About This Game</h2>
                    <div className="mt-4 text-[#acb2b8] text-sm leading-6">
                        {article.body ? (
                            <HtmlRenderer html={article.body} />
                        ) : (
                            <p>{article.description}</p>
                        )}
                    </div>
                </div>

                {/* Downloads Section (Right Sidebar) */}
                <div className="flex-1" ref={downloadsRef}>
                    {(downloads.length > 0 || officialSources.length > 0) ? (
                        <div className="bg-[#1b2838] p-4 rounded-sm border border-[#2a475e] sticky top-6">

                            {/* Official Sources */}
                            {officialSources.length > 0 && (
                                <div className="mb-6">
                                    <h2 className="text-[#dcdedf] text-lg font-normal mb-4 border-b border-[#2a475e] pb-2">Official Links</h2>
                                    <div className="space-y-3">
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
                                                className="block bg-[#101822] p-3 rounded border border-[#2a475e] hover:border-[#66c0f4] hover:bg-[#1a2634] transition-all group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <ExternalLink className="w-4 h-4 text-[#66c0f4]" />
                                                        <span className="text-[#dcdedf] text-sm font-medium group-hover:text-white">
                                                            {source.name}
                                                        </span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-[#4b5563] group-hover:text-white" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Downloads */}
                            {downloads.length > 0 && (
                                <>
                                    <h2 className="text-[#dcdedf] text-lg font-normal mb-4 border-b border-[#2a475e] pb-2">Available Downloads</h2>

                                    <div className="space-y-3">
                                        {downloads.map((download) => (
                                            <div
                                                key={download.id}
                                                className={cn(
                                                    "bg-[#101822] p-3 rounded border transition-colors group",
                                                    download.vipOnly ? "border-yellow-500/30 bg-yellow-900/10" : "border-[#2a475e] hover:border-[#66c0f4]"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            {download.vipOnly ? (
                                                                <Gem className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                                            ) : (
                                                                <CloudDownload className="w-4 h-4 text-[#66c0f4] flex-shrink-0" />
                                                            )}
                                                            <h3 className="text-[#dcdedf] font-medium text-sm truncate group-hover:text-white">
                                                                {download.name || 'Game Files'}
                                                            </h3>
                                                        </div>
                                                        {download.vipOnly && (
                                                            <span className="text-[10px] text-yellow-500 font-bold ml-6 uppercase">VIP Only</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setSelectedDownload(download)}
                                                    className="w-full bg-[#2a475e] hover:bg-[#66c0f4] hover:text-white text-[#66c0f4] text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <DownloadIcon className="w-3 h-3" /> DOWNLOAD
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* System Requirements Placeholder */}
                            <div className="mt-6 pt-6 border-t border-[#2a475e]">
                                <h3 className="text-[#8b929a] text-xs font-bold uppercase mb-3">System Requirements</h3>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-[#61686d]">OS:</span>
                                        <span className="text-[#b8b6b4]">{article.platforms.map(p => p.name).join(' / ') || 'Windows 10'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#61686d]">Memory:</span>
                                        <span className="text-[#b8b6b4]">4 GB RAM</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#61686d]">Storage:</span>
                                        <span className="text-[#b8b6b4]">Varies</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <ArticleDownloadDialog
                    open={!!selectedDownload}
                    onOpenChange={(isOpen) => !isOpen && setSelectedDownload(null)}
                    download={selectedDownload ? {
                        url: selectedDownload.url,
                        name: selectedDownload.name || undefined,
                        vipOnly: selectedDownload.vipOnly
                    } : null}
                    onDownload={(url) => {
                        openDownloadLink(
                            url,
                            article?.id ? Number(article.id) : undefined,
                            article?.title,
                            article?.coverImage || article?.mainImage || article?.backgroundImage || undefined,
                            article?.engine?.name || undefined,
                            article?.ver || undefined,
                            article?.description || undefined,
                            article?.body || undefined
                        );
                    }}
                    articleTitle={article?.title}
                />
            </div>
        </div>
    );
}
