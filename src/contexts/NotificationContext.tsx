import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import {
    getNotifications,
    markAsRead as apiMarkAsRead,
    markAllAsRead as apiMarkAllAsRead,
    deleteNotification as apiDeleteNotification,
    deleteAllNotifications as apiDeleteAllNotifications,
    Notification
} from '../libs/api/notifications';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: number) => Promise<void>;
    deleteAllNotifications: () => Promise<void>;
    fetchNotifications: () => Promise<void>;
    isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user || !token) return;
        setLoading(true);
        try {
            const data = await getNotifications(token, { take: 20 }); // Get last 20 by default
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user, token]);

    // Initial fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Socket Connection
    useEffect(() => {
        if (!user || !token) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        // Initialize Socket
        if (!socketRef.current) {
            console.log('Connecting to WebSocket Gateway...');
            // In browser, extraHeaders work only for polling, but websockets don't support custom headers.
            // Be safe: send token in query and auth payload.
            socketRef.current = io('https://api.chanomhub.com', {
                transports: ['websocket'],
                reconnection: true,
                auth: {
                    token: token
                }
            });

            socketRef.current.on('connect', () => {
                console.log('WebSocket connected as', user.username);
                setIsConnected(true);
            });

            socketRef.current.on('disconnect', () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
            });

            socketRef.current.on('connect_error', (err) => {
                console.error('WebSocket connection error:', err);
                setIsConnected(false);
            });

            // Listen for new notifications
            // Assuming the event name is 'notification'. 
            // If the user said "WebSocketGateway", exact implementation depends on backend.
            // A common pattern in NestJS Gateways is `emit('notification', payload)`
            socketRef.current.on('notification', (newNotification: Notification) => {
                console.log('New notification received:', newNotification);
                setNotifications(prev => [newNotification, ...prev]);
                setUnreadCount(prev => prev + 1);

                // Optional: Show a native notification or toast here
                // new Notification(newNotification.title, { body: newNotification.message });
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
        };
    }, [user, token]);

    const markAsRead = async (id: number) => {
        if (!token) return;
        try {
            await apiMarkAsRead(token, id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllAsRead = async () => {
        if (!token) return;
        try {
            await apiMarkAllAsRead(token);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const deleteNotification = async (id: number) => {
        if (!token) return;
        try {
            await apiDeleteNotification(token, id);
            const notif = notifications.find(n => n.id === id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (notif && !notif.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    };

    const deleteAllNotifications = async () => {
        if (!token) return;
        try {
            await apiDeleteAllNotifications(token);
            setNotifications([]);
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to delete all notifications', error);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            deleteAllNotifications,
            fetchNotifications,
            isConnected
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
