import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Check, Loader2, Download, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

/**
 * Lingo Translate (formerly NST) settings — manages the Lingo CLI installation
 * and configures the LLM API used for automated game translation.
 */

const PROVIDERS = [
    { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
    { id: 'custom', label: 'Custom (OpenAI-compatible)', baseUrl: '', model: '' },
];

export function LingoSettings() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [provider, setProvider] = useState('groq');
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState(PROVIDERS[1].baseUrl);
    const [model, setModel] = useState(PROVIDERS[1].model);

    // CLI Tool Status
    const [cliStatus, setCliStatus] = useState<{ checked: boolean; installed: boolean; path?: string; version?: string }>({
        checked: false,
        installed: false
    });
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadPercent, setDownloadPercent] = useState(0);
    const [downloadStatusText, setDownloadStatusText] = useState('');

    const refreshCliStatus = async () => {
        if (!window.electronAPI?.checkNstCli) return;
        try {
            const res = await window.electronAPI.checkNstCli();
            setCliStatus({
                checked: true,
                installed: !!res?.installed,
                path: res?.path,
                version: res?.version
            });
        } catch {
            setCliStatus({ checked: true, installed: false });
        }
    };

    useEffect(() => {
        refreshCliStatus();

        window.electronAPI?.nstGetConfig().then((res) => {
            if (res?.general) {
                const g = res.general;
                if (g.llmBaseUrl) {
                    const known = PROVIDERS.find((p) => p.baseUrl === g.llmBaseUrl);
                    setProvider(known ? known.id : 'custom');
                    setBaseUrl(g.llmBaseUrl);
                }
                if (g.llmModel) setModel(g.llmModel);
            }
            setLoading(false);
        });

        // Listen for download progress
        const unsubscribe = window.electronAPI?.onNstDownloadProgress?.((data) => {
            if (data?.percent !== undefined) setDownloadPercent(data.percent);
            if (data?.status) setDownloadStatusText(data.status);
        });

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    const handleDownloadInstall = async () => {
        if (!window.electronAPI?.downloadAndInstallNst) return;
        setIsDownloading(true);
        setDownloadPercent(10);
        setDownloadStatusText('Starting download...');
        try {
            const res = await window.electronAPI.downloadAndInstallNst();
            if (res?.success) {
                await refreshCliStatus();
                alert(`ติดตั้ง Lingo Translate สำเร็จแล้ว (${res.version || 'v2.3.0'})!`);
            } else {
                alert(`ติดตั้งไม่สำเร็จ: ${res?.error || 'Unknown error'}`);
            }
        } catch (e: any) {
            alert(`เกิดข้อผิดพลาด: ${e?.message || 'Unknown error'}`);
        } finally {
            setIsDownloading(false);
            setDownloadPercent(0);
            setDownloadStatusText('');
        }
    };

    // Load current provider defaults when switching
    const applyProviderDefaults = (id: string) => {
        setProvider(id);
        const p = PROVIDERS.find((x) => x.id === id);
        if (p && p.baseUrl) {
            setBaseUrl(p.baseUrl);
            setModel(p.model);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        let ok = true;
        try {
            const res = await window.electronAPI?.nstSetLlmSettings({
                provider,
                apiKey: apiKey || undefined, // empty = keep existing key
                baseUrl,
                model,
            });
            ok = !!res?.success;
        } catch {
            ok = false;
        }
        setSaving(false);
        setSaved(ok);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-light text-zinc-100 tracking-wide">Lingo Translate (formerly NST)</h2>
                <p className="text-sm text-zinc-500 mt-1">
                    เครื่องมือสกัดและแปลภาษาเกมอัตโนมัติ (RPG Maker, Ren'Py, Unity, Godot) พัฒนาโดย ProjectErotic
                </p>
            </div>

            {/* CLI Engine Status & Installation Card */}
            <Card className="bg-chanox-surface border-chanox-border">
                <CardHeader>
                    <CardTitle className="text-base text-zinc-200 flex items-center justify-between">
                        <span>Lingo Engine (CLI)</span>
                        {cliStatus.checked && (
                            <span className={cn(
                                "text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 font-normal",
                                cliStatus.installed 
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            )}>
                                {cliStatus.installed ? (
                                    <>
                                        <CheckCircle2 size={13} /> ติดตั้งแล้ว {cliStatus.version ? `(${cliStatus.version})` : ''}
                                    </>
                                ) : (
                                    <>
                                        <XCircle size={13} /> ยังไม่ได้ติดตั้ง
                                    </>
                                )}
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {cliStatus.installed ? (
                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400 flex flex-col gap-1 bg-black/30 p-2.5 rounded border border-white/5 font-mono">
                                <div><span className="text-zinc-500">Path:</span> {cliStatus.path}</div>
                                {cliStatus.version && <div><span className="text-zinc-500">Version:</span> {cliStatus.version}</div>}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={refreshCliStatus}
                                    className="text-xs"
                                >
                                    <RefreshCw size={13} className="mr-1.5" /> ตรวจสอบสถานะ
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={isDownloading}
                                    onClick={handleDownloadInstall}
                                    className="text-xs"
                                >
                                    {isDownloading ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Download size={13} className="mr-1.5" />}
                                    ติดตั้งซ้ำ / อัปเดต
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                เพื่อใช้งานระบบสกัดและแปลภาษาเกมโดยตรง จำเป็นต้องมีตัวโปรแกรม Lingo Translate ติดตั้งอยู่ในเครื่อง สามารถกดดาวน์โหลดตัวติดตั้งอัตโนมัติจาก GitHub Releases ได้ทันที
                            </p>
                            {isDownloading ? (
                                <div className="space-y-2 bg-black/30 p-3 rounded border border-white/5">
                                    <div className="flex justify-between text-xs text-zinc-400">
                                        <span>{downloadStatusText || 'กำลังดาวน์โหลด...'}</span>
                                        <span>{downloadPercent}%</span>
                                    </div>
                                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-chanox-accent h-full transition-all duration-300" 
                                            style={{ width: `${downloadPercent}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        onClick={handleDownloadInstall}
                                        className="bg-chanox-accent hover:bg-chanox-accent/90 text-white text-xs"
                                    >
                                        <Download size={14} className="mr-1.5" />
                                        ดาวน์โหลดและติดตั้ง Lingo Translate (~5 MB)
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={refreshCliStatus}
                                        className="text-xs"
                                    >
                                        <RefreshCw size={13} className="mr-1.5" /> ตรวจสอบอีกครั้ง
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* LLM API Configuration */}
            <Card className="bg-chanox-surface border-chanox-border">
                <CardHeader>
                    <CardTitle className="text-base text-zinc-200">LLM API สำหรับการแปล</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
                            <Loader2 size={16} className="animate-spin" /> Loading...
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>Provider</Label>
                                <div className="flex flex-wrap gap-2">
                                    {PROVIDERS.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => applyProviderDefaults(p.id)}
                                            className={cn(
                                                'px-3 py-1.5 text-sm rounded-md border transition-all',
                                                provider === p.id
                                                    ? 'bg-chanox-accent/15 text-chanox-accent border-chanox-accent'
                                                    : 'border-chanox-border text-zinc-400 hover:bg-white/5'
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="nst-api-key">API Key</Label>
                                <Input
                                    id="nst-api-key"
                                    type="password"
                                    placeholder={t('settings.enterApiKey') || 'Enter API key'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                                <p className="text-xs text-zinc-600">Leave empty to keep the existing key.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="nst-base-url">Base URL</Label>
                                <Input
                                    id="nst-base-url"
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                    placeholder="https://api.example.com/v1"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="nst-model">Model</Label>
                                <Input
                                    id="nst-model"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    placeholder="llama-3.3-70b-versatile"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 size={16} className="mr-2 animate-spin" /> Saving...
                                        </>
                                    ) : saved ? (
                                        <>
                                            <Check size={16} className="mr-2" /> Saved
                                        </>
                                    ) : (
                                        'Save Settings'
                                    )}
                                </Button>
                                {!window.electronAPI?.nstSetLlmSettings && (
                                    <span className="text-xs text-amber-500">
                                        Requires the desktop app (Electron).
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// tiny local cn to avoid importing utils in a leaf file — matches existing usage
function cn(...classes: (string | false | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}


