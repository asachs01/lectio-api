import { Request, Response } from 'express';
import { ReadingsService } from '../services/readings.service';
import { HttpError } from '../middleware/error-handler';

export class ReadingsController {
  private readingsService: ReadingsService;

  constructor() {
    this.readingsService = new ReadingsService();
  }

  public async getByDate(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.query;
      const tradition = req.query['tradition'] || 'rcl';
      
      if (!date) {
        throw new HttpError('Date parameter is required', 400);
      }

      const dateStr = date as string;
      const traditionId = String(tradition);

      // Validate date format
      if (!this.isValidDate(dateStr)) {
        throw new HttpError('Invalid date format. Use YYYY-MM-DD', 400);
      }

      const readings = await this.readingsService.getByDate(dateStr, traditionId);
      
      if (!readings) {
        throw new HttpError(`No readings found for date '${dateStr}' in tradition '${traditionId}'`, 404);
      }

      res.json({
        data: readings,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError('Failed to fetch readings', 500, { originalError: error });
    }
  }

  public async getToday(req: Request, res: Response): Promise<void> {
    try {
      const tradition = req.query['tradition'] || 'rcl';
      const today = new Date().toISOString().split('T')[0];
      const traditionId = String(tradition);
      const dayOfWeek = new Date(today).getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      // Get Sunday/special readings (RCL only has readings for Sundays and special days)
      const sundayReadings = await this.readingsService.getByDate(today, traditionId as string);

      // Always get daily office readings (available for every day)
      const dailyOfficeReadings = await this.readingsService.getDailyOfficeReadings(today);

      // Build response based on what's available
      const response: any = {
        date: today,
        dayOfWeek: dayNames[dayOfWeek],
        tradition: traditionId,
        timestamp: new Date().toISOString(),
      };

      // Include Sunday/special readings if available (typically only on Sundays)
      if (sundayReadings) {
        response.lectionary = {
          type: dayOfWeek === 0 ? 'sunday' : 'special',
          readings: sundayReadings.readings,
          seasonId: sundayReadings.seasonId,
        };
      }

      // Include daily office readings (morning/evening prayer)
      if (dailyOfficeReadings) {
        const morningReadings = dailyOfficeReadings.readings.filter((r: any) => r.office === 'morning');
        const eveningReadings = dailyOfficeReadings.readings.filter((r: any) => r.office === 'evening');

        response.dailyOffice = {
          morning: morningReadings.length > 0 ? morningReadings : null,
          evening: eveningReadings.length > 0 ? eveningReadings : null,
        };
      }

      // If we have neither, return 404
      if (!sundayReadings && !dailyOfficeReadings) {
        throw new HttpError('No readings found for today', 404);
      }

      // Also include a combined 'data' field for backwards compatibility
      // Use Sunday readings if available, otherwise daily office
      response.data = sundayReadings || dailyOfficeReadings;

      res.json(response);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError('Failed to fetch today\'s readings', 500, { originalError: error });
    }
  }

  public async getByDateRange(req: Request, res: Response): Promise<void> {
    try {
      const { start, end, page = '1', limit = '10' } = req.query;
      const tradition = req.query['tradition'] || 'rcl';
      
      if (!start || !end) {
        throw new HttpError('Start and end date parameters are required', 400);
      }

      const startDate = start as string;
      const endDate = end as string;
      const traditionId = String(tradition);
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // Validate dates
      if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
        throw new HttpError('Invalid date format. Use YYYY-MM-DD', 400);
      }

      if (new Date(startDate) > new Date(endDate)) {
        throw new HttpError('Start date must be before end date', 400);
      }

      // Validate pagination
      if (isNaN(pageNum) || pageNum < 1) {
        throw new HttpError('Page must be a positive integer', 400);
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new HttpError('Limit must be a positive integer between 1 and 100', 400);
      }

      const result = await this.readingsService.getByDateRange(
        startDate,
        endDate,
        traditionId,
        pageNum,
        limitNum,
      );

      res.json({
        data: result.readings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
        dateRange: {
          start: startDate,
          end: endDate,
        },
        tradition: traditionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError('Failed to fetch readings for date range', 500, { originalError: error });
    }
  }

  public async getDailyOffice(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.query;
      
      if (!date) {
        throw new HttpError('Date parameter is required', 400);
      }

      const dateStr = date as string;

      // Validate date format
      if (!this.isValidDate(dateStr)) {
        throw new HttpError('Invalid date format. Use YYYY-MM-DD', 400);
      }

      const readings = await this.readingsService.getDailyOfficeReadings(dateStr);
      
      if (!readings) {
        throw new HttpError(`No daily office readings found for date '${dateStr}'`, 404);
      }

      res.json({
        data: readings,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError('Failed to fetch daily office readings', 500, { originalError: error });
    }
  }

  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }
    
    const date = new Date(dateString);
    
    // Check if date is valid (not NaN) and matches original string
    if (isNaN(date.getTime())) {
      return false;
    }
    
    try {
      return date.toISOString().split('T')[0] === dateString;
    } catch {
      return false;
    }
  }
}