import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Check, Loader2 } from 'lucide-react';

/**
 * NST Add-on settings — configure the LLM API used by the NST translation
 * add-on. Values are written directly to NST's QSettings INI
 * (~/.config/NST/NST.ini), so the user configures once here and NST picks
 * it up on next launch. Requires NST to be installed separately.
 */

const PROVIDERS = [
    { id: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { id: 'groq', label: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
    { id: 'custom', label: 'Custom (OpenAI-compatible)', baseUrl: '', model: '' },
];

export function NstSettings() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [provider, setProvider] = useState('groq');
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState(PROVIDERS[1].baseUrl);
    const [model, setModel] = useState(PROVIDERS[1].model);

    useEffect(() => {
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
    }, []);

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
                <h2 className="text-2xl font-light text-zinc-100 tracking-wide">NST Translation Add-on</h2>
                <p className="text-sm text-zinc-500 mt-1">
                    Configure the LLM API key for the NST game-translation add-on (RPG Maker, Ren'Py, Unity).
                    {' '}NST must be installed on this system.
                </p>
            </div>

            <Card className="bg-chanox-surface border-chanox-border">
                <CardHeader>
                    <CardTitle className="text-base text-zinc-200">LLM API</CardTitle>
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
                                        'Save to NST'
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
