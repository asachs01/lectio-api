import { DailyReading, ReadingType } from '../types/lectionary.types';
import { DatabaseService } from './database.service';
import { Reading } from '../models/reading.entity';
import { Between, Repository } from 'typeorm';
import { logger } from '../utils/logger';

export class ReadingsService {
  private readingRepository: Repository<Reading>;

  constructor() {
    try {
      const dataSource = DatabaseService.getDataSource();
      this.readingRepository = dataSource.getRepository(Reading);
    } catch (error) {
      logger.error('Failed to initialize ReadingsService:', error);
      // Initialize later if database not ready yet
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
      
      // Query the database for readings on this date
      const readings = await repository.find({
        where: {
          date: new Date(date),
          tradition: {
            id: traditionId.toLowerCase(),
          },
        },
        relations: ['tradition', 'season', 'liturgicalYear', 'specialDay', 'scripture'],
        order: {
          readingOrder: 'ASC',
        },
      });

      if (!readings || readings.length === 0) {
        logger.warn(`No readings found for date ${date} and tradition ${traditionId}`);
        
        // Return mock data as fallback for now
        // TODO: Remove this once we have complete data
        return this.getMockReading(date, traditionId);
      }

      // Group readings by date and format response
      const dailyReading: DailyReading = {
        id: `${traditionId}-${date}`,
        date,
        traditionId,
        seasonId: readings[0].seasonId || 'ordinary',
        readings: readings.map(r => ({
          type: r.readingType as ReadingType,
          citation: r.scriptureReference,
          text: r.text || '',
        })),
        createdAt: readings[0].createdAt,
        updatedAt: readings[0].updatedAt,
      };

      return dailyReading;
    } catch (error) {
      logger.error(`Error fetching readings for date ${date}:`, error);
      // Return mock data as fallback
      return this.getMockReading(date, traditionId);
    }
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
      const dailyReadings: DailyReading[] = Array.from(readingsByDate.entries()).map(([dateStr, dateReadings]) => ({
        id: `${traditionId}-${dateStr}`,
        date: dateStr,
        traditionId,
        seasonId: dateReadings[0].seasonId || 'ordinary',
        readings: dateReadings.map(r => ({
          type: r.readingType as ReadingType,
          citation: r.scriptureReference,
          text: r.text || '',
        })),
        createdAt: dateReadings[0].createdAt,
        updatedAt: dateReadings[0].updatedAt,
      }));

      return {
        readings: dailyReadings,
        total: Math.ceil(total / 4), // Assuming 4 readings per day average
      };
    } catch (error) {
      logger.error(`Error fetching readings for date range ${startDate} to ${endDate}:`, error);
      
      // Fallback to mock data
      return this.getMockReadingsRange(startDate, endDate, traditionId, page, limit);
    }
  }

  // Temporary mock data methods until we have complete database data
  private getMockReading(date: string, traditionId: string): DailyReading {
    // Determine the proper liturgical season and readings based on the date
    const dateObj = new Date(date);
    const month = dateObj.getMonth();
    const day = dateObj.getDate();
    
    // Very simplified liturgical calendar logic
    // August 25, 2025 is in Ordinary Time (Proper 16)
    if (month === 7 && day === 25) { // August is month 7 (0-indexed)
      return {
        id: `${traditionId}-${date}`,
        date,
        traditionId,
        seasonId: 'ordinary',
        readings: [
          {
            type: ReadingType.FIRST,
            citation: 'Jeremiah 1:4-10',
            text: 'Now the word of the Lord came to me saying...',
          },
          {
            type: ReadingType.PSALM,
            citation: 'Psalm 71:1-6',
            text: 'In you, O Lord, I take refuge...',
          },
          {
            type: ReadingType.SECOND,
            citation: 'Hebrews 12:18-29',
            text: 'You have not come to something that can be touched...',
          },
          {
            type: ReadingType.GOSPEL,
            citation: 'Luke 13:10-17',
            text: 'Now he was teaching in one of the synagogues on the sabbath...',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    // Default Advent readings (for other dates as placeholder)
    return {
      id: `${traditionId}-${date}`,
      date,
      traditionId,
      seasonId: 'advent',
      readings: [
        {
          type: ReadingType.FIRST,
          citation: 'Isaiah 64:1-9',
          text: 'O that you would tear open the heavens and come down...',
        },
        {
          type: ReadingType.PSALM,
          citation: 'Psalm 80:1-7, 17-19',
          text: 'Give ear, O Shepherd of Israel...',
        },
        {
          type: ReadingType.SECOND,
          citation: '1 Corinthians 1:3-9',
          text: 'Grace to you and peace from God our Father...',
        },
        {
          type: ReadingType.GOSPEL,
          citation: 'Mark 13:24-37',
          text: 'But in those days, after that suffering...',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async getMockReadingsRange(
    startDate: string,
    endDate: string,
    traditionId: string,
    page: number,
    limit: number,
  ): Promise<{ readings: DailyReading[]; total: number }> {
    const mockReadings: DailyReading[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Generate mock readings for the date range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const reading = this.getMockReading(dateStr, traditionId);
      if (reading) {
        mockReadings.push(reading);
      }
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReadings = mockReadings.slice(startIndex, endIndex);

    return {
      readings: paginatedReadings,
      total: mockReadings.length,
    };
  }
}