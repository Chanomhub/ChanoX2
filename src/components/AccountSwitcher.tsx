import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';
import { router } from 'expo-router';

export default function AccountSwitcher() {
    const { user, accounts, switchAccount, logout } = useAuth();
    const [visible, setVisible] = useState(false);

    const handleSwitch = async (userId: number) => {
        await switchAccount(userId);
        setVisible(false);
    };

    const handleAddAccount = () => {
        setVisible(false);
        router.push('/login');
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
                        <Text style={styles.menuTitle}>Accounts</Text>

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
                            <Text style={styles.menuItemText}>+ Add Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: Colors.dark.surface,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    username: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: '600',
        marginRight: 8,
    },
    arrow: {
        color: Colors.dark.textSecondary,
        fontSize: 12,
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
        backgroundColor: Colors.dark.surface,
        borderRadius: 8,
        width: 250,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    menuTitle: {
        color: Colors.dark.textSecondary,
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
        backgroundColor: Colors.dark.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    avatarText: {
        color: Colors.dark.background,
        fontSize: 12,
        fontWeight: 'bold',
    },
    accountName: {
        color: Colors.dark.text,
        fontSize: 14,
        flex: 1,
    },
    activeAccountText: {
        fontWeight: 'bold',
        color: Colors.dark.accent,
    },
    activeIndicator: {
        color: Colors.dark.accent,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.dark.border,
        marginVertical: 8,
    },
    menuItem: {
        padding: 8,
        borderRadius: 4,
    },
    menuItemText: {
        color: Colors.dark.text,
        fontSize: 14,
    },
    logoutText: {
        color: Colors.dark.error,
    },
});
