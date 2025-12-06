import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';

// Mock data for "What's New" shelf since we don't have a real API for this yet
const MOCK_NEWS = [
    {
        id: '1',
        game: 'Starward',
        title: 'Starward Character Balance Adjustment Announcement (December 4th)',
        date: 'December 04',
        type: 'BALANCE SETTING',
        image: 'https://placehold.co/300x160/2a475e/ffffff?text=Starward',
    },
    {
        id: '2',
        game: 'Star Wings',
        title: 'Star Wings Character Balance Adjustment Announcement (November 13th)',
        date: 'November 13',
        type: 'BALANCE SETTING',
        image: 'https://placehold.co/300x160/3d2a5e/ffffff?text=Star+Wings',
    },
    {
        id: '3',
        game: 'VRChat',
        title: 'Steam Audio & Release 2025.4.2 is now Live!',
        date: 'This week',
        type: 'New Release!',
        image: 'https://placehold.co/300x160/1a1a2e/ffffff?text=VRChat',
    },
    {
        id: '4',
        game: 'Umamusume: Pretty Derby',
        title: 'New Story Event—Halloween Makeover!',
        date: 'Nov 25, 5:00 AM - Dec 7, 4:59 AM',
        type: 'EVENT',
        image: 'https://placehold.co/300x160/5e2a2a/ffffff?text=Umamusume',
    },
];

export default function LibraryUpdateSection() {
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
                {MOCK_NEWS.map((item) => (
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
