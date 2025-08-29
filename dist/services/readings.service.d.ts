import { DailyReading } from '../types/lectionary.types';
export declare class ReadingsService {
    private readingRepository;
    private calendarService;
    constructor();
    private ensureRepository;
    getByDate(date: string, traditionId: string): Promise<DailyReading | null>;
    private findReadingsByLiturgicalContext;
    private formatDailyReading;
    getByDateRange(startDate: string, endDate: string, traditionId: string, page: number, limit: number): Promise<{
        readings: DailyReading[];
        total: number;
    }>;
    getReadingsByProper(properNumber: number, traditionId: string, cycle: string): Promise<DailyReading | null>;
    getReadingsBySeason(seasonId: string, traditionId: string, cycle: string): Promise<DailyReading[]>;
    getDailyOfficeReadings(date: string): Promise<DailyReading | null>;
}
//# sourceMappingURL=readings.service.d.ts.map