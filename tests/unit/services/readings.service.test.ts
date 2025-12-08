import { ReadingsService } from '../../../src/services/readings.service';
import { DailyReading, ReadingType } from '../../../src/types/lectionary.types';

// Mock traditions
const mockTraditions = [
  { id: 'rcl-uuid', abbreviation: 'RCL', name: 'Revised Common Lectionary' },
  { id: 'catholic-uuid', abbreviation: 'CATHOLIC', name: 'Roman Catholic Lectionary' },
  { id: 'episcopal-uuid', abbreviation: 'EPISCOPAL', name: 'Episcopal/Anglican Lectionary' },
];

// Mock data
const mockReadings = [
  {
    id: 'test-reading-1',
    date: new Date('2023-12-03'),
    readingType: 'first',
    scriptureReference: 'Isaiah 2:1-5',
    text: 'The word that Isaiah son of Amoz saw...',
    isAlternative: false,
    seasonId: 'advent',
    traditionId: 'rcl-uuid',
    tradition: { abbreviation: 'RCL' },
    createdAt: new Date('2023-12-03'),
    updatedAt: new Date('2023-12-03'),
  },
  {
    id: 'test-reading-2',
    date: new Date('2023-12-03'),
    readingType: 'psalm',
    scriptureReference: 'Psalm 122',
    text: 'I was glad when they said to me...',
    isAlternative: false,
    seasonId: 'advent',
    traditionId: 'rcl-uuid',
    tradition: { abbreviation: 'RCL' },
    createdAt: new Date('2023-12-03'),
    updatedAt: new Date('2023-12-03'),
  },
  {
    id: 'test-reading-3',
    date: new Date('2023-12-03'),
    readingType: 'second',
    scriptureReference: 'Romans 13:11-14',
    text: 'You know what time it is...',
    isAlternative: false,
    seasonId: 'advent',
    traditionId: 'rcl-uuid',
    tradition: { abbreviation: 'RCL' },
    createdAt: new Date('2023-12-03'),
    updatedAt: new Date('2023-12-03'),
  },
  {
    id: 'test-reading-4',
    date: new Date('2023-12-03'),
    readingType: 'gospel',
    scriptureReference: 'Matthew 24:36-44',
    text: 'But about that day and hour no one knows...',
    isAlternative: false,
    seasonId: 'advent',
    traditionId: 'rcl-uuid',
    tradition: { abbreviation: 'RCL' },
    createdAt: new Date('2023-12-03'),
    updatedAt: new Date('2023-12-03'),
  },
];

// Create mock functions and setup DatabaseService mock
jest.mock('../../../src/services/database.service', () => {
  // Have to define mock functions inside the mock factory
  const mockFind = jest.fn();
  const mockCount = jest.fn();
  const mockFindOne = jest.fn();
  
  return {
    DatabaseService: {
      getDataSource: jest.fn(() => ({
        getRepository: jest.fn(() => ({
          find: mockFind,
          findOne: mockFindOne,
          count: mockCount,
        })),
      })),
    },
    // Export the mocks so we can access them in tests
    __mockFind: mockFind,
    __mockCount: mockCount,
    __mockFindOne: mockFindOne,
  };
});

// Mock the LiturgicalCalendarService
jest.mock('../../../src/services/liturgical-calendar.service', () => ({
  LiturgicalCalendarService: jest.fn().mockImplementation(() => ({
    getLiturgicalYearInfo: jest.fn().mockReturnValue({
      year: 'A',
      startDate: new Date('2022-11-27'),
      endDate: new Date('2023-11-26'),
    }),
    getSeasonForDate: jest.fn().mockReturnValue('advent'),
    getProperNumber: jest.fn().mockReturnValue(null),
  })),
}));

// Import the mocks from the mocked module
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __mockFind: mockFind, __mockCount: mockCount, __mockFindOne: mockFindOne } = require('../../../src/services/database.service');

describe('ReadingsService', () => {
  let service: ReadingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFind.mockResolvedValue(mockReadings);
    mockCount.mockResolvedValue(mockReadings.length);
    // Mock findOne to return traditions when queried by abbreviation
    mockFindOne.mockImplementation((options: any) => {
      if (options?.where?.abbreviation) {
        const abbr = options.where.abbreviation.toUpperCase();
        const tradition = mockTraditions.find(t => t.abbreviation === abbr);
        return Promise.resolve(tradition || null);
      }
      if (options?.where?.id) {
        const tradition = mockTraditions.find(t => t.id === options.where.id);
        return Promise.resolve(tradition || null);
      }
      return Promise.resolve(null);
    });
    service = new ReadingsService();
  });

  describe('getByDate', () => {
    it('should return daily reading for given date and tradition', async () => {
      const date = '2023-12-03';
      const traditionId = 'rcl';

      // Mock the find to simulate proper query filtering by traditionId (UUID)
      mockFind.mockImplementation((options: any) => {
        // Service now queries by traditionId (UUID) not tradition.abbreviation
        if (options?.where?.traditionId === 'rcl-uuid') {
          return Promise.resolve(mockReadings);
        }
        return Promise.resolve([]);
      });

      const reading = await service.getByDate(date, traditionId);

      expect(reading).not.toBeNull();
      expect(reading).toMatchObject({
        id: `${traditionId}-${date}`,
        date,
        traditionId,
        readings: expect.any(Array),
      });
    });

    it('should return reading with all four reading types', async () => {
      const reading = await service.getByDate('2023-12-03', 'rcl');

      expect(reading).not.toBeNull();
      expect(reading!.readings).toHaveLength(4);
      
      const readingTypes = reading!.readings.map(r => r.type);
      expect(readingTypes).toContain(ReadingType.FIRST);
      expect(readingTypes).toContain(ReadingType.PSALM);
      expect(readingTypes).toContain(ReadingType.SECOND);
      expect(readingTypes).toContain(ReadingType.GOSPEL);
    });

    it('should return reading with properly structured readings array', async () => {
      const reading = await service.getByDate('2023-12-03', 'rcl');

      expect(reading).not.toBeNull();
      reading!.readings.forEach(r => {
        expect(r).toHaveProperty('type');
        expect(r).toHaveProperty('citation');
        expect(r).toHaveProperty('text');
        expect(typeof r.type).toBe('string');
        expect(typeof r.citation).toBe('string');
        expect(typeof r.text).toBe('string');
      });
    });

    it('should return different id for different dates', async () => {
      const reading1 = await service.getByDate('2023-12-03', 'rcl');
      const reading2 = await service.getByDate('2023-12-04', 'rcl');

      expect(reading1).not.toBeNull();
      expect(reading2).not.toBeNull();
      expect(reading1!.id).toBe('rcl-2023-12-03');
      expect(reading2!.id).toBe('rcl-2023-12-04');
      expect(reading1!.id).not.toBe(reading2!.id);
    });

    it('should return different id for different traditions', async () => {
      const rclReading = await service.getByDate('2023-12-03', 'rcl');
      const catholicReading = await service.getByDate('2023-12-03', 'catholic');

      expect(rclReading).not.toBeNull();
      expect(catholicReading).not.toBeNull();
      expect(rclReading!.id).toBe('rcl-2023-12-03');
      expect(catholicReading!.id).toBe('catholic-2023-12-03');
      expect(rclReading!.id).not.toBe(catholicReading!.id);
    });

    it('should handle different date formats', async () => {
      const reading = await service.getByDate('2024-01-01', 'episcopal');

      expect(reading).not.toBeNull();
      expect(reading!.id).toBe('episcopal-2024-01-01');
      expect(reading!.date).toBe('2024-01-01');
    });

    it('should return reading with specific biblical citations', async () => {
      const reading = await service.getByDate('2023-12-03', 'rcl');

      expect(reading).not.toBeNull();
      
      const firstReading = reading!.readings.find(r => r.type === ReadingType.FIRST);
      const psalm = reading!.readings.find(r => r.type === ReadingType.PSALM);
      const secondReading = reading!.readings.find(r => r.type === ReadingType.SECOND);
      const gospel = reading!.readings.find(r => r.type === ReadingType.GOSPEL);

      expect(firstReading?.citation).toBe('Isaiah 2:1-5');
      expect(psalm?.citation).toBe('Psalm 122');
      expect(secondReading?.citation).toBe('Romans 13:11-14');
      expect(gospel?.citation).toBe('Matthew 24:36-44');
    });

    it('should return reading with text content', async () => {
      const reading = await service.getByDate('2023-12-03', 'rcl');

      expect(reading).not.toBeNull();
      reading!.readings.forEach(r => {
        expect(r.text).toBeTruthy();
        expect(r.text.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getByDateRange', () => {
    it('should return readings for date range', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-03';
      const traditionId = 'rcl';

      // Mock count to return the proper number
      mockCount.mockResolvedValue(4); // 4 readings per day
      
      // Mock find to return readings
      mockFind.mockResolvedValue(mockReadings);

      const result = await service.getByDateRange(startDate, endDate, traditionId, 1, 10);

      expect(result).toHaveProperty('readings');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.readings)).toBe(true);
      expect(typeof result.total).toBe('number');
      // Since all mock readings have same date, we get 1 grouped reading
      expect(result.readings.length).toBeGreaterThan(0);
      expect(result.total).toBe(1); // total is count/4 (4 readings per day)
    });

    it('should apply pagination correctly', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-10'; // 10 days
      const traditionId = 'rcl';

      // Mock different results for pagination
      mockCount.mockResolvedValue(40); // 10 days * 4 readings
      
      // First page - return all mock readings
      mockFind.mockResolvedValueOnce(mockReadings);
      const page1 = await service.getByDateRange(startDate, endDate, traditionId, 1, 5);
      expect(page1.readings).toHaveLength(1); // 1 grouped date
      expect(page1.total).toBe(10); // 40/4 = 10 days

      // Second page - return empty for skip > 0
      mockFind.mockResolvedValueOnce([]);
      const page2 = await service.getByDateRange(startDate, endDate, traditionId, 2, 5);
      expect(page2.readings).toHaveLength(0);
      expect(page2.total).toBe(0);
    });

    it('should handle single day range', async () => {
      const date = '2023-12-25';
      mockFind.mockResolvedValueOnce(mockReadings);
      mockCount.mockResolvedValueOnce(4);
      
      const result = await service.getByDateRange(date, date, 'catholic', 1, 10);

      expect(result.readings).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.readings[0].date).toBe('2023-12-03'); // Date from mock data
      expect(result.readings[0].traditionId).toBe('catholic');
    });

    it('should handle different tradition ids', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-02';

      mockFind.mockResolvedValue(mockReadings);
      mockCount.mockResolvedValue(4);

      const rclResult = await service.getByDateRange(startDate, endDate, 'rcl', 1, 10);
      const catholicResult = await service.getByDateRange(startDate, endDate, 'catholic', 1, 10);

      expect(rclResult.readings).toHaveLength(1); // 1 grouped date
      expect(catholicResult.readings).toHaveLength(1);

      rclResult.readings.forEach(reading => {
        expect(reading.traditionId).toBe('rcl');
      });

      catholicResult.readings.forEach(reading => {
        expect(reading.traditionId).toBe('catholic');
      });
    });

    it('should return correct pagination with small limits', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-05'; // 5 days
      const traditionId = 'rcl';

      mockFind.mockResolvedValue([]); // Empty for skip > 0
      mockCount.mockResolvedValue(20); // 5 days * 4 readings

      const result = await service.getByDateRange(startDate, endDate, traditionId, 2, 2);

      expect(result.readings).toHaveLength(0); // No readings for page 2
      expect(result.total).toBe(0); // No readings found
    });

    it('should handle large page numbers gracefully', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-02'; // 2 days
      const traditionId = 'rcl';

      mockFind.mockResolvedValue([]); // Empty for large skip
      mockCount.mockResolvedValue(8); // 2 days * 4 readings

      const result = await service.getByDateRange(startDate, endDate, traditionId, 10, 5);

      expect(result.readings).toHaveLength(0);
      expect(result.total).toBe(0); // No readings found with empty result
    });

    it('should maintain reading structure in range results', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-02';
      const traditionId = 'episcopal';

      mockFind.mockResolvedValue(mockReadings);
      mockCount.mockResolvedValue(4);

      const result = await service.getByDateRange(startDate, endDate, traditionId, 1, 10);

      expect(result.readings).toHaveLength(1); // 1 grouped date
      result.readings.forEach((reading: DailyReading) => {
        expect(reading).toHaveProperty('id');
        expect(reading).toHaveProperty('date');
        expect(reading).toHaveProperty('traditionId');
        expect(reading).toHaveProperty('seasonId');
        expect(reading).toHaveProperty('readings');
        expect(reading).toHaveProperty('createdAt');
        expect(reading).toHaveProperty('updatedAt');
        
        expect(reading.readings).toHaveLength(4);
        expect(reading.traditionId).toBe(traditionId);
      });
    });

    it('should handle zero limit edge case', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-05';
      const traditionId = 'rcl';
      
      // When limit is 0, mock should return empty array
      mockFind.mockResolvedValue([]);
      mockCount.mockResolvedValue(20);

      const result = await service.getByDateRange(startDate, endDate, traditionId, 1, 0);

      expect(result.readings).toHaveLength(0);
      expect(result.total).toBe(0); // With no readings found, total is 0
    });
  });
});