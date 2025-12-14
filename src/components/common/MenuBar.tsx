import { Link, useLocation } from 'react-router-dom';
import { Store, Library, Download, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
    { to: '/', label: 'STORE', icon: Store },
    { to: '/library', label: 'LIBRARY', icon: Library },
    { to: '/downloads', label: 'DOWNLOADS', icon: Download },
    { to: '/search', label: 'SEARCH', icon: Search },
];

export default function MenuBar() {
    const location = useLocation();

    return (
        <nav className="flex items-center gap-1 h-10 px-4 bg-[#1b2838] border-b border-chanox-border">
            {menuItems.map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname === to ||
                    (to !== '/' && location.pathname.startsWith(to));

                return (
                    <Link
                        key={to}
                        to={to}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors",
                            isActive
                                ? "bg-chanox-accent/20 text-chanox-accent"
                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Icon size={16} />
                        <span>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
