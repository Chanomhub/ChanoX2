import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { login as apiLogin, register as apiRegister, getCurrentUser, User, LoginCredentials, RegisterData } from '../api/auth';

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'chanox2_auth_token';

// Platform-aware storage utilities
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            return localStorage.getItem(key);
        } else {
            // For native platforms, use expo-secure-store
            const SecureStore = await import('expo-secure-store');
            return await SecureStore.getItemAsync(key);
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.setItem(key, value);
        } else {
            const SecureStore = await import('expo-secure-store');
            await SecureStore.setItemAsync(key, value);
        }
    },

    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            localStorage.removeItem(key);
        } else {
            const SecureStore = await import('expo-secure-store');
            await SecureStore.deleteItemAsync(key);
        }
    }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load token and user on app start
    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const storedToken = await storage.getItem(TOKEN_KEY);
            if (storedToken) {
                // Verify token and get user info
                const response = await getCurrentUser(storedToken);
                setUser(response.user);
                setToken(storedToken);
            }
        } catch (error) {
            console.error('Failed to load auth:', error);
            // Clear invalid token
            await storage.removeItem(TOKEN_KEY);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            const response = await apiLogin(credentials);
            setUser(response.user);
            setToken(response.user.token);
            await storage.setItem(TOKEN_KEY, response.user.token);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (data: RegisterData) => {
        try {
            const response = await apiRegister(data);
            setUser(response.user);
            setToken(response.user.token);
            await storage.setItem(TOKEN_KEY, response.user.token);
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await storage.removeItem(TOKEN_KEY);
            setUser(null);
            setToken(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                register,
                logout,
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
