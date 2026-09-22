/**
 * Profile Page
 * Premium Steam-like profile design with modern aesthetics
 */
import { useParams, useNavigate } from 'react-router';
import useSWR from 'swr';
import { useState } from 'react';
import { sdk, getAuthenticatedClient } from '@/libs/sdk';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile as ProfileData } from '@chanomhub/sdk';
import { SafeImage } from '@/components/common/SafeImage';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    User as UserIcon,
    Loader2,
    UserPlus,
    UserCheck,
    ExternalLink,
    Globe,
    Twitter,
    MessageCircle,
    Sparkles,
} from 'lucide-react';

// Fetcher for profile data
const profileFetcher = async ([, username]: [string, string]): Promise<ProfileData | null> => {
    return await sdk.users.getProfile(username);
};

// Get icon for social platform
const getSocialIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('twitter') || p.includes('x')) return Twitter;
    if (p.includes('discord')) return MessageCircle;
    return Globe;
};

export default function Profile() {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const { token, isAuthenticated, user } = useAuth();
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    // Fetch profile
    const { data: profile, error, isLoading, mutate } = useSWR<ProfileData | null>(
        username ? ['profile', username] : null,
        profileFetcher
    );

    // Check if this is the current user's own profile
    const isOwnProfile = user?.username === username;

    const handleFollowToggle = async () => {
        if (!isAuthenticated || !token || !username || !profile) return;

        setIsFollowLoading(true);
        try {
            // Create authenticated client with current token
            const authClient = getAuthenticatedClient(token);

            if (profile.following) {
                await authClient.users.unfollow(username);
            } else {
                await authClient.users.follow(username);
            }

            // Refetch profile to update state
            mutate();
        } catch (err) {
            console.error('Failed to toggle follow:', err);
        } finally {
            setIsFollowLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[600px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-muted border-t-primary animate-spin" />
                        <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-muted-foreground text-sm">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[600px] gap-6">
                <div className="w-24 h-24 rounded-full bg-card border border-border/60 flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-muted-foreground" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-2">User Not Found</h2>
                    <p className="text-muted-foreground text-sm max-w-[300px]">
                        The profile you're looking for doesn't exist or has been removed.
                    </p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12">
            {/* Hero Section with Parallax-like Background */}
            <div className="relative h-[280px] overflow-hidden">
                {/* Background Image with Gradient Overlay */}
                <div className="absolute inset-0">
                    {profile.backgroundImage ? (
                        <SafeImage
                            src={profile.backgroundImage}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-card via-background to-card" />
                    )}
                    {/* Multiple gradient overlays for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent" />
                </div>

                {/* Back Button - Floating */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-background/70 hover:bg-background/90 border border-border/60 backdrop-blur-sm text-foreground rounded-full transition-all text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            </div>

            {/* Profile Card - Overlapping Hero */}
            <div className="max-w-[1000px] mx-auto px-6 -mt-32 relative z-10">
                <div className="bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xl">
                    {/* Profile Header */}
                    <div className="p-8 pb-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                            {/* Avatar with Ring */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-amber-600 rounded-full opacity-50 group-hover:opacity-75 blur transition-opacity" />
                                <div className="relative w-32 h-32 rounded-full border-4 border-card overflow-hidden bg-muted">
                                    {profile.image ? (
                                        <SafeImage
                                            src={profile.image}
                                            alt={profile.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                            <UserIcon className="w-14 h-14 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                {/* Online indicator (optional decoration) */}
                                <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-2 border-card shadow-lg" />
                            </div>

                            {/* Name & Username */}
                            <div className="flex-1 text-center sm:text-left">
                                <h1 className="text-3xl font-bold text-foreground mb-1 tracking-tight">
                                    {profile.name}
                                </h1>
                                {profile.username && (
                                    <p className="text-primary text-sm font-medium">
                                        @{profile.username}
                                    </p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                {!isOwnProfile && isAuthenticated && (
                                    <button
                                        onClick={handleFollowToggle}
                                        disabled={isFollowLoading}
                                        className={cn(
                                            "group relative px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all duration-300 overflow-hidden",
                                            profile.following
                                                ? "bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive border border-border/60"
                                                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
                                        )}
                                    >
                                        {/* Shine effect */}
                                        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                        {isFollowLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : profile.following ? (
                                            <UserCheck className="w-5 h-5" />
                                        ) : (
                                            <UserPlus className="w-5 h-5" />
                                        )}
                                        <span className="relative">
                                            {profile.following ? 'Following' : 'Follow'}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Divider with glow */}
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                    {/* Content Grid */}
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Bio Section - Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-background/60 rounded-xl p-6 border border-border/50">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-primary rounded-full" />
                                    About
                                </h3>
                                {profile.bio ? (
                                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                                        {profile.bio}
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground italic">
                                        This user hasn't written a bio yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Social Links Card */}
                            {profile.socialMediaLinks && profile.socialMediaLinks.length > 0 && (
                                <div className="bg-background/60 rounded-xl p-6 border border-border/50">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-primary rounded-full" />
                                        Links
                                    </h3>
                                    <div className="space-y-2">
                                        {profile.socialMediaLinks.map((link, index) => {
                                            const Icon = getSocialIcon(link.platform);
                                            return (
                                                <a
                                                    key={index}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-lg bg-background/80 hover:bg-muted/80 text-muted-foreground hover:text-primary border border-border/40 transition-all group"
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="flex-1 capitalize font-medium text-sm">
                                                        {link.platform}
                                                    </span>
                                                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Member Info Card */}
                            <div className="bg-background/60 rounded-xl p-6 border border-border/50">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-primary rounded-full" />
                                    Info
                                </h3>
                                <div className="text-sm text-muted-foreground">
                                    <p>Member of ChanomHub</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
