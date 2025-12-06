import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Colors } from '../src/constants/Colors';
import { client } from '../src/api/client';
import { GET_ARTICLES } from '../src/api/queries';
import { Article, ArticlesResponse } from '../src/types/graphql';
import FeaturedCarousel from '../src/components/FeaturedCarousel';
import HorizontalScroll from '../src/components/HorizontalScroll';
import GameListSection from '../src/components/GameListSection';
// import AccountSwitcher from '../src/components/AccountSwitcher'; // Moved to TitleBar
import { useAuth } from '../src/contexts/AuthContext';

export default function Home() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const data = await client.request<ArticlesResponse>(GET_ARTICLES, {
                limit: 20,
                offset: 0,
            });
            setArticles(data.articles);
            setHasMore(data.articles.length === 20);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching articles:', error);
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const currentCount = articles.length;
            const data = await client.request<ArticlesResponse>(GET_ARTICLES, {
                limit: 10,
                offset: currentCount,
            });

            if (data.articles.length > 0) {
                setArticles(prev => [...prev, ...data.articles]);
                if (data.articles.length < 10) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading more articles:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.dark.accent} />
            </View>
        );
    }

    // Split articles for different sections
    // Note: We might want the list to contain ALL articles or just the ones after featured?
    // For now, let's pass all articles to the list section so users can find everything there.
    const featuredArticles = articles.slice(0, 5);
    const developersSection = articles.slice(5, 13);
    const listSection = articles;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'STORE',
                    headerShown: false,
                    headerStyle: { backgroundColor: Colors.dark.surface },
                    headerTintColor: Colors.dark.text,
                    // Remove headerRight as it's now in TitleBar
                }}
            />

            < ScrollView contentContainerStyle={styles.scrollContent} >
                {/* Featured Carousel */}
                < FeaturedCarousel articles={featuredArticles} />

                {/* From Developers Section */}
                < HorizontalScroll
                    title="FROM DEVELOPERS AND PUBLISHERS YOU KNOW"
                    articles={developersSection}
                />

                {/* Tabbed List Section */}
                < GameListSection
                    articles={listSection}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                />
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    iconButton: {
        padding: 8,
        marginRight: 4,
    },
    iconButtonText: {
        fontSize: 20,
    },

    loginButton: {
        backgroundColor: Colors.dark.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    loginText: {
        color: Colors.dark.background,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.dark.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
    },
    logoText: {
        color: Colors.dark.text,
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    headerRight: {
        flexDirection: 'row',
    },
    navButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(102, 192, 244, 0.1)',
        borderRadius: 3,
    },
    navLink: {
        color: Colors.dark.text,
        fontSize: 13,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
});
