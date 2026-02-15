import React from 'react';
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
    onConfirm: () => void;
    isExtracting: boolean;
}

export function ModExtractionDialog({
    open,
    onOpenChange,
    modName,
    conflicts = [],
    newFiles = [],
    onConfirm,
    isExtracting
}: ModExtractionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-[#0d1117] border-[#30363d] text-[#dcdedf] shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <FileText className="w-5 h-5 text-[#66f489]" />
                        Extraction Preview: {modName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] backdrop-blur-sm transition-all hover:bg-[#1c2128]">
                            <div className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">Total Files</div>
                            <div className="text-2xl font-bold font-mono">{conflicts.length + newFiles.length}</div>
                        </div>
                        <div className="bg-[#161b22] p-4 rounded-xl border border-green-900/40 backdrop-blur-sm transition-all hover:bg-green-900/5">
                            <div className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">New Files</div>
                            <div className="text-2xl font-bold text-green-500 font-mono">+{newFiles.length}</div>
                        </div>
                        <div className="bg-[#161b22] p-4 rounded-xl border border-red-900/40 backdrop-blur-sm transition-all hover:bg-red-900/5">
                            <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Overwrites</div>
                            <div className="text-2xl font-bold text-red-500 font-mono">{conflicts.length}</div>
                        </div>
                    </div>

                    {/* File List */}
                    <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#0d1117]/50 shadow-inner">
                        <div className="bg-[#161b22] px-4 py-2.5 border-b border-[#30363d] flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#8b949e] opacity-80">Changes Detail</span>
                            <span className="text-[10px] text-[#58a6ff] hover:underline cursor-default">Displaying all changes</span>
                        </div>
                        <ScrollArea className="h-[320px] w-full bg-gradient-to-b from-transparent to-[#0d1117]/10">
                            <div className="p-4 space-y-2">
                                {conflicts.length === 0 && newFiles.length === 0 && (
                                    <div className="text-center py-10 text-[#8b949e] italic text-sm">
                                        No files to extract.
                                    </div>
                                )}

                                {conflicts.map((file, i) => (
                                    <div key={`conflict-${i}`} className="group flex items-center gap-3 text-sm p-2 rounded-lg bg-red-900/10 text-red-100 border border-red-900/20 hover:bg-red-900/20 hover:border-red-900/40 transition-all duration-200">
                                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                        <span className="truncate flex-1 font-medium" title={file}>{file}</span>
                                        <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Replace</span>
                                    </div>
                                ))}

                                {newFiles.map((file, i) => (
                                    <div key={`new-${i}`} className="group flex items-center gap-3 text-sm p-2 rounded-lg bg-green-900/10 text-green-100 border border-green-900/20 hover:bg-green-900/20 hover:border-green-900/40 transition-all duration-200">
                                        <Plus className="w-4 h-4 text-green-500 shrink-0" />
                                        <span className="truncate flex-1 font-medium" title={file}>{file}</span>
                                        <span className="shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Create</span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Safety Badge */}
                    <div className="bg-[#121d2f] border border-[#1e3a8a]/50 p-4 rounded-xl flex gap-4 items-center shadow-lg transform transition-transform hover:scale-[1.01]">
                        <div className="p-2.5 bg-[#1e3a8a]/30 rounded-full text-blue-400">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-blue-100 mb-0.5">Automated Safety Protocol</h4>
                            <p className="text-xs text-blue-300 leading-relaxed opacity-90">
                                All conflicts will be backed up to <code className="text-blue-100">.chanox2/backups</code>. You can instantly restore your files if needed.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-3 sm:gap-2 pt-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 sm:flex-none bg-transparent hover:bg-white/5 text-[#8b949e] hover:text-white"
                        disabled={isExtracting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isExtracting}
                        className="flex-1 sm:px-8 bg-[#238636] hover:bg-[#2ea043] text-white font-bold border-none shadow-[0_0_15px_-3px_rgba(35,134,54,0.4)] disabled:opacity-50"
                    >
                        {isExtracting ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Extracting...
                            </div>
                        ) : "Confirm Extraction"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
