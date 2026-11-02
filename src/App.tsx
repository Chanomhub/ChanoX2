import { Routes, Route, useNavigate, Navigate } from 'react-router'
import { useCallback } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { DownloadProvider } from '@/contexts/DownloadContext'
import { LibraryProvider } from '@/contexts/LibraryContext'
import { FestivalProvider } from '@/contexts/FestivalContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ChatProvider } from '@/contexts/ChatContext'
import ChatWindow from '@/components/features/chat/ChatWindow'
import Layout from '@/components/common/Layout'
import { usePendingGameLaunch } from '@/hooks/usePendingGameLaunch'
import { useDeepLink } from '@/hooks/useDeepLink'

// Pages
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Callback from '@/pages/Callback'
import ArticleDetail from '@/pages/ArticleDetail'
import Downloads from '@/pages/Downloads'
import Library from '@/pages/Library'
import Settings from '@/pages/Settings'
import Profile from '@/pages/Profile'
import Editor from '@/pages/Editor'

// Global pending game launch handler component
function PendingGameLaunchHandler() {
    const navigate = useNavigate();

    const handlePendingLaunch = useCallback((_gameId: string) => {
        console.log('🎮 App: Navigating to library for game:', _gameId);
        // Navigate to library - the Library page will handle selecting the game
        navigate('/library');
    }, [navigate]);

    usePendingGameLaunch(handlePendingLaunch);

    return null;
}

// Global deep link handler component
function DeepLinkHandler() {
    const navigate = useNavigate();

    const handleDeepLink = useCallback((url: string) => {
        console.log('🔗 App: Received deep link:', url);
        
        // Clean up the URL (remove trailing slashes, spaces)
        let cleanUrl = url.trim();
        if (cleanUrl.endsWith('/')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }

        // Handle chanox2://article/slug
        const articlePrefix = 'chanox2://article/';
        const editorPrefix = 'chanox2://editor/';
        if (cleanUrl.startsWith(articlePrefix)) {
            const slug = cleanUrl.substring(articlePrefix.length).split('?')[0];
            if (slug) {
                console.log('🔗 App: Navigating to article:', slug);
                navigate(`/article/${slug}`);
            } else {
                console.warn('⚠️ App: Deep link article slug is empty');
            }
        } else if (cleanUrl.startsWith(editorPrefix)) {
            const slug = cleanUrl.substring(editorPrefix.length).split('?')[0];
            navigate(slug ? `/editor/${slug}` : '/editor');
        } else if (cleanUrl === 'chanox2://editor') {
            navigate('/editor');
        } else {
            console.warn('⚠️ App: Unrecognized deep link format:', cleanUrl);
        }
    }, [navigate]);

    useDeepLink(handleDeepLink);

    return null;
}

export default function App() {
    console.log('App rendering');
    return (
        <AuthProvider>
            <LibraryProvider>
                <DownloadProvider>
                    <FestivalProvider>
                        <LanguageProvider>
                            <NotificationProvider>
                                <ChatProvider>
                                    <Layout>
                                        <PendingGameLaunchHandler />
                                        <DeepLinkHandler />
                                        <ChatWindow />
                                        <Routes>
                                            <Route path="/" element={<Home />} />
                                            <Route path="/login" element={<Login />} />
                                            <Route path="/register" element={<Register />} />
                                            <Route path="/callback" element={<Callback />} />
                                            <Route path="/article/:slug" element={<ArticleDetail />} />
                                            <Route path="/editor" element={<Editor mode="create" />} />
                                            <Route path="/editor/:slug" element={<Editor mode="edit" />} />
                                            <Route path="/upload" element={<Navigate to="/editor" replace />} />
                                            <Route path="/upload/games" element={<Navigate to="/editor" replace />} />
                                            <Route path="/downloads" element={<Downloads />} />
                                            <Route path="/library" element={<Library />} />
                                            <Route path="/search" element={<Navigate to="/" replace />} />
                                            <Route path="/settings" element={<Settings />} />
                                            <Route path="/profile/:username" element={<Profile />} />
                                        </Routes>
                                    </Layout>
                                </ChatProvider>
                            </NotificationProvider>
                        </LanguageProvider>
                    </FestivalProvider>
                </DownloadProvider>
            </LibraryProvider>
        </AuthProvider>
    )
}

