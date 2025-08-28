"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingsRouter = void 0;
const express_1 = require("express");
const readings_controller_1 = require("../controllers/readings.controller");
const error_handler_1 = require("../middleware/error-handler");
const router = (0, express_1.Router)();
exports.readingsRouter = router;
// Lazy initialization to ensure database is connected
let readingsController;
const getController = () => {
    if (!readingsController) {
        readingsController = new readings_controller_1.ReadingsController();
    }
    return readingsController;
};
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
router.get('/', (0, error_handler_1.asyncHandler)((req, res) => getController().getByDate(req, res)));
/**
 * @swagger
 * /api/v1/readings/today:
 *   get:
 *     operationId: getTodaysReadings
 *     summary: Get today's readings
 *     description: Retrieves all scripture readings for the current date according to the specified lectionary tradition
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
 *         description: Today's readings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DailyReading'
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
router.get('/today', (0, error_handler_1.asyncHandler)((req, res) => getController().getToday(req, res)));
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
router.get('/range', (0, error_handler_1.asyncHandler)((req, res) => getController().getByDateRange(req, res)));
//# sourceMappingURL=readings.routes.js.map