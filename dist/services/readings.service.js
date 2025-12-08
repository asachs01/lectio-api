"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadingsService = void 0;
const database_service_1 = require("./database.service");
const reading_entity_1 = require("../models/reading.entity");
const tradition_entity_1 = require("../models/tradition.entity");
const typeorm_1 = require("typeorm");
const logger_1 = require("../utils/logger");
const liturgical_calendar_service_1 = require("./liturgical-calendar.service");
class ReadingsService {
    constructor() {
        try {
            const dataSource = database_service_1.DatabaseService.getDataSource();
            this.readingRepository = dataSource.getRepository(reading_entity_1.Reading);
            this.traditionRepository = dataSource.getRepository(tradition_entity_1.Tradition);
            this.calendarService = new liturgical_calendar_service_1.LiturgicalCalendarService();
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize ReadingsService:', error);
            // Initialize later if database not ready yet
            this.calendarService = new liturgical_calendar_service_1.LiturgicalCalendarService();
        }
    }
    ensureRepository() {
        if (!this.readingRepository) {
            const dataSource = database_service_1.DatabaseService.getDataSource();
            this.readingRepository = dataSource.getRepository(reading_entity_1.Reading);
            this.traditionRepository = dataSource.getRepository(tradition_entity_1.Tradition);
        }
        return this.readingRepository;
    }
    /**
     * Look up tradition by abbreviation or ID and return its UUID
     */
    async getTraditionId(traditionIdentifier) {
        if (!this.traditionRepository) {
            const dataSource = database_service_1.DatabaseService.getDataSource();
            this.traditionRepository = dataSource.getRepository(tradition_entity_1.Tradition);
        }
        // Try by abbreviation first (e.g., "rcl" -> "RCL")
        let tradition = await this.traditionRepository.findOne({
            where: { abbreviation: traditionIdentifier.toUpperCase() },
        });
        // If not found, try by ID
        if (!tradition) {
            tradition = await this.traditionRepository.findOne({
                where: { id: traditionIdentifier },
            });
        }
        if (!tradition) {
            logger_1.logger.warn(`Tradition not found: ${traditionIdentifier}`);
            return null;
        }
        return tradition.id;
    }
    async getByDate(date, traditionIdentifier) {
        try {
            const repository = this.ensureRepository();
            // Look up the tradition UUID
            const traditionUuid = await this.getTraditionId(traditionIdentifier);
            if (!traditionUuid) {
                logger_1.logger.warn(`Tradition not found: ${traditionIdentifier}`);
                return null;
            }
            // Parse date string to avoid timezone issues - ensure we're working with the date as-is
            const [yearStr, monthStr, dayStr] = date.split('-');
            const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr), 12, 0, 0); // Set to noon to avoid timezone issues
            const year = dateObj.getFullYear();
            // Get liturgical information for this date
            const liturgicalInfo = this.calendarService.getLiturgicalYearInfo(year);
            const season = this.calendarService.getSeasonForDate(dateObj, year);
            const properNumber = this.calendarService.getProperNumber(dateObj, year);
            // Query the database for readings on this date using tradition UUID
            const readings = await repository.find({
                where: {
                    date: (0, typeorm_1.Raw)(alias => `${alias} = :date`, { date }),
                    traditionId: traditionUuid,
                },
                relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
                order: {
                    readingOrder: 'ASC',
                },
            });
            if (!readings || readings.length === 0) {
                logger_1.logger.warn(`No readings found for date ${date} and tradition ${traditionIdentifier} (UUID: ${traditionUuid})`);
                // Try to find readings by liturgical cycle and proper/season
                const alternateReadings = await this.findReadingsByLiturgicalContext(dateObj, traditionUuid, liturgicalInfo.cycle, season, properNumber);
                if (alternateReadings && alternateReadings.length > 0) {
                    return this.formatDailyReading(alternateReadings, date, traditionIdentifier, season?.name || 'ordinary');
                }
                // Return null - no mock data fallback
                return null;
            }
            // Format and return the readings
            return this.formatDailyReading(readings, date, traditionIdentifier, readings[0].seasonId || season?.name || 'ordinary');
        }
        catch (error) {
            logger_1.logger.error(`Error fetching readings for date ${date}:`, error);
            return null;
        }
    }
    async findReadingsByLiturgicalContext(_date, traditionUuid, cycle, season, properNumber) {
        try {
            const repository = this.ensureRepository();
            // Build query conditions based on liturgical context
            const conditions = {
                traditionId: traditionUuid,
            };
            // For Ordinary Time, look for readings by proper number
            if (season?.id === 'ordinary' && properNumber) {
                conditions.notes = `Proper ${properNumber}`;
            }
            // Add liturgical year cycle condition
            if (cycle) {
                conditions.liturgicalYear = {
                    yearCycle: cycle,
                };
            }
            const readings = await repository.find({
                where: conditions,
                relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
                order: {
                    readingOrder: 'ASC',
                },
            });
            return readings;
        }
        catch (error) {
            logger_1.logger.error('Error finding readings by liturgical context:', error);
            return [];
        }
    }
    formatDailyReading(readings, date, traditionId, seasonId) {
        return {
            id: `${traditionId}-${date}`,
            date,
            traditionId,
            seasonId,
            readings: readings.map(r => ({
                type: r.readingType,
                citation: r.scriptureReference,
                text: r.text || '',
                isAlternative: r.isAlternative || false,
            })),
            createdAt: readings[0]?.createdAt || new Date(),
            updatedAt: readings[0]?.updatedAt || new Date(),
        };
    }
    async getByDateRange(startDate, endDate, traditionIdentifier, page, limit) {
        try {
            const repository = this.ensureRepository();
            // Look up the tradition UUID
            const traditionUuid = await this.getTraditionId(traditionIdentifier);
            if (!traditionUuid) {
                logger_1.logger.warn(`Tradition not found: ${traditionIdentifier}`);
                return { readings: [], total: 0 };
            }
            // Get count for pagination
            const total = await repository.count({
                where: {
                    date: (0, typeorm_1.Raw)(alias => `${alias} >= :startDate AND ${alias} <= :endDate`, { startDate, endDate }),
                    traditionId: traditionUuid,
                },
            });
            // Get paginated readings
            const skip = (page - 1) * limit;
            const readings = await repository.find({
                where: {
                    date: (0, typeorm_1.Raw)(alias => `${alias} >= :startDate AND ${alias} <= :endDate`, { startDate, endDate }),
                    traditionId: traditionUuid,
                },
                relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
                order: {
                    date: 'ASC',
                    readingOrder: 'ASC',
                },
                skip,
                take: limit,
            });
            // Group readings by date
            const readingsByDate = new Map();
            readings.forEach(reading => {
                const dateStr = reading.date.toISOString().split('T')[0];
                if (!readingsByDate.has(dateStr)) {
                    readingsByDate.set(dateStr, []);
                }
                readingsByDate.get(dateStr).push(reading);
            });
            // Convert to DailyReading format
            const dailyReadings = Array.from(readingsByDate.entries()).map(([dateStr, dateReadings]) => {
                const dateObj = new Date(dateStr);
                const year = dateObj.getFullYear();
                const season = this.calendarService.getSeasonForDate(dateObj, year);
                return {
                    id: `${traditionIdentifier}-${dateStr}`,
                    date: dateStr,
                    traditionId: traditionIdentifier,
                    seasonId: dateReadings[0].seasonId || season?.name || 'ordinary',
                    readings: dateReadings.map(r => ({
                        type: r.readingType,
                        citation: r.scriptureReference,
                        text: r.text || '',
                        isAlternative: r.isAlternative || false,
                    })),
                    createdAt: dateReadings[0].createdAt,
                    updatedAt: dateReadings[0].updatedAt,
                };
            });
            // If no readings found in database, return empty result
            if (dailyReadings.length === 0) {
                logger_1.logger.warn(`No readings found for date range ${startDate} to ${endDate} in tradition ${traditionIdentifier}`);
                // Calculate how many days are in the range for proper response
                // const start = new Date(startDate);
                // const end = new Date(endDate);
                // const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                return {
                    readings: [],
                    total: 0,
                };
            }
            return {
                readings: dailyReadings,
                total: Math.ceil(total / 4), // Assuming 4 readings per day average
            };
        }
        catch (error) {
            logger_1.logger.error(`Error fetching readings for date range ${startDate} to ${endDate}:`, error);
            return {
                readings: [],
                total: 0,
            };
        }
    }
    async getReadingsByProper(properNumber, traditionIdentifier, cycle) {
        try {
            const repository = this.ensureRepository();
            // Look up the tradition UUID
            const traditionUuid = await this.getTraditionId(traditionIdentifier);
            if (!traditionUuid) {
                logger_1.logger.warn(`Tradition not found: ${traditionIdentifier}`);
                return null;
            }
            // Query for readings by proper number
            const readings = await repository.find({
                where: {
                    notes: `Proper ${properNumber}`,
                    traditionId: traditionUuid,
                    liturgicalYear: {
                        cycle: cycle,
                    },
                },
                relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
                order: {
                    readingOrder: 'ASC',
                },
            });
            if (!readings || readings.length === 0) {
                return null;
            }
            // Use a representative date for the proper
            const year = new Date().getFullYear();
            // For Proper 16, we can use a date around August 25
            // In reality, this would be calculated based on the liturgical calendar
            const date = `${year}-08-25`;
            return this.formatDailyReading(readings, date, traditionIdentifier, 'ordinary');
        }
        catch (error) {
            logger_1.logger.error(`Error fetching readings for Proper ${properNumber}:`, error);
            return null;
        }
    }
    async getReadingsBySeason(seasonId, traditionIdentifier, cycle) {
        try {
            const repository = this.ensureRepository();
            // Look up the tradition UUID
            const traditionUuid = await this.getTraditionId(traditionIdentifier);
            if (!traditionUuid) {
                logger_1.logger.warn(`Tradition not found: ${traditionIdentifier}`);
                return [];
            }
            const readings = await repository.find({
                where: {
                    season: {
                        id: seasonId,
                    },
                    traditionId: traditionUuid,
                    liturgicalYear: {
                        cycle: cycle,
                    },
                },
                relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
                order: {
                    date: 'ASC',
                    readingOrder: 'ASC',
                },
            });
            // Group by date and format
            const readingsByDate = new Map();
            readings.forEach(reading => {
                const dateStr = reading.date.toISOString().split('T')[0];
                if (!readingsByDate.has(dateStr)) {
                    readingsByDate.set(dateStr, []);
                }
                readingsByDate.get(dateStr).push(reading);
            });
            return Array.from(readingsByDate.entries()).map(([dateStr, dateReadings]) => this.formatDailyReading(dateReadings, dateStr, traditionIdentifier, seasonId));
        }
        catch (error) {
            logger_1.logger.error(`Error fetching readings for season ${seasonId}:`, error);
            return [];
        }
    }
    async getDailyOfficeReadings(date) {
        try {
            const repository = this.ensureRepository();
            // Import necessary operators
            const { Not, IsNull } = await Promise.resolve().then(() => __importStar(require('typeorm')));
            // Get daily office readings using Raw for proper date comparison
            const readings = await repository.find({
                where: {
                    date: (0, typeorm_1.Raw)(alias => `${alias} = :date`, { date }),
                    traditionId: Not(IsNull()),
                    readingOffice: (0, typeorm_1.In)([reading_entity_1.ReadingOffice.MORNING, reading_entity_1.ReadingOffice.EVENING]),
                },
                relations: ['tradition'],
                order: {
                    readingOffice: 'ASC',
                    readingOrder: 'ASC',
                },
            });
            if (!readings || readings.length === 0) {
                return null;
            }
            // Group by office (morning/evening)
            const morningReadings = readings.filter(r => r.readingOffice === reading_entity_1.ReadingOffice.MORNING);
            const eveningReadings = readings.filter(r => r.readingOffice === reading_entity_1.ReadingOffice.EVENING);
            // Format as DailyReading
            return {
                id: `daily-${date}`,
                date,
                traditionId: 'daily-office',
                seasonId: null,
                readings: [
                    ...morningReadings.map(r => ({
                        type: r.readingType,
                        citation: r.scriptureReference,
                        text: r.text || '',
                        isAlternative: r.isAlternative,
                        office: 'morning',
                    })),
                    ...eveningReadings.map(r => ({
                        type: r.readingType,
                        citation: r.scriptureReference,
                        text: r.text || '',
                        isAlternative: r.isAlternative,
                        office: 'evening',
                    })),
                ],
                createdAt: readings[0]?.createdAt || new Date(),
                updatedAt: readings[0]?.updatedAt || new Date(),
            };
        }
        catch (error) {
            logger_1.logger.error(`Error fetching daily office readings for ${date}:`, error);
            return null;
        }
    }
}
exports.ReadingsService = ReadingsService;
//# sourceMappingURL=readings.service.js.map