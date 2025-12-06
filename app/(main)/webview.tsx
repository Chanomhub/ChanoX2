import { View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useEffect, useRef } from 'react';

export default function WebViewScreen() {
    const { url } = useLocalSearchParams<{ url: string }>();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (url && iframeRef.current) {
            // Decode the URL
            const decodedUrl = decodeURIComponent(url as string);
            iframeRef.current.src = decodedUrl;
        }
    }, [url]);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Download',
                    headerStyle: { backgroundColor: Colors.dark.surface },
                    headerTintColor: Colors.dark.text,
                }}
            />

            <iframe
                ref={iframeRef}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                }}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
});
