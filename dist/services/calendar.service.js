"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
class CalendarService {
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
        // TODO: Implement database query
        return [
            {
                id: 'advent',
                name: 'Advent',
                color: 'purple',
                startDate: `${year}-12-03`,
                endDate: `${year}-12-24`,
                traditionId,
                year,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'christmas',
                name: 'Christmas',
                color: 'white',
                startDate: `${year}-12-25`,
                endDate: `${year + 1}-01-06`,
                traditionId,
                year,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'epiphany',
                name: 'Epiphany',
                color: 'green',
                startDate: `${year + 1}-01-07`,
                endDate: `${year + 1}-02-13`,
                traditionId,
                year,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
    }
    async getSpecialDaysByYear(year, traditionId) {
        // TODO: Implement database query
        return [
            {
                id: 'christmas',
                name: 'Christmas Day',
                date: `${year}-12-25`,
                type: 'feast',
                traditionId,
                year,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'epiphany',
                name: 'Epiphany',
                date: `${year + 1}-01-06`,
                type: 'feast',
                traditionId,
                year,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
    }
    async getCurrent(traditionId) {
        // TODO: Implement database query
        const today = new Date();
        const currentYear = today.getFullYear();
        const todayStr = today.toISOString().split('T')[0];
        const seasons = await this.getSeasonsByYear(currentYear, traditionId);
        const specialDays = await this.getSpecialDaysByYear(currentYear, traditionId);
        // Find current season
        const currentSeason = seasons.find(season => todayStr >= season.startDate && todayStr <= season.endDate);
        // Find upcoming special days (next 30 days)
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const upcomingSpecialDays = specialDays
            .filter(day => {
            const dayDate = new Date(day.date);
            return dayDate >= today && dayDate <= thirtyDaysFromNow;
        })
            .map(day => ({
            name: day.name,
            date: day.date,
            daysUntil: Math.ceil((new Date(day.date).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)),
        }));
        return {
            currentSeason: currentSeason || null,
            currentYear,
            today: todayStr,
            upcomingSpecialDays,
        };
    }
}
exports.CalendarService = CalendarService;
//# sourceMappingURL=calendar.service.js.map