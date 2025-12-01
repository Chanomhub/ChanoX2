// TypeScript types based on GraphQL schema
export interface Category {
    id: number;
    name: string;
}

export interface Platform {
    id: number;
    name: string;
}

export interface Tag {
    id: number;
    name: string;
}

export interface Engine {
    id: number;
    name: string;
}

export interface Author {
    id: number;
    name: string;
    image: string | null;
    following: boolean;
}

export interface Creator {
    id: number;
    name: string;
}

export interface ArticleImage {
    id: number;
    url: string;
}

export interface Article {
    id: number;
    title: string;
    slug: string;
    description: string;
    coverImage: string | null;
    mainImage: string | null;
    backgroundImage: string | null;
    ver: string | null;
    sequentialCode: string | null;
    favoritesCount: number;
    createdAt: string;
    categories: Category[];
    platforms: Platform[];
    tags: Tag[];
    engine: Engine | null;
}

export interface ArticleDetail extends Article {
    body: string;
    updatedAt: string;
    favorited: boolean;
    status: string;
    author: Author;
    creators: Creator[];
    images: ArticleImage[];
}

export interface ModCategory {
    id: number;
    name: string;
}

export interface ModImage {
    id: number;
    url: string;
}

export interface ArticleMod {
    id: number;
    name: string;
    version: string | null;
    description: string | null;
    creditTo: string | null;
    downloadLink: string | null;
    status: string;
    categories: ModCategory[];
    images: ModImage[];
}

export interface Download {
    id: number;
    name: string | null;
    url: string;
    isActive: boolean;
    vipOnly: boolean;
}

export interface OfficialDownloadSource {
    id: number;
    name: string;
    url: string;
    status: string;
    reviewNote: string | null;
}

export interface ArticlesResponse {
    articles: Article[];
}

export interface ArticleResponse {
    article: ArticleDetail;
}

export interface CategoriesResponse {
    categories: Category[];
}

export interface PlatformsResponse {
    platforms: Platform[];
}

export interface TagsResponse {
    tags: Tag[];
}

export interface DownloadsResponse {
    downloads: Download[];
}

export interface OfficialDownloadSourcesResponse {
    officialDownloadSources: OfficialDownloadSource[];
}
