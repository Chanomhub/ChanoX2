import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Minus, Square, X, Settings, LogOut, ChevronDown, User, UserPlus, Check, Bell, Trash2, CheckCheck, Sparkles, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useNewYearCountdown, triggerNewYearPreview } from '@/hooks/useNewYearCountdown';

export default function TitleBar() {
    const navigate = useNavigate();
    const { user, accounts, switchAccount, logout, isAuthenticated } = useAuth();
    const { timeLeft, isNewYear } = useNewYearCountdown();
    const { downloads } = useDownloads();

    // Count active downloads (downloading or extracting)
    const activeDownloadCount = downloads.filter(d => d.status === 'downloading' || d.isExtracting).length;

    console.log('[TitleBar] Render:', { isNewYear, timeLeft });

    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications
    } = useNotification();

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);

    const handleMinimize = () => window.electronAPI?.minimizeWindow();
    const handleMaximize = () => window.electronAPI?.maximizeWindow();
    const handleClose = () => window.electronAPI?.closeWindow();

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setNotificationOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        setDropdownOpen(false);
        logout();
    };

    const handleSettings = () => {
        setDropdownOpen(false);
        navigate('/settings');
    };

    const handleAddAccount = () => {
        setDropdownOpen(false);
        navigate('/login');
    };

    const handleSwitchAccount = async (userId: number) => {
        await switchAccount(userId);
        setDropdownOpen(false);
    };

    const renderNotificationContent = (notification: any) => {
        // Basic rendering based on type
        return (
            <div className="flex-1 min-w-0">
                <p className={cn("text-xs mb-1 break-words", !notification.isRead ? "text-white font-medium" : "text-zinc-400")}>
                    {notification.message}
                </p>
                <p className="text-[10px] text-zinc-500">
                    {format(new Date(notification.createdAt), 'MMM d, HH:mm')}
                </p>
            </div>
        );
    };

    return (
        <div
            className="flex items-center justify-between h-8 bg-background border-b border-border/60 select-none"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            {/* Logo / App Title */}
            <div className="flex items-center gap-2 px-3">
                <span className="text-sm font-bold text-primary tracking-wider">
                    CHANOX2
                </span>
            </div>

            {/* New Year Countdown - Center(ish) */}
            {!isNewYear && timeLeft && (
                <div
                    className="flex items-center gap-2 px-4 py-0.5 bg-black/20 rounded-md border border-white/5 backdrop-blur-sm group"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <span className="text-[10px] text-yellow-500/80 font-bold uppercase tracking-wider">
                        Countdown to 2026
                    </span>
                    <span className="text-xs font-mono font-bold text-white tabular-nums tracking-widest">
                        {timeLeft.days}d {timeLeft.hours.toString().padStart(2, '0')}h {timeLeft.minutes.toString().padStart(2, '0')}m {timeLeft.seconds.toString().padStart(2, '0')}s
                    </span>
                    <button
                        onClick={triggerNewYearPreview}
                        className="ml-2 w-4 h-4 flex items-center justify-center text-white/50 hover:text-yellow-400 transition-colors"
                        title="Preview Celebration"
                    >
                        <Sparkles size={12} />
                    </button>
                </div>
            )}

            {/* Right Section: User + Settings + Controls */}
            <div
                className="flex items-center h-full"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                {/* Download Indicator */}
                {activeDownloadCount > 0 && (
                    <button
                        onClick={() => navigate('/downloads')}
                        className="w-10 h-full flex items-center justify-center hover:bg-muted/50 transition-colors relative group"
                        title={`${activeDownloadCount} active download${activeDownloadCount > 1 ? 's' : ''}`}
                    >
                        <Download size={14} className="text-primary animate-pulse" />
                        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center bg-primary text-[10px] font-bold text-primary-foreground rounded-full">
                            {activeDownloadCount}
                        </span>
                    </button>
                )}

                {/* Notification Bell */}
                {isAuthenticated && (
                    <div className="relative h-full" ref={notificationRef}>
                        <button
                            onClick={() => setNotificationOpen(!notificationOpen)}
                            className="w-10 h-full flex items-center justify-center hover:bg-muted/50 transition-colors relative"
                            title="Notifications"
                        >
                            <Bell size={14} className={cn("transition-colors", unreadCount > 0 ? "text-foreground" : "text-muted-foreground")} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-2 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {notificationOpen && (
                            <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-md shadow-xl z-50 flex flex-col max-h-[80vh]">
                                {/* Header */}
                                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
                                    <h3 className="text-xs font-semibold text-foreground">Notifications</h3>
                                    <div className="flex items-center gap-1">
                                        {unreadCount > 0 && (
                                             <button
                                                onClick={markAllAsRead}
                                                className="p-1 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
                                                title="Mark all as read"
                                            >
                                                <CheckCheck size={12} />
                                            </button>
                                        )}
                                        {notifications?.length > 0 && (
                                            <button
                                                onClick={deleteAllNotifications}
                                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-muted rounded transition-colors"
                                                title="Clear all"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* List */}
                                <div className="overflow-y-auto flex-1 p-0">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <p className="text-xs">No notifications</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {notifications.map(notif => (
                                                <div
                                                    key={notif.id}
                                                    className={cn(
                                                        "relative px-3 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors group flex gap-3",
                                                        !notif.isRead && "bg-primary/5"
                                                    )}
                                                >
                                                    {/* Status Dot */}
                                                    <div className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", !notif.isRead ? "bg-primary" : "bg-transparent")} />

                                                    {renderNotificationContent(notif)}

                                                    {/* Actions (hover) */}
                                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-start">
                                                        {!notif.isRead && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                                                                className="p-1 text-muted-foreground hover:text-primary rounded"
                                                                title="Mark as read"
                                                            >
                                                                <Check size={12} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                                                            className="p-1 text-muted-foreground hover:text-destructive rounded"
                                                            title="Delete"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* User Account Dropdown */}
                {isAuthenticated && user ? (
                    <div className="relative h-full" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 h-full px-3 hover:bg-muted/50 transition-colors"
                        >
                            {/* Avatar */}
                            <div className="w-5 h-5 rounded bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-primary-foreground">
                                    {user.username?.charAt(0).toUpperCase() || '?'}
                                </span>
                            </div>
                            <span className="text-xs text-foreground max-w-[100px] truncate">
                                {user.username}
                            </span>
                            <ChevronDown size={12} className={cn(
                                "text-muted-foreground transition-transform",
                                dropdownOpen && "rotate-180"
                            )} />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-md shadow-xl z-50 overflow-hidden">
                                {/* Current User Info */}
                                <div className="px-3 py-2 border-b border-border">
                                    <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>

                                {/* Accounts Section */}
                                {accounts.length > 0 && (
                                    <div className="border-b border-border">
                                        <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                            Accounts
                                        </p>
                                        <div className="max-h-32 overflow-y-auto">
                                            {accounts.map((account) => (
                                                <button
                                                    key={account.id}
                                                    onClick={() => handleSwitchAccount(account.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors",
                                                        account.id === user.id
                                                            ? "bg-primary/15 text-primary font-medium"
                                                            : "text-foreground hover:bg-muted"
                                                    )}
                                                >
                                                    {/* Mini Avatar */}
                                                    <div className="w-5 h-5 rounded bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[10px] font-bold text-primary-foreground">
                                                            {account.username?.charAt(0).toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <span className="truncate flex-1 text-left">{account.username}</span>
                                                    {account.id === user.id && (
                                                        <Check size={14} className="text-primary flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Add Account Button */}
                                        <button
                                            onClick={handleAddAccount}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        >
                                            <UserPlus size={14} />
                                            <span>Add Account</span>
                                        </button>
                                    </div>
                                )}

                                {/* Menu Items */}
                                <button
                                    onClick={handleSettings}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                    <Settings size={14} />
                                    Settings
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                    <LogOut size={14} />
                                    Logout {user.username}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 h-full px-3 hover:bg-muted/50 transition-colors"
                    >
                        <User size={14} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Login</span>
                    </button>
                )}

                {/* Settings Button (quick access) */}
                <button
                    onClick={() => navigate('/settings')}
                    className="w-8 h-full flex items-center justify-center hover:bg-muted/50 transition-colors"
                    title="Settings"
                >
                    <Settings size={14} className="text-muted-foreground hover:text-foreground" />
                </button>

                {/* Divider */}
                <div className="w-px h-4 bg-border mx-1" />

                {/* Window Controls */}
                <button
                    onClick={handleMinimize}
                    className="w-12 h-full flex items-center justify-center hover:bg-muted/50 transition-colors"
                    aria-label="Minimize"
                >
                    <Minus size={14} className="text-muted-foreground hover:text-foreground" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="w-12 h-full flex items-center justify-center hover:bg-muted/50 transition-colors"
                    aria-label="Maximize"
                >
                    <Square size={12} className="text-muted-foreground hover:text-foreground" />
                </button>
                <button
                    onClick={handleClose}
                    className="w-12 h-full flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    aria-label="Close"
                >
                    <X size={16} className="text-muted-foreground hover:text-destructive-foreground" />
                </button>
            </div>
        </div>
    );
}
