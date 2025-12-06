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
    roles: string[];
}

export interface AuthResponse {
    user: User;
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

    return response.json();
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

    return response.json();
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

    return response.json();
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

    return response.json();
}
