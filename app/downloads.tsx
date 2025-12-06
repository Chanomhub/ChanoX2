import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/constants/Colors';
import { useDownloads, Download } from '../src/contexts/DownloadContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec: number): string {
    return formatBytes(bytesPerSec) + '/s';
}

function calculateTimeRemaining(remainingBytes: number, speed: number): string {
    if (speed === 0) return '--:--';
    const seconds = remainingBytes / speed;
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}

// Mock Component for Line Chart (Simplified for now)
const MetricsHeader = ({ currentSpeed, peakSpeed, diskUsage }: { currentSpeed: number, peakSpeed: number, diskUsage: number }) => (
    <View style={styles.metricsHeader}>
        <View style={styles.metricItem}>
            <Ionicons name="stats-chart" size={16} color={Colors.dark.accent} />
            <Text style={styles.metricLabel}>NETWORK</Text>
            <Text style={styles.metricValue}>{formatSpeed(currentSpeed)}</Text>
        </View>
        <View style={styles.metricItem}>
            <Ionicons name="trending-up" size={16} color={Colors.dark.accent} />
            <Text style={styles.metricLabel}>PEAK</Text>
            <Text style={styles.metricValue}>{formatSpeed(peakSpeed)}</Text>
        </View>
        <View style={styles.metricItem}>
            <Ionicons name="hardware-chip-outline" size={16} color={Colors.dark.accent} />{/* Using hardware-chip as proxy for disk */}
            <Text style={styles.metricLabel}>DISK USAGE</Text>
            <Text style={styles.metricValue}>{formatSpeed(diskUsage)}</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-sharp" size={20} color={Colors.dark.textSecondary} />
        </TouchableOpacity>
    </View>
);

const DownloadItem = ({ download, isCompleted }: { download: Download, isCompleted?: boolean }) => {
    const { removeDownload, extractDownload } = useDownloads();

    return (
        <View style={styles.itemContainer}>
            {/* Game Cover (Placeholder) */}
            <View style={styles.gameCover}>
                <LinearGradient
                    colors={[Colors.dark.accent, '#2c3e50']}
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                >
                    <Text style={styles.coverText}>{download.filename.substring(0, 2).toUpperCase()}</Text>
                </LinearGradient>
            </View>

            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <Text style={styles.gameTitle} numberOfLines={1}>{download.articleTitle || download.filename}</Text>
                    {isCompleted && (
                        <Text style={styles.completedDate}>
                            {download.endTime ? new Date(download.endTime).toLocaleDateString() + ' ' + new Date(download.endTime).toLocaleTimeString() : ''}
                        </Text>
                    )}
                </View>

                {isCompleted ? (
                    <View style={styles.completedActions}>
                        <View style={styles.fileInfo}>
                            <Text style={styles.fileSize}>{formatBytes(download.totalBytes)}</Text>
                            <Text style={styles.patchNotes}>PATCH NOTES</Text>
                        </View>
                        <View style={styles.actionButtons}>
                            {/* Check common compressed extensions */}
                            {['.zip', '.tar.xz', '.7z', '.rar', '.tar', '.gz'].some(ext => download.filename.endsWith(ext)) && (
                                <TouchableOpacity
                                    style={[styles.actionButton, download.isExtracting && styles.disabledButton]}
                                    onPress={() => extractDownload(download.id)}
                                    disabled={download.isExtracting}
                                >
                                    <Ionicons name="cube-outline" size={18} color="#fff" />
                                    <Text style={styles.actionButtonText}>
                                        {download.isExtracting ? 'EXTRACTING...' : 'EXTRACT'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.iconButton} onPress={() => removeDownload(download.id)}>
                                <Ionicons name="download-outline" size={20} color={Colors.dark.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.downloadingInfo}>
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBar, { width: `${download.progress}%` }]} />
                        </View>
                        <View style={styles.statsRow}>
                            <Text style={styles.statText}>{formatBytes(download.downloadedBytes)} / {formatBytes(download.totalBytes)}</Text>
                            <Text style={styles.statText}>Peak: {formatSpeed(download.speed)}</Text>
                            {/* Peak speed calculation handles in parent usually, just showing current speed labeled as desired or adding peak tracking to context */}

                            <View style={styles.rightStats}>
                                <Text style={styles.statTextHighlight}>{formatSpeed(download.speed)}</Text>
                                <Text style={styles.statText}>Time remaining: {calculateTimeRemaining(download.totalBytes - download.downloadedBytes, download.speed)}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
            {!isCompleted && (
                <View style={styles.controlButtons}>
                    <TouchableOpacity onPress={() => removeDownload(download.id)}>
                        <Ionicons name="close" size={24} color={Colors.dark.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default function DownloadsScreen() {
    const { downloads } = useDownloads();
    // Simple state for peak speed tracking (in memory for this screen)
    const [peakSpeed, setPeakSpeed] = React.useState(0);

    const activeDownloads = downloads.filter(d => d.status === 'downloading' || d.status === 'pending');
    const completedDownloads = downloads.filter(d => d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled');

    const totalSpeed = activeDownloads.reduce((acc, d) => acc + (d.speed || 0), 0);

    // Derived disk usage (naive assumption: disk write speed ~= download speed)
    const diskUsage = totalSpeed;

    useEffect(() => {
        if (totalSpeed > peakSpeed) {
            setPeakSpeed(totalSpeed);
        }
    }, [totalSpeed]);


    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: false, // We build our own header-like area
                }}
            />

            {/* Top Metrics Area */}
            <LinearGradient
                colors={['#1a2a3a', Colors.dark.background]}
                style={styles.headerBackground}
            >
                <MetricsHeader currentSpeed={totalSpeed} peakSpeed={peakSpeed} diskUsage={diskUsage} />
            </LinearGradient>

            <ScrollView style={styles.content}>
                {/* Active Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Up Next ({activeDownloads.length})</Text>
                    {activeDownloads.length === 0 ? (
                        <Text style={styles.emptyText}>There are no downloads in the queue</Text>
                    ) : (
                        activeDownloads.map(d => <DownloadItem key={d.id} download={d} />)
                    )}
                </View>

                {/* Completed Section (Scheduled/History) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Completed ({completedDownloads.length})</Text>
                    {completedDownloads.length === 0 ? (
                        <Text style={styles.emptyText}>No completed downloads</Text>
                    ) : (
                        completedDownloads.map(d => <DownloadItem key={d.id} download={d} isCompleted />)
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1b2838', // darker blue-ish background like steam
    },
    headerBackground: {
        paddingTop: 40,
        paddingBottom: 20,
    },
    metricsHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 30,
    },
    metricItem: {
        alignItems: 'flex-start',
    },
    metricLabel: {
        color: Colors.dark.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    metricValue: {
        color: Colors.dark.text,
        fontSize: 12,
        fontWeight: '600',
    },
    settingsButton: {
        marginLeft: 10,
        padding: 5,
        backgroundColor: '#2a3f55',
        borderRadius: 4,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        color: Colors.dark.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        opacity: 0.8,
    },
    emptyText: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 5,
    },
    itemContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.2)',
        marginBottom: 10,
        height: 80,
    },
    gameCover: {
        width: 150,
        height: '100%',
        backgroundColor: '#2c3e50',
    },
    coverText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 20,
    },
    itemContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    gameTitle: {
        color: Colors.dark.text,
        fontSize: 16,
        fontWeight: '600',
    },
    completedActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fileInfo: {
        flexDirection: 'row',
        gap: 10,
    },
    fileSize: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
    patchNotes: {
        color: Colors.dark.accent,
        fontSize: 12,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a3f55',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 2,
        gap: 6,
    },
    disabledButton: {
        opacity: 0.5,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    iconButton: {
        padding: 5,
        backgroundColor: '#2a3f55',
        borderRadius: 2,
    },
    completedDate: {
        color: Colors.dark.textSecondary,
        fontSize: 11,
    },
    downloadingInfo: {
        gap: 6,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: '#000',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.dark.accent,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statText: {
        color: Colors.dark.textSecondary,
        fontSize: 11,
    },
    statTextHighlight: {
        color: Colors.dark.text,
        fontSize: 11,
        fontWeight: '600',
    },
    rightStats: {
        flexDirection: 'row',
        gap: 15,
    },
    controlButtons: {
        width: 40,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
