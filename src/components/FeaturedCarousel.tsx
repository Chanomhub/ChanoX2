import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Article } from '../types/graphql';

const { width } = Dimensions.get('window');

interface FeaturedCarouselProps {
    articles: Article[];
}

export default function FeaturedCarousel({ articles }: FeaturedCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (articles.length > 0) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % articles.length);
            }, 5000) as unknown as NodeJS.Timeout; // Auto-play every 5 seconds
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [articles.length]);

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + articles.length) % articles.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % articles.length);
    };

    if (articles.length === 0) return null;

    const currentArticle = articles[currentIndex];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>THE COMMUNITY RECOMMENDS</Text>
            <Text style={styles.subtitle}>THESE GAMES TODAY</Text>

            <View style={styles.carouselContainer}>
                {/* Navigation Arrows */}
                <TouchableOpacity style={styles.arrowLeft} onPress={goToPrevious}>
                    <Text style={styles.arrowText}>‹</Text>
                </TouchableOpacity>

                {/* Main Content */}
                <Link href={`/${currentArticle.slug}`} asChild>
                    <TouchableOpacity style={styles.content}>
                        {/* Image */}
                        <View style={styles.imageContainer}>
                            {currentArticle.coverImage ? (
                                <Image
                                    source={{ uri: currentArticle.coverImage }}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={styles.imagePlaceholder} />
                            )}
                            <View style={styles.gradientOverlay} />
                        </View>

                        {/* Review Section */}
                        <View style={styles.reviewSection}>
                            <Text style={styles.reviewLabel}>Short Esport Review</Text>
                            <Text style={styles.reviewText} numberOfLines={4}>
                                {currentArticle.description || 'No description available'}
                            </Text>
                            <View style={styles.metadata}>
                                <View style={styles.tags}>
                                    {currentArticle.tags.slice(0, 2).map((tag) => (
                                        <View key={tag.id} style={styles.tag}>
                                            <Text style={styles.tagText}>{tag.name}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Link>

                <TouchableOpacity style={styles.arrowRight} onPress={goToNext}>
                    <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Dots Indicator */}
            <View style={styles.dotsContainer}>
                {articles.map((_, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.dot, index === currentIndex && styles.dotActive]}
                        onPress={() => setCurrentIndex(index)}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    title: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 4,
    },
    subtitle: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        marginBottom: 16,
    },
    carouselContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.dark.surface,
        borderRadius: 4,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '60%',
        height: 280,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#2a475e',
    },
    gradientOverlay: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 100,
        backgroundColor: 'transparent',
    },
    reviewSection: {
        flex: 1,
        padding: 16,
        justifyContent: 'space-between',
    },
    reviewLabel: {
        color: Colors.dark.textSecondary,
        fontSize: 11,
        marginBottom: 8,
    },
    reviewText: {
        color: Colors.dark.text,
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    metadata: {
        marginTop: 12,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: Colors.dark.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 3,
        marginRight: 6,
        marginBottom: 4,
    },
    tagText: {
        color: Colors.dark.text,
        fontSize: 11,
    },
    arrowLeft: {
        padding: 12,
        marginRight: 8,
    },
    arrowRight: {
        padding: 12,
        marginLeft: 8,
    },
    arrowText: {
        color: Colors.dark.text,
        fontSize: 32,
        fontWeight: 'bold',
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3a475e',
        marginHorizontal: 4,
    },
    dotActive: {
        backgroundColor: Colors.dark.accent,
    },
});
