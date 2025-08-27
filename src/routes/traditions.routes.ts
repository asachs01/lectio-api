import { Router } from 'express';
import { TraditionsController } from '../controllers/traditions.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();
const traditionsController = new TraditionsController();

/**
 * @swagger
 * /api/v1/traditions:
 *   get:
 *     operationId: getAllTraditions
 *     summary: Get all lectionary traditions
 *     description: Retrieves a list of all available lectionary traditions (RCL, Catholic, Episcopal, Lutheran, etc.)
 *     tags: [Traditions]
 *     responses:
 *       200:
 *         description: List of all available lectionary traditions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LectionaryTradition'
 *                 total:
 *                   type: integer
 *                   description: Total number of traditions
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', asyncHandler(traditionsController.getAll.bind(traditionsController)));

/**
 * @swagger
 * /api/v1/traditions/{id}:
 *   get:
 *     operationId: getTraditionById
 *     summary: Get a specific lectionary tradition
 *     description: Retrieves detailed information about a specific lectionary tradition by its ID
 *     tags: [Traditions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Tradition ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tradition details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/LectionaryTradition'
 *       404:
 *         description: Tradition not found
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
router.get('/:id', asyncHandler(traditionsController.getById.bind(traditionsController)));

/**
 * @swagger
 * /api/v1/traditions/{id}/seasons:
 *   get:
 *     operationId: getTraditionSeasons
 *     summary: Get liturgical seasons for a tradition
 *     description: Retrieves all liturgical seasons (Advent, Christmas, Epiphany, Lent, Easter, Pentecost) for a specific tradition and optional year
 *     tags: [Traditions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Tradition ID
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         description: Liturgical year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of liturgical seasons
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
 *       404:
 *         description: Tradition not found
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
router.get('/:id/seasons', asyncHandler(traditionsController.getSeasons.bind(traditionsController)));

export { router as traditionsRouter };