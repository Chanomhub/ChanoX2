
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// Using VITE_ prefix for Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
    return !!(supabaseUrl && supabaseAnonKey);
};

// Create a mock client that does nothing when Supabase is not configured
const createMockClient = (): SupabaseClient => {
    const mockAuth = {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
    };

    return {
        auth: mockAuth,
    } as unknown as SupabaseClient;
};

// Create Supabase client for Web (only if configured)
export const supabase: SupabaseClient = isSupabaseConfigured()
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    })
    : createMockClient();

// Export configuration status for debugging
export const getSupabaseConfig = () => ({
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
    hasKey: !!supabaseAnonKey,
    isConfigured: isSupabaseConfigured(),
});
