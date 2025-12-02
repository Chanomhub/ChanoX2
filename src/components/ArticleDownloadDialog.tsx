import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { Download } from '../types/graphql';

interface ArticleDownloadDialogProps {
    visible: boolean;
    onClose: () => void;
    download: Download | null;
    onDownload: (url: string) => void;
    articleTitle?: string;
}

export function ArticleDownloadDialog({
    visible,
    onClose,
    download,
    onDownload,
    articleTitle
}: ArticleDownloadDialogProps) {
    if (!download) return null;

    const handleCopyLink = () => {
        // TODO: Implement clipboard copy when expo-clipboard is available
        // For now, we'll just log it or maybe show a toast if we had one
        console.log('Copy link:', download.url);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                    <Text style={styles.title}>Download Options</Text>

                    <View style={styles.content}>
                        <Text style={styles.label}>File:</Text>
                        <Text style={styles.value} numberOfLines={1}>
                            {download.name || 'Unknown filename'}
                        </Text>

                        <Text style={styles.label}>Source:</Text>
                        <Text style={styles.value} numberOfLines={2}>
                            {download.url}
                        </Text>

                        {download.vipOnly && (
                            <View style={styles.vipBadge}>
                                <Text style={styles.vipText}>VIP Only</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.downloadButton]}
                            onPress={() => {
                                onDownload(download.url);
                                onClose();
                            }}
                        >
                            <Text style={styles.downloadButtonText}>Download</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dialog: {
        backgroundColor: Colors.dark.surface,
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.dark.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    content: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        color: Colors.dark.textSecondary,
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        color: Colors.dark.text,
        marginBottom: 16,
    },
    vipBadge: {
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFD700',
        marginTop: 4,
    },
    vipText: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
        minWidth: 100,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    downloadButton: {
        backgroundColor: Colors.dark.accent,
    },
    cancelButtonText: {
        color: Colors.dark.text,
        fontWeight: '600',
    },
    downloadButtonText: {
        color: Colors.dark.background,
        fontWeight: 'bold',
    },
});
