import { Request, Response } from 'express';
import { CalendarService } from '../services/calendar.service';
import { HttpError } from '../middleware/error-handler';
import { getDefaultTimeZone, isValidTimeZone } from '../utils/time-zone';

export class CalendarController {
  private calendarService: CalendarService;

  constructor() {
    this.calendarService = new CalendarService();
  }

  public async getByYear(req: Request, res: Response): Promise<void> {
    try {
      const { year } = req.params as { year: string };
      const tradition = req.query['tradition'] || 'rcl';
      
      const liturgicalYear = parseInt(year, 10);
      const traditionId = String(tradition);

      if (isNaN(liturgicalYear) || liturgicalYear < 1900 || liturgicalYear > 2100) {
        throw new HttpError('Invalid year parameter', 400);
      }

      const calendar = await this.calendarService.getByYear(liturgicalYear, traditionId);
      
      if (!calendar) {
        throw new HttpError(`Calendar not found for year ${liturgicalYear} in tradition '${traditionId}'`, 404);
      }

      res.json({
        data: calendar,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError('Failed to fetch calendar', 500, { originalError: error });
    }
  }

  public async getSeasonsByYear(req: Request, res: Response): Promise<void> {
    try {
      const { year } = req.params as { year: string };
      const tradition = req.query['tradition'] || 'rcl';
      
      const liturgicalYear = parseInt(year, 10);
      const traditionId = String(tradition);

      if (isNaN(liturgicalYear) || liturgicalYear < 1900 || liturgicalYear > 2100) {
        throw new HttpError('Invalid year parameter', 400);
      }

      const seasons = await this.calendarService.getSeasonsByYear(liturgicalYear, traditionId);
      
      res.json({
        data: seasons,
        total: seasons.length,
        year: liturgicalYear,
        tradition: traditionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError('Failed to fetch seasons', 500, { originalError: error });
    }
  }

  public async getCurrent(req: Request, res: Response): Promise<void> {
    try {
      const tradition = req.query['tradition'] || 'rcl';
      const traditionId = String(tradition);
      const timeZone = this.resolveTimeZone(req.query['tz']);

      const currentInfo = await this.calendarService.getCurrent(traditionId, timeZone);
      
      res.json({
        data: currentInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError('Failed to fetch current calendar information', 500, { originalError: error });
    }
  }

  private resolveTimeZone(raw: unknown): string {
    if (raw === undefined || raw === null || raw === '') {
      return getDefaultTimeZone();
    }
    const timeZone = String(raw);
    if (!isValidTimeZone(timeZone)) {
      throw new HttpError('Invalid tz parameter. Use an IANA time zone such as America/New_York', 400);
    }
    return timeZone;
  }
}
