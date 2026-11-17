import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router';
import { Loader2, CheckCircle2, XCircle, Gamepad2, LogIn } from 'lucide-react';
import { Button } from '@/ui';
import { sdk } from '@/libs/sdk';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useInstalledMods } from '@/hooks/useInstalledMods';

interface ModInfo {
    id: string | number;
    name: string;
    version?: string;
    downloadLink?: string;
}

export default function InstallModPage() {
    const [searchParams] = useSearchParams();
    const { modId: modIdParam } = useParams();
    const modId = modIdParam || searchParams.get('modId');
    const articleId = searchParams.get('articleId');
    const slug = searchParams.get('slug');
    const nameParam = searchParams.get('name');
    const versionParam = searchParams.get('version');

    const { token } = useAuth();
    const { libraryItems } = useLibrary();
    const game = useMemo(
        () => libraryItems.find(i => i.articleId === Number(articleId) || i.slug === slug),
        [libraryItems, articleId, slug]
    );
    const { addInstalledMod, isInstalled } = useInstalledMods(game?.extractedPath);

    const [mod, setMod] = useState<ModInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!token) { setLoading(false); return; }
            try {
                const mods = await sdk.articles.getMods(Number(articleId), {
                    fields: ['id', 'name', 'version', 'downloadLink'],
                });
                const list = (Array.isArray(mods) ? mods : (mods as any)?.mods || []) as ModInfo[];
                if (!cancelled) setMod(list.find(m => String(m.id) === String(modId)) || null);
            } catch (err) {
                console.error('Failed to fetch mods:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [articleId, modId, token]);

    const alreadyInstalled = !!mod && isInstalled(Number(mod.id));
    const outdated = alreadyInstalled && !!mod?.version && versionParam && mod.version !== versionParam;

    const handleInstall = async () => {
        if (!mod?.downloadLink || !game || !window.electronAPI) return;
        setInstalling(true);
        setResult(null);
        try {
            const downloadUrl = mod.downloadLink.startsWith('http')
                ? mod.downloadLink
                : `https://mod.chanomhub.workers.dev/download/${mod.downloadLink}`;
            let ext = '.patch.json.gz';
            if (mod.downloadLink.includes('.zip')) ext = '.zip';
            else if (mod.downloadLink.includes('.patch.json.gz')) ext = '.patch.json.gz';
            else if (mod.downloadLink.includes('.patch.json')) ext = '.patch.json';
            const cleanName = `${mod.name}_${mod.version || versionParam || 'v1'}`.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
            const safeName = `${cleanName}${ext}`;
            const installed = await window.electronAPI.installMod(downloadUrl, game.extractedPath, safeName, {
                Authorization: `Bearer ${token}`,
            });
            if (!installed?.success) throw new Error('Install failed');
            if (ext === '.patch.json.gz' || ext === '.patch.json') {
                const patched = await window.electronAPI.applyPatch(game.extractedPath, installed.path || `${game.extractedPath}/${safeName}`, Number(mod.id));
                if (!patched?.success) throw new Error(patched?.error || 'Patch failed');
            }
            await addInstalledMod({
                id: Number(mod.id),
                name: mod.name,
                version: mod.version || versionParam || 'v1',
                installedAt: new Date().toISOString(),
                filename: safeName,
            });
            setResult({ ok: true, message: `Installed ${mod.name} to ${game.title}` });
        } catch (err: any) {
            setResult({ ok: false, message: err?.message || 'Install failed' });
        } finally {
            setInstalling(false);
        }
    };

    if (!token) {
        return (
            <div className="p-8 max-w-md mx-auto text-center space-y-4">
                <LogIn className="w-10 h-10 mx-auto text-muted-foreground" />
                <h1 className="text-foreground text-lg font-bold">ต้องเข้าสู่ระบบก่อนติดตั้งม็อด</h1>
                <Button onClick={() => { window.location.hash = '#/login'; }}>เข้าสู่ระบบ</Button>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-md mx-auto space-y-4">
            <div className="flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-primary" />
                <h1 className="text-foreground text-lg font-bold">ติดตั้งม็อดผ่าน ChanoX2</h1>
            </div>

            {loading ? (
                <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
                <>
                    <div className="bg-card border border-border/60 rounded-md p-4 space-y-1">
                        <div className="text-foreground font-medium">{nameParam || mod?.name || `Mod #${modId}`}</div>
                        <div className="text-muted-foreground text-sm">เวอร์ชัน {versionParam || mod?.version || '—'}</div>
                        {outdated && (
                            <div className="text-amber-400 text-sm">คุณติดตั้งเวอร์ชันเก่าไว้ — จะอัปเดตเป็น {versionParam}</div>
                        )}
                    </div>

                    {game ? (
                        <div className="bg-card border border-border/60 rounded-md p-4">
                            <div className="text-xs text-muted-foreground mb-1">จะติดตั้งลงเกม</div>
                            <div className="text-foreground font-medium">{game.title}</div>
                            <div className="text-muted-foreground text-xs truncate">{game.extractedPath}</div>
                        </div>
                    ) : (
                        <div className="bg-card border border-border/60 rounded-md p-4 text-sm text-muted-foreground">
                            ยังไม่มีเกมนี้ใน Library — ดาวน์โหลดเกมและเพิ่มเข้า Library ก่อน
                            {slug && (
                                <div className="mt-2">
                                    <Button variant="secondary" size="sm" onClick={() => {
                                        window.electronAPI?.openExternal(`https://chanomhub.com/articles/${slug}`);
                                    }}>
                                        เปิดหน้าเกมบนเว็บ
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {result && (
                        <div className={`flex items-center gap-2 text-sm ${result.ok ? 'text-emerald-400' : 'text-destructive'}`}>
                            {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {result.message}
                        </div>
                    )}

                    {game && mod && (
                        <Button className="w-full" onClick={handleInstall} disabled={installing || (!!alreadyInstalled && !outdated)}>
                            {installing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            {installing ? 'กำลังติดตั้ง…' : alreadyInstalled ? (outdated ? `อัปเดตเป็น ${versionParam}` : 'ติดตั้งแล้ว') : 'ติดตั้ง'}
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}
