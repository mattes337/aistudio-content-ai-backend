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
9.  [Newsletters API](#newsletters-api)
10. [AI Services API](#ai-services-api)

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
| `GET`  | `/`                     | Retrieves a list of all channels. |
| `POST` | `/`                     | Creates a new channel.          |
| `GET`  | `/{channelId}`          | Retrieves a single channel by its ID. |
| `PUT`  | `/{channelId}`          | Updates an existing channel.    |
| `DELETE` | `/{channelId}`        | Deletes a channel.              |

---

## Media Assets API

**Resource URL**: `/api/media-assets`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Retrieves a list of all media assets. |
| `POST` | `/`                     | Creates a new media asset.       |
| `GET`  | `/{assetId}`            | Retrieves a single media asset by its ID. |
| `PUT`  | `/{assetId}`            | Updates an existing media asset.  |
| `DELETE` | `/{assetId}`          | Deletes a media asset.          |

---

## Articles API

**Resource URL**: `/api/articles`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Retrieves a list of all articles. |
| `POST` | `/`                     | Creates a new article.          |
| `GET`  | `/{articleId}`          | Retrieves a single article by its ID. |
| `PUT`  | `/{articleId}`          | Updates an existing article.    |
| `DELETE` | `/{articleId}`        | Deletes an article.             |

---

## Posts API

**Resource URL**: `/api/posts`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Retrieves a list of all posts.  |
| `POST` | `/`                     | Creates a new post.             |
| `GET`  | `/{postId}`             | Retrieves a single post by its ID. |
| `PUT`  | `/{postId}`             | Updates an existing post.       |
| `DELETE` | `/{postId}`           | Deletes a post.                 |

---

## Knowledge Sources API

**Resource URL**: `/api/knowledge-sources`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Retrieves a list of all knowledge sources. |
| `POST` | `/`                     | Creates a new knowledge source. Triggers background ingestion. |
| `GET`  | `/{sourceId}`           | Retrieves a single knowledge source by its ID. |
| `PUT`  | `/{sourceId}`           | Updates an existing knowledge source. May trigger re-ingestion. |
| `DELETE` | `/{sourceId}`         | Deletes a knowledge source.     |
| `POST` | `/{sourceId}/reingest`  | Explicitly triggers re-ingestion of a source. |

---

## Recipients API

**Resource URL**: `/api/recipients`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Retrieves a list of all newsletter recipients. |
| `POST` | `/`                     | Creates a new recipient.        |
| `GET`  | `/{recipientId}`        | Retrieves a single recipient by ID. |
| `PUT`  | `/{recipientId}`        | Updates an existing recipient.  |
| `DELETE` | `/{recipientId}`      | Deletes a recipient.            |

---

## Newsletters API

**Resource URL**: `/api/newsletters`

| Method | Endpoint                | Description                     |
| ------ | ----------------------- | ------------------------------- |
| `GET`  | `/`                     | Retrieves a list of all newsletters. |
| `POST` | `/`                     | Creates a new newsletter.       |
| `GET`  | `/{newsletterId}`       | Retrieves a single newsletter by ID. |
| `PUT`  | `/{newsletterId}`       | Updates an existing newsletter. |
| `DELETE` | `/{newsletterId}`     | Deletes a newsletter.           |

---

## AI Services API

These endpoints provide access to AI-powered generation and editing capabilities, acting as a proxy to a service like Google's Gemini API.

| Method | Endpoint                             | Description                               |
| ------ | ------------------------------------ | ----------------------------------------- |
| `POST` | `/ai/generate/article`               | Revises or generates an article based on a prompt. |
| `POST` | `/ai/generate/newsletter`            | Revises or generates a newsletter based on a prompt. |
| `POST` | `/ai/generate/post-caption`          | Generates a simple post caption from a prompt. |
| `POST` | `/ai/generate/post-details`          | Generates a full post (caption, alt text, tags) from a prompt. |
| `POST` | `/ai/generate/image`                 | Generates an image from a text prompt and aspect ratio. |
| `POST` | `/ai/edit/image`                     | Edits an existing image using a prompt.     |
| `POST` | `/ai/generate/bulk`                  | Generates multiple articles and posts in a single request. |
| `POST` | `/ai/generate/article-title`         | Generates a title from article content.   |
| `POST` | `/ai/generate/newsletter-subject`    | Generates a subject line from newsletter content. |
| `POST` | `/ai/generate/article-metadata`      | Generates SEO metadata and an excerpt from article content. |
| `POST` | `/ai/generate/newsletter-preview`    | Generates preview text from newsletter content. |

### Request & Response Examples

#### `POST /ai/generate/article`
-   **Request Body**: `{ "prompt": "Instruction: \"<prompt>\". Revise the following article object: <JSON string of Article>", "channel_id": "..." }`
-   **Response Body**: The full `Article` object.

#### `POST /ai/generate/newsletter`
-   **Request Body**: `{ "prompt": "Instruction: \"<prompt>\". Revise the following newsletter object: <JSON string of Newsletter>", "channel_id": "..." }`
-   **Response Body**: The full `Newsletter` object.

#### `POST /ai/generate/post-caption`
-   **Request Body**: `{ "prompt": "A witty caption about coffee" }`
-   **Response Body**: `{ "content": "Life happens. Coffee helps." }`

#### `POST /ai/generate/post-details`
-   **Request Body**: `{ "prompt": "make it snappy", "currentCaption": "This is a post about our new product." }`
-   **Response Body**: `{ "content": "Our new product is here!", "altText": "A photo of the new product on a table.", "tags": ["#newproduct", "#launch"] }`

#### `POST /ai/generate/image`
-   **Request Body**: `{ "prompt": "a robot reading a book", "aspectRatio": "1:1" }`
-   **Response Body**: `{ "image_url": "data:image/png;base64,..." }`

#### `POST /ai/edit/image`
-   **Request Body**: `{ "base64ImageData": "...", "mimeType": "image/png", "prompt": "add a hat to the robot" }`
-   **Response Body**: `{ "image_url": "data:image/png;base64,..." }`

#### `POST /ai/generate/article-metadata`
-   **Request Body**: `{ "title": "My Article", "content": "This is the content..." }`
-   **Response Body**: `{ "seo": { "title": "...", "description": "...", "keywords": "...", "slug": "..." }, "excerpt": "..." }`
