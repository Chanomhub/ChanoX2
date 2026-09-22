import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface HtmlRendererProps {
    html: string;
    className?: string;
}

export default function HtmlRenderer({ html, className }: HtmlRendererProps) {
    // Sanitize HTML to prevent XSS
    const sanitizedHtml = DOMPurify.sanitize(html);

    return (
        <div
            className={cn(
                "prose prose-invert max-w-none",
                // Custom overrides to match legacy theme
                "prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-2",
                "prose-a:text-primary prose-a:no-underline hover:prose-a:underline font-medium",
                "prose-headings:text-foreground prose-headings:font-bold",
                "prose-img:rounded-lg prose-img:my-4",
                "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-card prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic",
                "prose-code:bg-muted prose-code:text-foreground prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none",
                "prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded",
                "prose-ul:my-2 prose-li:text-muted-foreground",
                "prose-table:border prose-table:border-border",
                "prose-th:bg-card prose-th:border prose-th:border-border prose-th:p-2",
                "prose-td:border prose-td:border-border prose-td:p-2",
                className
            )}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
}
