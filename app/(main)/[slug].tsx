import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Colors } from '@/constants/Colors';
import { client } from '@/libs/api/client';
import { GET_ARTICLE, GET_DOWNLOADS } from '@/libs/api/queries';
import { ArticleDetail, ArticleResponse, Download, DownloadsResponse } from '@/types/graphql';
import { useDownloads } from '@/contexts/DownloadContext';
import { ArticleDownloadDialog } from '@/components/common/ArticleDownloadDialog';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ArticleDetailPage() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [downloads, setDownloads] = useState<Download[]>([]);
    const [selectedDownload, setSelectedDownload] = useState<Download | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { openDownloadLink } = useDownloads();
    const { language, isLoading: isLanguageLoading } = useLanguage();

    useEffect(() => {
        let isMounted = true;

        if (slug && !isLanguageLoading) {
            console.log('Fetching article with slug:', slug, 'language:', language);
            fetchArticle(isMounted);
        }

        return () => {
            isMounted = false;
        };
    }, [slug, language, isLanguageLoading]);

    const fetchArticle = async (isMounted: boolean) => {
        try {
            if (!isMounted) return;
            setLoading(true);
            console.log('Making GraphQL request for slug:', slug);
            const data = await client.request<ArticleResponse>(GET_ARTICLE, {
                slug: slug,
                language: language,
            });

            if (!isMounted) return;

            console.log('Received data:', data);

            if (data && data.article) {
                setArticle(data.article);
                // Fetch downloads after getting article
                fetchDownloads(data.article.id);
            } else {
                console.error('No article in response');
                setError('Article not found in response');
            }
            setLoading(false);
        } catch (err) {
            if (!isMounted) return;
            console.error('Error fetching article:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
        }
    };

    const fetchDownloads = async (articleId: number) => {
        try {
            const data = await client.request<DownloadsResponse>(GET_DOWNLOADS, {
                articleId: parseInt(articleId.toString(), 10),
            });
            setDownloads(data.downloads.filter(d => d.isActive));
        } catch (err) {
            console.error('Error fetching downloads:', err);
        }
    };

    const handleDownloadPress = (url: string) => {
        Linking.openURL(url).catch(err => console.error('Error opening link:', err));
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.dark.accent} />
            </View>
        );
    }

    if (!article) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>
                    {error || 'Article not found'}
                </Text>
                <Text style={styles.errorDetail}>Slug: {slug}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: article.title,
                    headerStyle: { backgroundColor: Colors.dark.surface },
                    headerTintColor: Colors.dark.text,
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    {article.backgroundImage || article.mainImage || article.coverImage ? (
                        <Image
                            source={{ uri: article.backgroundImage || article.mainImage || article.coverImage || '' }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.heroPlaceholder} />
                    )}
                    <View style={styles.heroOverlay}>
                        <Text style={styles.title}>{article.title}</Text>
                        {article.ver && (
                            <Text style={styles.version}>Version: {article.ver}</Text>
                        )}
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <View style={styles.leftColumn}>
                            {/* Description */}
                            <View style={styles.descriptionCard}>
                                <Text style={styles.sectionTitle}>About This Game</Text>
                                <Text style={styles.description}>{article.description}</Text>
                            </View>

                            {/* Full Body Content */}
                            {article.body && (
                                <View style={styles.bodyCard}>
                                    <Text style={styles.sectionTitle}>Full Description</Text>
                                    <ScrollView style={styles.bodyScroll}>
                                        <Text style={styles.bodyText}>{article.body.replace(/<[^>]*>/g, '')}</Text>
                                    </ScrollView>
                                </View>
                            )}

                            {/* Screenshots */}
                            {article.images.length > 0 && (
                                <View style={styles.screenshotsSection}>
                                    <Text style={styles.sectionTitle}>Screenshots</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {article.images.map((img) => (
                                            <Image
                                                key={img.id}
                                                source={{ uri: img.url }}
                                                style={styles.screenshot}
                                                resizeMode="cover"
                                            />
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <View style={styles.rightColumn}>
                            {/* Metadata Card */}
                            <View style={styles.metadataCard}>
                                {/* Download Buttons */}
                                {downloads.length > 0 && (
                                    <View style={styles.downloadsSection}>
                                        <Text style={styles.downloadTitle}>Downloads</Text>
                                        {downloads.map((download) => (
                                            <TouchableOpacity
                                                key={download.id}
                                                style={[
                                                    styles.downloadButton,
                                                    download.vipOnly && styles.downloadButtonVIP
                                                ]}
                                                onPress={() => {
                                                    setSelectedDownload(download);
                                                }}
                                            >
                                                <Text style={styles.downloadButtonText}>
                                                    📥 {download.name || 'Download'}
                                                </Text>
                                                {download.vipOnly && (
                                                    <View style={styles.vipBadge}>
                                                        <Text style={styles.vipBadgeText}>VIP</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <ArticleDownloadDialog
                                    visible={!!selectedDownload}
                                    onClose={() => setSelectedDownload(null)}
                                    download={selectedDownload}
                                    onDownload={(url) => {
                                        openDownloadLink(
                                            url,
                                            article?.title,
                                            article?.coverImage || article?.mainImage || article?.backgroundImage || undefined
                                        );
                                    }}
                                    articleTitle={article?.title}
                                />

                                {/* Categories */}
                                {article.categories.length > 0 && (
                                    <View style={styles.metadataRow}>
                                        <Text style={styles.metadataLabel}>Categories:</Text>
                                        <View style={styles.metadataValues}>
                                            {article.categories.map((cat) => (
                                                <Text key={cat.id} style={styles.metadataValue}>
                                                    {cat.name}
                                                </Text>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Platforms */}
                                {article.platforms.length > 0 && (
                                    <View style={styles.metadataRow}>
                                        <Text style={styles.metadataLabel}>Platforms:</Text>
                                        <View style={styles.metadataValues}>
                                            {article.platforms.map((plat) => (
                                                <Text key={plat.id} style={styles.metadataValue}>
                                                    {plat.name}
                                                </Text>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Tags */}
                                {article.tags.length > 0 && (
                                    <View style={styles.metadataRow}>
                                        <Text style={styles.metadataLabel}>Tags:</Text>
                                        <View style={styles.tagsContainer}>
                                            {article.tags.map((tag) => (
                                                <View key={tag.id} style={styles.tagBadge}>
                                                    <Text style={styles.tagText}>{tag.name}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Engine */}
                                {article.engine && (
                                    <View style={styles.metadataRow}>
                                        <Text style={styles.metadataLabel}>Engine:</Text>
                                        <Text style={styles.metadataValue}>{article.engine.name}</Text>
                                    </View>
                                )}

                                {/* Author */}
                                <View style={styles.metadataRow}>
                                    <Text style={styles.metadataLabel}>Author:</Text>
                                    <Text style={styles.metadataValue}>{article.author.name}</Text>
                                </View>

                                {/* Creators */}
                                {article.creators.length > 0 && (
                                    <View style={styles.metadataRow}>
                                        <Text style={styles.metadataLabel}>Creators:</Text>
                                        <View style={styles.metadataValues}>
                                            {article.creators.map((creator) => (
                                                <Text key={creator.id} style={styles.metadataValue}>
                                                    {creator.name}
                                                </Text>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Favorites */}
                                <View style={styles.metadataRow}>
                                    <Text style={styles.metadataLabel}>Favorites:</Text>
                                    <Text style={styles.metadataValue}>{article.favoritesCount}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: Colors.dark.text,
        fontSize: 16,
        marginBottom: 8,
    },
    errorDetail: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
        marginBottom: 16,
    },
    backButton: {
        backgroundColor: Colors.dark.accent,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 4,
    },
    backButtonText: {
        color: Colors.dark.background,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingBottom: 32,
    },
    heroSection: {
        height: 300,
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#2a475e',
    },
    heroOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    title: {
        color: Colors.dark.text,
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    version: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
    },
    infoSection: {
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
    },
    leftColumn: {
        flex: 2,
        marginRight: 16,
    },
    rightColumn: {
        flex: 1,
    },
    descriptionCard: {
        backgroundColor: Colors.dark.surface,
        padding: 16,
        borderRadius: 4,
        marginBottom: 16,
    },
    sectionTitle: {
        color: Colors.dark.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    description: {
        color: Colors.dark.text,
        fontSize: 14,
        lineHeight: 22,
    },
    bodyCard: {
        backgroundColor: Colors.dark.surface,
        padding: 16,
        borderRadius: 4,
        marginBottom: 16,
        maxHeight: 400,
    },
    bodyScroll: {
        maxHeight: 350,
    },
    bodyText: {
        color: Colors.dark.text,
        fontSize: 14,
        lineHeight: 22,
    },
    screenshotsSection: {
        backgroundColor: Colors.dark.surface,
        padding: 16,
        borderRadius: 4,
    },
    screenshot: {
        width: 300,
        height: 180,
        marginRight: 12,
        borderRadius: 4,
    },
    metadataCard: {
        backgroundColor: Colors.dark.surface,
        padding: 16,
        borderRadius: 4,
    },
    downloadsSection: {
        marginBottom: 16,
    },
    downloadTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.dark.text,
        marginBottom: 12,
    },
    downloadButton: {
        backgroundColor: Colors.dark.accent,
        padding: 12,
        borderRadius: 4,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    downloadButtonVIP: {
        backgroundColor: '#FFD700',
    },
    downloadButtonText: {
        color: Colors.dark.background,
        fontSize: 14,
        fontWeight: 'bold',
    },
    vipBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
    },
    vipBadgeText: {
        color: '#FFD700',
        fontSize: 11,
        fontWeight: 'bold',
    },
    metadataRow: {
        marginBottom: 16,
    },
    metadataLabel: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        marginBottom: 6,
    },
    metadataValues: {
        flexDirection: 'column',
    },
    metadataValue: {
        color: Colors.dark.text,
        fontSize: 14,
        marginBottom: 4,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tagBadge: {
        backgroundColor: Colors.dark.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
        marginRight: 6,
        marginBottom: 6,
    },
    tagText: {
        color: Colors.dark.text,
        fontSize: 11,
    },
});
