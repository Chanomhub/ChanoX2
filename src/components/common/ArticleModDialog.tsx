import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Loader2, Download, Check, Trash2, ExternalLink } from 'lucide-react';
import { sdk } from '@/libs/sdk';
import { Mod } from '@chanomhub/sdk';
import useSWR from 'swr';
import { useInstalledMods } from '@/hooks/useInstalledMods';
import { useAuth } from '@/contexts/AuthContext';
import { native } from '@/lib/native';

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
        if (!gamePath) {
            alert('Cannot install mod: Game path not found.');
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
            // Use a less restrictive regex to allow Thai/Unicode while stripping truly illegal characters
            // Enforce .lpack extension as requested
            const cleanName = `${mod.name}_${mod.version}`.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
            const safeName = `${cleanName}.lpack`;

            // 4. Call Install via native adapter
            const result = await native.download.installMod(
                downloadUrl,
                gamePath,
                safeName,
                { Authorization: `Bearer ${token}` }
            );

            if (result.success) {
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
        const url = articleSlug
            ? `https://chanomhub.com/articles/${articleSlug}`
            : `https://chanomhub.com/posts/${articleId}`;
        native.shell.openExternal(url);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-[#1b2838] border-[#2a475e] text-[#dcdedf] p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b border-[#2a475e]">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-white text-xl">Cloud Mod Browser</DialogTitle>
                        <button
                            onClick={handleOpenStore}
                            className="text-[#66c0f4] hover:text-white text-xs flex items-center gap-1 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Open on Web
                        </button>
                    </div>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#2a475e] scrollbar-track-transparent">
                    {isLoading || loadingInstalled ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-[#66c0f4]" />
                            <span className="text-sm text-[#8b929a]">Fetching available mods...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-900/10 border border-red-500/20 rounded p-4 text-center">
                            <p className="text-red-400 text-sm">Failed to load mods from server.</p>
                        </div>
                    ) : mods && mods.length > 0 ? (
                        <div className="space-y-3">
                            {mods.map((mod) => {
                                const installed = isInstalled(mod.id);
                                const isInstalling = installingModId === mod.id;

                                return (
                                    <div
                                        key={mod.id}
                                        className="bg-[#161b22] border border-[#30363d] rounded p-4 flex items-center justify-between group hover:border-[#66c0f4] transition-colors"
                                    >
                                        <div className="min-w-0 flex-1 mr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-[#dcdedf] font-semibold text-base truncate">
                                                    {mod.name}
                                                </h4>
                                                <span className="bg-[#2a475e] text-[#66c0f4] text-xs px-2 py-0.5 rounded font-mono">
                                                    {mod.version}
                                                </span>
                                            </div>
                                            <div className="text-[#8b949e] text-xs flex items-center gap-3">
                                                {installed && (
                                                    <span className="text-green-500 font-medium flex items-center gap-1">
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
                                                    className="bg-red-900/10 hover:bg-red-900/30 text-red-500 border border-red-500/20"
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
                                                    className="bg-[#238636] hover:bg-[#2ea043] text-white border-none min-w-[100px]"
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
                        <div className="text-center py-12 bg-black/20 rounded border border-dashed border-[#2a475e]">
                            <p className="text-[#8b929a] text-sm">No mods available for this game yet.</p>
                            <Button
                                variant="ghost"
                                onClick={handleOpenStore}
                                className="text-[#66c0f4] mt-2 h-auto p-0"
                            >
                                Be the first to upload one!
                            </Button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-[#101214] border-t border-[#2a475e] flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-[#8b929a] hover:text-white hover:bg-transparent"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
