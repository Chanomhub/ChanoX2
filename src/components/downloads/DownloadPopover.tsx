import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useDownloads } from '@/contexts/DownloadContext';
import DownloadItem from './DownloadItem';

interface DownloadPopoverProps {
    visible: boolean;
    onClose: () => void;
    anchorLayout?: { x: number; y: number; width: number; height: number } | null;
}

export default function DownloadPopover({ visible, onClose, anchorLayout }: DownloadPopoverProps) {
    const { downloads, cancelDownload, removeDownload, clearAll, showInFolder, openFile } = useDownloads();

    if (!visible) return null;

    // Calculate position based on anchor if available, otherwise default to top right
    const top = anchorLayout ? anchorLayout.y + anchorLayout.height + 10 : 60;
    const right = anchorLayout ? 16 : 16; // Right margin

    // Prevent clicks inside the content from closing the modal
    const handleContentPress = (e: any) => {
        // e.stopPropagation(); // React Native doesn't have stopPropagation in the same way for Views inside Modal
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={handleContentPress}>
                        <View style={[styles.popover, { top, right: 16 }]}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Downloads</Text>
                                <TouchableOpacity onPress={clearAll}>
                                    <Text style={styles.clearText}>Clear all</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                                {downloads.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No recent downloads</Text>
                                    </View>
                                ) : (
                                    downloads.map(download => (
                                        <DownloadItem
                                            key={download.id}
                                            download={download}
                                            onCancel={cancelDownload}
                                            onRemove={removeDownload}
                                            onShowInFolder={showInFolder}
                                            onOpenFile={openFile}
                                        />
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)', // Slight dim for focus
    },
    popover: {
        position: 'absolute',
        width: 320,
        maxHeight: 400,
        backgroundColor: Colors.dark.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.dark.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border,
        backgroundColor: Colors.dark.background,
    },
    title: {
        color: Colors.dark.text,
        fontWeight: 'bold',
        fontSize: 14,
    },
    clearText: {
        color: Colors.dark.accent,
        fontSize: 12,
    },
    list: {
        maxHeight: 350,
    },
    listContent: {
        paddingBottom: 8,
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
    },
});
