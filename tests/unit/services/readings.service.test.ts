import { ReadingsService } from '../../../src/services/readings.service';
import { DailyReading, ReadingType } from '../../../src/types/lectionary.types';

// Mock the DatabaseService
jest.mock('../../../src/services/database.service', () => ({
  DatabaseService: {
    getDataSource: jest.fn().mockReturnValue({
      getRepository: jest.fn().mockReturnValue({
        find: jest.fn().mockResolvedValue([
          {
            id: 'test-reading-1',
            date: new Date('2023-12-03'),
            readingType: 'first',
            citation: 'Isaiah 2:1-5',
            text: '',
            isAlternative: false,
          },
          {
            id: 'test-reading-2',
            date: new Date('2023-12-03'),
            readingType: 'psalm',
            citation: 'Psalm 122',
            text: '',
            isAlternative: false,
          },
          {
            id: 'test-reading-3',
            date: new Date('2023-12-03'),
            readingType: 'second',
            citation: 'Romans 13:11-14',
            text: '',
            isAlternative: false,
          },
          {
            id: 'test-reading-4',
            date: new Date('2023-12-03'),
            readingType: 'gospel',
            citation: 'Matthew 24:36-44',
            text: '',
            isAlternative: false,
          },
        ]),
        findOne: jest.fn().mockResolvedValue(null),
      }),
    }),
  },
}));

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

describe('ReadingsService', () => {
  let service: ReadingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReadingsService();
  });

  describe('getByDate', () => {
    it('should return daily reading for given date and tradition', async () => {
      const date = '2023-12-03';
      const traditionId = 'rcl';

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

      expect(firstReading?.citation).toBe('Isaiah 64:1-9');
      expect(psalm?.citation).toBe('Psalm 80:1-7, 17-19');
      expect(secondReading?.citation).toBe('1 Corinthians 1:3-9');
      expect(gospel?.citation).toBe('Mark 13:24-37');
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

      const result = await service.getByDateRange(startDate, endDate, traditionId, 1, 10);

      expect(result).toHaveProperty('readings');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.readings)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(result.readings.length).toBe(3); // 3 days
      expect(result.total).toBe(3);
    });

    it('should apply pagination correctly', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-10'; // 10 days
      const traditionId = 'rcl';

      // First page
      const page1 = await service.getByDateRange(startDate, endDate, traditionId, 1, 5);
      expect(page1.readings).toHaveLength(5);
      expect(page1.total).toBe(10);

      // Second page
      const page2 = await service.getByDateRange(startDate, endDate, traditionId, 2, 5);
      expect(page2.readings).toHaveLength(5);
      expect(page2.total).toBe(10);

      // Third page (empty)
      const page3 = await service.getByDateRange(startDate, endDate, traditionId, 3, 5);
      expect(page3.readings).toHaveLength(0);
      expect(page3.total).toBe(10);
    });

    it('should handle single day range', async () => {
      const date = '2023-12-25';
      const result = await service.getByDateRange(date, date, 'catholic', 1, 10);

      expect(result.readings).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.readings[0].date).toBe(date);
      expect(result.readings[0].traditionId).toBe('catholic');
    });

    it('should handle different tradition ids', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-02';

      const rclResult = await service.getByDateRange(startDate, endDate, 'rcl', 1, 10);
      const catholicResult = await service.getByDateRange(startDate, endDate, 'catholic', 1, 10);

      expect(rclResult.readings).toHaveLength(2);
      expect(catholicResult.readings).toHaveLength(2);

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

      const result = await service.getByDateRange(startDate, endDate, traditionId, 2, 2);

      expect(result.readings).toHaveLength(2); // Limit of 2
      expect(result.total).toBe(5); // Total days in range
      
      // Should be the 3rd and 4th readings (page 2, limit 2)
      expect(result.readings[0].date).toBe('2023-12-03');
      expect(result.readings[1].date).toBe('2023-12-04');
    });

    it('should handle large page numbers gracefully', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-02'; // 2 days
      const traditionId = 'rcl';

      const result = await service.getByDateRange(startDate, endDate, traditionId, 10, 5);

      expect(result.readings).toHaveLength(0);
      expect(result.total).toBe(2);
    });

    it('should maintain reading structure in range results', async () => {
      const startDate = '2023-12-01';
      const endDate = '2023-12-02';
      const traditionId = 'episcopal';

      const result = await service.getByDateRange(startDate, endDate, traditionId, 1, 10);

      expect(result.readings).toHaveLength(2);
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

      const result = await service.getByDateRange(startDate, endDate, traditionId, 1, 0);

      expect(result.readings).toHaveLength(0);
      expect(result.total).toBe(5);
    });
  });
});