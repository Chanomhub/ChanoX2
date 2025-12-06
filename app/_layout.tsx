import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { AuthProvider } from '@/contexts/AuthContext';
import { DownloadProvider } from '@/contexts/DownloadContext';
import { FestivalProvider } from '@/contexts/FestivalContext';
import { FestivalOverlay } from '@/components/FestivalOverlay';

import { useFestival } from '@/contexts/FestivalContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import DownloadFooter from '@/components/downloads/DownloadFooter';
import TitleBar from '@/components/TitleBar';
import MenuBar from '@/components/MenuBar';
import { ThemeScrollbar } from '@/components/ThemeScrollbar';

function AppNavigator() {
    const { theme } = useFestival();

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <ThemeScrollbar />
            <TitleBar />
            <MenuBar />
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
                        paddingBottom: 40, // Add padding to avoid content being hidden by footer
                    },
                    // headerRight removed
                }}
            >
                <Stack.Screen name="index" options={{ title: 'Store', headerShown: false }} />
                <Stack.Screen name="library" options={{ title: 'Library', headerShown: true }} />
                <Stack.Screen name="search" options={{ title: 'Search', headerShown: true }} />
                <Stack.Screen name="downloads" options={{ title: 'Downloads', headerShown: true }} />
                <Stack.Screen name="webview" options={{ title: 'WebView', headerShown: true }} />
                <Stack.Screen name="login" options={{ title: 'Login', headerShown: true }} />
                <Stack.Screen name="register" options={{ title: 'Register', headerShown: true }} />
                <Stack.Screen name="settings" options={{ title: 'Settings', headerShown: true }} />
                <Stack.Screen name="[slug]" options={{ headerShown: true }} />
            </Stack>
            <DownloadFooter />
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
                    <LanguageProvider>
                        <AppNavigator />
                    </LanguageProvider>
                </FestivalProvider>
            </DownloadProvider>
        </AuthProvider>
    );
}
