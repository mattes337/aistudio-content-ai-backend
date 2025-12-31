# Open Notebook: Gemini Reasoning Model Fix

## Problem Statement

Open Notebook's `/api/search/ask/simple` endpoint fails when using Gemini models with thinking/reasoning capabilities. The LangChain `PydanticOutputParser` receives Gemini's content block format instead of plain JSON, causing `OUTPUT_PARSING_FAILURE`.

### Error Message
```
Ask operation failed: Invalid json output: [{'type': 'text', 'text': '{...json...}', 'extras': {'signature': '...'}}]
For troubleshooting, visit: https://docs.langchain.com/oss/python/langchain/errors/OUTPUT_PARSING_FAILURE
```

### Related Issue
- [GitHub Issue #68](https://github.com/lfnovo/open-notebook/issues/68) - Similar problem with DeepSeek-R1 `<think>` tags

## Root Cause Analysis

### Current Flow
1. User calls `/api/search/ask/simple` endpoint
2. `ask.py` invokes Gemini model via LangChain
3. Gemini returns response in content block format:
   ```python
   [{'type': 'text', 'text': '{"reasoning": "...", "searches": [...]}', 'extras': {'signature': '...'}}]
   ```
4. `clean_thinking_content()` only handles `<think>` tags, not Gemini format
5. `PydanticOutputParser` receives the raw list/dict string instead of JSON
6. Parser fails with `OUTPUT_PARSING_FAILURE`

### Affected Models
- Gemini 2.5 Flash (with thinking)
- Gemini 2.5 Pro (thinking always on)
- Gemini 3 Flash (thinking can't be fully disabled)
- Gemini 3 Pro (thinking always on)

## Solution Design

### Approach
Extend `clean_thinking_content()` to detect and extract content from Gemini's response format before passing to the JSON parser.

### Response Formats to Handle

1. **Plain JSON** (current, working):
   ```json
   {"reasoning": "...", "searches": [...]}
   ```

2. **DeepSeek `<think>` tags** (current, partially working):
   ```
   <think>reasoning here</think>{"searches": [...]}
   ```

3. **Gemini content blocks** (NEW, not working):
   ```python
   [{'type': 'text', 'text': '{"reasoning": "...", "searches": [...]}', 'extras': {'signature': '...'}}]
   ```

4. **Gemini with thinking content** (NEW, not working):
   ```python
   [
     {'type': 'thinking', 'text': '...thinking...'},
     {'type': 'text', 'text': '{"searches": [...]}', 'extras': {...}}
   ]
   ```

## Implementation Plan

### Phase 1: Update text_utils.py

**File:** `open_notebook/utils/text_utils.py`

#### Task 1.1: Add Gemini format detection function

```python
def extract_gemini_content(content: str) -> str:
    """
    Extract text content from Gemini's content block format.

    Gemini returns responses as:
    [{'type': 'text', 'text': '...actual content...', 'extras': {...}}]

    This function extracts the 'text' field from the first text-type block.

    Args:
        content: Raw response string that may be in Gemini format

    Returns:
        Extracted text content, or original content if not Gemini format
    """
    if not content:
        return content

    content = content.strip()

    # Check if it looks like Gemini's list format
    if not (content.startswith("[{") or content.startswith("['")):
        return content

    try:
        import ast
        import json

        # Try to parse as Python literal (handles single quotes)
        try:
            blocks = ast.literal_eval(content)
        except (ValueError, SyntaxError):
            # Try JSON parsing as fallback
            blocks = json.loads(content)

        if not isinstance(blocks, list) or len(blocks) == 0:
            return content

        # Find the first 'text' type block (skip 'thinking' blocks)
        for block in blocks:
            if isinstance(block, dict):
                block_type = block.get('type', 'text')
                if block_type == 'text' and 'text' in block:
                    return block['text']

        # Fallback: return text from first block if no type specified
        if isinstance(blocks[0], dict) and 'text' in blocks[0]:
            return blocks[0]['text']

    except Exception:
        # If parsing fails, return original content
        pass

    return content
```

#### Task 1.2: Update clean_thinking_content function

```python
def clean_thinking_content(content: str) -> str:
    """
    Remove thinking content from AI responses.

    Handles multiple formats:
    - Gemini content blocks: [{'type': 'text', 'text': '...'}]
    - DeepSeek <think> tags: <think>...</think>content
    - Plain content (passthrough)
    """
    if not content:
        return content

    # Step 1: Handle Gemini content block format
    content = extract_gemini_content(content)

    # Step 2: Handle <think> tags (existing logic)
    return parse_thinking_content(content)[1]
```

#### Task 1.3: Add unit tests

**File:** `tests/utils/test_text_utils.py` (create if doesn't exist)

```python
import pytest
from open_notebook.utils.text_utils import extract_gemini_content, clean_thinking_content

class TestExtractGeminiContent:
    def test_plain_json_passthrough(self):
        content = '{"reasoning": "test", "searches": []}'
        assert extract_gemini_content(content) == content

    def test_gemini_single_block(self):
        content = "[{'type': 'text', 'text': '{\"searches\": []}', 'extras': {'signature': 'abc'}}]"
        result = extract_gemini_content(content)
        assert result == '{"searches": []}'

    def test_gemini_with_thinking_block(self):
        content = """[
            {'type': 'thinking', 'text': 'Let me think...'},
            {'type': 'text', 'text': '{"answer": "42"}', 'extras': {}}
        ]"""
        result = extract_gemini_content(content)
        assert result == '{"answer": "42"}'

    def test_gemini_json_format(self):
        content = '[{"type": "text", "text": "hello", "extras": {}}]'
        result = extract_gemini_content(content)
        assert result == "hello"

    def test_invalid_format_passthrough(self):
        content = "just plain text"
        assert extract_gemini_content(content) == content

    def test_empty_list(self):
        content = "[]"
        assert extract_gemini_content(content) == "[]"

class TestCleanThinkingContent:
    def test_gemini_format(self):
        content = "[{'type': 'text', 'text': '{\"data\": 1}'}]"
        result = clean_thinking_content(content)
        assert result == '{"data": 1}'

    def test_think_tags(self):
        content = "<think>reasoning</think>{\"result\": true}"
        result = clean_thinking_content(content)
        assert result == '{"result": true}'

    def test_combined_formats(self):
        # Gemini block containing think tags
        content = "[{'type': 'text', 'text': '<think>thought</think>{\"answer\": 1}'}]"
        result = clean_thinking_content(content)
        assert result == '{"answer": 1}'
```

### Phase 2: Update ask.py (if needed)

**File:** `open_notebook/graphs/ask.py`

The existing code already calls `clean_thinking_content()`, so after Phase 1, it should work automatically. However, verify the integration:

#### Task 2.1: Verify content extraction points

Check lines ~59 and ~105 where content is extracted:
```python
message_content = ai_message.content if isinstance(ai_message.content, str) else str(ai_message.content)
cleaned_content = clean_thinking_content(message_content)
```

If `ai_message.content` is already parsed as a Python list (not string), we need to handle it:

```python
# Handle both string and list formats from LangChain
if isinstance(ai_message.content, list):
    # LangChain already parsed it - extract text from first text block
    for block in ai_message.content:
        if isinstance(block, dict) and block.get('type') == 'text':
            message_content = block.get('text', '')
            break
    else:
        message_content = str(ai_message.content)
else:
    message_content = ai_message.content if isinstance(ai_message.content, str) else str(ai_message.content)

cleaned_content = clean_thinking_content(message_content)
```

### Phase 3: Testing

#### Task 3.1: Manual testing checklist

- [ ] Test with Gemini 2.0 Flash (no thinking) - should work
- [ ] Test with Gemini 2.5 Flash (thinking_budget: 0) - should work
- [ ] Test with Gemini 2.5 Flash (default thinking) - should now work
- [ ] Test with Gemini 3 Flash (minimal thinking) - should now work
- [ ] Test with DeepSeek-R1 (think tags) - should still work
- [ ] Test with OpenAI GPT-4 - should still work (regression)

#### Task 3.2: API endpoint testing

```bash
# Test ask endpoint
curl -X POST http://localhost:5055/api/search/ask/simple \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is artificial intelligence?",
    "strategy_model": "model:your-gemini-model-id",
    "answer_model": "model:your-gemini-model-id",
    "final_answer_model": "model:your-gemini-model-id"
  }'
```

### Phase 4: Documentation & PR

#### Task 4.1: Update CHANGELOG

```markdown
## [Unreleased]
### Fixed
- Fixed OUTPUT_PARSING_FAILURE when using Gemini models with thinking/reasoning capabilities
- Added support for Gemini content block response format in ask endpoint
```

#### Task 4.2: Create Pull Request

**Title:** `fix: Handle Gemini thinking model response format in ask endpoint`

**Description:**
```markdown
## Summary
Fixes #68 for Gemini models by extracting text content from Gemini's content block format before JSON parsing.

## Problem
Gemini models with thinking capabilities return responses in content block format:
```python
[{'type': 'text', 'text': '{...json...}', 'extras': {'signature': '...'}}]
```

The existing `clean_thinking_content()` function only handles `<think>` tags, not this format.

## Solution
- Added `extract_gemini_content()` function to handle Gemini's response format
- Updated `clean_thinking_content()` to call it before processing `<think>` tags
- Added unit tests for all supported formats

## Testing
- [x] Tested with Gemini 2.5 Flash
- [x] Tested with Gemini 3 Flash
- [x] Tested with DeepSeek-R1 (regression test)
- [x] Tested with plain JSON responses

## Related Issues
Closes #68
```

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `open_notebook/utils/text_utils.py` | Modify | Add `extract_gemini_content()`, update `clean_thinking_content()` |
| `open_notebook/graphs/ask.py` | Modify (maybe) | Handle list-type content from LangChain |
| `tests/utils/test_text_utils.py` | Create/Modify | Add unit tests |
| `CHANGELOG.md` | Modify | Document the fix |

## Estimated Effort

| Phase | Time | Complexity |
|-------|------|------------|
| Phase 1: text_utils.py | 1-2 hours | Easy |
| Phase 2: ask.py | 0.5-1 hour | Easy |
| Phase 3: Testing | 1-2 hours | Medium |
| Phase 4: PR | 0.5 hour | Easy |
| **Total** | **3-5 hours** | **Easy-Medium** |

## Risks & Considerations

1. **LangChain version compatibility** - Different LangChain versions may handle Gemini responses differently
2. **Other model formats** - Future models may have different response formats
3. **Performance** - Adding parsing step has minimal overhead but should be measured
4. **Edge cases** - Malformed responses, empty blocks, nested structures

## Alternative Approaches Considered

1. **Model-level fix** - Configure models to not use thinking (not always possible)
2. **LangChain OutputFixingParser** - More complex, requires additional LLM call
3. **Custom LangChain output parser** - More invasive change to codebase
4. **Esperanto-level fix** - Handle in the model provider abstraction layer

The chosen approach (fix in `clean_thinking_content`) is the least invasive and handles the issue at the right abstraction level.
