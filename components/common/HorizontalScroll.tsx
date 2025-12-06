import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Link } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Article } from '@/types/graphql';

interface HorizontalScrollProps {
    title: string;
    articles: Article[];
}

export default function HorizontalScroll({ title, articles }: HorizontalScrollProps) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity>
                    <Text style={styles.browseAll}>BROWSE ALL ›</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {articles.map((article) => (
                    <Link key={article.id} href={`/${article.slug}`} asChild>
                        <TouchableOpacity style={styles.card}>
                            {article.coverImage ? (
                                <Image
                                    source={{ uri: article.coverImage }}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={styles.imagePlaceholder} />
                            )}
                            <View style={styles.info}>
                                <Text style={styles.gameTitle} numberOfLines={1}>
                                    {article.title}
                                </Text>
                                {article.platforms.length > 0 && (
                                    <Text style={styles.platform} numberOfLines={1}>
                                        {article.platforms.map((p) => p.name).join(', ')}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    </Link>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
        paddingHorizontal: 16,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    browseAll: {
        color: Colors.dark.accent,
        fontSize: 12,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingRight: 16,
    },
    card: {
        width: 280, // Increased from 220 for PC
        marginRight: 16,
        backgroundColor: Colors.dark.surface,
        borderRadius: 4,
        overflow: 'hidden',
        // Add shadow/elevation

        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
            web: {
                boxShadow: '0px 2px 3.84px rgba(0,0,0,0.25)',
            }
        }),
    },
    image: {
        width: '100%',
        height: 160, // Increased height for better aspect ratio
    },
    imagePlaceholder: {
        width: '100%',
        height: 160,
        backgroundColor: '#2a475e',
    },
    info: {
        padding: 12, // Increased padding
    },
    gameTitle: {
        color: Colors.dark.text,
        fontSize: 15, // Slightly larger title
        fontWeight: 'bold', // Bold for emphasis
        marginBottom: 6,
    },
    platform: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
});
