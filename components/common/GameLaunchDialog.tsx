import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface LaunchOption {
    path: string;
    type: string;
}

interface GameLaunchConfig {
    executablePath: string;
    useWine: boolean;
    args?: string[];
    locale?: string;
}

interface GameLaunchDialogProps {
    visible: boolean;
    onClose: () => void;
    onSaveAndPlay: (config: GameLaunchConfig) => void;
    initialConfig?: GameLaunchConfig | null;
    scanResults: LaunchOption[];
    gameTitle: string;
}

export default function GameLaunchDialog({
    visible,
    onClose,
    onSaveAndPlay,
    initialConfig,
    scanResults,
    gameTitle
}: GameLaunchDialogProps) {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [useWine, setUseWine] = useState(false);
    const [args, setArgs] = useState('');
    const [locale, setLocale] = useState('');

    useEffect(() => {
        if (initialConfig) {
            setSelectedPath(initialConfig.executablePath);
            setUseWine(initialConfig.useWine);
            setArgs(initialConfig.args ? initialConfig.args.join(' ') : '');
            setLocale(initialConfig.locale || '');
        } else if (scanResults.length > 0) {
            // Default to first result
            setSelectedPath(scanResults[0].path);
            // Auto-detect wine needed? (e.g. if linux and .exe)
            // React Native 'web' platform check + userAgent for Linux
            const isLinux = Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.userAgent.indexOf("Linux") !== -1;

            if (isLinux) {
                if (scanResults[0].type === 'windows-exe') {
                    setUseWine(true);
                }
            }
        }
    }, [initialConfig, scanResults, visible]);

    // Explicitly handle Linux check for component logic
    const isLinux = Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.userAgent.indexOf("Linux") !== -1;

    const handleSave = () => {
        if (selectedPath) {
            onSaveAndPlay({
                executablePath: selectedPath,
                useWine: useWine,
                args: args.trim().length > 0 ? args.trim().split(' ') : [],
                locale: locale.trim() || undefined
            });
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'windows-exe': return 'logo-windows';
            case 'mac-app': return 'logo-apple';
            case 'native-binary': return 'terminal';
            default: return 'document-text';
        }
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
                    <View style={styles.header}>
                        <Text style={styles.title}>Launch Options: {gameTitle}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionLabel}>Select Executable</Text>
                    <ScrollView style={styles.listContainer}>
                        {scanResults.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.optionItem,
                                    selectedPath === option.path && styles.optionSelected
                                ]}
                                onPress={() => {
                                    setSelectedPath(option.path);
                                    if (option.type === 'windows-exe') setUseWine(true);
                                    else setUseWine(false);
                                }}
                            >
                                <Ionicons name={getIconForType(option.type) as any} size={20} color="#dcdedf" />
                                <Text style={styles.optionText} numberOfLines={1} ellipsizeMode="middle">
                                    {option.path.split(/[/\\]/).pop()}
                                    <Text style={styles.pathHint}> ({option.path})</Text>
                                </Text>
                                {selectedPath === option.path && (
                                    <Ionicons name="checkmark-circle" size={20} color={Colors.dark.accent} />
                                )}
                            </TouchableOpacity>
                        ))}
                        {scanResults.length === 0 && (
                            <Text style={styles.noResults}>No executables found. Please verify game files.</Text>
                        )}
                    </ScrollView>

                    {/* Options Section */}
                    <View style={styles.optionsSection}>
                        <Text style={styles.sectionLabel}>Launch Arguments</Text>
                        <TextInput
                            style={styles.input}
                            value={args}
                            onChangeText={setArgs}
                            placeholder="e.g. -windowed -noborder"
                            placeholderTextColor="#6e7681"
                        />

                        <Text style={styles.sectionLabel}>Locale Code (e.g. ja_JP.UTF-8)</Text>
                        <TextInput
                            style={styles.input}
                            value={locale}
                            onChangeText={setLocale}
                            placeholder="e.g. ja_JP.UTF-8"
                            placeholderTextColor="#6e7681"
                        />

                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setUseWine(!useWine)}
                        >
                            <View style={[styles.checkbox, useWine && styles.checkboxChecked]}>
                                {useWine && <Ionicons name="checkmark" size={14} color="#000" />}
                            </View>
                            <Text style={styles.checkboxLabel}>Run with Wine (Linux Compatibility)</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.playButton, !selectedPath && styles.playButtonDisabled]}
                            onPress={handleSave}
                            disabled={!selectedPath}
                        >
                            <Text style={styles.playButtonText}>Save & Play</Text>
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
    },
    dialog: {
        width: 500,
        backgroundColor: '#1b2838',
        borderRadius: 4,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2a475e',
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionLabel: {
        color: '#8b929a',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    listContainer: {
        maxHeight: 200,
        backgroundColor: '#101214',
        borderRadius: 2,
        marginBottom: 20,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2e36',
        gap: 10,
    },
    optionSelected: {
        backgroundColor: '#2a475e',
    },
    optionText: {
        flex: 1,
        color: '#dcdedf',
        fontSize: 14,
    },
    pathHint: {
        color: '#6e7681',
        fontSize: 12,
    },
    noResults: {
        padding: 20,
        color: '#8b929a',
        textAlign: 'center',
    },
    optionsSection: {
        marginBottom: 20,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkbox: {
        width: 18,
        height: 18,
        backgroundColor: '#3d4450',
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: Colors.dark.accent,
    },
    checkboxLabel: {
        color: '#dcdedf',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 15,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    cancelButtonText: {
        color: '#dcdedf',
        fontSize: 14,
    },
    playButton: {
        backgroundColor: '#4cff00',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 2,
    },
    playButtonDisabled: {
        backgroundColor: '#3d4450',
        opacity: 0.5,
    },
    playButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#101214',
        color: '#dcdedf',
        padding: 10,
        borderRadius: 2,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#2a2e36',
    },
});
