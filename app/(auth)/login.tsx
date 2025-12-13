import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');

    const { login, loginWithGoogle, isSupabaseAvailable } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await login({ email, password });
            // Navigate back to home on success
            router.replace('/');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError('');

        try {
            await loginWithGoogle();
            // Navigate back to home on success
            router.replace('/');
        } catch (err: any) {
            setError(err.message || 'Google login failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const isLoading = loading || googleLoading;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Stack.Screen
                options={{
                    title: 'LOGIN',
                    headerStyle: { backgroundColor: Colors.dark.surface },
                    headerTintColor: Colors.dark.text,
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.content}>
                    {/* Logo/Title */}
                    <Text style={styles.title}>CHANOX2</Text>
                    <Text style={styles.subtitle}>Sign in to continue</Text>

                    {/* Error Message */}
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Google Login Button (if Supabase is configured) */}
                    {isSupabaseAvailable && (
                        <>
                            <TouchableOpacity
                                style={[styles.googleButton, isLoading && styles.buttonDisabled]}
                                onPress={handleGoogleLogin}
                                disabled={isLoading}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator color={Colors.dark.text} />
                                ) : (
                                    <View style={styles.googleButtonContent}>
                                        <Text style={styles.googleIcon}>G</Text>
                                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Divider */}
                            <View style={styles.dividerContainer}>
                                <View style={styles.divider} />
                                <Text style={styles.dividerText}>or</Text>
                                <View style={styles.divider} />
                            </View>
                        </>
                    )}

                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="your@email.com"
                            placeholderTextColor={Colors.dark.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            editable={!isLoading}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            placeholderTextColor={Colors.dark.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                            autoComplete="password"
                            editable={!isLoading}
                        />
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.dark.background} />
                        ) : (
                            <Text style={styles.buttonText}>SIGN IN</Text>
                        )}
                    </TouchableOpacity>

                    {/* Register Link */}
                    <View style={styles.registerContainer}>
                        <Text style={styles.registerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/register')} disabled={isLoading}>
                            <Text style={styles.registerLink}>Create one</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        padding: 24,
        maxWidth: 400,
        width: '100%',
        alignSelf: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.dark.text,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.dark.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    errorContainer: {
        backgroundColor: '#ff4444',
        padding: 12,
        borderRadius: 4,
        marginBottom: 16,
    },
    errorText: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: Colors.dark.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.dark.surface,
        color: Colors.dark.text,
        padding: 14,
        borderRadius: 4,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.dark.border,
    },
    button: {
        backgroundColor: Colors.dark.accent,
        padding: 16,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: Colors.dark.background,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    registerText: {
        color: Colors.dark.textSecondary,
        fontSize: 14,
    },
    registerLink: {
        color: Colors.dark.accent,
        fontSize: 14,
        fontWeight: 'bold',
    },
    // Google OAuth Button Styles
    googleButton: {
        backgroundColor: '#4285F4',
        padding: 16,
        borderRadius: 4,
        alignItems: 'center',
        marginBottom: 16,
    },
    googleButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleIcon: {
        fontSize: 18,
        fontWeight: 'bold',
        marginRight: 12,
        width: 24,
        height: 24,
        textAlign: 'center',
        lineHeight: 24,
        backgroundColor: '#fff',
        color: '#4285F4',
        borderRadius: 4,
    },
    googleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Divider Styles
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.dark.border,
    },
    dividerText: {
        color: Colors.dark.textSecondary,
        paddingHorizontal: 16,
        fontSize: 14,
    },
});
