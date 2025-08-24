import { Request, Response, NextFunction } from 'express';
import { errorHandler, HttpError } from '../../../src/middleware/error-handler';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger');
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      originalUrl: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      body: { test: 'data' },
      params: { id: '123' },
      query: { page: '1' },
    };
    
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
    
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('HttpError class', () => {
    it('should create error with default values', () => {
      const error = new HttpError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
      expect(error.stack).toBeDefined();
    });

    it('should create error with custom values', () => {
      const details = { field: 'value' };
      const error = new HttpError('Custom error', 400, details);
      
      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.details).toBe(details);
    });
  });

  describe('errorHandler function', () => {
    it('should handle HttpError correctly', () => {
      const error = new HttpError('Test error', 400, { field: 'invalid' });
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          message: 'Test error',
          statusCode: 400,
          timestamp: expect.any(String),
        },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith('Client Error', expect.any(Object));
    });

    it('should handle generic Error with default status code', () => {
      const error = new Error('Generic error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          message: 'Generic error',
          statusCode: 500,
          timestamp: expect.any(String),
        },
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Internal Server Error', expect.any(Object));
    });

    it('should handle unknown error types', () => {
      const error = 'string error';
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          message: 'An error occurred',
          statusCode: 500,
          timestamp: expect.any(String),
        },
      });
    });

    it('should add stack trace and details in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new HttpError('Dev error', 400, { debug: true });
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          message: 'Dev error',
          statusCode: 400,
          timestamp: expect.any(String),
          stack: expect.any(String),
          details: { debug: true },
        },
      });
    });

    it('should handle ValidationError specifically', () => {
      const error = new HttpError('Validation failed', 400, { fields: ['name'] });
      error.name = 'ValidationError';
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          message: 'Validation failed',
          statusCode: 400,
          timestamp: expect.any(String),
          details: { fields: ['name'] },
        },
      });
    });

    it('should handle JWT errors', () => {
      const error = new HttpError('Token error', 401);
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          message: 'Invalid token',
          statusCode: 401,
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle expired token errors', () => {
      const error = new HttpError('Token expired', 401);
      error.name = 'TokenExpiredError';
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          message: 'Token expired',
          statusCode: 401,
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle unauthorized errors', () => {
      const error = new HttpError('Unauthorized', 401);
      error.name = 'UnauthorizedError';
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockJson).toHaveBeenCalledWith({
        error: {
          message: 'Unauthorized access',
          statusCode: 401,
          timestamp: expect.any(String),
        },
      });
    });

    it('should log different levels based on status code', () => {
      // Test 4xx error logging
      const clientError = new HttpError('Client error', 400);
      errorHandler(clientError, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockLogger.warn).toHaveBeenCalledWith('Client Error', expect.any(Object));

      jest.clearAllMocks();

      // Test 5xx error logging
      const serverError = new HttpError('Server error', 500);
      errorHandler(serverError, mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockLogger.error).toHaveBeenCalledWith('Internal Server Error', expect.any(Object));
    });

    it('should include request details in error log', () => {
      const error = new HttpError('Test error', 400);
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Client Error', {
        message: 'Test error',
        statusCode: 400,
        isOperational: true,
        stack: expect.any(String),
        url: '/api/test',
        method: 'GET',
        ip: '127.0.0.1',
        userAgent: 'test-user-agent',
        body: { test: 'data' },
        params: { id: '123' },
        query: { page: '1' },
      });
    });
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });
});