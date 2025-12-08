import request from 'supertest';
import { App } from '../../src/app';

describe('API Integration Tests', () => {
  let app: App;

  beforeAll(async () => {
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
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get tradition by id', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/traditions/rcl')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 'rcl');
      expect(response.body.data).toHaveProperty('name');
    });

    it('should return 404 for non-existent tradition', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/traditions/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('statusCode', 404);
    });
  });

  describe('Readings API', () => {
    it('should get today\'s readings', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/readings/today')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('readings');
      expect(Array.isArray(response.body.data.readings)).toBe(true);
    });

    it('should get readings by date', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/readings?date=2024-12-25')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('date', '2024-12-25');
      expect(response.body.data).toHaveProperty('readings');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/readings?date=invalid-date')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('statusCode', 400);
    });
  });

  describe('Calendar API', () => {
    it('should get current calendar info', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/calendar/current')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('currentYear');
      expect(response.body.data).toHaveProperty('today');
    });

    it('should get calendar by year', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/calendar/2024')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('year', 2024);
      expect(response.body.data).toHaveProperty('seasons');
    });

    it('should return 400 for invalid year', async () => {
      const response = await request(app.getApp())
        .get('/api/v1/calendar/invalid-year')
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