import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { enUS, th } from 'date-fns/locale';
import type { ArticleListItem } from '@chanomhub/sdk';
import { SafeImage } from '@/components/common/SafeImage';
import { getOptimizedImageUrl } from '@/libs/imageUrl';
import { Clock, Eye, Star, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GameCardProps {
    article: ArticleListItem;
}

export default function GameCard({ article }: GameCardProps) {
    const { t } = useTranslation();
    const { language } = useLanguage();
    const dateLocale = language === 'th' ? th : enUS;

    const timeAgo = article.createdAt
        ? formatDistanceToNow(new Date(article.createdAt), { addSuffix: true, locale: dateLocale })
        : t('store.recently');

    // Extract engine/platform/category for the primary badge
    const getBadgeDetails = () => {
        const engineName = article.engine?.name?.toLowerCase() || '';
        const categoryName = article.categories?.[0]?.name?.toLowerCase() || '';
        const platformNames = article.platforms?.map(p => p.name.toLowerCase()) || [];

        // Ren'Py
        if (engineName.includes('renpy') || engineName.includes("ren'py") || categoryName.includes('visual novel') || categoryName.includes('vn')) {
            return {
                label: 'Ren\'Py',
                style: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30'
            };
        }
        // Unity
        if (engineName.includes('unity')) {
            return {
                label: 'Unity',
                style: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
            };
        }
        // Unreal
        if (engineName.includes('unreal')) {
            return {
                label: 'Unreal Engine',
                style: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            };
        }
        // HTML / Web
        if (engineName.includes('html') || engineName.includes('web') || platformNames.includes('web')) {
            return {
                label: 'HTML',
                style: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            };
        }
        // RPG Maker
        if (engineName.includes('rpg') || engineName.includes('rpgmaker') || engineName.includes('rpg maker')) {
            return {
                label: 'RPGM',
                style: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
            };
        }

        // Fallback to engine or first category
        const label = article.engine?.name || article.categories?.[0]?.name || t('store.game');
        return {
            label: label,
            style: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
        };
    };

    const badge = getBadgeDetails();

    // Compute popularity/reviews score
    const favoritesCount = article.favoritesCount || 0;
    const viewsCount = article.viewsCount || 0;
    const ratio = viewsCount > 0 ? favoritesCount / viewsCount : 0;
    const computedScore = Math.min(98, Math.max(0, Math.round(75 + (ratio * 300))));
    const finalScore = favoritesCount === 0 ? 0 : computedScore;

    return (
        <Link
            to={`/article/${article.slug}`}
            className="group flex flex-col bg-[#18202c]/80 backdrop-blur-md rounded-lg overflow-hidden border border-[#2d3a4f]/50 hover:border-chanox-accent/50 hover:shadow-[0_0_15px_rgba(102,192,244,0.15)] transition-all duration-300 h-full"
        >
            {/* Card Thumbnail Container */}
            <div className="relative aspect-[16/10] overflow-hidden bg-[#0e141c]">
                {article.coverImage || article.mainImage ? (
                    <SafeImage
                        src={getOptimizedImageUrl(article.coverImage || article.mainImage || '', { width: 380, height: 238, fit: 'cover' })}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1b2838] to-[#0e141c]">
                        <span className="text-[#4f6479] text-xs font-semibold uppercase tracking-wider">{t('store.no_preview')}</span>
                    </div>
                )}

                {/* Badges Overlays */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 flex justify-between items-end">
                    {/* Platform Badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border backdrop-blur-sm select-none ${badge.style}`}>
                        {badge.label}
                    </span>

                    {/* Version Badge */}
                    {article.ver && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/60 text-zinc-300 border border-zinc-700/50 backdrop-blur-sm select-none">
                            {article.ver.startsWith('v') ? article.ver : `v${article.ver}`}
                        </span>
                    )}
                </div>
            </div>

            {/* Card Body */}
            <div className="flex-1 flex flex-col p-3 gap-2">
                {/* Title */}
                <h3 className="text-white text-[13px] font-semibold leading-snug group-hover:text-chanox-accent transition-colors duration-200 line-clamp-2">
                    {article.title}
                </h3>

                {/* Tag Pills */}
                {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {article.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag.id}
                                className="text-[9px] text-[#8faabb] bg-[#16202d]/50 border border-[#2d3a4f]/30 px-1.5 py-[2px] rounded-sm leading-none"
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                )}

                {/* Excerpt / Short Description */}
                {(article.description) && (
                    <p className="text-[11px] text-zinc-400/80 leading-normal line-clamp-2 mt-1 min-h-[32px]">
                        {article.description?.replace(/<[^>]*>?/gm, '')}
                    </p>
                )}

                {/* Meta details footer */}
                <div className="mt-auto pt-2 border-t border-[#2d3a4f]/30 flex flex-wrap items-center justify-between gap-y-1.5 text-[11px] text-[#8faabb]">
                    {/* Timeago */}
                    <div className="flex items-center gap-1">
                        <Clock size={11} className="text-[#66c0f4]" />
                        <span>{timeAgo}</span>
                    </div>

                    {/* Views & Likes */}
                    <div className="flex items-center gap-3.5">
                        {/* Views */}
                        <div className="flex items-center gap-1" title={`${viewsCount.toLocaleString()} views`}>
                            <Eye size={11} className="text-[#66c0f4]" />
                            <span>
                                {viewsCount >= 1000
                                    ? `${(viewsCount / 1000).toFixed(1)}k`
                                    : viewsCount}
                            </span>
                        </div>

                        {/* Likes */}
                        <div className="flex items-center gap-1" title={`${favoritesCount.toLocaleString()} likes`}>
                            <Heart size={11} className="text-rose-500 fill-rose-500/25" />
                            <span>
                                {favoritesCount >= 1000
                                    ? `${(favoritesCount / 1000).toFixed(1)}k`
                                    : favoritesCount}
                            </span>
                        </div>

                        {/* Rating */}
                        {finalScore > 0 && (
                            <div className="flex items-center gap-0.5" title={`Score: ${finalScore}%`}>
                                <Star size={11} className="text-amber-400 fill-amber-400/20" />
                                <span className="font-semibold text-amber-300">{finalScore}%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
