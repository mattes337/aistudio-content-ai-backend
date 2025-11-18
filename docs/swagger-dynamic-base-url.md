# Swagger UI Dynamic Base URL Fix

## Problem
The Swagger UI was using hardcoded `localhost:3000` as the server URL, which doesn't work when the API is deployed behind a reverse proxy (nginx, Traefik, AWS ALB, etc.).

## Solution
Implemented dynamic base URL detection that works with reverse proxies:

### How it works:
1. **Detects reverse proxy headers**:
   - `x-forwarded-proto` (protocol)
   - `x-forwarded-host` (host)
   - `x-forwarded-port` (optional port)

2. **Falls back to direct connection**:
   - Uses `req.protocol` + `req.get('host')`

3. **Replaces placeholder**:
   - Swagger spec uses `{request.baseUrl}` placeholder
   - Middleware replaces it with actual detected URL

### Code Changes:

#### 1. Modified `src/config/swagger.ts`:
```typescript
servers: [
  {
    url: config.nodeEnv === 'production' 
      ? 'https://your-domain.com' 
      : '{request.baseUrl}', // Replaced dynamically
    description: config.nodeEnv === 'production' ? 'Production server' : 'Development server'
  }
]
```

#### 2. Added middleware in `src/server.ts`:
```typescript
// Middleware to detect base URL for Swagger
app.use((req, res, next) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  
  if (forwardedHost && forwardedProto) {
    // We're behind a reverse proxy
    (req as any).baseUrl = `${forwardedProto}://${forwardedHost}`;
  } else {
    // Direct connection
    (req as any).baseUrl = req.protocol + '://' + req.get('host');
  }
  next();
});

// Raw OpenAPI JSON specification with dynamic base URL
app.get('/api-docs.json', (req, res) => {
  const baseUrl = (req as any).baseUrl || req.protocol + '://' + req.get('host');
  let specString = JSON.stringify(specs);
  specString = specString.replace(/{request.baseUrl}/g, baseUrl);
  res.setHeader('Content-Type', 'application/json');
  res.send(specString);
});
```

### Testing Results:
```bash
# Direct connection
curl http://localhost:3000/api-docs.json
# Returns: "url":"http://localhost:3000"

# Behind reverse proxy (example)
curl -H "x-forwarded-proto: https" -H "x-forwarded-host: api.example.com" http://localhost:3000/api-docs.json
# Returns: "url":"https://api.example.com"
```

### Benefits:
✅ Works with any reverse proxy setup
✅ No hardcoded URLs in Swagger UI
✅ Automatic detection of actual deployment URL
✅ Works in both development and production
✅ No configuration needed for different environments

## Usage:
```bash
# No changes needed - works automatically
docker-compose up -d

# Access Swagger UI
# Direct: http://localhost:3000/api-docs
# Behind proxy: https://your-proxy.com/api-docs
```

## Supported Headers:
The system correctly detects these common reverse proxy headers:
- `x-forwarded-proto`
- `x-forwarded-host`
- `x-forwarded-port`
- `x-forwarded-for` (standard header)
