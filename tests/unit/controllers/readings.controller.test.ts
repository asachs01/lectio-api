import { Request, Response } from 'express';
import { ReadingsController } from '../../../src/controllers/readings.controller';
import { ReadingsService } from '../../../src/services/readings.service';
import { HttpError } from '../../../src/middleware/error-handler';
import { DailyReading, ReadingType } from '../../../src/types/lectionary.types';

// Mock the ReadingsService
jest.mock('../../../src/services/readings.service');
const MockReadingsService = ReadingsService as jest.MockedClass<typeof ReadingsService>;

describe('ReadingsController', () => {
  let controller: ReadingsController;
  let mockReadingsService: jest.Mocked<ReadingsService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const mockReading: DailyReading = {
    id: 'rcl-2023-12-03',
    date: '2023-12-03',
    traditionId: 'rcl',
    season: 'Advent',
    year: 'A',
    dayName: 'First Sunday of Advent',
    liturgicalColor: 'purple',
    seasonId: 'advent',
    readings: [
      {
        type: ReadingType.FIRST,
        citation: 'Isaiah 64:1-9',
        text: 'Sample text',
      },
      {
        type: ReadingType.PSALM,
        citation: 'Psalm 80:1-7',
        text: 'Sample psalm',
      },
      {
        type: ReadingType.SECOND,
        citation: '1 Corinthians 1:3-9',
        text: 'Sample epistle',
      },
      {
        type: ReadingType.GOSPEL,
        citation: 'Mark 13:24-37',
        text: 'Sample gospel',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Create mock service instance
    mockReadingsService = new MockReadingsService() as jest.Mocked<ReadingsService>;
    
    // Create controller
    controller = new ReadingsController();
    
    // Replace the service instance with our mock
    (controller as any).readingsService = mockReadingsService;

    // Create mock response methods
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      query: {},
      params: {},
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getByDate', () => {
    beforeEach(() => {
      mockRequest.query = { date: '2023-12-03' };
    });

    it('should return readings for a specific date successfully', async () => {
      mockReadingsService.getByDate.mockResolvedValue(mockReading);

      await controller.getByDate(mockRequest as Request, mockResponse as Response);

      expect(mockReadingsService.getByDate).toHaveBeenCalledWith('2023-12-03', 'rcl');
      expect(mockJson).toHaveBeenCalledWith({
        data: mockReading,
        timestamp: expect.any(String),
      });
    });

    it('should use specified tradition', async () => {
      mockRequest.query = { date: '2023-12-03', tradition: 'catholic' };
      mockReadingsService.getByDate.mockResolvedValue(mockReading);

      await controller.getByDate(mockRequest as Request, mockResponse as Response);

      expect(mockReadingsService.getByDate).toHaveBeenCalledWith('2023-12-03', 'catholic');
    });

    it('should throw HttpError when date parameter is missing', async () => {
      mockRequest.query = {};

      await expect(controller.getByDate(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDate(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Date parameter is required');
    });

    it('should throw HttpError for invalid date format', async () => {
      mockRequest.query = { date: 'invalid-date' };

      await expect(controller.getByDate(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDate(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Invalid date format. Use YYYY-MM-DD');
    });

    it('should throw HttpError for invalid date values', async () => {
      mockRequest.query = { date: '2023-13-35' }; // Invalid month and day

      await expect(controller.getByDate(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);
    });

    it('should throw HttpError when no readings found', async () => {
      mockRequest.query = { date: '2023-12-03' };
      mockReadingsService.getByDate.mockResolvedValue(null);

      await expect(controller.getByDate(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDate(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(404);
      expect(thrownError.message).toContain('No readings found');
    });

    it('should handle service errors', async () => {
      mockRequest.query = { date: '2023-12-03' };
      const serviceError = new Error('Database error');
      mockReadingsService.getByDate.mockRejectedValue(serviceError);

      await expect(controller.getByDate(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDate(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(500);
      expect(thrownError.message).toBe('Failed to fetch readings');
    });
  });

  describe('getToday', () => {
    let originalDate: typeof Date;

    beforeEach(() => {
      originalDate = Date;
    });

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should return today\'s readings successfully', async () => {
      const mockDate = new Date('2023-12-15T10:00:00.000Z');
      const expectedDateStr = mockDate.toISOString().split('T')[0];
      const expectedDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(expectedDateStr).getDay()];

      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) {
            return mockDate;
          }
          return new (originalDate as any)(...args);
        }) as any);

      mockReadingsService.getByDate.mockResolvedValue(mockReading);
      mockReadingsService.getDailyOfficeReadings.mockResolvedValue(null);

      await controller.getToday(mockRequest as Request, mockResponse as Response);

      expect(mockReadingsService.getByDate).toHaveBeenCalledWith(expectedDateStr, 'rcl');
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        date: expectedDateStr,
        dayOfWeek: expectedDayOfWeek,
        tradition: 'rcl',
        timestamp: expect.any(String),
        lectionary: expect.objectContaining({
          type: expect.any(String), // Can be 'sunday' or 'special' depending on timezone
          readings: mockReading.readings,
          seasonId: mockReading.seasonId,
        }),
        data: mockReading,
      }));
    });

    it('should use specified tradition for today\'s readings', async () => {
      mockRequest.query = { tradition: 'episcopal' };
      const mockDate = new Date('2023-12-15T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) {
            return mockDate;
          }
          return new (originalDate as any)(...args);
        }) as any);

      mockReadingsService.getByDate.mockResolvedValue(mockReading);
      mockReadingsService.getDailyOfficeReadings.mockResolvedValue(null);

      await controller.getToday(mockRequest as Request, mockResponse as Response);

      expect(mockReadingsService.getByDate).toHaveBeenCalledWith('2023-12-15', 'episcopal');
    });

    it('should throw HttpError when no readings found for today', async () => {
      const mockDate = new Date('2023-12-15T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) {
            return mockDate;
          }
          return new (originalDate as any)(...args);
        }) as any);

      mockReadingsService.getByDate.mockResolvedValue(null);
      mockReadingsService.getDailyOfficeReadings.mockResolvedValue(null);

      await expect(controller.getToday(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getToday(mockRequest as Request, mockResponse as Response)
        .catch(err => err);

      expect(thrownError.statusCode).toBe(404);
      expect(thrownError.message).toContain('No readings found for today');
    });

    it('should handle service errors for today\'s readings', async () => {
      const serviceError = new Error('Database error');
      mockReadingsService.getByDate.mockRejectedValue(serviceError);

      await expect(controller.getToday(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getToday(mockRequest as Request, mockResponse as Response)
        .catch(err => err);

      expect(thrownError.statusCode).toBe(500);
      expect(thrownError.message).toBe('Failed to fetch today\'s readings');
    });

    it('should return Sunday readings with type sunday on Sundays', async () => {
      // Use a mid-day Sunday time that will be Sunday in most timezones
      const mockDate = new Date('2023-12-17T12:00:00.000Z');
      const expectedDateStr = mockDate.toISOString().split('T')[0];
      const dayNum = new Date(expectedDateStr).getDay();

      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) {
            return mockDate;
          }
          return new (originalDate as any)(...args);
        }) as any);

      mockReadingsService.getByDate.mockResolvedValue(mockReading);
      mockReadingsService.getDailyOfficeReadings.mockResolvedValue(null);

      await controller.getToday(mockRequest as Request, mockResponse as Response);

      // The type will be 'sunday' if dayNum is 0, otherwise 'special'
      const expectedType = dayNum === 0 ? 'sunday' : 'special';
      const expectedDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNum];

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        dayOfWeek: expectedDayName,
        lectionary: expect.objectContaining({
          type: expectedType,
        }),
      }));
    });

    it('should include daily office readings when available', async () => {
      const mockDate = new Date('2023-12-15T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) {
            return mockDate;
          }
          return new (originalDate as any)(...args);
        }) as any);

      const mockDailyOffice: DailyReading = {
        id: 'bcp-daily-2023-12-15',
        date: '2023-12-15',
        traditionId: 'bcp-daily-office',
        season: 'Advent',
        year: null,
        dayName: null,
        liturgicalColor: 'purple',
        seasonId: 'advent',
        readings: [
          { type: ReadingType.FIRST, citation: 'Isaiah 1:1-20', text: 'Morning reading', office: 'morning' },
          { type: ReadingType.SECOND, citation: 'Luke 1:1-25', text: 'Evening reading', office: 'evening' },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReadingsService.getByDate.mockResolvedValue(null);
      mockReadingsService.getDailyOfficeReadings.mockResolvedValue(mockDailyOffice);

      await controller.getToday(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        dailyOffice: expect.objectContaining({
          morning: expect.any(Array),
          evening: expect.any(Array),
        }),
        data: mockDailyOffice,
      }));
    });
  });

  describe('getByDateRange', () => {
    const mockRangeResult = {
      readings: [mockReading],
      total: 1,
    };

    beforeEach(() => {
      mockRequest.query = {
        start: '2023-12-01',
        end: '2023-12-03',
      };
    });

    it('should return readings for date range successfully', async () => {
      mockReadingsService.getByDateRange.mockResolvedValue(mockRangeResult);

      await controller.getByDateRange(mockRequest as Request, mockResponse as Response);

      expect(mockReadingsService.getByDateRange).toHaveBeenCalledWith('2023-12-01', '2023-12-03', 'rcl', 1, 10);
      expect(mockJson).toHaveBeenCalledWith({
        data: mockRangeResult.readings,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
        dateRange: {
          start: '2023-12-01',
          end: '2023-12-03',
        },
        tradition: 'rcl',
        timestamp: expect.any(String),
      });
    });

    it('should handle custom pagination parameters', async () => {
      mockRequest.query = {
        start: '2023-12-01',
        end: '2023-12-03',
        page: '2',
        limit: '5',
      };
      mockReadingsService.getByDateRange.mockResolvedValue(mockRangeResult);

      await controller.getByDateRange(mockRequest as Request, mockResponse as Response);

      expect(mockReadingsService.getByDateRange).toHaveBeenCalledWith('2023-12-01', '2023-12-03', 'rcl', 2, 5);
      expect(mockJson).toHaveBeenCalledWith({
        data: mockRangeResult.readings,
        pagination: {
          page: 2,
          limit: 5,
          total: 1,
          totalPages: 1,
        },
        dateRange: {
          start: '2023-12-01',
          end: '2023-12-03',
        },
        tradition: 'rcl',
        timestamp: expect.any(String),
      });
    });

    it('should use specified tradition', async () => {
      mockRequest.query = {
        start: '2023-12-01',
        end: '2023-12-03',
        tradition: 'catholic',
      };
      mockReadingsService.getByDateRange.mockResolvedValue(mockRangeResult);

      await controller.getByDateRange(mockRequest as Request, mockResponse as Response);

      expect(mockReadingsService.getByDateRange).toHaveBeenCalledWith('2023-12-01', '2023-12-03', 'catholic', 1, 10);
    });

    it('should throw HttpError when start date is missing', async () => {
      mockRequest.query = { end: '2023-12-03' };

      await expect(controller.getByDateRange(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDateRange(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Start and end date parameters are required');
    });

    it('should throw HttpError when end date is missing', async () => {
      mockRequest.query = { start: '2023-12-01' };

      await expect(controller.getByDateRange(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);
    });

    it('should throw HttpError for invalid date format', async () => {
      mockRequest.query = {
        start: 'invalid-date',
        end: '2023-12-03',
      };

      await expect(controller.getByDateRange(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDateRange(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Invalid date format. Use YYYY-MM-DD');
    });

    it('should throw HttpError when start date is after end date', async () => {
      mockRequest.query = {
        start: '2023-12-10',
        end: '2023-12-05',
      };

      await expect(controller.getByDateRange(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDateRange(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Start date must be before end date');
    });

    it('should throw HttpError for invalid page parameter', async () => {
      mockRequest.query = {
        start: '2023-12-01',
        end: '2023-12-03',
        page: '0',
      };

      await expect(controller.getByDateRange(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDateRange(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Page must be a positive integer');
    });

    it('should throw HttpError for invalid limit parameter', async () => {
      mockRequest.query = {
        start: '2023-12-01',
        end: '2023-12-03',
        limit: '0',
      };

      await expect(controller.getByDateRange(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDateRange(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Limit must be a positive integer between 1 and 100');
    });

    it('should throw HttpError for limit exceeding maximum', async () => {
      mockRequest.query = {
        start: '2023-12-01',
        end: '2023-12-03',
        limit: '101',
      };

      await expect(controller.getByDateRange(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);
    });

    it('should calculate total pages correctly', async () => {
      const mockLargeResult = { readings: [] as DailyReading[], total: 25 };
      mockRequest.query = {
        start: '2023-12-01',
        end: '2023-12-31',
        limit: '10',
      };
      mockReadingsService.getByDateRange.mockResolvedValue(mockLargeResult);

      await controller.getByDateRange(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            totalPages: 3, // 25 items / 10 per page = 3 pages
          }),
        }),
      );
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database error');
      mockReadingsService.getByDateRange.mockRejectedValue(serviceError);

      await expect(controller.getByDateRange(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByDateRange(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(500);
      expect(thrownError.message).toBe('Failed to fetch readings for date range');
    });
  });

  describe('isValidDate (private method)', () => {
    it('should validate correct date formats', () => {
      const isValidDate = (controller as any).isValidDate.bind(controller);
      
      expect(isValidDate('2023-12-03')).toBe(true);
      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('2023-02-28')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      const isValidDate = (controller as any).isValidDate.bind(controller);
      
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('2023/12/03')).toBe(false);
      expect(isValidDate('12-03-2023')).toBe(false);
      expect(isValidDate('2023-13-01')).toBe(false); // Invalid month
      expect(isValidDate('2023-12-32')).toBe(false); // Invalid day
      expect(isValidDate('2023-02-30')).toBe(false); // Invalid day for February
    });

    it('should handle leap years correctly', () => {
      const isValidDate = (controller as any).isValidDate.bind(controller);
      
      expect(isValidDate('2024-02-29')).toBe(true); // Leap year
      expect(isValidDate('2023-02-29')).toBe(false); // Not a leap year
    });
  });
});