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
                "prose-p:text-[#c7d5e0] prose-p:leading-relaxed prose-p:mb-2",
                "prose-a:text-[#66c0f4] prose-a:no-underline hover:prose-a:underline",
                "prose-headings:text-white prose-headings:font-bold",
                "prose-img:rounded-lg prose-img:my-4",
                "prose-blockquote:border-l-4 prose-blockquote:border-[#66c0f4] prose-blockquote:bg-[#1b2838] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic",
                "prose-code:bg-[#1a1d23] prose-code:text-[#dcdedf] prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none",
                "prose-pre:bg-[#1a1d23] prose-pre:p-4 prose-pre:rounded",
                "prose-ul:my-2 prose-li:text-[#c7d5e0]",
                "prose-table:border prose-table:border-[#3d4a5a]",
                "prose-th:bg-[#1b2838] prose-th:border prose-th:border-[#3d4a5a] prose-th:p-2",
                "prose-td:border prose-td:border-[#3d4a5a] prose-td:p-2",
                className
            )}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
}
