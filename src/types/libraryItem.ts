export interface LibraryItem {
    id: number;               // Unique ID (timestamp)
    title: string;            // ชื่อบทความ/เกม
    coverImage?: string;      // รูปปก

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
