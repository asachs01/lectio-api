import { Router } from 'express';
import { ReadingsController } from '../controllers/readings.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

// Lazy initialization - controller created on first request
let readingsController: ReadingsController | null = null;

function getController(): ReadingsController {
  if (!readingsController) {
    readingsController = new ReadingsController();
  }
  return readingsController;
}

/**
 * @swagger
 * /api/v1/readings:
 *   get:
 *     operationId: getReadingsByDate
 *     summary: Get readings for a specific date
 *     description: Retrieves all scripture readings (First, Psalm, Second, Gospel) for a specific date according to the specified lectionary tradition
 *     tags: [Readings]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         description: Date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: tradition
 *         description: Lectionary tradition ID
 *         schema:
 *           type: string
 *           default: rcl
 *     responses:
 *       200:
 *         description: Daily readings for the specified date
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DailyReading'
 *       400:
 *         description: Invalid date format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No readings found for the specified date
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', asyncHandler((req, res) => getController().getByDate(req, res)));

/**
 * @swagger
 * /api/v1/readings/today:
 *   get:
 *     operationId: getTodaysReadings
 *     summary: Get today's readings
 *     description: |
 *       Retrieves all scripture readings for the current date, including both:
 *       - **Lectionary readings** (Sunday/special day readings from RCL or other traditions)
 *       - **Daily Office readings** (morning and evening prayer readings for every day)
 *
 *       On Sundays, both lectionary and daily office readings are typically available.
 *       On weekdays, only daily office readings are available for most traditions.
 *     tags: [Readings]
 *     parameters:
 *       - in: query
 *         name: tradition
 *         description: Lectionary tradition ID
 *         schema:
 *           type: string
 *           default: rcl
 *     responses:
 *       200:
 *         description: Today's readings (lectionary and/or daily office)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   format: date
 *                   description: Today's date in YYYY-MM-DD format
 *                 dayOfWeek:
 *                   type: string
 *                   description: Day of the week (e.g., "Sunday", "Monday")
 *                 tradition:
 *                   type: string
 *                   description: The lectionary tradition ID
 *                 lectionary:
 *                   type: object
 *                   description: Sunday/special day readings (if available)
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [sunday, special]
 *                     readings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reading'
 *                     seasonId:
 *                       type: string
 *                 dailyOffice:
 *                   type: object
 *                   description: Daily office readings for morning and evening prayer
 *                   properties:
 *                     morning:
 *                       type: array
 *                       nullable: true
 *                       items:
 *                         $ref: '#/components/schemas/Reading'
 *                     evening:
 *                       type: array
 *                       nullable: true
 *                       items:
 *                         $ref: '#/components/schemas/Reading'
 *                 data:
 *                   $ref: '#/components/schemas/DailyReading'
 *                   description: Backwards-compatible field (lectionary readings if available, otherwise daily office)
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: No readings found for today
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/today', asyncHandler((req, res) => getController().getToday(req, res)));

/**
 * @swagger
 * /api/v1/readings/range:
 *   get:
 *     operationId: getReadingsByDateRange
 *     summary: Get readings for a date range
 *     description: Retrieves all scripture readings within a specified date range with pagination support
 *     tags: [Readings]
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         description: Start date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end
 *         required: true
 *         description: End date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: tradition
 *         description: Lectionary tradition ID
 *         schema:
 *           type: string
 *           default: rcl
 *       - in: query
 *         name: page
 *         description: Page number for pagination
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         description: Number of results per page
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *     responses:
 *       200:
 *         description: List of readings for the date range
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DailyReading'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid date range
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/range', asyncHandler((req, res) => getController().getByDateRange(req, res)));

/**
 * @swagger
 * /api/v1/readings/daily-office:
 *   get:
 *     operationId: getDailyOfficeReadings
 *     summary: Get daily office readings
 *     description: Retrieves morning and evening prayer readings for a specific date from the Daily Office Lectionary
 *     tags: [Readings]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         description: Date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Daily office readings for the specified date
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DailyReading'
 *       400:
 *         description: Invalid date format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No daily office readings found for the specified date
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/daily-office', asyncHandler((req, res) => getController().getDailyOffice(req, res)));

export { router as readingsRouter };