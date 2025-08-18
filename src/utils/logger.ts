import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';

// Define custom log format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat === 'json' ? customFormat : developmentFormat,
  defaultMeta: { service: 'lectionary-api' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? customFormat : developmentFormat,
    }),
  ],
});

// Add file transports for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: customFormat,
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: customFormat,
  }));
}

// Create HTTP request logger
export const requestLogger = (req: any, res: any, next: any): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};