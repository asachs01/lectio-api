import { LiturgicalCalendar, LiturgicalSeason, SpecialDay, CurrentCalendarInfo } from '../types/lectionary.types';
export declare class CalendarService {
    private formatDate;
    private getTraditionRepository;
    private getSpecialDayRepository;
    private getLiturgicalYearRepository;
    private findTraditionByAbbreviation;
    getByYear(year: number, traditionId: string): Promise<LiturgicalCalendar | null>;
    getSeasonsByYear(year: number, traditionId: string): Promise<LiturgicalSeason[]>;
    getSpecialDaysByYear(year: number, traditionId: string): Promise<SpecialDay[]>;
    getCurrent(traditionId: string): Promise<CurrentCalendarInfo>;
}
//# sourceMappingURL=calendar.service.d.ts.map