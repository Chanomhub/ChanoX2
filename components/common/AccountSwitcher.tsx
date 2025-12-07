import React, { useState, useMemo } from 'react';
import { Platform, View, Text, TouchableOpacity, Modal, StyleSheet, FlatList } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useFestival } from '@/contexts/FestivalContext';
import { router } from 'expo-router';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from 'react-i18next';

export default function AccountSwitcher({ compact = false }: { compact?: boolean }) {
    const { user, accounts, switchAccount, logout } = useAuth();
    const { theme } = useFestival();
    const { openSettings } = useSettingsStore();
    const { t } = useTranslation(['common', 'auth']);
    const [visible, setVisible] = useState(false);

    const styles = useMemo(() => StyleSheet.create({
        trigger: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: compact ? 4 : 8,
            backgroundColor: compact ? 'transparent' : theme.surface,
            borderRadius: 4,
            borderWidth: compact ? 0 : 1,
            borderColor: theme.border,
        },
        username: {
            color: theme.text,
            fontSize: compact ? 12 : 14,
            fontWeight: '600',
            marginRight: compact ? 4 : 8,
        },
        arrow: {
            color: theme.textSecondary,
            fontSize: compact ? 10 : 12,
        },
        overlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-start',
            alignItems: 'flex-end',
            paddingTop: 60,
            paddingRight: 16,
        },
        menu: {
            backgroundColor: theme.surface,
            borderRadius: 8,
            width: 250,
            padding: 8,
            ...Platform.select({
                ios: {
                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                },
                android: {
                    elevation: 5,
                },
                web: {
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
                },
            }),
            borderWidth: 1,
            borderColor: theme.border,
        },
        menuTitle: {
            color: theme.textSecondary,
            fontSize: 12,
            fontWeight: 'bold',
            marginBottom: 8,
            paddingHorizontal: 8,
            textTransform: 'uppercase',
        },
        list: {
            maxHeight: 200,
        },
        accountItem: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
            borderRadius: 4,
        },
        activeAccount: {
            backgroundColor: 'rgba(102, 192, 244, 0.1)',
        },
        avatarPlaceholder: {
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: theme.accent,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 8,
        },
        avatarText: {
            color: theme.background,
            fontSize: 12,
            fontWeight: 'bold',
        },
        accountName: {
            color: theme.text,
            fontSize: 14,
            flex: 1,
        },
        activeAccountText: {
            fontWeight: 'bold',
            color: theme.accent,
        },
        activeIndicator: {
            color: theme.accent,
            fontWeight: 'bold',
        },
        divider: {
            height: 1,
            backgroundColor: theme.border,
            marginVertical: 8,
        },
        menuItem: {
            padding: 8,
            borderRadius: 4,
        },
        menuItemText: {
            color: theme.text,
            fontSize: 14,
        },
        logoutText: {
            color: theme.error,
        },
    }), [theme]);

    const handleSwitch = async (userId: number) => {
        await switchAccount(userId);
        setVisible(false);
    };

    const handleAddAccount = () => {
        setVisible(false);
        router.push('/login');
    };

    const handleSettings = () => {
        setVisible(false);
        openSettings();
    };

    const handleLogout = async () => {
        await logout();
        // If no accounts left, the auth context will handle state, 
        // and the parent component might redirect or show login button.
        if (accounts.length <= 1) {
            setVisible(false);
        }
    };

    if (!user) return null;

    return (
        <>
            <TouchableOpacity onPress={() => setVisible(true)} style={styles.trigger}>
                <Text style={styles.username}>{user.username}</Text>
                <Text style={styles.arrow}>▼</Text>
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                >
                    <View style={styles.menu}>
                        <Text style={styles.menuTitle}>{t('accounts', { ns: 'auth' })}</Text>

                        <FlatList
                            data={accounts}
                            keyExtractor={(item) => item?.id?.toString() || `account-${Math.random()}`}
                            style={styles.list}
                            renderItem={({ item }) => {
                                if (!item || !item.id) return null;
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.accountItem,
                                            item.id === user.id && styles.activeAccount
                                        ]}
                                        onPress={() => handleSwitch(item.id)}
                                    >
                                        <View style={styles.avatarPlaceholder}>
                                            <Text style={styles.avatarText}>
                                                {item.username.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={[
                                            styles.accountName,
                                            item.id === user.id && styles.activeAccountText
                                        ]}>
                                            {item.username}
                                        </Text>
                                        {item.id === user.id && (
                                            <Text style={styles.activeIndicator}>✓</Text>
                                        )}
                                    </TouchableOpacity>
                                )
                            }}
                        />

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.menuItem} onPress={handleAddAccount}>
                            <Text style={styles.menuItemText}>+ {t('add_account', { ns: 'auth' })}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                            <Text style={styles.menuItemText}>{t('settings')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <Text style={[styles.menuItemText, styles.logoutText]}>{t('logout', { ns: 'auth' })}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}
