import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { login as apiLogin, register as apiRegister, getCurrentUser, User, LoginCredentials, RegisterData } from '../api/auth';

interface AuthContextType {
    user: User | null;
    token: string | null;
    accounts: User[];
    loading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    switchAccount: (userId: number) => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCOUNTS_KEY = 'chanox2_accounts';
const ACTIVE_USER_ID_KEY = 'chanox2_active_user_id';
const LEGACY_TOKEN_KEY = 'chanox2_auth_token'; // For migration

// Platform-aware storage utilities
const storage = {
    async getItem(key: string): Promise<string | null> {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
            if (Platform.OS === 'web') {
                return localStorage.getItem(key);
            } else {
                // For native platforms, use expo-secure-store
                const SecureStore = await import('expo-secure-store');
                return await SecureStore.getItemAsync(key);
            }
        } catch (error) {
            console.error('Storage getItem error:', error);
            return null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
                return;
            }
            if (Platform.OS === 'web') {
                localStorage.setItem(key, value);
            } else {
                const SecureStore = await import('expo-secure-store');
                await SecureStore.setItemAsync(key, value);
            }
        } catch (error) {
            console.error('Storage setItem error:', error);
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
                return;
            }
            if (Platform.OS === 'web') {
                localStorage.removeItem(key);
            } else {
                const SecureStore = await import('expo-secure-store');
                await SecureStore.deleteItemAsync(key);
            }
        } catch (error) {
            console.error('Storage removeItem error:', error);
        }
    }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Load token and user on app start
    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);
            console.log(`Loading stored auth... Platform: ${Platform.OS}, Environment: ${isElectron ? 'Electron' : 'Web Browser'}`);
            // Try to load accounts list
            const storedAccountsJson = await storage.getItem(ACCOUNTS_KEY);
            console.log('Stored accounts JSON:', storedAccountsJson);
            let storedAccounts: User[] = [];

            if (storedAccountsJson) {
                const parsed = JSON.parse(storedAccountsJson);
                if (Array.isArray(parsed)) {
                    // Filter and normalize IDs to numbers, recover null IDs
                    storedAccounts = parsed
                        .filter(u => u)
                        .map((u, index) => {
                            let id = u.id;
                            if (id === null || id === undefined || (typeof id === 'number' && isNaN(id))) {
                                id = Date.now() + index; // Assign temp ID
                            } else {
                                id = Number(id);
                            }
                            return { ...u, id };
                        });
                }
                console.log('Parsed stored accounts:', storedAccounts);
            } else {
                console.log('No stored accounts found, checking legacy token...');
                // Migration: Check for legacy token
                const legacyToken = await storage.getItem(LEGACY_TOKEN_KEY);
                if (legacyToken) {
                    try {
                        const response = await getCurrentUser(legacyToken);
                        storedAccounts = [response.user];
                        // Save to new format
                        await storage.setItem(ACCOUNTS_KEY, JSON.stringify(storedAccounts));
                        await storage.setItem(ACTIVE_USER_ID_KEY, String(response.user.id));
                        // Remove legacy
                        await storage.removeItem(LEGACY_TOKEN_KEY);
                        console.log('Migrated legacy token to account:', response.user);
                    } catch (e) {
                        console.error('Legacy token migration failed:', e);
                        // Legacy token invalid
                        await storage.removeItem(LEGACY_TOKEN_KEY);
                    }
                }
            }

            setAccounts(storedAccounts);

            // Load active user
            const activeUserIdStr = await storage.getItem(ACTIVE_USER_ID_KEY);
            console.log('Active user ID string:', activeUserIdStr);

            if (activeUserIdStr && storedAccounts.length > 0) {
                const activeUserId = parseInt(activeUserIdStr, 10);
                const activeAccount = storedAccounts.find(u => u.id === activeUserId);

                if (activeAccount) {
                    console.log('Restoring active account:', activeAccount.username);
                    // Verify token (optional, but good practice)
                    try {
                        // We could verify here, but for offline support/speed we might skip
                        // or do it in background. For now, let's trust it and maybe refresh in background.
                        // const response = await getCurrentUser(activeAccount.token);
                        // setUser(response.user); // Update with latest info
                        setUser(activeAccount);
                        setToken(activeAccount.token);
                    } catch (e) {
                        console.error('Failed to verify active user token', e);
                        // If token is invalid, maybe we should prompt login?
                        // For now, keep the user but they might get 401s later.
                        setUser(activeAccount);
                        setToken(activeAccount.token);
                    }
                } else {
                    console.log('Active user not found in accounts, defaulting to first');
                    // Active user not found in accounts, default to first
                    const firstAccount = storedAccounts[0];
                    setUser(firstAccount);
                    setToken(firstAccount.token);
                    await storage.setItem(ACTIVE_USER_ID_KEY, String(firstAccount.id));
                }
            } else if (storedAccounts.length > 0) {
                console.log('No active user set, defaulting to first');
                // No active user set, default to first
                const firstAccount = storedAccounts[0];
                setUser(firstAccount);
                setToken(firstAccount.token);
                await storage.setItem(ACTIVE_USER_ID_KEY, String(firstAccount.id));
            } else {
                console.log('No accounts to restore');
            }
        } catch (error) {
            console.error('Failed to load auth:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveAccounts = async (newAccounts: User[], activeUser: User) => {
        console.log('Saving accounts:', newAccounts.length, 'Active:', activeUser.username);
        setAccounts(newAccounts);
        setUser(activeUser);
        setToken(activeUser.token);
        await storage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts));
        await storage.setItem(ACTIVE_USER_ID_KEY, String(activeUser.id));
        console.log('Accounts saved to storage');
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            const response = await apiLogin(credentials);
            console.log('Login response user:', response.user);

            // Ensure ID is a number, fallback to random if missing
            const userId = response.user.id ? Number(response.user.id) : Date.now();
            const newUser = { ...response.user, id: isNaN(userId) ? Date.now() : userId };

            // Add or update user in accounts list
            const otherAccounts = accounts.filter(a => a.email !== newUser.email); // Use email for dedup if ID is unreliable
            const newAccounts = [...otherAccounts, newUser];

            await saveAccounts(newAccounts, newUser);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (data: RegisterData) => {
        try {
            const response = await apiRegister(data);
            console.log('Register response user:', response.user);

            // Ensure ID is a number, fallback to random if missing
            const userId = response.user.id ? Number(response.user.id) : Date.now();
            const newUser = { ...response.user, id: isNaN(userId) ? Date.now() : userId };

            // Add or update user in accounts list
            const otherAccounts = accounts.filter(a => a.email !== newUser.email);
            const newAccounts = [...otherAccounts, newUser];

            await saveAccounts(newAccounts, newUser);
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            if (!user) return;

            // Remove current user from accounts
            const newAccounts = accounts.filter(a => a.id !== user.id);
            setAccounts(newAccounts);
            await storage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts));

            if (newAccounts.length > 0) {
                // Switch to another account (e.g., the first one)
                const nextUser = newAccounts[0];
                setUser(nextUser);
                setToken(nextUser.token);
                await storage.setItem(ACTIVE_USER_ID_KEY, String(nextUser.id));
            } else {
                // No accounts left
                setUser(null);
                setToken(null);
                await storage.removeItem(ACTIVE_USER_ID_KEY);
                // Also clear legacy if exists, just in case
                await storage.removeItem(LEGACY_TOKEN_KEY);
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const switchAccount = async (userId: number) => {
        const targetUser = accounts.find(a => a.id === userId);
        if (targetUser) {
            setUser(targetUser);
            setToken(targetUser.token);
            await storage.setItem(ACTIVE_USER_ID_KEY, String(targetUser.id));
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                accounts,
                loading,
                login,
                register,
                logout,
                switchAccount,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
