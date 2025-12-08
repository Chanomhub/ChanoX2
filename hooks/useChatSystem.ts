import { useEffect, useState, useRef, useCallback } from 'react';
import Ably from 'ably';
import { useAuth } from '@/contexts/AuthContext';

const ABLY_API_KEY = '4V8q-w.6thosg:m5PF_biaLGJpYRts37xRBvMGX09DhZmOFLjzhvSx9Xo';
const CHANNEL_NAME = 'global-chat';

// Reaction type - maps emoji to array of user IDs
export interface MessageReaction {
    [emoji: string]: string[];
}

// Reply reference
export interface ReplyReference {
    id: string;
    text: string;
    sender: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: string;
    senderId: string;
    timestamp: number;
    avatar?: string;
    isSelf: boolean;
    replyTo?: ReplyReference;
    reactions?: MessageReaction;
    isEdited?: boolean;
}

export interface OnlineUser {
    id: string;
    username: string;
    avatar?: string;
    status: 'online' | 'idle';
}

export function useChatSystem() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<number>(0);
    const [onlineUsersList, setOnlineUsersList] = useState<OnlineUser[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    const channelRef = useRef<Ably.RealtimeChannel | null>(null);
    const clientRef = useRef<Ably.Realtime | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypingRef = useRef<number>(0);

    // Persist guest ID across renders
    const guestIdRef = useRef(`guest-${Math.random().toString(36).substring(7)}`);

    useEffect(() => {
        // Determine client ID: user ID or guest ID
        const clientId = user ? String(user.id) : guestIdRef.current;
        const username = user?.username || 'Anonymous';

        // Initialize Ably
        const client = new Ably.Realtime({
            key: ABLY_API_KEY,
            clientId: clientId
        });
        clientRef.current = client;

        client.connection.on('connected', () => {
            console.log('Ably connected');
            setIsConnected(true);
            setError(null);
        });

        client.connection.on('failed', () => {
            console.error('Ably connection failed');
            setIsConnected(false);
            setError('Connection failed');
        });

        // Subscribe to channel
        const channel = client.channels.get(CHANNEL_NAME);
        channelRef.current = channel;

        // Presence Logic - Enhanced with user list
        const updatePresence = async () => {
            try {
                const members = await channel.presence.get();
                setOnlineUsers(members.length);

                // Build online users list
                const userList: OnlineUser[] = members.map((member: any) => ({
                    id: member.clientId,
                    username: member.data?.user || 'Anonymous',
                    avatar: member.data?.avatar,
                    status: 'online' as const
                }));
                setOnlineUsersList(userList);
            } catch (err) {
                console.error('Failed to get presence', err);
            }
        };

        // Typing indicator handler
        const handleTyping = (msg: any) => {
            const typingUser = msg.data?.username;
            if (!typingUser || typingUser === username) return;

            setTypingUsers(prev => {
                if (!prev.includes(typingUser)) {
                    return [...prev, typingUser];
                }
                return prev;
            });

            // Clear typing after 3 seconds
            setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u !== typingUser));
            }, 3000);
        };

        const onPresence = () => {
            updatePresence();
        };

        channel.presence.subscribe('enter', onPresence);
        channel.presence.subscribe('leave', onPresence);
        channel.presence.subscribe('update', onPresence);

        // Enter presence
        channel.presence.enter({
            user: username,
            avatar: user?.image
        });

        // Fetch History
        const fetchHistory = async () => {
            try {
                const result = await channel.history({ limit: 50 });
                if (result && result.items) {
                    const rawItems = result.items.reverse();
                    const historyMessages: ChatMessage[] = [];

                    rawItems.forEach(item => {
                        const data = item.data as any;
                        // Skip deletes and non-message events
                        if (item.name === 'chat-delete' || item.name === 'chat-reaction' || item.name === 'typing') return;

                        if (item.name === 'message' || item.name === 'chat-edit') {
                            historyMessages.push({
                                id: item.id,
                                text: data.text,
                                sender: data.sender || 'Anonymous',
                                senderId: item.clientId || '',
                                avatar: data.avatar,
                                timestamp: item.timestamp,
                                isSelf: item.clientId === clientId || (!!user && data.sender === user.username),
                                replyTo: data.replyTo,
                                reactions: data.reactions || {},
                                isEdited: data.isEdited || false
                            });
                        }
                    });

                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const newHistory = historyMessages.filter(m => !existingIds.has(m.id));
                        return [...newHistory, ...prev];
                    });
                }
            } catch (err) {
                console.error('Failed to fetch history', err);
            }
        };
        fetchHistory();

        // Subscriptions
        channel.subscribe((message: Ably.InboundMessage) => {
            const data = message.data as any;

            if (message.name === 'message') {
                const newMsg: ChatMessage = {
                    id: message.id,
                    text: data.text,
                    sender: data.sender || 'Anonymous',
                    senderId: message.clientId || '',
                    avatar: data.avatar,
                    timestamp: message.timestamp,
                    isSelf: message.clientId === clientId || (!!user && data.sender === user.username),
                    replyTo: data.replyTo,
                    reactions: {},
                    isEdited: false
                };

                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    const updated = [...prev, newMsg];
                    if (updated.length > 100) return updated.slice(updated.length - 100);
                    return updated;
                });
            } else if (message.name === 'chat-edit') {
                setMessages(prev => prev.map(msg =>
                    msg.id === data.messageId
                        ? { ...msg, text: data.text, isEdited: true }
                        : msg
                ));
            } else if (message.name === 'chat-delete') {
                setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
            } else if (message.name === 'chat-reaction') {
                setMessages(prev => prev.map(msg => {
                    if (msg.id !== data.messageId) return msg;

                    const newReactions = { ...msg.reactions } || {};
                    const emoji = data.emoji;
                    const userId = data.userId;
                    const action = data.action; // 'add' or 'remove'

                    if (action === 'add') {
                        if (!newReactions[emoji]) {
                            newReactions[emoji] = [];
                        }
                        if (!newReactions[emoji].includes(userId)) {
                            newReactions[emoji] = [...newReactions[emoji], userId];
                        }
                    } else if (action === 'remove') {
                        if (newReactions[emoji]) {
                            newReactions[emoji] = newReactions[emoji].filter(id => id !== userId);
                            if (newReactions[emoji].length === 0) {
                                delete newReactions[emoji];
                            }
                        }
                    }

                    return { ...msg, reactions: newReactions };
                }));
            } else if (message.name === 'typing') {
                handleTyping(message);
            }
        });

        // Cleanup
        return () => {
            channel.unsubscribe();
            channel.presence.unsubscribe();
            client.close();
            setIsConnected(false);
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [user?.id]);

    const sendMessage = useCallback(async (text: string, replyTo?: ReplyReference) => {
        if (!channelRef.current || !isConnected) return;
        try {
            await channelRef.current.publish('message', {
                text,
                sender: user?.username || 'Anonymous',
                avatar: user?.image,
                replyTo: replyTo || undefined
            });
        } catch (err: any) {
            console.error('Failed to send message', err);
            setError('Failed to send');
        }
    }, [isConnected, user]);

    const editMessage = useCallback(async (messageId: string, newText: string) => {
        if (!channelRef.current || !isConnected) return;
        try {
            await channelRef.current.publish('chat-edit', {
                messageId,
                text: newText,
                isEdited: true
            });
        } catch (err) {
            console.error('Failed to edit message', err);
        }
    }, [isConnected]);

    const deleteMessage = useCallback(async (messageId: string) => {
        if (!channelRef.current || !isConnected) return;
        try {
            await channelRef.current.publish('chat-delete', {
                messageId
            });
        } catch (err) {
            console.error('Failed to delete message', err);
        }
    }, [isConnected]);

    const sendTyping = useCallback(() => {
        if (!channelRef.current || !isConnected) return;

        const now = Date.now();
        // Throttle typing indicator to once per 2 seconds
        if (now - lastTypingRef.current < 2000) return;
        lastTypingRef.current = now;

        try {
            channelRef.current.publish('typing', {
                username: user?.username || 'Anonymous'
            });
        } catch (err) {
            console.error('Failed to send typing', err);
        }
    }, [isConnected, user]);

    const addReaction = useCallback(async (messageId: string, emoji: string) => {
        if (!channelRef.current || !isConnected) return;
        const clientId = user ? String(user.id) : guestIdRef.current;

        try {
            await channelRef.current.publish('chat-reaction', {
                messageId,
                emoji,
                userId: clientId,
                action: 'add'
            });
        } catch (err) {
            console.error('Failed to add reaction', err);
        }
    }, [isConnected, user]);

    const removeReaction = useCallback(async (messageId: string, emoji: string) => {
        if (!channelRef.current || !isConnected) return;
        const clientId = user ? String(user.id) : guestIdRef.current;

        try {
            await channelRef.current.publish('chat-reaction', {
                messageId,
                emoji,
                userId: clientId,
                action: 'remove'
            });
        } catch (err) {
            console.error('Failed to remove reaction', err);
        }
    }, [isConnected, user]);

    return {
        messages,
        sendMessage,
        editMessage,
        deleteMessage,
        isConnected,
        error,
        onlineUsers,
        onlineUsersList,
        typingUsers,
        sendTyping,
        addReaction,
        removeReaction
    };
}
