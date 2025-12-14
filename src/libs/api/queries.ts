import { gql } from 'graphql-request';

// Get list of articles with pagination
export const GET_ARTICLES = gql`
  query GetArticles($filter: ArticleFilterInput, $limit: Int!, $offset: Int!) {
    articles(filter: $filter, limit: $limit, offset: $offset) {
      id
      title
      slug
      description
      coverImage
      mainImage
      ver
      sequentialCode
      favoritesCount
      createdAt
      categories {
        id
        name
      }
      platforms {
        id
        name
      }
      tags {
        id
        name
      }
      engine {
        id
        name
      }
    }
  }
`;

// Get single article by ID or slug
export const GET_ARTICLE = gql`
  query GetArticle($id: Int, $slug: String, $language: String) {
    article(id: $id, slug: $slug, language: $language) {
      id
      title
      slug
      description
      body
      coverImage
      mainImage
      backgroundImage
      ver
      sequentialCode
      createdAt
      updatedAt
      favorited
      favoritesCount
      status
      author {
        id
        name
        image
        following
      }
      categories {
        id
        name
      }
      platforms {
        id
        name
      }
      tags {
        id
        name
      }
      creators {
        id
        name
      }
      engine {
        id
        name
      }
      images {
        id
        url
      }
    }
  }
`;

// Get all categories
export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
    }
  }
`;

// Get all platforms
export const GET_PLATFORMS = gql`
  query GetPlatforms {
    platforms {
      id
      name
    }
  }
`;

// Get all tags
export const GET_TAGS = gql`
  query GetTags {
    tags {
      id
      name
    }
  }
`;

// Get downloads for an article
export const GET_DOWNLOADS = gql`
  query GetDownloads($articleId: Int!) {
    downloads(articleId: $articleId) {
      id
      name
      url
      isActive
      vipOnly
    }
  }
`;

// Get official download sources
export const GET_OFFICIAL_DOWNLOAD_SOURCES = gql`
  query GetOfficialDownloadSources($articleId: Int!) {
    officialDownloadSources(articleId: $articleId) {
      id
      name
      url
      status
      reviewNote
    }
  }
`;
