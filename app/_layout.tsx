import 'react-native-gesture-handler';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { AuthProvider } from '@/contexts/AuthContext';
import { DownloadProvider } from '@/contexts/DownloadContext';
import { FestivalProvider } from '@/contexts/FestivalContext';
import { FestivalOverlay } from '@/components/common/FestivalOverlay';

import { useFestival } from '@/contexts/FestivalContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import DownloadFooter from '@/components/common/downloads/DownloadFooter';
import TitleBar from '@/components/common/TitleBar';
import MenuBar from '@/components/common/MenuBar';
import { ThemeScrollbar } from '@/components/common/ThemeScrollbar';
import SettingsModal from '@/components/common/settings/SettingsModal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';

const queryClient = new QueryClient();

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
                <Stack.Screen name="(main)/library" options={{ title: 'Library', headerShown: true }} />
                <Stack.Screen name="(main)/search" options={{ title: 'Search', headerShown: true }} />
                <Stack.Screen name="(main)/downloads" options={{ title: 'Downloads', headerShown: true }} />
                <Stack.Screen name="(main)/webview" options={{ title: 'WebView', headerShown: true }} />
                <Stack.Screen name="(auth)/login" options={{ title: 'Login', headerShown: true }} />
                <Stack.Screen name="(auth)/register" options={{ title: 'Register', headerShown: true }} />
                <Stack.Screen name="(main)/[slug]" options={{ headerShown: true }} />
            </Stack>
            <DownloadFooter />
            <FestivalOverlay />
            <SettingsModal />
        </View>
    );
}

export default function RootLayout() {
    console.log('RootLayout rendering...');
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
                <PaperProvider>
                    <AuthProvider>
                        <DownloadProvider>
                            <FestivalProvider>
                                <LanguageProvider>
                                    <AppNavigator />
                                </LanguageProvider>
                            </FestivalProvider>
                        </DownloadProvider>
                    </AuthProvider>
                </PaperProvider>
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
}
