import Ably from 'ably';

// Use a singleton pattern to ensure we only create one instance
let ablyInstance: Ably.Realtime | null = null;

export const getAblyClient = (): Ably.Realtime | null => {
    if (!ablyInstance) {
        // You would typically uแse an authUrl here for security in production,
        // or an API key from environment variables for development.
        // For now, we'll try to use the VITE_ABLY_API_KEY environment variable.
        const apiKey = import.meta.env.VITE_ABLY_API_KEY;

        if (!apiKey) {
            console.warn('⚠️ Ably API Key not found in environment variables (VITE_ABLY_API_KEY). Chat will not connect.');
            return null;
        }

        ablyInstance = new Ably.Realtime({
            key: apiKey,
            autoConnect: false, // We will connect manually in the Context
            clientId: 'user-' + Math.random().toString(36).substring(7), // Temporary client ID
        });
    }
    return ablyInstance;
};

// Helper for auth-based connection if you move to using authUrl later
export const getAblyClientWithAuth = (token: string): Ably.Realtime => {
    if (ablyInstance) return ablyInstance; // Or handle reconnection logic

    ablyInstance = new Ably.Realtime({
        token: token,
        autoConnect: false,
    });
    return ablyInstance;
}
