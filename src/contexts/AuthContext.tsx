import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, loginWithSupabaseToken, logout as apiLogout, logoutAll as apiLogoutAll, User, LoginCredentials, RegisterData } from '../libs/api/auth';

import { supabase, isSupabaseConfigured } from '../libs/supabase';
import { sdk, setToken as sdkSetToken } from '../libs/sdk';
import { native } from '@/lib/native';

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
    handleSupabaseCallback: (accessToken: string) => Promise<void>;
    refreshSession: () => Promise<string | null>;
    isSupabaseAvailable: boolean;
    oauthUrl: string | null; // OAuth URL for manual copy (GNOME fallback)
    clearOAuthUrl: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCOUNTS_KEY = 'chanox2_accounts';
const ACTIVE_USER_ID_KEY = 'chanox2_active_user_id';

// Universal Storage — delegates to the active native adapter
const storage = {
    async getItem(key: string): Promise<string | null> {
        return await native.storage.getAuthData(key);
    },
    async setItem(key: string, value: string): Promise<void> {
        await native.storage.saveAuthData(key, value);
    },
    async removeItem(key: string): Promise<void> {
        await native.storage.removeAuthData(key);
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

    // handleSupabaseCallback - exchanges Supabase token with backend
    const handleSupabaseCallback = useCallback(async (accessToken: string) => {
        const response = await loginWithSupabaseToken(accessToken);
        const userId = response.user.id ? Number(response.user.id) : Date.now();
        const newUser = {
            ...response.user,
            id: isNaN(userId) ? Date.now() : userId,
            refreshToken: response.refreshToken,
            tokenExpiresAt: response.expiresIn ? Date.now() + (response.expiresIn * 1000) : undefined
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
        setLoginVersion(v => {
            console.log('loginVersion incrementing from', v, 'to', v + 1);
            return v + 1;
        });
        await storage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts));
        await storage.setItem(ACTIVE_USER_ID_KEY, String(newUser.id));
        console.log('OAuth user saved. Total accounts:', newAccounts.length);
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

        // Supabase auth state listener (for web browser flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Optional: Handle auto-login from Supabase callback if not handled by explicit flow
            }
        });

        // OAuth callback listener via native adapter
        let cleanupOAuth: (() => void) | void;
        if (native.isDesktop) {
            console.log('Setting up OAuth callback listener');
            cleanupOAuth = native.oauth.onOAuthCallback(async (data) => {
                console.log('OAuth callback received');
                if (data.accessToken) {
                    try {
                        await handleSupabaseCallback(data.accessToken);
                    } catch (error) {
                        console.error('Failed to process OAuth callback:', error);
                    }
                }
            });
        }

        return () => {
            subscription.unsubscribe();
            if (cleanupOAuth) cleanupOAuth();
        };
    }, [handleSupabaseCallback]);

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
        await supabase.auth.signOut();
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
        await supabase.auth.signOut();
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
        if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

        if (native.isDesktop) {
            // Desktop: Open OAuth in external browser
            try {
                console.log('Starting OAuth server...');
                const { port } = await native.oauth.startOAuthServer();
                const redirectUrl = `http://localhost:${port}/callback`;

                console.log('OAuth redirect URL:', redirectUrl);

                // Get OAuth URL from SDK
                const url = await sdk.auth.getOAuthUrl('google', {
                    redirectTo: redirectUrl,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'select_account',
                    },
                });

                if (url) {
                    console.log('Opening OAuth URL in external browser');
                    // Store URL for manual copy fallback (GNOME may not open browser)
                    setOAuthUrl(url);
                    native.shell.openExternal(url);
                }
                // Callback will be handled via event listener
                return;
            } catch (err) {
                console.error('Desktop OAuth failed, falling back to in-app:', err);
                // Fall through to web flow
            }
        }

        // Web: Standard in-app OAuth redirect
        const url = await sdk.auth.getOAuthUrl('google', {
            redirectTo: window.location.origin + '/callback',
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        });

        if (url) {
            window.location.href = url;
        }
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
            handleSupabaseCallback,
            refreshSession,
            isSupabaseAvailable: isSupabaseConfigured(),
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
