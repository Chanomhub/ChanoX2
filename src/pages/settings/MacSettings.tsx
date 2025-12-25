import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
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

export function MacSettings() {
    const [useCustomCommand, setUseCustomCommand] = useState(false);
    const [externalCommand, setExternalCommand] = useState('open -a "CrossOver" --args %EXE%');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (window.electronAPI) {
            const settings = await window.electronAPI.getGlobalSettings();
            if (settings.wineProvider === 'custom') {
                setUseCustomCommand(true);
            }
            if (settings.externalWineCommand) {
                setExternalCommand(settings.externalWineCommand);
            }
        }
    };

    const saveSettings = async (enabled: boolean, command: string) => {
        if (window.electronAPI) {
            await window.electronAPI.saveGlobalSettings({
                wineProvider: enabled ? 'custom' : 'internal',
                externalWineCommand: command
            });
        }
    };

    const handleToggleCustom = (enabled: boolean) => {
        setUseCustomCommand(enabled);
        saveSettings(enabled, externalCommand);
    };

    const handleCommandChange = (text: string) => {
        setExternalCommand(text);
        saveSettings(useCustomCommand, text);
    };

    return (
        <div>
            <SectionHeader title="MacOS Settings" />

            <Card className="bg-chanox-surface border-chanox-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-zinc-100">Compatibility Layer</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-zinc-100 font-medium">Use Custom Launch Command</Label>
                                <p className="text-zinc-500 text-xs">
                                    Enable to run Windows games using CrossOver, Whiskey, or external Wine.
                                </p>
                            </div>
                            <div
                                className={cn(
                                    "w-11 h-6 rounded-full relative transition-colors cursor-pointer",
                                    useCustomCommand ? "bg-chanox-accent" : "bg-zinc-700"
                                )}
                                onClick={() => handleToggleCustom(!useCustomCommand)}
                            >
                                <div
                                    className={cn(
                                        "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                                        useCustomCommand ? "translate-x-5" : "translate-x-0"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Custom Launch Command Input */}
                        {useCustomCommand && (
                            <div className="pt-2 border-t border-zinc-800">
                                <Label className="text-zinc-300 text-sm mb-2 block">Command Template</Label>
                                <Input
                                    value={externalCommand}
                                    onChange={(e) => handleCommandChange(e.target.value)}
                                    placeholder='e.g. open -a "CrossOver" --args %EXE%'
                                    className="bg-zinc-800 border-chanox-border text-zinc-200 font-mono text-xs"
                                />
                                <p className="text-zinc-500 text-[10px] mt-2">
                                    Use <span className="text-chanox-accent font-mono">%EXE%</span> as a placeholder for the game executable path.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
