import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    User, Settings as SettingsIcon, HardDrive, MonitorCog, Bell, Shield,
    ChevronLeft, Check, Loader2, ExternalLink, FolderOpen, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { useSettingsStore, SettingsSection } from '@/stores/settingsStore';
import packageJson from '../../package.json';

import { format } from 'date-fns';
import { useNotification } from '@/contexts/NotificationContext';

// shadcn components
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
        </div>
    );
}

// Storage Section
function StorageSection() {
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

// Linux Settings Section
function LinuxSection() {
    const [wineProvider, setWineProvider] = useState<'internal' | 'bottles'>('internal');
    const [externalCommand, setExternalCommand] = useState('flatpak run com.usebottles.bottles -e %EXE%');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (window.electronAPI) {
            const settings = await window.electronAPI.getGlobalSettings();
            if (settings.wineProvider) {
                setWineProvider(settings.wineProvider);
            }
            if (settings.externalWineCommand) {
                setExternalCommand(settings.externalWineCommand);
            }
        }
    };

    const saveSettings = async (provider: 'internal' | 'bottles', command: string) => {
        if (window.electronAPI) {
            await window.electronAPI.saveGlobalSettings({
                wineProvider: provider,
                externalWineCommand: command
            });
        }
    };

    const handleProviderChange = (provider: 'internal' | 'bottles') => {
        setWineProvider(provider);
        saveSettings(provider, externalCommand);
    };

    const handleCommandChange = (text: string) => {
        setExternalCommand(text);
        saveSettings(wineProvider, text);
    };

    // Only show on Linux
    const isLinux = navigator.platform.toLowerCase().includes('linux');
    if (!isLinux && !window.electronAPI) return null;

    return (
        <div>
            <SectionHeader title="Linux Settings" />

            <Card className="bg-chanox-surface border-chanox-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-zinc-100">Wine Provider</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={wineProvider}
                        onValueChange={(value) => handleProviderChange(value as 'internal' | 'bottles')}
                        className="space-y-3"
                    >
                        {/* Internal Wine Option */}
                        <div
                            className={cn(
                                "flex items-start space-x-3 p-4 rounded-lg border transition-all cursor-pointer",
                                wineProvider === 'internal'
                                    ? "border-chanox-accent bg-chanox-accent/10"
                                    : "border-chanox-border hover:border-zinc-600"
                            )}
                            onClick={() => handleProviderChange('internal')}
                        >
                            <RadioGroupItem value="internal" id="internal" className="mt-0.5" />
                            <div className="flex-1">
                                <Label htmlFor="internal" className="text-zinc-100 font-medium cursor-pointer">
                                    Internal Wine
                                </Label>
                                <p className="text-zinc-500 text-xs mt-1">
                                    Use the system's installed Wine or bundled version.
                                </p>
                            </div>
                        </div>

                        {/* External/Bottles Option */}
                        <div
                            className={cn(
                                "flex items-start space-x-3 p-4 rounded-lg border transition-all cursor-pointer",
                                wineProvider === 'bottles'
                                    ? "border-chanox-accent bg-chanox-accent/10"
                                    : "border-chanox-border hover:border-zinc-600"
                            )}
                            onClick={() => handleProviderChange('bottles')}
                        >
                            <RadioGroupItem value="bottles" id="bottles" className="mt-0.5" />
                            <div className="flex-1">
                                <Label htmlFor="bottles" className="text-zinc-100 font-medium cursor-pointer">
                                    External (Bottles / Custom)
                                </Label>
                                <p className="text-zinc-500 text-xs mt-1">
                                    Launch games using an external command.
                                </p>
                            </div>
                        </div>
                    </RadioGroup>

                    {/* Custom Command Input */}
                    {wineProvider === 'bottles' && (
                        <div className="mt-4 pl-7">
                            <Label className="text-zinc-300 text-sm">Custom Command</Label>
                            <p className="text-zinc-500 text-xs mb-2">
                                Use %EXE% as placeholder for the game executable.
                            </p>
                            <Input
                                value={externalCommand}
                                onChange={(e) => handleCommandChange(e.target.value)}
                                placeholder="e.g. bottles -e %EXE%"
                                className="bg-zinc-800 border-chanox-border text-zinc-200"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

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

    const sidebarItems: { id: SettingsSection; label: string; icon: React.ReactNode; group: string }[] = [
        { id: 'account', label: 'Account', icon: <User size={18} />, group: 'PREFERENCES' },
        { id: 'general', label: 'General', icon: <SettingsIcon size={18} />, group: 'PREFERENCES' },
        { id: 'storage', label: 'Storage', icon: <HardDrive size={18} />, group: 'PREFERENCES' },
        { id: 'linux', label: 'Linux', icon: <MonitorCog size={18} />, group: 'PREFERENCES' },
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
                return <LinuxSection />;
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
