import { Users, Gamepad2, DownloadCloud } from 'lucide-react';

export default function StatsBar() {
    return (
        <div className="w-full max-w-[1200px] mx-auto px-4 mb-8">
            <div className="bg-[#1b2838]/50 border border-[#2a475e]/30 rounded-sm py-3 px-6 flex items-center justify-around backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#66c0f4]/10 rounded-full">
                        <Users className="w-5 h-5 text-[#66c0f4]" />
                    </div>
                    <div>
                        <div className="text-white text-sm font-bold leading-none mb-1">24,582</div>
                        <div className="text-[#8b929a] text-[10px] uppercase tracking-wider font-medium">Online Now</div>
                    </div>
                </div>
                
                <div className="w-px h-8 bg-[#2a475e]/30" />
                
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#a4d007]/10 rounded-full">
                        <Gamepad2 className="w-5 h-5 text-[#a4d007]" />
                    </div>
                    <div>
                        <div className="text-white text-sm font-bold leading-none mb-1">1,240</div>
                        <div className="text-[#8b929a] text-[10px] uppercase tracking-wider font-medium">Games Available</div>
                    </div>
                </div>
                
                <div className="w-px h-8 bg-[#2a475e]/30" />
                
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#ff9d00]/10 rounded-full">
                        <DownloadCloud className="w-5 h-5 text-[#ff9d00]" />
                    </div>
                    <div>
                        <div className="text-white text-sm font-bold leading-none mb-1">8.4M</div>
                        <div className="text-[#8b929a] text-[10px] uppercase tracking-wider font-medium">Total Downloads</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
