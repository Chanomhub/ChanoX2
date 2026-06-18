import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, getCurrentUser, logout as apiLogout, logoutAll as apiLogoutAll, User, LoginCredentials, RegisterData } from '../libs/api/auth';

import { setToken as sdkSetToken } from '../libs/sdk';

interface AuthContextType {
    user: User | null;
    token: string | null;
    accounts: User[];
    loading: boolean;
    loginVersion: number; // Increments on every successful login
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    logoutAll: () => Promise<void>;
    switchAccount: (userId: number) => Promise<void>;
    isAuthenticated: boolean;
    loginWithGoogle: () => Promise<void>;
    handleExchangeCallback: (accessToken: string, refreshToken?: string, expiresIn?: number) => Promise<void>;
    refreshSession: () => Promise<string | null>;
    oauthUrl: string | null; // OAuth URL for manual copy (GNOME fallback)
    clearOAuthUrl: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCOUNTS_KEY = 'chanox2_accounts';
const ACTIVE_USER_ID_KEY = 'chanox2_active_user_id';

// Universal Storage (Electron IPC or LocalStorage)
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (window.electronAPI) {
            return await window.electronAPI.getAuthData(key);
        }
        return localStorage.getItem(key);
    },
    async setItem(key: string, value: string): Promise<void> {
        if (window.electronAPI) {
            await window.electronAPI.saveAuthData(key, value);
        } else {
            localStorage.setItem(key, value);
        }
    },
    async removeItem(key: string): Promise<void> {
        if (window.electronAPI) {
            await window.electronAPI.removeAuthData(key);
        } else {
            localStorage.removeItem(key);
        }
    }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [loginVersion, setLoginVersion] = useState(0);
    const [oauthUrl, setOAuthUrl] = useState<string | null>(null);

    const clearOAuthUrl = useCallback(() => setOAuthUrl(null), []);



    const handleExchangeCallback = useCallback(async (accessToken: string, refreshToken?: string, expiresIn?: number) => {
        const response = await getCurrentUser(accessToken);
        const userId = response.user.id ? Number(response.user.id) : Date.now();
        const newUser = {
            ...response.user,
            id: isNaN(userId) ? Date.now() : userId,
            token: accessToken,
            refreshToken: refreshToken || response.refreshToken,
            tokenExpiresAt: expiresIn ? Date.now() + (expiresIn * 1000) : (response.expiresIn ? Date.now() + (response.expiresIn * 1000) : undefined)
        };

        // Read fresh accounts from storage (important for OAuth callback scenario)
        let currentAccounts: User[] = [];
        const storedAccountsJson = await storage.getItem(ACCOUNTS_KEY);
        if (storedAccountsJson) {
            try {
                currentAccounts = JSON.parse(storedAccountsJson);
            } catch (e) {
                console.error('Failed to parse stored accounts', e);
            }
        }

        const otherAccounts = currentAccounts.filter(a => a.email !== newUser.email);
        const newAccounts = [...otherAccounts, newUser];

        setAccounts(newAccounts);
        setUser(newUser);
        setToken(newUser.token);
        setLoginVersion(v => v + 1);
        await storage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts));
        await storage.setItem(ACTIVE_USER_ID_KEY, String(newUser.id));
        console.log('Exchange user saved. Total accounts:', newAccounts.length);
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedAccountsJson = await storage.getItem(ACCOUNTS_KEY);
            let storedAccounts: User[] = [];

            if (storedAccountsJson) {
                try {
                    storedAccounts = JSON.parse(storedAccountsJson);
                } catch (e) {
                    console.error('Failed to parse stored accounts', e);
                }
            }

            setAccounts(storedAccounts);

            const activeUserIdStr = await storage.getItem(ACTIVE_USER_ID_KEY);
            if (activeUserIdStr && storedAccounts.length > 0) {
                const activeUserId = Number(activeUserIdStr);
                const activeAccount = storedAccounts.find(u => u.id === activeUserId);
                if (activeAccount) {
                    setUser(activeAccount);
                    setToken(activeAccount.token);
                } else {
                    setUser(storedAccounts[0]);
                    setToken(storedAccounts[0].token);
                }
            } else if (storedAccounts.length > 0) {
                setUser(storedAccounts[0]);
                setToken(storedAccounts[0].token);
            }
        } catch (error) {
            console.error('Failed to load auth', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshSession = useCallback(async (): Promise<string | null> => {
        if (!user?.refreshToken) return null;

        try {
            const { refreshAccessToken } = await import('../libs/api/auth');
            const response = await refreshAccessToken(user.refreshToken);

            const updatedUser = {
                ...user,
                token: response.token,
                refreshToken: response.refreshToken || user.refreshToken,
            };

            const otherAccounts = accounts.filter(a => a.id !== user.id);
            const newAccounts = [...otherAccounts, updatedUser];

            await saveAccounts(newAccounts, updatedUser);
            return response.token;
        } catch (error) {
            console.error('Failed to refresh session', error);
            // If refresh fails, we might want to log out or just return null
            return null;
        }
    }, [user, accounts]);

    useEffect(() => {
        sdkSetToken(token);
        if (token) {
            (async () => {
                const { client } = await import('../libs/api/client');
                client.setHeader('Authorization', `Bearer ${token}`);
                client.setRefreshHandler(refreshSession);
            })();
        }
    }, [token, refreshSession]);

    useEffect(() => {
        loadStoredAuth();

        // Electron OAuth callback listener
        let cleanupOAuth: (() => void) | void;
        if (window.electronAPI?.onOAuthCallback) {
            console.log('Setting up Electron OAuth callback listener');
            cleanupOAuth = window.electronAPI.onOAuthCallback(async (data) => {
                console.log('OAuth callback received from Electron');
                if (data.accessToken) {
                    try {
                        await handleExchangeCallback(data.accessToken, data.refreshToken);
                    } catch (error) {
                        console.error('Failed to process OAuth callback:', error);
                    }
                }
            });
        }

        return () => {
            if (cleanupOAuth) cleanupOAuth();
        };
    }, [handleExchangeCallback]);

    const saveAccounts = async (newAccounts: User[], activeUser: User) => {
        setAccounts(newAccounts);
        setUser(activeUser);
        setToken(activeUser.token);
        await storage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts));
        await storage.setItem(ACTIVE_USER_ID_KEY, String(activeUser.id));
    };

    const login = async (credentials: LoginCredentials) => {
        const response = await apiLogin(credentials);
        const userId = response.user.id ? Number(response.user.id) : Date.now();
        const newUser = {
            ...response.user,
            id: isNaN(userId) ? Date.now() : userId,
            refreshToken: response.refreshToken,
            tokenExpiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : undefined
        };

        const otherAccounts = accounts.filter(a => a.email !== newUser.email);
        const newAccounts = [...otherAccounts, newUser];
        await saveAccounts(newAccounts, newUser);
    };

    const register = async (data: RegisterData) => {
        const response = await apiRegister(data);
        const userId = response.user.id ? Number(response.user.id) : Date.now();
        const newUser = {
            ...response.user,
            id: isNaN(userId) ? Date.now() : userId,
            refreshToken: response.refreshToken,
            tokenExpiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : undefined
        };

        const otherAccounts = accounts.filter(a => a.email !== newUser.email);
        const newAccounts = [...otherAccounts, newUser];
        await saveAccounts(newAccounts, newUser);
    };

    const logout = async () => {
        if (!user) return;

        // Call backend logout if possible
        if (user.refreshToken) {
            try {
                await apiLogout(user.refreshToken);
            } catch (e) {
                console.warn('Backend logout failed', e);
            }
        }

        const newAccounts = accounts.filter(a => a.id !== user.id);
        setAccounts(newAccounts);
        await storage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts));

        if (newAccounts.length > 0) {
            const nextUser = newAccounts[0];
            setUser(nextUser);
            setToken(nextUser.token);
            await storage.setItem(ACTIVE_USER_ID_KEY, String(nextUser.id));
        } else {
            setUser(null);
            setToken(null);
            await storage.removeItem(ACTIVE_USER_ID_KEY);
        }
    };

    const logoutAll = async () => {
        if (!user) return;

        // Call backend logout-all
        if (user.refreshToken) {
            try {
                await apiLogoutAll(user.refreshToken);
            } catch (e) {
                console.warn('Backend logout-all failed', e);
            }
        }

        // Clear all local auth data
        setAccounts([]);
        setUser(null);
        setToken(null);
        await storage.removeItem(ACCOUNTS_KEY);
        await storage.removeItem(ACTIVE_USER_ID_KEY);
    };

    const switchAccount = async (userId: number) => {
        const targetUser = accounts.find(a => a.id === userId);
        if (targetUser) {
            setUser(targetUser);
            setToken(targetUser.token);
            await storage.setItem(ACTIVE_USER_ID_KEY, String(targetUser.id));
        }
    };

    const loginWithGoogle = async () => {
        const isElectron = !!window.electronAPI;
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.chanomhub.com';

        if (isElectron) {
            // Electron: Open OAuth in external browser
            try {
                console.log('Starting OAuth server for Electron...');
                const { port } = await window.electronAPI!.startOAuthServer({ apiBaseUrl });
                const redirectUrl = `http://localhost:${port}/callback`;

                console.log('OAuth redirect URL:', redirectUrl);

                const url = `${apiBaseUrl}/api/auth/login/social?provider=google&callbackURL=${encodeURIComponent(redirectUrl)}`;

                console.log('Opening OAuth URL in external browser');
                // Store URL for manual copy fallback (GNOME may not open browser)
                setOAuthUrl(url);
                window.electronAPI!.openExternal(url);
                return;
            } catch (err) {
                console.error('Electron OAuth failed, falling back to in-app:', err);
                // Fall through to web flow
            }
        }

        // Web: Standard in-app OAuth redirect
        const redirectUrl = `${window.location.origin}/callback`;
        const url = `${apiBaseUrl}/api/auth/login/social?provider=google&callbackURL=${encodeURIComponent(redirectUrl)}`;

        window.location.href = url;
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            accounts,
            loading,
            loginVersion,
            login,
            register,
            logout,
            logoutAll,
            switchAccount,
            isAuthenticated: !!user,
            loginWithGoogle,
            handleExchangeCallback,
            refreshSession,
            oauthUrl,
            clearOAuthUrl,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
