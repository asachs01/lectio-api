import { DailyReading } from '../types/lectionary.types';
export declare class ReadingsService {
    getByDate(date: string, traditionId: string): Promise<DailyReading | null>;
    getByDateRange(startDate: string, endDate: string, traditionId: string, page: number, limit: number): Promise<{
        readings: DailyReading[];
        total: number;
    }>;
}
//# sourceMappingURL=readings.service.d.ts.map