import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { AuthProvider } from '@/contexts/AuthContext';
import { DownloadProvider } from '@/contexts/DownloadContext';
import { FestivalProvider } from '@/contexts/FestivalContext';
import { FestivalOverlay } from '@/components/FestivalOverlay';

import { useFestival } from '@/contexts/FestivalContext';

function AppNavigator() {
    const { theme } = useFestival();

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <StatusBar style="light" backgroundColor={theme.surface} />
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: theme.surface,
                    },
                    headerTintColor: theme.text,
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    contentStyle: {
                        backgroundColor: theme.background,
                    },
                }}
            >
                <Stack.Screen name="index" options={{ title: 'Home', headerShown: true }} />
                <Stack.Screen name="library" options={{ title: 'Library', headerShown: true }} />
                <Stack.Screen name="search" options={{ title: 'Search', headerShown: true }} />
                <Stack.Screen name="downloads" options={{ title: 'Downloads', headerShown: true }} />
                <Stack.Screen name="webview" options={{ title: 'WebView', headerShown: true }} />
                <Stack.Screen name="login" options={{ title: 'Login', headerShown: true }} />
                <Stack.Screen name="register" options={{ title: 'Register', headerShown: true }} />
                <Stack.Screen name="settings" options={{ title: 'Settings', headerShown: true }} />
                <Stack.Screen name="[slug]" options={{ headerShown: true }} />
            </Stack>
            <FestivalOverlay />
        </View>
    );
}

export default function RootLayout() {
    console.log('RootLayout rendering...');
    return (
        <AuthProvider>
            <DownloadProvider>
                <FestivalProvider>
                    <AppNavigator />
                </FestivalProvider>
            </DownloadProvider>
        </AuthProvider>
    );
}
