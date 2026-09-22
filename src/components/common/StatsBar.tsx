import { Users, Gamepad2, DownloadCloud } from 'lucide-react';

export default function StatsBar() {
    return (
        <div className="w-full max-w-[1200px] mx-auto px-4 mb-8">
            <div className="bg-card/60 border border-border/60 rounded-lg py-3 px-6 flex items-center justify-around backdrop-blur-sm shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <div className="text-foreground text-sm font-bold leading-none mb-1">24,582</div>
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Online Now</div>
                    </div>
                </div>
                
                <div className="w-px h-8 bg-border/60" />
                
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-full">
                        <Gamepad2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-foreground text-sm font-bold leading-none mb-1">1,240</div>
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Games Available</div>
                    </div>
                </div>
                
                <div className="w-px h-8 bg-border/60" />
                
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-full">
                        <DownloadCloud className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <div className="text-foreground text-sm font-bold leading-none mb-1">8.4M</div>
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Total Downloads</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
