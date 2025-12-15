import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Square, X, Settings, LogOut, ChevronDown, User, UserPlus, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function TitleBar() {
    const navigate = useNavigate();
    const { user, accounts, switchAccount, logout, isAuthenticated } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleMinimize = () => window.electronAPI?.minimizeWindow();
    const handleMaximize = () => window.electronAPI?.maximizeWindow();
    const handleClose = () => window.electronAPI?.closeWindow();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
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

    return (
        <div
            className="flex items-center justify-between h-8 bg-[#171d25] select-none"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            {/* Logo / App Title */}
            <div className="flex items-center gap-2 px-3">
                <span className="text-sm font-bold text-chanox-accent tracking-wider">
                    CHANOX2
                </span>
            </div>

            {/* Right Section: User + Settings + Controls */}
            <div
                className="flex items-center h-full"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                {/* User Account Dropdown */}
                {isAuthenticated && user ? (
                    <div className="relative h-full" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 h-full px-3 hover:bg-white/10 transition-colors"
                        >
                            {/* Avatar */}
                            <div className="w-5 h-5 rounded bg-gradient-to-br from-chanox-accent to-blue-600 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">
                                    {user.username?.charAt(0).toUpperCase() || '?'}
                                </span>
                            </div>
                            <span className="text-xs text-zinc-300 max-w-[100px] truncate">
                                {user.username}
                            </span>
                            <ChevronDown size={12} className={cn(
                                "text-zinc-400 transition-transform",
                                dropdownOpen && "rotate-180"
                            )} />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-[#1b2838] border border-chanox-border rounded-md shadow-lg z-50 overflow-hidden">
                                {/* Current User Info */}
                                <div className="px-3 py-2 border-b border-chanox-border">
                                    <p className="text-sm font-medium text-white truncate">{user.username}</p>
                                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                                </div>

                                {/* Accounts Section */}
                                {accounts.length > 0 && (
                                    <div className="border-b border-chanox-border">
                                        <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
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
                                                            ? "bg-chanox-accent/10 text-chanox-accent"
                                                            : "text-zinc-300 hover:bg-white/5"
                                                    )}
                                                >
                                                    {/* Mini Avatar */}
                                                    <div className="w-5 h-5 rounded bg-gradient-to-br from-chanox-accent/80 to-blue-600/80 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[10px] font-bold text-white">
                                                            {account.username?.charAt(0).toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <span className="truncate flex-1 text-left">{account.username}</span>
                                                    {account.id === user.id && (
                                                        <Check size={14} className="text-chanox-accent flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Add Account Button */}
                                        <button
                                            onClick={handleAddAccount}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-300 transition-colors"
                                        >
                                            <UserPlus size={14} />
                                            <span>Add Account</span>
                                        </button>
                                    </div>
                                )}

                                {/* Menu Items */}
                                <button
                                    onClick={handleSettings}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
                                >
                                    <Settings size={14} />
                                    Settings
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
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
                        className="flex items-center gap-2 h-full px-3 hover:bg-white/10 transition-colors"
                    >
                        <User size={14} className="text-zinc-400" />
                        <span className="text-xs text-zinc-400">Login</span>
                    </button>
                )}

                {/* Settings Button (quick access) */}
                <button
                    onClick={() => navigate('/settings')}
                    className="w-8 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    title="Settings"
                >
                    <Settings size={14} className="text-zinc-400" />
                </button>

                {/* Divider */}
                <div className="w-px h-4 bg-zinc-700 mx-1" />

                {/* Window Controls */}
                <button
                    onClick={handleMinimize}
                    className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    aria-label="Minimize"
                >
                    <Minus size={14} className="text-zinc-400" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="w-12 h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    aria-label="Maximize"
                >
                    <Square size={12} className="text-zinc-400" />
                </button>
                <button
                    onClick={handleClose}
                    className="w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    aria-label="Close"
                >
                    <X size={16} className="text-zinc-400" />
                </button>
            </div>
        </div>
    );
}
