"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadingsService = void 0;
const database_service_1 = require("./database.service");
const reading_entity_1 = require("../models/reading.entity");
const tradition_entity_1 = require("../models/tradition.entity");
const logger_1 = require("../utils/logger");
const liturgical_calendar_service_1 = require("./liturgical-calendar.service");
/**
 * Composite traditions that map to underlying real traditions
 * based on the day of the week
 */
const COMPOSITE_TRADITION_MAP = {
    episcopal: { sunday: 'rcl', weekday: 'bcp' },
    ecusa: { sunday: 'rcl', weekday: 'bcp' },
};
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
    /**
     * Resolve a composite tradition to its underlying tradition based on the date
     */
    resolveCompositeTradition(traditionIdentifier, date) {
        const normalized = traditionIdentifier.toLowerCase();
        const composite = COMPOSITE_TRADITION_MAP[normalized];
        if (!composite) {
            return { tradition: traditionIdentifier, isComposite: false };
        }
        // Sunday = 0, Saturday = 6
        const isSunday = date.getDay() === 0;
        return {
            tradition: isSunday ? composite.sunday : composite.weekday,
            isComposite: true,
        };
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
            // Parse date string to avoid timezone issues - ensure we're working with the date as-is
            const [yearStr, monthStr, dayStr] = date.split('-');
            const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr), 12, 0, 0); // Set to noon to avoid timezone issues
            const year = dateObj.getFullYear();
            // Handle composite traditions (e.g., episcopal -> rcl for Sunday, bcp for weekday)
            const { tradition: resolvedTradition, isComposite } = this.resolveCompositeTradition(traditionIdentifier, dateObj);
            const originalTraditionId = traditionIdentifier.toLowerCase();
            // Look up the tradition UUID for the resolved tradition
            const traditionUuid = await this.getTraditionId(resolvedTradition);
            if (!traditionUuid) {
                logger_1.logger.warn(`Tradition not found: ${resolvedTradition} (resolved from ${traditionIdentifier})`);
                return null;
            }
            // Get liturgical information for this date
            const liturgicalInfo = this.calendarService.getLiturgicalYearInfo(year);
            const season = this.calendarService.getSeasonForDate(dateObj, year);
            const properNumber = this.calendarService.getProperNumber(dateObj, year);
            // Query the database for readings on this date using tradition UUID
            // Use QueryBuilder for better control over date comparison
            // Use CAST syntax instead of :: for proper parameter binding
            const readings = await repository
                .createQueryBuilder('reading')
                .leftJoinAndSelect('reading.tradition', 'tradition')
                .leftJoinAndSelect('reading.season', 'season')
                .leftJoinAndSelect('reading.liturgicalYear', 'liturgicalYear')
                .leftJoinAndSelect('reading.specialDay', 'specialDay')
                .where('reading.traditionId = :traditionUuid', { traditionUuid })
                .andWhere('reading.date = CAST(:date AS date)', { date })
                .orderBy('reading.readingOrder', 'ASC')
                .getMany();
            if (!readings || readings.length === 0) {
                logger_1.logger.warn(`No readings found for date ${date} and tradition ${resolvedTradition}${isComposite ? ` (from composite: ${originalTraditionId})` : ''} (UUID: ${traditionUuid})`);
                // Try to find readings by liturgical cycle and proper/season
                const alternateReadings = await this.findReadingsByLiturgicalContext(dateObj, traditionUuid, liturgicalInfo.cycle, season, properNumber);
                if (alternateReadings && alternateReadings.length > 0) {
                    // Use original tradition ID so composite traditions show correctly in response
                    return this.formatDailyReading(alternateReadings, date, originalTraditionId, season?.name || 'ordinary');
                }
                // Return null - no mock data fallback
                return null;
            }
            // Format and return the readings
            // Use original tradition ID so composite traditions show correctly in response
            return this.formatDailyReading(readings, date, originalTraditionId, readings[0].seasonId || season?.name || 'ordinary');
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
            // Note: scripture relation removed due to schema mismatch in production
            const readings = await repository.find({
                where: conditions,
                relations: ['tradition', 'season', 'liturgicalYear', 'specialDay'],
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
        // Extract liturgical metadata from the first reading's relations
        const firstReading = readings[0];
        const season = firstReading?.season;
        const liturgicalYear = firstReading?.liturgicalYear;
        const specialDay = firstReading?.specialDay;
        // Determine liturgical color: specialDay > season > null
        const liturgicalColor = specialDay?.liturgicalColor || season?.color || null;
        // Determine day name from specialDay or notes (for "Proper X" etc.)
        let dayName = null;
        if (specialDay?.name) {
            dayName = specialDay.name;
        }
        else if (firstReading?.notes) {
            // Check if notes contain a proper name like "Proper 16"
            dayName = firstReading.notes;
        }
        return {
            id: `${traditionId}-${date}`,
            date,
            traditionId,
            // Liturgical metadata
            season: season?.name || null,
            year: liturgicalYear?.cycle || null,
            dayName,
            liturgicalColor,
            // Legacy field for backwards compatibility
            seasonId,
            readings: readings.map(r => ({
                type: r.readingType,
                citation: r.scriptureReference,
                text: r.text || '',
                isAlternative: r.isAlternative || false,
                office: r.readingOffice || undefined,
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
            // Get count for pagination using QueryBuilder
            // Use CAST syntax instead of :: for proper parameter binding
            const total = await repository
                .createQueryBuilder('reading')
                .where('reading.traditionId = :traditionUuid', { traditionUuid })
                .andWhere('reading.date >= CAST(:startDate AS date)', { startDate })
                .andWhere('reading.date <= CAST(:endDate AS date)', { endDate })
                .getCount();
            // Get paginated readings using QueryBuilder
            const skip = (page - 1) * limit;
            const readings = await repository
                .createQueryBuilder('reading')
                .leftJoinAndSelect('reading.tradition', 'tradition')
                .leftJoinAndSelect('reading.season', 'season')
                .leftJoinAndSelect('reading.liturgicalYear', 'liturgicalYear')
                .leftJoinAndSelect('reading.specialDay', 'specialDay')
                .where('reading.traditionId = :traditionUuid', { traditionUuid })
                .andWhere('reading.date >= CAST(:startDate AS date)', { startDate })
                .andWhere('reading.date <= CAST(:endDate AS date)', { endDate })
                .orderBy('reading.date', 'ASC')
                .addOrderBy('reading.readingOrder', 'ASC')
                .skip(skip)
                .take(limit)
                .getMany();
            // Group readings by date
            const readingsByDate = new Map();
            readings.forEach(reading => {
                const dateStr = reading.date.toISOString().split('T')[0];
                if (!readingsByDate.has(dateStr)) {
                    readingsByDate.set(dateStr, []);
                }
                readingsByDate.get(dateStr).push(reading);
            });
            // Convert to DailyReading format using formatDailyReading for consistent metadata extraction
            const dailyReadings = Array.from(readingsByDate.entries()).map(([dateStr, dateReadings]) => {
                const dateObj = new Date(dateStr);
                const year = dateObj.getFullYear();
                const season = this.calendarService.getSeasonForDate(dateObj, year);
                return this.formatDailyReading(dateReadings, dateStr, traditionIdentifier, dateReadings[0].seasonId || season?.name || 'ordinary');
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
            // Note: scripture relation removed due to schema mismatch in production
            const readings = await repository.find({
                where: {
                    notes: `Proper ${properNumber}`,
                    traditionId: traditionUuid,
                    liturgicalYear: {
                        cycle: cycle,
                    },
                },
                relations: ['tradition', 'season', 'liturgicalYear', 'specialDay'],
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
            // Note: scripture relation removed due to schema mismatch in production
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
                relations: ['tradition', 'season', 'liturgicalYear', 'specialDay'],
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
            // Get daily office readings using QueryBuilder for proper date comparison
            // Use CAST syntax instead of :: for proper parameter binding
            const readings = await repository
                .createQueryBuilder('reading')
                .leftJoinAndSelect('reading.tradition', 'tradition')
                .leftJoinAndSelect('reading.season', 'season')
                .leftJoinAndSelect('reading.liturgicalYear', 'liturgicalYear')
                .leftJoinAndSelect('reading.specialDay', 'specialDay')
                .where('reading.date = CAST(:date AS date)', { date })
                .andWhere('reading.traditionId IS NOT NULL')
                .andWhere('reading.readingOffice IN (:...offices)', {
                offices: [reading_entity_1.ReadingOffice.MORNING, reading_entity_1.ReadingOffice.EVENING],
            })
                .orderBy('reading.readingOffice', 'ASC')
                .addOrderBy('reading.readingOrder', 'ASC')
                .getMany();
            if (!readings || readings.length === 0) {
                return null;
            }
            // Extract liturgical metadata from the first reading
            const firstReading = readings[0];
            const season = firstReading?.season;
            const liturgicalYear = firstReading?.liturgicalYear;
            const specialDay = firstReading?.specialDay;
            const liturgicalColor = specialDay?.liturgicalColor || season?.color || null;
            const dayName = specialDay?.name || firstReading?.notes || null;
            // Group by office (morning/evening)
            const morningReadings = readings.filter(r => r.readingOffice === reading_entity_1.ReadingOffice.MORNING);
            const eveningReadings = readings.filter(r => r.readingOffice === reading_entity_1.ReadingOffice.EVENING);
            // Format as DailyReading
            return {
                id: `bcp-daily-${date}`,
                date,
                traditionId: 'bcp-daily-office',
                // Liturgical metadata
                season: season?.name || null,
                year: liturgicalYear?.cycle || null,
                dayName,
                liturgicalColor,
                // Legacy field
                seasonId: season?.id || null,
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