import { Router } from 'express';
import { traditionsRouter } from './traditions.routes';
import { readingsRouter } from './readings.routes';
import { calendarRouter } from './calendar.routes';

const router = Router();

// Version prefix
const API_VERSION = process.env.API_VERSION || 'v1';

// Mount route modules
router.use(`/${API_VERSION}/traditions`, traditionsRouter);
router.use(`/${API_VERSION}/readings`, readingsRouter);
router.use(`/${API_VERSION}/calendar`, calendarRouter);

// Root API info
router.get(`/${API_VERSION}`, (_req, res) => {
  res.json({
    message: 'Lectionary API',
    version: API_VERSION,
    endpoints: {
      traditions: `/${API_VERSION}/traditions`,
      readings: `/${API_VERSION}/readings`,
      calendar: `/${API_VERSION}/calendar`,
    },
    documentation: '/api/docs',
    health: '/health',
  });
});

export { router as apiRouter };