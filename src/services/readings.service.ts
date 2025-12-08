import { DailyReading, ReadingType } from '../types/lectionary.types';
import { DatabaseService } from './database.service';
import { Reading, ReadingOffice } from '../models/reading.entity';
import { Tradition } from '../models/tradition.entity';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';
import { LiturgicalCalendarService } from './liturgical-calendar.service';

export class ReadingsService {
  private readingRepository: Repository<Reading>;
  private traditionRepository: Repository<Tradition>;
  private calendarService: LiturgicalCalendarService;

  constructor() {
    try {
      const dataSource = DatabaseService.getDataSource();
      this.readingRepository = dataSource.getRepository(Reading);
      this.traditionRepository = dataSource.getRepository(Tradition);
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
      this.traditionRepository = dataSource.getRepository(Tradition);
    }
    return this.readingRepository;
  }

  /**
   * Look up tradition by abbreviation or ID and return its UUID
   */
  private async getTraditionId(traditionIdentifier: string): Promise<string | null> {
    if (!this.traditionRepository) {
      const dataSource = DatabaseService.getDataSource();
      this.traditionRepository = dataSource.getRepository(Tradition);
    }

    // Try by abbreviation first (e.g., "rcl" -> "RCL")
    let tradition = await this.traditionRepository.findOne({
      where: { abbreviation: traditionIdentifier.toUpperCase() },
    });

    // If not found, try by ID
    if (!tradition) {
      tradition = await this.traditionRepository.findOne({
        where: { id: traditionIdentifier },
      });
    }

    if (!tradition) {
      logger.warn(`Tradition not found: ${traditionIdentifier}`);
      return null;
    }

    return tradition.id;
  }
  
  public async getByDate(date: string, traditionIdentifier: string): Promise<DailyReading | null> {
    try {
      const repository = this.ensureRepository();

      // Look up the tradition UUID
      const traditionUuid = await this.getTraditionId(traditionIdentifier);
      if (!traditionUuid) {
        logger.warn(`Tradition not found: ${traditionIdentifier}`);
        return null;
      }

      // Parse date string to avoid timezone issues - ensure we're working with the date as-is
      const [yearStr, monthStr, dayStr] = date.split('-');
      const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr), 12, 0, 0); // Set to noon to avoid timezone issues
      const year = dateObj.getFullYear();

      // Get liturgical information for this date
      const liturgicalInfo = this.calendarService.getLiturgicalYearInfo(year);
      const season = this.calendarService.getSeasonForDate(dateObj, year);
      const properNumber = this.calendarService.getProperNumber(dateObj, year);

      // Query the database for readings on this date using tradition UUID
      // Use QueryBuilder for better control over date comparison
      // Use CAST syntax instead of :: for proper parameter binding
      // Note: specialDay and scripture joins removed due to schema mismatch in production
      const readings = await repository
        .createQueryBuilder('reading')
        .leftJoinAndSelect('reading.tradition', 'tradition')
        .leftJoinAndSelect('reading.season', 'season')
        .leftJoinAndSelect('reading.liturgicalYear', 'liturgicalYear')
        .where('reading.traditionId = :traditionUuid', { traditionUuid })
        .andWhere('reading.date = CAST(:date AS date)', { date })
        .orderBy('reading.readingOrder', 'ASC')
        .getMany();

      if (!readings || readings.length === 0) {
        logger.warn(`No readings found for date ${date} and tradition ${traditionIdentifier} (UUID: ${traditionUuid})`);

        // Try to find readings by liturgical cycle and proper/season
        const alternateReadings = await this.findReadingsByLiturgicalContext(
          dateObj,
          traditionUuid,
          liturgicalInfo.cycle,
          season,
          properNumber,
        );

        if (alternateReadings && alternateReadings.length > 0) {
          return this.formatDailyReading(alternateReadings, date, traditionIdentifier, season?.name || 'ordinary');
        }

        // Return null - no mock data fallback
        return null;
      }

      // Format and return the readings
      return this.formatDailyReading(readings, date, traditionIdentifier, readings[0].seasonId || season?.name || 'ordinary');
    } catch (error) {
      logger.error(`Error fetching readings for date ${date}:`, error);
      return null;
    }
  }

  private async findReadingsByLiturgicalContext(
    _date: Date,
    traditionUuid: string,
    cycle: string,
    season: any,
    properNumber: number | null,
  ): Promise<Reading[]> {
    try {
      const repository = this.ensureRepository();

      // Build query conditions based on liturgical context
      const conditions: any = {
        traditionId: traditionUuid,
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

      // Note: scripture relation removed due to schema mismatch in production
      const readings = await repository.find({
        where: conditions,
        relations: ['tradition', 'season', 'liturgicalYear'],
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
    traditionIdentifier: string,
    page: number,
    limit: number,
  ): Promise<{ readings: DailyReading[]; total: number }> {
    try {
      const repository = this.ensureRepository();

      // Look up the tradition UUID
      const traditionUuid = await this.getTraditionId(traditionIdentifier);
      if (!traditionUuid) {
        logger.warn(`Tradition not found: ${traditionIdentifier}`);
        return { readings: [], total: 0 };
      }

      // Get count for pagination using QueryBuilder
      // Use CAST syntax instead of :: for proper parameter binding
      const total = await repository
        .createQueryBuilder('reading')
        .where('reading.traditionId = :traditionUuid', { traditionUuid })
        .andWhere('reading.date >= CAST(:startDate AS date)', { startDate })
        .andWhere('reading.date <= CAST(:endDate AS date)', { endDate })
        .getCount();

      // Get paginated readings using QueryBuilder
      const skip = (page - 1) * limit;
      // Note: scripture join removed due to schema mismatch in production
      const readings = await repository
        .createQueryBuilder('reading')
        .leftJoinAndSelect('reading.tradition', 'tradition')
        .leftJoinAndSelect('reading.season', 'season')
        .leftJoinAndSelect('reading.liturgicalYear', 'liturgicalYear')
        .where('reading.traditionId = :traditionUuid', { traditionUuid })
        .andWhere('reading.date >= CAST(:startDate AS date)', { startDate })
        .andWhere('reading.date <= CAST(:endDate AS date)', { endDate })
        .orderBy('reading.date', 'ASC')
        .addOrderBy('reading.readingOrder', 'ASC')
        .skip(skip)
        .take(limit)
        .getMany();

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
          id: `${traditionIdentifier}-${dateStr}`,
          date: dateStr,
          traditionId: traditionIdentifier,
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
        logger.warn(`No readings found for date range ${startDate} to ${endDate} in tradition ${traditionIdentifier}`);
        
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
    traditionIdentifier: string,
    cycle: string,
  ): Promise<DailyReading | null> {
    try {
      const repository = this.ensureRepository();

      // Look up the tradition UUID
      const traditionUuid = await this.getTraditionId(traditionIdentifier);
      if (!traditionUuid) {
        logger.warn(`Tradition not found: ${traditionIdentifier}`);
        return null;
      }

      // Query for readings by proper number
      // Note: scripture relation removed due to schema mismatch in production
      const readings = await repository.find({
        where: {
          notes: `Proper ${properNumber}`,
          traditionId: traditionUuid,
          liturgicalYear: {
            cycle: cycle as any,
          },
        },
        relations: ['tradition', 'season', 'liturgicalYear'],
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

      return this.formatDailyReading(readings, date, traditionIdentifier, 'ordinary');
    } catch (error) {
      logger.error(`Error fetching readings for Proper ${properNumber}:`, error);
      return null;
    }
  }

  public async getReadingsBySeason(
    seasonId: string,
    traditionIdentifier: string,
    cycle: string,
  ): Promise<DailyReading[]> {
    try {
      const repository = this.ensureRepository();

      // Look up the tradition UUID
      const traditionUuid = await this.getTraditionId(traditionIdentifier);
      if (!traditionUuid) {
        logger.warn(`Tradition not found: ${traditionIdentifier}`);
        return [];
      }

      // Note: scripture relation removed due to schema mismatch in production
      const readings = await repository.find({
        where: {
          season: {
            id: seasonId,
          },
          traditionId: traditionUuid,
          liturgicalYear: {
            cycle: cycle as any,
          },
        },
        relations: ['tradition', 'season', 'liturgicalYear'],
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
        this.formatDailyReading(dateReadings, dateStr, traditionIdentifier, seasonId),
      );
    } catch (error) {
      logger.error(`Error fetching readings for season ${seasonId}:`, error);
      return [];
    }
  }

  public async getDailyOfficeReadings(date: string): Promise<DailyReading | null> {
    try {
      const repository = this.ensureRepository();

      // Get daily office readings using QueryBuilder for proper date comparison
      // Use CAST syntax instead of :: for proper parameter binding
      const readings = await repository
        .createQueryBuilder('reading')
        .leftJoinAndSelect('reading.tradition', 'tradition')
        .where('reading.date = CAST(:date AS date)', { date })
        .andWhere('reading.traditionId IS NOT NULL')
        .andWhere('reading.readingOffice IN (:...offices)', {
          offices: [ReadingOffice.MORNING, ReadingOffice.EVENING],
        })
        .orderBy('reading.readingOffice', 'ASC')
        .addOrderBy('reading.readingOrder', 'ASC')
        .getMany();

      if (!readings || readings.length === 0) {
        return null;
      }

      // Group by office (morning/evening)
      const morningReadings = readings.filter(r => r.readingOffice === ReadingOffice.MORNING);
      const eveningReadings = readings.filter(r => r.readingOffice === ReadingOffice.EVENING);

      // Format as DailyReading
      return {
        id: `daily-${date}`,
        date,
        traditionId: 'daily-office',
        seasonId: null,
        readings: [
          ...morningReadings.map(r => ({
            type: r.readingType as any,
            citation: r.scriptureReference,
            text: r.text || '',
            isAlternative: r.isAlternative,
            office: 'morning' as const,
          })),
          ...eveningReadings.map(r => ({
            type: r.readingType as any,
            citation: r.scriptureReference,
            text: r.text || '',
            isAlternative: r.isAlternative,
            office: 'evening' as const,
          })),
        ],
        createdAt: readings[0]?.createdAt || new Date(),
        updatedAt: readings[0]?.updatedAt || new Date(),
      };
    } catch (error) {
      logger.error(`Error fetching daily office readings for ${date}:`, error);
      return null;
    }
  }
}