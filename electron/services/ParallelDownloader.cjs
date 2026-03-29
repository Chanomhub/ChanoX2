const { net } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Parallel Downloader Service for ChanoX2
 * Optimized for storage.chanomhub.com
 */
class ParallelDownloader {
    constructor(win, downloadDirectory, activeDownloads, getNextId) {
        this.win = win;
        this.downloadDirectory = downloadDirectory;
        this.activeDownloads = activeDownloads;
        this.getNextId = getNextId;
    }

    /**
     * Start a parallel download
     * @param {string} url - Download URL
     * @param {Object} headers - Optional headers (e.g. Auth)
     * @param {Object} metadata - Optional metadata (e.g. filename)
     */
    async download(url, headers = {}, metadata = {}) {
        const id = this.getNextId();
        const controller = new AbortController();
        const { signal } = controller;

        const downloadInfo = {
            id,
            url,
            headers,
            controller,
            status: 'downloading',
            receivedBytes: 0,
            totalBytes: 0,
            startTime: Date.now(),
            lastReportTime: Date.now(),
            lastReceivedBytes: 0,
            cancel: () => controller.abort(),
            isPaused: () => false // Custom downloader doesn't support pause yet
        };

        this.activeDownloads.set(id, downloadInfo);

        try {
            console.log(`[ParallelDownloader] Starting download for: ${url}`);

            // 1. Get file info (HEAD request)
            const headRes = await fetch(url, {
                method: 'HEAD',
                headers: { ...headers },
                signal
            }).catch(err => {
                // If HEAD fails (some servers don't support it or return 405), fallback to GET with Range 0-0
                return fetch(url, {
                    method: 'GET',
                    headers: { ...headers, 'Range': 'bytes=0-0' },
                    signal
                });
            });

            if (!headRes.ok && headRes.status !== 206) {
                throw new Error(`Failed to fetch file info: HTTP ${headRes.status}`);
            }

            // Get total size from Content-Length or Content-Range
            let totalBytes = parseInt(headRes.headers.get('Content-Length') || '0', 10);
            const contentRange = headRes.headers.get('Content-Range');
            if (contentRange) {
                const match = contentRange.match(/\/(\d+)$/);
                if (match) totalBytes = parseInt(match[1], 10);
            }

            const acceptRanges = headRes.headers.get('Accept-Ranges') === 'bytes' || !!contentRange;
            const contentDisposition = headRes.headers.get('Content-Disposition');
            const filename = metadata.filename || this.getFilenameFromUrl(url, contentDisposition);

            const savePath = path.join(this.downloadDirectory, filename);

            downloadInfo.totalBytes = totalBytes;
            downloadInfo.filename = filename;
            downloadInfo.savePath = savePath;

            // Notify started
            if (this.win && !this.win.isDestroyed()) {
                this.win.webContents.send('download-started', { id, filename, totalBytes });
            }

            // If file is small (< 10MB) or no range support, do single stream
            const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
            if (totalBytes <= CHUNK_SIZE || !acceptRanges) {
                console.log(`[ParallelDownloader] Range not supported or file too small, using single stream`);
                await this.downloadSingle(downloadInfo, signal);
            } else {
                console.log(`[ParallelDownloader] Using parallel download with chunks`);
                await this.downloadParallel(downloadInfo, CHUNK_SIZE, signal);
            }

            // Notify complete
            if (this.win && !this.win.isDestroyed()) {
                this.win.webContents.send('download-complete', { id, path: savePath, filename });
            }
            this.activeDownloads.delete(id);

        } catch (error) {
            if (signal.aborted) {
                console.log(`[ParallelDownloader] Download cancelled: ${id}`);
                if (this.win && !this.win.isDestroyed()) {
                    this.win.webContents.send('download-error', { id, error: 'Download cancelled' });
                }
            } else {
                console.error(`[ParallelDownloader] Download failed: ${error.message}`);
                if (this.win && !this.win.isDestroyed()) {
                    this.win.webContents.send('download-error', { id, error: error.message });
                }
            }
            this.activeDownloads.delete(id);
        }
    }

    /**
     * Parallel download implementation
     */
    async downloadParallel(info, chunkSize, signal) {
        const { url, headers, totalBytes, savePath } = info;
        const totalChunks = Math.ceil(totalBytes / chunkSize);
        const concurrency = 4;

        // Ensure directory exists
        const dir = path.dirname(savePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const fd = fs.openSync(savePath, 'w');

        try {
            const chunks = Array.from({ length: totalChunks }, (_, i) => i);
            let activeWorkers = 0;
            let errorOccurred = null;

            const downloadChunk = async (index) => {
                if (signal.aborted || errorOccurred) return;

                const start = index * chunkSize;
                const end = Math.min(start + chunkSize - 1, totalBytes - 1);

                try {
                    const res = await fetch(url, {
                        headers: { ...headers, 'Range': `bytes=${start}-${end}` },
                        signal
                    });

                    if (!res.ok && res.status !== 206) {
                        throw new Error(`Chunk ${index} failed: HTTP ${res.status}`);
                    }

                    if (!res.body) throw new Error(`Chunk ${index} body is empty`);
                    const reader = res.body.getReader();
                    const chunks = [];
                    let chunkReceivedBytes = 0;

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (signal.aborted) {
                            await reader.cancel();
                            return;
                        }

                        chunks.push(value);
                        chunkReceivedBytes += value.length;
                        info.receivedBytes += value.length;
                        this.reportProgress(info);
                    }

                    const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
                    fs.writeSync(fd, buffer, 0, buffer.length, start);
                } catch (err) {
                    errorOccurred = err;
                    throw err;
                }
            };

            // Process chunks with concurrency
            const worker = async () => {
                while (chunks.length > 0 && !signal.aborted && !errorOccurred) {
                    const index = chunks.shift();
                    await downloadChunk(index);
                }
            };

            const workers = Array(Math.min(concurrency, totalChunks)).fill(null).map(() => worker());
            await Promise.all(workers);

            if (errorOccurred) throw errorOccurred;

        } finally {
            fs.closeSync(fd);
        }
    }

    /**
     * Single stream fallback
     */
    async downloadSingle(info, signal) {
        const { url, headers, savePath } = info;

        // Ensure directory exists
        const dir = path.dirname(savePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const res = await fetch(url, { headers, signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const fileStream = fs.createWriteStream(savePath);

        if (!res.body) throw new Error('Response body is empty');
        const reader = res.body.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (signal.aborted) {
                    await reader.cancel();
                    break;
                }

                fileStream.write(Buffer.from(value));
                info.receivedBytes += value.length;
                this.reportProgress(info);
            }
        } finally {
            fileStream.end();
            // Wait for file stream to finish
            await new Promise((resolve) => fileStream.on('finish', resolve));
        }
    }

    /**
     * Report progress to renderer
     */
    reportProgress(info) {
        const now = Date.now();
        const timeDiff = (now - info.lastReportTime) / 1000;

        // Report every 500ms or so to avoid flooding IPC
        if (timeDiff >= 0.5 || info.receivedBytes === info.totalBytes) {
            const bytesDiff = info.receivedBytes - info.lastReceivedBytes;
            const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

            if (this.win && !this.win.isDestroyed()) {
                this.win.webContents.send('download-progress', {
                    id: info.id,
                    receivedBytes: info.receivedBytes,
                    totalBytes: info.totalBytes,
                    speed: Math.round(speed)
                });
            }

            info.lastReportTime = now;
            info.lastReceivedBytes = info.receivedBytes;
        }
    }

    /**
     * Extract filename from URL or Content-Disposition
     */
    getFilenameFromUrl(url, contentDisposition) {
        if (contentDisposition) {
            const match = contentDisposition.match(/filename\*?=["']?([^"';]+)["']?/);
            if (match) {
                let filename = match[1];
                if (filename.startsWith("UTF-8''")) {
                    filename = decodeURIComponent(filename.substring(7));
                }
                return filename;
            }
        }

        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = path.basename(pathname);
            if (filename && filename !== '/') return filename;
        } catch (e) { }

        return 'download-' + crypto.randomBytes(4).toString('hex');
    }
}

module.exports = ParallelDownloader;
