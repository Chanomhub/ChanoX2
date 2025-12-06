import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Stack, Link } from 'expo-router';
import { Colors } from '../src/constants/Colors';
import { useDownloads } from '../src/contexts/DownloadContext';
import LibrarySidebar from '../src/components/LibrarySidebar';
import LibraryUpdateSection from '../src/components/LibraryUpdateSection';
import HorizontalScroll from '../src/components/HorizontalScroll';
import { Article } from '../src/types/graphql';

export default function Library() {
    const { downloads, openFile, showInFolder } = useDownloads();
    const [selectedGameId, setSelectedGameId] = useState<number | undefined>();
    const { width } = useWindowDimensions();

    // Sort downloads for "Received" shelf (mock logic for now, using index)
    const recentGames = [...downloads].reverse().slice(0, 10);

    // Convert downloads to Article type shape for HorizontalScroll compatibility
    // In a real app we'd want to store Article data in installs or fetch it
    const downloadToArticle = (d: typeof downloads[0]): Article => ({
        id: d.id,
        title: d.articleTitle || d.filename,
        slug: '', // Not linkable to store page easily without slug persistence
        description: d.filename,
        coverImage: null, // We need to persist coverImage in DownloadItem!
        mainImage: null,
        backgroundImage: null,
        ver: null,
        sequentialCode: null,
        favoritesCount: 0,
        createdAt: (d.endTime || d.startTime).toISOString(),
        categories: [],
        platforms: [],
        tags: [],
        engine: null
    });

    const recentArticles = recentGames.map(downloadToArticle);

    const handleSelectGame = (id: number) => {
        setSelectedGameId(id);
        // Scroll to game or show details?
        // For now just highlight
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'LIBRARY',
                    headerShown: false, // We might want to hide the default header to look more like the app shell
                }}
            />

            {/* Sidebar */}
            <LibrarySidebar
                downloads={downloads}
                onSelectGame={handleSelectGame}
                selectedGameId={selectedGameId}
            />

            {/* Main Content */}
            <View style={styles.mainContent}>
                {/* Top Bar for Main Content (optional, if we want breadcrumbs or filters) */}
                {/* <View style={styles.mainHeader}>
                     <Text style={styles.headerTitle}>HOME</Text>
                 </View> */}

                <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>

                    {/* What's New Section */}
                    <LibraryUpdateSection />

                    {/* Recent Games Shelf */}
                    {recentArticles.length > 0 && (
                        <View style={styles.shelfContainer}>
                            <View style={styles.shelfHeader}>
                                <Text style={styles.shelfTitle}>Recent Games</Text>
                                <Text style={styles.shelfDate}>November</Text>
                            </View>
                            <HorizontalScroll
                                title=""
                                articles={recentArticles}
                            />
                        </View>
                    )}

                    {/* All Games Grid (if needed, or just more shelves) */}
                    <View style={styles.shelfContainer}>
                        <View style={styles.shelfHeader}>
                            <Text style={styles.shelfTitle}>All Games</Text>
                            <Text style={styles.shelfCount}>({downloads.length})</Text>
                        </View>

                        <View style={styles.grid}>
                            {downloads.map(d => (
                                <TouchableOpacity
                                    key={d.id}
                                    style={styles.gridItem}
                                    onPress={() => openFile(d.id)}
                                >
                                    <View style={styles.gridImagePlaceholder}>
                                        {/* We really need to save images to downloads */}
                                        <Text style={styles.gridIcon}>🎮</Text>
                                    </View>
                                    <Text style={styles.gridTitle} numberOfLines={1}>
                                        {d.articleTitle || d.filename}
                                    </Text>
                                    <View style={styles.playOverlay}>
                                        <Text style={styles.playButton}>▶</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {/* Empty State / Add Shelf */}
                            <TouchableOpacity style={styles.addShelfButton}>
                                <Text style={styles.addShelfText}>+ Add shelf</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row', // Horizontal layout
        backgroundColor: '#1b2838', // Main background
    },
    mainContent: {
        flex: 1,
        backgroundColor: '#1b2838',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 24,
        paddingBottom: 48,
    },
    shelfContainer: {
        marginBottom: 32,
        paddingHorizontal: 24,
    },
    shelfHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 12,
    },
    shelfTitle: {
        color: '#dcdedf',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 8,
    },
    shelfDate: {
        color: '#6e7681',
        fontSize: 12,
    },
    shelfCount: {
        color: '#6e7681',
        fontSize: 12,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gridItem: {
        width: 160,
        marginRight: 16,
        marginBottom: 24,
    },
    gridImagePlaceholder: {
        height: 220, // Portait aspect ratio
        backgroundColor: '#2a475e',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
        marginBottom: 8,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    gridIcon: {
        fontSize: 48,
    },
    gridTitle: {
        color: '#dcdedf',
        fontSize: 13,
        fontWeight: '500',
    },
    playOverlay: {
        position: 'absolute',
        bottom: 30, // Position over image
        right: 8,
        backgroundColor: Colors.dark.accent,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0, // Hidden by default, would need hover state logic
    },
    playButton: {
        color: '#fff',
        fontSize: 12,
    },
    addShelfButton: {
        width: 160,
        height: 220,
        borderWidth: 1,
        borderColor: '#3d4450',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
    },
    addShelfText: {
        color: '#6e7681',
        fontSize: 13,
    }
});
