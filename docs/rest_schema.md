# Content AI Manager - REST API Schema

This document outlines the REST API endpoints for the Content AI Manager backend. The schema reflects the use of unstructured JSON (`data` objects) for flexibility and includes specific endpoints for handling file uploads.

## Table of Contents
1.  [General Principles](#general-principles)
2.  [Authentication](#authentication)
3.  [File Uploads](#file-uploads)
4.  [Channels API](#channels-api)
5.  [Media Assets API](#media-assets-api)
6.  [Articles API](#articles-api)
7.  [Posts API](#posts-api)
8.  [Knowledge Sources API](#knowledge-sources-api)
9.  [Recipients API](#recipients-api)
10. [Newsletters API](#newsletters-api)
11. [AI Services API](#ai-services-api)

---

## General Principles

-   **Base URL**: `/api`
-   **Data Format**: JSON for logic, Multipart/Form-Data for files.
-   **JSONB Fields**: Many resources use a `data` object to store variable properties. Clients should be prepared to handle this nested structure.

## Authentication

`Authorization: Bearer <token>`

---

## File Uploads

Endpoints for managing binary files.

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/media-assets/upload` | Uploads a file to create a new Media Asset. |
| `PUT`  | `/posts/{postId}/preview-image` | Uploads/Overwrites the preview image for a post. Naming convention uses Post ID. |
| `PUT`  | `/knowledge-sources/{sourceId}/file` | Uploads a source file (PDF, Audio, Video) for a knowledge source. |

---

## Channels API

**Resource URL**: `/api/channels`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/` | List all channels. |
| `POST` | `/` | Create a channel. Body includes `data` object for credentials. |
| `PUT`  | `/{id}` | Update channel. |
| `DELETE`| `/{id}` | Delete channel. |

**Schema (Channel)**:
```json
{
  "id": "uuid",
  "name": "string",
  "url": "string",
  "type": "enum",
  "platformApi": "enum",
  "data": {
    "credentials": { "apiKey": "..." },
    "metadata": { "brandTone": "..." }
  }
}
```

---

## Media Assets API

**Resource URL**: `/api/media-assets`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/` | List assets. Response includes resolved `url` from `file_path`. |
| `POST` | `/upload` | **Multipart/Form-Data**. Fields: `file`, `title`, `type`. |
| `PUT`  | `/{id}` | Update metadata (title, description). |
| `DELETE`| `/{id}` | logical delete or hard delete file. |

**Schema (MediaAsset)**:
```json
{
  "id": "uuid",
  "title": "string",
  "type": "enum",
  "url": "string", // Resolved public URL
  "data": {
    "description": "string",
    "mimeType": "string"
  }
}
```

---

## Articles API

**Resource URL**: `/api/articles`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/` | List articles. |
| `POST` | `/` | Create article. Content goes in `data`. |
| `PUT`  | `/{id}` | Update article. |
| `DELETE`| `/{id}` | Delete article. |

**Schema (Article)**:
```json
{
  "id": "uuid",
  "title": "string",
  "status": "enum",
  "publishDate": "iso-date",
  "channelId": "uuid",
  "data": {
    "content": "html-string",
    "excerpt": "string",
    "author": "string",
    "categories": ["string"],
    "tags": ["string"],
    "seo": { "title": "...", "description": "...", "slug": "..." },
    "titleImageUrl": "string", // URL or reference
    "inlineImages": [{ "url": "...", "alt": "..." }]
  }
}
```

---

## Posts API

**Resource URL**: `/api/posts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/` | List posts. |
| `POST` | `/` | Create post metadata. |
| `PUT`  | `/{id}` | Update post metadata. |
| `PUT`  | `/{id}/preview-image` | **Multipart**. Uploads generated image. Overwrites existing. |
| `DELETE`| `/{id}` | Delete post and associated file. |

**Schema (Post)**:
```json
{
  "id": "uuid",
  "status": "enum",
  "publishDate": "iso-date",
  "platform": "string", // High level filter
  "previewImageUrl": "string", // Resolved from file_path
  "linkedArticleId": "uuid",
  "data": {
    "content": "string", // Caption
    "overlays": [ { "type": "...", "x": 0, "y": 0 } ],
    "tags": ["string"],
    "location": "string",
    "taggedUsers": ["string"],
    "settings": { "disableComments": false }
  }
}
```

---

## Knowledge Sources API

**Resource URL**: `/api/knowledge-sources`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/` | List sources. |
| `POST` | `/` | Create source metadata. |
| `PUT`  | `/{id}/file` | **Multipart**. Upload binary file (PDF/Audio). Triggers ingestion. |
| `PUT`  | `/{id}` | Update metadata. |
| `DELETE`| `/{id}` | Delete source. |

**Schema (KnowledgeSource)**:
```json
{
  "id": "uuid",
  "name": "string",
  "type": "enum",
  "sourceOrigin": "string", // URL or filename
  "status": "enum",
  "data": {
    "ingestedContent": "string",
    "ingestionLog": [ { "timestamp": "...", "message": "..." } ]
  }
}
```

---

## Recipients API

(Standard CRUD, logic unchanged).

---

## Newsletters API

**Resource URL**: `/api/newsletters`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/` | List newsletters. |
| `POST` | `/` | Create newsletter. |
| `PUT`  | `/{id}` | Update newsletter. |
| `DELETE`| `/{id}` | Delete newsletter. |

**Schema (Newsletter)**:
```json
{
  "id": "uuid",
  "subject": "string",
  "status": "enum",
  "publishDate": "iso-date",
  "channelId": "uuid",
  "data": {
    "content": "html-string",
    "previewText": "string",
    "headerImageUrl": "string",
    "stats": { "recipientCount": 0, "sentDate": "..." }
  }
}
```

---

## AI Services API

Endpoints act as a gateway to AI models (Gemini).

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/ai/generate/text` | Generic text generation/refinement. |
| `POST` | `/ai/generate/image` | Image generation. Returns base64 or temp URL. |
| `POST` | `/ai/edit/image` | Image editing. |
| `POST` | `/ai/metadata` | Infer metadata (SEO, tags) from text. |
| `POST` | `/ai/bulk` | Bulk generation logic. |

**Note**: The frontend usually sends JSON payloads here. The backend handles the complexity of prompting the LLM and parsing the response before returning it to the UI.
