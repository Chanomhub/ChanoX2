import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Settings as SettingsIcon, HardDrive, MonitorCog, Bell, Shield,
    ChevronLeft, Check, Loader2, ExternalLink, FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettingsStore, SettingsSection } from '@/stores/settingsStore';
import packageJson from '../../package.json';

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

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'th', label: 'ไทย' },
];

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
            <div className="h-px bg-zinc-700/50 mt-3" />
        </div>
    );
}

// Card Component
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            "bg-chanox-surface border border-chanox-border rounded-lg p-5 mb-4",
            className
        )}>
            {children}
        </div>
    );
}

// Account Section
function AccountSection() {
    const { user, logout } = useAuth();

    return (
        <div>
            <SectionHeader title="Account Details" />
            <Card>
                <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-chanox-accent to-blue-600 flex items-center justify-center">
                            <span className="text-3xl font-bold text-white">
                                {user?.username?.charAt(0).toUpperCase() || '?'}
                            </span>
                        </div>
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
                        <button className="px-4 py-2 text-sm border border-zinc-600 rounded-md text-zinc-300 hover:bg-white/5 transition-colors">
                            Edit Profile
                        </button>
                        {user && (
                            <button
                                onClick={logout}
                                className="px-4 py-2 text-sm border border-red-500/50 rounded-md text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </div>
            </Card>

            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-6 mb-3">
                Security & Privacy
            </h3>
            <Card className="bg-zinc-800/50">
                <p className="text-zinc-400 text-sm">
                    Two-factor authentication is currently{' '}
                    <span className="text-red-400 font-medium">Disabled</span>.
                </p>
            </Card>
        </div>
    );
}

// General Section
function GeneralSection() {
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
    const [language, setLanguage] = useState('en');
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
            <Card>
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
                            <button
                                onClick={() => releaseUrl && window.electronAPI?.openExternal(releaseUrl)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md flex items-center gap-2 transition-colors"
                            >
                                <ExternalLink size={14} />
                                Update to v{latestVersion}
                            </button>
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
            </Card>

            <SectionHeader title="Language" />

            {/* Language Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((lang) => (
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
                        <span className={cn(language === lang.code && "font-medium")}>
                            {lang.label}
                        </span>
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
            <Card>
                <div className="flex justify-between items-center mb-3">
                    <p className="text-zinc-300 text-sm truncate max-w-[60%]">
                        {downloadPath || 'Loading...'}
                    </p>
                    <p className="text-zinc-400 text-sm font-medium">
                        {diskSpace ? `${formatBytes(diskSpace.free)} FREE of ${formatBytes(diskSpace.total)}` : ''}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
                    <div
                        className="h-full bg-gradient-to-r from-chanox-accent to-blue-500 transition-all"
                        style={{ width: `${usedPercentage}%` }}
                    />
                </div>

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
            </Card>

            {/* Settings */}
            <Card>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-zinc-100 font-medium">Download Folder</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Location for games and updates</p>
                    </div>
                    <button
                        onClick={handleChangeLocation}
                        className="px-4 py-2 text-sm border border-zinc-600 rounded-md text-zinc-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                        <FolderOpen size={14} />
                        Change
                    </button>
                </div>
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

            <Card>
                <p className="text-zinc-100 font-medium mb-4">Wine Provider</p>

                {/* Internal Wine Option */}
                <button
                    onClick={() => handleProviderChange('internal')}
                    className={cn(
                        "w-full p-4 rounded-lg border mb-3 text-left transition-all",
                        wineProvider === 'internal'
                            ? "border-chanox-accent bg-chanox-accent/10"
                            : "border-chanox-border hover:border-zinc-600"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            wineProvider === 'internal' ? "border-chanox-accent" : "border-zinc-600"
                        )}>
                            {wineProvider === 'internal' && (
                                <div className="w-2.5 h-2.5 bg-chanox-accent rounded-full" />
                            )}
                        </div>
                        <span className="text-zinc-100 font-medium">Internal Wine</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-2 ml-8">
                        Use the system's installed Wine or bundled version.
                    </p>
                </button>

                {/* External/Bottles Option */}
                <button
                    onClick={() => handleProviderChange('bottles')}
                    className={cn(
                        "w-full p-4 rounded-lg border text-left transition-all",
                        wineProvider === 'bottles'
                            ? "border-chanox-accent bg-chanox-accent/10"
                            : "border-chanox-border hover:border-zinc-600"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            wineProvider === 'bottles' ? "border-chanox-accent" : "border-zinc-600"
                        )}>
                            {wineProvider === 'bottles' && (
                                <div className="w-2.5 h-2.5 bg-chanox-accent rounded-full" />
                            )}
                        </div>
                        <span className="text-zinc-100 font-medium">External (Bottles / Custom)</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-2 ml-8">
                        Launch games using an external command.
                    </p>
                </button>

                {/* Custom Command Input */}
                {wineProvider === 'bottles' && (
                    <div className="mt-4 pl-8">
                        <label className="text-zinc-300 text-sm font-medium">Custom Command</label>
                        <p className="text-zinc-500 text-xs mb-2">
                            Use %EXE% as placeholder for the game executable.
                        </p>
                        <input
                            type="text"
                            value={externalCommand}
                            onChange={(e) => handleCommandChange(e.target.value)}
                            placeholder="e.g. bottles -e %EXE%"
                            className="w-full px-3 py-2 bg-zinc-800 border border-chanox-border rounded-md text-zinc-200 text-sm focus:outline-none focus:border-chanox-accent"
                        />
                    </div>
                )}
            </Card>
        </div>
    );
}

// Placeholder Section
function PlaceholderSection({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <span className="text-5xl mb-4">🚧</span>
            <p className="text-zinc-400">{title} - Coming Soon</p>
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
                return <PlaceholderSection title="Notifications" />;
            case 'security':
                return <PlaceholderSection title="Security" />;
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
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-4 py-3 text-zinc-400 hover:text-zinc-200 transition-colors border-b border-chanox-border"
                >
                    <ChevronLeft size={18} />
                    <span className="text-sm">Back</span>
                </button>

                {/* Menu */}
                <nav className="flex-1 py-4 px-2 overflow-y-auto">
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

                    <div className="h-px bg-zinc-700/50 my-3 mx-4" />

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
