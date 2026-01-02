/**
 * Chanomhub SDK Instance
 * Shared SDK client for the entire application
 */
import { createChanomhubClient, type ChanomhubClient } from '@chanomhub/sdk';
import { transformImageUrls } from '@/libs/image';

// Supabase configuration from env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a single SDK instance for the app with Auth support
const sdk = createChanomhubClient({
    apiUrl: 'https://api.chanomhub.com',
    supabaseUrl,
    supabaseAnonKey,
});

/**
 * Wrapper that applies image URL transformation to any data object
 */
export function withImageTransform<T>(data: T): T {
    return transformImageUrls(data);
}

export { sdk };
export type { ChanomhubClient };
