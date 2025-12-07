import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Download } from '@/contexts/DownloadContext';
import { Colors } from '@/constants/Colors';
import GameLaunchDialog from './GameLaunchDialog';

interface LibraryGameDetailProps {
    download: Download;
    onPlay: (id: number) => void;
}

export default function LibraryGameDetail({ download, onPlay }: LibraryGameDetailProps) {
    // Mock data for UI elements not present in Download model
    const timePlayed = "12.5 hrs"; // Mock
    const lastPlayed = "Today"; // Mock
    const achievementProgress = 11; // Mock 11/25

    const [launchDialogVisible, setLaunchDialogVisible] = useState(false);
    const [scanResults, setScanResults] = useState<any[]>([]);
    const [savedConfig, setSavedConfig] = useState<any>(null);
    const [gameTitle, setGameTitle] = useState(download.articleTitle || download.filename);

    useEffect(() => {
        loadConfig();
    }, [download.id]);

    const loadConfig = async () => {
        try {
            const config = await window.electronAPI.getGameConfig(download.id);
            setSavedConfig(config);
        } catch (e) {
            console.error('Failed to load game config', e);
        }
    };

    const handlePlayPress = async () => {
        // Try to load config again just in case
        const config = await window.electronAPI.getGameConfig(download.id);

        if (config && config.executablePath) {
            console.log('Launching with saved config:', config);
            const result = await window.electronAPI.launchGame({
                executablePath: config.executablePath,
                useWine: config.useWine
            });
            if (!result.success) {
                Alert.alert('Launch Failed', result.error || 'Unknown error');
            }
        } else {
            // Scan for executables
            handleOpenLaunchOptions(true); // true = auto play if single result? No, let's open dialog for safety first time.
        }
    };

    const handleOpenLaunchOptions = async (autoLaunchIfSingle = false) => {
        const pathToCheck = download.extractedPath || download.savePath;
        if (!pathToCheck) {
            Alert.alert('Error', 'Game path not found. Is it installed?');
            return;
        }

        // if pathToCheck is a file (e.g. single exe), use parent dir? 
        // Our scan logic expects a directory usually, but might handle file if we coded it robustly.
        // Let's assume extractedPath is a directory for unpacked games.
        // If it was a single file download (setup.exe), maybe we shouldn't scan? 
        // But the requirements say "unpacked games".

        // If it's a file, we might need to get dirname.
        // For now pass it as is.
        const results = await window.electronAPI.scanGameExecutables(pathToCheck);
        setScanResults(results);

        if (results.length === 0) {
            Alert.alert('No Executables Found', 'Could not find any executable files in the game directory.');
            return;
        }

        /* 
        // Logic for auto-selecting if only 1 result:
        if (autoLaunchIfSingle && results.length === 1) {
             const type = results[0].type;
             const useWine = type === 'windows-exe' && Platform.OS !== 'windows'; // Simple heuristic
             const autoConfig = { executablePath: results[0].path, useWine };
             await window.electronAPI.saveGameConfig({ gameId: download.id, config: autoConfig });
             launchGame(autoConfig);
             return;
        }
        */

        setLaunchDialogVisible(true);
    };

    const handleSaveAndPlay = async (config: any) => {
        setLaunchDialogVisible(false);
        await window.electronAPI.saveGameConfig({ gameId: download.id, config });
        setSavedConfig(config);

        const result = await window.electronAPI.launchGame(config);
        if (!result.success) {
            Alert.alert('Launch Failed', result.error || 'Unknown error');
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    {/* Background Image */}
                    {download.coverImage ? (
                        <Image
                            source={{ uri: download.coverImage }}
                            style={styles.heroImage}
                            resizeMode="cover"
                            blurRadius={5} // Slight blur for background effect? Or maybe clean. Steam is clean usually.
                        />
                    ) : (
                        <View style={[styles.heroImage, { backgroundColor: '#1b2838' }]} />
                    )}

                    {/* Gradient Overlay */}
                    <LinearGradient
                        colors={['rgba(27, 40, 56, 0.2)', 'rgba(27, 40, 56, 1)']}
                        style={styles.heroOverlay}
                    />

                    {/* Content Overlay */}
                    <View style={styles.heroContent}>
                        {/* Logo/Title Area */}
                        <View style={styles.logoContainer}>
                            {/* Ideally we'd have a separate logo image. Using text for now if no logo. */}
                            <Text style={styles.gameLogoText}>{download.articleTitle || download.filename}</Text>
                        </View>
                    </View>
                </View>

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={handlePlayPress}
                    >
                        <Text style={styles.playButtonText}>PLAY</Text>
                    </TouchableOpacity>

                    <View style={styles.playStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>LAST PLAYED</Text>
                            <Text style={styles.statValue}>{lastPlayed}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>PLAY TIME</Text>
                            <Text style={styles.statValue}>{timePlayed}</Text>
                        </View>
                    </View>

                    <View style={styles.actionIcons}>
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={() => handleOpenLaunchOptions()}
                        >
                            <Ionicons name="settings-sharp" size={20} color="#b8b6b4" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}><Ionicons name="information-circle-outline" size={20} color="#b8b6b4" /></TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}><Ionicons name="star-outline" size={20} color="#b8b6b4" /></TouchableOpacity>
                    </View>
                </View>

                {/* Navbar */}
                <View style={styles.navBar}>
                    <TouchableOpacity style={styles.navItemActive}><Text style={styles.navTextActive}>Store Page</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}><Text style={styles.navText}>DLC</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}><Text style={styles.navText}>Community Hub</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}><Text style={styles.navText}>Points Shop</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}><Text style={styles.navText}>Discussions</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}><Text style={styles.navText}>Guides</Text></TouchableOpacity>
                </View>

                {/* Main Content Layout */}
                <View style={styles.contentLayout}>
                    {/* Left Column (News/Activity) */}
                    <View style={styles.leftColumn}>

                        {/* Featured News Item */}
                        <View style={styles.newsCard}>
                            <View style={styles.newsHeader}>
                                <Text style={styles.newsLabel}>UPDATE NOTES</Text>
                                <Text style={styles.newsDate}>NOVEMBER 26</Text>
                            </View>
                            <Text style={styles.newsTitle}>{download.articleTitle || download.filename} Update Notes</Text>
                            <Text style={styles.newsPreview}>
                                Recent updates have improved stability and added new content to the game. Check out the latest patch notes for details on bug fixes and performance enhancements.
                            </Text>
                            <TouchableOpacity style={styles.newsLink}>
                                <Text style={styles.newsLinkText}>READ MORE</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Activity Feed Placeholder */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>ACTIVITY</Text>
                        </View>
                        <View style={styles.activityCard}>
                            <View style={styles.activityInput}>
                                <Image style={styles.avatar} source={{ uri: 'https://via.placeholder.com/32' }} />
                                <Text style={styles.activityPlaceholderText}>Say something about this game to your friends...</Text>
                            </View>
                        </View>

                    </View>

                    {/* Right Column (Info) */}
                    <View style={styles.rightColumn}>
                        {/* Achievements */}
                        <View style={styles.sideCard}>
                            <Text style={styles.sideTitle}>ACHIEVEMENTS</Text>
                            <View style={styles.achievementProgress}>
                                <Text style={styles.progressText}>You've unlocked {achievementProgress}/25 (44%)</Text>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: '44%' }]} />
                                </View>
                            </View>
                            <View style={styles.achievementGrid}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <View key={i} style={styles.achievementIcon} />
                                ))}
                            </View>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>View My Achievements</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Friends */}
                        <View style={styles.sideCard}>
                            <Text style={styles.sideTitle}>FRIENDS WHO PLAY</Text>
                            <View style={styles.friendList}>
                                {[1, 2, 3].map(i => (
                                    <View key={i} style={styles.friendIcon} />
                                ))}
                            </View>
                        </View>

                        {/* DLC */}
                        <View style={styles.sideCard}>
                            <Text style={styles.sideTitle}>DLC</Text>
                            <Text style={styles.infoText}>You have 2 DLCs installed.</Text>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Manage DLC</Text>
                            </TouchableOpacity>
                        </View>

                        {/* General Mods */}
                        <View style={styles.sideCard}>
                            <Text style={styles.sideTitle}>GENERAL MODS</Text>
                            <Text style={styles.infoText}>Manage your installed mods.</Text>
                            <TouchableOpacity style={styles.modButton}>
                                <Ionicons name="hardware-chip-outline" size={14} color="#dcdedf" />
                                <Text style={styles.modButtonText}>Workshop & Mods</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Language */}
                        <View style={styles.sideCard}>
                            <Text style={styles.sideTitle}>LANGUAGE</Text>
                            <View style={styles.languageSelector}>
                                <Text style={styles.languageText}>English</Text>
                                <Ionicons name="caret-down" size={12} color="#8b929a" />
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Launch Config Dialog */}
            <GameLaunchDialog
                visible={launchDialogVisible}
                onClose={() => setLaunchDialogVisible(false)}
                onSaveAndPlay={handleSaveAndPlay}
                initialConfig={savedConfig}
                scanResults={scanResults}
                gameTitle={gameTitle}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1b2838',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroSection: {
        height: 300,
        width: '100%',
        position: 'relative',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        opacity: 0.8,
    },
    heroOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    heroContent: {
        position: 'absolute',
        bottom: 20,
        left: 20,
    },
    logoContainer: {
        marginBottom: 10,
    },
    gameLogoText: {
        color: '#fff',
        fontSize: 36,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1b2838', // Seamless transition from gradient
        paddingHorizontal: 20,
        paddingBottom: 15,
    },
    playButton: {
        backgroundColor: '#4cff00', // Xbox-ish neon green, or use Steam's #5c7e10 green
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 2,
        marginRight: 20,
    },
    playButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    playStats: {
        flexDirection: 'row',
        marginRight: 'auto',
        gap: 20,
    },
    statItem: {

    },
    statLabel: {
        color: '#6e7681',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statValue: {
        color: '#dcdedf',
        fontSize: 11,
    },
    actionIcons: {
        flexDirection: 'row',
        gap: 15,
    },
    iconButton: {
        padding: 5,
        backgroundColor: '#2a3f55',
        borderRadius: 2,
    },
    navBar: {
        flexDirection: 'row',
        backgroundColor: '#181d26',
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 25,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2e36',
    },
    navItem: {

    },
    navItemActive: {
        borderBottomWidth: 2,
        borderBottomColor: Colors.dark.accent,
        paddingBottom: 2,
        marginBottom: -2, // pull down to overlap border
    },
    navText: {
        color: '#8b929a',
        fontSize: 13,
        fontWeight: '500',
    },
    navTextActive: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    contentLayout: {
        flexDirection: 'row',
        padding: 20,
        gap: 30,
    },
    leftColumn: {
        flex: 2,
    },
    rightColumn: {
        flex: 1,
        maxWidth: 350,
    },
    sectionHeader: {
        marginBottom: 10,
        marginTop: 20,
    },
    sectionTitle: {
        color: '#dcdedf',
        fontSize: 14,
        fontWeight: 'bold',
    },
    newsCard: {
        marginBottom: 20,
    },
    newsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    newsLabel: {
        color: Colors.dark.accent,
        fontSize: 11,
        fontWeight: 'bold',
        marginRight: 10,
    },
    newsDate: {
        color: '#6e7681',
        fontSize: 11,
    },
    newsTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 8,
    },
    newsPreview: {
        color: '#acb2b8',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 10,
    },
    newsLink: {

    },
    newsLinkText: {
        color: '#fff',
        fontSize: 12,
        backgroundColor: '#2a3f55',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 2,
    },
    activityCard: {
        backgroundColor: '#1a1d23',
        padding: 15,
        borderRadius: 2,
    },
    activityInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    avatar: {
        width: 32,
        height: 32,
        backgroundColor: '#57cbde',
        borderRadius: 2,
    },
    activityPlaceholderText: {
        color: '#6e7681',
        fontSize: 13,
        fontStyle: 'italic',
    },
    sideCard: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 15,
        borderRadius: 2,
        marginBottom: 20,
    },
    sideTitle: {
        color: '#8b929a',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    achievementProgress: {
        marginBottom: 10,
    },
    progressText: {
        color: '#dcdedf',
        fontSize: 12,
        marginBottom: 5,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#3d4450',
        borderRadius: 3,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#1a9fff',
        borderRadius: 3,
    },
    achievementGrid: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 10,
    },
    achievementIcon: {
        width: 36,
        height: 36,
        backgroundColor: '#2a2e36',
    },
    friendList: {
        flexDirection: 'row',
        gap: 8,
    },
    friendIcon: {
        width: 32,
        height: 32,
        backgroundColor: '#3d4450',
        borderRadius: 2,
    },
    infoText: {
        color: '#acb2b8',
        fontSize: 12,
        marginBottom: 5,
    },
    linkText: {
        color: '#fff',
        fontSize: 11,
        textDecorationLine: 'underline',
    },
    modButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a3f55',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 2,
        marginTop: 5,
        gap: 8,
    },
    modButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    languageSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1a1d23',
        padding: 8,
        borderRadius: 2,
        marginTop: 5,
    },
    languageText: {
        color: '#dcdedf',
        fontSize: 12,
    },
});
