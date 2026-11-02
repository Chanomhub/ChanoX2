import { ReactNode } from 'react';
import TitleBar from './TitleBar';
import MenuBar from './MenuBar';
import NewYearCelebration from './NewYearCelebration';
import { Toaster } from 'sonner';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    console.log('Layout rendering');
    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            <Toaster richColors position="top-right" theme="dark" />
            <NewYearCelebration />

            {/* Custom Title Bar */}
            <TitleBar />

            {/* Menu Bar */}
            <MenuBar />

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
