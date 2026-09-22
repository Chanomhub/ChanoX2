import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2, Download, Check, Trash2, ExternalLink } from 'lucide-react';
import { sdk } from '@/libs/sdk';
import { Mod } from '@chanomhub/sdk';
import useSWR from 'swr';
import { useInstalledMods } from '@/hooks/useInstalledMods';
import { useAuth } from '@/contexts/AuthContext';

interface ArticleModDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    articleId: number;
    articleSlug?: string;
    gamePath?: string;
}

export function ArticleModDialog({
    open,
    onOpenChange,
    articleId,
    articleSlug,
    gamePath,
}: ArticleModDialogProps) {
    const { token: authToken } = useAuth();
    const { loading: loadingInstalled, addInstalledMod, removeInstalledMod, isInstalled } = useInstalledMods(gamePath);
    const [installingModId, setInstallingModId] = useState<number | null>(null);

    const { data: mods, error, isLoading } = useSWR<Mod[]>(
        open && articleId ? `article-mods-dialog-${articleId}` : null,
        async () => {
            const res = await sdk.articles.getMods(articleId, {
                fields: ['id', 'name', 'version', 'downloadLink']
            });
            return Array.isArray(res) ? res : (res as any).mods || [];
        }
    );

    const handleInstall = async (mod: Mod) => {
        if (!gamePath || !window.electronAPI) {
            alert('Cannot install mod: Game path not found or Electron API unavailable.');
            return;
        }

        setInstallingModId(mod.id);

        try {
            // 1. Get Download URL
            const downloadLink = mod.downloadLink;
            const downloadUrl = downloadLink.startsWith('http')
                ? downloadLink
                : `https://mod.chanomhub.workers.dev/download/${downloadLink}`;

            // 2. Get Token for Auth
            const token = authToken || sdk.config.token;

            if (!token) {
                alert('Authentication token not found. Please login again.');
                return;
            }

            // 3. Construct Filename
            let ext = '.patch.json.gz';
            if (downloadLink.includes('.patch.json.gz')) {
                ext = '.patch.json.gz';
            } else if (downloadLink.includes('.patch.json')) {
                ext = '.patch.json';
            } else if (downloadLink.includes('.zip')) {
                ext = '.zip';
            } else if (downloadLink.includes('.lpack')) {
                ext = '.lpack';
            }

            const cleanName = `${mod.name}_${mod.version}`.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
            const safeName = `${cleanName}${ext}`;

            // 4. Call Electron Install
            const result = await window.electronAPI.installMod(
                downloadUrl,
                gamePath,
                safeName,
                { Authorization: `Bearer ${token}` }
            );

            if (result.success) {
                // If it's a patch file (.patch.json or .patch.json.gz), automatically apply it!
                if (safeName.endsWith('.patch.json.gz') || safeName.endsWith('.patch.json')) {
                    const patchFilePath = result.path || `${gamePath}/${safeName}`;
                    const patchResult = await window.electronAPI.applyPatch(gamePath, patchFilePath, mod.id);
                    if (!patchResult.success) {
                        throw new Error(`Patch installation failed: ${patchResult.error}`);
                    }
                }

                // 5. Update Local Manifest
                await addInstalledMod({
                    id: mod.id,
                    name: mod.name,
                    version: mod.version,
                    installedAt: new Date().toISOString(),
                    filename: safeName
                });
            } else {
                throw new Error('Install failed');
            }

        } catch (err) {
            console.error('Failed to install mod:', err);
            alert(`Failed to install mod: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setInstallingModId(null);
        }
    };

    const handleUninstall = async (modId: number) => {
        if (!confirm('Are you sure you want to uninstall this mod?')) return;
        try {
            await removeInstalledMod(modId);
        } catch (err) {
            console.error('Failed to uninstall mod:', err);
            alert('Failed to uninstall mod');
        }
    };

    const handleOpenStore = () => {
        if (window.electronAPI) {
            const url = articleSlug
                ? `https://chanomhub.com/articles/${articleSlug}`
                : `https://chanomhub.com/posts/${articleId}`;
            window.electronAPI.openExternal(url);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-card border-border text-foreground p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-border">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-foreground text-xl font-semibold">Cloud Mod Browser</DialogTitle>
                        <button
                            onClick={handleOpenStore}
                            className="text-primary hover:text-primary/80 text-xs flex items-center gap-1 transition-colors font-medium"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Open on Web
                        </button>
                    </div>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {isLoading || loadingInstalled ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Fetching available mods...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-center">
                            <p className="text-destructive text-sm">Failed to load mods from server.</p>
                        </div>
                    ) : mods && mods.length > 0 ? (
                        <div className="space-y-3">
                            {mods.map((mod) => {
                                const installed = isInstalled(mod.id);
                                const isInstalling = installingModId === mod.id;

                                return (
                                    <div
                                        key={mod.id}
                                        className="bg-background/80 border border-border/60 rounded-md p-4 flex items-center justify-between group hover:border-primary/50 transition-colors"
                                    >
                                        <div className="min-w-0 flex-1 mr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-foreground font-semibold text-base truncate">
                                                    {mod.name}
                                                </h4>
                                                <span className="bg-primary/15 border border-primary/20 text-primary text-xs px-2 py-0.5 rounded font-mono">
                                                    {mod.version}
                                                </span>
                                            </div>
                                            <div className="text-muted-foreground text-xs flex items-center gap-3">
                                                {installed && (
                                                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                                                        <Check className="w-3 h-3" />
                                                        Installed
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {installed ? (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleUninstall(mod.id)}
                                                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Remove
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleInstall(mod)}
                                                    disabled={isInstalling}
                                                    className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[100px] font-medium"
                                                >
                                                    {isInstalling ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                            Installing
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="w-4 h-4 mr-2" />
                                                            Install
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-background/50 rounded-md border border-dashed border-border/60">
                            <p className="text-muted-foreground text-sm">No mods available for this game yet.</p>
                            <Button
                                variant="ghost"
                                onClick={handleOpenStore}
                                className="text-primary hover:text-primary/80 mt-2 h-auto p-0 font-medium"
                            >
                                Be the first to upload one!
                            </Button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-background/80 border-t border-border flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
