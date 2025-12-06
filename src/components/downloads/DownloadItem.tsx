import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Download } from '@/contexts/DownloadContext';

interface DownloadItemProps {
    download: Download;
    onCancel: (id: number) => void;
    onShowInFolder: (id: number) => void;
    onOpenFile: (id: number) => void;
    onRemove: (id: number) => void;
}

export default function DownloadItem({ download, onCancel, onShowInFolder, onOpenFile, onRemove }: DownloadItemProps) {
    const isCompleted = download.status === 'completed';
    const isFailed = download.status === 'failed';
    const isDownloading = download.status === 'downloading';

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSec: number) => {
        return `${formatBytes(bytesPerSec)}/s`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>
                    {isCompleted ? '📄' : isFailed ? '⚠️' : '⬇️'}
                </Text>
            </View>

            <View style={styles.infoContainer}>
                <TouchableOpacity
                    disabled={!isCompleted}
                    onPress={() => onOpenFile(download.id)}
                >
                    <Text style={[styles.filename, isCompleted && styles.linkText]} numberOfLines={1}>
                        {download.filename}
                    </Text>
                </TouchableOpacity>

                {isDownloading && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${download.progress}%` }]} />
                        </View>
                        <Text style={styles.statusText}>
                            {formatBytes(download.downloadedBytes)} of {formatBytes(download.totalBytes)} • {formatSpeed(download.speed)}
                        </Text>
                    </View>
                )}

                {isCompleted && (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity onPress={() => onShowInFolder(download.id)}>
                            <Text style={styles.actionLink}>Show in folder</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isFailed && (
                    <Text style={styles.errorText}>{download.error || 'Download failed'}</Text>
                )}
            </View>

            <View style={styles.actionsContainer}>
                {isDownloading && (
                    <TouchableOpacity onPress={() => onCancel(download.id)} style={styles.actionButton}>
                        <Text style={styles.actionIcon}>✕</Text>
                    </TouchableOpacity>
                )}
                {!isDownloading && (
                    <TouchableOpacity onPress={() => onRemove(download.id)} style={styles.actionButton}>
                        <Text style={styles.actionIcon}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.dark.surface,
        borderRadius: 4,
        marginRight: 12,
    },
    icon: {
        fontSize: 20,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    filename: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    linkText: {
        color: Colors.dark.accent,
        textDecorationLine: 'underline',
    },
    progressContainer: {
        marginTop: 4,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: Colors.dark.surface,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50', // Green
    },
    statusText: {
        color: Colors.dark.textSecondary,
        fontSize: 11,
    },
    actionsRow: {
        flexDirection: 'row',
        marginTop: 2,
    },
    actionLink: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
        textDecorationLine: 'underline',
    },
    errorText: {
        color: '#FF5252',
        fontSize: 12,
    },
    actionsContainer: {
        marginLeft: 12,
    },
    actionButton: {
        padding: 8,
    },
    actionIcon: {
        color: Colors.dark.textSecondary,
        fontSize: 16,
    },
});
