import { Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
    const handleMinimize = () => window.electronAPI?.minimizeWindow();
    const handleMaximize = () => window.electronAPI?.maximizeWindow();
    const handleClose = () => window.electronAPI?.closeWindow();

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

            {/* Window Controls */}
            <div
                className="flex h-full"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
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
