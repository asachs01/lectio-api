import { LectionaryTradition, LiturgicalSeason } from '../types/lectionary.types';
export declare class TraditionsService {
    private traditionRepository;
    private seasonRepository;
    private liturgicalYearRepository;
    constructor();
    private ensureRepositories;
    getAll(): Promise<LectionaryTradition[]>;
    getById(id: string): Promise<LectionaryTradition | null>;
    getSeasons(traditionId: string, year: number): Promise<LiturgicalSeason[]>;
    private mapTraditionToResponse;
    private mapSeasonToResponse;
}
//# sourceMappingURL=traditions.service.d.ts.map