import { DailyReading } from '../types/lectionary.types';
export declare class ReadingsService {
    private readingRepository;
    private traditionRepository;
    private calendarService;
    constructor();
    private ensureRepository;
    /**
     * Look up tradition by abbreviation or ID and return its UUID
     */
    private getTraditionId;
    getByDate(date: string, traditionIdentifier: string): Promise<DailyReading | null>;
    private findReadingsByLiturgicalContext;
    private formatDailyReading;
    getByDateRange(startDate: string, endDate: string, traditionIdentifier: string, page: number, limit: number): Promise<{
        readings: DailyReading[];
        total: number;
    }>;
    getReadingsByProper(properNumber: number, traditionIdentifier: string, cycle: string): Promise<DailyReading | null>;
    getReadingsBySeason(seasonId: string, traditionIdentifier: string, cycle: string): Promise<DailyReading[]>;
    getDailyOfficeReadings(date: string): Promise<DailyReading | null>;
}
//# sourceMappingURL=readings.service.d.ts.map