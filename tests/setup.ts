import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.SWAGGER_ENABLED = 'false';

// Global test configuration
beforeAll(async () => {
  // Setup test database connection if needed
  // await DatabaseService.initialize();
});

afterAll(async () => {
  // Close test database connection if needed
  // await DatabaseService.disconnect();
  // Restore all mocks
  jest.restoreAllMocks();
});

// Mock external services for testing
jest.mock('../src/services/database.service', () => ({
  DatabaseService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getDataSource: jest.fn().mockReturnValue({
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    }),
    isHealthy: jest.fn().mockResolvedValue(true),
  },
}));

// Mock logger to avoid console output during tests
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global test utilities
(global as any).testUtils = {
  mockDate: (dateString: string) => {
    const mockDate = new Date(dateString);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    return mockDate;
  },
  
  restoreDate: () => {
    jest.restoreAllMocks();
  },

  createMockRequest: (overrides: any = {}) => ({
    params: {},
    query: {},
    body: {},
    headers: {},
    get: jest.fn(),
    ...overrides,
  }),

  createMockResponse: () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    return {
      json: mockJson,
      status: mockStatus,
      send: jest.fn(),
      end: jest.fn(),
      get: jest.fn(),
      on: jest.fn(),
    };
  },
};