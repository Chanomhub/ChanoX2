import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutRectangle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useDownloads } from '@/contexts/DownloadContext';
import DownloadPopover from './DownloadPopover';

export default function DownloadButton() {
    const { downloads } = useDownloads();
    const [visible, setVisible] = useState(false);
    const buttonRef = useRef<View>(null);
    const [layout, setLayout] = useState<LayoutRectangle | null>(null);

    // Calculate active downloads (downloading or pending)
    const activeCount = downloads.filter(d => d.status === 'downloading' || d.status === 'pending').length;

    // Overall progress of active downloads (simple average for now)
    const activeDownloads = downloads.filter(d => d.status === 'downloading');
    const totalProgress = activeDownloads.length > 0
        ? activeDownloads.reduce((acc, d) => acc + d.progress, 0) / activeDownloads.length
        : 0;

    const showBadge = activeCount > 0;
    const isDownloading = activeCount > 0;

    const handleLayout = (event: any) => {
        // We might want to use measureInWindow if we needed exact screen coords, 
        // but for now relying on basic positioning is easier
        setLayout(event.nativeEvent.layout);
    };

    return (
        <View style={styles.container} onLayout={handleLayout} ref={buttonRef}>
            <TouchableOpacity onPress={() => setVisible(true)} style={styles.button}>
                <View style={styles.iconWrapper}>
                    <Text style={styles.icon}>⬇️</Text>
                    {isDownloading && (
                        <View style={[styles.progressRing, { width: '100%', height: 2 }]} >
                            <View style={{ backgroundColor: '#4CAF50', height: '100%', width: `${totalProgress}%` }} />
                        </View>
                    )}
                </View>

                {showBadge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{activeCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <DownloadPopover
                visible={visible}
                onClose={() => setVisible(false)}
                anchorLayout={null} // We'll just position top-right for now
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        zIndex: 100,
    },
    button: {
        padding: 8,
        marginRight: 8,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 24,
        alignItems: 'center',
    },
    icon: {
        fontSize: 18,
        color: Colors.dark.text,
    },
    progressRing: {
        position: 'absolute',
        bottom: -4,
        left: 0,
        backgroundColor: Colors.dark.surface,
        overflow: 'hidden',
        borderRadius: 1,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -4,
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: Colors.dark.surface,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
