import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Linking, ActivityIndicator, Platform } from 'react-native';
import { useFestival } from '@/contexts/FestivalContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStore } from '@/stores/settingsStore';
import Constants from 'expo-constants';
import packageJson from '../../../package.json';
import { Colors } from '@/constants/Colors';

interface GitHubRelease {
    tag_name: string;
    html_url: string;
    body: string;
}

export default function SettingsModal() {
    const { isOpen, closeSettings, activeSection, setActiveSection } = useSettingsStore();
    const { theme } = useFestival();
    const { language, setLanguage } = useLanguage();
    const { user } = useAuth();

    // Updates Logic
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
    const currentVersion = packageJson.version;

    useEffect(() => {
        if (isOpen && activeSection === 'general') {
            checkVersion();
        }
    }, [isOpen, activeSection]);

    const checkVersion = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('https://api.github.com/repos/Chanomhub/ChanoX2/releases/latest');
            if (!response.ok) {
                throw new Error('Failed to fetch release info');
            }
            const data: GitHubRelease = await response.json();
            const version = data.tag_name.replace(/^v/, '');
            setLatestVersion(version);
            setReleaseUrl(data.html_url);
        } catch (err) {
            setError('Could not check for updates');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isUpdateAvailable = latestVersion && latestVersion !== currentVersion;

    const renderSidebarItem = (id: string, label: string, icon: string) => (
        <TouchableOpacity
            style={[
                styles.sidebarItem,
                activeSection === id && { backgroundColor: theme.accent + '20' }
            ]}
            onPress={() => setActiveSection(id)}
        >
            <Text style={[
                styles.sidebarIcon,
                { color: activeSection === id ? theme.accent : theme.textSecondary }
            ]}>{icon}</Text>
            <Text style={[
                styles.sidebarLabel,
                { color: activeSection === id ? theme.text : theme.textSecondary, fontWeight: activeSection === id ? 'bold' : 'normal' }
            ]}>{label}</Text>
        </TouchableOpacity>
    );

    const renderContent = () => {
        switch (activeSection) {
            case 'account':
                return (
                    <View style={styles.contentSection}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={styles.accountHeader}>
                                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.accent }]}>
                                    <Text style={styles.avatarText}>
                                        {user?.username?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={[styles.accountName, { color: theme.accent }]}>{user?.username || 'Guest'}</Text>
                                    <Text style={[styles.accountStatus, { color: theme.success }]}>Online</Text>
                                </View>
                                <TouchableOpacity style={[styles.viewProfileBtn, { backgroundColor: theme.border }]}>
                                    <Text style={{ color: theme.text }}>View Profile</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.row}>
                            <Text style={{ color: theme.textSecondary, marginTop: 20 }}>More account settings coming soon...</Text>
                        </View>
                    </View>
                );
            case 'general':
                return (
                    <View style={styles.contentSection}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>General</Text>
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={styles.row}>
                                <View>
                                    <Text style={[styles.label, { color: theme.text }]}>Current Version</Text>
                                    <Text style={[styles.value, { color: theme.textSecondary }]}>v{currentVersion}</Text>
                                </View>

                                {loading ? (
                                    <ActivityIndicator color={theme.accent} />
                                ) : error ? (
                                    <View style={styles.statusContainer}>
                                        <Text style={[styles.errorText, { color: theme.error }]}>Error checking</Text>
                                        <TouchableOpacity onPress={checkVersion}>
                                            <Text style={[styles.retryText, { color: theme.accent }]}>Retry</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : isUpdateAvailable ? (
                                    <View style={styles.statusContainer}>
                                        <Text style={[styles.updateText, { color: theme.success }]}>New version available: v{latestVersion}</Text>
                                        <TouchableOpacity
                                            style={[styles.updateButton, { backgroundColor: theme.accent }]}
                                            onPress={() => releaseUrl && Linking.openURL(releaseUrl)}
                                        >
                                            <Text style={[styles.updateButtonText, { color: theme.background }]}>Update</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <Text style={[styles.uptodateText, { color: theme.success }]}>You are up to date</Text>
                                )}
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Language</Text>
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[
                                        styles.languageOption,
                                        language === lang.code && { backgroundColor: theme.accent + '20' }
                                    ]}
                                    onPress={() => setLanguage(lang.code)}
                                >
                                    <Text style={[
                                        styles.languageText,
                                        { color: theme.text },
                                        language === lang.code && { color: theme.accent, fontWeight: 'bold' }
                                    ]}>
                                        {lang.label}
                                    </Text>
                                    {language === lang.code && (
                                        <Text style={{ color: theme.accent }}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            default:
                return (
                    <View style={styles.contentSection}>
                        <Text style={{ color: theme.textSecondary }}>Select a category to view settings.</Text>
                    </View>
                );
        }
    }

    if (!isOpen) return null;

    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="fade"
            onRequestClose={closeSettings}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.headerTitle, { color: theme.accent }]}>STEAM SETTINGS</Text>
                        <View style={styles.windowControls}>
                            <TouchableOpacity onPress={closeSettings} style={styles.closeButton}>
                                <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.body}>
                        {/* Sidebar */}
                        <ScrollView style={[styles.sidebar, { backgroundColor: theme.surface }]}>
                            {renderSidebarItem('account', 'Account', '👤')}
                            {renderSidebarItem('general', 'General', '⚙️')}
                            {/* Placeholders */}
                            {renderSidebarItem('friends', 'Friends & Chat', '👥')}
                            {renderSidebarItem('family', 'Family', '👨‍👩‍👧‍👦')}
                            {renderSidebarItem('security', 'Security', '🛡️')}
                            {renderSidebarItem('notifications', 'Notifications', '🔔')}
                            {renderSidebarItem('interface', 'Interface', '🖥️')}
                            {renderSidebarItem('storage', 'Storage', '💾')}
                            {renderSidebarItem('cloud', 'Cloud', '☁️')}
                            {renderSidebarItem('ingame', 'In Game', '🎮')}
                        </ScrollView>

                        {/* Content */}
                        <ScrollView style={styles.content}>
                            {renderContent()}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    container: {
        width: '100%',
        maxWidth: 800,
        height: '80%',
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333', // fallback
        ...Platform.select({
            web: {
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            }
        })
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    windowControls: {
        flexDirection: 'row',
    },
    closeButton: {
        padding: 4,
    },
    closeButtonText: {
        fontSize: 16,
    },
    body: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        flex: 2,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.05)',
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    sidebarIcon: {
        marginRight: 10,
        fontSize: 14,
    },
    sidebarLabel: {
        fontSize: 13,
    },
    content: {
        flex: 3,
        padding: 32,
    },
    contentSection: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        padding: 16,
        borderRadius: 4,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    value: {
        fontSize: 13,
        marginTop: 2,
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    errorText: {
        fontSize: 12,
    },
    retryText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    updateText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    uptodateText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    updateButton: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 2,
    },
    updateButtonText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    languageOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    languageText: {
        fontSize: 14,
    },
    accountHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    accountName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    accountStatus: {
        fontSize: 12,
    },
    viewProfileBtn: {
        marginLeft: 'auto',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 2,
    }
});
