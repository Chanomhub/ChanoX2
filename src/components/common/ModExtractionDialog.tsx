import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { AlertTriangle, Plus, FileText, ShieldCheck } from 'lucide-react';

interface ModExtractionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    modName: string;
    conflicts: string[];
    newFiles: string[];
    structureWarning?: boolean;
    mismatchedDirs?: string[];
    suggestedPath?: string | null;
    onApplySuggestion?: (path: string) => void;
    onConfirm: () => void;
    isExtracting: boolean;
}

export function ModExtractionDialog({
    open,
    onOpenChange,
    modName,
    conflicts = [],
    newFiles = [],
    structureWarning = false,
    mismatchedDirs = [],
    suggestedPath = null,
    onApplySuggestion,
    onConfirm,
    isExtracting
}: ModExtractionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-card border-border text-foreground shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                        <FileText className="w-5 h-5 text-primary" />
                        Extraction Preview: {modName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-background/80 p-4 rounded-xl border border-border transition-all hover:bg-muted/30">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Files</div>
                            <div className="text-2xl font-bold font-mono text-foreground">{conflicts.length + newFiles.length}</div>
                        </div>
                        <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/30 transition-all hover:bg-emerald-500/10">
                            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">New Files</div>
                            <div className="text-2xl font-bold text-emerald-400 font-mono">+{newFiles.length}</div>
                        </div>
                        <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/30 transition-all hover:bg-rose-500/10">
                            <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">Overwrites</div>
                            <div className="text-2xl font-bold text-rose-400 font-mono">{conflicts.length}</div>
                        </div>
                    </div>

                    {/* File List */}
                    <div className="border border-border rounded-xl overflow-hidden bg-background/50 shadow-inner">
                        <div className="bg-muted/40 px-4 py-2.5 border-b border-border flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Changes Detail</span>
                            <span className="text-[10px] text-primary hover:underline cursor-default font-medium">Displaying all changes</span>
                        </div>
                        <ScrollArea className="h-[320px] w-full bg-background/20">
                            <div className="p-4 space-y-2">
                                {conflicts.length === 0 && newFiles.length === 0 && (
                                    <div className="text-center py-10 text-muted-foreground italic text-sm">
                                        No files to extract.
                                    </div>
                                )}

                                {conflicts.map((file, i) => (
                                    <div key={`conflict-${i}`} className="group flex items-center gap-3 text-sm p-2 rounded-lg bg-rose-500/10 text-rose-200 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all duration-200">
                                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                        <span className="truncate flex-1 font-medium" title={file}>{file}</span>
                                        <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">Replace</span>
                                    </div>
                                ))}

                                {newFiles.map((file, i) => (
                                    <div key={`new-${i}`} className="group flex items-center gap-3 text-sm p-2 rounded-lg bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200">
                                        <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span className="truncate flex-1 font-medium" title={file}>{file}</span>
                                        <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Create</span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Structural Warning */}
                    {structureWarning && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex gap-4 items-start shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="p-2.5 bg-amber-500/20 rounded-full text-amber-400">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-200 mb-1 flex items-center gap-2">
                                    Structural Mismatch Detected
                                    <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">Heuristic Alert</span>
                                </h4>
                                <p className="text-xs text-amber-200/80 leading-relaxed mb-2">
                                    The mod includes directories that don't exist in the current game folder. This requested root may be incorrect.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {mismatchedDirs.map((dir, i) => (
                                        <span key={i} className="text-[10px] bg-background/60 text-amber-300 px-2 py-1 rounded border border-amber-500/20 font-mono">
                                            {dir}/
                                        </span>
                                    ))}
                                </div>

                                {suggestedPath && (
                                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between gap-4">
                                        <div className="space-y-0.5">
                                            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-tight">Recommended Subfolder</div>
                                            <div className="text-xs font-mono text-amber-200 flex items-center gap-1">
                                                <FileText className="w-3 h-3 opacity-50" />
                                                {suggestedPath}/
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => onApplySuggestion?.(suggestedPath)}
                                            className="h-8 bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border-none text-[10px] font-bold uppercase transition-all"
                                        >
                                            Apply Fix
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Safety Badge */}
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex gap-4 items-center shadow-lg transform transition-transform hover:scale-[1.01]">
                        <div className="p-2.5 bg-primary/20 rounded-full text-primary">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-foreground mb-0.5">Automated Safety Protocol</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                All conflicts will be backed up to <code className="text-primary font-mono font-semibold">.chanox2/backups</code>. You can instantly restore your files if needed.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-3 sm:gap-2 pt-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 sm:flex-none text-muted-foreground hover:text-foreground"
                        disabled={isExtracting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isExtracting}
                        className="flex-1 sm:px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20 disabled:opacity-50"
                    >
                        {isExtracting ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                Extracting...
                            </div>
                        ) : "Confirm Extraction"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
