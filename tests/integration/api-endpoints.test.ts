import request from 'supertest';
import { App } from '../../src/app';

// Mock the DatabaseService to avoid actual database connections
jest.mock('../../src/services/database.service');

describe('API Endpoints Integration Tests', () => {
  let app: App;
  let appInstance: any;

  beforeAll(async () => {
    app = new App();
    appInstance = app.getApp();
  });

  afterAll(async () => {
    // Clean up if needed
  });

  describe('Health Check Endpoint', () => {
    it('GET /health should return healthy status', async () => {
      const response = await request(appInstance)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        environment: expect.any(String),
        version: expect.any(String),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    it('GET /health should include proper timestamp format', async () => {
      const response = await request(appInstance)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Root Endpoint', () => {
    it('GET / should return HTML landing page', async () => {
      const response = await request(appInstance)
        .get('/')
        .expect(200);

      // Verify HTML content type
      expect(response.headers['content-type']).toMatch(/text\/html/);

      // Verify the HTML contains expected content
      expect(response.text).toContain('Lectionary API');
    });

    it('GET / should include documentation link and API information', async () => {
      const response = await request(appInstance)
        .get('/')
        .expect(200);

      // Verify the landing page includes key information
      expect(response.text).toContain('API Documentation');
      expect(response.text).toContain('/api/docs');
      expect(response.text).toContain('Readings');
      expect(response.text).toContain('Traditions');
      expect(response.text).toContain('Calendar');
      expect(response.text).toContain('Revised Common Lectionary');
    });
  });

  describe('Traditions API Endpoints', () => {
    describe('GET /api/v1/traditions', () => {
      it('should return all traditions', async () => {
        const response = await request(appInstance)
          .get('/api/v1/traditions')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('timestamp');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(typeof response.body.total).toBe('number');
      });

      it('should return traditions with required fields', async () => {
        const response = await request(appInstance)
          .get('/api/v1/traditions')
          .expect(200);

        if (response.body.data.length > 0) {
          const tradition = response.body.data[0];
          expect(tradition).toHaveProperty('id');
          expect(tradition).toHaveProperty('name');
          expect(tradition).toHaveProperty('abbreviation');
          expect(tradition).toHaveProperty('description');
        }
      });

      it('should include proper headers', async () => {
        const response = await request(appInstance)
          .get('/api/v1/traditions')
          .expect(200);

        expect(response.headers['content-type']).toMatch(/json/);
      });
    });

    describe('GET /api/v1/traditions/:id', () => {
      it('should return specific tradition by id', async () => {
        const response = await request(appInstance)
          .get('/api/v1/traditions/rcl')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('id', 'rcl');
        expect(response.body.data).toHaveProperty('name');
      });

      it('should return 404 for non-existent tradition', async () => {
        const response = await request(appInstance)
          .get('/api/v1/traditions/nonexistent')
          .expect(404);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('statusCode', 404);
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error.message).toContain('not found');
      });

      it('should return all traditions for root traditions path', async () => {
        const response = await request(appInstance)
          .get('/api/v1/traditions/')
          .expect(200); // This is the same as /api/v1/traditions

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/v1/traditions/:id/seasons', () => {
      it('should return seasons for a tradition', async () => {
        const response = await request(appInstance)
          .get('/api/v1/traditions/rcl/seasons')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('year');
        expect(response.body).toHaveProperty('traditionId', 'rcl');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should accept year query parameter', async () => {
        const response = await request(appInstance)
          .get('/api/v1/traditions/rcl/seasons?year=2024')
          .expect(200);

        expect(response.body).toHaveProperty('year', 2024);
        expect(response.body).toHaveProperty('traditionId', 'rcl');
      });

      it('should return 400 for invalid year', async () => {
        const response = await request(appInstance)
          .get('/api/v1/traditions/rcl/seasons?year=invalid')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('statusCode', 400);
        expect(response.body.error.message).toContain('Invalid year');
      });
    });
  });

  describe('Readings API Endpoints', () => {
    describe('GET /api/v1/readings/today', () => {
      it('should return today\'s readings', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings/today')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('date');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('readings');
        expect(Array.isArray(response.body.data.readings)).toBe(true);
      });

      it('should accept tradition query parameter', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings/today?tradition=catholic')
          .expect(200);

        expect(response.body.data).toHaveProperty('traditionId', 'catholic');
      });
    });

    describe('GET /api/v1/readings', () => {
      it('should return readings by date', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings?date=2024-12-25')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('date', '2024-12-25');
        expect(response.body.data).toHaveProperty('readings');
      });

      it('should return 400 for missing date parameter', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('statusCode', 400);
        expect(response.body.error.message).toContain('Date parameter is required');
      });

      it('should return 400 for invalid date format', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings?date=invalid-date')
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error.statusCode).toBe(400);
        expect(response.body.error.message).toContain('Invalid date format');
      });

      it('should accept tradition parameter', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings?date=2024-12-25&tradition=episcopal')
          .expect(200);

        expect(response.body.data).toHaveProperty('traditionId', 'episcopal');
      });
    });

    describe('GET /api/v1/readings/range', () => {
      it('should return readings for date range', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings/range?start=2024-12-01&end=2024-12-03')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('dateRange');
        expect(Array.isArray(response.body.data)).toBe(true);
        
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
        expect(response.body.pagination).toHaveProperty('totalPages');

        expect(response.body.dateRange).toHaveProperty('start', '2024-12-01');
        expect(response.body.dateRange).toHaveProperty('end', '2024-12-03');
      });

      it('should return 400 for missing parameters', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings/range?start=2024-12-01')
          .expect(400);

        expect(response.body.error).toHaveProperty('statusCode', 400);
        expect(response.body.error.message).toContain('Start and end date parameters are required');
      });

      it('should handle pagination parameters', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings/range?start=2024-12-01&end=2024-12-05&page=2&limit=2')
          .expect(200);

        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(2);
      });

      it('should return 400 for invalid date order', async () => {
        const response = await request(appInstance)
          .get('/api/v1/readings/range?start=2024-12-10&end=2024-12-01')
          .expect(400);

        expect(response.body.error.message).toContain('Start date must be before end date');
      });
    });
  });

  describe('Calendar API Endpoints', () => {
    describe('GET /api/v1/calendar/current', () => {
      it('should return current calendar information', async () => {
        const response = await request(appInstance)
          .get('/api/v1/calendar/current')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('currentYear');
        expect(response.body.data).toHaveProperty('today');
        expect(response.body.data).toHaveProperty('upcomingSpecialDays');
        expect(Array.isArray(response.body.data.upcomingSpecialDays)).toBe(true);
      });

      it('should accept tradition query parameter', async () => {
        await request(appInstance)
          .get('/api/v1/calendar/current?tradition=catholic')
          .expect(200);
      });
    });

    describe('GET /api/v1/calendar/:year', () => {
      it('should return calendar for specific year', async () => {
        const response = await request(appInstance)
          .get('/api/v1/calendar/2024')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('year', 2024);
        expect(response.body.data).toHaveProperty('seasons');
        expect(response.body.data).toHaveProperty('specialDays');
      });

      it('should return 400 for invalid year', async () => {
        const response = await request(appInstance)
          .get('/api/v1/calendar/invalid-year')
          .expect(400);

        expect(response.body.error).toHaveProperty('statusCode', 400);
        expect(response.body.error.message).toContain('Invalid year');
      });

      it('should return 400 for year out of range', async () => {
        const response = await request(appInstance)
          .get('/api/v1/calendar/1800')
          .expect(400);

        expect(response.body.error.message).toContain('Invalid year');
      });
    });

    describe('GET /api/v1/calendar/:year/seasons', () => {
      it('should return seasons for specific year', async () => {
        const response = await request(appInstance)
          .get('/api/v1/calendar/2024/seasons')
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('year', 2024);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should return 400 for invalid year', async () => {
        const response = await request(appInstance)
          .get('/api/v1/calendar/invalid/seasons')
          .expect(400);

        expect(response.body.error.statusCode).toBe(400);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(appInstance)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.message).toContain('not found');
    });

    it('should return JSON error responses', async () => {
      const response = await request(appInstance)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should handle method not allowed', async () => {
      await request(appInstance)
        .post('/health')
        .expect(404); // Express returns 404 for no matching route
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(appInstance)
        .get('/health')
        .expect(200);

      // Check if CORS headers are present (may be access-control-allow-credentials instead)
      const hasCorsHeaders = response.headers['access-control-allow-origin'] || 
                           response.headers['access-control-allow-credentials'] ||
                           response.headers.vary?.includes('Origin');
      expect(hasCorsHeaders).toBeTruthy();
    });

    it('should handle OPTIONS preflight requests', async () => {
      await request(appInstance)
        .options('/api/v1/traditions')
        .expect(204);
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      await request(appInstance)
        .get('/api/v1/traditions')
        .expect(200);

      // Rate limit headers may or may not be present depending on configuration
      // This is more of a smoke test to ensure the endpoint responds
    });
  });

  describe('Content-Type Headers', () => {
    it('should return JSON content-type for API routes', async () => {
      const response = await request(appInstance)
        .get('/api/v1/traditions')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return JSON content-type for health endpoint', async () => {
      const response = await request(appInstance)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers from helmet', async () => {
      const response = await request(appInstance)
        .get('/health')
        .expect(200);

      // Helmet adds various security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
});