import { DailyReading, ReadingType } from '../types/lectionary.types';
import { DatabaseService } from './database.service';
import { Reading } from '../models/reading.entity';
import { Between, Repository } from 'typeorm';
import { logger } from '../utils/logger';
import { LiturgicalCalendarService } from './liturgical-calendar.service';

export class ReadingsService {
  private readingRepository: Repository<Reading>;
  private calendarService: LiturgicalCalendarService;

  constructor() {
    try {
      const dataSource = DatabaseService.getDataSource();
      this.readingRepository = dataSource.getRepository(Reading);
      this.calendarService = new LiturgicalCalendarService();
    } catch (error) {
      logger.error('Failed to initialize ReadingsService:', error);
      // Initialize later if database not ready yet
      this.calendarService = new LiturgicalCalendarService();
    }
  }

  private ensureRepository(): Repository<Reading> {
    if (!this.readingRepository) {
      const dataSource = DatabaseService.getDataSource();
      this.readingRepository = dataSource.getRepository(Reading);
    }
    return this.readingRepository;
  }
  
  public async getByDate(date: string, traditionId: string): Promise<DailyReading | null> {
    try {
      const repository = this.ensureRepository();
      // Parse date string to avoid timezone issues - ensure we're working with the date as-is
      const [yearStr, monthStr, dayStr] = date.split('-');
      const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr), 12, 0, 0); // Set to noon to avoid timezone issues
      const year = dateObj.getFullYear();
      
      // Get liturgical information for this date
      const liturgicalInfo = this.calendarService.getLiturgicalYearInfo(year);
      const season = this.calendarService.getSeasonForDate(dateObj, year);
      const properNumber = this.calendarService.getProperNumber(dateObj, year);
      
      // Query the database for readings on this date
      // Use date range to avoid timezone issues
      const startOfDay = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr), 0, 0, 0);
      const endOfDay = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr), 23, 59, 59);
      
      const readings = await repository.find({
        where: {
          date: Between(startOfDay, endOfDay),
          tradition: {
            abbreviation: traditionId.toUpperCase(), // RCL not rcl
          },
        },
        relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
        order: {
          readingOrder: 'ASC',
        },
      });

      if (!readings || readings.length === 0) {
        logger.warn(`No readings found for date ${date} and tradition ${traditionId}`);
        
        // Try to find readings by liturgical cycle and proper/season
        const alternateReadings = await this.findReadingsByLiturgicalContext(
          dateObj,
          traditionId,
          liturgicalInfo.cycle,
          season,
          properNumber,
        );
        
        if (alternateReadings && alternateReadings.length > 0) {
          return this.formatDailyReading(alternateReadings, date, traditionId, season?.name || 'ordinary');
        }
        
        // Return null - no mock data fallback
        return null;
      }

      // Format and return the readings
      return this.formatDailyReading(readings, date, traditionId, readings[0].seasonId || season?.name || 'ordinary');
    } catch (error) {
      logger.error(`Error fetching readings for date ${date}:`, error);
      return null;
    }
  }

  private async findReadingsByLiturgicalContext(
    _date: Date,
    traditionId: string,
    cycle: string,
    season: any,
    properNumber: number | null,
  ): Promise<Reading[]> {
    try {
      const repository = this.ensureRepository();
      
      // Build query conditions based on liturgical context
      const conditions: any = {
        tradition: {
          abbreviation: traditionId.toUpperCase(),
        },
      };
      
      // For Ordinary Time, look for readings by proper number
      if (season?.id === 'ordinary' && properNumber) {
        conditions.notes = `Proper ${properNumber}`;
      }
      
      // Add liturgical year cycle condition
      if (cycle) {
        conditions.liturgicalYear = {
          yearCycle: cycle,
        };
      }
      
      const readings = await repository.find({
        where: conditions,
        relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
        order: {
          readingOrder: 'ASC',
        },
      });
      
      return readings;
    } catch (error) {
      logger.error('Error finding readings by liturgical context:', error);
      return [];
    }
  }

  private formatDailyReading(
    readings: Reading[],
    date: string,
    traditionId: string,
    seasonId: string,
  ): DailyReading {
    return {
      id: `${traditionId}-${date}`,
      date,
      traditionId,
      seasonId,
      readings: readings.map(r => ({
        type: r.readingType as ReadingType,
        citation: r.scriptureReference,
        text: r.text || '',
        isAlternative: r.isAlternative || false,
      })),
      createdAt: readings[0]?.createdAt || new Date(),
      updatedAt: readings[0]?.updatedAt || new Date(),
    };
  }

  public async getByDateRange(
    startDate: string,
    endDate: string,
    traditionId: string,
    page: number,
    limit: number,
  ): Promise<{ readings: DailyReading[]; total: number }> {
    try {
      const repository = this.ensureRepository();
      
      // Get count for pagination
      const total = await repository.count({
        where: {
          date: Between(new Date(startDate), new Date(endDate)),
          tradition: {
            id: traditionId.toLowerCase(),
          },
        },
      });

      // Get paginated readings
      const skip = (page - 1) * limit;
      const readings = await repository.find({
        where: {
          date: Between(new Date(startDate), new Date(endDate)),
          tradition: {
            id: traditionId.toLowerCase(),
          },
        },
        relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
        order: {
          date: 'ASC',
          readingOrder: 'ASC',
        },
        skip,
        take: limit,
      });

      // Group readings by date
      const readingsByDate = new Map<string, Reading[]>();
      readings.forEach(reading => {
        const dateStr = reading.date.toISOString().split('T')[0];
        if (!readingsByDate.has(dateStr)) {
          readingsByDate.set(dateStr, []);
        }
        readingsByDate.get(dateStr)!.push(reading);
      });

      // Convert to DailyReading format
      const dailyReadings: DailyReading[] = Array.from(readingsByDate.entries()).map(([dateStr, dateReadings]) => {
        const dateObj = new Date(dateStr);
        const year = dateObj.getFullYear();
        const season = this.calendarService.getSeasonForDate(dateObj, year);
        
        return {
          id: `${traditionId}-${dateStr}`,
          date: dateStr,
          traditionId,
          seasonId: dateReadings[0].seasonId || season?.name || 'ordinary',
          readings: dateReadings.map(r => ({
            type: r.readingType as ReadingType,
            citation: r.scriptureReference,
            text: r.text || '',
            isAlternative: r.isAlternative || false,
          })),
          createdAt: dateReadings[0].createdAt,
          updatedAt: dateReadings[0].updatedAt,
        };
      });

      // If no readings found in database, return empty result
      if (dailyReadings.length === 0) {
        logger.warn(`No readings found for date range ${startDate} to ${endDate} in tradition ${traditionId}`);
        
        // Calculate how many days are in the range for proper response
        // const start = new Date(startDate);
        // const end = new Date(endDate);
        // const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        return {
          readings: [],
          total: 0,
        };
      }

      return {
        readings: dailyReadings,
        total: Math.ceil(total / 4), // Assuming 4 readings per day average
      };
    } catch (error) {
      logger.error(`Error fetching readings for date range ${startDate} to ${endDate}:`, error);
      
      return {
        readings: [],
        total: 0,
      };
    }
  }

  public async getReadingsByProper(
    properNumber: number,
    traditionId: string,
    cycle: string,
  ): Promise<DailyReading | null> {
    try {
      const repository = this.ensureRepository();
      
      // Query for readings by proper number
      const readings = await repository.find({
        where: {
          notes: `Proper ${properNumber}`,
          tradition: {
            id: traditionId.toLowerCase(),
          },
          liturgicalYear: {
            cycle: cycle as any,
          },
        },
        relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
        order: {
          readingOrder: 'ASC',
        },
      });
      
      if (!readings || readings.length === 0) {
        return null;
      }
      
      // Use a representative date for the proper
      const year = new Date().getFullYear();
      // For Proper 16, we can use a date around August 25
      // In reality, this would be calculated based on the liturgical calendar
      const date = `${year}-08-25`;
      
      return this.formatDailyReading(readings, date, traditionId, 'ordinary');
    } catch (error) {
      logger.error(`Error fetching readings for Proper ${properNumber}:`, error);
      return null;
    }
  }

  public async getReadingsBySeason(
    seasonId: string,
    traditionId: string,
    cycle: string,
  ): Promise<DailyReading[]> {
    try {
      const repository = this.ensureRepository();
      
      const readings = await repository.find({
        where: {
          season: {
            id: seasonId,
          },
          tradition: {
            id: traditionId.toLowerCase(),
          },
          liturgicalYear: {
            cycle: cycle as any,
          },
        },
        relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
        order: {
          date: 'ASC',
          readingOrder: 'ASC',
        },
      });
      
      // Group by date and format
      const readingsByDate = new Map<string, Reading[]>();
      readings.forEach(reading => {
        const dateStr = reading.date.toISOString().split('T')[0];
        if (!readingsByDate.has(dateStr)) {
          readingsByDate.set(dateStr, []);
        }
        readingsByDate.get(dateStr)!.push(reading);
      });
      
      return Array.from(readingsByDate.entries()).map(([dateStr, dateReadings]) => 
        this.formatDailyReading(dateReadings, dateStr, traditionId, seasonId),
      );
    } catch (error) {
      logger.error(`Error fetching readings for season ${seasonId}:`, error);
      return [];
    }
  }
}