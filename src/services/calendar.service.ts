import { LiturgicalCalendar, LiturgicalSeason, SpecialDay, CurrentCalendarInfo } from '../types/lectionary.types';
import { DatabaseService } from './database.service';
import { Season } from '../models/season.entity';
import { SpecialDay as SpecialDayEntity } from '../models/special-day.entity';
import { Tradition } from '../models/tradition.entity';
import { LiturgicalYear } from '../models/liturgical-year.entity';
import { Repository } from 'typeorm';

export class CalendarService {
  
  private getTraditionRepository(): Repository<Tradition> {
    return DatabaseService.getDataSource().getRepository(Tradition);
  }


  private getSpecialDayRepository(): Repository<SpecialDayEntity> {
    return DatabaseService.getDataSource().getRepository(SpecialDayEntity);
  }

  private getLiturgicalYearRepository(): Repository<LiturgicalYear> {
    return DatabaseService.getDataSource().getRepository(LiturgicalYear);
  }

  private async findTraditionByAbbreviation(traditionId: string): Promise<Tradition | null> {
    const traditionRepo = this.getTraditionRepository();
    return await traditionRepo.findOne({ 
      where: { abbreviation: traditionId.toUpperCase() },
    });
  }

  public async getByYear(year: number, traditionId: string): Promise<LiturgicalCalendar | null> {
    // TODO: Implement database query
    const seasons = await this.getSeasonsByYear(year, traditionId);
    const specialDays = await this.getSpecialDaysByYear(year, traditionId);

    return {
      id: `${traditionId}-${year}`,
      year,
      traditionId,
      seasons,
      specialDays,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  public async getSeasonsByYear(year: number, traditionId: string): Promise<LiturgicalSeason[]> {
    const tradition = await this.findTraditionByAbbreviation(traditionId);
    if (!tradition) {
      return [];
    }

    const liturgicalYearRepo = this.getLiturgicalYearRepository();
    const liturgicalYear = await liturgicalYearRepo.findOne({
      where: { 
        year,
        tradition: { id: tradition.id },
      },
      relations: ['seasons'],
    });

    if (!liturgicalYear || !liturgicalYear.seasons) {
      return [];
    }

    return liturgicalYear.seasons.map(season => ({
      id: season.id,
      name: season.name,
      color: season.color,
      startDate: typeof season.startDate === 'string' ? season.startDate : season.startDate.toISOString().split('T')[0],
      endDate: typeof season.endDate === 'string' ? season.endDate : season.endDate.toISOString().split('T')[0],
      traditionId,
      year,
      createdAt: season.createdAt,
      updatedAt: season.updatedAt,
    }));
  }

  public async getSpecialDaysByYear(year: number, traditionId: string): Promise<SpecialDay[]> {
    const tradition = await this.findTraditionByAbbreviation(traditionId);
    if (!tradition) {
      return [];
    }

    const specialDayRepo = this.getSpecialDayRepository();
    const specialDays = await specialDayRepo.find({
      where: { 
        year,
        tradition: { id: tradition.id },
      },
      order: { date: 'ASC' },
    });

    return specialDays.map(day => ({
      id: day.id,
      name: day.name,
      date: day.date.toISOString().split('T')[0],
      type: day.type as 'feast' | 'fast' | 'commemoration' | 'other',
      traditionId,
      year,
      createdAt: day.createdAt,
      updatedAt: day.updatedAt,
    }));
  }

  public async getCurrent(traditionId: string): Promise<CurrentCalendarInfo> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const todayStr = today.toISOString().split('T')[0];
    
    const tradition = await this.findTraditionByAbbreviation(traditionId);
    if (!tradition) {
      return {
        currentSeason: null,
        currentYear,
        today: todayStr,
        upcomingSpecialDays: [],
      };
    }

    // Find current liturgical year - check both current year and previous year
    // since liturgical years span calendar years
    const liturgicalYearRepo = this.getLiturgicalYearRepository();
    const liturgicalYears = await liturgicalYearRepo.find({
      where: [
        { year: currentYear, tradition: { id: tradition.id } },
        { year: currentYear - 1, tradition: { id: tradition.id } },
      ],
      relations: ['seasons'],
    });

    // Find which liturgical year contains today's date
    let currentLiturgicalYear = null;
    let allSeasons: Season[] = [];
    
    for (const liturgicalYear of liturgicalYears) {
      if (liturgicalYear.seasons) {
        allSeasons = allSeasons.concat(liturgicalYear.seasons);
        // Check if today falls within this liturgical year's date range
        if (liturgicalYear.startDate && liturgicalYear.endDate) {
          // Handle both string and Date formats
          const startDate = typeof liturgicalYear.startDate === 'string' ? liturgicalYear.startDate : liturgicalYear.startDate.toISOString().split('T')[0];
          const endDate = typeof liturgicalYear.endDate === 'string' ? liturgicalYear.endDate : liturgicalYear.endDate.toISOString().split('T')[0];
          if (todayStr >= startDate && todayStr <= endDate) {
            currentLiturgicalYear = liturgicalYear;
          }
        }
      }
    }

    // Find current season
    const currentSeason = allSeasons.find(season => {
      // Handle both string and Date formats for season dates
      const startDate = typeof season.startDate === 'string' ? season.startDate : season.startDate.toISOString().split('T')[0];
      const endDate = typeof season.endDate === 'string' ? season.endDate : season.endDate.toISOString().split('T')[0];
      return todayStr >= startDate && todayStr <= endDate;
    });

    // Get special days from multiple years (current and next year for cross-year events)
    const specialDayRepo = this.getSpecialDayRepository();
    const specialDays = await specialDayRepo.find({
      where: [
        { year: currentYear, tradition: { id: tradition.id } },
        { year: currentYear + 1, tradition: { id: tradition.id } },
      ],
      order: { date: 'ASC' },
    });

    // Find upcoming special days (next 30 days)
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingSpecialDays = specialDays
      .filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= today && dayDate <= thirtyDaysFromNow;
      })
      .map(day => ({
        name: day.name,
        date: day.date.toISOString().split('T')[0],
        daysUntil: Math.ceil((new Date(day.date).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)),
      }));

    return {
      currentSeason: currentSeason ? {
        id: currentSeason.id,
        name: currentSeason.name,
        color: currentSeason.color,
        startDate: typeof currentSeason.startDate === 'string' ? currentSeason.startDate : currentSeason.startDate.toISOString().split('T')[0],
        endDate: typeof currentSeason.endDate === 'string' ? currentSeason.endDate : currentSeason.endDate.toISOString().split('T')[0],
        traditionId,
        year: currentLiturgicalYear?.year || currentYear,
        createdAt: currentSeason.createdAt,
        updatedAt: currentSeason.updatedAt,
      } : null,
      currentYear,
      today: todayStr,
      upcomingSpecialDays,
    };
  }
}