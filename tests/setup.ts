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
jest.mock('../src/services/database.service', () => {
  // Create mock data for readings
  const mockReadings = [
    {
      id: 'test-reading-1',
      date: new Date('2024-12-25'),
      readingType: 'first',
      scriptureReference: 'Isaiah 52:7-10',
      text: 'How beautiful upon the mountains...',
      isAlternative: false,
      seasonId: 'christmas',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'test-reading-2',
      date: new Date('2024-12-25'),
      readingType: 'psalm',
      scriptureReference: 'Psalm 98',
      text: 'O sing to the Lord a new song...',
      isAlternative: false,
      seasonId: 'christmas',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'test-reading-3',
      date: new Date('2024-12-25'),
      readingType: 'second',
      scriptureReference: 'Hebrews 1:1-4',
      text: 'Long ago God spoke to our ancestors...',
      isAlternative: false,
      seasonId: 'christmas',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'test-reading-4',
      date: new Date('2024-12-25'),
      readingType: 'gospel',
      scriptureReference: 'John 1:1-14',
      text: 'In the beginning was the Word...',
      isAlternative: false,
      seasonId: 'christmas',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const mockTraditions = [
    {
      id: 'rcl',
      name: 'Revised Common Lectionary',
      abbreviation: 'RCL',
      description: 'A three-year cycle of readings shared by many Protestant denominations',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'catholic',
      name: 'Roman Catholic Lectionary',
      abbreviation: 'Catholic',
      description: 'The official lectionary of the Roman Catholic Church',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'episcopal',
      name: 'Episcopal/Anglican Lectionary',
      abbreviation: 'Episcopal',
      description: 'Lectionary used by Episcopal and Anglican churches',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const createMockSeasons = (traditionId: string, year: number) => [
    {
      id: 'advent',
      name: 'Advent',
      color: 'purple',
      startDate: new Date(`${year}-12-01`),
      endDate: new Date(`${year}-12-24`),
      liturgicalYearId: `${traditionId}-${year}`,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'christmas',
      name: 'Christmas',
      color: 'white',
      startDate: new Date(`${year}-12-25`),
      endDate: new Date(`${year + 1}-01-05`),
      liturgicalYearId: `${traditionId}-${year}`,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: 'epiphany',
      name: 'Epiphany',
      color: 'green',
      startDate: new Date(`${year + 1}-01-06`),
      endDate: new Date(`${year + 1}-02-15`),
      liturgicalYearId: `${traditionId}-${year}`,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  const createMockLiturgicalYear = (traditionId: string, year: number) => ({
    id: `${traditionId}-${year}`,
    year: year,
    traditionId: traditionId,
    cycle: year % 3 === 0 ? 'A' : year % 3 === 1 ? 'B' : 'C',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });

  return {
    DatabaseService: {
      initialize: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getDataSource: jest.fn().mockReturnValue({
        isInitialized: true,
        query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        getRepository: jest.fn((entity) => {
          // Return different mock repos based on entity type
          if (entity && entity.name === 'Reading') {
            return {
              find: jest.fn().mockImplementation((options) => {
                // Return readings filtered by date if specified
                if (options?.where?.date) {
                  return Promise.resolve(mockReadings);
                }
                return Promise.resolve(mockReadings);
              }),
              findOne: jest.fn().mockResolvedValue(null),
              count: jest.fn().mockResolvedValue(4),
            };
          } else if (entity && entity.name === 'Tradition') {
            return {
              find: jest.fn().mockResolvedValue(mockTraditions),
              findOne: jest.fn().mockImplementation((options) => {
                // Handle lookup by abbreviation (case-insensitive)
                if (options?.where?.abbreviation) {
                  const abbr = options.where.abbreviation.toUpperCase();
                  const found = mockTraditions.find(t => t.abbreviation.toUpperCase() === abbr);
                  return Promise.resolve(found || null);
                }
                // Handle lookup by id
                if (options?.where?.id) {
                  const found = mockTraditions.find(t => t.id === options.where.id);
                  return Promise.resolve(found || null);
                }
                // Handle lookup by name
                if (options?.where?.name) {
                  const found = mockTraditions.find(t => t.name === options.where.name);
                  return Promise.resolve(found || null);
                }
                // Handle array of where conditions (OR query)
                if (Array.isArray(options?.where)) {
                  for (const condition of options.where) {
                    if (condition.abbreviation) {
                      const abbr = condition.abbreviation.toUpperCase();
                      const found = mockTraditions.find(t => t.abbreviation.toUpperCase() === abbr);
                      if (found) {
                        return Promise.resolve(found);
                      }
                    }
                    if (condition.id) {
                      const found = mockTraditions.find(t => t.id === condition.id);
                      if (found) {
                        return Promise.resolve(found);
                      }
                    }
                  }
                }
                return Promise.resolve(null);
              }),
              count: jest.fn().mockResolvedValue(mockTraditions.length),
            };
          } else if (entity && entity.name === 'Season') {
            return {
              find: jest.fn().mockImplementation((options) => {
                // Get liturgicalYearId from options
                const yearId = options?.where?.liturgicalYearId;
                if (yearId) {
                  // Parse traditionId and year from yearId (format: "traditionId-year")
                  const parts = yearId.split('-');
                  const year = parseInt(parts[parts.length - 1]);
                  const traditionId = parts.slice(0, -1).join('-');
                  return Promise.resolve(createMockSeasons(traditionId, year));
                }
                return Promise.resolve([]);
              }),
              findOne: jest.fn().mockResolvedValue(null),
              count: jest.fn().mockResolvedValue(3),
            };
          } else if (entity && entity.name === 'LiturgicalYear') {
            return {
              find: jest.fn().mockResolvedValue([]),
              findOne: jest.fn().mockImplementation((options) => {
                const traditionId = options?.where?.traditionId;
                const year = options?.where?.year;
                if (traditionId && year) {
                  return Promise.resolve(createMockLiturgicalYear(traditionId, year));
                }
                return Promise.resolve(null);
              }),
              count: jest.fn().mockResolvedValue(0),
            };
          }
          // Default mock repository for other entities
          return {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            count: jest.fn().mockResolvedValue(0),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
            create: jest.fn().mockImplementation((data) => data),
          };
        }),
      }),
      isHealthy: jest.fn().mockResolvedValue(true),
    },
  };
});

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