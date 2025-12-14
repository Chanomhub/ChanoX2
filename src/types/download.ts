export interface Download {
    id: number;
    filename: string;
    url?: string;
    savePath?: string;
    status: 'downloading' | 'completed' | 'failed' | 'cancelled' | 'paused';
    progress: number;
    downloadedBytes: number;
    totalBytes: number;
    speed: number;
    startTime: Date;
    endTime?: Date;
    error?: string;

    // Metadata
    articleTitle?: string;
    coverImage?: string;
    engine?: string;
    gameVersion?: string;
    isFavorite?: boolean;

    // Extraction
    isExtracting?: boolean;
    extractedPath?: string;
}
