import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    User, Settings as SettingsIcon, HardDrive, MonitorCog, Bell, Shield,
    ChevronLeft, Check, Loader2, ExternalLink, FolderOpen, Trash2, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { useSettingsStore, SettingsSection } from '@/stores/settingsStore';
import packageJson from '../../package.json';

import { format } from 'date-fns';
import { useNotification } from '@/contexts/NotificationContext';
import { LinuxSettings } from './settings/LinuxSettings';
import { MacSettings } from './settings/MacSettings';

// shadcn components
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/label';

import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/ScrollArea';

interface GitHubRelease {
    tag_name: string;
    html_url: string;
    body: string;
}

interface SidebarItemProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

// Sidebar Item Component
function SidebarItem({ label, icon, isActive, onClick }: SidebarItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-all rounded-md",
                "hover:bg-white/5",
                isActive && "bg-chanox-accent/15 text-chanox-accent border-l-2 border-chanox-accent"
            )}
        >
            <span className={cn("w-5 h-5", isActive ? "text-chanox-accent" : "text-zinc-400")}>
                {icon}
            </span>
            <span className={cn(isActive ? "text-chanox-accent font-medium" : "text-zinc-300")}>
                {label}
            </span>
        </button>
    );
}

// Section Header Component
function SectionHeader({ title }: { title: string }) {
    return (
        <div className="mb-6">
            <h2 className="text-2xl font-light text-zinc-100 tracking-wide">{title}</h2>
            <Separator className="mt-3 bg-zinc-700/50" />
        </div>
    );
}

// Account Section
function AccountSection() {
    const { user, logout } = useAuth();

    return (
        <div>
            <SectionHeader title="Account Details" />
            <Card className="bg-chanox-surface border-chanox-border">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-5">
                        {/* Avatar */}
                        <div className="relative">
                            <Avatar className="w-20 h-20 rounded-lg">
                                <AvatarFallback className="bg-gradient-to-br from-chanox-accent to-blue-600 text-3xl font-bold text-white rounded-lg">
                                    {user?.username?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-chanox-surface" />
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold text-zinc-100">
                                {user?.username || 'Guest User'}
                            </h3>
                            <p className="text-green-400 text-sm flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-400 rounded-full" />
                                Online
                            </p>
                            <p className="text-zinc-500 text-xs font-mono mt-1">
                                ID: {user?.id || 'Unknown'}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                Edit Profile
                            </Button>
                            {user && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={logout}
                                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                >
                                    Logout
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-6 mb-3">
                Security & Privacy
            </h3>
            <Card className="bg-zinc-800/50 border-chanox-border">
                <CardContent className="pt-4">
                    <p className="text-zinc-400 text-sm">
                        Two-factor authentication is currently{' '}
                        <span className="text-red-400 font-medium">Disabled</span>.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

// General Section
function GeneralSection() {
    const { t } = useTranslation();
    const { language, setLanguage } = useLanguage();
    const { nsfwFilterEnabled, setNsfwFilterEnabled, nsfwFilterLevel, setNsfwFilterLevel } = useSettingsStore();
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
    const currentVersion = packageJson.version;

    useEffect(() => {
        checkVersion();
    }, []);

    const checkVersion = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('https://api.github.com/repos/Chanomhub/ChanoX2/releases/latest');
            if (!response.ok) throw new Error('Failed to check');
            const data: GitHubRelease = await response.json();
            const version = data.tag_name.replace(/^v/, '');
            setLatestVersion(version);
            setReleaseUrl(data.html_url);
        } catch {
            setError('Check failed');
        } finally {
            setLoading(false);
        }
    };

    const isUpdateAvailable = latestVersion && latestVersion !== currentVersion;

    return (
        <div>
            <SectionHeader title="System & Updates" />

            {/* Version Card */}
            <Card className="bg-chanox-surface border-chanox-border mb-4">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-zinc-100 font-medium">Client Version</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-200 font-mono">
                                    v{currentVersion}
                                </span>
                                <span className="text-zinc-500 text-xs">(Stable Channel)</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {loading ? (
                                <Loader2 className="w-5 h-5 text-chanox-accent animate-spin" />
                            ) : isUpdateAvailable ? (
                                <Button
                                    onClick={() => releaseUrl && window.electronAPI?.openExternal(releaseUrl)}
                                    className="bg-green-600 hover:bg-green-700"
                                    size="sm"
                                    icon={<ExternalLink size={14} />}
                                >
                                    Update to v{latestVersion}
                                </Button>
                            ) : (
                                <span className="px-3 py-1.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
                                    Up to date
                                </span>
                            )}
                            {error && (
                                <button onClick={checkVersion} className="text-red-400 text-xs underline">
                                    Retry
                                </button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <SectionHeader title={t('language')} />

            {/* Language Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={cn(
                            "p-4 rounded-lg border transition-all flex items-center justify-between",
                            language === lang.code
                                ? "border-chanox-accent bg-chanox-accent/10 text-chanox-accent"
                                : "border-chanox-border bg-chanox-surface text-zinc-300 hover:border-zinc-600"
                        )}
                    >
                        <div className="flex flex-col items-start">
                            <span className={cn(language === lang.code && "font-medium")}>
                                {lang.nativeLabel}
                            </span>
                            <span className="text-xs text-zinc-500">{lang.label}</span>
                        </div>
                        {language === lang.code && (
                            <div className="w-5 h-5 bg-chanox-accent rounded-full flex items-center justify-center">
                                <Check size={12} className="text-white" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <SectionHeader title="Content Filtering" />

            <Card className="bg-chanox-surface border-chanox-border">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <EyeOff className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <Label htmlFor="nsfw-filter" className="text-zinc-100 font-medium cursor-pointer">
                                    NSFW Filter
                                </Label>
                                <Checkbox
                                    id="nsfw-filter"
                                    checked={nsfwFilterEnabled}
                                    onCheckedChange={(checked) => setNsfwFilterEnabled(checked as boolean)}
                                />
                            </div>
                            <p className="text-zinc-500 text-sm">
                                Automatically scale and blur images that may contain sensitive or adult content.
                                Uses local AI processing (TensorFlow.js) to classify images.
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600 bg-zinc-900/50 p-2 rounded">
                                <Shield size={12} />
                                <span>Processing happens entirely on your device. No images are uploaded.</span>
                            </div>

                            {/* Sensitivity Level Selector */}
                            {nsfwFilterEnabled && (
                                <div className="mt-4 pt-4 border-t border-zinc-800">
                                    <label className="text-zinc-400 text-sm block mb-2">Sensitivity Level</label>
                                    <div className="flex gap-2">
                                        {(['low', 'medium', 'high'] as const).map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setNsfwFilterLevel(level)}
                                                className={cn(
                                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                                                    nsfwFilterLevel === level
                                                        ? level === 'low' ? "bg-green-500/20 text-green-400 border border-green-500/50"
                                                            : level === 'medium' ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                                                                : "bg-red-500/20 text-red-400 border border-red-500/50"
                                                        : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500"
                                                )}
                                            >
                                                {level === 'low' ? '🟢 Low' : level === 'medium' ? '🟡 Medium' : '🔴 High'}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-zinc-600 mt-2">
                                        {nsfwFilterLevel === 'low' && 'Blocks only explicit content. Some suggestive images may pass.'}
                                        {nsfwFilterLevel === 'medium' && 'Balanced detection. Blocks explicit and most suggestive content.'}
                                        {nsfwFilterLevel === 'high' && 'Strict filtering. Blocks even mildly suggestive content.'}
                                    </p>
                                </div>
                            )}

                            {/* Dev Mode: Custom Model */}
                            {nsfwFilterEnabled && (
                                <DevModeModelSection />
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Dev Mode Model Section Component
function DevModeModelSection() {
    const [customModelUrl, setCustomModelUrl] = useState('');
    const [isDevMode, setIsDevMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Load current state from nsfwService
        import('@/services/nsfwService').then(({ nsfwService }) => {
            const info = nsfwService.getModelInfo();
            setIsDevMode(info.isCustom);
            setCustomModelUrl(info.url || '');
        });
    }, []);

    const handleSave = async () => {
        if (!customModelUrl.trim()) return;
        setIsSaving(true);
        try {
            const { nsfwService } = await import('@/services/nsfwService');
            nsfwService.setCustomModelUrl(customModelUrl.trim());
            setIsDevMode(true);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = async () => {
        const { nsfwService } = await import('@/services/nsfwService');
        nsfwService.setCustomModelUrl(null);
        setCustomModelUrl('');
        setIsDevMode(false);
    };

    return (
        <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-zinc-400 text-sm">🔧 Dev Mode: Custom Model</span>
                {isDevMode && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Active</span>
                )}
            </div>
            <p className="text-xs text-zinc-600 mb-3">
                Use your own TensorFlow.js model for NSFW detection. Model must have classes: Hentai, Porn, Sexy, Neutral, Drawing.
            </p>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={customModelUrl}
                    onChange={(e) => setCustomModelUrl(e.target.value)}
                    placeholder="http://localhost:8080/model/ or file:///path/to/model/"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
                <button
                    onClick={handleSave}
                    disabled={!customModelUrl.trim() || isSaving}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors"
                >
                    {isSaving ? 'Loading...' : 'Apply'}
                </button>
                {isDevMode && (
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg transition-colors"
                    >
                        Reset
                    </button>
                )}
            </div>
        </div>
    );
}

// Storage Section
function StorageSection() {
    // ... (content of storage section - keeping it, but need to be careful with replace range)
    const { downloadPath, setDownloadPath } = useSettingsStore();
    const [diskSpace, setDiskSpace] = useState<{ free: number; total: number } | null>(null);

    useEffect(() => {
        loadStorageInfo();
    }, []);

    const loadStorageInfo = async () => {
        if (window.electronAPI) {
            const path = await window.electronAPI.getDownloadDirectory();
            setDownloadPath(path);
            const space = await window.electronAPI.getDiskSpace(path);
            if (space) {
                setDiskSpace({ free: space.free, total: space.total });
            }
        }
    };

    const handleChangeLocation = async () => {
        if (window.electronAPI) {
            const path = await window.electronAPI.selectDownloadDirectory();
            if (path) {
                const success = await window.electronAPI.setDownloadDirectory(path);
                if (success) {
                    loadStorageInfo();
                }
            }
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const usedPercentage = diskSpace ? ((diskSpace.total - diskSpace.free) / diskSpace.total) * 100 : 0;

    return (
        <div>
            <SectionHeader title="Storage" />

            {/* Storage Bar */}
            <Card className="bg-chanox-surface border-chanox-border mb-4">
                <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-zinc-300 text-sm truncate max-w-[60%]">
                            {downloadPath || 'Loading...'}
                        </p>
                        <p className="text-zinc-400 text-sm font-medium">
                            {diskSpace ? `${formatBytes(diskSpace.free)} FREE of ${formatBytes(diskSpace.total)}` : ''}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <Progress
                        value={usedPercentage}
                        className="h-2.5 mb-4 bg-zinc-800"
                    />

                    <div className="flex gap-5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-chanox-accent" />
                            <span className="text-zinc-400 text-xs">Used Space</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-zinc-800" />
                            <span className="text-zinc-400 text-xs">Free Space</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Settings */}
            <Card className="bg-chanox-surface border-chanox-border">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-zinc-100 font-medium">Download Folder</p>
                            <p className="text-zinc-500 text-xs mt-0.5">Location for games and updates</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleChangeLocation}
                            icon={<FolderOpen size={14} />}
                        >
                            Change
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Linux/Mac Sections moved to separate files



// Notifications Section
function NotificationsSection() {
    const { notifications, deleteAllNotifications, markAsRead, deleteNotification } = useNotification();

    return (
        <div>
            <SectionHeader title="Notifications History" />

            <Card className="bg-chanox-surface border-chanox-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base text-zinc-100">Recent Notifications</CardTitle>
                    {notifications.length > 0 && (
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={deleteAllNotifications}
                            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-transparent h-8"
                        >
                            <Trash2 size={14} className="mr-2" />
                            Clear All
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                            <Bell size={48} className="mb-4 opacity-20" />
                            <p>No notifications history</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "flex gap-4 p-4 rounded-lg border transition-all",
                                        notification.isRead
                                            ? "border-chanox-border bg-white/5"
                                            : "border-chanox-accent/30 bg-chanox-accent/5"
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                        notification.isRead ? "bg-zinc-800 text-zinc-500" : "bg-chanox-accent/20 text-chanox-accent"
                                    )}>
                                        <Bell size={14} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-4">
                                            <p className={cn("text-sm font-medium", notification.isRead ? "text-zinc-300" : "text-white")}>
                                                {notification.message}
                                            </p>
                                            <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                                                {format(new Date(notification.createdAt), 'MMM d, yyyy HH:mm')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-500 font-mono">
                                                {notification.type}
                                            </span>
                                            <div className="flex-1" />
                                            {!notification.isRead && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="text-xs text-chanox-accent hover:underline"
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notification.id)}
                                                className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Placeholder Section (Renamed or removed if no longer used by others)
function SecuritySection() {
    return (
        <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <span className="text-5xl mb-4">🛡️</span>
            <p className="text-zinc-400">Security Settings - Coming Soon</p>
        </div>
    );
}

// Main Settings Page
export default function Settings() {
    const navigate = useNavigate();
    const { activeSection, setActiveSection } = useSettingsStore();

    const isLinux = window.navigator.platform.toLowerCase().includes('linux');
    const isMac = window.navigator.platform.toUpperCase().includes('MAC');

    const sidebarItems: { id: SettingsSection; label: string; icon: React.ReactNode; group: string }[] = [
        { id: 'account', label: 'Account', icon: <User size={18} />, group: 'PREFERENCES' },
        { id: 'general', label: 'General', icon: <SettingsIcon size={18} />, group: 'PREFERENCES' },
        { id: 'storage', label: 'Storage', icon: <HardDrive size={18} />, group: 'PREFERENCES' },
        ...(isLinux ? [{ id: 'linux' as const, label: 'Linux', icon: <MonitorCog size={18} />, group: 'PREFERENCES' }] : []),
        ...(isMac ? [{ id: 'mac' as const, label: 'MacOS', icon: <MonitorCog size={18} />, group: 'PREFERENCES' }] : []),
        { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, group: 'APPLICATION' },
        { id: 'security', label: 'Security', icon: <Shield size={18} />, group: 'APPLICATION' },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'account':
                return <AccountSection />;
            case 'general':
                return <GeneralSection />;
            case 'storage':
                return <StorageSection />;
            case 'linux':
                return <LinuxSettings />;
            case 'mac':
                return <MacSettings />;
            case 'notifications':
                return <NotificationsSection />;
            case 'security':
                return <SecuritySection />;
            default:
                return <GeneralSection />;
        }
    };

    const preferencesItems = sidebarItems.filter(item => item.group === 'PREFERENCES');
    const applicationItems = sidebarItems.filter(item => item.group === 'APPLICATION');

    return (
        <div className="flex h-full bg-chanox-background">
            {/* Sidebar */}
            <aside className="w-60 bg-chanox-background border-r border-chanox-border flex flex-col">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="justify-start gap-2 px-4 py-3 text-zinc-400 hover:text-zinc-200 rounded-none border-b border-chanox-border"
                >
                    <ChevronLeft size={18} />
                    <span className="text-sm">Back</span>
                </Button>

                {/* Menu */}
                <ScrollArea className="flex-1">
                    <nav className="py-4 px-2">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-4 mb-2">
                            Preferences
                        </p>
                        {preferencesItems.map((item) => (
                            <SidebarItem
                                key={item.id}
                                label={item.label}
                                icon={item.icon}
                                isActive={activeSection === item.id}
                                onClick={() => setActiveSection(item.id)}
                            />
                        ))}

                        <Separator className="my-3 mx-4 bg-zinc-700/50" />

                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-4 mb-2">
                            Application
                        </p>
                        {applicationItems.map((item) => (
                            <SidebarItem
                                key={item.id}
                                label={item.label}
                                icon={item.icon}
                                isActive={activeSection === item.id}
                                onClick={() => setActiveSection(item.id)}
                            />
                        ))}
                    </nav>
                </ScrollArea>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-2xl">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}
