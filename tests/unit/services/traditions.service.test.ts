import { TraditionsService } from '../../../src/services/traditions.service';
import { LectionaryTradition, LiturgicalSeason } from '../../../src/types/lectionary.types';

describe('TraditionsService', () => {
  let service: TraditionsService;

  beforeEach(() => {
    service = new TraditionsService();
  });

  describe('getAll', () => {
    it('should return all traditions', async () => {
      const traditions = await service.getAll();

      expect(traditions).toHaveLength(3);
      expect(traditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'rcl',
            name: 'Revised Common Lectionary',
            abbreviation: 'RCL',
            description: 'A three-year cycle of readings shared by many Protestant denominations',
          }),
          expect.objectContaining({
            id: 'catholic',
            name: 'Roman Catholic Lectionary',
            abbreviation: 'Catholic',
            description: 'The official lectionary of the Roman Catholic Church',
          }),
          expect.objectContaining({
            id: 'episcopal',
            name: 'Episcopal/Anglican Lectionary',
            abbreviation: 'Episcopal',
            description: 'Lectionary used by Episcopal and Anglican churches',
          }),
        ])
      );
    });

    it('should return traditions with required fields', async () => {
      const traditions = await service.getAll();

      traditions.forEach((tradition: LectionaryTradition) => {
        expect(tradition).toHaveProperty('id');
        expect(tradition).toHaveProperty('name');
        expect(tradition).toHaveProperty('abbreviation');
        expect(tradition).toHaveProperty('description');
        expect(tradition).toHaveProperty('startDate');
        expect(tradition).toHaveProperty('endDate');
        expect(tradition).toHaveProperty('createdAt');
        expect(tradition).toHaveProperty('updatedAt');
        
        expect(typeof tradition.id).toBe('string');
        expect(typeof tradition.name).toBe('string');
        expect(typeof tradition.abbreviation).toBe('string');
        expect(typeof tradition.description).toBe('string');
        expect(tradition.createdAt).toBeInstanceOf(Date);
        expect(tradition.updatedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('getById', () => {
    it('should return tradition by id when found', async () => {
      const tradition = await service.getById('rcl');

      expect(tradition).not.toBeNull();
      expect(tradition).toMatchObject({
        id: 'rcl',
        name: 'Revised Common Lectionary',
        abbreviation: 'RCL',
        description: 'A three-year cycle of readings shared by many Protestant denominations',
      });
    });

    it('should return tradition for catholic id', async () => {
      const tradition = await service.getById('catholic');

      expect(tradition).not.toBeNull();
      expect(tradition).toMatchObject({
        id: 'catholic',
        name: 'Roman Catholic Lectionary',
        abbreviation: 'Catholic',
        description: 'The official lectionary of the Roman Catholic Church',
      });
    });

    it('should return tradition for episcopal id', async () => {
      const tradition = await service.getById('episcopal');

      expect(tradition).not.toBeNull();
      expect(tradition).toMatchObject({
        id: 'episcopal',
        name: 'Episcopal/Anglican Lectionary',
        abbreviation: 'Episcopal',
        description: 'Lectionary used by Episcopal and Anglican churches',
      });
    });

    it('should return null for non-existent id', async () => {
      const tradition = await service.getById('non-existent');

      expect(tradition).toBeNull();
    });

    it('should handle empty string id', async () => {
      const tradition = await service.getById('');

      expect(tradition).toBeNull();
    });

    it('should handle special characters in id', async () => {
      const tradition = await service.getById('!@#$%');

      expect(tradition).toBeNull();
    });
  });

  describe('getSeasons', () => {
    it('should return seasons for a tradition and year', async () => {
      const seasons = await service.getSeasons('rcl', 2023);

      expect(seasons).toHaveLength(3);
      expect(seasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'advent',
            name: 'Advent',
            color: 'purple',
            traditionId: 'rcl',
            year: 2023,
          }),
          expect.objectContaining({
            id: 'christmas',
            name: 'Christmas',
            color: 'white',
            traditionId: 'rcl',
            year: 2023,
          }),
          expect.objectContaining({
            id: 'epiphany',
            name: 'Epiphany',
            color: 'green',
            traditionId: 'rcl',
            year: 2023,
          }),
        ])
      );
    });

    it('should return seasons with correct tradition id', async () => {
      const traditionId = 'catholic';
      const seasons = await service.getSeasons(traditionId, 2024);

      seasons.forEach((season: LiturgicalSeason) => {
        expect(season.traditionId).toBe(traditionId);
      });
    });

    it('should return seasons with correct year', async () => {
      const year = 2025;
      const seasons = await service.getSeasons('episcopal', year);

      seasons.forEach((season: LiturgicalSeason) => {
        expect(season.year).toBe(year);
      });
    });

    it('should return seasons with required fields', async () => {
      const seasons = await service.getSeasons('rcl', 2023);

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

    it('should handle different tradition ids', async () => {
      const rclSeasons = await service.getSeasons('rcl', 2023);
      const catholicSeasons = await service.getSeasons('catholic', 2023);
      const episcopalSeasons = await service.getSeasons('episcopal', 2023);

      expect(rclSeasons).toHaveLength(3);
      expect(catholicSeasons).toHaveLength(3);
      expect(episcopalSeasons).toHaveLength(3);

      rclSeasons.forEach(season => expect(season.traditionId).toBe('rcl'));
      catholicSeasons.forEach(season => expect(season.traditionId).toBe('catholic'));
      episcopalSeasons.forEach(season => expect(season.traditionId).toBe('episcopal'));
    });

    it('should handle future years', async () => {
      const seasons = await service.getSeasons('rcl', 2030);

      expect(seasons).toHaveLength(3);
      seasons.forEach((season: LiturgicalSeason) => {
        expect(season.year).toBe(2030);
      });
    });

    it('should handle past years', async () => {
      const seasons = await service.getSeasons('rcl', 2000);

      expect(seasons).toHaveLength(3);
      seasons.forEach((season: LiturgicalSeason) => {
        expect(season.year).toBe(2000);
      });
    });

    it('should handle empty tradition id', async () => {
      const seasons = await service.getSeasons('', 2023);

      expect(seasons).toHaveLength(3);
      seasons.forEach((season: LiturgicalSeason) => {
        expect(season.traditionId).toBe('');
      });
    });
  });
});