# Content AI Backend - API cURL Examples

## 🔐 Authentication Setup

All API endpoints require JWT authentication. First authenticate to get a token, then include it in all requests.

### Get Authentication Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

### Use Token in API Calls
```bash
# Extract token from login response
TOKEN="your-jwt-token-here"

# Add to all requests
curl -X GET http://localhost:3000/api/channels \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📬 Recipients API Examples

### Get All Recipients
```bash
curl -X GET http://localhost:3000/api/recipients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Get Specific Recipient
```bash
curl -X GET http://localhost:3000/api/recipients/7f5e6767-c994-45bb-b4a6-de6da649e396 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Create New Recipient
```bash
curl -X POST http://localhost:3000/api/recipients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "channel_id": "29b827ee-9423-4c8e-9773-078ba7cdbef6",
    "status": "subscribed"
  }'
```

### Update Recipient
```bash
curl -X PUT http://localhost:3000/api/recipients/7f5e6767-c994-45bb-b4a6-de6da649e396 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "unsubscribed",
    "last_notification_date": "2025-11-17T20:00:00Z"
  }'
```

### Delete Recipient
```bash
curl -X DELETE http://localhost:3000/api/recipients/7f5e6767-c994-45bb-b4a6-de6da649e396 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## 📺 Channels API Examples

### Get All Channels
```bash
curl -X GET http://localhost:3000/api/channels \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Create New Channel
```bash
curl -X POST http://localhost:3000/api/channels \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Blog",
    "url": "https://techblog.example.com",
    "type": "website",
    "platformApi": "wordpress",
    "credentials": {
      "api_key": "wordpress-api-key",
      "url": "https://techblog.example.com/wp-json"
    }
  }'
```

### Update Channel
```bash
curl -X PUT http://localhost:3000/api/channels/29b827ee-9423-4c8e-9773-078ba7cdbef6 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Tech Blog",
    "description": "A technology-focused blog with latest tech news"
  }'
```

---

## 📰 Articles API Examples

### Create New Article
```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with AI Content Generation",
    "content": "Artificial intelligence is revolutionizing how we create and manage content...",
    "title_image_url": "https://example.com/images/ai-content.jpg",
    "title_image_alt": "AI content generation illustration",
    "status": "draft",
    "channel_id": "29b827ee-9423-4c8e-9773-078ba7cdbef6",
    "author": "AI Assistant",
    "categories": ["Technology", "AI"],
    "tags": ["AI", "content generation", "automation"],
    "seo": {
      "title": "AI Content Generation Guide",
      "description": "Learn how AI is transforming content creation",
      "keywords": "AI, content, generation, automation",
      "slug": "ai-content-generation-guide"
    }
  }'
```

### Get Articles with Filter
```bash
# Get published articles only
curl -X GET "http://localhost:3000/api/articles?status=published" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Pagination example
curl -X GET "http://localhost:3000/api/articles?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Update Article Status
```bash
curl -X PUT http://localhost:3000/api/articles/article-id-here \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published",
    "publish_date": "2025-11-17T20:00:00Z"
  }'
```

---

## 📱 Posts API Examples

### Create Social Media Post
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Check out our latest AI-powered content generation tool! 🚀",
    "background_image_url": "https://example.com/images/ai-post-bg.jpg",
    "base_background_image_url": "https://example.com/images/base-bg.jpg",
    "status": "scheduled",
    "platform": "instagram",
    "publish_date": "2025-11-18T10:00:00Z",
    "tags": ["AI", "content", "automation"],
    "location": "San Francisco, CA",
    "alt_text": "AI content generation tool promotion",
    "disable_comments": false,
    "hide_likes": false
  }'
```

### Add Overlays to Post
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "New product launch! 🎉",
    "background_image_url": "https://example.com/images/product-bg.jpg",
    "overlays": [
      {
        "id": "overlay-1",
        "type": "text",
        "x": 50,
        "y": 300,
        "width": 200,
        "height": 50
      },
      {
        "id": "overlay-2", 
        "type": "logo",
        "x": 320,
        "y": 50,
        "width": 60,
        "height": 60
      }
    ],
    "status": "draft",
    "platform": "instagram"
  }'
```

---

## 🖼️ Media Assets API Examples

### Upload Media Asset
```bash
curl -X POST http://localhost:3000/api/media-assets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI Technology Banner",
    "description": "Modern banner showing AI technology concepts",
    "image_url": "https://example.com/assets/ai-banner.jpg",
    "type": "article_feature"
  }'
```

### Update Media Asset
```bash
curl -X PUT http://localhost:3000/api/media-assets/asset-id-here \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated AI Technology Banner",
    "description": "Enhanced banner with better AI visualization",
    "type": "instagram_post"
  }'
```

### Filter Media Assets by Type
```bash
curl -X GET "http://localhost:3000/api/media-assets?type=instagram_post" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🧠 Knowledge Sources API Examples

### Add Text Knowledge Source
```bash
curl -X POST http://localhost:3000/api/knowledge-sources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Best Practices Guide",
    "type": "text",
    "source": "Artificial intelligence (AI) refers to the simulation of human intelligence in machines that are programmed to think and learn..."
  }'
```

### Add Website Knowledge Source
```bash
curl -X POST http://localhost:3000/api/knowledge-sources \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Content Marketing Blog",
    "type": "website",
    "source": "https://contentmarketing.example.com"
  }'
```

### Get Knowledge Source with Chunks
```bash
curl -X GET http://localhost:3000/api/knowledge-sources/source-id-here \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Then get chunks
curl -X GET "http://localhost:3000/api/knowledge-chunks?sourceId=source-id-here" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Trigger Re-ingestion
```bash
curl -X POST http://localhost:3000/api/knowledge-sources/source-id-here/reingest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## 🤖 AI Services API Examples

### Generate Article Content
```bash
curl -X POST http://localhost:3000/api/ai/generate/article \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a comprehensive guide about AI content generation benefits",
    "channel_id": "29b827ee-9423-4c8e-9773-078ba7cdbef6",
    "tone": "professional",
    "word_count": 1500
  }'
```

### Generate Article Title
```bash
curl -X POST http://localhost:3000/api/ai/generate/article-title \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "AI is transforming how businesses create and manage content at scale...",
    "keywords": ["AI", "content", "business", "transformation"]
  }'
```

### Generate SEO Metadata
```bash
curl -X POST http://localhost:3000/api/ai/generate/article-metadata \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI Content Generation Revolution",
    "content": "The future of content creation is being reshaped by artificial intelligence..."
  }'
```

### Generate Social Media Post Details
```bash
curl -X POST http://localhost:3000/api/ai/generate/post-details \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "article_id": "article-id-here",
    "platform": "instagram",
    "post_type": "image",
    "currentCaption": "Old caption to improve"
  }'
```

### Generate Image
```bash
curl -X POST http://localhost:3000/api/ai/generate/image \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Modern office with people working on AI content generation, bright lighting, professional style",
    "style": "photorealistic",
    "size": "1024x1024"
  }'
```

### Generate Bulk Content
```bash
curl -X POST http://localhost:3000/api/ai/generate/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "type": "article",
        "parameters": {
          "prompt": "Benefits of AI automation",
          "word_count": 800
        }
      },
      {
        "type": "post", 
        "parameters": {
          "platform": "twitter",
          "article_id": "article-id-here"
        }
      },
      {
        "type": "image",
        "parameters": {
          "prompt": "Abstract technology concept, blue and white colors",
          "size": "512x512"
        }
      }
    ]
  }'
```

### Search Knowledge Base
```bash
curl -X POST http://localhost:3000/api/ai/search/knowledge \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How does AI help with SEO optimization?",
    "limit": 10,
    "source_type": ["text", "website"]
  }'
```

---

## 🔧 Error Handling Examples

### Authentication Error (401)
```bash
curl -X GET http://localhost:3000/api/channels \
  -H "Authorization: Bearer invalid-token"
# Response: {"message": "Invalid or expired token"}
```

### Not Found Error (404)
```bash
curl -X GET http://localhost:3000/api/recipients/non-existent-id \
  -H "Authorization: Bearer $TOKEN"
# Response: {"message": "Recipient not found"}
```

### Validation Error (400)
```bash
curl -X POST http://localhost:3000/api/recipients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "channel_id": ""
  }'
# Response: {"message": "Validation failed"}
```

### Server Error (500)
```bash
curl -X POST http://localhost:3000/api/recipients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "channel_id": "non-existent-channel-id"
  }'
# Response: {"message": "Internal server error"}
```

---

## 📝 Tips for Using These Examples

### Environment Variables
```bash
# Set your token once
export TOKEN="your-jwt-token-here"

# Use in all commands
curl -H "Authorization: Bearer $TOKEN" ...

# For Windows Command Prompt
set TOKEN=your-jwt-token-here
curl -H "Authorization: Bearer %TOKEN%" ...
```

### JSON Formatting
- Use single quotes around JSON to prevent shell interpretation issues
- Escape quotes within JSON if needed: `\"`
- Validate JSON before sending

### Debugging
- Add `-v` flag for verbose curl output: `curl -v ...`
- Check response headers: `-i` flag: `curl -i ...`
- Save responses to file: `-o response.json`: `curl ... -o response.json`

### Testing Workflow
```bash
# 1. Authenticate and get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')

# 2. Extract token (using jq or manual)
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

# 3. Make API calls
curl -X GET http://localhost:3000/api/recipients \
  -H "Authorization: Bearer $TOKEN"
```

### Production Usage
- Use HTTPS in production: `https://your-domain.com/api/...`
- Add rate limiting headers if needed
- Include proper User-Agent strings
- Monitor response times and implement retry logic
- Use connection pooling for high-volume requests

---

## 📊 Complete API Endpoint Summary

| API | Endpoints | Description |
|------|-----------|-------------|
| Recipients | 5 endpoints | Email subscription management |
| Channels | 5 endpoints | Content platform management |
| Articles | 5 endpoints | Content creation and management |
| Posts | 5 endpoints | Social media content |
| Media Assets | 4 endpoints | File and image management |
| Knowledge Sources | 6 endpoints | Content ingestion and search |
| AI Services | 7 endpoints | Content generation and AI tools |
| **Total** | **37 endpoints** | **Complete content management system** |

All endpoints require JWT authentication and follow RESTful conventions with proper HTTP status codes and error handling.
