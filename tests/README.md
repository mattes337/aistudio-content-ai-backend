# Test Suite for AI Services Feature

This directory contains comprehensive tests for the newly implemented AI services feature.

## Test Coverage

### Unit Tests

#### 1. **GeminiService Tests** (`tests/services/GeminiService.test.ts`)
- **20 test cases** covering:
  - Content refinement with AI assistance
  - Title generation
  - Newsletter subject line generation
  - SEO metadata and excerpt generation
  - Preview text generation
  - Post details generation (content, alt text, tags)
  - Image generation and editing
  - Metadata inference for different content types (article, post, newsletter)
  - Error handling for all operations

#### 2. **OpenNotebookService Tests** (`tests/services/OpenNotebookService.test.ts`)
- **12 test cases** covering:
  - Knowledge base search (vector and text)
  - Question answering functionality
  - Chat session management (create, retrieve)
  - Chat execution
  - Context building for notebooks
  - Health check functionality
  - Error handling (API errors, network errors)

#### 3. **ClaudeAgentService Tests** (`tests/services/ClaudeAgentService.test.ts`)
- **12 test cases** covering:
  - Research queries with RAG support
  - Integration with OpenNotebook for knowledge retrieval
  - Tool usage tracking
  - Task execution (article, post, media drafts)
  - Conversation history handling
  - Error handling for agent and knowledge base failures
  - Health check functionality

### Integration Tests

#### 4. **AIController Tests** (`tests/controllers/AIController.test.ts`)
- **20+ test cases** covering:
  - All Gemini endpoint handlers
  - Claude Agent endpoint handlers
  - Open Notebook RAG endpoint handlers
  - Health check endpoint
  - Request validation
  - Error responses (400, 500)
  - Service integration

#### 5. **AI Routes Tests** (`tests/routes/ai.test.ts`)
- **25+ test cases** covering:
  - Full HTTP request/response cycle
  - All 18 new API endpoints
  - Request body validation
  - Response format verification
  - Authentication (mocked)
  - Error handling
  - Service interaction verification

## Test Infrastructure

### Configuration Files

1. **`jest.config.cjs`**
   - TypeScript support via ts-jest
   - Custom tsconfig for tests
   - Coverage reporting
   - 30-second timeout for async operations
   - Module name mapping for ESM compatibility

2. **`tsconfig.test.json`**
   - CommonJS module system for Jest compatibility
   - Relaxed type checking to avoid pre-existing code issues
   - ESM interop enabled
   - Separate from production tsconfig

3. **`tests/setup.ts`**
   - Environment variable configuration
   - Global mocks (console, DatabaseService)
   - Test timeout configuration

### Mock Strategy

- **Service-level mocks**: Each test file mocks its dependencies
- **Logger mock**: Prevents log noise during tests
- **Database mock**: Avoids database dependencies
- **Authentication mock**: Bypasses auth for route tests
- **API client mocks**: Simulates external API responses

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test tests/services/GeminiService.test.ts
npm test tests/services/OpenNotebookService.test.ts
npm test tests/services/ClaudeAgentService.test.ts
npm test tests/controllers/AIController.test.ts
npm test tests/routes/ai.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Test Quality Metrics

### Total Test Count
- **Unit Tests**: 44 tests
- **Integration Tests**: 45+ tests
- **Total**: **89+ comprehensive tests**

### Code Coverage Goals
- **Services**: Aiming for >80% coverage
  - GeminiService: All public methods tested
  - OpenNotebookService: All API interactions tested
  - ClaudeAgentService: All agent operations tested
- **Controllers**: >90% coverage
  - All request handlers tested
  - All error paths tested
- **Routes**: >90% coverage
  - All endpoints tested end-to-end

### Test Characteristics
- **Isolation**: Each test is independent and can run in any order
- **Mocking**: External dependencies are properly mocked
- **Assertions**: Multiple assertions per test to verify behavior
- **Error Cases**: Both success and failure scenarios covered
- **Edge Cases**: Boundary conditions and special cases tested

## Known Issues and Workarounds

### TypeScript/ESM Configuration
The project uses ESM with `verbatimModuleSyntax` which requires some configuration adjustments for Jest:
- Created separate `tsconfig.test.json` for tests
- Using CommonJS module system in tests
- Some TypeScript errors in pre-existing code (DatabaseService) are excluded

### Logger Mock
Due to module resolution, the logger mock needs to be in `src/utils/__mocks__/logger.ts` to be automatically picked up by Jest's manual mock system.

## Test Maintenance

### Adding New Tests
1. Follow the existing test structure
2. Use descriptive test names ("should ...")
3. Mock all external dependencies
4. Test both success and error cases
5. Keep tests focused and small

### Updating Tests
When modifying services:
1. Update corresponding test file
2. Ensure all new public methods have tests
3. Update mocks if interface changes
4. Verify tests still pass

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- No database dependencies
- No external service dependencies
- Fast execution (<30 seconds total)
- Deterministic results

## Future Improvements

1. **Add Performance Tests**: Measure response times for AI operations
2. **Add E2E Tests**: Test full workflows from UI to backend
3. **Increase Coverage**: Add tests for edge cases discovered in production
4. **Add Load Tests**: Verify behavior under concurrent requests
5. **Add Snapshot Tests**: Verify API response structures remain stable
