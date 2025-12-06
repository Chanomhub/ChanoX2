import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import AccountSwitcher from './AccountSwitcher';

export default function TitleBar() {
    // Only show on web/electron (check if electronAPI is available)
    const [isElectron, setIsElectron] = useState(false);
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            setIsElectron(true);
        }
    }, []);

    if (!isElectron) return null;

    const handleMinimize = () => {
        if ((window as any).electronAPI) {
            (window as any).electronAPI.minimizeWindow();
        }
    };

    const handleMaximize = () => {
        if ((window as any).electronAPI) {
            (window as any).electronAPI.maximizeWindow();
        }
    };

    const handleClose = () => {
        if ((window as any).electronAPI) {
            (window as any).electronAPI.closeWindow();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.dragRegion}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>ChanoX2</Text>
                </View>
            </View>

            <View style={styles.rightSection}>
                {/* Account Controls */}
                <View style={styles.accountContainer}>
                    {isAuthenticated ? (
                        <AccountSwitcher compact />
                    ) : (
                        <TouchableOpacity
                            onPress={() => router.push('/login')}
                            style={styles.loginButton}
                        >
                            <Text style={styles.loginText}>LOGIN</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.windowControls}>
                    <TouchableOpacity onPress={handleMinimize} style={styles.controlButton}>
                        <Text style={styles.controlIcon}>─</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleMaximize} style={styles.controlButton}>
                        <Text style={styles.controlIcon}>□</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClose} style={[styles.controlButton, styles.closeButton]}>
                        <Text style={styles.controlIcon}>✕</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 36, // Increased slightly to accommodate account switcher
        backgroundColor: Colors.dark.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
    },
    dragRegion: {
        flex: 1,
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        // @ts-ignore - Electron specific style
        WebkitAppRegion: 'drag',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        // @ts-ignore - Ensure buttons are clickable
        WebkitAppRegion: 'no-drag',
    },
    accountContainer: {
        marginRight: 8,
        height: '100%',
        justifyContent: 'center',
    },
    loginButton: {
        backgroundColor: Colors.dark.accent,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
    },
    loginText: {
        color: Colors.dark.background,
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    windowControls: {
        flexDirection: 'row',
        height: '100%',
    },
    controlButton: {
        width: 46,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        // hover handled by TouchableOpacity
    },
    controlIcon: {
        color: Colors.dark.text,
        fontSize: 12,
    },
});
