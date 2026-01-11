/**
 * Chanomhub SDK Instance
 * Shared SDK client for the entire application
 */
import { createChanomhubClient, createAuthenticatedClient, type ChanomhubClient } from '@chanomhub/sdk';
import { transformImageUrls } from '@/libs/image';

// Supabase configuration from env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Base config for SDK
const baseConfig = {
    apiUrl: 'https://api.chanomhub.com',
    supabaseUrl,
    supabaseAnonKey,
};

// Create a single SDK instance for the app with Auth support
const sdk = createChanomhubClient(baseConfig);

/**
 * Set authentication token for the SDK
 * Call this when user logs in or token changes
 */
export function setToken(token: string | null) {
    if (token) {
        sdk.config.token = token;
    } else {
        sdk.config.token = undefined;
    }
}

/**
 * Create an authenticated SDK client with a specific token
 * Use this for one-off authenticated requests
 */
export function getAuthenticatedClient(token: string): ChanomhubClient {
    return createAuthenticatedClient(token, baseConfig);
}

/**
 * Wrapper that applies image URL transformation to any data object
 */
export function withImageTransform<T>(data: T): T {
    return transformImageUrls(data);
}

export { sdk, createAuthenticatedClient };
export type { ChanomhubClient };
