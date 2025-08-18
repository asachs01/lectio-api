declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      API_VERSION?: string;
      DB_HOST?: string;
      DB_PORT?: string;
      DB_NAME?: string;
      DB_USERNAME?: string;
      DB_PASSWORD?: string;
      DB_SSL?: string;
      REDIS_URL?: string;
      REDIS_PASSWORD?: string;
      JWT_SECRET?: string;
      JWT_EXPIRES_IN?: string;
      JWT_REFRESH_EXPIRES_IN?: string;
      API_KEY_SALT?: string;
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX_REQUESTS?: string;
      CORS_ORIGINS?: string;
      LOG_LEVEL?: string;
      LOG_FORMAT?: string;
      BIBLE_API_KEY?: string;
      SENTRY_DSN?: string;
      HEALTH_CHECK_URL?: string;
      SWAGGER_ENABLED?: string;
      DEBUG_MODE?: string;
    }
  }
}

export {};