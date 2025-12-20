import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import Ably from 'ably';
import { getAblyClient } from '@/libs/ably';
import { useAuth } from './AuthContext';

export interface ChatMessage {
    id: string;
    text: string;
    sender: string;
    timestamp: number;
    isSelf: boolean;
}

interface ChatContextType {
    messages: ChatMessage[];
    isConnected: boolean;
    onlineCount: number;
    sendMessage: (text: string) => Promise<void>;
    joinChannel: (channelName: string) => void;
    currentChannel: string | null;
    username: string;
    setUsername: (name: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    const [currentChannel, setCurrentChannel] = useState<string | null>('global');

    // Initialize username with stored Guest ID or generate new one
    const [username, setUsername] = useState(() => {
        const stored = localStorage.getItem('chanox2_guest_id');
        if (stored) return stored;
        const newGuest = 'Guest-' + Math.floor(Math.random() * 10000);
        localStorage.setItem('chanox2_guest_id', newGuest);
        return newGuest;
    });

    // Refs to avoid dependency cycles or stale closures in event handlers
    const channelRef = useRef<Ably.RealtimeChannel | null>(null);
    const clientRef = useRef<Ably.Realtime | null>(null);

    // Sync username with AuthContext
    useEffect(() => {
        if (isAuthenticated && user?.username) {
            setUsername(user.username);
        } else if (!isAuthenticated) {
            // Revert to stored Guest ID if logged out
            const stored = localStorage.getItem('chanox2_guest_id');
            if (stored) {
                setUsername(stored);
            } else {
                const newGuest = 'Guest-' + Math.floor(Math.random() * 10000);
                localStorage.setItem('chanox2_guest_id', newGuest);
                setUsername(newGuest);
            }
        }
    }, [isAuthenticated, user?.username]);

    // Update presence when username changes
    useEffect(() => {
        if (channelRef.current && isConnected) {
            channelRef.current.presence.update({ name: username }).catch(err => {
                // If not present, enter
                if (err.code === 91001) {
                    channelRef.current?.presence.enter({ name: username });
                } else {
                    console.error("Failed to update presence:", err);
                }
            });
        }
    }, [username, isConnected]);

    useEffect(() => {
        const client = getAblyClient();

        if (!client) {
            console.warn('Chat disabled: No Ably client available');
            return;
        }

        clientRef.current = client;

        // Connect logic
        const connect = async () => {
            if (client.connection.state !== 'connected') {
                client.connect();
            }
        };

        client.connection.on('connected', () => {
            console.log('✅ Ably Connected');
            setIsConnected(true);
        });

        client.connection.on('disconnected', () => {
            console.log('❌ Ably Disconnected');
            setIsConnected(false);
        });

        connect();

        // Initial Join
        if (currentChannel) {
            joinChannel(currentChannel);
        }

        return () => {
            // Cleanup
            if (channelRef.current) {
                channelRef.current.detach();
            }
        };
    }, []);

    const joinChannel = (channelName: string) => {
        if (!clientRef.current) return;

        // Unsubscribe from old channel if exists
        if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current.detach();
        }

        const channel = clientRef.current.channels.get(channelName);
        channelRef.current = channel;
        setCurrentChannel(channelName);
        setMessages([]);

        // Subscribe to messages
        channel.subscribe('message', (msg: Ably.Message) => {
            const newMsg: ChatMessage = {
                id: msg.id || String(Date.now()),
                text: typeof msg.data === 'string' ? msg.data : (msg.data?.text || ''),
                sender: (msg.data?.sender as string) || 'Anonymous',
                timestamp: msg.timestamp || Date.now(),
                isSelf: msg.clientId === clientRef.current?.auth.clientId,
            };

            setMessages(prev => {
                // Deduplicate check
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        });

        // Fetch History
        channel.history({ limit: 50 })
            .then((resultPage) => {
                const historyMessages: ChatMessage[] = resultPage.items.map((msg: Ably.Message) => ({
                    id: msg.id || String(msg.timestamp),
                    text: typeof msg.data === 'string' ? msg.data : (msg.data?.text || ''),
                    sender: (msg.data?.sender as string) || 'Anonymous',
                    timestamp: msg.timestamp || Date.now(),
                    isSelf: msg.clientId === clientRef.current?.auth.clientId,
                }));

                // History comes newest-first, so reverse it to be chronological
                historyMessages.reverse();

                setMessages(prev => {
                    // Merge history with existing (realtime) messages, avoiding duplicates
                    const existingIds = new Set(prev.map(m => m.id));
                    const uniqueHistory = historyMessages.filter(m => !existingIds.has(m.id));
                    return [...uniqueHistory, ...prev];
                });
            })
            .catch((err) => {
                console.warn('Failed to fetch chat history:', err);
            });

        // Presence
        channel.presence.enter({ name: username });

        const updatePresence = () => {
            channel.presence.get()
                .then((members) => {
                    setOnlineCount(members.length);
                })
                .catch((err) => {
                    console.error('Failed to get presence:', err);
                });
        };

        channel.presence.subscribe('enter', updatePresence);
        channel.presence.subscribe('leave', updatePresence);
        channel.presence.subscribe('update', updatePresence);
        updatePresence();
    };

    const sendMessage = async (text: string) => {
        if (!channelRef.current || !text.trim()) return;

        // Optimistically add? Ably is fast, maybe not needed.
        // Let's just publish.
        await channelRef.current.publish('message', {
            text,
            sender: username
        });
    };

    return (
        <ChatContext.Provider
            value={{
                messages,
                isConnected,
                onlineCount,
                sendMessage,
                joinChannel,
                currentChannel,
                username,
                setUsername
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
