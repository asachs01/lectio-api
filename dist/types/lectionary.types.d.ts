export interface LectionaryTradition {
    id: string;
    name: string;
    abbreviation: string;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface LiturgicalSeason {
    id: string;
    name: string;
    color: string;
    startDate: string;
    endDate: string;
    traditionId: string;
    year: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface SpecialDay {
    id: string;
    name: string;
    date: string;
    type: 'feast' | 'fast' | 'commemoration' | 'other';
    traditionId: string;
    year: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface LiturgicalCalendar {
    id: string;
    year: number;
    traditionId: string;
    seasons: LiturgicalSeason[];
    specialDays: SpecialDay[];
    createdAt: Date;
    updatedAt: Date;
}
export declare enum ReadingType {
    FIRST = "first",
    PSALM = "psalm",
    SECOND = "second",
    GOSPEL = "gospel"
}
export interface Reading {
    type: ReadingType;
    citation: string;
    text: string;
}
export interface DailyReading {
    id: string;
    date: string;
    traditionId: string;
    seasonId: string;
    readings: Reading[];
    createdAt: Date;
    updatedAt: Date;
}
export interface CurrentCalendarInfo {
    currentSeason: LiturgicalSeason | null;
    currentYear: number;
    today: string;
    upcomingSpecialDays: Array<{
        name: string;
        date: string;
        daysUntil: number;
    }>;
}
export interface ApiResponse<T> {
    data: T;
    timestamp: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface ErrorResponse {
    error: {
        message: string;
        statusCode: number;
        timestamp: string;
        details?: unknown;
    };
}
//# sourceMappingURL=lectionary.types.d.ts.map