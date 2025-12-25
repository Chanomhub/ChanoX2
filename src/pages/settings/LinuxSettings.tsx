import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

function SectionHeader({ title }: { title: string }) {
    return (
        <div className="mb-6">
            <h2 className="text-2xl font-light text-zinc-100 tracking-wide">{title}</h2>
            <Separator className="mt-3 bg-zinc-700/50" />
        </div>
    );
}

export function LinuxSettings() {
    const [wineProvider, setWineProvider] = useState<'internal' | 'bottles' | 'custom'>('internal');
    const [externalCommand, setExternalCommand] = useState('bottles-cli run -b Gaming -e %EXE%');
    const [availableBottles, setAvailableBottles] = useState<string[]>([]);
    const [selectedBottle, setSelectedBottle] = useState<string>('');
    const [loadingBottles, setLoadingBottles] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (wineProvider === 'bottles') {
            loadBottles();
        }
    }, [wineProvider]);

    const loadSettings = async () => {
        if (window.electronAPI) {
            const settings = await window.electronAPI.getGlobalSettings();
            if (settings.wineProvider) {
                setWineProvider(settings.wineProvider);
            }
            if (settings.externalWineCommand) {
                setExternalCommand(settings.externalWineCommand);
                // Extract bottle name from command
                const match = settings.externalWineCommand.match(/-b\s+([^\s]+)/);
                if (match) {
                    setSelectedBottle(match[1]);
                }
            }
        }
    };

    const loadBottles = async () => {
        if (!window.electronAPI) return;
        setLoadingBottles(true);
        try {
            const result = await window.electronAPI.listBottles();
            if (result.success && result.bottles.length > 0) {
                setAvailableBottles(result.bottles);
                // Auto-select first bottle if none selected
                if (!selectedBottle && result.bottles.length > 0) {
                    const firstBottle = result.bottles[0];
                    setSelectedBottle(firstBottle);
                    const newCommand = `bottles-cli run -b ${firstBottle} -e %EXE%`;
                    setExternalCommand(newCommand);
                    saveSettings('bottles', newCommand);
                }
            }
        } catch (error) {
            console.error('Failed to load bottles:', error);
        } finally {
            setLoadingBottles(false);
        }
    };

    const saveSettings = async (provider: 'internal' | 'bottles' | 'custom', command: string) => {
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

    const handleBottleSelect = (bottleName: string) => {
        setSelectedBottle(bottleName);
        const newCommand = `bottles-cli run -b ${bottleName} -e %EXE%`;
        setExternalCommand(newCommand);
        saveSettings(wineProvider, newCommand);
    };

    const handleCommandChange = (text: string) => {
        setExternalCommand(text);
        saveSettings(wineProvider, text);
        // Extract bottle name if changed manually
        const match = text.match(/-b\s+([^\s]+)/);
        if (match) {
            setSelectedBottle(match[1]);
        }
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
                        value={wineProvider === 'custom' ? 'internal' : wineProvider} // Map custom to internal for radio group if not supported in UI yet, or handle it
                        // Better: just stick to 'internal' | 'bottles' for now as that's what the UI supports
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
                                    Bottles
                                </Label>
                                <p className="text-zinc-500 text-xs mt-1">
                                    Launch games using Bottles wine manager.
                                </p>
                            </div>
                        </div>
                    </RadioGroup>

                    {/* Bottles Selection */}
                    {wineProvider === 'bottles' && (
                        <div className="mt-4 pl-7 space-y-4">
                            {/* Bottle Dropdown */}
                            <div>
                                <Label className="text-zinc-300 text-sm">Select Bottle</Label>
                                <p className="text-zinc-500 text-xs mb-2">
                                    Choose which bottle to use for running games.
                                </p>
                                {loadingBottles ? (
                                    <div className="flex items-center gap-2 text-zinc-400 text-sm py-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        Loading bottles...
                                    </div>
                                ) : availableBottles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {availableBottles.map((bottle) => (
                                            <button
                                                key={bottle}
                                                onClick={() => handleBottleSelect(bottle)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-sm transition-all",
                                                    selectedBottle === bottle
                                                        ? "bg-chanox-accent text-black font-medium"
                                                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                                )}
                                            >
                                                {bottle}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-zinc-500 text-sm py-2">
                                        No bottles found. Make sure Bottles is installed and has at least one bottle.
                                        <button
                                            onClick={loadBottles}
                                            className="ml-2 text-chanox-accent hover:underline"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Custom Command (Advanced) */}
                            <div>
                                <Label className="text-zinc-300 text-sm">Command (Advanced)</Label>
                                <p className="text-zinc-500 text-xs mb-2">
                                    Auto-generated command. Edit for custom configurations.
                                </p>
                                <Input
                                    value={externalCommand}
                                    onChange={(e) => handleCommandChange(e.target.value)}
                                    placeholder="e.g. bottles-cli run -b Gaming -e %EXE%"
                                    className="bg-zinc-800 border-chanox-border text-zinc-200 font-mono text-xs"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
