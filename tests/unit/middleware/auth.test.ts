import { Request, Response, NextFunction } from 'express';
import { requireApiKey, optionalApiKey } from '../../../src/middleware/auth';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();

    // Reset environment
    delete process.env.API_KEYS;
    delete process.env.NODE_ENV;
  });

  describe('requireApiKey', () => {
    it('returns 401 when no API key provided', () => {
      requireApiKey(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'API key required. Provide X-API-Key header.',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('returns 401 when API key is invalid', () => {
      process.env.API_KEYS = 'valid-key-1,valid-key-2';
      mockReq.headers = { 'x-api-key': 'invalid-key' };

      requireApiKey(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('calls next() when API key is valid', () => {
      process.env.API_KEYS = 'valid-key-1,valid-key-2';
      mockReq.headers = { 'x-api-key': 'valid-key-1' };

      requireApiKey(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect((mockReq as Request).apiKey).toBe('valid-key-1');
    });

    it('accepts any key in development when no keys configured', () => {
      process.env.NODE_ENV = 'development';
      mockReq.headers = { 'x-api-key': 'any-key' };

      requireApiKey(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect((mockReq as Request).apiKey).toBe('any-key');
    });

    it('returns 500 in production when no keys configured', () => {
      process.env.NODE_ENV = 'production';
      mockReq.headers = { 'x-api-key': 'some-key' };

      requireApiKey(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Server Configuration Error',
        message: 'Authentication not configured',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('trims whitespace from configured keys', () => {
      process.env.API_KEYS = ' key-with-spaces , another-key ';
      mockReq.headers = { 'x-api-key': 'key-with-spaces' };

      requireApiKey(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('optionalApiKey', () => {
    it('calls next() without API key', () => {
      optionalApiKey(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect((mockReq as Request).apiKey).toBeUndefined();
    });

    it('attaches valid API key to request', () => {
      process.env.API_KEYS = 'valid-key';
      mockReq.headers = { 'x-api-key': 'valid-key' };

      optionalApiKey(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect((mockReq as Request).apiKey).toBe('valid-key');
    });

    it('does not attach invalid API key', () => {
      process.env.API_KEYS = 'valid-key';
      mockReq.headers = { 'x-api-key': 'invalid-key' };

      optionalApiKey(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect((mockReq as Request).apiKey).toBeUndefined();
    });
  });
});
