import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { cn } from '@/lib/utils';
import { Play, CheckCircle2, FileCode, Monitor } from 'lucide-react';

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
}

export default function GameLaunchDialog({
    open,
    onOpenChange,
    onSaveAndPlay,
    initialConfig,
    scanResults,
    gameTitle,
    defaultEngine,
    defaultVersion
}: GameLaunchDialogProps) {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [useWine, setUseWine] = useState(false);
    const [args, setArgs] = useState('');
    const [locale, setLocale] = useState('');
    const [engine, setEngine] = useState('');
    const [gameVersion, setGameVersion] = useState('');

    useEffect(() => {
        // Sort results similar to legacy logic
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
            case 'mac-app': return <Monitor className="w-5 h-5 text-gray-300" />; // Replace with apple icon if using FA/other pack
            case 'native-binary': return <FileCode className="w-5 h-5 text-green-400" />; // Replace with Tux if available
            default: return <FileCode className="w-5 h-5" />;
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
            <DialogContent className="sm:max-w-[600px] bg-[#1b2838] border-[#2a475e] text-[#dcdedf]">
                <DialogHeader>
                    <DialogTitle className="text-white text-lg font-bold">Launch Options</DialogTitle>
                    <p className="text-sm text-[#8b929a] truncate" title={gameTitle}>{gameTitle}</p>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-[#8b929a] uppercase">Select Executable</h4>
                        <ScrollArea className="h-[200px] w-full rounded-md border border-[#2a2e36] bg-[#101214] p-1">
                            {displayedOptions.length > 0 ? (
                                <div className="space-y-1">
                                    {displayedOptions.map((option, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded cursor-pointer transition-colors",
                                                selectedPath === option.path ? "bg-[#2a475e]" : "hover:bg-[#2a2e36]"
                                            )}
                                            onClick={() => {
                                                setSelectedPath(option.path);
                                                if (option.type === 'windows-exe') setUseWine(true);
                                                else setUseWine(false);
                                            }}
                                        >
                                            {getIconForType(option.type)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium truncate text-[#dcdedf]">{option.path.split(/[/\\]/).pop()}</span>
                                                </div>
                                                <div className="text-xs text-[#6e7681] break-all">{option.path}</div>
                                            </div>
                                            {selectedPath === option.path && (
                                                <CheckCircle2 className="w-5 h-5 text-[#66c0f4]" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-[#8b929a] text-sm p-4">
                                    No executables found. Please verify game files.
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-[#8b929a] uppercase">Launch Arguments</h4>
                            <Input
                                value={args}
                                onChange={(e) => setArgs(e.target.value)}
                                placeholder="e.g. -windowed -noborder"
                                className="bg-[#101214] border-[#2a2e36] text-[#dcdedf]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-[#8b929a] uppercase">Game Engine</h4>
                                <Input
                                    value={engine}
                                    onChange={(e) => setEngine(e.target.value)}
                                    placeholder="e.g. Unreal Engine 5"
                                    className="bg-[#101214] border-[#2a2e36] text-[#dcdedf]"
                                />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-[#8b929a] uppercase">Game Version</h4>
                                <Input
                                    value={gameVersion}
                                    onChange={(e) => setGameVersion(e.target.value)}
                                    placeholder="e.g. 1.0.4"
                                    className="bg-[#101214] border-[#2a2e36] text-[#dcdedf]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="wine"
                                checked={useWine}
                                onCheckedChange={(checked) => setUseWine(checked === true)}
                                className="border-[#3d4450] data-[state=checked]:bg-[#66c0f4] data-[state=checked]:text-black"
                            />
                            <label
                                htmlFor="wine"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-[#dcdedf]"
                            >
                                Run with Wine (Linux Compatibility)
                            </label>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={!selectedPath}
                        className="w-full sm:w-auto bg-[#4cff00] text-black hover:bg-[#3de000]"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        Save & Play
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
