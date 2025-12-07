import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Download } from '@/contexts/DownloadContext';
import { Colors } from '@/constants/Colors';
import GameLaunchDialog from './GameLaunchDialog';

// Hooks
import { useGameLauncher } from '@/hooks/useGameLauncher';
import { useGameScanner } from '@/hooks/useGameScanner';

// UI Components
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface LibraryGameDetailProps {
    download: Download;
    onPlay: (id: number) => void;
}

export default function LibraryGameDetail({ download }: LibraryGameDetailProps) {
    // Mock data
    const timePlayed = "12.5 hrs";
    const lastPlayed = "Today";
    const achievementProgress = 11;

    const [launchDialogVisible, setLaunchDialogVisible] = useState(false);

    // Custom Hooks
    const { config, launchGame, saveConfig } = useGameLauncher(download.id);
    const { scanDirectory, results: scanResults } = useGameScanner();

    const handlePlayPress = async () => {
        if (config?.executablePath) {
            const result = await launchGame();
            if (!result.success) {
                Alert.alert('Launch Failed', result.error || 'Unknown error');
            }
        } else {
            handleOpenLaunchOptions();
        }
    };

    const handleOpenLaunchOptions = async () => {
        const pathToCheck = download.extractedPath || download.savePath;
        if (!pathToCheck) {
            Alert.alert('Error', 'Game path not found. Is it installed?');
            return;
        }

        const results = await scanDirectory(pathToCheck);

        if (results.length === 0) {
            Alert.alert('No Executables Found', 'Could not find any executable files in the game directory.');
            return;
        }

        setLaunchDialogVisible(true);
    };

    const handleSaveAndPlay = async (newConfig: any) => {
        setLaunchDialogVisible(false);
        const success = await saveConfig(newConfig);
        if (success) {
            const result = await launchGame(newConfig);
            if (!result.success) {
                Alert.alert('Launch Failed', result.error || 'Unknown error');
            }
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    {download.coverImage ? (
                        <Image source={{ uri: download.coverImage }} style={styles.heroImage} resizeMode="cover" blurRadius={5} />
                    ) : (
                        <View style={[styles.heroImage, { backgroundColor: '#1b2838' }]} />
                    )}
                    <LinearGradient colors={['rgba(27, 40, 56, 0.2)', 'rgba(27, 40, 56, 1)']} style={styles.heroOverlay} />
                    <View style={styles.heroContent}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.gameLogoText}>{download.articleTitle || download.filename}</Text>
                        </View>
                    </View>
                </View>

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <Button
                        title="PLAY"
                        onPress={handlePlayPress}
                        style={styles.playButton}
                        textStyle={styles.playButtonText}
                    />

                    <View style={styles.playStats}>
                        <View>
                            <Text style={styles.statLabel}>LAST PLAYED</Text>
                            <Text style={styles.statValue}>{lastPlayed}</Text>
                        </View>
                        <View>
                            <Text style={styles.statLabel}>PLAY TIME</Text>
                            <Text style={styles.statValue}>{timePlayed}</Text>
                        </View>
                    </View>

                    <View style={styles.actionIcons}>
                        <Button variant="secondary" icon="settings-sharp" onPress={() => handleOpenLaunchOptions()} style={styles.iconButton} />
                        <Button variant="secondary" icon="information-circle-outline" onPress={() => { }} style={styles.iconButton} />
                        <Button variant="secondary" icon="star-outline" onPress={() => { }} style={styles.iconButton} />
                    </View>
                </View>

                {/* Navbar */}
                <View style={styles.navBar}>
                    <TouchableOpacity style={styles.navItemActive}><Text style={styles.navTextActive}>Store Page</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}><Text style={styles.navText}>DLC</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}><Text style={styles.navText}>Community Hub</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}><Text style={styles.navText}>Discussion</Text></TouchableOpacity>
                </View>

                {/* Main Content */}
                <View style={styles.contentLayout}>
                    {/* Left Column */}
                    <View style={styles.leftColumn}>
                        <View style={styles.newsCard}>
                            <View style={styles.newsHeader}>
                                <Text style={styles.newsLabel}>UPDATE NOTES</Text>
                                <Text style={styles.newsDate}>NOVEMBER 26</Text>
                            </View>
                            <Text style={styles.newsTitle}>{download.articleTitle || download.filename} Update Notes</Text>
                            <Text style={styles.newsPreview}>
                                Recent updates have improved stability and added new content.
                            </Text>
                            <Button title="READ MORE" variant="secondary" onPress={() => { }} style={{ alignSelf: 'flex-start', paddingVertical: 6, height: 32 }} textStyle={{ fontSize: 12 }} />
                        </View>
                    </View>

                    {/* Right Column */}
                    <View style={styles.rightColumn}>

                        {/* Achievements */}
                        <View style={styles.sideCard}>
                            <Text style={styles.sideTitle}>ACHIEVEMENTS</Text>
                            <View style={styles.achievementProgress}>
                                <Text style={styles.progressText}>{achievementProgress}/25 (44%)</Text>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: '44%' }]} />
                                </View>
                            </View>
                        </View>

                        {/* Game Info */}
                        {(config?.engine || config?.gameVersion || download.engine || download.gameVersion) && (
                            <View style={styles.sideCard}>
                                <Text style={styles.sideTitle}>GAME INFO</Text>
                                {(config?.engine || download.engine) && (
                                    <Badge label="ENGINE" value={config?.engine || download.engine} />
                                )}
                                {(config?.gameVersion || download.gameVersion) && (
                                    <Badge label="VERSION" value={config?.gameVersion || download.gameVersion} />
                                )}
                            </View>
                        )}

                    </View>
                </View>
            </ScrollView>

            <GameLaunchDialog
                visible={launchDialogVisible}
                onClose={() => setLaunchDialogVisible(false)}
                onSaveAndPlay={handleSaveAndPlay}
                initialConfig={config}
                scanResults={scanResults}
                gameTitle={download.articleTitle || download.filename}
                defaultEngine={download.engine}
                defaultVersion={download.gameVersion}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1b2838' },
    scrollContainer: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    heroSection: { height: 300, width: '100%', position: 'relative' },
    heroImage: { width: '100%', height: '100%', opacity: 0.8 },
    heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
    heroContent: { position: 'absolute', bottom: 20, left: 20 },
    logoContainer: { marginBottom: 10 },
    gameLogoText: { color: '#fff', fontSize: 36, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
    actionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1b2838', paddingHorizontal: 20, paddingBottom: 15 },
    playButton: { paddingHorizontal: 30, paddingVertical: 12, marginRight: 20 },
    playButtonText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
    playStats: { flexDirection: 'row', marginRight: 'auto', gap: 20 },
    statLabel: { color: '#6e7681', fontSize: 10, fontWeight: 'bold', marginBottom: 2 },
    statValue: { color: '#dcdedf', fontSize: 11 },
    actionIcons: { flexDirection: 'row', gap: 10 },
    iconButton: { padding: 8, minWidth: 0, paddingHorizontal: 8 },
    navBar: { flexDirection: 'row', backgroundColor: '#181d26', paddingHorizontal: 20, paddingVertical: 10, gap: 25, borderBottomWidth: 1, borderBottomColor: '#2a2e36' },
    navItem: {},
    navItemActive: { borderBottomWidth: 2, borderBottomColor: Colors.dark.accent, paddingBottom: 2, marginBottom: -2 },
    navText: { color: '#8b929a', fontSize: 13, fontWeight: '500' },
    navTextActive: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    contentLayout: { flexDirection: 'row', padding: 20, gap: 30 },
    leftColumn: { flex: 2 },
    rightColumn: { flex: 1, maxWidth: 350 },
    newsCard: { marginBottom: 20 },
    newsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    newsLabel: { color: Colors.dark.accent, fontSize: 11, fontWeight: 'bold', marginRight: 10 },
    newsDate: { color: '#6e7681', fontSize: 11 },
    newsTitle: { color: '#fff', fontSize: 18, fontWeight: '500', marginBottom: 8 },
    newsPreview: { color: '#acb2b8', fontSize: 13, lineHeight: 20, marginBottom: 10 },
    sideCard: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 15, borderRadius: 2, marginBottom: 20 },
    sideTitle: { color: '#8b929a', fontSize: 12, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
    achievementProgress: { marginBottom: 10 },
    progressText: { color: '#dcdedf', fontSize: 12, marginBottom: 5 },
    progressBarBg: { height: 6, backgroundColor: '#3d4450', borderRadius: 3 },
    progressBarFill: { height: '100%', backgroundColor: '#1a9fff', borderRadius: 3 },
});
