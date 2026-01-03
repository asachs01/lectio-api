import request from 'supertest';
import { App } from '../../src/app';

// Mock the DatabaseService to avoid actual database connections
jest.mock('../../src/services/database.service');

// Test API key for authenticated requests
const TEST_API_KEY = 'test-api-key-12345';

describe('API Integration Tests', () => {
  let app: App;

  beforeAll(async () => {
    // Set up test API key
    process.env.API_KEYS = TEST_API_KEY;
    app = new App();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app.getApp())
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        environment: expect.any(String),
        version: expect.any(String),
      });
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('API Root', () => {
    it('should return HTML landing page', async () => {
      const response = await request(app.getApp())
        .get('/')
        .expect(200);

      // Verify HTML content type
      expect(response.headers['content-type']).toMatch(/text\/html/);

      // Verify the HTML contains expected content
      expect(response.text).toContain('Lectionary API');
      expect(response.text).toContain('API Documentation');
      expect(response.text).toContain('/api/docs');
    });
  });

  describe('Traditions API', () => {
    it('should get all traditions', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/traditions')
        .set('X-API-Key', TEST_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get tradition by id', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/traditions/rcl')
        .set('X-API-Key', TEST_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 'rcl');
      expect(response.body.data).toHaveProperty('name');
    });

    it('should return 404 for non-existent tradition', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/traditions/nonexistent')
        .set('X-API-Key', TEST_API_KEY)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });
  });

  describe('Readings API', () => {
    // TODO: These tests require database mock to return readings data
    // Currently skipped as the mock setup doesn't properly stub readings
    it.skip('should get today\'s readings', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/readings/today')
        .set('X-API-Key', TEST_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('readings');
      expect(Array.isArray(response.body.data.readings)).toBe(true);
    });

    it.skip('should get readings by date', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/readings?date=2024-12-25')
        .set('X-API-Key', TEST_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('date', '2024-12-25');
      expect(response.body.data).toHaveProperty('readings');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/readings?date=invalid-date')
        .set('X-API-Key', TEST_API_KEY)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('statusCode', 400);
    });
  });

  describe('Calendar API', () => {
    it('should get current calendar info', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/calendar/current')
        .set('X-API-Key', TEST_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('currentYear');
      expect(response.body.data).toHaveProperty('today');
    });

    it('should get calendar by year', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/calendar/2024')
        .set('X-API-Key', TEST_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('year', 2024);
      expect(response.body.data).toHaveProperty('seasons');
    });

    it('should return 400 for invalid year', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/calendar/invalid-year')
        .set('X-API-Key', TEST_API_KEY)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('statusCode', 400);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });
  });
});
