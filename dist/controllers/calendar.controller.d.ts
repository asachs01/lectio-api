import { Request, Response } from 'express';
export declare class CalendarController {
    private calendarService;
    constructor();
    getByYear(req: Request, res: Response): Promise<void>;
    getSeasonsByYear(req: Request, res: Response): Promise<void>;
    getCurrent(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=calendar.controller.d.ts.map