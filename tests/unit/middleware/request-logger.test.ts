import { Request, Response, NextFunction } from 'express';
import { requestLogger } from '../../../src/middleware/request-logger';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger');
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Request Logger Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let onFinishCallback: (() => void) | undefined;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'User-Agent') return 'test-user-agent';
        if (header === 'Content-Type') return 'application/json';
        if (header === 'Content-Length') return undefined;
        return undefined;
      }),
      connection: { remoteAddress: '127.0.0.1' } as any,
    };
    
    mockResponse = {
      statusCode: 200,
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'Content-Length') return 'application/json';
        return undefined;
      }),
      on: jest.fn().mockImplementation((event: string, callback: () => void) => {
        if (event === 'finish') {
          onFinishCallback = callback;
        }
      }),
    };
    
    mockNext = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock Date.now for consistent duration testing
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log incoming request information', () => {
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockLogger.info).toHaveBeenCalledWith('Incoming Request', {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      userAgent: 'test-user-agent',
      contentType: 'application/json',
      contentLength: undefined,
    });
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle missing headers gracefully', () => {
    mockRequest.get = jest.fn().mockReturnValue(undefined);
    
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockLogger.info).toHaveBeenCalledWith('Incoming Request', {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      userAgent: undefined,
      contentType: undefined,
      contentLength: undefined,
    });
  });

  it('should log response information on finish', () => {
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1150);
    
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    // Trigger the finish event
    if (onFinishCallback) {
      onFinishCallback();
    }
    
    expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(mockLogger.info).toHaveBeenCalledWith('HTTP Response', {
      method: 'GET',
      url: '/api/test',
      status: 200,
      duration: '150ms',
      contentLength: 'application/json',
      ip: '127.0.0.1',
    });
  });

  it('should handle different HTTP methods', () => {
    mockRequest.method = 'POST';
    
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockLogger.info).toHaveBeenCalledWith('Incoming Request', 
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should handle client error status codes', () => {
    mockResponse.statusCode = 404;
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100);
    
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    // Trigger the finish event
    if (onFinishCallback) {
      onFinishCallback();
    }
    
    expect(mockLogger.warn).toHaveBeenCalledWith('HTTP Response', 
      expect.objectContaining({
        status: 404,
        duration: '100ms',
      })
    );
  });

  it('should handle server error status codes', () => {
    mockResponse.statusCode = 500;
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1250);
    
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    // Trigger the finish event
    if (onFinishCallback) {
      onFinishCallback();
    }
    
    expect(mockLogger.error).toHaveBeenCalledWith('HTTP Response', 
      expect.objectContaining({
        status: 500,
        duration: '250ms',
      })
    );
  });

  it('should handle missing IP gracefully', () => {
    (mockRequest as any).ip = undefined;
    
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockLogger.info).toHaveBeenCalledWith('Incoming Request', 
      expect.objectContaining({
        ip: '127.0.0.1', // Should fall back to connection.remoteAddress
      })
    );
  });

  it('should handle missing IP and connection gracefully', () => {
    (mockRequest as any).ip = undefined;
    mockRequest.connection = undefined as any;
    
    requestLogger(mockRequest as Request, mockResponse as Response, mockNext);
    
    expect(mockLogger.info).toHaveBeenCalledWith('Incoming Request', 
      expect.objectContaining({
        ip: undefined,
      })
    );
  });
});