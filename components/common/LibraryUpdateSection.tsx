import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';

// Mock data for "What's New" shelf since we don't have a real API for this yet
const CACHE_KEY = 'library_whats_new_cache';

interface NewsItem {
    id: string;
    game: string;
    title: string;
    date: string;
    type: string;
    image: string;
    slug: string;
}

export default function LibraryUpdateSection() {
    const [news, setNews] = React.useState<NewsItem[]>([]);

    React.useEffect(() => {
        // 1. Load from cache immediately
        const loadCache = () => {
            try {
                if (typeof window !== 'undefined') {
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (cached) {
                        setNews(JSON.parse(cached));
                    }
                }
            } catch (e) {
                console.error('Failed to load news cache', e);
            }
        };

        loadCache();

        // 2. Fetch fresh data
        const fetchData = async () => {
            try {
                const { client } = require('@/libs/api/client');
                const { GET_ARTICLES } = require('@/libs/api/queries');

                const data = await client.request(GET_ARTICLES, {
                    limit: 3,
                    offset: 0,
                    filter: {} // Assuming empty filter gets latest
                });

                if (data && data.articles) {
                    const newItems: NewsItem[] = data.articles.map((article: any) => ({
                        id: article.id.toString(),
                        game: article.title, // Using title as game name
                        title: article.description || 'New Release', // Description acts as the "update title" or fallback
                        date: new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                        type: 'NEW RELEASE',
                        image: article.coverImage || article.mainImage || 'https://placehold.co/300x160/2a475e/ffffff?text=No+Image',
                        slug: article.slug
                    }));

                    // Update state and cache only if data is different (JSON string comparison is cheap for 3 items)
                    setNews(prev => {
                        const isDifferent = JSON.stringify(prev) !== JSON.stringify(newItems);
                        if (isDifferent) {
                            if (typeof window !== 'undefined') {
                                localStorage.setItem(CACHE_KEY, JSON.stringify(newItems));
                            }
                            return newItems;
                        }
                        return prev;
                    });
                }
            } catch (error) {
                console.error('Failed to fetch what\'s new', error);
            }
        };

        fetchData();
    }, []);

    if (news.length === 0) return null; // Don't show if no data

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>What's New</Text>
                <TouchableOpacity>
                    <Text style={styles.settingsIcon}>⚙</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {news.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.card}>
                        <View style={styles.imageContainer}>
                            <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
                            <View style={styles.overlay}>
                                <Text style={styles.overlayText}>{item.type}</Text>
                            </View>
                        </View>
                        <View style={styles.content}>
                            <Text style={styles.gameTitle}>
                                <Text style={styles.gameIcon}>🎮 </Text>
                                {item.game}
                            </Text>
                            <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                            <Text style={styles.date}>{item.date}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    title: {
        color: '#dcdedf',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
    settingsIcon: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    card: {
        width: 320,
        marginRight: 16,
        backgroundColor: '#1b2838', // Slightly lighter than background
        borderRadius: 4,
        overflow: 'hidden',
        // Shadow

        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
            },
            android: {
                elevation: 5,
            },
            web: {
                boxShadow: '0px 2px 4px rgba(0,0,0,0.3)',
            }
        }),
    },
    imageContainer: {
        height: 180,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    overlayText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
    },
    content: {
        padding: 12,
        height: 100, // Fixed height for alignment
    },
    gameTitle: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        marginBottom: 4,
        fontWeight: '500',
    },
    gameIcon: {
        fontSize: 12,
    },
    newsTitle: {
        color: '#dcdedf',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    date: {
        color: '#58626e',
        fontSize: 11,
        marginTop: 'auto',
    },
});
