"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const database_service_1 = require("./database.service");
const special_day_entity_1 = require("../models/special-day.entity");
const tradition_entity_1 = require("../models/tradition.entity");
const liturgical_year_entity_1 = require("../models/liturgical-year.entity");
class CalendarService {
    getTraditionRepository() {
        return database_service_1.DatabaseService.getDataSource().getRepository(tradition_entity_1.Tradition);
    }
    getSpecialDayRepository() {
        return database_service_1.DatabaseService.getDataSource().getRepository(special_day_entity_1.SpecialDay);
    }
    getLiturgicalYearRepository() {
        return database_service_1.DatabaseService.getDataSource().getRepository(liturgical_year_entity_1.LiturgicalYear);
    }
    async findTraditionByAbbreviation(traditionId) {
        const traditionRepo = this.getTraditionRepository();
        return await traditionRepo.findOne({
            where: { abbreviation: traditionId.toUpperCase() },
        });
    }
    async getByYear(year, traditionId) {
        // TODO: Implement database query
        const seasons = await this.getSeasonsByYear(year, traditionId);
        const specialDays = await this.getSpecialDaysByYear(year, traditionId);
        return {
            id: `${traditionId}-${year}`,
            year,
            traditionId,
            seasons,
            specialDays,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async getSeasonsByYear(year, traditionId) {
        const tradition = await this.findTraditionByAbbreviation(traditionId);
        if (!tradition) {
            return [];
        }
        const liturgicalYearRepo = this.getLiturgicalYearRepository();
        const liturgicalYear = await liturgicalYearRepo.findOne({
            where: {
                year,
                tradition: { id: tradition.id },
            },
            relations: ['seasons'],
        });
        if (!liturgicalYear || !liturgicalYear.seasons) {
            return [];
        }
        return liturgicalYear.seasons.map(season => ({
            id: season.id,
            name: season.name,
            color: season.color,
            startDate: typeof season.startDate === 'string' ? season.startDate : season.startDate.toISOString().split('T')[0],
            endDate: typeof season.endDate === 'string' ? season.endDate : season.endDate.toISOString().split('T')[0],
            traditionId,
            year,
            createdAt: season.createdAt,
            updatedAt: season.updatedAt,
        }));
    }
    async getSpecialDaysByYear(year, traditionId) {
        const tradition = await this.findTraditionByAbbreviation(traditionId);
        if (!tradition) {
            return [];
        }
        const specialDayRepo = this.getSpecialDayRepository();
        const specialDays = await specialDayRepo.find({
            where: {
                year,
                tradition: { id: tradition.id },
            },
            order: { date: 'ASC' },
        });
        return specialDays.map(day => ({
            id: day.id,
            name: day.name,
            date: day.date.toISOString().split('T')[0],
            type: day.type,
            traditionId,
            year,
            createdAt: day.createdAt,
            updatedAt: day.updatedAt,
        }));
    }
    async getCurrent(traditionId) {
        const today = new Date();
        const currentYear = today.getFullYear();
        const todayStr = today.toISOString().split('T')[0];
        const tradition = await this.findTraditionByAbbreviation(traditionId);
        if (!tradition) {
            return {
                currentSeason: null,
                currentYear,
                today: todayStr,
                upcomingSpecialDays: [],
            };
        }
        // Find current liturgical year - check both current year and previous year
        // since liturgical years span calendar years
        const liturgicalYearRepo = this.getLiturgicalYearRepository();
        const liturgicalYears = await liturgicalYearRepo.find({
            where: [
                { year: currentYear, tradition: { id: tradition.id } },
                { year: currentYear - 1, tradition: { id: tradition.id } },
            ],
            relations: ['seasons'],
        });
        // Find which liturgical year contains today's date
        let currentLiturgicalYear = null;
        let allSeasons = [];
        for (const liturgicalYear of liturgicalYears) {
            if (liturgicalYear.seasons) {
                allSeasons = allSeasons.concat(liturgicalYear.seasons);
                // Check if today falls within this liturgical year's date range
                if (liturgicalYear.startDate && liturgicalYear.endDate) {
                    // Handle both string and Date formats
                    const startDate = typeof liturgicalYear.startDate === 'string' ? liturgicalYear.startDate : liturgicalYear.startDate.toISOString().split('T')[0];
                    const endDate = typeof liturgicalYear.endDate === 'string' ? liturgicalYear.endDate : liturgicalYear.endDate.toISOString().split('T')[0];
                    if (todayStr >= startDate && todayStr <= endDate) {
                        currentLiturgicalYear = liturgicalYear;
                    }
                }
            }
        }
        // Find current season
        const currentSeason = allSeasons.find(season => {
            // Handle both string and Date formats for season dates
            const startDate = typeof season.startDate === 'string' ? season.startDate : season.startDate.toISOString().split('T')[0];
            const endDate = typeof season.endDate === 'string' ? season.endDate : season.endDate.toISOString().split('T')[0];
            return todayStr >= startDate && todayStr <= endDate;
        });
        // Get special days from multiple years (current and next year for cross-year events)
        const specialDayRepo = this.getSpecialDayRepository();
        const specialDays = await specialDayRepo.find({
            where: [
                { year: currentYear, tradition: { id: tradition.id } },
                { year: currentYear + 1, tradition: { id: tradition.id } },
            ],
            order: { date: 'ASC' },
        });
        // Find upcoming special days (next 30 days)
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const upcomingSpecialDays = specialDays
            .filter(day => {
            const dayDate = new Date(day.date);
            return dayDate >= today && dayDate <= thirtyDaysFromNow;
        })
            .map(day => ({
            name: day.name,
            date: day.date.toISOString().split('T')[0],
            daysUntil: Math.ceil((new Date(day.date).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)),
        }));
        return {
            currentSeason: currentSeason ? {
                id: currentSeason.id,
                name: currentSeason.name,
                color: currentSeason.color,
                startDate: typeof currentSeason.startDate === 'string' ? currentSeason.startDate : currentSeason.startDate.toISOString().split('T')[0],
                endDate: typeof currentSeason.endDate === 'string' ? currentSeason.endDate : currentSeason.endDate.toISOString().split('T')[0],
                traditionId,
                year: currentLiturgicalYear?.year || currentYear,
                createdAt: currentSeason.createdAt,
                updatedAt: currentSeason.updatedAt,
            } : null,
            currentYear,
            today: todayStr,
            upcomingSpecialDays,
        };
    }
}
exports.CalendarService = CalendarService;
//# sourceMappingURL=calendar.service.js.map