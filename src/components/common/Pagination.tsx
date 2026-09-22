import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalResults: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, totalResults }: PaginationProps) {
    const { t } = useTranslation();

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between bg-card border border-border p-2 rounded-md">
            <div className="flex gap-1">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="px-3 py-1.5 rounded bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground disabled:opacity-40 disabled:hover:bg-muted transition-colors"
                >
                    {t('store.prev')}
                </button>
                {getPageNumbers().map((p, idx) => (
                    <button
                        key={idx}
                        disabled={p === '...'}
                        onClick={() => typeof p === 'number' && onPageChange(p)}
                        className={cn(
                            "px-3 py-1.5 rounded text-xs font-semibold transition-colors",
                            p === currentPage
                                ? "bg-primary text-primary-foreground font-bold"
                                : p === '...'
                                    ? "text-muted-foreground cursor-default bg-transparent"
                                    : "bg-muted hover:bg-muted/80 text-foreground"
                        )}
                    >
                        {p}
                    </button>
                ))}
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="px-3 py-1.5 rounded bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground disabled:opacity-40 disabled:hover:bg-muted transition-colors"
                >
                    {t('store.next')}
                </button>
            </div>

            <span className="text-[11px] text-muted-foreground hidden sm:inline">
                {t('store.pagination_info', { current: currentPage, total: totalPages, count: totalResults })}
            </span>
        </div>
    );
}
