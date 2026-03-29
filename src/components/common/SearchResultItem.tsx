import { Link } from 'react-router-dom';
import type { ArticleListItem } from '@chanomhub/sdk';
import { SafeImage } from '@/components/common/SafeImage';
import { Monitor, Apple, Gamepad2 } from 'lucide-react';

interface SearchResultItemProps {
    article: ArticleListItem;
}

// Platform icon mapping
const getPlatformIcon = (platformName: string) => {
    const name = platformName.toLowerCase();
    if (name.includes('windows') || name.includes('pc')) {
        return <Monitor size={14} className="text-zinc-400" />;
    }
    if (name.includes('mac') || name.includes('apple')) {
        return <Apple size={14} className="text-zinc-400" />;
    }
    if (name.includes('linux')) {
        return (
            <svg width="14" height="14" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-400">
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
        );
    }
    if (name.includes('steam')) {
        return <Gamepad2 size={14} className="text-zinc-400" />;
    }
    return null;
};

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

export default function SearchResultItem({ article }: SearchResultItemProps) {
    const releaseDate = article.createdAt
        ? new Date(article.createdAt).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : null;

    return (
        <Link
            to={`/article/${article.slug}`}
            className="group flex items-center gap-4 p-2 rounded hover:bg-[#395166] transition-all duration-200 border-b border-[#2a475e]/50"
        >
            {/* Thumbnail - Steam capsule style */}
            <div className="flex-shrink-0 w-[120px] h-[45px] rounded overflow-hidden bg-zinc-800">
                {article.coverImage || article.mainImage ? (
                    <SafeImage
                        src={article.coverImage || article.mainImage || ''}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-200"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-[#1b2838] to-[#2a475e]">
                        <span className="text-zinc-600 text-[10px]">No Image</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="text-[14px] font-normal text-[#c7d5e0] group-hover:text-white truncate transition-colors">
                    {article.title}
                </h3>

                {/* Platform icons and date */}
                <div className="flex items-center gap-4 mt-1">
                    {/* Platform icons */}
                    {article.platforms && article.platforms.length > 0 && (
                        <div className="flex items-center gap-1">
                            {article.platforms.slice(0, 3).map((platform) => (
                                <span key={platform.id} title={platform.name}>
                                    {getPlatformIcon(platform.name)}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Review Bar */}
                    {(() => {
                        const { score, count } = getReviewData(article.id, article.favoritesCount || 0, article.viewsCount || 0);
                        return (
                            <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-16 h-1 bg-[#0e1923] rounded-full overflow-hidden shrink-0">
                                    <div className="h-full rounded-full"
                                        style={{
                                            width: `${score}%`,
                                            backgroundColor: score >= 70 ? '#57cbde' : score >= 40 ? '#a0a0a0' : '#c84b4b',
                                        }} />
                                </div>
                                <span className="text-[10px] text-zinc-500 whitespace-nowrap">{score}% ({count})</span>
                            </div>
                        );
                    })()}

                    {/* Release date */}
                    {releaseDate && (
                        <span className="text-[11px] text-zinc-500">{releaseDate}</span>
                    )}
                </div>
            </div>


        </Link>
    );
}
