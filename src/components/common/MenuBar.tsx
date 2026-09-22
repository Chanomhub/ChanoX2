import { Link, useLocation } from 'react-router';
import { Store, Library, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
    { to: '/', label: 'STORE', icon: Store },
    { to: '/library', label: 'LIBRARY', icon: Library },
    { to: '/downloads', label: 'DOWNLOADS', icon: Download },
];

export default function MenuBar() {
    const location = useLocation();

    return (
        <nav className="flex items-center gap-1 h-10 px-4 bg-card border-b border-border/80">
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
                                ? "bg-primary/15 text-primary font-semibold border-b-2 border-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
