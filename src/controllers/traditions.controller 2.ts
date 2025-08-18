import { Request, Response } from 'express';
import { TraditionsService } from '../services/traditions.service';
import { HttpError } from '../middleware/error-handler';

export class TraditionsController {
  private traditionsService: TraditionsService;

  constructor() {
    this.traditionsService = new TraditionsService();
  }

  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      const traditions = await this.traditionsService.getAll();
      
      res.json({
        data: traditions,
        total: traditions.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new HttpError('Failed to fetch traditions', 500, { originalError: error });
    }
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new HttpError('Tradition ID is required', 400);
      }

      const tradition = await this.traditionsService.getById(id);
      
      if (!tradition) {
        throw new HttpError(`Tradition with ID '${id}' not found`, 404);
      }

      res.json({
        data: tradition,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError('Failed to fetch tradition', 500, { originalError: error });
    }
  }

  public async getSeasons(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { year } = req.query;
      
      if (!id) {
        throw new HttpError('Tradition ID is required', 400);
      }

      const liturgicalYear = year ? parseInt(year as string, 10) : new Date().getFullYear();
      
      if (isNaN(liturgicalYear) || liturgicalYear < 1900 || liturgicalYear > 2100) {
        throw new HttpError('Invalid year parameter', 400);
      }

      const seasons = await this.traditionsService.getSeasons(id, liturgicalYear);
      
      res.json({
        data: seasons,
        total: seasons.length,
        year: liturgicalYear,
        traditionId: id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError('Failed to fetch seasons', 500, { originalError: error });
    }
  }
}