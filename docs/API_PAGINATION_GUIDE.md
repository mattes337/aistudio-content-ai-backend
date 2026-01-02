# API Pagination, Sorting, and Filtering Guide

This document describes how to use pagination, sorting, and filtering across all list endpoints in the API.

## Common Patterns

All list endpoints support the following common parameters:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | integer | 50 | 100 | Number of items per page |
| `offset` | integer | 0 | - | Number of items to skip |
| `sort_order` | string | desc | - | Sort direction: `asc` or `desc` |

## Response Format

All paginated endpoints return responses in this format:

```json
{
  "data": [...],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

- `data`: Array of items (partial data, excludes large fields)
- `total`: Total count of items matching the filters
- `limit`: Applied limit
- `offset`: Applied offset

## Partial Content

List endpoints return **partial data** to keep response sizes small. Large fields like `data`, `content`, or `credentials` are excluded from list responses. To get the full object, fetch it individually using the `GET /{entity}/{id}` endpoint.

---

## Entities

### Articles

**Endpoint:** `GET /api/articles`

#### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `search` | string | - | Search in article title |
| `status` | string | `draft`, `approved`, `scheduled`, `published`, `archived` | Filter by status |
| `channel_id` | string (UUID) | - | Filter by channel |
| `sort_by` | string | `title`, `status`, `publish_date`, `created_at`, `updated_at` | Sort field (default: `created_at`) |
| `sort_order` | string | `asc`, `desc` | Sort direction (default: `desc`) |
| `limit` | integer | 1-100 | Items per page (default: 50) |
| `offset` | integer | 0+ | Items to skip (default: 0) |

#### Example Requests

```bash
# Get first 20 draft articles
GET /api/articles?status=draft&limit=20

# Search articles sorted by title
GET /api/articles?search=marketing&sort_by=title&sort_order=asc

# Get second page of articles for a specific channel
GET /api/articles?channel_id=abc123&limit=50&offset=50
```

#### Response Fields (Partial)

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Article Title",
      "status": "draft",
      "publish_date": "2024-01-15T10:00:00Z",
      "channel_id": "uuid",
      "channel_name": "My Blog",
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-14T15:30:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

### Posts

**Endpoint:** `GET /api/posts`

#### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `search` | string | - | Search in platform or linked article title |
| `status` | string | `draft`, `approved`, `scheduled`, `published`, `deleted` | Filter by status |
| `platform` | string | - | Filter by platform (e.g., `instagram`, `facebook`) |
| `linked_article_id` | string (UUID) | - | Filter by linked article |
| `sort_by` | string | `status`, `platform`, `publish_date`, `created_at`, `updated_at` | Sort field (default: `created_at`) |
| `sort_order` | string | `asc`, `desc` | Sort direction (default: `desc`) |
| `limit` | integer | 1-100 | Items per page (default: 50) |
| `offset` | integer | 0+ | Items to skip (default: 0) |

#### Example Requests

```bash
# Get all Instagram posts
GET /api/posts?platform=instagram

# Get approved posts sorted by publish date
GET /api/posts?status=approved&sort_by=publish_date&sort_order=asc

# Get posts linked to a specific article
GET /api/posts?linked_article_id=article-uuid-here
```

#### Response Fields (Partial)

```json
{
  "data": [
    {
      "id": "uuid",
      "status": "scheduled",
      "publish_date": "2024-01-20T14:00:00Z",
      "platform": "instagram",
      "linked_article_id": "uuid",
      "linked_article_title": "My Article",
      "preview_file_path": "path/to/file.jpg",
      "file_status": "active",
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-14T15:30:00Z"
    }
  ],
  "total": 75,
  "limit": 50,
  "offset": 0
}
```

---

### Channels

**Endpoint:** `GET /api/channels`

#### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `search` | string | - | Search in name or URL |
| `type` | string | `website`, `instagram`, `facebook`, `x`, `newsletter` | Filter by type |
| `platform_api` | string | `none`, `wordpress`, `instagram_graph`, `facebook_graph`, `x_api`, `email_api` | Filter by platform API |
| `sort_by` | string | `name`, `type`, `platform_api`, `created_at`, `updated_at` | Sort field (default: `created_at`) |
| `sort_order` | string | `asc`, `desc` | Sort direction (default: `desc`) |
| `limit` | integer | 1-100 | Items per page (default: 50) |
| `offset` | integer | 0+ | Items to skip (default: 0) |

#### Example Requests

```bash
# Get all newsletter channels
GET /api/channels?type=newsletter

# Search channels by name
GET /api/channels?search=marketing&sort_by=name

# Get WordPress-connected channels
GET /api/channels?platform_api=wordpress
```

#### Response Fields (Partial)

Credentials and data are excluded from list responses for security.

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Marketing Blog",
      "url": "https://blog.example.com",
      "type": "website",
      "platform_api": "wordpress",
      "created_at": "2024-01-05T09:00:00Z",
      "updated_at": "2024-01-10T11:00:00Z"
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

---

### Recipients

**Endpoint:** `GET /api/recipients`

#### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `search` | string | - | Search in email address |
| `status` | string | `subscribed`, `unsubscribed` | Filter by subscription status |
| `channel_id` | string (UUID) | - | Filter by newsletter channel |
| `sort_by` | string | `email`, `status`, `registration_date`, `last_notification_date`, `created_at`, `updated_at` | Sort field (default: `created_at`) |
| `sort_order` | string | `asc`, `desc` | Sort direction (default: `desc`) |
| `limit` | integer | 1-100 | Items per page (default: 50) |
| `offset` | integer | 0+ | Items to skip (default: 0) |

#### Example Requests

```bash
# Get all subscribed recipients
GET /api/recipients?status=subscribed

# Search for recipients by email
GET /api/recipients?search=@company.com

# Get recipients for a specific newsletter channel
GET /api/recipients?channel_id=newsletter-uuid&sort_by=email
```

#### Response Fields (Partial)

Custom data is excluded from list responses.

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "channel_id": "uuid",
      "channel_name": "Weekly Newsletter",
      "registration_date": "2024-01-01T00:00:00Z",
      "last_notification_date": "2024-01-15T10:00:00Z",
      "status": "subscribed",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 5000,
  "limit": 50,
  "offset": 0
}
```

---

### Newsletters

**Endpoint:** `GET /api/newsletters`

#### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `search` | string | - | Search in subject |
| `status` | string | `draft`, `scheduled`, `sent` | Filter by status |
| `channel_id` | string (UUID) | - | Filter by channel |
| `sort_by` | string | `subject`, `status`, `publish_date`, `created_at`, `updated_at` | Sort field (default: `created_at`) |
| `sort_order` | string | `asc`, `desc` | Sort direction (default: `desc`) |
| `limit` | integer | 1-100 | Items per page (default: 50) |
| `offset` | integer | 0+ | Items to skip (default: 0) |

#### Example Requests

```bash
# Get all sent newsletters
GET /api/newsletters?status=sent

# Search newsletters by subject
GET /api/newsletters?search=product%20launch

# Get scheduled newsletters sorted by publish date
GET /api/newsletters?status=scheduled&sort_by=publish_date&sort_order=asc
```

#### Response Fields (Partial)

```json
{
  "data": [
    {
      "id": "uuid",
      "subject": "Weekly Update",
      "status": "sent",
      "publish_date": "2024-01-15T10:00:00Z",
      "channel_id": "uuid",
      "channel_name": "Weekly Newsletter",
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 52,
  "limit": 50,
  "offset": 0
}
```

---

### Media Assets

**Endpoint:** `GET /api/media-assets`

#### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `search` | string | - | Search in title |
| `type` | string | `instagram_post`, `article_feature`, `article_inline`, `icon`, `generic_image` | Filter by asset type |
| `file_status` | string | `active`, `uploading`, `missing`, `deleted` | Filter by file status |
| `sort_by` | string | `title`, `type`, `file_status`, `created_at`, `updated_at` | Sort field (default: `created_at`) |
| `sort_order` | string | `asc`, `desc` | Sort direction (default: `desc`) |
| `limit` | integer | 1-100 | Items per page (default: 50) |
| `offset` | integer | 0+ | Items to skip (default: 0) |

#### Example Requests

```bash
# Get all Instagram post images
GET /api/media-assets?type=instagram_post

# Search assets by title
GET /api/media-assets?search=hero%20image

# Get active feature images
GET /api/media-assets?type=article_feature&file_status=active
```

#### Response Fields (Partial)

Asset data/metadata is excluded, but includes generated URL.

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Hero Image",
      "type": "article_feature",
      "file_path": "uploads/hero-123.jpg",
      "file_status": "active",
      "url": "http://localhost:3000/files/uploads/hero-123.jpg",
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-10T08:00:00Z"
    }
  ],
  "total": 200,
  "limit": 50,
  "offset": 0
}
```

---

### Knowledge Sources

**Endpoint:** `GET /api/knowledge-sources`

#### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `search` | string | - | Search in name |
| `search_content` | boolean | `true`, `false` | Also search in chunk content |
| `folder_path` | string | - | Filter by exact folder path |
| `type` | string | `text`, `website`, `pdf`, `instagram`, `youtube`, `video_file`, `audio_file` | Filter by source type |
| `status` | string | `pending`, `processed`, `error` | Filter by processing status |
| `sort_by` | string | `name`, `type`, `created_at`, `updated_at` | Sort field (default: `created_at`) |
| `sort_order` | string | `asc`, `desc` | Sort direction (default: `desc`) |
| `limit` | integer | 1-100 | Items per page (default: 100) |
| `offset` | integer | 0+ | Items to skip (default: 0) |

#### Example Requests

```bash
# Get all PDF sources
GET /api/knowledge-sources?type=pdf

# Search sources including content
GET /api/knowledge-sources?search=marketing&search_content=true

# Get sources in a specific folder
GET /api/knowledge-sources?folder_path=documents/guides

# Get processed sources sorted by name
GET /api/knowledge-sources?status=processed&sort_by=name&sort_order=asc
```

#### Response Fields (Partial)

Includes chunk counts but excludes full chunk data.

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Product Guide.pdf",
      "type": "pdf",
      "status": "processed",
      "folder_path": "documents/guides",
      "chunk_count": 15,
      "embedded_count": 15,
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-10T09:30:00Z"
    }
  ],
  "total": 45,
  "limit": 100,
  "offset": 0
}
```

---

### Chat Sessions

**Endpoint:** `GET /api/chat/sessions`

#### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `search` | string | - | Search in session title |
| `sort_by` | string | `title`, `created_at`, `updated_at` | Sort field (default: `updated_at`) |
| `sort_order` | string | `asc`, `desc` | Sort direction (default: `desc`) |
| `limit` | integer | 1-100 | Items per page (default: 50) |
| `offset` | integer | 0+ | Items to skip (default: 0) |

#### Example Requests

```bash
# Get recent sessions
GET /api/chat/sessions?sort_by=updated_at&sort_order=desc

# Search sessions by title
GET /api/chat/sessions?search=product%20questions

# Get sessions sorted by title
GET /api/chat/sessions?sort_by=title&sort_order=asc
```

#### Response Fields (Partial)

Includes message count and aggregated channel names.

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Product Questions",
      "message_count": 12,
      "channel_names": "Blog, Newsletter",
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z"
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

---

### Chat Messages

**Endpoint:** `GET /api/chat/sessions/{sessionId}/messages`

#### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `search` | string | - | Search in message content |
| `role` | string | `user`, `assistant` | Filter by message role |
| `sort_by` | string | `created_at` | Sort field (default: `created_at`) |
| `sort_order` | string | `asc`, `desc` | Sort direction (default: `asc`) |
| `limit` | integer | 1-100 | Items per page (default: 50) |
| `offset` | integer | 0+ | Items to skip (default: 0) |

#### Example Requests

```bash
# Get first 20 messages in a session
GET /api/chat/sessions/session-uuid/messages?limit=20

# Get only user messages
GET /api/chat/sessions/session-uuid/messages?role=user

# Search messages
GET /api/chat/sessions/session-uuid/messages?search=pricing
```

#### Response Fields (Partial)

Includes content preview (first 200 characters) instead of full content.

```json
{
  "data": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "role": "user",
      "content_preview": "What are the pricing options for...",
      "created_at": "2024-01-15T14:30:00Z"
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

---

## Pagination Examples

### Basic Pagination

```bash
# First page (items 1-50)
GET /api/articles?limit=50&offset=0

# Second page (items 51-100)
GET /api/articles?limit=50&offset=50

# Third page (items 101-150)
GET /api/articles?limit=50&offset=100
```

### Calculate Total Pages

```javascript
const totalPages = Math.ceil(response.total / response.limit);
const currentPage = Math.floor(response.offset / response.limit) + 1;
```

### Frontend Pagination Component

```javascript
// Request with page number
const page = 3;
const limit = 20;
const offset = (page - 1) * limit;

fetch(`/api/articles?limit=${limit}&offset=${offset}`)
  .then(res => res.json())
  .then(data => {
    console.log(`Showing items ${offset + 1} to ${offset + data.data.length} of ${data.total}`);
  });
```

---

## Sorting Examples

```bash
# Sort by name ascending
GET /api/channels?sort_by=name&sort_order=asc

# Sort by date descending (newest first)
GET /api/articles?sort_by=created_at&sort_order=desc

# Sort by status then by name
# Note: Multi-field sorting is not supported; use primary sort field
GET /api/posts?sort_by=status&sort_order=asc
```

---

## Filtering Examples

### Single Filter

```bash
GET /api/articles?status=published
```

### Multiple Filters (AND logic)

```bash
GET /api/articles?status=published&channel_id=abc123
```

### Search + Filter

```bash
GET /api/recipients?search=@gmail.com&status=subscribed
```

### Combined Query

```bash
GET /api/posts?platform=instagram&status=approved&sort_by=publish_date&sort_order=asc&limit=20
```

---

## Error Handling

Invalid parameter values are handled gracefully:

- Invalid `sort_by` values default to `created_at`
- Invalid `sort_order` values default to `desc`
- `limit` values above 100 are capped to 100
- `limit` values below 1 are set to 1
- Negative `offset` values are set to 0

---

## Performance Tips

1. **Use filters** - Reduce result set size by filtering on indexed columns
2. **Limit results** - Request only what you need
3. **Avoid large offsets** - For large datasets, consider cursor-based pagination
4. **Cache responses** - List responses with stable filters are good candidates for caching
5. **Use partial data** - List endpoints return partial data; fetch full objects only when needed
