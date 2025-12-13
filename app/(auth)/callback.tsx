import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { supabase, isSupabaseConfigured } from '@/libs/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackScreen() {
    const [error, setError] = useState<string | null>(null);
    const params = useLocalSearchParams();
    const { handleSupabaseCallback } = useAuth();

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        if (!isSupabaseConfigured()) {
            setError('Supabase is not configured');
            return;
        }

        try {
            // For web, Supabase will automatically handle the hash fragment
            // Check if we have access_token in URL hash or params
            if (typeof window !== 'undefined') {
                const hash = window.location.hash;

                if (hash && hash.includes('access_token')) {
                    // Extract tokens from hash
                    const accessToken = hash.match(/access_token=([^&]*)/)?.[1];
                    const refreshToken = hash.match(/refresh_token=([^&]*)/)?.[1];

                    if (accessToken) {
                        const { data, error: sessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || '',
                        });

                        if (sessionError) {
                            throw sessionError;
                        }

                        if (data.session) {
                            console.log('OAuth session established:', data.user?.email);

                            // Exchange Supabase token with backend and save user to accounts
                            try {
                                await handleSupabaseCallback(accessToken);
                                console.log('User saved to accounts successfully');
                            } catch (backendError) {
                                console.error('Backend sync failed, but Supabase session exists:', backendError);
                                // Continue to home even if backend sync fails
                                // User might need to link account later
                            }

                            // Redirect to home
                            router.replace('/');
                            return;
                        }
                    }
                }
            }

            // Check for error in params
            if (params.error) {
                throw new Error(params.error_description?.toString() || 'OAuth error');
            }

            // Try to get existing session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Try to sync with backend if we have a session
                try {
                    await handleSupabaseCallback(session.access_token);
                } catch (backendError) {
                    console.error('Backend sync failed:', backendError);
                }
                router.replace('/');
                return;
            }

            // No session found, redirect to login
            router.replace('/login');
        } catch (err: any) {
            console.error('OAuth callback error:', err);
            setError(err.message || 'Failed to complete login');
            // Redirect to login after delay
            setTimeout(() => router.replace('/login'), 3000);
        }
    };

    return (
        <View style={styles.container}>
            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Text style={styles.redirectText}>Redirecting to login...</Text>
                </View>
            ) : (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.dark.accent} />
                    <Text style={styles.loadingText}>Completing login...</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
    },
    loadingText: {
        color: Colors.dark.text,
        fontSize: 16,
        marginTop: 16,
    },
    errorContainer: {
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        color: '#ff4444',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8,
    },
    redirectText: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
    },
});
