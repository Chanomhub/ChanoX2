import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Pressable, LayoutChangeEvent } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useMemo, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { client } from '@/libs/api/client';
import { GET_ARTICLE, GET_DOWNLOADS } from '@/libs/api/queries';
import { ArticleDetail, ArticleResponse, Download, DownloadsResponse, ArticleImage } from '@/types/graphql';
import { useDownloads } from '@/contexts/DownloadContext';
import { ArticleDownloadDialog } from '@/components/common/ArticleDownloadDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFestival } from '@/contexts/FestivalContext';
import HtmlRenderer from '@/components/common/HtmlRenderer';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ArticleDetailPage() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const [article, setArticle] = useState<ArticleDetail | null>(null);
    const [downloads, setDownloads] = useState<Download[]>([]);
    const [selectedDownload, setSelectedDownload] = useState<Download | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [downloadsLayoutY, setDownloadsLayoutY] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const { openDownloadLink } = useDownloads();
    const { language, isLoading: isLanguageLoading } = useLanguage();
    const { theme } = useFestival();

    const styles = useMemo(() => createStyles(theme), [theme]);

    // Combine all images for the gallery (main image + article images)
    const allImages = useMemo(() => {
        if (!article) return [];
        const images: { id: number; url: string }[] = [];

        // Add main/cover/background image as first
        const heroImage = article.backgroundImage || article.mainImage || article.coverImage;
        if (heroImage) {
            images.push({ id: -1, url: heroImage });
        }

        // Add all article images
        images.push(...article.images);

        return images;
    }, [article]);

    useEffect(() => {
        let isMounted = true;

        if (slug && slug !== 'index.html' && !isLanguageLoading) {
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

            const data = await client.request<ArticleResponse>(GET_ARTICLE, {
                slug: slug,
                language: language,
            });

            if (!isMounted) return;

            if (data && data.article) {
                setArticle(data.article);
                fetchDownloads(data.article.id);
            } else {
                setError('Article not found');
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

    const handlePrimaryDownload = () => {
        // Scroll to downloads section
        if (scrollViewRef.current && downloadsLayoutY > 0) {
            scrollViewRef.current.scrollTo({ y: downloadsLayoutY - 100, animated: true });
        }
    };

    const handleDownloadsLayout = (event: LayoutChangeEvent) => {
        setDownloadsLayoutY(event.nativeEvent.layout.y);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    if (!article) {
        return (
            <View style={[styles.container, styles.center]}>
                <Ionicons name="game-controller-outline" size={64} color={theme.textSecondary} />
                <Text style={styles.errorText}>{error || 'Article not found'}</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color={theme.background} />
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const coverImage = article.coverImage || article.mainImage || '';
    const currentImage = allImages[selectedImageIndex]?.url || coverImage;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ===== BREADCRUMB ===== */}
                <View style={styles.breadcrumb}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.breadcrumbText}>All Games</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                    {article.categories[0] && (
                        <>
                            <Text style={styles.breadcrumbText}>{article.categories[0].name}</Text>
                            <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                        </>
                    )}
                    <Text style={[styles.breadcrumbText, styles.breadcrumbActive]}>{article.title}</Text>
                </View>

                {/* ===== TITLE ===== */}
                <Text style={styles.pageTitle}>{article.title}</Text>

                {/* ===== MAIN CONTENT (Steam Layout) ===== */}
                <View style={styles.mainContent}>
                    {/* Left Side - Gallery */}
                    <View style={styles.leftSection}>
                        {/* Main Image/Video Display */}
                        <View style={styles.mainImageContainer}>
                            {currentImage ? (
                                <Image
                                    source={{ uri: currentImage }}
                                    style={styles.mainImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={styles.mainImagePlaceholder}>
                                    <Ionicons name="image-outline" size={60} color={theme.border} />
                                </View>
                            )}

                            {/* Image navigation arrows */}
                            {allImages.length > 1 && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.imageNavButton, styles.imageNavLeft]}
                                        onPress={() => setSelectedImageIndex(prev =>
                                            prev > 0 ? prev - 1 : allImages.length - 1
                                        )}
                                    >
                                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.imageNavButton, styles.imageNavRight]}
                                        onPress={() => setSelectedImageIndex(prev =>
                                            prev < allImages.length - 1 ? prev + 1 : 0
                                        )}
                                    >
                                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        {/* Thumbnail Strip */}
                        {allImages.length > 1 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.thumbnailStrip}
                            >
                                {allImages.map((img, index) => (
                                    <Pressable
                                        key={img.id}
                                        onPress={() => setSelectedImageIndex(index)}
                                        style={[
                                            styles.thumbnail,
                                            selectedImageIndex === index && styles.thumbnailActive
                                        ]}
                                    >
                                        <Image
                                            source={{ uri: img.url }}
                                            style={styles.thumbnailImage}
                                            resizeMode="cover"
                                        />
                                    </Pressable>
                                ))}
                            </ScrollView>
                        )}

                        {/* Action Buttons Row */}
                        <View style={styles.actionButtonsRow}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="heart-outline" size={18} color={theme.text} />
                                <Text style={styles.actionButtonText}>Add to Favorites</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="share-social-outline" size={18} color={theme.text} />
                                <Text style={styles.actionButtonText}>Share</Text>
                            </TouchableOpacity>
                            {downloads.length > 0 && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.actionButtonPrimary]}
                                    onPress={handlePrimaryDownload}
                                >
                                    <Ionicons name="download-outline" size={18} color="#FFF" />
                                    <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                                        Download
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Right Side - Info Panel */}
                    <View style={styles.rightSection}>
                        {/* Cover Image / Logo */}
                        <View style={styles.coverContainer}>
                            {coverImage ? (
                                <Image
                                    source={{ uri: coverImage }}
                                    style={styles.coverImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.coverImage, styles.coverPlaceholder]}>
                                    <Ionicons name="game-controller" size={40} color={theme.border} />
                                </View>
                            )}
                        </View>

                        {/* Short Description */}
                        <Text style={styles.shortDescription} numberOfLines={3}>
                            {article.description}
                        </Text>

                        {/* Metadata */}
                        <View style={styles.metadataSection}>
                            {article.createdAt && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>RELEASE DATE:</Text>
                                    <Text style={styles.metaValue}>
                                        {new Date(article.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                            )}

                            {article.author && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>DEVELOPER:</Text>
                                    <Text style={[styles.metaValue, styles.metaLink]}>
                                        {article.author.name}
                                    </Text>
                                </View>
                            )}

                            {article.creators.length > 0 && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>CREATORS:</Text>
                                    <Text style={[styles.metaValue, styles.metaLink]}>
                                        {article.creators.map(c => c.name).join(', ')}
                                    </Text>
                                </View>
                            )}

                            {article.engine && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>ENGINE:</Text>
                                    <Text style={styles.metaValue}>{article.engine.name}</Text>
                                </View>
                            )}

                            {article.ver && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>VERSION:</Text>
                                    <Text style={styles.metaValue}>{article.ver}</Text>
                                </View>
                            )}

                            {article.platforms.length > 0 && (
                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>PLATFORMS:</Text>
                                    <Text style={styles.metaValue}>
                                        {article.platforms.map(p => p.name).join(', ')}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Tags */}
                        <Text style={styles.tagsLabel}>Popular user-defined tags for this product:</Text>
                        <View style={styles.tagsContainer}>
                            {article.categories.map((cat) => (
                                <View key={cat.id} style={styles.tag}>
                                    <Text style={styles.tagText}>{cat.name}</Text>
                                </View>
                            ))}
                            {article.tags.slice(0, 5).map((tag) => (
                                <View key={tag.id} style={styles.tag}>
                                    <Text style={styles.tagText}>{tag.name}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ===== ABOUT + DOWNLOADS SECTION (2-Column) ===== */}
                <View style={styles.aboutDownloadsRow} onLayout={handleDownloadsLayout}>
                    {/* Left - About Section */}
                    <View style={styles.aboutSection}>
                        <Text style={styles.sectionTitle}>About This Game</Text>
                        <Text style={styles.aboutDescription}>{article.description}</Text>

                        {article.body && (
                            <View style={styles.bodyContent}>
                                <HtmlRenderer html={article.body} />
                            </View>
                        )}
                    </View>

                    {/* Right - Downloads Section */}
                    {downloads.length > 0 && (
                        <View style={styles.downloadsSection}>
                            <Text style={styles.sectionTitle}>Available Downloads</Text>
                            <View style={styles.downloadsList}>
                                {downloads.map((download) => (
                                    <TouchableOpacity
                                        key={download.id}
                                        style={[
                                            styles.downloadCard,
                                            download.vipOnly && styles.downloadCardVIP
                                        ]}
                                        onPress={() => setSelectedDownload(download)}
                                    >
                                        <View style={styles.downloadCardLeft}>
                                            <Ionicons
                                                name={download.vipOnly ? "diamond" : "cloud-download-outline"}
                                                size={24}
                                                color={download.vipOnly ? '#FFD700' : theme.accent}
                                            />
                                            <View style={styles.downloadCardInfo}>
                                                <Text style={styles.downloadCardName} numberOfLines={1}>
                                                    {download.name || 'Download'}
                                                </Text>
                                                {download.vipOnly && (
                                                    <Text style={styles.downloadCardVIPLabel}>VIP Only</Text>
                                                )}
                                            </View>
                                        </View>
                                        <View style={styles.downloadCardButton}>
                                            <Text style={styles.downloadCardButtonText}>Download</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* System Requirements (Placeholder) */}
                            <View style={styles.systemRequirements}>
                                <Text style={styles.systemReqTitle}>System Requirements</Text>
                                <View style={styles.systemReqRow}>
                                    <Text style={styles.systemReqLabel}>OS:</Text>
                                    <Text style={styles.systemReqValue}>
                                        {article.platforms.map(p => p.name).join(' / ') || 'Windows / Android'}
                                    </Text>
                                </View>
                                {article.engine && (
                                    <View style={styles.systemReqRow}>
                                        <Text style={styles.systemReqLabel}>Engine:</Text>
                                        <Text style={styles.systemReqValue}>{article.engine.name}</Text>
                                    </View>
                                )}
                                <View style={styles.systemReqRow}>
                                    <Text style={styles.systemReqLabel}>Storage:</Text>
                                    <Text style={styles.systemReqValue}>Varies by download</Text>
                                </View>
                                <View style={styles.systemReqRow}>
                                    <Text style={styles.systemReqLabel}>RAM:</Text>
                                    <Text style={styles.systemReqValue}>2 GB+</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Bottom Spacer */}
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Download Dialog */}
            <ArticleDownloadDialog
                visible={!!selectedDownload}
                onClose={() => setSelectedDownload(null)}
                download={selectedDownload}
                onDownload={(url) => {
                    openDownloadLink(
                        url,
                        article?.title,
                        article?.coverImage || article?.mainImage || article?.backgroundImage || undefined,
                        article?.engine?.name || undefined,
                        article?.ver || undefined
                    );
                }}
                articleTitle={article?.title}
            />
        </View>
    );
}

// Main Styles Factory
const createStyles = (theme: typeof Colors.dark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        color: theme.textSecondary,
        fontSize: 14,
        marginTop: 8,
    },
    errorText: {
        color: theme.text,
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.accent,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: theme.background,
        fontWeight: 'bold',
        fontSize: 14,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 50,
    },

    // Breadcrumb
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    breadcrumbText: {
        color: theme.textSecondary,
        fontSize: 12,
    },
    breadcrumbActive: {
        color: theme.text,
        fontWeight: '500',
    },

    // Page Title
    pageTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.text,
        marginBottom: 16,
    },

    // Main Content (Steam Layout)
    mainContent: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    leftSection: {
        flex: 1.8,
    },
    rightSection: {
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: 4,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
    },

    // Main Image Display
    mainImageContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: theme.surface,
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    mainImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.surface,
    },
    imageNavButton: {
        position: 'absolute',
        top: '50%',
        marginTop: -20,
        width: 40,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    imageNavLeft: {
        left: 8,
    },
    imageNavRight: {
        right: 8,
    },

    // Thumbnail Strip
    thumbnailStrip: {
        gap: 8,
        paddingVertical: 12,
    },
    thumbnail: {
        width: 116,
        height: 65,
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        opacity: 0.7,
    },
    thumbnailActive: {
        borderColor: theme.accent,
        opacity: 1,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },

    // Action Buttons
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(103, 193, 245, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.border,
    },
    actionButtonPrimary: {
        backgroundColor: theme.accent,
        borderColor: theme.accent,
        flex: 1,
        justifyContent: 'center',
    },
    actionButtonText: {
        color: theme.text,
        fontSize: 12,
        fontWeight: '500',
    },
    actionButtonTextPrimary: {
        color: '#FFF',
        fontWeight: '700',
    },

    // Right Section - Cover & Info
    coverContainer: {
        width: '100%',
        aspectRatio: 2 / 1,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        backgroundColor: theme.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shortDescription: {
        fontSize: 13,
        color: theme.text,
        lineHeight: 20,
        marginBottom: 16,
    },

    // Metadata
    metadataSection: {
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    metaLabel: {
        fontSize: 11,
        color: theme.textSecondary,
        width: 100,
    },
    metaValue: {
        fontSize: 11,
        color: theme.text,
        flex: 1,
    },
    metaLink: {
        color: theme.accent,
    },

    // Tags
    tagsLabel: {
        fontSize: 11,
        color: theme.textSecondary,
        marginBottom: 8,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    tag: {
        backgroundColor: 'rgba(103, 193, 245, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
    },
    tagText: {
        fontSize: 11,
        color: theme.accent,
    },

    // About + Downloads Row (2-Column)
    aboutDownloadsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },

    // About Section
    aboutSection: {
        flex: 2,
        overflow: 'hidden',
    },
    aboutDescription: {
        fontSize: 14,
        color: theme.text,
        lineHeight: 24,
        marginBottom: 16,
    },
    bodyContent: {
        overflow: 'hidden',
    },

    // Downloads Section (Sidebar)
    downloadsSection: {
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
        alignSelf: 'flex-start',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.text,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    downloadsList: {
        gap: 8,
    },
    downloadCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.surface,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
    },
    downloadCardVIP: {
        borderColor: 'rgba(255,215,0,0.4)',
        backgroundColor: 'rgba(255,215,0,0.05)',
    },
    downloadCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    downloadCardInfo: {
        flex: 1,
    },
    downloadCardName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.text,
    },
    downloadCardVIPLabel: {
        fontSize: 11,
        color: '#FFD700',
        marginTop: 2,
    },
    downloadCardButton: {
        backgroundColor: theme.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    downloadCardButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },

    // System Requirements
    systemRequirements: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    systemReqTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.text,
        marginBottom: 12,
    },
    systemReqRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    systemReqLabel: {
        fontSize: 11,
        color: theme.textSecondary,
        width: 60,
    },
    systemReqValue: {
        fontSize: 11,
        color: theme.text,
        flex: 1,
    },
});
