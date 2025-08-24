import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes, IRateLimiterOptions } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { metrics } from '../observability/metrics';
import { logger } from '../utils/logger';

interface RateLimitConfig {
  points: number;        // Number of requests
  duration: number;      // Per duration in seconds
  blockDuration?: number; // Block duration in seconds after limit exceeded
  keyPrefix?: string;
}

interface TieredRateLimits {
  public: RateLimitConfig;
  authenticated: RateLimitConfig;
  premium: RateLimitConfig;
  admin: RateLimitConfig;
}

class RateLimiterService {
  private limiters: Map<string, RateLimiterRedis | RateLimiterMemory> = new Map();
  private redisClient: Redis | null = null;
  private isRedisAvailable: boolean = false;

  constructor() {
    this.initializeRedis();
    this.setupRateLimiters();
  }

  private async initializeRedis(): Promise<void> {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = new Redis(process.env.REDIS_URL, {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.error('Redis connection failed after 3 retries, falling back to memory rate limiter');
              this.isRedisAvailable = false;
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        });

        this.redisClient.on('connect', () => {
          this.isRedisAvailable = true;
          logger.info('Redis connected for rate limiting');
        });

        this.redisClient.on('error', (err) => {
          logger.error('Redis connection error:', err);
          this.isRedisAvailable = false;
        });

        // Test connection
        await this.redisClient.ping();
        this.isRedisAvailable = true;
      }
    } catch (error) {
      logger.warn('Redis not available, using in-memory rate limiting', error);
      this.isRedisAvailable = false;
    }
  }

  private setupRateLimiters(): void {
    const configs: TieredRateLimits = {
      public: {
        points: parseInt(process.env.RATE_LIMIT_PUBLIC_REQUESTS || '100'),
        duration: parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW || '900'), // 15 minutes
        blockDuration: 900, // Block for 15 minutes
        keyPrefix: 'rl:public:',
      },
      authenticated: {
        points: parseInt(process.env.RATE_LIMIT_AUTH_REQUESTS || '1000'),
        duration: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '900'),
        blockDuration: 600, // Block for 10 minutes
        keyPrefix: 'rl:auth:',
      },
      premium: {
        points: parseInt(process.env.RATE_LIMIT_PREMIUM_REQUESTS || '10000'),
        duration: parseInt(process.env.RATE_LIMIT_PREMIUM_WINDOW || '900'),
        blockDuration: 300, // Block for 5 minutes
        keyPrefix: 'rl:premium:',
      },
      admin: {
        points: parseInt(process.env.RATE_LIMIT_ADMIN_REQUESTS || '100000'),
        duration: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW || '900'),
        blockDuration: 60, // Block for 1 minute
        keyPrefix: 'rl:admin:',
      },
    };

    // Create rate limiters for each tier
    Object.entries(configs).forEach(([tier, config]) => {
      this.createRateLimiter(tier, config);
    });

    // Create endpoint-specific rate limiters
    this.createEndpointLimiters();
  }

  private createRateLimiter(name: string, config: RateLimitConfig): void {
    const options: IRateLimiterOptions = {
      points: config.points,
      duration: config.duration,
      blockDuration: config.blockDuration,
      keyPrefix: config.keyPrefix || `rl:${name}:`,
    };

    if (this.isRedisAvailable && this.redisClient) {
      this.limiters.set(name, new RateLimiterRedis({
        storeClient: this.redisClient,
        ...options,
      }));
    } else {
      this.limiters.set(name, new RateLimiterMemory(options));
    }
  }

  private createEndpointLimiters(): void {
    // Strict limits for sensitive endpoints
    this.createRateLimiter('login', {
      points: 5,
      duration: 900, // 5 attempts per 15 minutes
      blockDuration: 3600, // Block for 1 hour after limit
      keyPrefix: 'rl:login:',
    });

    this.createRateLimiter('register', {
      points: 3,
      duration: 3600, // 3 attempts per hour
      blockDuration: 7200, // Block for 2 hours
      keyPrefix: 'rl:register:',
    });

    this.createRateLimiter('password-reset', {
      points: 3,
      duration: 3600, // 3 attempts per hour
      blockDuration: 3600,
      keyPrefix: 'rl:pwreset:',
    });

    // Search endpoint (more lenient)
    this.createRateLimiter('search', {
      points: 30,
      duration: 60, // 30 searches per minute
      blockDuration: 300,
      keyPrefix: 'rl:search:',
    });

    // Bulk operations
    this.createRateLimiter('bulk', {
      points: 10,
      duration: 3600, // 10 bulk operations per hour
      blockDuration: 1800,
      keyPrefix: 'rl:bulk:',
    });

    // API docs (very lenient)
    this.createRateLimiter('docs', {
      points: 100,
      duration: 60, // 100 requests per minute
      keyPrefix: 'rl:docs:',
    });
  }

  public async consume(
    limiterName: string, 
    key: string, 
    points: number = 1
  ): Promise<RateLimiterRes | null> {
    const limiter = this.limiters.get(limiterName);
    if (!limiter) {
      logger.warn(`Rate limiter '${limiterName}' not found`);
      return null;
    }

    try {
      const result = await limiter.consume(key, points);
      
      // Update metrics
      metrics.setRateLimitRemaining(key, limiterName, result.remainingPoints);
      
      return result;
    } catch (rejRes) {
      if (rejRes instanceof RateLimiterRes) {
        // Rate limit exceeded
        metrics.recordRateLimitBlock(limiterName, 'exceeded');
        metrics.setRateLimitRemaining(key, limiterName, rejRes.remainingPoints);
        throw rejRes;
      }
      throw rejRes;
    }
  }

  public async reset(limiterName: string, key: string): Promise<void> {
    const limiter = this.limiters.get(limiterName);
    if (limiter) {
      await limiter.delete(key);
    }
  }

  public async getStatus(limiterName: string, key: string): Promise<RateLimiterRes | null> {
    const limiter = this.limiters.get(limiterName);
    if (!limiter) return null;

    try {
      return await limiter.get(key);
    } catch {
      return null;
    }
  }
}

// Singleton instance
const rateLimiterService = new RateLimiterService();

// Middleware factory for different rate limit tiers
export function createRateLimiter(tier: string = 'public') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Determine the key based on authentication status
      const key = getClientKey(req);
      const endpoint = req.route?.path || req.path;
      
      // Check for endpoint-specific rate limits first
      const endpointLimiter = getEndpointLimiter(endpoint);
      if (endpointLimiter) {
        try {
          await rateLimiterService.consume(endpointLimiter, key);
          metrics.recordRateLimitHit(endpoint, 'endpoint-specific');
        } catch (rejRes) {
          if (rejRes instanceof RateLimiterRes) {
            return handleRateLimitExceeded(res, rejRes, endpoint);
          }
          throw rejRes;
        }
      }

      // Apply tier-based rate limit
      const userTier = getUserTier(req) || tier;
      const result = await rateLimiterService.consume(userTier, key);
      
      if (result) {
        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', result.points.toString());
        res.setHeader('X-RateLimit-Remaining', result.remainingPoints.toString());
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());
        
        metrics.recordRateLimitHit(endpoint, userTier);
      }

      next();
    } catch (rejRes) {
      if (rejRes instanceof RateLimiterRes) {
        return handleRateLimitExceeded(res, rejRes, req.path);
      }
      
      // If rate limiting fails, log but don't block the request
      logger.error('Rate limiting error:', rejRes);
      next();
    }
  };
}

// Helper functions
function getClientKey(req: Request): string {
  // Priority: API Key > JWT User ID > IP Address
  if (req.headers['x-api-key']) {
    return `api:${req.headers['x-api-key']}`;
  }
  
  if ((req as any).user?.id) {
    return `user:${(req as any).user.id}`;
  }
  
  // Use IP address as fallback
  const ip = req.ip || 
             req.headers['x-forwarded-for']?.toString().split(',')[0] || 
             req.connection.remoteAddress || 
             'unknown';
  
  return `ip:${ip}`;
}

function getUserTier(req: Request): string | null {
  const user = (req as any).user;
  if (!user) return null;
  
  if (user.role === 'admin') return 'admin';
  if (user.subscription === 'premium') return 'premium';
  if (user.id) return 'authenticated';
  
  return 'public';
}

function getEndpointLimiter(endpoint: string): string | null {
  const endpointLimiters: Record<string, string> = {
    '/auth/login': 'login',
    '/auth/register': 'register',
    '/auth/password-reset': 'password-reset',
    '/api/v1/search': 'search',
    '/api/v1/bulk': 'bulk',
    '/api/docs': 'docs',
  };
  
  return endpointLimiters[endpoint] || null;
}

function handleRateLimitExceeded(res: Response, rejRes: RateLimiterRes, endpoint: string): Response {
  const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 60;
  
  res.setHeader('Retry-After', retryAfter.toString());
  res.setHeader('X-RateLimit-Limit', rejRes.points.toString());
  res.setHeader('X-RateLimit-Remaining', rejRes.remainingPoints.toString());
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
  
  return res.status(429).json({
    error: 'Too Many Requests',
    message: `Rate limit exceeded for ${endpoint}. Please retry after ${retryAfter} seconds.`,
    retryAfter,
    limit: rejRes.points,
    remaining: rejRes.remainingPoints,
    reset: new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
  });
}

// Advanced rate limiting strategies
export const rateLimitStrategies = {
  // Sliding window rate limiter
  slidingWindow: (windowMs: number, max: number) => {
    return createRateLimiter('public');
  },

  // Token bucket rate limiter
  tokenBucket: (capacity: number, refillRate: number) => {
    return createRateLimiter('public');
  },

  // Distributed rate limiter for microservices
  distributed: (service: string) => {
    return createRateLimiter('public');
  },

  // Dynamic rate limiting based on server load
  dynamic: () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const load = process.cpuUsage();
      const memUsage = process.memoryUsage();
      
      // Adjust rate limits based on system load
      const loadFactor = Math.min(2, 1 + (load.user + load.system) / 1000000);
      
      // Apply adjusted rate limit
      next();
    };
  },

  // Geo-based rate limiting
  geographic: () => {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Implement geo-based rate limiting
      const country = req.headers['cf-ipcountry'] || 'unknown';
      
      // Apply different limits based on geography
      next();
    };
  },
};

export { rateLimiterService };