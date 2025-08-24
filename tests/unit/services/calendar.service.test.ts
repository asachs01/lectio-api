import { CalendarService } from '../../../src/services/calendar.service';
import { LiturgicalSeason, SpecialDay } from '../../../src/types/lectionary.types';

describe('CalendarService', () => {
  let service: CalendarService;

  beforeEach(() => {
    service = new CalendarService();
  });

  describe('getByYear', () => {
    it('should return liturgical calendar for given year and tradition', async () => {
      const year = 2023;
      const traditionId = 'rcl';

      const calendar = await service.getByYear(year, traditionId);

      expect(calendar).not.toBeNull();
      expect(calendar).toMatchObject({
        id: `${traditionId}-${year}`,
        year,
        traditionId,
        seasons: expect.any(Array),
        specialDays: expect.any(Array),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should return calendar with seasons and special days', async () => {
      const calendar = await service.getByYear(2023, 'rcl');

      expect(calendar).not.toBeNull();
      expect(calendar!.seasons).toHaveLength(3);
      expect(calendar!.specialDays).toHaveLength(2);
    });

    it('should return different calendars for different traditions', async () => {
      const rclCalendar = await service.getByYear(2023, 'rcl');
      const catholicCalendar = await service.getByYear(2023, 'catholic');

      expect(rclCalendar).not.toBeNull();
      expect(catholicCalendar).not.toBeNull();
      expect(rclCalendar!.id).toBe('rcl-2023');
      expect(catholicCalendar!.id).toBe('catholic-2023');
    });

    it('should return different calendars for different years', async () => {
      const calendar2023 = await service.getByYear(2023, 'rcl');
      const calendar2024 = await service.getByYear(2024, 'rcl');

      expect(calendar2023).not.toBeNull();
      expect(calendar2024).not.toBeNull();
      expect(calendar2023!.id).toBe('rcl-2023');
      expect(calendar2024!.id).toBe('rcl-2024');
    });
  });

  describe('getSeasonsByYear', () => {
    it('should return seasons for a given year and tradition', async () => {
      const seasons = await service.getSeasonsByYear(2023, 'rcl');

      expect(seasons).toHaveLength(3);
      expect(seasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'advent',
            name: 'Advent',
            color: 'purple',
            startDate: '2023-12-03',
            endDate: '2023-12-24',
            traditionId: 'rcl',
            year: 2023,
          }),
          expect.objectContaining({
            id: 'christmas',
            name: 'Christmas',
            color: 'white',
            startDate: '2023-12-25',
            endDate: '2024-01-06',
            traditionId: 'rcl',
            year: 2023,
          }),
          expect.objectContaining({
            id: 'epiphany',
            name: 'Epiphany',
            color: 'green',
            startDate: '2024-01-07',
            endDate: '2024-02-13',
            traditionId: 'rcl',
            year: 2023,
          }),
        ])
      );
    });

    it('should return seasons with correct year-based dates', async () => {
      const seasons2024 = await service.getSeasonsByYear(2024, 'episcopal');

      seasons2024.forEach((season: LiturgicalSeason) => {
        expect(season.year).toBe(2024);
        expect(season.traditionId).toBe('episcopal');
      });

      // Check specific date patterns
      const advent = seasons2024.find(s => s.id === 'advent');
      const christmas = seasons2024.find(s => s.id === 'christmas');
      const epiphany = seasons2024.find(s => s.id === 'epiphany');

      expect(advent?.startDate).toBe('2024-12-03');
      expect(advent?.endDate).toBe('2024-12-24');
      expect(christmas?.startDate).toBe('2024-12-25');
      expect(christmas?.endDate).toBe('2025-01-06'); // Next year
      expect(epiphany?.startDate).toBe('2025-01-07'); // Next year
    });

    it('should return seasons with required fields', async () => {
      const seasons = await service.getSeasonsByYear(2023, 'catholic');

      seasons.forEach((season: LiturgicalSeason) => {
        expect(season).toHaveProperty('id');
        expect(season).toHaveProperty('name');
        expect(season).toHaveProperty('color');
        expect(season).toHaveProperty('startDate');
        expect(season).toHaveProperty('endDate');
        expect(season).toHaveProperty('traditionId');
        expect(season).toHaveProperty('year');
        expect(season).toHaveProperty('createdAt');
        expect(season).toHaveProperty('updatedAt');
        
        expect(typeof season.id).toBe('string');
        expect(typeof season.name).toBe('string');
        expect(typeof season.color).toBe('string');
        expect(typeof season.startDate).toBe('string');
        expect(typeof season.endDate).toBe('string');
        expect(typeof season.traditionId).toBe('string');
        expect(typeof season.year).toBe('number');
        expect(season.createdAt).toBeInstanceOf(Date);
        expect(season.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle different traditions with same year', async () => {
      const rclSeasons = await service.getSeasonsByYear(2023, 'rcl');
      const catholicSeasons = await service.getSeasonsByYear(2023, 'catholic');

      expect(rclSeasons).toHaveLength(3);
      expect(catholicSeasons).toHaveLength(3);

      rclSeasons.forEach(season => {
        expect(season.traditionId).toBe('rcl');
        expect(season.year).toBe(2023);
      });

      catholicSeasons.forEach(season => {
        expect(season.traditionId).toBe('catholic');
        expect(season.year).toBe(2023);
      });
    });
  });

  describe('getSpecialDaysByYear', () => {
    it('should return special days for a given year and tradition', async () => {
      const specialDays = await service.getSpecialDaysByYear(2023, 'rcl');

      expect(specialDays).toHaveLength(2);
      expect(specialDays).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'christmas',
            name: 'Christmas Day',
            date: '2023-12-25',
            type: 'feast',
            traditionId: 'rcl',
            year: 2023,
          }),
          expect.objectContaining({
            id: 'epiphany',
            name: 'Epiphany',
            date: '2024-01-06', // Next year for Epiphany
            type: 'feast',
            traditionId: 'rcl',
            year: 2023,
          }),
        ])
      );
    });

    it('should return special days with correct year-based dates', async () => {
      const specialDays2024 = await service.getSpecialDaysByYear(2024, 'episcopal');

      expect(specialDays2024).toHaveLength(2);

      const christmas = specialDays2024.find(day => day.id === 'christmas');
      const epiphany = specialDays2024.find(day => day.id === 'epiphany');

      expect(christmas?.date).toBe('2024-12-25');
      expect(epiphany?.date).toBe('2025-01-06'); // Next year
    });

    it('should return special days with required fields', async () => {
      const specialDays = await service.getSpecialDaysByYear(2023, 'catholic');

      specialDays.forEach((day: SpecialDay) => {
        expect(day).toHaveProperty('id');
        expect(day).toHaveProperty('name');
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('type');
        expect(day).toHaveProperty('traditionId');
        expect(day).toHaveProperty('year');
        expect(day).toHaveProperty('createdAt');
        expect(day).toHaveProperty('updatedAt');
        
        expect(typeof day.id).toBe('string');
        expect(typeof day.name).toBe('string');
        expect(typeof day.date).toBe('string');
        expect(typeof day.type).toBe('string');
        expect(typeof day.traditionId).toBe('string');
        expect(typeof day.year).toBe('number');
        expect(day.createdAt).toBeInstanceOf(Date);
        expect(day.updatedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle different traditions with same year', async () => {
      const rclDays = await service.getSpecialDaysByYear(2023, 'rcl');
      const catholicDays = await service.getSpecialDaysByYear(2023, 'catholic');

      expect(rclDays).toHaveLength(2);
      expect(catholicDays).toHaveLength(2);

      rclDays.forEach(day => {
        expect(day.traditionId).toBe('rcl');
        expect(day.year).toBe(2023);
      });

      catholicDays.forEach(day => {
        expect(day.traditionId).toBe('catholic');
        expect(day.year).toBe(2023);
      });
    });
  });

  describe('getCurrent', () => {
    let originalDate: typeof Date;

    beforeEach(() => {
      originalDate = Date;
    });

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should return current calendar information', async () => {
      // Mock current date to December 15, 2023 (during Advent)
      const mockDate = new Date('2023-12-15T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) return mockDate;
          return new (originalDate as any)(...args);
        }) as any);

      const currentInfo = await service.getCurrent('rcl');

      expect(currentInfo).toMatchObject({
        currentYear: 2023,
        today: '2023-12-15',
        currentSeason: expect.objectContaining({
          id: 'advent',
          name: 'Advent',
        }),
        upcomingSpecialDays: expect.any(Array),
      });
    });

    it('should find current season correctly', async () => {
      // Mock date during Christmas season
      const mockDate = new Date('2023-12-30T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) return mockDate;
          return new (originalDate as any)(...args);
        }) as any);

      const currentInfo = await service.getCurrent('rcl');

      expect(currentInfo.currentSeason).not.toBeNull();
      expect(currentInfo.currentSeason).toMatchObject({
        id: 'christmas',
        name: 'Christmas',
        color: 'white',
      });
    });

    it('should return null for current season when not in any season', async () => {
      // Mock date outside any season range
      const mockDate = new Date('2023-06-15T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) return mockDate;
          return new (originalDate as any)(...args);
        }) as any);

      const currentInfo = await service.getCurrent('rcl');

      expect(currentInfo.currentSeason).toBeNull();
    });

    it('should return upcoming special days within 30 days', async () => {
      // Mock date to December 10, 2023 (Christmas should be upcoming)
      const mockDate = new Date('2023-12-10T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) return mockDate;
          return new (originalDate as any)(...args);
        }) as any);

      const currentInfo = await service.getCurrent('rcl');

      expect(currentInfo.upcomingSpecialDays).toHaveLength(2);
      expect(currentInfo.upcomingSpecialDays[0]).toMatchObject({
        name: 'Christmas Day',
        date: '2023-12-25',
        daysUntil: 15, // 15 days until Christmas
      });
      expect(currentInfo.upcomingSpecialDays[1]).toMatchObject({
        name: 'Epiphany',
        date: '2024-01-06',
        daysUntil: 27, // 27 days until Epiphany
      });
    });

    it('should calculate days until special day correctly', async () => {
      // Mock date to December 20, 2023
      const mockDate = new Date('2023-12-20T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) return mockDate;
          return new (originalDate as any)(...args);
        }) as any);

      const currentInfo = await service.getCurrent('rcl');

      const christmasDay = currentInfo.upcomingSpecialDays.find(day => day.name === 'Christmas Day');
      expect(christmasDay?.daysUntil).toBe(5); // 5 days until Christmas
    });

    it('should not return past special days', async () => {
      // Mock date to December 30, 2023 (after Christmas)
      const mockDate = new Date('2023-12-30T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) return mockDate;
          return new (originalDate as any)(...args);
        }) as any);

      const currentInfo = await service.getCurrent('rcl');

      const christmasDay = currentInfo.upcomingSpecialDays.find(day => day.name === 'Christmas Day');
      expect(christmasDay).toBeUndefined(); // Christmas has passed
    });

    it('should return correct year and today date', async () => {
      const mockDate = new Date('2024-03-15T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) return mockDate;
          return new (originalDate as any)(...args);
        }) as any);

      const currentInfo = await service.getCurrent('episcopal');

      expect(currentInfo.currentYear).toBe(2024);
      expect(currentInfo.today).toBe('2024-03-15');
    });

    it('should work with different traditions', async () => {
      const mockDate = new Date('2023-12-15T10:00:00.000Z');
      jest.spyOn(global, 'Date')
        .mockImplementation(((...args: any[]) => {
          if (args.length === 0) return mockDate;
          return new (originalDate as any)(...args);
        }) as any);

      const rclInfo = await service.getCurrent('rcl');
      const catholicInfo = await service.getCurrent('catholic');

      expect(rclInfo).toBeDefined();
      expect(catholicInfo).toBeDefined();
      expect(rclInfo.currentYear).toBe(catholicInfo.currentYear);
      expect(rclInfo.today).toBe(catholicInfo.today);
    });
  });
});