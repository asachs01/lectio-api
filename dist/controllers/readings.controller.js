"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadingsController = void 0;
const readings_service_1 = require("../services/readings.service");
const error_handler_1 = require("../middleware/error-handler");
class ReadingsController {
    constructor() {
        this.readingsService = new readings_service_1.ReadingsService();
    }
    async getByDate(req, res) {
        try {
            const { date } = req.query;
            const tradition = req.query['tradition'] || 'rcl';
            if (!date) {
                throw new error_handler_1.HttpError('Date parameter is required', 400);
            }
            const dateStr = date;
            const traditionId = String(tradition);
            // Validate date format
            if (!this.isValidDate(dateStr)) {
                throw new error_handler_1.HttpError('Invalid date format. Use YYYY-MM-DD', 400);
            }
            const readings = await this.readingsService.getByDate(dateStr, traditionId);
            if (!readings) {
                throw new error_handler_1.HttpError(`No readings found for date '${dateStr}' in tradition '${traditionId}'`, 404);
            }
            res.json({
                data: readings,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error instanceof error_handler_1.HttpError) {
                throw error;
            }
            throw new error_handler_1.HttpError('Failed to fetch readings', 500, { originalError: error });
        }
    }
    async getToday(req, res) {
        try {
            const tradition = req.query['tradition'] || 'rcl';
            const today = new Date().toISOString().split('T')[0];
            const traditionId = String(tradition);
            const dayOfWeek = new Date(today).getDay();
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            // Get Sunday/special readings (RCL only has readings for Sundays and special days)
            const sundayReadings = await this.readingsService.getByDate(today, traditionId);
            // Always get daily office readings (available for every day)
            const dailyOfficeReadings = await this.readingsService.getDailyOfficeReadings(today);
            // Build response based on what's available
            const response = {
                date: today,
                dayOfWeek: dayNames[dayOfWeek],
                tradition: traditionId,
                timestamp: new Date().toISOString(),
            };
            // Include Sunday/special readings if available (typically only on Sundays)
            if (sundayReadings) {
                response.lectionary = {
                    type: dayOfWeek === 0 ? 'sunday' : 'special',
                    readings: sundayReadings.readings,
                    seasonId: sundayReadings.seasonId,
                };
            }
            // Include daily office readings (morning/evening prayer)
            if (dailyOfficeReadings) {
                const morningReadings = dailyOfficeReadings.readings.filter((r) => r.office === 'morning');
                const eveningReadings = dailyOfficeReadings.readings.filter((r) => r.office === 'evening');
                response.dailyOffice = {
                    morning: morningReadings.length > 0 ? morningReadings : null,
                    evening: eveningReadings.length > 0 ? eveningReadings : null,
                };
            }
            // If we have neither, return 404
            if (!sundayReadings && !dailyOfficeReadings) {
                throw new error_handler_1.HttpError('No readings found for today', 404);
            }
            // Also include a combined 'data' field for backwards compatibility
            // Use Sunday readings if available, otherwise daily office
            response.data = sundayReadings || dailyOfficeReadings;
            res.json(response);
        }
        catch (error) {
            if (error instanceof error_handler_1.HttpError) {
                throw error;
            }
            throw new error_handler_1.HttpError('Failed to fetch today\'s readings', 500, { originalError: error });
        }
    }
    async getByDateRange(req, res) {
        try {
            const { start, end, page = '1', limit = '10' } = req.query;
            const tradition = req.query['tradition'] || 'rcl';
            if (!start || !end) {
                throw new error_handler_1.HttpError('Start and end date parameters are required', 400);
            }
            const startDate = start;
            const endDate = end;
            const traditionId = String(tradition);
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            // Validate dates
            if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
                throw new error_handler_1.HttpError('Invalid date format. Use YYYY-MM-DD', 400);
            }
            if (new Date(startDate) > new Date(endDate)) {
                throw new error_handler_1.HttpError('Start date must be before end date', 400);
            }
            // Validate pagination
            if (isNaN(pageNum) || pageNum < 1) {
                throw new error_handler_1.HttpError('Page must be a positive integer', 400);
            }
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                throw new error_handler_1.HttpError('Limit must be a positive integer between 1 and 100', 400);
            }
            const result = await this.readingsService.getByDateRange(startDate, endDate, traditionId, pageNum, limitNum);
            res.json({
                data: result.readings,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limitNum),
                },
                dateRange: {
                    start: startDate,
                    end: endDate,
                },
                tradition: traditionId,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error instanceof error_handler_1.HttpError) {
                throw error;
            }
            throw new error_handler_1.HttpError('Failed to fetch readings for date range', 500, { originalError: error });
        }
    }
    async getDailyOffice(req, res) {
        try {
            const { date } = req.query;
            if (!date) {
                throw new error_handler_1.HttpError('Date parameter is required', 400);
            }
            const dateStr = date;
            // Validate date format
            if (!this.isValidDate(dateStr)) {
                throw new error_handler_1.HttpError('Invalid date format. Use YYYY-MM-DD', 400);
            }
            const readings = await this.readingsService.getDailyOfficeReadings(dateStr);
            if (!readings) {
                throw new error_handler_1.HttpError(`No daily office readings found for date '${dateStr}'`, 404);
            }
            res.json({
                data: readings,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            if (error instanceof error_handler_1.HttpError) {
                throw error;
            }
            throw new error_handler_1.HttpError('Failed to fetch daily office readings', 500, { originalError: error });
        }
    }
    isValidDate(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) {
            return false;
        }
        const date = new Date(dateString);
        // Check if date is valid (not NaN) and matches original string
        if (isNaN(date.getTime())) {
            return false;
        }
        try {
            return date.toISOString().split('T')[0] === dateString;
        }
        catch {
            return false;
        }
    }
}
exports.ReadingsController = ReadingsController;
//# sourceMappingURL=readings.controller.js.map