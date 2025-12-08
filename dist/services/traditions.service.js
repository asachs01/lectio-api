"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraditionsService = void 0;
const database_service_1 = require("./database.service");
const tradition_entity_1 = require("../models/tradition.entity");
const season_entity_1 = require("../models/season.entity");
const liturgical_year_entity_1 = require("../models/liturgical-year.entity");
const logger_1 = require("../utils/logger");
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
            return traditions.map(t => this.mapTraditionToResponse(t));
        }
        catch (error) {
            logger_1.logger.error('Error fetching traditions:', error);
            // Return empty array on error
            return [];
        }
    }
    async getById(id) {
        try {
            this.ensureRepositories();
            // Try to find by abbreviation first (e.g., "rcl" -> "RCL")
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
            return null;
        }
    }
    async getSeasons(traditionId, year) {
        try {
            this.ensureRepositories();
            // First find the tradition
            const tradition = await this.traditionRepository.findOne({
                where: [
                    { abbreviation: traditionId.toUpperCase() },
                    { id: traditionId },
                ],
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
    mapSeasonToResponse(season, traditionId, year) {
        return {
            id: season.id,
            name: season.name,
            color: season.color || 'green',
            startDate: season.startDate?.toISOString().split('T')[0] || '',
            endDate: season.endDate?.toISOString().split('T')[0] || '',
            traditionId,
            year,
            createdAt: season.createdAt,
            updatedAt: season.updatedAt,
        };
    }
}
exports.TraditionsService = TraditionsService;
//# sourceMappingURL=traditions.service.js.map