import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { useFestival } from '@/contexts/FestivalContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import Constants from 'expo-constants';
import packageJson from '../package.json';

interface GitHubRelease {
    tag_name: string;
    html_url: string;
    body: string;
}

export default function SettingsPage() {
    const { theme } = useFestival();
    const { language, setLanguage } = useLanguage();
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [releaseUrl, setReleaseUrl] = useState<string | null>(null);

    const currentVersion = packageJson.version;

    useEffect(() => {
        checkVersion();
    }, []);

    const checkVersion = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('https://api.github.com/repos/Chanomhub/ChanoX2/releases/latest');
            if (!response.ok) {
                throw new Error('Failed to fetch release info');
            }
            const data: GitHubRelease = await response.json();
            // Assuming tag_name is like "v1.0.0" or "1.0.0"
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

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Language</Text>
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

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>General</Text>

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
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: 8,
        borderWidth: 1,
        padding: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    value: {
        fontSize: 14,
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    errorText: {
        fontSize: 14,
        marginBottom: 4,
    },
    retryText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    updateText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    uptodateText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    updateButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    updateButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    languageOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ffffff20',
    },
    languageText: {
        fontSize: 16,
    },
});
