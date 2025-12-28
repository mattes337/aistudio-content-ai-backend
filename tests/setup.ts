// Test setup file
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPEN_NOTEBOOK_URL = 'http://localhost:5055';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock DatabaseService globally to avoid type errors
jest.mock('../src/services/DatabaseService', () => ({
  DatabaseService: {
    getDatabaseSource: jest.fn(),
    createDatabaseSource: jest.fn(),
    updateDatabaseSource: jest.fn(),
    deleteDatabaseSource: jest.fn(),
    getDatabaseSources: jest.fn(),
    getMediaAsset: jest.fn(),
    createMediaAsset: jest.fn(),
    updateMediaAsset: jest.fn(),
    deleteMediaAsset: jest.fn(),
    getMediaAssets: jest.fn(),
  },
}));
