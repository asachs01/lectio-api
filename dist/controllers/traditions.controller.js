"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraditionsController = void 0;
const traditions_service_1 = require("../services/traditions.service");
const error_handler_1 = require("../middleware/error-handler");
class TraditionsController {
    constructor() {
        this.traditionsService = new traditions_service_1.TraditionsService();
    }
    async getAll(_req, res) {
        try {
            const traditions = await this.traditionsService.getAll();
            res.json({
                data: traditions,
                total: traditions.length,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            throw new error_handler_1.HttpError('Failed to fetch traditions', 500, { originalError: error });
        }
    }
    async getById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new error_handler_1.HttpError('Tradition ID is required', 400);
            }
            const tradition = await this.traditionsService.getById(id);
            if (!tradition) {
                throw new error_handler_1.HttpError(`Tradition with ID '${id}' not found`, 404);
            }
            res.json({
                data: tradition,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error instanceof error_handler_1.HttpError) {
                throw error;
            }
            throw new error_handler_1.HttpError('Failed to fetch tradition', 500, { originalError: error });
        }
    }
    async getSeasons(req, res) {
        try {
            const { id } = req.params;
            const { year } = req.query;
            if (!id) {
                throw new error_handler_1.HttpError('Tradition ID is required', 400);
            }
            const liturgicalYear = year ? parseInt(year, 10) : new Date().getFullYear();
            if (isNaN(liturgicalYear) || liturgicalYear < 1900 || liturgicalYear > 2100) {
                throw new error_handler_1.HttpError('Invalid year parameter', 400);
            }
            const seasons = await this.traditionsService.getSeasons(id, liturgicalYear);
            res.json({
                data: seasons,
                total: seasons.length,
                year: liturgicalYear,
                traditionId: id,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error instanceof error_handler_1.HttpError) {
                throw error;
            }
            throw new error_handler_1.HttpError('Failed to fetch seasons', 500, { originalError: error });
        }
    }
}
exports.TraditionsController = TraditionsController;
//# sourceMappingURL=traditions.controller.js.map