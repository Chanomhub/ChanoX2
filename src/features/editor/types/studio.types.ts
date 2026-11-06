export type ArticleMode = 'create' | 'edit';
export type ContentType = 'game' | 'article' | 'font';

export interface ImageItem {
  id: string;
  url: string;
}

export interface DownloadItem {
  id?: number;
  tempId: string;
  name: string;
  url: string;
  isActive: boolean;
  forVersion?: string;
  platforms?: string[];
  fileSize?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  extension?: string;
  submitNote?: string;
  note?: string;
  type?: string;
  syncStatus?: 'synced' | 'saving' | 'error' | 'new';
}

export interface OfficialStoreItem {
  id?: number;
  tempId: string;
  name: string;
  url: string;
  submitNote?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  syncStatus?: 'synced' | 'saving' | 'error' | 'new';
}

export interface ArticleStudioFormData {
  id?: number | null;
  title: string;
  slug: string;
  description: string;
  body: string;
  creator: string;
  creatorUserId?: number | null;
  ver: string;
  sequentialCode: string;
  engine: string | null;
  tags: string[];
  categories: string[];
  platforms: string[];
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  favorited?: boolean;
  favoritesCount?: number;
  coverImage?: string | null;
  coverImageId?: string | null;
  mainImage?: string | null;
  mainImageId?: string | null;
  backgroundImage?: string | null;
  backgroundImageId?: string | null;
  otherImages: string[];
  videoUrl?: string;
  message?: string; // Devlog description / update note
  notes?: string;   // Patch notes / detailed changelog
  downloads: DownloadItem[];
  officialStoreItems: OfficialStoreItem[];
  updatedAt?: string | Date;
}

export interface ArticleStudioProps {
  mode: ArticleMode;
  slug?: string;
  initialData?: any;
  contentType?: ContentType;
  availableTags?: string[];
  availableCategories?: string[];
  availablePlatforms?: string[];
  availableEngines?: { id: number; name: string }[];
  locale?: string;
  onSuccess?: (slug: string) => void;
}
