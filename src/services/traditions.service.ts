import { LectionaryTradition, LiturgicalSeason } from '../types/lectionary.types';
import { DatabaseService } from './database.service';
import { Tradition } from '../models/tradition.entity';
import { Season } from '../models/season.entity';
import { LiturgicalYear } from '../models/liturgical-year.entity';
import { Repository } from 'typeorm';
import { logger } from '../utils/logger';

/**
 * Virtual/composite traditions that don't exist as database records
 * but are served as combinations of real traditions
 */
const COMPOSITE_TRADITIONS: Record<string, LectionaryTradition> = {
  episcopal: {
    id: 'episcopal',
    name: 'Episcopal Church Lectionary',
    abbreviation: 'ECUSA',
    description: 'The Episcopal Church uses the Revised Common Lectionary (RCL) for Sunday worship and the Book of Common Prayer (BCP) Daily Office Lectionary for weekday Morning and Evening Prayer. This composite tradition provides access to both.',
    startDate: '',
    endDate: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

export class TraditionsService {
  private traditionRepository: Repository<Tradition>;
  private seasonRepository: Repository<Season>;
  private liturgicalYearRepository: Repository<LiturgicalYear>;

  constructor() {
    try {
      const dataSource = DatabaseService.getDataSource();
      this.traditionRepository = dataSource.getRepository(Tradition);
      this.seasonRepository = dataSource.getRepository(Season);
      this.liturgicalYearRepository = dataSource.getRepository(LiturgicalYear);
    } catch (error) {
      logger.error('Failed to initialize TraditionsService:', error);
    }
  }

  private ensureRepositories(): void {
    if (!this.traditionRepository) {
      const dataSource = DatabaseService.getDataSource();
      this.traditionRepository = dataSource.getRepository(Tradition);
      this.seasonRepository = dataSource.getRepository(Season);
      this.liturgicalYearRepository = dataSource.getRepository(LiturgicalYear);
    }
  }

  public async getAll(): Promise<LectionaryTradition[]> {
    try {
      this.ensureRepositories();

      const traditions = await this.traditionRepository.find({
        order: { name: 'ASC' },
      });

      // Map database traditions to response format
      const dbTraditions = traditions.map(t => this.mapTraditionToResponse(t));

      // Add composite/virtual traditions
      const compositeTraditions = Object.values(COMPOSITE_TRADITIONS);

      // Combine and sort by name
      return [...dbTraditions, ...compositeTraditions].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    } catch (error) {
      logger.error('Error fetching traditions:', error);
      // Return at least the composite traditions on error
      return Object.values(COMPOSITE_TRADITIONS);
    }
  }

  public async getById(id: string): Promise<LectionaryTradition | null> {
    try {
      // First, check for composite/virtual traditions
      const normalizedId = id.toLowerCase();
      if (COMPOSITE_TRADITIONS[normalizedId]) {
        return COMPOSITE_TRADITIONS[normalizedId];
      }

      // Also check by abbreviation for composite traditions
      const compositeByAbbrev = Object.values(COMPOSITE_TRADITIONS).find(
        t => t.abbreviation.toLowerCase() === normalizedId,
      );
      if (compositeByAbbrev) {
        return compositeByAbbrev;
      }

      this.ensureRepositories();

      // Try to find by abbreviation first (e.g., "rcl" -> "RCL", "bcp" -> "BCP")
      let tradition = await this.traditionRepository.findOne({
        where: { abbreviation: id.toUpperCase() },
      });

      // If not found, try by ID (UUID)
      if (!tradition) {
        tradition = await this.traditionRepository.findOne({
          where: { id },
        });
      }

      // If still not found, try by name (case-insensitive)
      if (!tradition) {
        tradition = await this.traditionRepository.findOne({
          where: { name: id },
        });
      }

      return tradition ? this.mapTraditionToResponse(tradition) : null;
    } catch (error) {
      logger.error(`Error fetching tradition ${id}:`, error);
      // Still return composite tradition if it matches, even on DB error
      const normalizedId = id.toLowerCase();
      return COMPOSITE_TRADITIONS[normalizedId] || null;
    }
  }

  public async getSeasons(traditionId: string, year: number): Promise<LiturgicalSeason[]> {
    try {
      this.ensureRepositories();

      // First find the tradition
      const tradition = await this.traditionRepository.findOne({
        where: [
          { abbreviation: traditionId.toUpperCase() },
          { id: traditionId },
        ],
      });

      if (!tradition) {
        logger.warn(`Tradition not found: ${traditionId}`);
        return [];
      }

      // Find liturgical year for this tradition and year
      const liturgicalYear = await this.liturgicalYearRepository.findOne({
        where: {
          traditionId: tradition.id,
          year: year,
        },
      });

      if (!liturgicalYear) {
        logger.warn(`Liturgical year not found for tradition ${traditionId} and year ${year}`);
        return [];
      }

      // Find seasons for this liturgical year
      const seasons = await this.seasonRepository.find({
        where: {
          liturgicalYearId: liturgicalYear.id,
        },
        order: { startDate: 'ASC' },
      });

      return seasons.map(s => this.mapSeasonToResponse(s, traditionId, year));
    } catch (error) {
      logger.error(`Error fetching seasons for ${traditionId}/${year}:`, error);
      return [];
    }
  }

  private mapTraditionToResponse(tradition: Tradition): LectionaryTradition {
    return {
      id: tradition.abbreviation?.toLowerCase() || tradition.id,
      name: tradition.name,
      abbreviation: tradition.abbreviation || tradition.name.substring(0, 3).toUpperCase(),
      description: tradition.description || '',
      startDate: '', // Would need liturgical year to determine
      endDate: '',
      createdAt: tradition.createdAt,
      updatedAt: tradition.updatedAt,
    };
  }

  private mapSeasonToResponse(season: Season, traditionId: string, year: number): LiturgicalSeason {
    return {
      id: season.id,
      name: season.name,
      color: season.color || 'green',
      startDate: season.startDate?.toISOString().split('T')[0] || '',
      endDate: season.endDate?.toISOString().split('T')[0] || '',
      traditionId,
      year,
      createdAt: season.createdAt,
      updatedAt: season.updatedAt,
    };
  }
}