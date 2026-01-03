import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Simple API key authentication middleware.
 *
 * Checks for API key in X-API-Key header and validates against
 * configured keys. Health and docs endpoints are excluded.
 */

// Load valid API keys from environment (comma-separated)
function getValidApiKeys(): Set<string> {
  const keys = process.env.API_KEYS?.split(',').map(k => k.trim()).filter(Boolean) || [];
  return new Set(keys);
}

/**
 * Middleware that requires a valid API key.
 * Returns 401 if key is missing or invalid.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'API key required. Provide X-API-Key header.',
    });
    return;
  }

  const validKeys = getValidApiKeys();

  if (validKeys.size === 0) {
    // No keys configured - log warning but allow in development
    if (process.env.NODE_ENV === 'production') {
      logger.error('SECURITY: No API_KEYS configured in production!');
      res.status(500).json({
        error: 'Server Configuration Error',
        message: 'Authentication not configured',
      });
      return;
    }
    // Development: allow any key
    req.apiKey = apiKey;
    next();
    return;
  }

  if (!validKeys.has(apiKey)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
    return;
  }

  // Valid key - attach to request and continue
  req.apiKey = apiKey;
  next();
}

/**
 * Optional auth - attaches API key if present, but doesn't require it.
 * Useful for endpoints that behave differently for authenticated users.
 */
export function optionalApiKey(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (apiKey) {
    const validKeys = getValidApiKeys();
    if (validKeys.size === 0 || validKeys.has(apiKey)) {
      req.apiKey = apiKey;
    }
  }

  next();
}
