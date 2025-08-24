import { Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import * as os from 'os';
import * as fs from 'fs';
import { promisify } from 'util';
import { logger } from '../observability/logger';

const fsAccess = promisify(fs.access);

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'pass' | 'warn' | 'fail';
      message?: string;
      duration?: number;
      metadata?: unknown;
    };
  };
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

interface ReadinessCheckResult extends HealthCheckResult {
  ready: boolean;
  dependencies: {
    [key: string]: boolean;
  };
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private dbPool: Pool | null = null;
  private redisClient: Redis | null = null;
  private startTime: Date;

  private constructor() {
    this.startTime = new Date();
  }

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  public setDatabasePool(pool: Pool): void {
    this.dbPool = pool;
  }

  public setRedisClient(client: Redis): void {
    this.redisClient = client;
  }

  // Liveness probe - checks if the application is running
  public async performLivenessCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    // Basic application health
    checks.application = {
      status: 'pass',
      message: 'Application is running',
      metadata: {
        pid: process.pid,
        nodeVersion: process.version,
      },
    };

    // Memory check
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;

    checks.memory = {
      status: memoryUsagePercent > 90 ? 'fail' : memoryUsagePercent > 80 ? 'warn' : 'pass',
      message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
      metadata: {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        freeSystemMemory: `${(freeMemory / 1024 / 1024).toFixed(2)} MB`,
      },
    };

    // CPU check
    const cpuUsage = process.cpuUsage();
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100;

    checks.cpu = {
      status: cpuPercent > 90 ? 'fail' : cpuPercent > 70 ? 'warn' : 'pass',
      message: `CPU usage: ${cpuPercent.toFixed(2)}%`,
      metadata: {
        user: `${(cpuUsage.user / 1000000).toFixed(2)}s`,
        system: `${(cpuUsage.system / 1000000).toFixed(2)}s`,
        cores: os.cpus().length,
        loadAverage: os.loadavg(),
      },
    };

    // Event loop lag check
    const lagStart = Date.now();
    await new Promise(resolve => setImmediate(resolve));
    const eventLoopLag = Date.now() - lagStart;

    checks.eventLoop = {
      status: eventLoopLag > 100 ? 'fail' : eventLoopLag > 50 ? 'warn' : 'pass',
      message: `Event loop lag: ${eventLoopLag}ms`,
      duration: eventLoopLag,
    };

    // File system check
    try {
      await fsAccess('./logs', fs.constants.W_OK);
      checks.filesystem = {
        status: 'pass',
        message: 'File system is accessible',
      };
    } catch (error) {
      checks.filesystem = {
        status: 'fail',
        message: 'File system is not accessible',
      };
    }

    // Calculate overall status
    const hasFailure = Object.values(checks).some(check => check.status === 'fail');
    const hasWarning = Object.values(checks).some(check => check.status === 'warn');

    const overallStatus: HealthCheckResult['status'] = 
      hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

    return {
      status: overallStatus,
      checks,
      version: process.env.SERVICE_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  // Readiness probe - checks if the application is ready to serve traffic
  public async performReadinessCheck(): Promise<ReadinessCheckResult> {
    const baseHealth = await this.performLivenessCheck();
    const checks = { ...baseHealth.checks };
    const dependencies: ReadinessCheckResult['dependencies'] = {};

    // Database check
    if (this.dbPool) {
      const dbStart = Date.now();
      try {
        await this.dbPool.query('SELECT 1');
        const duration = Date.now() - dbStart;
        
        checks.database = {
          status: duration > 1000 ? 'warn' : 'pass',
          message: 'Database is accessible',
          duration,
          metadata: {
            totalConnections: this.dbPool.totalCount,
            idleConnections: this.dbPool.idleCount,
            waitingConnections: this.dbPool.waitingCount,
          },
        };
        dependencies.database = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        checks.database = {
          status: 'fail',
          message: `Database connection failed: ${errorMessage}`,
          duration: Date.now() - dbStart,
        };
        dependencies.database = false;
        logger.error('Database health check failed', error as Error);
      }
    } else {
      checks.database = {
        status: 'warn',
        message: 'Database pool not initialized',
      };
      dependencies.database = false;
    }

    // Redis check
    if (this.redisClient) {
      const redisStart = Date.now();
      try {
        await this.redisClient.ping();
        const duration = Date.now() - redisStart;
        
        checks.redis = {
          status: duration > 100 ? 'warn' : 'pass',
          message: 'Redis is accessible',
          duration,
          metadata: {
            status: this.redisClient.status,
          },
        };
        dependencies.redis = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
        checks.redis = {
          status: 'fail',
          message: `Redis connection failed: ${errorMessage}`,
          duration: Date.now() - redisStart,
        };
        dependencies.redis = false;
        logger.error('Redis health check failed', error as Error);
      }
    } else {
      checks.redis = {
        status: 'warn',
        message: 'Redis client not initialized',
      };
      dependencies.redis = false;
    }

    // External API checks (if applicable)
    const externalAPIs = process.env.EXTERNAL_APIS?.split(',') || [];
    for (const apiUrl of externalAPIs) {
      const apiName = new URL(apiUrl).hostname;
      const apiStart = Date.now();
      
      try {
        const response = await fetch(apiUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        
        const duration = Date.now() - apiStart;
        checks[`external_${apiName}`] = {
          status: response.ok ? 'pass' : 'warn',
          message: `External API ${apiName} status: ${response.status}`,
          duration,
        };
        dependencies[apiName] = response.ok;
      } catch (error) {
        checks[`external_${apiName}`] = {
          status: 'fail',
          message: `External API ${apiName} unreachable`,
          duration: Date.now() - apiStart,
        };
        dependencies[apiName] = false;
      }
    }

    // Check if minimum dependencies are met
    const criticalDependencies = ['database']; // Add other critical dependencies
    const ready = criticalDependencies.every(dep => dependencies[dep] === true);

    // Calculate overall status
    const hasFailure = Object.values(checks).some(check => check.status === 'fail');
    const hasWarning = Object.values(checks).some(check => check.status === 'warn');

    const overallStatus: HealthCheckResult['status'] = 
      hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

    return {
      ...baseHealth,
      status: overallStatus,
      checks,
      ready,
      dependencies,
    };
  }

  // Startup probe - checks if the application has started successfully
  public async performStartupCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};

    // Check if all required environment variables are set
    const requiredEnvVars = [
      'NODE_ENV',
      'PORT',
      'DB_HOST',
      'DB_PORT',
      'DB_NAME',
      'JWT_SECRET',
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    checks.environment = {
      status: missingEnvVars.length > 0 ? 'fail' : 'pass',
      message: missingEnvVars.length > 0 
        ? `Missing environment variables: ${missingEnvVars.join(', ')}`
        : 'All required environment variables are set',
      metadata: {
        missing: missingEnvVars,
      },
    };

    // Check if required directories exist
    const requiredDirs = ['./logs', './dist'];
    const missingDirs: string[] = [];

    for (const dir of requiredDirs) {
      try {
        await fsAccess(dir, fs.constants.R_OK);
      } catch {
        missingDirs.push(dir);
      }
    }

    checks.directories = {
      status: missingDirs.length > 0 ? 'warn' : 'pass',
      message: missingDirs.length > 0
        ? `Missing directories: ${missingDirs.join(', ')}`
        : 'All required directories exist',
      metadata: {
        missing: missingDirs,
      },
    };

    // Check if the application has been running for at least 10 seconds
    const uptimeSeconds = process.uptime();
    checks.startup = {
      status: uptimeSeconds < 10 ? 'warn' : 'pass',
      message: `Application uptime: ${uptimeSeconds.toFixed(2)}s`,
      metadata: {
        startTime: this.startTime.toISOString(),
      },
    };

    // Calculate overall status
    const hasFailure = Object.values(checks).some(check => check.status === 'fail');
    const hasWarning = Object.values(checks).some(check => check.status === 'warn');

    const overallStatus: HealthCheckResult['status'] = 
      hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

    return {
      status: overallStatus,
      checks,
      version: process.env.SERVICE_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  // Deep health check - comprehensive system analysis
  public async performDeepHealthCheck(): Promise<Record<string, unknown>> {
    const [liveness, readiness, startup] = await Promise.all([
      this.performLivenessCheck(),
      this.performReadinessCheck(),
      this.performStartupCheck(),
    ]);

    // Additional deep checks
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      cpus: os.cpus().map(cpu => ({
        model: cpu.model,
        speed: `${cpu.speed} MHz`,
      })),
      networkInterfaces: Object.entries(os.networkInterfaces()).map(([name, interfaces]) => ({
        name,
        addresses: interfaces?.filter(i => i.family === 'IPv4').map(i => i.address),
      })),
    };

    return {
      liveness,
      readiness,
      startup,
      system: systemInfo,
      metrics: {
        // Include some key metrics
        httpRequestsTotal: await this.getMetricValue('http_requests_total'),
        activeConnections: await this.getMetricValue('active_connections'),
        errorRate: await this.getMetricValue('errors_total'),
      },
    };
  }

  private async getMetricValue(_metricName: string): Promise<number> {
    // This would integrate with your metrics system
    // For now, returning placeholder
    return 0;
  }
}

// Middleware functions
export const healthCheckService = HealthCheckService.getInstance();

export const livenessProbe = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await healthCheckService.performLivenessCheck();
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Liveness probe failed', error as Error);
    res.status(503).json({
      status: 'unhealthy',
      error: errorMessage,
    });
  }
};

export const readinessProbe = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await healthCheckService.performReadinessCheck();
    const statusCode = result.ready ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Readiness probe failed', error as Error);
    res.status(503).json({
      status: 'unhealthy',
      ready: false,
      error: errorMessage,
    });
  }
};

export const startupProbe = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await healthCheckService.performStartupCheck();
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Startup probe failed', error as Error);
    res.status(503).json({
      status: 'unhealthy',
      error: errorMessage,
    });
  }
};

export const deepHealthCheck = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await healthCheckService.performDeepHealthCheck();
    res.status(200).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Deep health check failed', error as Error);
    res.status(503).json({
      status: 'unhealthy',
      error: errorMessage,
    });
  }
};