import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Article } from '../types/graphql';

interface GameListSectionProps {
    articles: Article[];
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
}

const tabs = ['New & Trending', 'Top Sellers', 'Popular Upcoming', 'Specials'];
const ITEMS_PER_PAGE = 10;

export default function GameListSection({
    articles,
    onLoadMore,
    hasMore = false,
    loadingMore = false
}: GameListSectionProps) {
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab]);

    const filteredArticles = useMemo(() => {
        if (!searchQuery) {
            return articles;
        }
        return articles.filter(article =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [articles, searchQuery, activeTab]);

    const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);

    const displayedArticles = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredArticles.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredArticles, currentPage]);

    const goToPrevious = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    const goToNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(p => p + 1);
        } else if (hasMore && !searchQuery && onLoadMore) {
            // If on last page, no search query, and more data available from API
            onLoadMore();
            // We stay on this page until data loads. 
            // Once data loads, totalPages will increase, and user can click Next again.
            // Alternatively, we could auto-increment page index if we want optimistic UI, 
            // but waiting for data is safer to avoid empty pages.
        }
    };

    return (
        <View style={styles.container}>
            {/* Tabs & Search */}
            <View style={styles.tabsContainer}>
                <View style={styles.tabs}>
                    {tabs.map((tab, index) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === index && styles.tabActive]}
                            onPress={() => setActiveTab(index)}
                        >
                            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Inline Search */}
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search Store"
                        placeholderTextColor={Colors.dark.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* List */}
            <View style={styles.list}>
                {displayedArticles.length > 0 ? (
                    displayedArticles.map((article) => (
                        <Link key={article.id} href={`/${article.slug}`} asChild>
                            <TouchableOpacity style={styles.listItem}>
                                {/* Thumbnail */}
                                <View style={styles.thumbnail}>
                                    {article.coverImage ? (
                                        <Image
                                            source={{ uri: article.coverImage }}
                                            style={styles.thumbnailImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={styles.thumbnailPlaceholder} />
                                    )}
                                </View>

                                {/* Info */}
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemTitle} numberOfLines={1}>
                                        {article.title}
                                    </Text>
                                    <View style={styles.itemTags}>
                                        {article.tags.slice(0, 3).map((tag, idx) => (
                                            <Text key={idx} style={styles.itemTag}>
                                                {tag.name}
                                                {idx < Math.min(2, article.tags.length - 1) && ' • '}
                                            </Text>
                                        ))}
                                    </View>
                                    {article.platforms.length > 0 && (
                                        <Text style={styles.itemPlatform} numberOfLines={1}>
                                            {article.platforms.map((p) => p.name).join(' • ')}
                                        </Text>
                                    )}
                                </View>

                                {/* Price */}
                                <View style={styles.priceContainer}>
                                    <Text style={styles.price}>Free</Text>
                                </View>
                            </TouchableOpacity>
                        </Link>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No games found matching "{searchQuery}"</Text>
                    </View>
                )}

                {/* Pagination Footer */}
                {(filteredArticles.length > ITEMS_PER_PAGE || (hasMore && !searchQuery)) && (
                    <View style={styles.paginationFooter}>
                        <View style={styles.pageInfo}>
                            <Text style={styles.pageText}>
                                Page {currentPage} {hasMore && !searchQuery ? '...' : `of ${totalPages}`}
                            </Text>
                        </View>
                        <View style={styles.paginationButtons}>
                            <TouchableOpacity
                                disabled={currentPage === 1 || loadingMore}
                                onPress={goToPrevious}
                                style={[styles.pageButton, (currentPage === 1 || loadingMore) && styles.pageButtonDisabled]}
                            >
                                <Text style={[styles.pageButtonText, (currentPage === 1 || loadingMore) && styles.pageButtonTextDisabled]}>
                                    Prev
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                disabled={(currentPage === totalPages && !hasMore) || loadingMore}
                                onPress={goToNext}
                                style={[styles.pageButton, (currentPage === totalPages && !hasMore) && styles.pageButtonDisabled]}
                            >
                                <Text style={[styles.pageButtonText, (currentPage === totalPages && !hasMore) && styles.pageButtonTextDisabled]}>
                                    {loadingMore ? 'Loading...' : 'Next'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 32,
        paddingHorizontal: 16, // Ensure it doesn't touch edges
        // Optional: Constrain width on very wide screens
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
        marginBottom: 16,
    },
    tabs: {
        flexDirection: 'row',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4, // Reduced slightly to better fit TextInput
        borderRadius: 4,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        marginRight: 8,
        minWidth: 200, // Ensure enough space for typing
    },
    searchIcon: {
        fontSize: 12,
        marginRight: 6,
        color: Colors.dark.textSecondary,
    },
    searchInput: {
        color: Colors.dark.text,
        fontSize: 12,
        padding: 0, // Remove default padding
        flex: 1,
        // @ts-ignore - Web specific
        outlineStyle: 'none',
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
    },
    tab: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 8,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: Colors.dark.accent,
    },
    tabText: {
        color: Colors.dark.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    tabTextActive: {
        color: Colors.dark.text,
    },
    list: {
        backgroundColor: Colors.dark.surface,
        borderRadius: 4,
        padding: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1a2332',
    },
    thumbnail: {
        width: 80,
        height: 60,
        marginRight: 12,
        borderRadius: 3,
        overflow: 'hidden',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    thumbnailPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#2a475e',
    },
    itemInfo: {
        flex: 1,
        marginRight: 12,
    },
    itemTitle: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    itemTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    itemTag: {
        color: Colors.dark.textSecondary,
        fontSize: 11,
    },
    itemPlatform: {
        color: Colors.dark.textSecondary,
        fontSize: 11,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    price: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    paginationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        paddingHorizontal: 4,
        borderTopWidth: 1,
        borderTopColor: '#1a2332',
    },
    pageInfo: {
        flexDirection: 'row',
    },
    pageText: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
    paginationButtons: {
        flexDirection: 'row',
    },
    pageButton: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        marginLeft: 8,
        borderRadius: 3,
        backgroundColor: 'rgba(102, 192, 244, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(102, 192, 244, 0.2)',
    },
    pageButtonDisabled: {
        backgroundColor: 'transparent',
        borderColor: Colors.dark.border,
        opacity: 0.5,
    },
    pageButtonText: {
        color: Colors.dark.accent,
        fontSize: 12,
        fontWeight: '500',
    },
    pageButtonTextDisabled: {
        color: Colors.dark.textSecondary,
    },
});
