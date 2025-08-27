import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

// Lazy initialization to ensure database is connected
let calendarController: CalendarController;

const getController = (): CalendarController => {
  if (!calendarController) {
    calendarController = new CalendarController();
  }
  return calendarController;
};

/**
 * @swagger
 * /api/v1/calendar/current:
 *   get:
 *     operationId: getCurrentCalendar
 *     summary: Get current liturgical calendar information
 *     description: Retrieves the current liturgical season, year, and upcoming special days for today's date
 *     tags: [Calendar]
 *     parameters:
 *       - in: query
 *         name: tradition
 *         description: Lectionary tradition ID
 *         schema:
 *           type: string
 *           default: rcl
 *     responses:
 *       200:
 *         description: Current liturgical calendar information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     currentSeason:
 *                       $ref: '#/components/schemas/LiturgicalSeason'
 *                     currentYear:
 *                       type: integer
 *                     today:
 *                       type: string
 *                       format: date
 *                     upcomingSpecialDays:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date
 *                           daysUntil:
 *                             type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/current', asyncHandler((req, res) => getController().getCurrent(req, res)));

/**
 * @swagger
 * /api/v1/calendar/{year}:
 *   get:
 *     operationId: getCalendarByYear
 *     summary: Get liturgical calendar for a specific year
 *     description: Retrieves complete liturgical calendar information including all seasons and special days for the specified year
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         description: Liturgical year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tradition
 *         description: Lectionary tradition ID
 *         schema:
 *           type: string
 *           default: rcl
 *     responses:
 *       200:
 *         description: Liturgical calendar for the specified year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     year:
 *                       type: integer
 *                     tradition:
 *                       type: string
 *                     seasons:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LiturgicalSeason'
 *                     specialDays:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date
 *                           type:
 *                             type: string
 *       400:
 *         description: Invalid year
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Calendar not found for the specified year
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
router.get('/:year', asyncHandler((req, res) => getController().getByYear(req, res)));

/**
 * @swagger
 * /api/v1/calendar/{year}/seasons:
 *   get:
 *     operationId: getSeasonsByYear
 *     summary: Get liturgical seasons for a specific year
 *     description: Retrieves all liturgical seasons (Advent, Christmas, Lent, Easter, etc.) for the specified liturgical year
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         description: Liturgical year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tradition
 *         description: Lectionary tradition ID
 *         schema:
 *           type: string
 *           default: rcl
 *     responses:
 *       200:
 *         description: List of liturgical seasons for the year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LiturgicalSeason'
 *                 total:
 *                   type: integer
 *       400:
 *         description: Invalid year
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
router.get('/:year/seasons', asyncHandler((req, res) => getController().getSeasonsByYear(req, res)));

export { router as calendarRouter };