export interface Download {
    id: number; // Electron download ID
    url?: string;
    filename: string;
    articleTitle?: string;
    coverImage?: string;
    engine?: string;
    isFavorite?: boolean;
    gameVersion?: string;
    status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
    progress: number; // 0-100
    downloadedBytes: number;
    totalBytes: number;
    speed: number; // bytes per second
    startTime: Date;
    endTime?: Date;
    error?: string;
    savePath?: string;
    isExtracting?: boolean;
    extractedPath?: string;
}
