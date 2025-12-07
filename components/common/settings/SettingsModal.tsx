import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    ScrollView, Linking, ActivityIndicator, Platform,
    Dimensions, Image
} from 'react-native';
import { useFestival } from '@/contexts/FestivalContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStore } from '@/stores/settingsStore';
import Constants from 'expo-constants';
import packageJson from '../../../package.json';
import { Ionicons } from '@expo/vector-icons'; // แนะนำให้ใช้ Icon set ถ้ามี
import { useTranslation } from 'react-i18next';

interface GitHubRelease {
    tag_name: string;
    html_url: string;
    body: string;
}

// Sub-component: Menu Item
const SidebarItem = ({ id, label, icon, isActive, theme, onPress }: any) => (
    <TouchableOpacity
        style={[
            styles.sidebarItem,
            isActive && { backgroundColor: theme.accent + '15', borderLeftColor: theme.accent }
        ]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.activeIndicator, { backgroundColor: isActive ? theme.accent : 'transparent' }]} />
        <Text style={[
            styles.sidebarIcon,
            { color: isActive ? theme.accent : theme.textSecondary }
        ]}>{icon}</Text>
        <Text style={[
            styles.sidebarLabel,
            { color: isActive ? theme.text : theme.textSecondary, fontWeight: isActive ? '600' : '400' }
        ]}>{label}</Text>
    </TouchableOpacity>
);

// Sub-component: Section Header
const SectionHeader = ({ title, theme }: any) => (
    <View style={styles.sectionHeaderContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />
    </View>
);

export default function SettingsModal() {
    const { isOpen, closeSettings, activeSection, setActiveSection } = useSettingsStore();
    const { theme } = useFestival();
    const { language, setLanguage } = useLanguage();
    const { user } = useAuth();
    const { t } = useTranslation('common');

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
            if (!response.ok) throw new Error('Failed');
            const data: GitHubRelease = await response.json();
            const version = data.tag_name.replace(/^v/, '');
            setLatestVersion(version);
            setReleaseUrl(data.html_url);
        } catch (err) {
            setError('Check failed');
        } finally {
            setLoading(false);
        }
    };

    const isUpdateAvailable = latestVersion && latestVersion !== currentVersion;

    const renderContent = () => {
        switch (activeSection) {
            case 'account':
                return (
                    <View style={styles.contentContainer}>
                        <SectionHeader title={t('account_details')} theme={theme} />

                        {/* Profile Card */}
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={styles.cardContent}>
                                <View style={[styles.avatarContainer, { borderColor: theme.accent }]}>
                                    <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
                                        <Text style={styles.avatarText}>
                                            {user?.username?.charAt(0).toUpperCase() || '?'}
                                        </Text>
                                    </View>
                                    <View style={[styles.statusDot, { backgroundColor: theme.success, borderColor: theme.surface }]} />
                                </View>

                                <View style={styles.profileInfo}>
                                    <Text style={[styles.profileName, { color: theme.text }]}>
                                        {user?.username || t('guest_user')}
                                    </Text>
                                    <Text style={[styles.profileStatus, { color: theme.success }]}>
                                        ● {t('online')}
                                    </Text>
                                    <Text style={[styles.profileId, { color: theme.textSecondary }]}>
                                        ID: {user?.id || t('unknown')}
                                    </Text>
                                </View>

                                <TouchableOpacity style={[styles.buttonOutline, { borderColor: theme.textSecondary }]}>
                                    <Text style={{ color: theme.text }}>{t('edit_profile')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={[styles.subHeader, { color: theme.textSecondary }]}>{t('security_privacy')}</Text>
                        <View style={[styles.infoBox, { backgroundColor: theme.surface + '80' }]}>
                            <Text style={{ color: theme.textSecondary }}>
                                Two-factor authentication is currently <Text style={{ fontWeight: 'bold', color: theme.error }}>Disabled</Text>.
                            </Text>
                        </View>
                    </View>
                );

            case 'general':
                return (
                    <View style={styles.contentContainer}>
                        <SectionHeader title={t('system_updates')} theme={theme} />

                        {/* Update Card */}
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={styles.rowBetween}>
                                <View>
                                    <Text style={[styles.label, { color: theme.text }]}>{t('client_version')}</Text>
                                    <View style={styles.versionBadgeContainer}>
                                        <Text style={[styles.versionBadge, { backgroundColor: theme.border, color: theme.text }]}>
                                            v{currentVersion}
                                        </Text>
                                        <Text style={[styles.buildText, { color: theme.textSecondary }]}>
                                            ({t('stable_channel')})
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.actionContainer}>
                                    {loading ? (
                                        <ActivityIndicator color={theme.accent} />
                                    ) : isUpdateAvailable ? (
                                        <TouchableOpacity
                                            style={[styles.primaryButton, { backgroundColor: theme.success }]}
                                            onPress={() => releaseUrl && Linking.openURL(releaseUrl)}
                                        >
                                            <Text style={styles.primaryButtonText}>{t('update_available', { version: latestVersion })}</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={[styles.statusPill, { backgroundColor: theme.success + '20' }]}>
                                            <Text style={[styles.statusPillText, { color: theme.success }]}>{t('up_to_date')}</Text>
                                        </View>
                                    )}
                                    {error && (
                                        <TouchableOpacity onPress={checkVersion}>
                                            <Text style={[styles.linkText, { color: theme.error }]}>{t('retry_check')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>

                        <SectionHeader title={t('language')} theme={theme} />
                        <View style={styles.gridContainer}>
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[
                                        styles.langCard,
                                        { backgroundColor: theme.surface, borderColor: theme.border },
                                        language === lang.code && { borderColor: theme.accent, backgroundColor: theme.accent + '10' }
                                    ]}
                                    onPress={() => setLanguage(lang.code)}
                                >
                                    <Text style={[
                                        styles.langText,
                                        { color: theme.text },
                                        language === lang.code && { color: theme.accent, fontWeight: 'bold' }
                                    ]}>
                                        {lang.label}
                                    </Text>
                                    {language === lang.code && (
                                        <View style={[styles.checkMark, { backgroundColor: theme.accent }]}>
                                            <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            default:
                return (
                    <View style={[styles.centerContent, { opacity: 0.5 }]}>
                        <Text style={{ fontSize: 40, marginBottom: 10 }}>🚧</Text>
                        <Text style={{ color: theme.textSecondary }}>{t('work_in_progress')}</Text>
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
                <View style={[styles.container, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    {/* Header Bar */}
                    <View style={[styles.titleBar, { backgroundColor: theme.surface }]}>
                        <Text style={[styles.windowTitle, { color: theme.textSecondary }]}>{t('settings').toUpperCase()}</Text>
                        <TouchableOpacity onPress={closeSettings} style={styles.closeBtn}>
                            <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>
                        {/* Sidebar */}
                        <View style={[styles.sidebar, { backgroundColor: theme.background }]}>
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>
                                <Text style={[styles.sidebarHeader, { color: theme.textSecondary }]}>{t('preferences').toUpperCase()}</Text>
                                <SidebarItem id="account" label={t('account')} icon="👤" isActive={activeSection === 'account'} theme={theme} onPress={() => setActiveSection('account')} />
                                <SidebarItem id="general" label={t('general')} icon="⚙️" isActive={activeSection === 'general'} theme={theme} onPress={() => setActiveSection('general')} />

                                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                                <Text style={[styles.sidebarHeader, { color: theme.textSecondary }]}>{t('application').toUpperCase()}</Text>
                                <SidebarItem id="friends" label={t('friends_chat')} icon="💬" isActive={activeSection === 'friends'} theme={theme} onPress={() => setActiveSection('friends')} />
                                <SidebarItem id="security" label={t('security')} icon="🛡️" isActive={activeSection === 'security'} theme={theme} onPress={() => setActiveSection('security')} />
                                <SidebarItem id="notifications" label={t('notifications')} icon="🔔" isActive={activeSection === 'notifications'} theme={theme} onPress={() => setActiveSection('notifications')} />
                            </ScrollView>
                        </View>

                        {/* Main Content */}
                        <View style={styles.contentArea}>
                            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
                                {renderContent()}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: { backdropFilter: 'blur(5px)' }
        }) as any,
    },
    container: {
        width: Platform.OS === 'web' ? '75%' : '95%',
        maxWidth: 900,
        height: Platform.OS === 'web' ? '80%' : '90%',
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    titleBar: {
        height: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    windowTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
    closeBtn: {
        padding: 8,
    },
    closeText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    body: {
        flex: 1,
        flexDirection: 'row',
    },
    // Sidebar Styles
    sidebar: {
        width: 240,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 16,
    },
    sidebarContent: {
        paddingHorizontal: 0,
    },
    sidebarHeader: {
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 20,
        marginBottom: 8,
        marginTop: 16,
        letterSpacing: 1,
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingRight: 16,
        marginBottom: 2,
    },
    activeIndicator: {
        width: 4,
        height: '100%',
        marginRight: 16,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    sidebarIcon: {
        fontSize: 16,
        marginRight: 12,
        width: 24,
        textAlign: 'center',
    },
    sidebarLabel: {
        fontSize: 14,
    },
    divider: {
        height: 1,
        marginVertical: 10,
        marginHorizontal: 20,
        opacity: 0.5,
    },
    // Content Area Styles
    contentArea: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        padding: 40,
        paddingBottom: 60,
    },
    contentContainer: {
        flex: 1,
    },
    sectionHeaderContainer: {
        marginBottom: 24,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '300', // Light font weight looks more modern
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    sectionDivider: {
        height: 1,
        width: '100%',
        opacity: 0.3,
    },
    subHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // Card Styles
    card: {
        borderRadius: 6,
        borderWidth: 1,
        marginBottom: 20,
        overflow: 'hidden',
    },
    cardContent: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowBetween: {
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    // Profile Styles
    avatarContainer: {
        position: 'relative',
        marginRight: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 4, // Square-ish for gaming feel
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    statusDot: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 3,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    profileStatus: {
        fontSize: 14,
        marginBottom: 2,
    },
    profileId: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    // Button Styles
    buttonOutline: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: 4,
    },
    primaryButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        elevation: 2,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    // Update/Version Styles
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    versionBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    versionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 8,
    },
    buildText: {
        fontSize: 12,
    },
    actionContainer: {
        alignItems: 'flex-end',
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusPillText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    linkText: {
        fontSize: 12,
        marginTop: 4,
        textDecorationLine: 'underline',
    },
    infoBox: {
        padding: 16,
        borderRadius: 4,
    },
    // Language Grid
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -8,
    },
    langCard: {
        width: '45%', // 2 columns roughly
        minWidth: 140,
        margin: 8,
        padding: 16,
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    langText: {
        fontSize: 14,
        fontWeight: '500',
    },
    checkMark: {
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});