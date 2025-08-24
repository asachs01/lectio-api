import { DatabaseService } from '../../../src/services/database.service';
import { logger } from '../../../src/utils/logger';
import { getDatabaseConfig } from '../../../src/config/database.config';

// Mock all the entity models to avoid decorator issues
jest.mock('../../../src/models/tradition.entity');
jest.mock('../../../src/models/liturgical-year.entity');
jest.mock('../../../src/models/season.entity');
jest.mock('../../../src/models/reading.entity');
jest.mock('../../../src/models/special-day.entity');
jest.mock('../../../src/models/scripture.entity');
jest.mock('../../../src/models/index.ts', () => ({
  entities: [] as any[],
  Tradition: class {},
  LiturgicalYear: class {},
  Season: class {},
  SpecialDay: class {},
  Scripture: class {},
  Reading: class {},
}));

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/config/database.config');

// Mock TypeORM DataSource
const mockDataSourceInstance = {
  initialize: jest.fn(),
  destroy: jest.fn(),
  query: jest.fn(),
  isInitialized: false,
  options: { database: 'test-db' },
  entityMetadatas: [
    { name: 'TestEntity', tableName: 'test_entities' },
    { name: 'AnotherEntity', tableName: 'another_entities' },
  ],
};

jest.mock('typeorm', () => ({
  DataSource: jest.fn().mockImplementation(() => mockDataSourceInstance),
}));

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockGetDatabaseConfig = getDatabaseConfig as jest.MockedFunction<typeof getDatabaseConfig>;

describe.skip('DatabaseService', () => {
  beforeEach(() => {
    // Reset mock functions
    jest.clearAllMocks();
    
    // Reset DataSource instance state
    mockDataSourceInstance.isInitialized = false;
    mockDataSourceInstance.initialize.mockReset();
    mockDataSourceInstance.destroy.mockReset();
    mockDataSourceInstance.query.mockReset();
    
    // Setup default mocks
    mockGetDatabaseConfig.mockReturnValue({} as any);
    mockDataSourceInstance.initialize.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Reset the static state
    (DatabaseService as any).dataSource = undefined;
    mockDataSourceInstance.isInitialized = false;
  });

  describe('initialize', () => {
    it('should initialize database connection successfully', async () => {
      mockDataSourceInstance.initialize.mockImplementation(async () => {
        mockDataSourceInstance.isInitialized = true;
        return undefined;
      });
      
      await DatabaseService.initialize();
      
      expect(mockDataSourceInstance.initialize).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Database connection initialized successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('Connected to database: test-db');
    });

    it('should log entity information in development mode', async () => {
      process.env.NODE_ENV = 'development';
      mockDataSourceInstance.initialize.mockImplementation(async () => {
        mockDataSourceInstance.isInitialized = true;
        return undefined;
      });
      
      await DatabaseService.initialize();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Loaded 2 entities:');
      expect(mockLogger.info).toHaveBeenCalledWith('  - TestEntity (table: test_entities)');
      expect(mockLogger.info).toHaveBeenCalledWith('  - AnotherEntity (table: another_entities)');
      
      delete process.env.NODE_ENV;
    });

    it('should not log entity information in production mode', async () => {
      process.env.NODE_ENV = 'production';
      mockDataSourceInstance.initialize.mockImplementation(async () => {
        mockDataSourceInstance.isInitialized = true;
        return undefined;
      });
      
      await DatabaseService.initialize();
      
      expect(mockLogger.info).not.toHaveBeenCalledWith('Loaded 2 entities:');
      
      delete process.env.NODE_ENV;
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Connection failed');
      mockDataSourceInstance.initialize.mockRejectedValue(error);
      
      await expect(DatabaseService.initialize()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize database connection:', error);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from database when connection exists', async () => {
      // Initialize first
      mockDataSourceInstance.initialize.mockImplementation(async () => {
        mockDataSourceInstance.isInitialized = true;
        return undefined;
      });
      await DatabaseService.initialize();
      
      mockDataSourceInstance.destroy.mockResolvedValue(undefined);
      
      await DatabaseService.disconnect();
      
      expect(mockDataSourceInstance.destroy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Database connection closed');
    });

    it('should handle disconnect when no connection exists', async () => {
      await DatabaseService.disconnect();
      
      expect(mockDataSourceInstance.destroy).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalledWith('Database connection closed');
    });

    it('should handle disconnect when connection is not initialized', async () => {
      // Set up a non-initialized datasource
      (DatabaseService as any).dataSource = mockDataSourceInstance;
      mockDataSourceInstance.isInitialized = false;
      
      await DatabaseService.disconnect();
      
      expect(mockDataSourceInstance.destroy).not.toHaveBeenCalled();
    });
  });

  describe('getDataSource', () => {
    it('should return datasource when initialized', async () => {
      mockDataSourceInstance.initialize.mockImplementation(async () => {
        mockDataSourceInstance.isInitialized = true;
        return undefined;
      });
      await DatabaseService.initialize();
      
      const result = DatabaseService.getDataSource();
      
      expect(result).toBe(mockDataSourceInstance);
    });

    it('should throw error when datasource not initialized', () => {
      expect(() => DatabaseService.getDataSource()).toThrow('Database connection not initialized');
    });

    it('should throw error when datasource is not initialized flag is false', () => {
      (DatabaseService as any).dataSource = mockDataSourceInstance;
      mockDataSourceInstance.isInitialized = false;
      
      expect(() => DatabaseService.getDataSource()).toThrow('Database connection not initialized');
    });
  });

  describe('isHealthy', () => {
    it('should return true when database is healthy', async () => {
      mockDataSourceInstance.initialize.mockImplementation(async () => {
        mockDataSourceInstance.isInitialized = true;
        return undefined;
      });
      await DatabaseService.initialize();
      
      mockDataSourceInstance.query.mockResolvedValue([{ '?column?': 1 }]);
      
      const result = await DatabaseService.isHealthy();
      
      expect(result).toBe(true);
      expect(mockDataSourceInstance.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return false when datasource not initialized', async () => {
      const result = await DatabaseService.isHealthy();
      
      expect(result).toBe(false);
    });

    it('should return false when datasource isInitialized is false', async () => {
      (DatabaseService as any).dataSource = mockDataSourceInstance;
      mockDataSourceInstance.isInitialized = false;
      
      const result = await DatabaseService.isHealthy();
      
      expect(result).toBe(false);
    });

    it('should return false and log error when query fails', async () => {
      mockDataSourceInstance.initialize.mockImplementation(async () => {
        mockDataSourceInstance.isInitialized = true;
        return undefined;
      });
      await DatabaseService.initialize();
      
      const error = new Error('Query failed');
      mockDataSourceInstance.query.mockRejectedValue(error);
      
      const result = await DatabaseService.isHealthy();
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Database health check failed:', error);
    });
  });
});