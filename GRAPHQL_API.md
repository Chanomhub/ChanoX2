# ChanomHub GraphQL API Schema

## Available Queries

### 1. `articles` - ดึงรายการบทความ/เกม
```graphql
query GetArticles($filter: ArticleFilterInput, $limit: Int!, $offset: Int!, $status: ArticleStatus) {
  articles(filter: $filter, limit: $limit, offset: $offset, status: $status) {
    id
    title
    slug
    description
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
    mods {
      id
      name
      version
      description
      creditTo
      downloadLink
      status
      categories {
        id
        name
      }
      images {
        id
        url
      }
    }
  }
}
```

**Arguments:**
- `filter`: ArticleFilterInput (optional) - ตัวกรอง
- `limit`: Int! (required) - จำนวนรายการ
- `offset`: Int! (required) - เริ่มต้นจากรายการที่
- `status`: ArticleStatus (optional) - สถานะของบทความ

---

### 2. `article` - ดึงบทความเดี่ยว
```graphql
query GetArticle($id: Int, $slug: String) {
  article(id: $id, slug: $slug) {
    id
    title
    slug
    description
    body
    # ... (fields เหมือน articles)
  }
}
```

**Arguments:**
- `id`: Int (optional) - ID ของบทความ
- `slug`: String (optional) - Slug ของบทความ

---

### 3. `categories` - ดึงหมวดหมู่ทั้งหมด
```graphql
query GetCategories {
  categories {
    id
    name
  }
}
```

---

### 4. `platforms` - ดึงแพลตฟอร์มทั้งหมด
```graphql
query GetPlatforms {
  platforms {
    id
    name
  }
}
```

---

### 5. `tags` - ดึงแท็กทั้งหมด
```graphql
query GetTags {
  tags {
    id
    name
  }
}
```

---

### 6. `downloads` - ดึงลิงก์ดาวน์โหลด
```graphql
query GetDownloads($articleId: Int!) {
  downloads(articleId: $articleId) {
    id
    name
    url
    isActive
    vipOnly
  }
}
```

**Arguments:**
- `articleId`: Int! (required) - ID ของบทความ

---

### 7. `officialDownloadSources` - ดึงแหล่งดาวน์โหลดอย่างเป็นทางการ
```graphql
query GetOfficialDownloadSources($articleId: Int!) {
  officialDownloadSources(articleId: $articleId) {
    id
    name
    url
    status
    reviewNote
  }
}
```

**Arguments:**
- `articleId`: Int! (required) - ID ของบทความ

---

## Key Types

### ArticleGraphQLDTO
- `id`: ID
- `title`: String
- `slug`: String
- `description`: String
- `body`: String (HTML content)
- `coverImage`: String (URL)
- `mainImage`: String (URL)
- `backgroundImage`: String (URL)
- `ver`: String (version)
- `sequentialCode`: String
- `createdAt`: DateTime
- `updatedAt`: DateTime
- `favorited`: Boolean
- `favoritesCount`: Int
- `status`: ArticleStatus
- `author`: ArticleAuthorGraphQLDTO
- `categories`: [ArticleCategoryGraphQLDTO]
- `platforms`: [ArticlePlatformGraphQLDTO]
- `tags`: [ArticleTagGraphQLDTO]
- `creators`: [ArticleCreatorGraphQLDTO]
- `engine`: EngineTypeGraphQLDTO
- `images`: [ArticleImageGraphQLDTO]
- `mods`: [ArticleModGraphQLDTO]
