import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { Stack, Link } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Colors } from '@/constants/Colors';
import { client } from '@/libs/api/client';
import { GET_ARTICLES } from '@/libs/api/queries';
import { Article, ArticlesResponse } from '@/types/graphql';

// Debounce hook
function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function SearchScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    useEffect(() => {
        searchArticles();
    }, [debouncedSearchQuery, selectedCategory, selectedPlatform, selectedTag]);

    const searchArticles = async () => {
        setLoading(true);
        try {
            const data = await client.request<ArticlesResponse>(GET_ARTICLES, {
                limit: 50,
                offset: 0,
                filter: {
                    query: debouncedSearchQuery || undefined,
                    category: selectedCategory || undefined,
                    platform: selectedPlatform || undefined,
                    tag: selectedTag || undefined,
                },
            });
            setArticles(data.articles);
        } catch (error) {
            console.error('Error searching articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setSelectedCategory(null);
        setSelectedPlatform(null);
        setSelectedTag(null);
        setSearchQuery('');
    };

    const renderArticle = ({ item }: { item: Article }) => (
        <Link href={`/${item.slug}`} asChild>
            <TouchableOpacity style={styles.articleCard}>
                {item.coverImage ? (
                    <Image
                        source={{ uri: item.coverImage }}
                        style={styles.articleImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.articleImagePlaceholder} />
                )}
                <View style={styles.articleInfo}>
                    <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.articleDesc} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.tagsContainer}>
                        {item.tags.slice(0, 3).map((tag, index) => (
                            <Text key={index} style={styles.tag}>{tag.name}</Text>
                        ))}
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );

    const hasActiveFilters = selectedCategory || selectedPlatform || selectedTag || searchQuery;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'SEARCH',
                    headerStyle: { backgroundColor: Colors.dark.surface },
                    headerTintColor: Colors.dark.text,
                }}
            />

            {/* Search Input */}
            <View style={styles.searchSection}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search articles..."
                    placeholderTextColor={Colors.dark.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                />
            </View>

            {/* Filter Chips - Placeholder for now */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersContainer}
                contentContainerStyle={styles.filtersContent}
            >
                {hasActiveFilters && (
                    <TouchableOpacity
                        style={[styles.filterChip, styles.clearChip]}
                        onPress={clearFilters}
                    >
                        <Text style={styles.clearChipText}>✕ Clear All</Text>
                    </TouchableOpacity>
                )}
                <Text style={styles.filterNote}>Filter options coming soon...</Text>
            </ScrollView>

            {/* Results */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.dark.accent} />
                </View>
            ) : articles.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        {searchQuery || hasActiveFilters ? 'No articles found' : 'Start typing to search'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={articles}
                    renderItem={renderArticle}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    searchSection: {
        padding: 16,
        backgroundColor: Colors.dark.surface,
    },
    searchInput: {
        backgroundColor: Colors.dark.background,
        color: Colors.dark.text,
        padding: 12,
        borderRadius: 4,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    filtersContainer: {
        backgroundColor: Colors.dark.surface,
        maxHeight: 50,
    },
    filtersContent: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center',
    },
    filterChip: {
        backgroundColor: Colors.dark.background,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    clearChip: {
        backgroundColor: Colors.dark.accent,
        borderColor: Colors.dark.accent,
    },
    clearChipText: {
        color: Colors.dark.background,
        fontSize: 14,
        fontWeight: 'bold',
    },
    filterNote: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.dark.textSecondary,
        fontSize: 16,
    },
    listContent: {
        padding: 8,
    },
    row: {
        justifyContent: 'space-between',
    },
    articleCard: {
        flex: 1,
        backgroundColor: Colors.dark.surface,
        borderRadius: 4,
        overflow: 'hidden',
        margin: 8,
        maxWidth: '48%',
    },
    articleImage: {
        width: '100%',
        height: 150,
    },
    articleImagePlaceholder: {
        width: '100%',
        height: 150,
        backgroundColor: '#2a475e',
    },
    articleInfo: {
        padding: 12,
    },
    articleTitle: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    articleDesc: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        marginBottom: 8,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        color: Colors.dark.accent,
        fontSize: 10,
        backgroundColor: Colors.dark.border,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
        marginRight: 4,
        marginBottom: 4,
    },
});
