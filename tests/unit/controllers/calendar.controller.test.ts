import { Request, Response } from 'express';
import { CalendarController } from '../../../src/controllers/calendar.controller';
import { CalendarService } from '../../../src/services/calendar.service';
import { HttpError } from '../../../src/middleware/error-handler';
import { LiturgicalCalendar, LiturgicalSeason, CurrentCalendarInfo } from '../../../src/types/lectionary.types';

// Mock the CalendarService
jest.mock('../../../src/services/calendar.service');
const MockCalendarService = CalendarService as jest.MockedClass<typeof CalendarService>;

describe('CalendarController', () => {
  let controller: CalendarController;
  let mockCalendarService: jest.Mocked<CalendarService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const mockCalendar: LiturgicalCalendar = {
    id: 'rcl-2023',
    year: 2023,
    traditionId: 'rcl',
    seasons: [
      {
        id: 'advent',
        name: 'Advent',
        color: 'purple',
        startDate: '2023-12-03',
        endDate: '2023-12-24',
        traditionId: 'rcl',
        year: 2023,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    specialDays: [
      {
        id: 'christmas',
        name: 'Christmas Day',
        date: '2023-12-25',
        type: 'feast',
        traditionId: 'rcl',
        year: 2023,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSeasons: LiturgicalSeason[] = [
    {
      id: 'advent',
      name: 'Advent',
      color: 'purple',
      startDate: '2023-12-03',
      endDate: '2023-12-24',
      traditionId: 'rcl',
      year: 2023,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'christmas',
      name: 'Christmas',
      color: 'white',
      startDate: '2023-12-25',
      endDate: '2024-01-06',
      traditionId: 'rcl',
      year: 2023,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockCurrentInfo: CurrentCalendarInfo = {
    currentSeason: {
      id: 'advent',
      name: 'Advent',
      color: 'purple',
      startDate: '2023-12-03',
      endDate: '2023-12-24',
      traditionId: 'rcl',
      year: 2023,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    currentYear: 2023,
    today: '2023-12-15',
    upcomingSpecialDays: [
      {
        name: 'Christmas Day',
        date: '2023-12-25',
        daysUntil: 10,
      },
    ],
  };

  beforeEach(() => {
    // Create mock service instance
    mockCalendarService = new MockCalendarService() as jest.Mocked<CalendarService>;
    
    // Create controller
    controller = new CalendarController();
    
    // Replace the service instance with our mock
    (controller as any).calendarService = mockCalendarService;

    // Create mock response methods
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      params: {},
      query: {},
    };
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getByYear', () => {
    beforeEach(() => {
      mockRequest.params = { year: '2023' };
    });

    it('should return calendar for specified year successfully', async () => {
      mockCalendarService.getByYear.mockResolvedValue(mockCalendar);

      await controller.getByYear(mockRequest as Request, mockResponse as Response);

      expect(mockCalendarService.getByYear).toHaveBeenCalledWith(2023, 'rcl');
      expect(mockJson).toHaveBeenCalledWith({
        data: mockCalendar,
        timestamp: expect.any(String),
      });
    });

    it('should use specified tradition', async () => {
      mockRequest.query = { tradition: 'catholic' };
      mockCalendarService.getByYear.mockResolvedValue(mockCalendar);

      await controller.getByYear(mockRequest as Request, mockResponse as Response);

      expect(mockCalendarService.getByYear).toHaveBeenCalledWith(2023, 'catholic');
    });

    it('should throw HttpError for invalid year parameter', async () => {
      mockRequest.params = { year: 'invalid' };

      await expect(controller.getByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByYear(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Invalid year parameter');
    });

    it('should throw HttpError for year too old', async () => {
      mockRequest.params = { year: '1800' };

      await expect(controller.getByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByYear(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Invalid year parameter');
    });

    it('should throw HttpError for year too far in future', async () => {
      mockRequest.params = { year: '2200' };

      await expect(controller.getByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);
    });

    it('should handle valid edge case years', async () => {
      mockCalendarService.getByYear.mockResolvedValue(mockCalendar);

      // Test minimum valid year
      mockRequest.params = { year: '1900' };
      await controller.getByYear(mockRequest as Request, mockResponse as Response);
      expect(mockCalendarService.getByYear).toHaveBeenCalledWith(1900, 'rcl');

      // Test maximum valid year
      mockRequest.params = { year: '2100' };
      await controller.getByYear(mockRequest as Request, mockResponse as Response);
      expect(mockCalendarService.getByYear).toHaveBeenCalledWith(2100, 'rcl');
    });

    it('should throw HttpError when calendar not found', async () => {
      mockCalendarService.getByYear.mockResolvedValue(null);

      await expect(controller.getByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByYear(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(404);
      expect(thrownError.message).toContain('Calendar not found');
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database error');
      mockCalendarService.getByYear.mockRejectedValue(serviceError);

      await expect(controller.getByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getByYear(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(500);
      expect(thrownError.message).toBe('Failed to fetch calendar');
    });

    it('should re-throw HttpError from service', async () => {
      const httpError = new HttpError('Service error', 400);
      mockCalendarService.getByYear.mockRejectedValue(httpError);

      await expect(controller.getByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(httpError);
    });
  });

  describe('getSeasonsByYear', () => {
    beforeEach(() => {
      mockRequest.params = { year: '2023' };
    });

    it('should return seasons for specified year successfully', async () => {
      mockCalendarService.getSeasonsByYear.mockResolvedValue(mockSeasons);

      await controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response);

      expect(mockCalendarService.getSeasonsByYear).toHaveBeenCalledWith(2023, 'rcl');
      expect(mockJson).toHaveBeenCalledWith({
        data: mockSeasons,
        total: 2,
        year: 2023,
        tradition: 'rcl',
        timestamp: expect.any(String),
      });
    });

    it('should use specified tradition', async () => {
      mockRequest.query = { tradition: 'episcopal' };
      mockCalendarService.getSeasonsByYear.mockResolvedValue(mockSeasons);

      await controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response);

      expect(mockCalendarService.getSeasonsByYear).toHaveBeenCalledWith(2023, 'episcopal');
      expect(mockJson).toHaveBeenCalledWith({
        data: mockSeasons,
        total: 2,
        year: 2023,
        tradition: 'episcopal',
        timestamp: expect.any(String),
      });
    });

    it('should throw HttpError for invalid year parameter', async () => {
      mockRequest.params = { year: 'invalid' };

      await expect(controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Invalid year parameter');
    });

    it('should throw HttpError for year out of range', async () => {
      mockRequest.params = { year: '1800' };

      await expect(controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);
    });

    it('should handle empty seasons array', async () => {
      mockCalendarService.getSeasonsByYear.mockResolvedValue([]);

      await controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        data: [],
        total: 0,
        year: 2023,
        tradition: 'rcl',
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database error');
      mockCalendarService.getSeasonsByYear.mockRejectedValue(serviceError);

      await expect(controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(500);
      expect(thrownError.message).toBe('Failed to fetch seasons');
    });

    it('should re-throw HttpError from service', async () => {
      const httpError = new HttpError('Service error', 400);
      mockCalendarService.getSeasonsByYear.mockRejectedValue(httpError);

      await expect(controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(httpError);
    });

    it('should handle different year formats', async () => {
      mockCalendarService.getSeasonsByYear.mockResolvedValue(mockSeasons);

      // Test with different year
      mockRequest.params = { year: '2024' };
      await controller.getSeasonsByYear(mockRequest as Request, mockResponse as Response);
      
      expect(mockCalendarService.getSeasonsByYear).toHaveBeenCalledWith(2024, 'rcl');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2024,
        })
      );
    });
  });

  describe('getCurrent', () => {
    it('should return current calendar information successfully', async () => {
      mockCalendarService.getCurrent.mockResolvedValue(mockCurrentInfo);

      await controller.getCurrent(mockRequest as Request, mockResponse as Response);

      expect(mockCalendarService.getCurrent).toHaveBeenCalledWith('rcl');
      expect(mockJson).toHaveBeenCalledWith({
        data: mockCurrentInfo,
        timestamp: expect.any(String),
      });
    });

    it('should use specified tradition', async () => {
      mockRequest.query = { tradition: 'catholic' };
      mockCalendarService.getCurrent.mockResolvedValue(mockCurrentInfo);

      await controller.getCurrent(mockRequest as Request, mockResponse as Response);

      expect(mockCalendarService.getCurrent).toHaveBeenCalledWith('catholic');
    });

    it('should handle current info with null current season', async () => {
      const currentInfoWithoutSeason: CurrentCalendarInfo = {
        ...mockCurrentInfo,
        currentSeason: null,
      };
      mockCalendarService.getCurrent.mockResolvedValue(currentInfoWithoutSeason);

      await controller.getCurrent(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        data: currentInfoWithoutSeason,
        timestamp: expect.any(String),
      });
    });

    it('should handle current info with empty upcoming special days', async () => {
      const currentInfoWithoutSpecialDays: CurrentCalendarInfo = {
        ...mockCurrentInfo,
        upcomingSpecialDays: [],
      };
      mockCalendarService.getCurrent.mockResolvedValue(currentInfoWithoutSpecialDays);

      await controller.getCurrent(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        data: currentInfoWithoutSpecialDays,
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database error');
      mockCalendarService.getCurrent.mockRejectedValue(serviceError);

      await expect(controller.getCurrent(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getCurrent(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(500);
      expect(thrownError.message).toBe('Failed to fetch current calendar information');
    });

    it('should re-throw HttpError from service', async () => {
      const httpError = new HttpError('Service error', 400);
      mockCalendarService.getCurrent.mockRejectedValue(httpError);

      await expect(controller.getCurrent(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(httpError);
    });

    it('should work with different traditions', async () => {
      mockCalendarService.getCurrent.mockResolvedValue(mockCurrentInfo);

      // Test RCL
      mockRequest.query = { tradition: 'rcl' };
      await controller.getCurrent(mockRequest as Request, mockResponse as Response);
      expect(mockCalendarService.getCurrent).toHaveBeenCalledWith('rcl');

      // Test Catholic
      mockRequest.query = { tradition: 'catholic' };
      await controller.getCurrent(mockRequest as Request, mockResponse as Response);
      expect(mockCalendarService.getCurrent).toHaveBeenCalledWith('catholic');

      // Test Episcopal
      mockRequest.query = { tradition: 'episcopal' };
      await controller.getCurrent(mockRequest as Request, mockResponse as Response);
      expect(mockCalendarService.getCurrent).toHaveBeenCalledWith('episcopal');
    });

    it('should handle tradition parameter type conversion', async () => {
      mockRequest.query = { tradition: 123 as any }; // Non-string value
      mockCalendarService.getCurrent.mockResolvedValue(mockCurrentInfo);

      await controller.getCurrent(mockRequest as Request, mockResponse as Response);

      expect(mockCalendarService.getCurrent).toHaveBeenCalledWith('123');
    });
  });
});