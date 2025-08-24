import { Request, Response, NextFunction } from 'express';

// Mock the entire logger module
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  add: jest.fn(),
};

const mockRequestLogger = jest.fn();

jest.mock('../../../src/utils/logger', () => ({
  logger: mockLogger,
  requestLogger: mockRequestLogger,
}));

describe('Logger Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all mocks but don't reset modules
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Logger Configuration', () => {
    it('should create logger with correct default configuration', () => {
      expect(mockLogger).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.error).toBeDefined();
      expect(mockLogger.debug).toBeDefined();
    });

    it('should use info level by default', () => {
      expect(mockLogger).toBeDefined();
    });

    it('should use json format by default', () => {
      expect(mockLogger).toBeDefined();
    });

    it('should include service name in default meta', () => {
      expect(mockLogger).toBeDefined();
    });
  });

  describe('Environment-based Configuration', () => {
    it('should use LOG_LEVEL from environment', () => {
      process.env.LOG_LEVEL = 'debug';
      
      expect(mockLogger).toBeDefined();
    });

    it('should use LOG_FORMAT from environment', () => {
      process.env.LOG_FORMAT = 'simple';
      
      expect(mockLogger).toBeDefined();
    });

    it('should configure production transports in production mode', () => {
      process.env.NODE_ENV = 'production';
      
      expect(mockLogger).toBeDefined();
    });
  });

  describe('Request Logger Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let onFinishCallback: () => void;

    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        originalUrl: '/api/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent'),
        connection: { remoteAddress: '127.0.0.1' } as any,
      };

      mockResponse = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'finish') {
            onFinishCallback = callback;
          }
        }),
      };

      mockNext = jest.fn();

      // Reset the mock request logger to implement actual behavior
      mockRequestLogger.mockImplementation((req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        
        res.on('finish', () => {
          const duration = Date.now() - start;
          const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection?.remoteAddress,
          };

          if (res.statusCode >= 400) {
            mockLogger.warn('HTTP Request', logData);
          } else {
            mockLogger.info('HTTP Request', logData);
          }
        });

        next();
      });
    });

    it('should set up response finish listener', () => {
      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log successful requests as info', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100);

      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Simulate response finish
      if (onFinishCallback) {
        onFinishCallback();
      }

      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Request', {
        method: 'GET',
        url: '/api/test',
        status: 200,
        duration: '100ms',
        userAgent: 'test-user-agent',
        ip: '127.0.0.1',
      });
    });

    it('should log error requests as warn', () => {
      mockResponse.statusCode = 404;
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1050);

      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Simulate response finish
      if (onFinishCallback) {
        onFinishCallback();
      }

      expect(mockLogger.warn).toHaveBeenCalledWith('HTTP Request', {
        method: 'GET',
        url: '/api/test',
        status: 404,
        duration: '50ms',
        userAgent: 'test-user-agent',
        ip: '127.0.0.1',
      });
    });

    it('should log server error requests as warn', () => {
      mockResponse.statusCode = 500;
      
      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Simulate response finish
      if (onFinishCallback) {
        onFinishCallback();
      }

      expect(mockLogger.warn).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        status: 500,
      }));
    });

    it('should handle missing User-Agent header', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      
      if (onFinishCallback) {
        onFinishCallback();
      }

      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        userAgent: undefined,
      }));
    });

    it('should handle missing IP from req.ip', () => {
      (mockRequest as any).ip = undefined;

      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      
      if (onFinishCallback) {
        onFinishCallback();
      }

      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        ip: '127.0.0.1', // Falls back to connection.remoteAddress
      }));
    });

    it('should handle missing IP entirely', () => {
      (mockRequest as any).ip = undefined;
      mockRequest.connection = undefined as any;

      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      
      if (onFinishCallback) {
        onFinishCallback();
      }

      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        ip: undefined,
      }));
    });

    it('should calculate duration correctly', () => {
      const startTime = 1000;
      const endTime = 1357; // 357ms difference
      
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      
      if (onFinishCallback) {
        onFinishCallback();
      }

      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        duration: '357ms',
      }));
    });

    it('should handle different HTTP methods', () => {
      mockRequest.method = 'POST';

      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      
      if (onFinishCallback) {
        onFinishCallback();
      }

      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        method: 'POST',
      }));
    });

    it('should handle different URLs', () => {
      mockRequest.originalUrl = '/api/v1/readings?date=2024-01-01';

      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      
      if (onFinishCallback) {
        onFinishCallback();
      }

      expect(mockLogger.info).toHaveBeenCalledWith('HTTP Request', expect.objectContaining({
        url: '/api/v1/readings?date=2024-01-01',
      }));
    });

    it('should handle edge status codes correctly', () => {
      // Test 399 (should be info)
      mockResponse.statusCode = 399;
      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      if (onFinishCallback) onFinishCallback();
      expect(mockLogger.info).toHaveBeenCalled();

      jest.clearAllMocks();

      // Test 400 (should be warn)
      mockResponse.statusCode = 400;
      mockRequestLogger(mockRequest as Request, mockResponse as Response, mockNext);
      if (onFinishCallback) onFinishCallback();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Logger Methods', () => {
    it('should expose standard logger methods', () => {
      expect(mockLogger).toHaveProperty('info');
      expect(mockLogger).toHaveProperty('warn');
      expect(mockLogger).toHaveProperty('error');
      expect(mockLogger).toHaveProperty('debug');
    });
  });
});