import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Stack, Link } from 'expo-router';
import { Colors } from '../src/constants/Colors';
import { useEffect, useState } from 'react';
import { client } from '../src/api/client';
import { GET_ARTICLES } from '../src/api/queries';
import { Article, ArticlesResponse } from '../src/types/graphql';

export default function Library() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const data = await client.request<ArticlesResponse>(GET_ARTICLES, {
                limit: 50,
                offset: 0,
            });
            setArticles(data.articles);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching articles:', error);
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Article }) => (
        <Link href={`/${item.slug}`} asChild>
            <TouchableOpacity style={styles.itemContainer}>
                {item.coverImage ? (
                    <Image
                        source={{ uri: item.coverImage }}
                        style={styles.itemImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.itemImagePlaceholder} />
                )}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.tagsContainer}>
                        {item.tags.slice(0, 3).map((tag, index) => (
                            <Text key={index} style={styles.tag}>{tag.name}</Text>
                        ))}
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'LIBRARY',
                    headerStyle: { backgroundColor: Colors.dark.surface },
                    headerTintColor: Colors.dark.text,
                }}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.dark.accent} />
                </View>
            ) : (
                <FlatList
                    data={articles}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.dark.surface,
        marginBottom: 12,
        borderRadius: 4,
        overflow: 'hidden',
        height: 80,
    },
    itemImage: {
        width: 120,
        height: '100%',
    },
    itemImagePlaceholder: {
        width: 120,
        height: '100%',
        backgroundColor: '#2a475e',
    },
    itemInfo: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
    },
    itemTitle: {
        color: Colors.dark.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    itemDesc: {
        color: Colors.dark.textSecondary,
        fontSize: 13,
        marginBottom: 6,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        color: Colors.dark.accent,
        fontSize: 11,
        marginRight: 8,
        backgroundColor: Colors.dark.border,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
        marginBottom: 2,
    },
});
