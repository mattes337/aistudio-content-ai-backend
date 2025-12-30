# AI Research Inline Reference Format

This document describes the inline reference format used by AI Research endpoints to cite knowledge base sources within response text.

## Overview

AI Research responses embed structured references directly in the response text using a special format. This allows the UI to:
- Parse and identify source citations
- Build clickable links to original sources
- Navigate to specific locations within sources (pages, timestamps, chapters, etc.)
- Display rich source information on hover or click

## Reference Format

### Syntax

```
[[ref:id={SOURCE_ID}|name={SOURCE_NAME}|loc={LOCATION_TYPE}:{LOCATION_VALUE}]]
```

### Components

| Component | Required | Description |
|-----------|----------|-------------|
| `id` | Yes | Unique identifier of the knowledge base source |
| `name` | Yes | Human-readable name of the source |
| `loc` | No | Location within the source (type:value format) |

### Location Types

| Type | Description | Example Value | Use Case |
|------|-------------|---------------|----------|
| `line` | Line number in text | `42` | Text documents, code |
| `page` | Page number | `15` | PDF documents |
| `chapter` | Chapter identifier | `3` or `Introduction` | Books, long documents |
| `section` | Section name | `Authentication` | Documentation, articles |
| `timecode` | Timestamp | `15:30` or `01:23:45` | Audio, video content |
| `anchor` | URL fragment | `getting-started` | Web pages |
| `index` | Chunk/paragraph index | `5` | Indexed content |

## Examples

### Basic Reference (no location)
```
[[ref:id=source:abc123|name=User Manual]]
```

### PDF with Page Number
```
[[ref:id=source:doc456|name=Technical Specification|loc=page:42]]
```

### Video with Timestamp
```
[[ref:id=source:vid789|name=Training Video|loc=timecode:15:30]]
```

### Document with Chapter
```
[[ref:id=source:book001|name=Marketing Guide|loc=chapter:3]]
```

### Documentation with Section
```
[[ref:id=source:api002|name=API Reference|loc=section:Authentication]]
```

## Parsing

### JavaScript/TypeScript Regex

```typescript
const REFERENCE_PATTERN = /\[\[ref:id=([^|]+)\|name=([^|\]]+)(?:\|loc=([^:]+):([^\]]+))?\]\]/g;

function parseReferences(text: string) {
  const references = [];
  let match;

  while ((match = REFERENCE_PATTERN.exec(text)) !== null) {
    references.push({
      fullMatch: match[0],
      id: match[1],
      name: match[2],
      location: match[3] && match[4] ? {
        type: match[3],
        value: match[4]
      } : null
    });
  }

  return references;
}
```

### Example Output

```javascript
parseReferences("Check the [[ref:id=source:abc|name=User Guide|loc=page:15]] for details.")
// Returns:
[{
  fullMatch: "[[ref:id=source:abc|name=User Guide|loc=page:15]]",
  id: "source:abc",
  name: "User Guide",
  location: { type: "page", value: "15" }
}]
```

## UI Rendering

### Replacement Strategy

Replace inline references with interactive elements:

```typescript
function renderReferences(text: string): string {
  return text.replace(
    REFERENCE_PATTERN,
    (match, id, name, locType, locValue) => {
      const location = locType && locValue
        ? ` (${formatLocation(locType, locValue)})`
        : '';
      return `<a href="/sources/${encodeURIComponent(id)}${locType ? `#${locType}=${locValue}` : ''}"
                class="source-reference"
                data-source-id="${id}"
                title="View source: ${name}${location}">[${name}${location}]</a>`;
    }
  );
}

function formatLocation(type: string, value: string): string {
  switch (type) {
    case 'page': return `Page ${value}`;
    case 'line': return `Line ${value}`;
    case 'chapter': return `Chapter ${value}`;
    case 'section': return value;
    case 'timecode': return value;
    case 'index': return `#${value}`;
    default: return `${type}: ${value}`;
  }
}
```

### React Component Example

```tsx
interface InlineReferenceProps {
  id: string;
  name: string;
  location?: { type: string; value: string };
}

function InlineReference({ id, name, location }: InlineReferenceProps) {
  const locationLabel = location
    ? formatLocation(location.type, location.value)
    : null;

  const handleClick = () => {
    // Navigate to source viewer with location
    navigateToSource(id, location);
  };

  return (
    <button
      className="inline-reference"
      onClick={handleClick}
      title={`View: ${name}`}
    >
      [{name}{locationLabel && ` (${locationLabel})`}]
    </button>
  );
}
```

## Response Data Structure

### SourceReference Interface

```typescript
interface SourceLocation {
  type: 'line' | 'page' | 'paragraph' | 'chapter' | 'section' | 'timecode' | 'anchor' | 'index';
  value: string;
  label?: string;  // Human-readable label
}

interface SourceReference {
  id: string;           // Unique source identifier
  name: string;         // Source name
  excerpt: string;      // Text excerpt (up to 200 chars)
  score: number;        // Relevance score (0-1)
  usedInResponse?: boolean;  // Whether source was directly cited
  location?: SourceLocation; // Location within source
  sourceType?: string;  // Source type (pdf, video, text, etc.)
}
```

### API Response

The AI Research endpoints return both:
1. **Inline references** in the `response` text field
2. **Source metadata** in the `sources` array

```json
{
  "response": "According to [[ref:id=source:abc|name=User Guide|loc=page:15]], the feature works...",
  "sources": [
    {
      "id": "source:abc",
      "name": "User Guide",
      "excerpt": "The feature allows users to...",
      "score": 0.95,
      "location": { "type": "page", "value": "15", "label": "Page 15" },
      "sourceType": "pdf"
    }
  ]
}
```

## Building Source Links

### URL Patterns

Construct source viewer URLs based on source type and location:

| Source Type | URL Pattern | Example |
|-------------|-------------|---------|
| PDF | `/viewer/pdf/{id}#page={value}` | `/viewer/pdf/abc#page=15` |
| Video | `/viewer/video/{id}?t={seconds}` | `/viewer/video/xyz?t=930` |
| Audio | `/viewer/audio/{id}?t={seconds}` | `/viewer/audio/def?t=150` |
| Text | `/viewer/text/{id}#line-{value}` | `/viewer/text/ghi#line-42` |
| Website | `/viewer/web/{id}#{anchor}` | `/viewer/web/jkl#section` |

### Timecode Conversion

For audio/video sources, convert timecode to seconds:

```typescript
function timecodeToSeconds(timecode: string): number {
  const parts = timecode.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parts[0] * 60 + parts[1];
}

// "15:30" -> 930 seconds
// "01:23:45" -> 5025 seconds
```

## Character Escaping

The reference format escapes special characters:
- `|` (pipe) in names is replaced with space
- `]` (bracket) in names and values is replaced with space

When parsing, these characters should not appear in the extracted values.

## Best Practices

1. **Always check for references** before rendering AI responses
2. **Preserve original text** by replacing only the reference pattern
3. **Handle missing sources** gracefully (source may have been deleted)
4. **Cache source metadata** from the `sources` array for quick lookup
5. **Provide fallback** for unsupported location types
6. **Use the sources array** to get full metadata (excerpt, score, sourceType)

## Exported Utilities

The backend exports utilities for working with references:

```typescript
import { REFERENCE_FORMAT, SourceLocation } from '@/services/ai-service/types';

// Build a reference string
const ref = REFERENCE_FORMAT.build('source:abc', 'User Guide', {
  type: 'page',
  value: '15'
});
// Returns: "[[ref:id=source:abc|name=User Guide|loc=page:15]]"

// Parse a reference string
const parsed = REFERENCE_FORMAT.parse('[[ref:id=source:abc|name=User Guide|loc=page:15]]');
// Returns: { id: 'source:abc', name: 'User Guide', location: { type: 'page', value: '15' } }

// Match all references in text (use with .exec() in a loop)
const matches = text.matchAll(REFERENCE_FORMAT.pattern);
```
