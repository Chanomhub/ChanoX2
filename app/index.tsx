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
import { useAuth } from '../src/contexts/AuthContext';

export default function Home() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, logout, isAuthenticated } = useAuth();

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
            setLoading(false);
        } catch (error) {
            console.error('Error fetching articles:', error);
            setLoading(false);
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
    const featuredArticles = articles.slice(0, 5);
    const developersSection = articles.slice(5, 13);
    const budgetSection = articles.slice(13, 21);
    const listSection = articles.slice(0, 15);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'STORE',
                    headerStyle: { backgroundColor: Colors.dark.surface },
                    headerTintColor: Colors.dark.text,
                    headerRight: () => (
                        <View style={styles.headerButtons}>
                            <TouchableOpacity
                                onPress={() => router.push('/downloads')}
                                style={styles.iconButton}
                            >
                                <Text style={styles.iconButtonText}>📥</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/search')}
                                style={styles.iconButton}
                            >
                                <Text style={styles.iconButtonText}>🔍</Text>
                            </TouchableOpacity>

                            {isAuthenticated ? (
                                <View style={styles.userMenu}>
                                    <Text style={styles.username}>{user?.username}</Text>
                                    <TouchableOpacity
                                        onPress={logout}
                                        style={styles.logoutButton}
                                    >
                                        <Text style={styles.logoutText}>Logout</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => router.push('/login')}
                                    style={styles.loginButton}
                                >
                                    <Text style={styles.loginText}>LOGIN</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ),
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Featured Carousel */}
                <FeaturedCarousel articles={featuredArticles} />

                {/* From Developers Section */}
                <HorizontalScroll
                    title="FROM DEVELOPERS AND PUBLISHERS YOU KNOW"
                    articles={developersSection}
                />

                {/* Budget Section */}
                <HorizontalScroll
                    title="UNDER ฿350"
                    articles={budgetSection}
                />

                {/* Tabbed List Section */}
                <GameListSection articles={listSection} />
            </ScrollView>
        </View>
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
    userMenu: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    username: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: '600',
    },
    logoutButton: {
        backgroundColor: Colors.dark.border,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    logoutText: {
        color: Colors.dark.text,
        fontSize: 12,
        fontWeight: 'bold',
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
