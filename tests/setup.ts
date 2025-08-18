import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Global test configuration
beforeAll(async () => {
  // Setup test database connection if needed
  // await DatabaseService.initialize();
});

afterAll(async () => {
  // Close test database connection if needed
  // await DatabaseService.disconnect();
});

// Mock external services for testing
jest.mock('../src/services/database.service', () => ({
  DatabaseService: {
    initialize: jest.fn(),
    disconnect: jest.fn(),
    getDataSource: jest.fn(),
    isHealthy: jest.fn().mockResolvedValue(true),
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
};