import { Request, Response } from 'express';
import { TraditionsController } from '../../../src/controllers/traditions.controller';
import { TraditionsService } from '../../../src/services/traditions.service';
import { HttpError } from '../../../src/middleware/error-handler';
import { LectionaryTradition, LiturgicalSeason } from '../../../src/types/lectionary.types';

// Mock the TraditionsService
jest.mock('../../../src/services/traditions.service');
const MockTraditionsService = TraditionsService as jest.MockedClass<typeof TraditionsService>;

describe('TraditionsController', () => {
  let controller: TraditionsController;
  let mockTraditionsService: jest.Mocked<TraditionsService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const mockTraditions: LectionaryTradition[] = [
    {
      id: 'rcl',
      name: 'Revised Common Lectionary',
      abbreviation: 'RCL',
      description: 'A three-year cycle of readings',
      startDate: '2023-12-03',
      endDate: '2024-11-30',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'catholic',
      name: 'Roman Catholic Lectionary',
      abbreviation: 'Catholic',
      description: 'The official lectionary of the Roman Catholic Church',
      startDate: '2023-12-03',
      endDate: '2024-11-30',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

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

  beforeEach(() => {
    // Create mock service instance
    mockTraditionsService = new MockTraditionsService() as jest.Mocked<TraditionsService>;
    
    // Create controller
    controller = new TraditionsController();
    
    // Replace the service instance with our mock
    (controller as any).traditionsService = mockTraditionsService;

    // Create mock response methods
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all traditions successfully', async () => {
      mockTraditionsService.getAll.mockResolvedValue(mockTraditions);

      await controller.getAll(mockRequest as Request, mockResponse as Response);

      expect(mockTraditionsService.getAll).toHaveBeenCalledTimes(1);
      expect(mockJson).toHaveBeenCalledWith({
        data: mockTraditions,
        total: 2,
        timestamp: expect.any(String),
      });
    });

    it('should throw HttpError when service fails', async () => {
      const error = new Error('Database error');
      mockTraditionsService.getAll.mockRejectedValue(error);

      await expect(controller.getAll(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      expect(mockTraditionsService.getAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no traditions found', async () => {
      mockTraditionsService.getAll.mockResolvedValue([]);

      await controller.getAll(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        data: [],
        total: 0,
        timestamp: expect.any(String),
      });
    });
  });

  describe('getById', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'rcl' };
    });

    it('should return tradition by id successfully', async () => {
      const tradition = mockTraditions[0];
      mockTraditionsService.getById.mockResolvedValue(tradition);

      await controller.getById(mockRequest as Request, mockResponse as Response);

      expect(mockTraditionsService.getById).toHaveBeenCalledWith('rcl');
      expect(mockJson).toHaveBeenCalledWith({
        data: tradition,
        timestamp: expect.any(String),
      });
    });

    it('should throw HttpError when tradition not found', async () => {
      mockTraditionsService.getById.mockResolvedValue(null);

      await expect(controller.getById(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getById(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError).toBeInstanceOf(HttpError);
      expect(thrownError.statusCode).toBe(404);
      expect(thrownError.message).toContain('not found');
    });

    it('should throw HttpError when id parameter is missing', async () => {
      mockRequest.params = {};

      await expect(controller.getById(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getById(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError).toBeInstanceOf(HttpError);
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Tradition ID is required');
    });

    it('should throw HttpError when id parameter is empty', async () => {
      mockRequest.params = { id: '' };

      await expect(controller.getById(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);
    });

    it('should re-throw HttpError from service', async () => {
      const httpError = new HttpError('Service error', 400);
      mockTraditionsService.getById.mockRejectedValue(httpError);

      await expect(controller.getById(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(httpError);
    });

    it('should wrap generic errors in HttpError', async () => {
      const genericError = new Error('Generic error');
      mockTraditionsService.getById.mockRejectedValue(genericError);

      await expect(controller.getById(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getById(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(500);
      expect(thrownError.message).toBe('Failed to fetch tradition');
    });
  });

  describe('getSeasons', () => {
    beforeEach(() => {
      mockRequest.params = { id: 'rcl' };
      mockRequest.query = {};
    });

    it('should return seasons successfully with default year', async () => {
      const currentYear = new Date().getFullYear();
      mockTraditionsService.getSeasons.mockResolvedValue(mockSeasons);

      await controller.getSeasons(mockRequest as Request, mockResponse as Response);

      expect(mockTraditionsService.getSeasons).toHaveBeenCalledWith('rcl', currentYear);
      expect(mockJson).toHaveBeenCalledWith({
        data: mockSeasons,
        total: 2,
        year: currentYear,
        traditionId: 'rcl',
        timestamp: expect.any(String),
      });
    });

    it('should return seasons with specified year', async () => {
      mockRequest.query = { year: '2024' };
      mockTraditionsService.getSeasons.mockResolvedValue(mockSeasons);

      await controller.getSeasons(mockRequest as Request, mockResponse as Response);

      expect(mockTraditionsService.getSeasons).toHaveBeenCalledWith('rcl', 2024);
      expect(mockJson).toHaveBeenCalledWith({
        data: mockSeasons,
        total: 2,
        year: 2024,
        traditionId: 'rcl',
        timestamp: expect.any(String),
      });
    });

    it('should throw HttpError when tradition id is missing', async () => {
      mockRequest.params = {};

      await expect(controller.getSeasons(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getSeasons(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Tradition ID is required');
    });

    it('should throw HttpError for invalid year parameter', async () => {
      mockRequest.query = { year: 'invalid' };

      await expect(controller.getSeasons(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getSeasons(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Invalid year parameter');
    });

    it('should throw HttpError for year too old', async () => {
      mockRequest.query = { year: '1800' };

      await expect(controller.getSeasons(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getSeasons(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Invalid year parameter');
    });

    it('should throw HttpError for year too far in future', async () => {
      mockRequest.query = { year: '2200' };

      await expect(controller.getSeasons(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getSeasons(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(400);
      expect(thrownError.message).toBe('Invalid year parameter');
    });

    it('should handle valid edge case years', async () => {
      mockTraditionsService.getSeasons.mockResolvedValue(mockSeasons);

      // Test minimum valid year
      mockRequest.query = { year: '1900' };
      await controller.getSeasons(mockRequest as Request, mockResponse as Response);
      expect(mockTraditionsService.getSeasons).toHaveBeenCalledWith('rcl', 1900);

      // Test maximum valid year
      mockRequest.query = { year: '2100' };
      await controller.getSeasons(mockRequest as Request, mockResponse as Response);
      expect(mockTraditionsService.getSeasons).toHaveBeenCalledWith('rcl', 2100);
    });

    it('should re-throw HttpError from service', async () => {
      const httpError = new HttpError('Service error', 400);
      mockTraditionsService.getSeasons.mockRejectedValue(httpError);

      await expect(controller.getSeasons(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(httpError);
    });

    it('should wrap generic errors in HttpError', async () => {
      const genericError = new Error('Generic error');
      mockTraditionsService.getSeasons.mockRejectedValue(genericError);

      await expect(controller.getSeasons(mockRequest as Request, mockResponse as Response))
        .rejects.toThrow(HttpError);

      const thrownError = await controller.getSeasons(mockRequest as Request, mockResponse as Response)
        .catch(err => err);
      
      expect(thrownError.statusCode).toBe(500);
      expect(thrownError.message).toBe('Failed to fetch seasons');
    });

    it('should return empty array when no seasons found', async () => {
      mockTraditionsService.getSeasons.mockResolvedValue([]);

      await controller.getSeasons(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        data: [],
        total: 0,
        year: expect.any(Number),
        traditionId: 'rcl',
        timestamp: expect.any(String),
      });
    });
  });
});