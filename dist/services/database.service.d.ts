import { DataSource } from 'typeorm';
export declare class DatabaseService {
    private static dataSource;
    static initialize(): Promise<void>;
    static disconnect(): Promise<void>;
    static getDataSource(): DataSource;
    static isHealthy(): Promise<boolean>;
}
//# sourceMappingURL=database.service.d.ts.map