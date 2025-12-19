import { ApiResponse } from './auth';

const API_BASE = 'https://api.chanomhub.com/api';

export interface Notification {
    id: number;
    userId: number;
    type: 'NEW_ARTICLE' | 'NEW_COMMENT' | 'REPLY_COMMENT' | 'PUBLISH_REQUEST_UPDATE' | 'MOD_UPDATE' | 'TRANSLATION_UPDATE' | 'FAVORITE_ARTICLE' | 'MODERATION_UPDATE' | 'TRANSLATION_QUEUE_NEW' | 'TRANSLATION_QUEUE_UPDATE' | 'TRANSLATION_QUEUE_COMPLETED' | 'TRANSLATION_QUEUE_FAILED';
    message: string;
    isRead: boolean;
    entityId: any;
    entityType: any;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationsResponse {
    notifications: Notification[];
    notificationsCount: number;
    unreadCount: number;
}

interface NotificationFilter {
    type?: string;
    isRead?: boolean;
    skip?: number;
    take?: number;
}

export async function getNotifications(token: string, filter?: NotificationFilter): Promise<NotificationsResponse> {
    const query = new URLSearchParams();
    if (filter?.type) query.append('type', filter.type);
    if (filter?.isRead !== undefined) query.append('isRead', String(filter.isRead));
    if (filter?.skip) query.append('skip', String(filter.skip));
    if (filter?.take) query.append('take', String(filter.take));

    const response = await fetch(`${API_BASE}/notifications?${query.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error('Unauthorized');
        throw new Error('Failed to fetch notifications');
    }

    // Handle wrapped response
    const json: ApiResponse<NotificationsResponse> = await response.json();
    return json.data;
}

export async function markAsRead(token: string, id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
}

export async function markAllAsRead(token: string): Promise<void> {
    const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
}

export async function deleteNotification(token: string, id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) throw new Error('Failed to delete notification');
}

export async function deleteAllNotifications(token: string): Promise<void> {
    const response = await fetch(`${API_BASE}/notifications`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) throw new Error('Failed to delete all notifications');
}
