import { Router } from 'express';
import { TraditionsController } from '../controllers/traditions.controller';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

// Lazy initialization - controller created on first request
let traditionsController: TraditionsController | null = null;

function getController(): TraditionsController {
  if (!traditionsController) {
    traditionsController = new TraditionsController();
  }
  return traditionsController;
}

/**
 * @swagger
 * /api/v1/traditions:
 *   get:
 *     operationId: getAllTraditions
 *     summary: Get all lectionary traditions
 *     description: |
 *       Retrieves a list of all available lectionary traditions.
 *
 *       **Available Traditions:**
 *
 *       | ID | Name | Description |
 *       |----|------|-------------|
 *       | `rcl` | Revised Common Lectionary | Three-year Sunday lectionary used by most Protestant denominations |
 *       | `bcp` | BCP Daily Office Lectionary | Two-year weekday lectionary from the Book of Common Prayer |
 *       | `episcopal` | Episcopal Church Lectionary | Composite tradition: RCL for Sundays, BCP Daily Office for weekdays |
 *       | `rc` | Roman Catholic Lectionary | Three-year Sunday lectionary based on the Order of Readings for Mass |
 *
 *       **Note:** The `episcopal` tradition is a virtual/composite tradition that combines
 *       RCL readings for Sunday worship with BCP Daily Office readings for weekday
 *       Morning and Evening Prayer.
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
router.get('/', asyncHandler((req, res) => getController().getAll(req, res)));

/**
 * @swagger
 * /api/v1/traditions/{id}:
 *   get:
 *     operationId: getTraditionById
 *     summary: Get a specific lectionary tradition
 *     description: |
 *       Retrieves detailed information about a specific lectionary tradition by its ID or abbreviation.
 *
 *       **Valid IDs:**
 *       - `rcl` or `RCL` - Revised Common Lectionary
 *       - `bcp` or `BCP` - BCP Daily Office Lectionary
 *       - `episcopal` or `ECUSA` - Episcopal Church Lectionary (composite)
 *       - `rc` or `RC` - Roman Catholic Lectionary
 *
 *       IDs are case-insensitive.
 *     tags: [Traditions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Tradition ID or abbreviation (e.g., "rcl", "bcp", "episcopal")
 *         schema:
 *           type: string
 *           example: rcl
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
router.get('/:id', asyncHandler((req, res) => getController().getById(req, res)));

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
router.get('/:id/seasons', asyncHandler((req, res) => getController().getSeasons(req, res)));

export { router as traditionsRouter };