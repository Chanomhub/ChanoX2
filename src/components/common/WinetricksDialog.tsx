import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
    Download,
    Search,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Package,
    Type,
    XCircle
} from 'lucide-react';
import { WinetricksPackage } from '@/types/electron';

interface WinetricksDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    winePrefix?: string;
}

type CategoryFilter = 'all' | 'dlls' | 'fonts';

export function WinetricksDialog({ open, onOpenChange, winePrefix }: WinetricksDialogProps) {
    const [packages, setPackages] = useState<WinetricksPackage[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [installingPackage, setInstallingPackage] = useState<string | null>(null);
    const [installOutput, setInstallOutput] = useState<string>('');
    const [winetricksInstalled, setWinetricksInstalled] = useState<boolean | null>(null);
    const [winetricksVersion, setWinetricksVersion] = useState<string | undefined>();
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Check if winetricks is installed and load packages
    useEffect(() => {
        if (open && window.electronAPI) {
            checkWinetricks();
            loadPackages();
        }
    }, [open]);

    // Listen for installation progress
    useEffect(() => {
        if (!window.electronAPI) return;

        const cleanup = window.electronAPI.onWinetricksProgress((data) => {
            setInstallOutput(prev => prev + data.output);
        });

        return () => {
            if (typeof cleanup === 'function') cleanup();
        };
    }, []);

    const checkWinetricks = async () => {
        if (!window.electronAPI) return;
        const result = await window.electronAPI.checkWinetricksInstalled();
        setWinetricksInstalled(result.installed);
        setWinetricksVersion(result.version);
    };

    const loadPackages = async () => {
        if (!window.electronAPI) return;
        const pkgs = await window.electronAPI.getWinetricksPackages();
        setPackages(pkgs);
    };

    const handleInstall = async (packageId: string) => {
        if (!window.electronAPI || installingPackage) return;

        setInstallingPackage(packageId);
        setInstallOutput('');
        setError(null);
        setSuccessMessage(null);

        try {
            const result = await window.electronAPI.installWinetricksPackage(packageId, winePrefix);

            if (result.success) {
                setSuccessMessage(`${packageId} installed successfully!`);
                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(result.error || 'Installation failed');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setInstallingPackage(null);
        }
    };

    const handleCancelInstall = async () => {
        if (!window.electronAPI) return;
        await window.electronAPI.cancelWinetricksInstall();
        setInstallingPackage(null);
        setInstallOutput('');
    };

    const filteredPackages = useMemo(() => {
        return packages.filter(pkg => {
            const matchesSearch =
                pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pkg.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pkg.description.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = categoryFilter === 'all' || pkg.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [packages, searchQuery, categoryFilter]);

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'dlls': return <Package className="w-4 h-4" />;
            case 'fonts': return <Type className="w-4 h-4" />;
            default: return <Package className="w-4 h-4" />;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] bg-[#1b2838] border-[#2a475e] text-[#dcdedf]">
                <DialogHeader>
                    <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        Wine Dependencies (Winetricks)
                    </DialogTitle>
                    {winetricksVersion && (
                        <p className="text-xs text-[#6e7681]">winetricks {winetricksVersion}</p>
                    )}
                </DialogHeader>

                {winetricksInstalled === false ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Winetricks Not Found</h3>
                        <p className="text-sm text-[#8b929a] mb-4 max-w-md">
                            Winetricks is required to install Windows dependencies.
                            Please install it using your package manager:
                        </p>
                        <code className="bg-[#101214] px-4 py-2 rounded text-sm text-[#66c0f4]">
                            sudo apt install winetricks
                        </code>
                    </div>
                ) : (
                    <>
                        {/* Search and Filter */}
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7681]" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search packages..."
                                    className="pl-10 bg-[#101214] border-[#2a2e36] text-[#dcdedf]"
                                />
                            </div>
                            <div className="flex gap-1">
                                {(['all', 'dlls', 'fonts'] as CategoryFilter[]).map((cat) => (
                                    <Button
                                        key={cat}
                                        variant={categoryFilter === cat ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setCategoryFilter(cat)}
                                        className={cn(
                                            "capitalize",
                                            categoryFilter === cat && "bg-[#66c0f4] text-black"
                                        )}
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Status Messages */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded bg-red-500/20 border border-red-500/50 text-red-400 mb-4">
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="flex items-center gap-2 p-3 rounded bg-green-500/20 border border-green-500/50 text-green-400 mb-4">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span className="text-sm">{successMessage}</span>
                            </div>
                        )}

                        {/* Installation Progress */}
                        {installingPackage && (
                            <div className="mb-4 p-3 rounded bg-[#101214] border border-[#2a2e36]">
                                <div className="flex items-center gap-2 mb-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#66c0f4]" />
                                    <span className="text-sm text-[#dcdedf]">
                                        Installing {installingPackage}...
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancelInstall}
                                        className="ml-auto text-red-400 hover:text-red-300"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                                {installOutput && (
                                    <pre className="text-xs text-[#6e7681] max-h-20 overflow-y-auto whitespace-pre-wrap">
                                        {installOutput.slice(-500)}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Package List */}
                        <ScrollArea className="h-[300px] w-full rounded-md border border-[#2a2e36] bg-[#101214]">
                            <div className="p-2 space-y-1">
                                {filteredPackages.map((pkg) => (
                                    <div
                                        key={pkg.id}
                                        className="flex items-center gap-3 p-3 rounded hover:bg-[#2a2e36] transition-colors"
                                    >
                                        <div className="p-2 rounded bg-[#1b2838] text-[#66c0f4]">
                                            {getCategoryIcon(pkg.category)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-[#dcdedf]">{pkg.name}</span>
                                                <span className="text-xs px-2 py-0.5 rounded bg-[#2a475e] text-[#8b929a]">
                                                    {pkg.id}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#6e7681] truncate">{pkg.description}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleInstall(pkg.id)}
                                            disabled={installingPackage !== null}
                                            className="shrink-0 text-[#66c0f4] hover:text-white hover:bg-[#2a475e]"
                                        >
                                            {installingPackage === pkg.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4 mr-1" />
                                                    Install
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}

                                {filteredPackages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-[#6e7681]">
                                        <Package className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-sm">No packages found</span>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <p className="text-xs text-[#6e7681] mr-auto">
                        {winePrefix ? `Prefix: ${winePrefix}` : 'Using default Wine prefix (~/.wine)'}
                    </p>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default WinetricksDialog;
