"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarController = void 0;
const calendar_service_1 = require("../services/calendar.service");
const error_handler_1 = require("../middleware/error-handler");
class CalendarController {
    constructor() {
        this.calendarService = new calendar_service_1.CalendarService();
    }
    async getByYear(req, res) {
        try {
            const { year } = req.params;
            const tradition = req.query['tradition'] || 'rcl';
            const liturgicalYear = parseInt(year, 10);
            const traditionId = String(tradition);
            if (isNaN(liturgicalYear) || liturgicalYear < 1900 || liturgicalYear > 2100) {
                throw new error_handler_1.HttpError('Invalid year parameter', 400);
            }
            const calendar = await this.calendarService.getByYear(liturgicalYear, traditionId);
            if (!calendar) {
                throw new error_handler_1.HttpError(`Calendar not found for year ${liturgicalYear} in tradition '${traditionId}'`, 404);
            }
            res.json({
                data: calendar,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error instanceof error_handler_1.HttpError) {
                throw error;
            }
            throw new error_handler_1.HttpError('Failed to fetch calendar', 500, { originalError: error });
        }
    }
    async getSeasonsByYear(req, res) {
        try {
            const { year } = req.params;
            const tradition = req.query['tradition'] || 'rcl';
            const liturgicalYear = parseInt(year, 10);
            const traditionId = String(tradition);
            if (isNaN(liturgicalYear) || liturgicalYear < 1900 || liturgicalYear > 2100) {
                throw new error_handler_1.HttpError('Invalid year parameter', 400);
            }
            const seasons = await this.calendarService.getSeasonsByYear(liturgicalYear, traditionId);
            res.json({
                data: seasons,
                total: seasons.length,
                year: liturgicalYear,
                tradition: traditionId,
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
    async getCurrent(req, res) {
        try {
            const tradition = req.query['tradition'] || 'rcl';
            const traditionId = String(tradition);
            const currentInfo = await this.calendarService.getCurrent(traditionId);
            res.json({
                data: currentInfo,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error instanceof error_handler_1.HttpError) {
                throw error;
            }
            throw new error_handler_1.HttpError('Failed to fetch current calendar information', 500, { originalError: error });
        }
    }
}
exports.CalendarController = CalendarController;
//# sourceMappingURL=calendar.controller.js.map