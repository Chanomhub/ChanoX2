import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type WineProvider = 'internal' | 'bottles' | 'proton';

function SectionHeader({ title }: { title: string }) {
    return (
        <div className="mb-6">
            <h2 className="text-2xl font-light text-zinc-100 tracking-wide">{title}</h2>
            <Separator className="mt-3 bg-zinc-700/50" />
        </div>
    );
}

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function LinuxSettings() {
    const [wineProvider, setWineProvider] = useState<WineProvider>('internal');
    const [externalCommand, setExternalCommand] = useState('bottles-cli run -b Gaming -e %EXE%');
    const [availableBottles, setAvailableBottles] = useState<string[]>([]);
    const [selectedBottle, setSelectedBottle] = useState<string>('');
    const [loadingBottles, setLoadingBottles] = useState(false);
    const [protonPath, setProtonPath] = useState('/home/jop/Downloads/GE-Proton10-34');
    const [protonPrefixPath, setProtonPrefixPath] = useState('');
    const [detectedProtons, setDetectedProtons] = useState<{ name: string; path: string }[]>([]);

    // GE-Proton Downloader state
    const [releases, setReleases] = useState<any[]>([]);
    const [selectedRelease, setSelectedRelease] = useState<string>('');
    const [isFetchingReleases, setIsFetchingReleases] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<any>(null);
    const [installError, setInstallError] = useState<string | null>(null);
    const [installSuccess, setInstallSuccess] = useState(false);

    useEffect(() => { loadSettings(); }, []);

    useEffect(() => {
        if (wineProvider === 'bottles') loadBottles();
    }, [wineProvider]);

    useEffect(() => {
        if (wineProvider === 'proton' && releases.length === 0) {
            fetchReleases();
        }
    }, [wineProvider]);

    const fetchReleases = async () => {
        if (!window.electronAPI || !window.electronAPI.getProtonGeReleases) return;
        setIsFetchingReleases(true);
        setInstallError(null);
        try {
            const rels = await window.electronAPI.getProtonGeReleases();
            setReleases(rels);
            if (rels.length > 0) {
                setSelectedRelease(rels[0].tagName);
            }
        } catch (e: any) {
            console.error('Failed to fetch Proton releases:', e);
            setInstallError('Failed to fetch Proton releases from GitHub. Please try again.');
        } finally {
            setIsFetchingReleases(false);
        }
    };

    const handleInstallProton = async () => {
        const release = releases.find(r => r.tagName === selectedRelease);
        if (!release || !window.electronAPI || !window.electronAPI.downloadAndInstallProtonGe) return;

        setIsInstalling(true);
        setInstallError(null);
        setInstallSuccess(false);
        setDownloadProgress({ percent: 0, downloadedBytes: 0, totalBytes: release.size, status: 'downloading' });

        let cleanupProgress: (() => void) | void = undefined;
        if (window.electronAPI.onProtonDownloadProgress) {
            cleanupProgress = window.electronAPI.onProtonDownloadProgress((data) => {
                setDownloadProgress(data);
            });
        }

        try {
            const res = await window.electronAPI.downloadAndInstallProtonGe(release.tagName, release.tarUrl);
            if (res.success) {
                setInstallSuccess(true);
                await loadSettings();
                if (res.path) {
                    handleProtonPathChange(res.path);
                }
            } else {
                setInstallError(res.error || 'Failed to install Proton.');
            }
        } catch (e: any) {
            console.error('Proton installation error:', e);
            setInstallError(e.message || 'An error occurred during installation.');
        } finally {
            setIsInstalling(false);
            setDownloadProgress(null);
            if (cleanupProgress) cleanupProgress();
        }
    };

    const handleCancelInstall = async () => {
        if (!window.electronAPI || !window.electronAPI.cancelProtonDownload) return;
        try {
            await window.electronAPI.cancelProtonDownload();
        } catch (e) {
            console.error('Failed to cancel Proton download:', e);
        }
    };

    const loadSettings = async () => {
        if (!window.electronAPI) return;
        const settings = await window.electronAPI.getGlobalSettings();
        if (settings.wineProvider) setWineProvider(settings.wineProvider as WineProvider);
        if (settings.externalWineCommand) {
            setExternalCommand(settings.externalWineCommand as string);
            const match = (settings.externalWineCommand as string).match(/-b\s+([^\s]+)/);
            if (match) setSelectedBottle(match[1]);
        }

        // Search for system installed Proton versions
        let protonsList: { name: string; path: string }[] = [];
        if (window.electronAPI.findInstalledProtons) {
            try {
                protonsList = await window.electronAPI.findInstalledProtons();
                setDetectedProtons(protonsList);
            } catch (e) {
                console.error('Failed to search Proton versions:', e);
            }
        }

        if (settings.protonPath) {
            setProtonPath(settings.protonPath as string);
        } else if (protonsList.length > 0) {
            // Default to first detected Proton if not set
            setProtonPath(protonsList[0].path);
            saveSettings(
                settings.wineProvider as WineProvider || 'internal',
                settings.externalWineCommand as string || 'bottles-cli run -b Gaming -e %EXE%',
                protonsList[0].path,
                settings.protonPrefixPath as string || ''
            );
        } else {
            setProtonPath('/home/jop/Downloads/GE-Proton10-34');
        }

        if (settings.protonPrefixPath) setProtonPrefixPath(settings.protonPrefixPath as string);
    };

    const loadBottles = async () => {
        if (!window.electronAPI) return;
        setLoadingBottles(true);
        try {
            const result = await window.electronAPI.listBottles();
            if (result.success && result.bottles.length > 0) {
                setAvailableBottles(result.bottles);
                if (!selectedBottle) {
                    const first = result.bottles[0];
                    setSelectedBottle(first);
                    const cmd = `bottles-cli run -b ${first} -e %EXE%`;
                    setExternalCommand(cmd);
                    saveSettings('bottles', cmd, protonPath, protonPrefixPath);
                }
            }
        } catch (e) {
            console.error('Failed to load bottles:', e);
        } finally {
            setLoadingBottles(false);
        }
    };

    const saveSettings = async (
        provider: WineProvider,
        command: string,
        pPath: string,
        pPrefix: string
    ) => {
        if (window.electronAPI) {
            await window.electronAPI.saveGlobalSettings({
                wineProvider: provider,
                externalWineCommand: command,
                protonPath: pPath,
                protonPrefixPath: pPrefix,
            });
        }
    };

    const handleProviderChange = (provider: WineProvider) => {
        setWineProvider(provider);
        saveSettings(provider, externalCommand, protonPath, protonPrefixPath);
    };

    const handleBottleSelect = (bottleName: string) => {
        setSelectedBottle(bottleName);
        const cmd = `bottles-cli run -b ${bottleName} -e %EXE%`;
        setExternalCommand(cmd);
        saveSettings('bottles', cmd, protonPath, protonPrefixPath);
    };

    const handleCommandChange = (text: string) => {
        setExternalCommand(text);
        saveSettings(wineProvider, text, protonPath, protonPrefixPath);
        const match = text.match(/-b\s+([^\s]+)/);
        if (match) setSelectedBottle(match[1]);
    };

    const handleProtonPathChange = (val: string) => {
        setProtonPath(val);
        saveSettings(wineProvider, externalCommand, val, protonPrefixPath);
    };

    const handleProtonPrefixChange = (val: string) => {
        setProtonPrefixPath(val);
        saveSettings(wineProvider, externalCommand, protonPath, val);
    };

    const isLinux = navigator.platform.toLowerCase().includes('linux');
    if (!isLinux && !window.electronAPI) return null;

    return (
        <div>
            <SectionHeader title="Linux Settings" />

            <Card className="bg-chanox-surface border-chanox-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base text-zinc-100">Wine / Proton Provider</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={wineProvider}
                        onValueChange={(v) => handleProviderChange(v as WineProvider)}
                        className="space-y-3"
                    >
                        {/* Internal Wine */}
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
                                    System Wine
                                </Label>
                                <p className="text-zinc-500 text-xs mt-1">Use the system's installed Wine.</p>
                            </div>
                        </div>

                        {/* Bottles */}
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
                                <p className="text-zinc-500 text-xs mt-1">Launch games using Bottles wine manager.</p>
                            </div>
                        </div>

                        {/* GE-Proton */}
                        <div
                            className={cn(
                                "flex items-start space-x-3 p-4 rounded-lg border transition-all cursor-pointer",
                                wineProvider === 'proton'
                                    ? "border-chanox-accent bg-chanox-accent/10"
                                    : "border-chanox-border hover:border-zinc-600"
                            )}
                            onClick={() => handleProviderChange('proton')}
                        >
                            <RadioGroupItem value="proton" id="proton" className="mt-0.5" />
                            <div className="flex-1">
                                <Label htmlFor="proton" className="text-zinc-100 font-medium cursor-pointer">
                                    GE-Proton
                                </Label>
                                <p className="text-zinc-500 text-xs mt-1">
                                    Use a local GE-Proton build as the Wine backend (recommended for games with anti-cheat or media codecs).
                                </p>
                            </div>
                        </div>
                    </RadioGroup>

                    {/* Bottles sub-options */}
                    {wineProvider === 'bottles' && (
                        <div className="mt-4 pl-7 space-y-4">
                            <div>
                                <Label className="text-zinc-300 text-sm">Select Bottle</Label>
                                <p className="text-zinc-500 text-xs mb-2">Choose which bottle to use for running games.</p>
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
                                        No bottles found.
                                        <button onClick={loadBottles} className="ml-2 text-chanox-accent hover:underline">
                                            Retry
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label className="text-zinc-300 text-sm">Command (Advanced)</Label>
                                <p className="text-zinc-500 text-xs mb-2">Auto-generated. Edit for custom configurations.</p>
                                <Input
                                    value={externalCommand}
                                    onChange={(e) => handleCommandChange(e.target.value)}
                                    placeholder="bottles-cli run -b Gaming -e %EXE%"
                                    className="bg-zinc-800 border-chanox-border text-zinc-200 font-mono text-xs"
                                />
                            </div>
                        </div>
                    )}

                    {/* Proton sub-options */}
                    {wineProvider === 'proton' && (
                        <div className="mt-4 pl-7 space-y-4">
                            <div>
                                <Label className="text-zinc-300 text-sm">Detected Protons</Label>
                                <p className="text-zinc-500 text-xs mb-2">
                                    Click on any detected Proton tool to select it.
                                </p>
                                {detectedProtons.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {detectedProtons.map((proton) => (
                                            <button
                                                key={proton.path}
                                                onClick={() => handleProtonPathChange(proton.path)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs transition-all border",
                                                    protonPath === proton.path
                                                        ? "bg-green-500/10 text-green-400 border-green-500/50 font-medium"
                                                        : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200"
                                                )}
                                            >
                                                {proton.name}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-zinc-500 text-xs italic mb-3">
                                        No local Proton installations detected. (Steam compatibilitytools.d, etc.)
                                    </p>
                                )}
                            </div>

                            {/* GE-Proton Installer */}
                            <div className="border border-chanox-border rounded-lg p-4 bg-zinc-900/40 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-zinc-200 text-sm font-semibold">Install GE-Proton from GitHub</Label>
                                        <p className="text-zinc-500 text-xs mt-0.5">
                                            Download and install GE-Proton releases automatically.
                                        </p>
                                    </div>
                                    <button
                                        onClick={fetchReleases}
                                        disabled={isFetchingReleases || isInstalling}
                                        className="text-xs text-chanox-accent hover:underline disabled:text-zinc-600 disabled:no-underline"
                                    >
                                        {releases.length > 0 ? 'Refresh Releases' : 'Fetch Releases'}
                                    </button>
                                </div>

                                {isFetchingReleases && (
                                    <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
                                        <Loader2 size={14} className="animate-spin" />
                                        Fetching releases from GitHub...
                                    </div>
                                )}

                                {!isFetchingReleases && releases.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex gap-2 items-center">
                                            <select
                                                value={selectedRelease}
                                                onChange={(e) => setSelectedRelease(e.target.value)}
                                                disabled={isInstalling}
                                                className="bg-zinc-800 border border-chanox-border text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-chanox-accent flex-1"
                                            >
                                                {releases.map((rel) => (
                                                    <option key={rel.tagName} value={rel.tagName}>
                                                        {rel.name}{rel.size > 0 ? ` (${formatBytes(rel.size)})` : ''}
                                                    </option>
                                                ))}
                                            </select>

                                            {!isInstalling ? (
                                                <button
                                                    onClick={handleInstallProton}
                                                    className="bg-chanox-accent hover:bg-chanox-accent/90 text-black text-xs font-semibold px-4 py-1.5 rounded transition-all"
                                                >
                                                    Install
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleCancelInstall}
                                                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-1.5 rounded transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>

                                        {isInstalling && downloadProgress && (
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex justify-between text-xs text-zinc-400">
                                                    <span>
                                                        {downloadProgress.status === 'extracting'
                                                            ? 'Extracting compatibility tool...'
                                                            : `Downloading: ${downloadProgress.percent}%`
                                                        }
                                                    </span>
                                                    <span>
                                                        {downloadProgress.status !== 'extracting' && (
                                                            <>
                                                                {formatBytes(downloadProgress.downloadedBytes)} / {formatBytes(downloadProgress.totalBytes)}
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-1.5 rounded-full transition-all duration-300",
                                                            downloadProgress.status === 'extracting' ? "bg-amber-500 animate-pulse" : "bg-chanox-accent"
                                                        )}
                                                        style={{ width: `${downloadProgress.percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {installSuccess && (
                                            <p className="text-green-400 text-xs font-medium flex items-center gap-1.5 mt-1">
                                                ✓ Installed and activated successfully!
                                            </p>
                                        )}

                                        {installError && (
                                            <p className="text-red-400 text-xs font-medium flex items-center gap-1.5 mt-1">
                                                ✗ {installError}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label className="text-zinc-300 text-sm">Proton Directory</Label>
                                <p className="text-zinc-500 text-xs mb-2">
                                    Path to the GE-Proton folder (must contain a <code className="text-zinc-400">proton</code> script).
                                </p>
                                <Input
                                    value={protonPath}
                                    onChange={(e) => handleProtonPathChange(e.target.value)}
                                    placeholder="/home/user/Downloads/GE-Proton10-34"
                                    className="bg-zinc-800 border-chanox-border text-zinc-200 font-mono text-xs"
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-300 text-sm">STEAM_COMPAT_DATA_PATH (optional)</Label>
                                <p className="text-zinc-500 text-xs mb-2">
                                    Where Proton stores the Wine prefix. Leave blank to use the default.
                                </p>
                                <Input
                                    value={protonPrefixPath}
                                    onChange={(e) => handleProtonPrefixChange(e.target.value)}
                                    placeholder="~/.local/share/Steam/steamapps/compatdata/chanox"
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
