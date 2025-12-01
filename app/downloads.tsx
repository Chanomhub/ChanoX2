import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Colors } from '../src/constants/Colors';
import { useDownloads, Download } from '../src/contexts/DownloadContext';

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

function formatTime(date: Date): string {
    return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusColor(status: Download['status']): string {
    switch (status) {
        case 'completed': return '#4CAF50';
        case 'downloading': return Colors.dark.accent;
        case 'failed': return '#f44336';
        case 'cancelled': return '#FF9800';
        default: return Colors.dark.textSecondary;
    }
}

function getStatusText(status: Download['status']): string {
    switch (status) {
        case 'completed': return 'เสร็จสิ้น';
        case 'downloading': return 'กำลังดาวน์โหลด';
        case 'failed': return 'ล้มเหลว';
        case 'cancelled': return 'ยกเลิกแล้ว';
        default: return 'รอดำเนินการ';
    }
}

function DownloadItem({ download }: { download: Download }) {
    const { removeDownload } = useDownloads();

    return (
        <View style={styles.downloadItem}>
            {/* Header */}
            <View style={styles.downloadHeader}>
                <View style={styles.downloadInfo}>
                    <Text style={styles.filename} numberOfLines={1}>
                        {download.filename}
                    </Text>
                    {download.articleTitle && (
                        <Text style={styles.articleTitle} numberOfLines={1}>
                            จาก: {download.articleTitle}
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeDownload(download.id)}
                >
                    <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            {download.status === 'downloading' && (
                <View style={styles.progressContainer}>
                    <View
                        style={[
                            styles.progressBar,
                            { width: `${download.progress}%` }
                        ]}
                    />
                </View>
            )}

            {/* Status and Details */}
            <View style={styles.downloadDetails}>
                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(download.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(download.status) }]}>
                        {getStatusText(download.status)}
                    </Text>
                    {download.status === 'downloading' && (
                        <Text style={styles.progressText}>
                            {download.progress.toFixed(1)}%
                        </Text>
                    )}
                </View>

                <View style={styles.detailsRow}>
                    {download.status === 'downloading' && (
                        <>
                            <Text style={styles.detailText}>
                                {formatBytes(download.downloadedBytes)} / {formatBytes(download.totalBytes)}
                            </Text>
                            {download.speed > 0 && (
                                <Text style={styles.detailText}>
                                    • {formatSpeed(download.speed)}
                                </Text>
                            )}
                        </>
                    )}

                    {download.status === 'completed' && download.endTime && (
                        <Text style={styles.detailText}>
                            เสร็จเมื่อ {formatTime(download.endTime)}
                        </Text>
                    )}

                    {download.status === 'failed' && download.error && (
                        <Text style={styles.errorText}>
                            {download.error}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
}

export default function DownloadsScreen() {
    const { downloads, clearCompleted, clearAll } = useDownloads();

    const activeDownloads = downloads.filter(d =>
        d.status === 'downloading' || d.status === 'pending'
    );

    const completedDownloads = downloads.filter(d =>
        d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled'
    );

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'DOWNLOADS',
                    headerStyle: { backgroundColor: Colors.dark.surface },
                    headerTintColor: Colors.dark.text,
                }}
            />

            {/* Summary Bar */}
            <View style={styles.summaryBar}>
                <Text style={styles.summaryText}>
                    การดาวน์โหลดทั้งหมด: {downloads.length}
                </Text>
                <View style={styles.summaryActions}>
                    {completedDownloads.length > 0 && (
                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={clearCompleted}
                        >
                            <Text style={styles.clearButtonText}>ล้างที่เสร็จแล้ว</Text>
                        </TouchableOpacity>
                    )}
                    {downloads.length > 0 && (
                        <TouchableOpacity
                            style={[styles.clearButton, styles.clearAllButton]}
                            onPress={clearAll}
                        >
                            <Text style={styles.clearButtonText}>ล้างทั้งหมด</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView style={styles.scrollView}>
                {/* Active Downloads */}
                {activeDownloads.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>กำลังดาวน์โหลด</Text>
                        {activeDownloads.map(download => (
                            <DownloadItem key={download.id} download={download} />
                        ))}
                    </View>
                )}

                {/* Completed Downloads */}
                {completedDownloads.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ประวัติการดาวน์โหลด</Text>
                        {completedDownloads.map(download => (
                            <DownloadItem key={download.id} download={download} />
                        ))}
                    </View>
                )}

                {/* Empty State */}
                {downloads.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📥</Text>
                        <Text style={styles.emptyTitle}>ไม่มีการดาวน์โหลด</Text>
                        <Text style={styles.emptyText}>
                            การดาวน์โหลดของคุณจะแสดงที่นี่
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    summaryBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.dark.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
    },
    summaryText: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: '600',
    },
    summaryActions: {
        flexDirection: 'row',
        gap: 8,
    },
    clearButton: {
        backgroundColor: Colors.dark.border,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    demoButton: {
        backgroundColor: Colors.dark.accent,
    },
    clearAllButton: {
        backgroundColor: '#ff4444',
    },
    clearButtonText: {
        color: Colors.dark.text,
        fontSize: 12,
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        color: Colors.dark.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    downloadItem: {
        backgroundColor: Colors.dark.surface,
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    downloadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    downloadInfo: {
        flex: 1,
        marginRight: 12,
    },
    filename: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    articleTitle: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
    removeButton: {
        padding: 4,
    },
    removeButtonText: {
        color: Colors.dark.textSecondary,
        fontSize: 18,
    },
    progressContainer: {
        height: 4,
        backgroundColor: Colors.dark.border,
        borderRadius: 2,
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.dark.accent,
        borderRadius: 2,
    },
    downloadDetails: {
        gap: 6,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    progressText: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        marginLeft: 'auto',
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    detailText: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
    },
    errorText: {
        color: '#f44336',
        fontSize: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
        marginTop: 100,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        color: Colors.dark.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptyText: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
});
