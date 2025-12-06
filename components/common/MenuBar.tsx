import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useRouter, usePathname } from 'expo-router';

export default function MenuBar() {
    // Only show on web/electron (check if electronAPI is available)
    const [isElectron, setIsElectron] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            setIsElectron(true);
        }
    }, []);

    if (!isElectron) return null;

    const isStoreActive = pathname === '/' || pathname === '/index';
    const isLibraryActive = pathname === '/library';

    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Text style={styles.navIcon}>◀</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/')}
                    style={[styles.navLink, isStoreActive && styles.navLinkActive]}
                >
                    <Text style={[styles.navText, isStoreActive && styles.navTextActive]}>STORE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => router.push('/library')}
                    style={[styles.navLink, isLibraryActive && styles.navLinkActive]}
                >
                    <Text style={[styles.navText, isLibraryActive && styles.navTextActive]}>LIBRARY</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 48, // Taller menu bar
        backgroundColor: Colors.dark.background, // Slightly darker or different to distinguish
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        // No top border, but maybe bottom?
        // borderBottomWidth: 1,
        // borderBottomColor: Colors.dark.border,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 12,
        marginRight: 16,
        borderRadius: 20, // Circular hover effect maybe?
        backgroundColor: 'rgba(255,255,255,0.05)',
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navIcon: {
        color: Colors.dark.text,
        fontSize: 14,
        marginTop: 0, // Visual alignment
    },
    navLink: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 4,
        borderRadius: 4,
    },
    navLinkActive: {
        // backgroundColor: 'rgba(255, 255, 255, 0.1)',
        // Underline style or just text change? Steam uses text change usually.
        // Let's stick to simple background for now
    },
    navText: {
        color: Colors.dark.textSecondary,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    navTextActive: {
        color: Colors.dark.text,
        borderBottomWidth: 2,
        borderBottomColor: Colors.dark.accent, // Add an underline indicator
    },
});
