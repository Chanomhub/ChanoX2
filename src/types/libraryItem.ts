export interface LibraryItem {
    id: number;               // Unique ID (timestamp)
    articleId?: number;       // ID จาก API สำหรับดึง official sources
    title: string;            // ชื่อบทความ/เกม
    coverImage?: string;      // รูปปก
    description?: string;     // คำอธิบายย่อ
    body?: string;            // เนื้อหาบทความ (HTML)

    // Paths
    extractedPath: string;    // โฟลเดอร์ที่แตกแล้ว
    archivePath?: string;     // ไฟล์ archive ต้นฉบับ (อาจถูกลบไปแล้ว)

    // Metadata
    engine?: string;
    gameVersion?: string;

    // Timestamps
    addedAt: Date;
    lastPlayedAt?: Date;

    // State
    isFavorite?: boolean;
    isReExtracting?: boolean; // กำลังแตกซ้ำอยู่
}
