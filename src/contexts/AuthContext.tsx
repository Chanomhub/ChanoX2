import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, loginWithSupabaseToken, User, LoginCredentials, RegisterData } from '../libs/api/auth';
import { supabase, isSupabaseConfigured } from '../libs/supabase';

interface AuthContextType {
    user: User | null;
    token: string | null;
    accounts: User[];
    loading: boolean;
    loginVersion: number; // Increments on every successful login
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    switchAccount: (userId: number) => Promise<void>;
    isAuthenticated: boolean;
    loginWithGoogle: () => Promise<void>;
    handleSupabaseCallback: (accessToken: string) => Promise<void>;
    isSupabaseAvailable: boolean;
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

    useEffect(() => {
        console.log('AuthProvider mounted');
        loadStoredAuth();

        // Supabase auth state listener (for web browser flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Optional: Handle auto-login from Supabase callback if not handled by explicit flow
            }
        });

        // Electron OAuth callback listener
        let cleanupOAuth: (() => void) | void;
        if (window.electronAPI?.onOAuthCallback) {
            console.log('Setting up Electron OAuth callback listener');
            cleanupOAuth = window.electronAPI.onOAuthCallback(async (data) => {
                console.log('OAuth callback received from Electron');
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

        const isElectron = !!window.electronAPI;

        if (isElectron) {
            // Electron: Open OAuth in external browser
            try {
                console.log('Starting OAuth server for Electron...');
                const { port } = await window.electronAPI!.startOAuthServer();
                const redirectUrl = `http://localhost:${port}/callback`;

                console.log('OAuth redirect URL:', redirectUrl);

                // Get OAuth URL with skipBrowserRedirect
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: redirectUrl,
                        skipBrowserRedirect: true,
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'select_account', // Let user pick account
                        },
                    },
                });

                if (error) throw error;

                if (data?.url) {
                    console.log('Opening OAuth URL in external browser');
                    window.electronAPI!.openExternal(data.url);
                }
                // Callback will be handled via IPC event listener
                return;
            } catch (err) {
                console.error('Electron OAuth failed, falling back to in-app:', err);
                // Fall through to web flow
            }
        }

        // Web: Standard in-app OAuth redirect
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/callback',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) throw error;
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
            switchAccount,
            isAuthenticated: !!user,
            loginWithGoogle,
            handleSupabaseCallback,
            isSupabaseAvailable: isSupabaseConfigured()
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
