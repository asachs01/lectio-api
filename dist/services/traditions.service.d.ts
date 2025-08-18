import { LectionaryTradition, LiturgicalSeason } from '../types/lectionary.types';
export declare class TraditionsService {
    getAll(): Promise<LectionaryTradition[]>;
    getById(id: string): Promise<LectionaryTradition | null>;
    getSeasons(traditionId: string, year: number): Promise<LiturgicalSeason[]>;
}
//# sourceMappingURL=traditions.service.d.ts.map