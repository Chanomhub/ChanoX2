import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Image, useWindowDimensions } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Download, useDownloads } from '@/contexts/DownloadContext';
import { GlobalChat } from '@/components/features/GlobalChat';
import { Button } from '@/components/ui/Button';

interface LibrarySidebarProps {
    onSelectGame: (id: number) => void;
    selectedGameId?: number;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    isMobile: boolean;
    onCloseMobile: () => void;
    collapsed?: boolean;
}

export default function LibrarySidebar({
    searchQuery,
    onSearchChange,
    selectedGameId,
    onSelectGame,
    isMobile,
    onCloseMobile,
    collapsed = false
}: LibrarySidebarProps) {
    const { downloads } = useDownloads();
    const { width } = useWindowDimensions();
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [filterExpanded, setFilterExpanded] = useState(false);

    // Filter games
    // Filter and sort games
    const filteredGames = downloads
        .filter((d: Download) => {
            if (d.status !== 'completed') return false;
            const name = d.articleTitle || d.filename || '';
            return name.toLowerCase().includes((searchQuery || '').toLowerCase());
        })
        .sort((a: Download, b: Download) => {
            // Sort by favorite first
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            // Then sort alphabetically
            const nameA = a.articleTitle || a.filename || '';
            const nameB = b.articleTitle || b.filename || '';
            return nameA.localeCompare(nameB);
        });

    if (collapsed) {
        return (
            <View style={[styles.container, styles.collapsed]}>
                <TouchableOpacity style={styles.iconButton} onPress={() => onSelectGame(-1)}>
                    <Text style={styles.icon}>🏠</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                    <Text style={styles.icon}>🕓</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <ScrollView showsVerticalScrollIndicator={false}>
                    {filteredGames.map(game => (
                        <TouchableOpacity
                            key={game.id}
                            style={[styles.collapsedItem, selectedGameId === game.id && styles.itemSelected]}
                            onPress={() => onSelectGame(game.id)}
                        // tooltip={game.articleTitle || game.filename}
                        >
                            {/* In a real app we would use game icons here */}
                            <View style={styles.collapsedIconPlaceholder}>
                                {game.coverImage ? (
                                    <Image
                                        source={{ uri: game.coverImage }}
                                        style={styles.collapsedIconImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={styles.collapsedIconText}>
                                        {(game.articleTitle || game.filename).substring(0, 1).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header: Home */}
            <TouchableOpacity style={styles.navItemActive} onPress={() => onSelectGame(-1)}>
                <Text style={styles.navIcon}>🏠</Text>
                <Text style={styles.navText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => setIsChatVisible(true)}>
                <Text style={styles.navIcon}>💬</Text>
                <Text style={styles.navText}>Global Chat</Text>
            </TouchableOpacity>

            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>LIBRARY</Text>
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchBar}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search"
                            placeholderTextColor={Colors.dark.textSecondary}
                            value={searchQuery}
                            onChangeText={onSearchChange}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterButton} onPress={() => setFilterExpanded(!filterExpanded)}>
                        <Text style={styles.filterIcon}>≡</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {filterExpanded && (
                <View style={styles.filterOptions}>
                    <Text style={styles.filterOptionText}>Sort by: Name (A-Z)</Text>
                    {/* Add more sort options here later */}
                </View>
            )}

            <View style={styles.headerRow}>
                <Text style={styles.sectionHeader}>GAMES AND SOFTWARE</Text>
                <Text style={styles.expandIcon}>v</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent}>
                {filteredGames.length === 0 && (
                    <Text style={styles.emptyText}>No games found</Text>
                )}

                {filteredGames.map(game => (
                    <TouchableOpacity
                        key={game.id}
                        style={[styles.gameItem, selectedGameId === game.id && styles.gameItemSelected]}
                        onPress={() => onSelectGame(game.id)}
                    >
                        {/* 
                         <Image 
                            source={require('../../assets/images/react-logo.png')} // Fallback/Placeholder
                            style={styles.gameIcon} 
                            resizeMode="contain"
                        />
                        */}
                        <View style={styles.gameIconPlaceholder}>
                            {game.coverImage ? (
                                <Image
                                    source={{ uri: game.coverImage }}
                                    style={styles.gameIconImage}
                                    resizeMode="cover"
                                />
                            ) : null}
                        </View>
                        <Text style={[styles.gameName, selectedGameId === game.id && styles.gameNameSelected]} numberOfLines={1}>
                            {game.articleTitle || game.filename}
                        </Text>
                        {game.isFavorite && <Text style={{ fontSize: 10, color: '#e6c845', marginLeft: 4 }}>★</Text>}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.addGameButton}>
                    <Text style={styles.addGameIcon}>+</Text>
                    <Text style={styles.addGameText}>Add a Game</Text>
                </TouchableOpacity>
            </View>

            <GlobalChat visible={isChatVisible} onClose={() => setIsChatVisible(false)} />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        width: 280,
        backgroundColor: '#161920', // Sidebar background color
        borderRightWidth: 1,
        borderRightColor: '#1a1d26',
        flexDirection: 'column',
    },
    header: {
        padding: 16,
        gap: 12
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 1
    },
    chatButton: {
        width: 40,
        height: 40,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    navItemActive: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#1f242e',
    },
    navIcon: {
        fontSize: 16,
        marginRight: 12,
        color: '#b8b6b4',
    },
    navText: {
        color: '#b8b6b4',
        fontSize: 14,
        fontWeight: '500',
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1f2126',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#2b2f38',
    },
    searchIcon: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        color: '#dcdedf',
        fontSize: 13,
        padding: 0,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            }
        }) as any
    },
    filterButton: {
        padding: 8,
        backgroundColor: '#1f2126',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#2b2f38',
        alignItems: 'center',
        justifyContent: 'center',
    },

    filterIcon: {
        fontSize: 16,
        color: Colors.dark.textSecondary,
    },
    sectionHeader: {
        color: '#6e7681',
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 16,
        marginTop: 8,
        marginBottom: 4,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingRight: 16,
        alignItems: 'center',
    },
    expandIcon: {
        color: '#6e7681',
        fontSize: 10,
    },
    listContent: {
        paddingVertical: 4,
    },
    gameItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    gameItemSelected: {
        backgroundColor: '#3d4450',
    },
    gameIcon: {
        width: 16,
        height: 16,
        marginRight: 8,
        tintColor: '#6e7681', // Make placeholder icons gray
    },
    gameIconPlaceholder: {
        width: 16,
        height: 16,
        marginRight: 8,
        backgroundColor: '#2a2e36',
    },
    gameName: {
        color: '#969696',
        fontSize: 13,
        flex: 1,
    },
    gameNameSelected: {
        color: '#ffffff',
    },
    emptyText: {
        color: '#6e7681',
        fontSize: 12,
        marginLeft: 16,
        fontStyle: 'italic',
        marginTop: 8,
    },
    footer: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#2b2f38',
        backgroundColor: '#161920',
    },
    addGameButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addGameIcon: {
        fontSize: 16,
        color: '#6e7681',
        marginRight: 8,
    },
    addGameText: {
        color: '#6e7681',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Collapsed styles
    iconButton: {
        padding: 12,
    },
    icon: {
        fontSize: 20,
        color: '#b8b6b4',
    },
    divider: {
        height: 1,
        width: '80%',
        backgroundColor: '#2b2f38',
        marginVertical: 8,
    },
    collapsedItem: {
        marginVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 4,
    },
    itemSelected: {
        backgroundColor: '#3d4450',
    },
    collapsedIconPlaceholder: {
        width: 32,
        height: 32,
        backgroundColor: '#2a2e36',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 2,
    },
    collapsedIconText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    collapsedIconImage: {
        width: '100%',
        height: '100%',
        borderRadius: 2,
    },
    gameIconImage: {
        width: '100%',
        height: '100%',
        borderRadius: 2,
    },
    filterOptions: {
        backgroundColor: '#1f2126',
        padding: 12,
        marginHorizontal: 16,
        borderRadius: 4,
        marginBottom: 8
    },
    filterOptionText: {
        color: '#dcdedf',
        fontSize: 12
    }
});
