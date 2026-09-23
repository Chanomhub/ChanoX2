import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
    Sparkles,
    ExternalLink,
    Tag,
    Calendar,
    Globe,
    CheckCircle2,
    Wrench,
    Palette,
    Layers,
    FileText,
    Github
} from 'lucide-react';
import packageJson from '../../../package.json';

interface ReleaseNotesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    releaseNotes?: string | null;
    version?: string | null;
    releaseUrl?: string | null;
    publishedAt?: string | null;
}

interface ParsedSection {
    title: string;
    icon: React.ReactNode;
    color: string;
    items: string[];
}

export const ReleaseNotesDialog: React.FC<ReleaseNotesDialogProps> = ({
    open,
    onOpenChange,
    releaseNotes: initialNotes,
    version = packageJson.version,
    releaseUrl,
    publishedAt
}) => {
    const [notes, setNotes] = useState<string | null>(initialNotes || null);
    const [loading, setLoading] = useState(false);
    const displayVersion = version ? (version.startsWith('v') ? version : `v${version}`) : `v${packageJson.version}`;

    useEffect(() => {
        if (open && !notes) {
            fetchLatestNotes();
        }
    }, [open]);

    const fetchLatestNotes = async () => {
        setLoading(true);
        try {
            const res = await fetch('https://api.github.com/repos/Chanomhub/ChanoX2/releases/latest');
            if (res.ok) {
                const data = await res.json();
                if (data.body) {
                    setNotes(data.body);
                }
            }
        } catch {
            // Fallback will render if notes remain null
        } finally {
            setLoading(false);
        }
    };

    const parseReleaseNotes = (raw: string | null) => {
        if (!raw || raw.trim() === '' || raw === 'null') {
            return null;
        }

        const lines = raw.split('\n');
        let aiSummary = '';
        const sections: ParsedSection[] = [];
        let currentSection: ParsedSection | null = null;
        let isCollectingAi = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('### 💡') || trimmed.startsWith('### 🤖') || trimmed.includes('Highlights') || trimmed.includes('AI Summary')) {
                isCollectingAi = true;
                currentSection = null;
                continue;
            }

            if (trimmed.startsWith('### ')) {
                isCollectingAi = false;
                const headerText = trimmed.replace(/^###\s+/, '').trim();

                let icon = <Layers className="w-4 h-4 text-primary" />;
                let color = 'text-primary';

                if (headerText.includes('Translation') || headerText.includes('Lingo')) {
                    icon = <Globe className="w-4 h-4 text-emerald-400" />;
                    color = 'text-emerald-400';
                } else if (headerText.includes('Feature') || headerText.includes('Enhancement')) {
                    icon = <Sparkles className="w-4 h-4 text-amber-400" />;
                    color = 'text-amber-400';
                } else if (headerText.includes('UI') || headerText.includes('Design')) {
                    icon = <Palette className="w-4 h-4 text-purple-400" />;
                    color = 'text-purple-400';
                } else if (headerText.includes('Bug') || headerText.includes('Fix')) {
                    icon = <CheckCircle2 className="w-4 h-4 text-rose-400" />;
                    color = 'text-rose-400';
                } else if (headerText.includes('Maintenance') || headerText.includes('Refactor')) {
                    icon = <Wrench className="w-4 h-4 text-sky-400" />;
                    color = 'text-sky-400';
                } else {
                    icon = <FileText className="w-4 h-4 text-zinc-400" />;
                    color = 'text-zinc-300';
                }

                currentSection = {
                    title: headerText,
                    icon,
                    color,
                    items: []
                };
                sections.push(currentSection);
                continue;
            }

            if (isCollectingAi) {
                if (trimmed === '---') {
                    isCollectingAi = false;
                } else if (trimmed) {
                    aiSummary += (aiSummary ? '\n' : '') + trimmed;
                }
                continue;
            }

            if (currentSection && (trimmed.startsWith('- ') || trimmed.startsWith('* '))) {
                const itemText = trimmed.replace(/^[-*]\s+/, '').trim();
                currentSection.items.push(itemText);
            }
        }

        return { aiSummary, sections };
    };

    const parsed = parseReleaseNotes(notes);

    const openExternalUrl = (url: string) => {
        if (window.electronAPI?.openExternal) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    // Format commit links and author mentions in item text
    const renderItemText = (text: string) => {
        // Match Markdown links [text](url)
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }
            const label = match[1];
            const url = match[2];
            parts.push(
                <button
                    key={match.index}
                    onClick={() => openExternalUrl(url)}
                    className="font-mono text-primary hover:underline hover:text-primary-foreground inline-flex items-center gap-0.5 px-1 py-0.2 bg-primary/10 rounded transition-colors"
                >
                    {label}
                </button>
            );
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-0 overflow-hidden text-foreground">
                {/* Header Banner */}
                <div className="relative p-6 border-b border-border bg-gradient-to-br from-card via-background to-card">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                                        What's New in ChanoX2
                                    </DialogTitle>
                                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/20 text-primary border border-primary/30 font-mono">
                                        {displayVersion}
                                    </span>
                                </div>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                                    <span>ChanomHub Desktop & Game Translation Suite</span>
                                    {publishedAt && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {publishedAt}
                                            </span>
                                        </>
                                    )}
                                </DialogDescription>
                            </div>
                        </div>

                        {releaseUrl && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openExternalUrl(releaseUrl)}
                                className="border-border hover:bg-muted text-xs gap-1.5 h-8"
                            >
                                <Github className="w-3.5 h-3.5" />
                                <span>GitHub</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content Body */}
                <ScrollArea className="max-h-[60vh] p-6">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs">Loading release details from GitHub...</p>
                        </div>
                    ) : parsed && (parsed.aiSummary || parsed.sections.length > 0) ? (
                        <div className="space-y-6">
                            {/* AI Summary / Highlights */}
                            {parsed.aiSummary && (
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 shadow-sm relative overflow-hidden">
                                    <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-2">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Highlights & Executive Summary</span>
                                    </div>
                                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line font-sans">
                                        {parsed.aiSummary}
                                    </p>
                                </div>
                            )}

                            {/* Categorized Sections */}
                            {parsed.sections.map((section, idx) => (
                                <div key={idx} className="space-y-2.5">
                                    <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                                        {section.icon}
                                        <h4 className={`text-sm font-semibold tracking-wide ${section.color}`}>
                                            {section.title}
                                        </h4>
                                        <span className="text-xs text-muted-foreground font-mono ml-auto">
                                            {section.items.length} {section.items.length === 1 ? 'change' : 'changes'}
                                        </span>
                                    </div>
                                    <ul className="space-y-2 pl-2">
                                        {section.items.map((item, i) => (
                                            <li key={i} className="text-xs text-foreground/80 leading-relaxed flex items-start gap-2">
                                                <span className="text-muted-foreground mt-0.5">•</span>
                                                <div className="flex-1">{renderItemText(item)}</div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Fallback / Offline Rich Representation */
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>What's New in v1.7.2</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Hotfix release restoring Electron main process stability and introducing the comprehensive Release Presentation System matching Lingo-Translate.
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 pb-1 border-b border-border/50 text-emerald-400">
                                    <Globe className="w-4 h-4" />
                                    <h4 className="text-sm font-semibold">🌐 Translation Engine & Lingo Integration</h4>
                                </div>
                                <ul className="space-y-2 pl-2 text-xs text-foreground/80">
                                    <li className="flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>Replaced legacy NST with <strong>Lingo-Translate</strong> engine (v2.4.0)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>Integrated 1-Click Auto-Downloader and Updater directly from GitHub Releases</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>Added multi-tier executable path resolver (User config, AppData, PATH, Local dev)</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 pb-1 border-b border-border/50 text-amber-400">
                                    <Sparkles className="w-4 h-4" />
                                    <h4 className="text-sm font-semibold">✨ Client Features & System Improvements</h4>
                                </div>
                                <ul className="space-y-2 pl-2 text-xs text-foreground/80">
                                    <li className="flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>Added dedicated <strong>Lingo Translation Settings</strong> page with live status indicator</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>Prompt translation trigger on game details with automatic installation fallback</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>Native self-update command support for Lingo CLI (<code>lingo update</code>)</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 pb-1 border-b border-border/50 text-rose-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <h4 className="text-sm font-semibold">🐛 Bug Fixes & Stability</h4>
                                </div>
                                <ul className="space-y-2 pl-2 text-xs text-foreground/80">
                                    <li className="flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>Fixed syntax error in <code>handleOpenLingoCli</code> function declaration</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-muted-foreground">•</span>
                                        <span>Cleaned up emoji characters across all Electron <code>.cjs</code> files for pristine system logging</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-card/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Tag className="w-3.5 h-3.5 text-primary" />
                        <span>Channel: <strong>Stable</strong></span>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 text-xs font-medium"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
