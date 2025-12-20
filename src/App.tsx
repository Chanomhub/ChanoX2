import { Routes, Route, useNavigate } from 'react-router-dom'
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

// Pages
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Callback from '@/pages/Callback'
import ArticleDetail from '@/pages/ArticleDetail'
import Downloads from '@/pages/Downloads'
import Library from '@/pages/Library'
import Search from '@/pages/Search'
import Settings from '@/pages/Settings'

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
                                        <ChatWindow />
                                        <Routes>
                                            <Route path="/" element={<Home />} />
                                            <Route path="/login" element={<Login />} />
                                            <Route path="/register" element={<Register />} />
                                            <Route path="/callback" element={<Callback />} />
                                            <Route path="/article/:slug" element={<ArticleDetail />} />
                                            <Route path="/downloads" element={<Downloads />} />
                                            <Route path="/library" element={<Library />} />
                                            <Route path="/search" element={<Search />} />
                                            <Route path="/settings" element={<Settings />} />
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

