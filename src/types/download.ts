// src/types/download.ts

export interface Download {
    id: number;
    filename: string;
    articleId?: number;
    apiDownloadId?: number;
    articleTitle?: string;
    articleDescription?: string;
    articleBody?: string;
    coverImage?: string;
    engine?: string;
    gameVersion?: string;
    status: 'downloading' | 'completed' | 'failed' | 'cancelled' | 'extracting';
    progress: number;
    downloadedBytes: number;
    totalBytes: number;
    speed: number;
    startTime: Date;
    endTime?: Date;
    savePath?: string;
    extractedPath?: string;
    isExtracting?: boolean;
    error?: string;
    isFavorite: boolean;
}
