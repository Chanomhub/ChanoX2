/**
 * Chanomhub SDK Instance
 * Shared SDK client for the entire application
 */
import { createChanomhubClient, createAuthenticatedClient, getFallbackUrl, type ChanomhubClient } from '@chanomhub/sdk';
import { transformDataUrls } from '@/libs/transform';

// Base config for SDK — override with VITE_API_URL for local backend testing
const baseConfig = {
    apiUrl: import.meta.env.VITE_API_URL ?? 'https://api.chanomhub.com',
    storageDownloadUrl: 'https://storage.chanomhub.com',
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
 * Wrapper that applies data URL transformation (images and downloads) to any data object
 */
export function withDataTransform<T>(data: T): T {
    return transformDataUrls(data);
}

/**
 * Legacy alias for withDataTransform
 */
export const withImageTransform = withDataTransform;

export { sdk, createAuthenticatedClient, getFallbackUrl };
export type { ChanomhubClient };
