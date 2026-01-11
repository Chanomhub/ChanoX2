/**
 * Profile Page
 * Premium Steam-like profile design with modern aesthetics
 */
import { useParams, Link, useNavigate } from 'react-router-dom';
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
                        <div className="w-16 h-16 rounded-full border-4 border-[#1b2838] border-t-[#66c0f4] animate-spin" />
                        <Sparkles className="w-6 h-6 text-[#66c0f4] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[#8b929a] text-sm">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[600px] gap-6">
                <div className="w-24 h-24 rounded-full bg-[#1b2838] flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-[#4a5568]" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-[#dcdedf] mb-2">User Not Found</h2>
                    <p className="text-[#8b929a] text-sm max-w-[300px]">
                        The profile you're looking for doesn't exist or has been removed.
                    </p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#2a475e] hover:bg-[#3d5a73] text-[#66c0f4] rounded-lg transition-all font-medium"
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
                        <div className="w-full h-full bg-gradient-to-br from-[#1b2838] via-[#2a475e] to-[#1b2838]" />
                    )}
                    {/* Multiple gradient overlays for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171a21] via-[#171a21]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#171a21]/40 to-transparent" />
                </div>

                {/* Back Button - Floating */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white/80 hover:text-white rounded-full transition-all text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            </div>

            {/* Profile Card - Overlapping Hero */}
            <div className="max-w-[1000px] mx-auto px-6 -mt-32 relative z-10">
                <div className="bg-gradient-to-b from-[#1e2837] to-[#171a21] rounded-2xl border border-[#2a475e]/50 overflow-hidden shadow-2xl">
                    {/* Profile Header */}
                    <div className="p-8 pb-6">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                            {/* Avatar with Ring */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-[#66c0f4] to-[#4fa3d3] rounded-full opacity-50 group-hover:opacity-75 blur transition-opacity" />
                                <div className="relative w-32 h-32 rounded-full border-4 border-[#1e2837] overflow-hidden bg-[#2a475e]">
                                    {profile.image ? (
                                        <SafeImage
                                            src={profile.image}
                                            alt={profile.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2a475e] to-[#1b2838]">
                                            <UserIcon className="w-14 h-14 text-[#66c0f4]/60" />
                                        </div>
                                    )}
                                </div>
                                {/* Online indicator (optional decoration) */}
                                <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-3 border-[#1e2837] shadow-lg" />
                            </div>

                            {/* Name & Username */}
                            <div className="flex-1 text-center sm:text-left">
                                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                                    {profile.name}
                                </h1>
                                {profile.username && (
                                    <p className="text-[#66c0f4] text-sm font-medium">
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
                                                ? "bg-[#2a475e] hover:bg-red-600/90 text-[#67c1f5] hover:text-white"
                                                : "bg-gradient-to-r from-[#66c0f4] to-[#4fa3d3] hover:from-[#7dcbf7] hover:to-[#5fb5e0] text-[#1b2838]"
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
                    <div className="h-px bg-gradient-to-r from-transparent via-[#2a475e] to-transparent" />

                    {/* Content Grid */}
                    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Bio Section - Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#171a21]/50 rounded-xl p-6 border border-[#2a475e]/30">
                                <h3 className="text-sm font-semibold text-[#8b929a] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-[#66c0f4] rounded-full" />
                                    About
                                </h3>
                                {profile.bio ? (
                                    <p className="text-[#c6d4df] leading-relaxed whitespace-pre-wrap">
                                        {profile.bio}
                                    </p>
                                ) : (
                                    <p className="text-[#5a6773] italic">
                                        This user hasn't written a bio yet.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Social Links Card */}
                            {profile.socialMediaLinks && profile.socialMediaLinks.length > 0 && (
                                <div className="bg-[#171a21]/50 rounded-xl p-6 border border-[#2a475e]/30">
                                    <h3 className="text-sm font-semibold text-[#8b929a] uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-[#66c0f4] rounded-full" />
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
                                                    className="flex items-center gap-3 p-3 rounded-lg bg-[#1b2838]/50 hover:bg-[#2a475e]/50 text-[#8b929a] hover:text-[#66c0f4] transition-all group"
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
                            <div className="bg-[#171a21]/50 rounded-xl p-6 border border-[#2a475e]/30">
                                <h3 className="text-sm font-semibold text-[#8b929a] uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-1 h-4 bg-[#66c0f4] rounded-full" />
                                    Info
                                </h3>
                                <div className="text-sm text-[#5a6773]">
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
