const { DataSource } = require('typeorm');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config();

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Validate required credentials in production
if (isProduction && !process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD environment variable is required in production');
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || (isDevelopment ? 'password' : ''),
  database: process.env.DB_NAME || 'lectionary_api',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false, // Always false for migrations
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: process.env.NODE_ENV === 'production' 
    ? [path.join(__dirname, 'dist/models/*.entity.js')]
    : [
        path.join(__dirname, 'src/models/*.entity{.ts,.js}'),
        path.join(__dirname, 'dist/models/*.entity.js')
      ],
  migrations: process.env.NODE_ENV === 'production'
    ? [path.join(__dirname, 'dist/migrations/*.js')]
    : [path.join(__dirname, 'src/migrations/*{.ts,.js}')],
  subscribers: [path.join(__dirname, 'src/subscribers/*{.ts,.js}')],
});

module.exports = AppDataSource;