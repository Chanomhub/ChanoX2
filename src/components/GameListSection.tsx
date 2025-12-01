import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Article } from '../types/graphql';

interface GameListSectionProps {
    articles: Article[];
}

const tabs = ['New & Trending', 'Top Sellers', 'Popular Upcoming', 'Specials'];

export default function GameListSection({ articles }: GameListSectionProps) {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <View style={styles.container}>
            {/* Tabs */}
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

            {/* List */}
            <View style={styles.list}>
                {articles.slice(0, 10).map((article) => (
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
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 24,
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
        marginBottom: 16,
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
});
