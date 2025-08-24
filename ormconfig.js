const { DataSource } = require('typeorm');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'lectionary_api',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false, // Always false for migrations
  logging: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities: [
    path.join(__dirname, 'src/models/*.entity{.ts,.js}'),
    path.join(__dirname, 'dist/models/*.entity.js')
  ],
  migrations: [path.join(__dirname, 'src/migrations/*{.ts,.js}')],
  subscribers: [path.join(__dirname, 'src/subscribers/*{.ts,.js}')],
});

module.exports = AppDataSource;