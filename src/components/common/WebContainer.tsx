import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft } from 'lucide-react';

interface WebContainerProps {
    url: string;
    title?: string;
    onLoad?: () => void;
    showBackButton?: boolean;
}

/**
 * WebContainer - A component that renders a remote web page in an iframe
 * and provides a bridge for communication between the web page and ChanoX2.
 */
export default function WebContainer({ url, title, onLoad, showBackButton = true }: WebContainerProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const navigate = useNavigate();
    const { token } = useAuth();

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Security: We should ideally check event.origin here
            // but for a flexible bridge we'll check the message structure.
            
            if (event.data?.type === 'CHANOX2_NAVIGATE') {
                const path = event.data.path;
                if (path) {
                    console.log('🌐 WebContainer: Navigating to', path);
                    navigate(path);
                }
            }

            if (event.data?.type === 'CHANOX2_OPEN_EXTERNAL') {
                const url = event.data.url;
                if (url && window.electronAPI) {
                    window.electronAPI.openExternal(url);
                }
            }

            if (event.data?.type === 'CHANOX2_OPEN_WINDOW') {
                const url = event.data.url;
                if (url && window.electronAPI) {
                    window.electronAPI.openNewWindow(url);
                }
            }

            // Respond to token requests from the iframe
            if (event.data?.type === 'CHANOX2_GET_TOKEN' && token) {
                iframeRef.current?.contentWindow?.postMessage({
                    type: 'CHANOX2_TOKEN_RESPONSE',
                    token: token
                }, '*');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [navigate, token]);

    // Send token automatically when iframe loads
    const handleOnLoad = () => {
        if (token && iframeRef.current?.contentWindow) {
            console.log('🌐 WebContainer: Sending token to iframe');
            iframeRef.current.contentWindow.postMessage({
                type: 'CHANOX2_TOKEN_RESPONSE',
                token: token
            }, '*');
        }
        if (onLoad) onLoad();
    };

    // Construct the final URL with app=chanox2 parameter
    const finalUrl = new URL(url);
    finalUrl.searchParams.set('app', 'chanox2');
    
    // Add current theme if possible (assuming ChanoX2 uses dark mode mostly)
    finalUrl.searchParams.set('theme', 'dark');

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden">
            <div className="h-10 flex items-center justify-between px-4 bg-[#1b2838] border-b border-white/5">
                <div className="flex items-center gap-4">
                    {showBackButton && (
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-zinc-400 hover:text-white"
                            title="Back"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    {title && (
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{title}</span>
                    )}
                </div>
            </div>
            <iframe
                ref={iframeRef}
                src={finalUrl.toString()}
                className="flex-1 w-full h-full border-none bg-background"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                onLoad={handleOnLoad}
            />
        </div>
    );
}
