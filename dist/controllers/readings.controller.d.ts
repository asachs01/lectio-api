import { Request, Response } from 'express';
export declare class ReadingsController {
    private readingsService;
    constructor();
    getByDate(req: Request, res: Response): Promise<void>;
    getToday(req: Request, res: Response): Promise<void>;
    getByDateRange(req: Request, res: Response): Promise<void>;
    private isValidDate;
}
//# sourceMappingURL=readings.controller.d.ts.map