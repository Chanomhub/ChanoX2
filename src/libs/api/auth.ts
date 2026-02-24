// Authentication API functions for ChanomHub
const API_BASE = 'https://api.chanomhub.com/api';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
}

export interface User {
    id: number;
    email: string;
    username: string;
    bio?: string;
    image?: string;
    backgroundImage?: string;
    points: number;
    token: string;
    refreshToken?: string;
    tokenExpiresAt?: number;
    roles: string[];
    shrtflyApiKey?: string;
    socialMediaLinks?: any[]; // user provided json
}

export interface AuthResponse {
    user: User;
    refreshToken?: string;
    expiresIn?: number;
}

export interface RefreshResponse {
    token: string;
    refreshToken?: string;
}

export interface ApiResponse<T> {
    data: T;
    statusCode: number;
    timestamp: string;
}

/**
 * Login user with email and password
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user: credentials,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
    }

    const json: ApiResponse<AuthResponse> = await response.json();
    return json.data;
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user: data,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
    }

    const json: ApiResponse<AuthResponse> = await response.json();
    return json.data;
}

/**
 * Get current user info (requires token)
 */
export async function getCurrentUser(token: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/user`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to get user info');
    }

    const json: ApiResponse<AuthResponse> = await response.json();
    // Assuming /user endpoint also follows the new structure
    return json.data || json; // Fallback if structure differs
}

/**
 * Update current user
 */
export async function updateUser(token: string, userData: Partial<User>): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/user`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            user: userData,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to update user');
    }

    const json: ApiResponse<AuthResponse> = await response.json();
    return json.data || json;
}

/**
 * Login with Supabase access token (for SSO)
 * This exchanges the Supabase token with the backend to get an internal user
 */
export async function loginWithSupabaseToken(supabaseAccessToken: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/users/login-supabase`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            accessToken: supabaseAccessToken,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Supabase login failed' }));
        throw new Error(error.message || 'Supabase login failed');
    }

    const json: ApiResponse<AuthResponse> = await response.json();
    return json.data;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refreshToken,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Token refresh failed' }));
        throw new Error(error.message || 'Token refresh failed');
    }

    const json: ApiResponse<RefreshResponse> = await response.json();
    return json.data;
}

/**
 * Logout from current session
 */
export async function logout(refreshToken: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refreshToken,
        }),
    });

    if (!response.ok) {
        console.warn('Logout failed on backend');
    }
}

/**
 * Logout from all devices
 */
export async function logoutAll(refreshToken: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/logout-all`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refreshToken,
        }),
    });

    if (!response.ok) {
        console.warn('Logout-all failed on backend');
    }
}
