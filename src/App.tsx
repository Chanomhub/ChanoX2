import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { DownloadProvider } from '@/contexts/DownloadContext'
import { LibraryProvider } from '@/contexts/LibraryContext'
import { FestivalProvider } from '@/contexts/FestivalContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import Layout from '@/components/common/Layout'

// Pages
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Callback from '@/pages/Callback'
import ArticleDetail from '@/pages/ArticleDetail'
import Downloads from '@/pages/Downloads'
import Library from '@/pages/Library'
import Search from '@/pages/Search'

export default function App() {
    console.log('App rendering');
    return (
        <AuthProvider>
            <LibraryProvider>
                <DownloadProvider>
                    <FestivalProvider>
                        <LanguageProvider>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/callback" element={<Callback />} />
                                    <Route path="/article/:slug" element={<ArticleDetail />} />
                                    <Route path="/downloads" element={<Downloads />} />
                                    <Route path="/library" element={<Library />} />
                                    <Route path="/search" element={<Search />} />
                                </Routes>
                            </Layout>
                        </LanguageProvider>
                    </FestivalProvider>
                </DownloadProvider>
            </LibraryProvider>
        </AuthProvider>
    )
}
