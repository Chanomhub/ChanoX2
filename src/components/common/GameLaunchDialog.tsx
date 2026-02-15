import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { cn } from '@/lib/utils';
import { Play, CheckCircle2, FileCode, Monitor, FolderOpen, Terminal } from 'lucide-react';

interface LaunchOption {
    path: string;
    type: string;
}

export interface GameLaunchConfig {
    executablePath: string;
    useWine: boolean;
    args?: string[];
    locale?: string;
    engine?: string;
    gameVersion?: string;
}

interface GameLaunchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaveAndPlay: (config: GameLaunchConfig) => void;
    initialConfig?: GameLaunchConfig | null;
    scanResults: LaunchOption[];
    gameTitle: string;
    defaultEngine?: string;
    defaultVersion?: string;
    installPath?: string;
}

export default function GameLaunchDialog({
    open,
    onOpenChange,
    onSaveAndPlay,
    initialConfig,
    scanResults,
    gameTitle,
    defaultEngine,
    defaultVersion,
    installPath
}: GameLaunchDialogProps) {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [useWine, setUseWine] = useState(false);
    const [args, setArgs] = useState('');
    const [locale, setLocale] = useState('');
    const [engine, setEngine] = useState('');
    const [gameVersion, setGameVersion] = useState('');

    useEffect(() => {
        const sortedResults = [...scanResults].sort((a, b) => {
            const isLinux = window.navigator.userAgent.indexOf("Linux") !== -1;
            const isMac = window.navigator.userAgent.indexOf("Mac") !== -1;

            const getScore = (item: LaunchOption) => {
                if (isLinux) {
                    if (item.type === 'native-binary') return 10;
                    if (item.type === 'windows-exe') return 5;
                } else if (isMac) {
                    if (item.type === 'mac-app') return 10;
                } else {
                    if (item.type === 'windows-exe') return 10;
                }
                return 0;
            };

            return getScore(b) - getScore(a);
        });

        if (initialConfig) {
            setSelectedPath(initialConfig.executablePath);
            setUseWine(initialConfig.useWine);
            setArgs(initialConfig.args ? initialConfig.args.join(' ') : '');
            setLocale(initialConfig.locale || '');
            setEngine(initialConfig.engine || defaultEngine || '');
            setGameVersion(initialConfig.gameVersion || defaultVersion || '');
        } else {
            setEngine(defaultEngine || '');
            setGameVersion(defaultVersion || '');

            if (sortedResults.length > 0) {
                setSelectedPath(sortedResults[0].path);
                const isLinux = window.navigator.userAgent.indexOf("Linux") !== -1;
                if (isLinux && sortedResults[0].type === 'windows-exe') {
                    setUseWine(true);
                }
            }
        }
    }, [initialConfig, scanResults, open, defaultEngine, defaultVersion]);

    const handleSave = () => {
        if (selectedPath) {
            onSaveAndPlay({
                executablePath: selectedPath,
                useWine: useWine,
                args: args.trim().length > 0 ? args.trim().split(' ') : [],
                locale: locale.trim() || undefined,
                engine: engine.trim() || undefined,
                gameVersion: gameVersion.trim() || undefined
            });
            onOpenChange(false);
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'windows-exe': return <Monitor className="w-5 h-5 text-blue-400" />;
            case 'mac-app': return <Monitor className="w-5 h-5 text-zinc-300" />;
            case 'native-binary': return <FileCode className="w-5 h-5 text-emerald-400" />;
            default: return <FileCode className="w-5 h-5 text-zinc-400" />;
        }
    };

    const displayedOptions = useMemo(() => {
        return [...scanResults].sort((a, b) => {
            const isLinux = window.navigator.userAgent.indexOf("Linux") !== -1;
            const isMac = window.navigator.userAgent.indexOf("Mac") !== -1;
            const getScore = (item: LaunchOption) => {
                if (isLinux) {
                    if (item.type === 'native-binary') return 10;
                    if (item.type === 'windows-exe') return 5;
                } else if (isMac) {
                    if (item.type === 'mac-app') return 10;
                } else {
                    if (item.type === 'windows-exe') return 10;
                }
                return 0;
            };
            return getScore(b) - getScore(a);
        });
    }, [scanResults]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* แก้ DialogContent ให้เป็น Flex Column และรับ max-height ได้ 90% ของจอ */}
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col bg-zinc-950 border-zinc-800 text-zinc-200 shadow-2xl p-0 overflow-hidden">

                {/* Header Section (ล็อกไว้ ไม่โดนบีบ) */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800/60 bg-zinc-900/50 shrink-0">
                    <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        Launch Configuration
                    </DialogTitle>
                    <p className="text-sm text-zinc-400 truncate mt-1" title={gameTitle}>
                        Configuring for <span className="text-zinc-200 font-semibold">{gameTitle}</span>
                    </p>
                </DialogHeader>

                {/* Body Section (ให้ Scroll ได้ถ้าเนื้อหายาวเกินไป) */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Executable Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Executable</h4>
                            <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                                {displayedOptions.length} Found
                            </span>
                        </div>
                        <ScrollArea className="h-[220px] w-full rounded-xl border border-zinc-800 bg-zinc-900/30 p-1.5 shadow-inner">
                            {displayedOptions.length > 0 ? (
                                <div className="space-y-1">
                                    {displayedOptions.map((option, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border",
                                                selectedPath === option.path
                                                    ? "bg-blue-900/20 border-blue-500/50 shadow-sm"
                                                    : "border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/50"
                                            )}
                                            onClick={() => {
                                                setSelectedPath(option.path);
                                                if (option.type === 'windows-exe') setUseWine(true);
                                                else setUseWine(false);
                                            }}
                                        >
                                            <div className="flex-shrink-0 bg-zinc-800/80 p-2 rounded-md">
                                                {getIconForType(option.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-sm font-semibold truncate",
                                                        selectedPath === option.path ? "text-blue-100" : "text-zinc-200"
                                                    )}>
                                                        {option.path.split(/[/\\]/).pop()}
                                                    </span>
                                                    {index === 0 && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            Recommended
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-zinc-500 truncate mt-0.5" title={option.path}>
                                                    {option.path}
                                                </div>
                                            </div>
                                            {selectedPath === option.path && (
                                                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm p-4 gap-2">
                                    <FileCode className="w-8 h-8 opacity-20" />
                                    No executables found. Please verify game files.
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Configuration Panel */}
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5" /> Launch Arguments
                                </h4>
                                <Input
                                    value={args}
                                    onChange={(e) => setArgs(e.target.value)}
                                    placeholder="e.g. -windowed -noborder"
                                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500/50 text-zinc-200 h-9"
                                />
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Engine</h4>
                                <Input
                                    value={engine}
                                    onChange={(e) => setEngine(e.target.value)}
                                    placeholder="e.g. Unreal Engine 5"
                                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500/50 text-zinc-200 h-9"
                                />
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Version</h4>
                                <Input
                                    value={gameVersion}
                                    onChange={(e) => setGameVersion(e.target.value)}
                                    placeholder="e.g. 1.0.4"
                                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500/50 text-zinc-200 h-9"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 pt-2 border-t border-zinc-800/60">
                            <Checkbox
                                id="wine"
                                checked={useWine}
                                onCheckedChange={(checked) => setUseWine(checked === true)}
                                className="border-zinc-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 h-4 w-4"
                            />
                            <label
                                htmlFor="wine"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-300 cursor-pointer select-none"
                            >
                                Run with Wine <span className="text-zinc-500 font-normal">(Linux Compatibility)</span>
                            </label>
                        </div>
                    </div>

                    {/* Installation Path */}
                    {installPath && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Installation Path</h4>
                            <div className="flex items-center bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-zinc-700 transition-shadow">
                                <div className="flex-1 px-3 py-2 overflow-hidden">
                                    <p className="text-xs text-zinc-400 font-mono truncate" title={installPath}>
                                        {installPath}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.electronAPI?.openPath) {
                                            window.electronAPI.openPath(installPath);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border-l border-zinc-800 shrink-0"
                                >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Open</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section (ล็อกไว้ด้านล่างสุด) */}
                <DialogFooter className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800/60 gap-3 sm:gap-0 shrink-0">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="hover:bg-zinc-800 hover:text-white text-zinc-400"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={!selectedPath}
                        className="w-full sm:w-auto bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                        <Play className="w-4 h-4 mr-2 fill-current" />
                        Save & Play
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}