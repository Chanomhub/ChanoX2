import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/constants/Colors';
import { AuthProvider } from '../src/contexts/AuthContext';
import { DownloadProvider } from '../src/contexts/DownloadContext';

export default function RootLayout() {
    console.log('RootLayout rendering...');
    return (
        <AuthProvider>
            <DownloadProvider>
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerStyle: {
                            backgroundColor: Colors.dark.surface,
                        },
                        headerTintColor: Colors.dark.text,
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                        contentStyle: {
                            backgroundColor: Colors.dark.background,
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
                    <Stack.Screen name="[slug]" options={{ headerShown: true }} />
                </Stack>
            </DownloadProvider>
        </AuthProvider>
    );
}
