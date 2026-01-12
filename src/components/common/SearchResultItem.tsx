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
    if (name.includes('linux') || name.includes('steam')) {
        return <Gamepad2 size={14} className="text-zinc-400" />;
    }
    return null;
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
                <div className="flex items-center gap-2 mt-1">
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

                    {/* Release date */}
                    {releaseDate && (
                        <span className="text-[11px] text-zinc-500">{releaseDate}</span>
                    )}
                </div>
            </div>


        </Link>
    );
}
