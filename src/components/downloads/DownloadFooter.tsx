import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutRectangle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useDownloads } from '@/contexts/DownloadContext';
import DownloadPopover from './DownloadPopover';

export default function DownloadFooter() {
    const { downloads } = useDownloads();
    const [visible, setVisible] = useState(false);
    const [layout, setLayout] = useState<LayoutRectangle | null>(null);

    // Calculate active downloads (downloading or pending)
    const activeDownloads = downloads.filter(d => d.status === 'downloading' || d.status === 'pending');
    const activeCount = activeDownloads.length;

    // Only show footer if there are items in the download list (active or history)
    if (downloads.length === 0) return null;

    // Calculate overall progress
    const totalProgress = activeDownloads.length > 0
        ? activeDownloads.reduce((acc, d) => acc + d.progress, 0) / activeDownloads.length
        : 0;

    const statusText = activeCount > 0
        ? `Downloading ${activeCount} item${activeCount > 1 ? 's' : ''} (${Math.round(totalProgress)}%)`
        : 'Downloads';

    const handleLayout = (event: any) => {
        setLayout(event.nativeEvent.layout);
    };

    return (
        <>
            <View
                style={styles.container}
                onLayout={handleLayout}
            >
                <TouchableOpacity
                    style={styles.content}
                    onPress={() => setVisible(!visible)}
                >
                    <View style={styles.leftSection}>
                        <Text style={styles.label}>MANAGE DOWNLOADS</Text>
                    </View>

                    <View style={styles.centerSection}>
                        {activeCount > 0 && (
                            <View style={styles.progressContainer}>
                                <View style={[styles.progressBar, { width: `${totalProgress}%` }]} />
                            </View>
                        )}
                        <Text style={styles.statusText}>{statusText}</Text>
                    </View>

                    <View style={styles.rightSection}>
                        <Text style={styles.chevron}>{visible ? '▼' : '▲'}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <DownloadPopover
                visible={visible}
                onClose={() => setVisible(false)}
                anchorLayout={layout}
                placement="bottom"
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#171d25',
        borderTopWidth: 1,
        borderTopColor: '#3d4450',
        height: 40,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    leftSection: {
        width: 150,
    },
    label: {
        color: Colors.dark.textSecondary,
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    centerSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusText: {
        color: Colors.dark.accent,
        fontSize: 12,
        fontWeight: '500',
    },
    progressContainer: {
        width: 100,
        height: 4,
        backgroundColor: '#1a2332',
        borderRadius: 2,
        marginRight: 10,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
    },
    rightSection: {
        width: 40,
        alignItems: 'flex-end',
    },
    chevron: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
});
