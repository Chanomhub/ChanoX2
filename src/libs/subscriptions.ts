import { sdk } from './sdk';
import type { Subscription, SubscriptionPlan } from '@chanomhub/sdk';

/**
 * Utility for managing user subscriptions via the Chanomhub SDK.
 */

/**
 * Get all active subscriptions for the current user
 */
export async function getActiveSubscriptions(): Promise<Subscription[]> {
    if (!sdk.config.token) return [];

    try {
        const subscriptions = await sdk.subscriptions.getAll();
        return subscriptions.filter(sub => sub.status === 'ACTIVE');
    } catch (error) {
        console.error('[Subscriptions] Failed to fetch subscriptions:', error);
        return [];
    }
}

/**
 * Check if the user has an active subscription for a specific plan
 */
export async function hasActivePlan(planId: string): Promise<boolean> {
    const activeSubs = await getActiveSubscriptions();
    return activeSubs.some(sub => sub.planId === planId);
}

/**
 * Get all available subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
        return await sdk.subscriptions.getPlans();
    } catch (error) {
        console.error('[Subscriptions] Failed to fetch plans:', error);
        return [];
    }
}

/**
 * Check if the user is currently a subscriber (has any active subscription)
 */
export async function isSubscriber(): Promise<boolean> {
    const activeSubs = await getActiveSubscriptions();
    return activeSubs.length > 0;
}
