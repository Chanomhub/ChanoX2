import { useState, useEffect } from 'react';
import { useDownloads } from '@/contexts/DownloadContext';
import { Download as DownloadType } from '@/types/download';
import {
    BarChart3,
    TrendingUp,
    HardDrive,
    Settings,
    X,
    FolderOpen,
    PackageOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper functions
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bytesPerSec: number): string {
    return formatBytes(bytesPerSec) + '/s';
}

function calculateTimeRemaining(remainingBytes: number, speed: number): string {
    if (speed === 0) return '--:--';
    const seconds = remainingBytes / speed;
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}

// Sub-components
const MetricsHeader = ({ currentSpeed, peakSpeed, diskUsage }: { currentSpeed: number, peakSpeed: number, diskUsage: number }) => (
    <div className="flex flex-col md:flex-row justify-end items-center px-6 py-8 gap-8 bg-gradient-to-b from-[#1a2a3a] to-[#1b2838]">
        <div className="flex flex-col items-start min-w-[100px]">
            <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-[#66c0f4]" />
                <span className="text-[#8b929a] text-[10px] font-bold">NETWORK</span>
            </div>
            <span className="text-[#dcdedf] text-sm font-semibold">{formatSpeed(currentSpeed)}</span>
        </div>

        <div className="flex flex-col items-start min-w-[100px]">
            <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#66c0f4]" />
                <span className="text-[#8b929a] text-[10px] font-bold">PEAK</span>
            </div>
            <span className="text-[#dcdedf] text-sm font-semibold">{formatSpeed(peakSpeed)}</span>
        </div>

        <div className="flex flex-col items-start min-w-[100px]">
            <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-4 h-4 text-[#66c0f4]" />
                <span className="text-[#8b929a] text-[10px] font-bold">DISK USAGE</span>
            </div>
            <span className="text-[#dcdedf] text-sm font-semibold">{formatSpeed(diskUsage)}</span>
        </div>

        <button className="p-2 bg-[#2a3f55] rounded hover:bg-[#3d5a73] transition-colors ml-4">
            <Settings className="w-5 h-5 text-[#8b929a] hover:text-white" />
        </button>
    </div>
);

const DownloadItem = ({ download, isCompleted }: { download: DownloadType, isCompleted?: boolean }) => {
    const { removeDownload, extractDownload, showInFolder } = useDownloads();

    const isExtractable = ['zip', 'tar.xz', '7z', 'rar', 'tar', 'gz'].some(ext => download.filename.endsWith(ext));

    return (
        <div className="flex bg-black/20 h-[80px] mb-3 group hover:bg-black/30 transition-colors">
            {/* Game Cover */}
            <div className="w-[150px] h-full bg-[#2c3e50] relative overflow-hidden flex-shrink-0">
                {download.coverImage ? (
                    <SafeImage
                        src={download.coverImage}
                        className="w-full h-full object-cover"
                        alt={download.filename}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#66c0f4] to-[#2c3e50]">
                        <span className="text-white text-xl font-bold">{download.filename.substring(0, 2).toUpperCase()}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-[#dcdedf] font-semibold truncate pr-4 text-base">
                        {download.articleTitle || download.filename}
                    </h3>
                    {isCompleted && download.endTime && (
                        <span className="text-[#8b929a] text-[11px] whitespace-nowrap">
                            {new Date(download.endTime).toLocaleDateString()} {new Date(download.endTime).toLocaleTimeString()}
                        </span>
                    )}
                </div>

                {isCompleted ? (
                    <div className="flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <span className="text-[#8b929a] text-xs">{formatBytes(download.totalBytes)}</span>
                            <span className="text-[#66c0f4] text-xs font-bold cursor-pointer hover:text-white hover:underline">PATCH NOTES</span>
                        </div>

                        <div className="flex gap-2">
                            {isExtractable && (
                                <button
                                    className={cn(
                                        "flex items-center gap-1 bg-[#2a3f55] px-2 py-1 rounded text-xs font-semibold hover:bg-[#3d5a73] transition-colors",
                                        download.isExtracting ? "opacity-50 cursor-not-allowed" : "text-white"
                                    )}
                                    onClick={() => extractDownload(download.id)}
                                    disabled={download.isExtracting}
                                >
                                    <PackageOpen className="w-4 h-4" />
                                    {download.isExtracting ? 'EXTRACTING...' : 'EXTRACT'}
                                </button>
                            )}
                            <button
                                className="p-1 bg-[#2a3f55] rounded hover:bg-[#3d5a73] text-[#dcdedf] hover:text-white"
                                onClick={() => showInFolder(download.id)}
                                title="Show in Folder"
                            >
                                <FolderOpen className="w-5 h-5" />
                            </button>
                            <button
                                className="p-1 bg-[#2a3f55] rounded hover:bg-[#3d5a73] text-[#dcdedf] hover:text-white"
                                onClick={() => removeDownload(download.id)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1.5 w-full">
                        {/* Progress Bar */}
                        <div className="h-1 bg-black rounded-full overflow-hidden w-full">
                            <div
                                className="h-full bg-[#66c0f4] transition-all duration-300 ease-out"
                                style={{ width: `${download.progress}%` }}
                            />
                        </div>

                        {/* Stats */}
                        <div className="flex justify-between items-center text-[11px] text-[#8b929a]">
                            <span>{formatBytes(download.downloadedBytes)} / {formatBytes(download.totalBytes)}</span>

                            <div className="flex gap-4">
                                <span className="font-semibold text-[#dcdedf]">{formatSpeed(download.speed)}</span>
                                <span>Time remaining: {calculateTimeRemaining(download.totalBytes - download.downloadedBytes, download.speed)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Cancel Button for active downloads */}
            {!isCompleted && (
                <div className="w-10 flex items-center justify-center border-l border-white/5">
                    <button
                        onClick={() => removeDownload(download.id)}
                        className="p-1 text-[#8b929a] hover:text-white hover:bg-[#2a3f55] rounded"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default function Downloads() {
    const { downloads } = useDownloads();
    const [peakSpeed, setPeakSpeed] = useState(0);

    const activeDownloads = downloads.filter(d =>
        d.status === 'downloading' || d.status === 'paused' // Treat paused as active/pending logic
    );
    const completedDownloads = downloads.filter(d =>
        d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled'
    );

    const totalSpeed = activeDownloads.reduce((acc, d) => acc + (d.speed || 0), 0);
    const diskUsage = totalSpeed; // Simplification

    useEffect(() => {
        if (totalSpeed > peakSpeed) {
            setPeakSpeed(totalSpeed);
        }
    }, [totalSpeed]);

    return (
        <div className="flex flex-col h-full bg-[#1b2838]">
            <MetricsHeader currentSpeed={totalSpeed} peakSpeed={peakSpeed} diskUsage={diskUsage} />

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[#2a475e] scrollbar-track-[#1b2838]">
                {/* Active Section */}
                <div className="mb-8">
                    <h2 className="text-[#dcdedf] text-base font-bold mb-3 opacity-80 uppercase tracking-wide">
                        Up Next ({activeDownloads.length})
                    </h2>
                    {activeDownloads.length === 0 ? (
                        <div className="text-[#8b929a] italic text-sm py-4 border-t border-b border-white/5">
                            There are no downloads in the queue
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {activeDownloads.map((d, index) => <DownloadItem key={`${d.id}-${index}`} download={d} />)}
                        </div>
                    )}
                </div>

                {/* Completed Section */}
                <div>
                    <h2 className="text-[#dcdedf] text-base font-bold mb-3 opacity-80 uppercase tracking-wide">
                        Completed ({completedDownloads.length})
                    </h2>
                    {completedDownloads.length === 0 ? (
                        <div className="text-[#8b929a] italic text-sm py-4 border-t border-b border-white/5">
                            No completed downloads
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {completedDownloads.map((d, index) => <DownloadItem key={`${d.id}-${index}`} download={d} isCompleted />)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
