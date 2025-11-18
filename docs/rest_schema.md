# Content AI Manager - REST API Schema

This document outlines the REST API endpoints for the Content AI Manager backend. The API is designed to be RESTful, using standard HTTP methods, status codes, and a consistent JSON structure for requests and responses.

## Table of Contents
1.  [General Principles](#general-principles)
2.  [Authentication](#authentication)
3.  [Channels API](#channels-api)
4.  [Media Assets API](#media-assets-api)
5.  [Articles API](#articles-api)
6.  [Posts API](#posts-api)
7.  [Knowledge Sources API](#knowledge-sources-api)
8.  [Recipients API](#recipients-api)
9.  [AI Services API](#ai-services-api)

---

## General Principles

-   **Base URL**: All endpoints are prefixed with `/api`.
-   **Data Format**: All request and response bodies are in `application/json` format.
-   **Error Handling**: The API uses standard HTTP status codes to indicate success or failure. Error responses include a JSON body with a descriptive `message`.
    -   `400 Bad Request`: Invalid request body or parameters.
    -   `401 Unauthorized`: Missing or invalid authentication token.
    -   `404 Not Found`: The requested resource does not exist.
    -   `500 Internal Server Error`: An unexpected error occurred on the server.
-   **Pagination**: `GET` requests that return lists of resources should support pagination via query parameters (e.g., `?page=1&limit=20`).

## Authentication

All API endpoints require authentication. The client must include a valid JSON Web Token (JWT) in the `Authorization` header of each request.

`Authorization: Bearer <your_jwt_token>`

---

## Channels API

**Resource URL**: `/api/channels`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Get a list of all channels.     |
| `POST` | `/`                     | Create a new channel.           |
| `GET`  | `/{channelId}`          | Get details of a single channel.|
| `PUT`  | `/{channelId}`          | Update an existing channel.     |
| `DELETE`| `/{channelId}`         | Delete a channel.               |

---

## Media Assets API

**Resource URL**: `/api/media-assets`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Get a list of media assets. Can be filtered by `?type=<MediaType>`. |
| `POST` | `/`                     | Upload a new media asset. Expects `multipart/form-data`. |
| `PUT`  | `/{assetId}`            | Update a media asset's details (title, description). |
| `DELETE`| `/{assetId}`            | Delete a media asset.           |

---

## Articles API

**Resource URL**: `/api/articles`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Get a list of articles. Can be filtered by `?status=<ArticleStatus>`. |
| `POST` | `/`                     | Create a new article.           |
| `GET`  | `/{articleId}`          | Get a single article by its ID. |
| `PUT`  | `/{articleId}`          | Update an existing article.     |
| `DELETE`| `/{articleId}`         | Archive or delete an article.   |

---

## Posts API

**Resource URL**: `/api/posts`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Get a list of posts. Can be filtered by `?status=<PostStatus>`. |
| `POST` | `/`                     | Create a new post.              |
| `GET`  | `/{postId}`             | Get a single post by its ID.    |
| `PUT`  | `/{postId}`             | Update an existing post.        |
| `DELETE`| `/{postId}`             | Delete a post.                  |

---

## Knowledge Sources API

**Resource URL**: `/api/knowledge-sources`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Get a list of all knowledge sources. |
| `POST` | `/`                     | Create a new knowledge source. This will automatically trigger the ingestion process. |
| `GET`  | `/{sourceId}`           | Get details of a single source, including ingestion logs and chunks. |
| `PUT`  | `/{sourceId}`           | Update a knowledge source's details. |
| `POST` | `/{sourceId}/reingest`  | Trigger a re-ingestion of the source content. |
| `DELETE`| `/{sourceId}`         | Delete a knowledge source.      |

---

## Recipients API

**Resource URL**: `/api/recipients`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Get a list of all recipients.   |
| `POST` | `/`                     | Create a new recipient.         |
| `GET`  | `/{recipientId}`        | Get details of a single recipient.|
| `PUT`  | `/{recipientId}`        | Update an existing recipient.   |
| `DELETE`| `/{recipientId}`       | Delete a recipient.             |

---

## AI Services API

These endpoints proxy requests to the Gemini API, allowing for secure key management and centralized logic.

**Resource URL**: `/api/ai`

| Method | Endpoint                     | Description                                            | Request Body Example                                     |
| ------ | ---------------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `POST` | `/generate/article`          | Generate or revise an article's content.               | `{ "prompt": "...", "currentContent": "..." }`           |
| `POST` | `/generate/article-title`    | Generate a title based on article content.             | `{ "content": "..." }`                                   |
| `POST` | `/generate/article-metadata` | Generate SEO metadata and an excerpt from content.     | `{ "content": "..." }`                                   |
| `POST` | `/generate/post-details`     | Generate caption, alt text, and tags for a post.       | `{ "prompt": "...", "currentCaption": "..." }`           |
| `POST` | `/generate/image`            | Generate an image from a text prompt.                  | `{ "prompt": "...", "aspectRatio": "1:1" }`               |
| `POST` | `/edit/image`                | Edit an image based on a prompt and base image data.   | `{ "prompt": "...", "base64ImageData": "...", "mimeType": "..." }` |
| `POST` | `/generate/bulk`             | Generate multiple articles and posts.                  | `{ "articleCount": 2, "postCount": 3, "knowledgeSummary": "..." }` |
