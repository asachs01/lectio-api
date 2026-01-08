"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraditionsService = void 0;
const database_service_1 = require("./database.service");
const tradition_entity_1 = require("../models/tradition.entity");
const season_entity_1 = require("../models/season.entity");
const liturgical_year_entity_1 = require("../models/liturgical-year.entity");
const logger_1 = require("../utils/logger");
/**
 * Virtual/composite traditions that don't exist as database records
 * but are served as combinations of real traditions
 */
const COMPOSITE_TRADITIONS = {
    episcopal: {
        id: 'episcopal',
        name: 'Episcopal Church Lectionary',
        abbreviation: 'ECUSA',
        description: 'The Episcopal Church uses the Revised Common Lectionary (RCL) for Sunday worship and the Book of Common Prayer (BCP) Daily Office Lectionary for weekday Morning and Evening Prayer. This composite tradition provides access to both.',
        startDate: '',
        endDate: '',
        createdAt: new Date(),
        updatedAt: new Date(),
    },
};
class TraditionsService {
    constructor() {
        try {
            const dataSource = database_service_1.DatabaseService.getDataSource();
            this.traditionRepository = dataSource.getRepository(tradition_entity_1.Tradition);
            this.seasonRepository = dataSource.getRepository(season_entity_1.Season);
            this.liturgicalYearRepository = dataSource.getRepository(liturgical_year_entity_1.LiturgicalYear);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize TraditionsService:', error);
        }
    }
    ensureRepositories() {
        if (!this.traditionRepository) {
            const dataSource = database_service_1.DatabaseService.getDataSource();
            this.traditionRepository = dataSource.getRepository(tradition_entity_1.Tradition);
            this.seasonRepository = dataSource.getRepository(season_entity_1.Season);
            this.liturgicalYearRepository = dataSource.getRepository(liturgical_year_entity_1.LiturgicalYear);
        }
    }
    async getAll() {
        try {
            this.ensureRepositories();
            const traditions = await this.traditionRepository.find({
                order: { name: 'ASC' },
            });
            // Map database traditions to response format
            const dbTraditions = traditions.map(t => this.mapTraditionToResponse(t));
            // Add composite/virtual traditions
            const compositeTraditions = Object.values(COMPOSITE_TRADITIONS);
            // Combine and sort by name
            return [...dbTraditions, ...compositeTraditions].sort((a, b) => a.name.localeCompare(b.name));
        }
        catch (error) {
            logger_1.logger.error('Error fetching traditions:', error);
            // Return at least the composite traditions on error
            return Object.values(COMPOSITE_TRADITIONS);
        }
    }
    async getById(id) {
        try {
            // First, check for composite/virtual traditions
            const normalizedId = id.toLowerCase();
            if (COMPOSITE_TRADITIONS[normalizedId]) {
                return COMPOSITE_TRADITIONS[normalizedId];
            }
            // Also check by abbreviation for composite traditions
            const compositeByAbbrev = Object.values(COMPOSITE_TRADITIONS).find(t => t.abbreviation.toLowerCase() === normalizedId);
            if (compositeByAbbrev) {
                return compositeByAbbrev;
            }
            this.ensureRepositories();
            // Try to find by abbreviation first (e.g., "rcl" -> "RCL", "bcp" -> "BCP")
            let tradition = await this.traditionRepository.findOne({
                where: { abbreviation: id.toUpperCase() },
            });
            // If not found, try by ID (UUID)
            if (!tradition) {
                tradition = await this.traditionRepository.findOne({
                    where: { id },
                });
            }
            // If still not found, try by name (case-insensitive)
            if (!tradition) {
                tradition = await this.traditionRepository.findOne({
                    where: { name: id },
                });
            }
            return tradition ? this.mapTraditionToResponse(tradition) : null;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching tradition ${id}:`, error);
            // Still return composite tradition if it matches, even on DB error
            const normalizedId = id.toLowerCase();
            return COMPOSITE_TRADITIONS[normalizedId] || null;
        }
    }
    async getSeasons(traditionId, year) {
        try {
            this.ensureRepositories();
            // Check if traditionId looks like a UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(traditionId);
            // First find the tradition - only query by UUID if it looks like one
            const whereConditions = [{ abbreviation: traditionId.toUpperCase() }];
            if (isUuid) {
                whereConditions.push({ id: traditionId });
            }
            const tradition = await this.traditionRepository.findOne({
                where: whereConditions,
            });
            if (!tradition) {
                logger_1.logger.warn(`Tradition not found: ${traditionId}`);
                return [];
            }
            // Find liturgical year for this tradition and year
            const liturgicalYear = await this.liturgicalYearRepository.findOne({
                where: {
                    traditionId: tradition.id,
                    year: year,
                },
            });
            if (!liturgicalYear) {
                logger_1.logger.warn(`Liturgical year not found for tradition ${traditionId} and year ${year}`);
                return [];
            }
            // Find seasons for this liturgical year
            const seasons = await this.seasonRepository.find({
                where: {
                    liturgicalYearId: liturgicalYear.id,
                },
                order: { startDate: 'ASC' },
            });
            return seasons.map(s => this.mapSeasonToResponse(s, traditionId, year));
        }
        catch (error) {
            logger_1.logger.error(`Error fetching seasons for ${traditionId}/${year}:`, error);
            return [];
        }
    }
    mapTraditionToResponse(tradition) {
        return {
            id: tradition.abbreviation?.toLowerCase() || tradition.id,
            name: tradition.name,
            abbreviation: tradition.abbreviation || tradition.name.substring(0, 3).toUpperCase(),
            description: tradition.description || '',
            startDate: '', // Would need liturgical year to determine
            endDate: '',
            createdAt: tradition.createdAt,
            updatedAt: tradition.updatedAt,
        };
    }
    formatDate(date) {
        if (!date) {
            return '';
        }
        if (typeof date === 'string') {
            return date.split('T')[0];
        }
        return date.toISOString().split('T')[0];
    }
    mapSeasonToResponse(season, traditionId, year) {
        return {
            id: season.id,
            name: season.name,
            color: season.color || 'green',
            startDate: this.formatDate(season.startDate),
            endDate: this.formatDate(season.endDate),
            traditionId,
            year,
            createdAt: season.createdAt,
            updatedAt: season.updatedAt,
        };
    }
}
exports.TraditionsService = TraditionsService;
//# sourceMappingURL=traditions.service.js.map