/**
 * Liturgical calendar tests, including golden dates for 2024–2030.
 * These must pass under both TZ=UTC and TZ=America/New_York.
 */

import {
  LiturgicalCalendar,
  getLiturgicalCycleForDate,
  getProperNumberForDate,
  getSundayObservance,
  calculateBaptismOfTheLordCivil,
  calculateHolyFamilyCivil,
  calculateChristTheKingCivil,
  calculateTrinitySundayCivil,
  calculateEasterCivil,
} from '../utils/liturgical-calendar';
import { formatCivilDate, fromLocalDate, sundayClosestTo, parseCivilDate, addCivilDays } from '../utils/civil-date';
import { LiturgicalCalendarService } from '../services/liturgical-calendar.service';

function ymd(date: Date): string {
  return formatCivilDate(fromLocalDate(date));
}

const KNOWN_EASTER: Record<number, string> = {
  1818: '1818-03-22',
  2024: '2024-03-31',
  2025: '2025-04-20',
  2026: '2026-04-05',
  2027: '2027-03-28',
  2028: '2028-04-16',
  2029: '2029-04-01',
  2030: '2030-04-21',
  2038: '2038-04-25',
};

const KNOWN_ADVENT1: Record<number, string> = {
  2022: '2022-11-27', // Christmas is Sunday
  2023: '2023-12-03',
  2024: '2024-12-01',
  2025: '2025-11-30',
  2026: '2026-11-29',
  2027: '2027-11-28',
  2028: '2028-12-03',
  2029: '2029-12-02',
  2030: '2030-12-01',
  2033: '2033-11-27', // Christmas is Sunday
};

const KNOWN_ASH_WEDNESDAY: Record<number, string> = {
  2024: '2024-02-14',
  2025: '2025-03-05',
  2026: '2026-02-18',
  2027: '2027-02-10',
  2028: '2028-03-01',
  2029: '2029-02-14',
  2030: '2030-03-06',
};

const KNOWN_PENTECOST: Record<number, string> = {
  2024: '2024-05-19',
  2025: '2025-06-08',
  2026: '2026-05-24',
  2027: '2027-05-16',
  2028: '2028-06-04',
  2029: '2029-05-20',
  2030: '2030-06-09',
};

const KNOWN_TRINITY: Record<number, string> = {
  2024: '2024-05-26',
  2025: '2025-06-15',
  2026: '2026-05-31',
  2027: '2027-05-23',
  2028: '2028-06-11',
  2029: '2029-05-27',
  2030: '2030-06-16',
};

const KNOWN_CYCLE_AT_ADVENT: Record<number, 'A' | 'B' | 'C'> = {
  2022: 'A',
  2023: 'B',
  2024: 'C',
  2025: 'A',
  2026: 'B',
  2027: 'C',
  2028: 'A',
  2029: 'B',
  2030: 'C',
};

describe('Civil date helpers', () => {
  test('sunday closest to a date is timezone-stable', () => {
    // June 1, 2026 is Monday → previous Sunday May 31
    expect(formatCivilDate(sundayClosestTo(2026, 6, 1))).toBe('2026-05-31');
    // June 22, 2025 is Sunday → that day
    expect(formatCivilDate(sundayClosestTo(2025, 6, 22))).toBe('2025-06-22');
    // November 16, 2025 is Sunday → that day (Proper 28)
    expect(formatCivilDate(sundayClosestTo(2025, 11, 16))).toBe('2025-11-16');
    // A Thursday rounds forward
    expect(formatCivilDate(sundayClosestTo(2025, 6, 19))).toBe('2025-06-22');
  });

  test('parseCivilDate rejects invalid dates', () => {
    expect(parseCivilDate('2026-02-18')).toEqual({ year: 2026, month: 2, day: 18 });
    expect(parseCivilDate('2026-02-30')).toBeNull();
    expect(parseCivilDate('not-a-date')).toBeNull();
  });

  test('addCivilDays crosses DST without shifting the civil date', () => {
    // US spring forward in 2026 is March 8. 46 days before Easter (Apr 5) is Feb 18.
    const easter = { year: 2026, month: 4, day: 5 };
    expect(formatCivilDate(addCivilDays(easter, -46))).toBe('2026-02-18');
  });
});

describe('Liturgical Calendar Calculations', () => {
  describe('Easter Calculation (Computus Algorithm)', () => {
    test('should calculate correct Easter dates for known years including extremes', () => {
      for (const [year, expected] of Object.entries(KNOWN_EASTER)) {
        const easter = LiturgicalCalendar.calculateEaster(parseInt(year, 10));
        expect(ymd(easter)).toBe(expected);
        expect(easter.getDay()).toBe(0);
      }
    });

    test('should validate Easter is within March 22–April 25', () => {
      for (let year = 2024; year <= 2030; year++) {
        expect(LiturgicalCalendar.validateEasterCalculation(year)).toBe(true);
      }
    });
  });

  describe('Advent Calculation', () => {
    test('should calculate Advent 1 for 2022–2033, including Christmas-on-Sunday years', () => {
      for (const [year, expected] of Object.entries(KNOWN_ADVENT1)) {
        const advent = LiturgicalCalendar.calculateAdvent1(parseInt(year, 10));
        expect(ymd(advent)).toBe(expected);
        expect(advent.getDay()).toBe(0);
        expect(advent.getMonth() === 10 || advent.getMonth() === 11).toBe(true);
        const day = advent.getDate();
        if (advent.getMonth() === 10) {
          expect(day).toBeGreaterThanOrEqual(27);
        } else {
          expect(day).toBeLessThanOrEqual(3);
        }
      }
    });

    test('Christmas-on-Sunday Advent is 28 days before December 25', () => {
      for (const year of [2022, 2033]) {
        const advent = LiturgicalCalendar.calculateAdvent1(year);
        const christmas = new Date(year, 11, 25);
        const diffDays = (christmas.getTime() - advent.getTime()) / (1000 * 60 * 60 * 24);
        expect(Math.round(diffDays)).toBe(28);
      }
    });
  });

  describe('Moveable Feast Calculations', () => {
    test('Ash Wednesday is 46 civil days before Easter and always a Wednesday', () => {
      for (const [year, expected] of Object.entries(KNOWN_ASH_WEDNESDAY)) {
        const easter = LiturgicalCalendar.calculateEaster(parseInt(year, 10));
        const ashWednesday = LiturgicalCalendar.calculateAshWednesday(easter);
        expect(ymd(ashWednesday)).toBe(expected);
        expect(ashWednesday.getDay()).toBe(3);
      }
    });

    test('Palm Sunday is the Sunday before Easter', () => {
      for (let year = 2024; year <= 2030; year++) {
        const easter = LiturgicalCalendar.calculateEaster(year);
        const palmSunday = LiturgicalCalendar.calculatePalmSunday(easter);
        expect(ymd(palmSunday)).toBe(ymd(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 7)));
        expect(palmSunday.getDay()).toBe(0);
      }
    });

    test('Pentecost is 49 civil days after Easter', () => {
      for (const [year, expected] of Object.entries(KNOWN_PENTECOST)) {
        const easter = LiturgicalCalendar.calculateEaster(parseInt(year, 10));
        const pentecost = LiturgicalCalendar.calculatePentecost(easter);
        expect(ymd(pentecost)).toBe(expected);
        expect(pentecost.getDay()).toBe(0);
      }
    });

    test('Trinity Sunday is 56 civil days after Easter', () => {
      for (const [year, expected] of Object.entries(KNOWN_TRINITY)) {
        const easter = calculateEasterCivil(parseInt(year, 10));
        expect(formatCivilDate(calculateTrinitySundayCivil(easter))).toBe(expected);
      }
    });
  });

  describe('Liturgical Cycle Calculation', () => {
    test('Advent of each year starts the correct RCL letter', () => {
      for (const [year, letter] of Object.entries(KNOWN_CYCLE_AT_ADVENT)) {
        expect(LiturgicalCalendar.getLiturgicalCycle(parseInt(year, 10))).toBe(letter);
        expect(LiturgicalCalendar.generateLiturgicalYear(parseInt(year, 10)).cycle).toBe(letter);
      }
    });

    test('cycle for a date follows the most recent Advent 1', () => {
      // Mid-2025 is still Year C (started Advent 2024)
      expect(getLiturgicalCycleForDate(new Date(2025, 5, 15))).toBe('C');
      // Advent 1 2025 starts Year A
      expect(getLiturgicalCycleForDate(new Date(2025, 10, 30))).toBe('A');
      expect(getLiturgicalCycleForDate(new Date(2025, 11, 5))).toBe('A');
      // Day before Advent 1 2025 is still C
      expect(getLiturgicalCycleForDate(new Date(2025, 10, 29))).toBe('C');
    });

    test('Daily Office year flips at Advent 1, not January 1', () => {
      // Advent 2024 (even) starts Year One; Advent 2025 starts Year Two
      expect(LiturgicalCalendar.getDailyOfficeYear(2024)).toBe(1);
      expect(LiturgicalCalendar.getDailyOfficeYear(2025)).toBe(2);
      expect(LiturgicalCalendar.getDailyOfficeYearForDate(new Date(2025, 10, 29))).toBe(1);
      expect(LiturgicalCalendar.getDailyOfficeYearForDate(new Date(2025, 10, 30))).toBe(2);
      expect(LiturgicalCalendar.getDailyOfficeYearForDate(new Date(2026, 0, 1))).toBe(2);
    });
  });

  describe('Season Calculations', () => {
    test('should generate all liturgical seasons in order', () => {
      for (let year = 2024; year <= 2030; year++) {
        const seasons = LiturgicalCalendar.calculateSeasons(year - 1);
        expect(seasons).toHaveLength(6);
        expect(seasons.map((s) => s.name)).toEqual([
          'Advent',
          'Christmas',
          'Epiphany',
          'Lent',
          'Easter',
          'Ordinary Time',
        ]);
        for (let i = 1; i < seasons.length; i++) {
          expect(seasons[i].startDate.getTime()).toBeGreaterThan(seasons[i - 1].endDate.getTime());
        }
      }
    });

    test('getSeasonForDate finds Advent, Christmas, Lent, and midwinter Ordinary Time', () => {
      expect(LiturgicalCalendar.getSeasonForDate(new Date(2025, 10, 30), 2025)?.name).toBe('Advent');
      expect(LiturgicalCalendar.getSeasonForDate(new Date(2025, 11, 5), 2025)?.name).toBe('Advent');
      expect(LiturgicalCalendar.getSeasonForDate(new Date(2025, 11, 25), 2025)?.name).toBe('Christmas');
      expect(LiturgicalCalendar.getSeasonForDate(new Date(2025, 2, 5), 2025)?.name).toBe('Lent');
      // 2026-01-10 is still Christmas (Baptism of the Lord is 2026-01-11)
      expect(LiturgicalCalendar.getSeasonForDate(new Date(2026, 0, 10), 2026)?.name).toBe('Christmas');
      expect(LiturgicalCalendar.getSeasonForDate(new Date(2026, 0, 12), 2026)?.name).toBe('Epiphany');
      // Ash Wednesday itself is Lent, and midnight is not a gap
      expect(LiturgicalCalendar.getSeasonForDate(new Date(2025, 2, 5, 0, 0, 0), 2025)?.name).toBe('Lent');
    });

    test('Lent runs from Ash Wednesday through Holy Saturday', () => {
      for (let year = 2024; year <= 2030; year++) {
        const seasons = LiturgicalCalendar.calculateSeasons(year - 1);
        const lent = seasons.find((s) => s.name === 'Lent');
        const easter = LiturgicalCalendar.calculateEaster(year);
        expect(lent).toBeDefined();
        if (lent) {
          expect(ymd(lent.startDate)).toBe(KNOWN_ASH_WEDNESDAY[year]);
          expect(ymd(lent.endDate)).toBe(ymd(new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 1)));
        }
      }
    });
  });

  describe('Comprehensive Liturgical Year Generation', () => {
    test('should generate complete liturgical years for 2024-2030', () => {
      for (let calendarYear = 2023; calendarYear <= 2029; calendarYear++) {
        const liturgicalYear = LiturgicalCalendar.generateLiturgicalYear(calendarYear);
        expect(liturgicalYear.year).toBe(calendarYear + 1);
        expect(liturgicalYear.cycle).toBe(KNOWN_CYCLE_AT_ADVENT[calendarYear]);
        expect(ymd(liturgicalYear.advent1)).toBe(KNOWN_ADVENT1[calendarYear]);
        expect(ymd(liturgicalYear.easter)).toBe(KNOWN_EASTER[calendarYear + 1]);
        expect(liturgicalYear.seasons).toHaveLength(6);
        expect(liturgicalYear.christmas.getTime()).toBeGreaterThan(liturgicalYear.advent1.getTime());
        expect(liturgicalYear.epiphany.getTime()).toBeGreaterThan(liturgicalYear.christmas.getTime());
        expect(liturgicalYear.ashWednesday.getTime()).toBeGreaterThan(liturgicalYear.epiphany.getTime());
        expect(liturgicalYear.palmSunday.getTime()).toBeGreaterThan(liturgicalYear.ashWednesday.getTime());
        expect(liturgicalYear.easter.getTime()).toBeGreaterThan(liturgicalYear.palmSunday.getTime());
        expect(liturgicalYear.pentecost.getTime()).toBeGreaterThan(liturgicalYear.easter.getTime());
      }
    });
  });

  describe('Feast Day Calculations', () => {
    test('should generate moveable feasts with correct relationships', () => {
      for (let year = 2024; year <= 2030; year++) {
        const feasts = LiturgicalCalendar.calculateMoveableFeasts(year);
        const ashWednesday = feasts.find((f) => f.name === 'Ash Wednesday');
        const palmSunday = feasts.find((f) => f.name === 'Palm Sunday');
        const easter = feasts.find((f) => f.name === 'Easter Sunday');
        const pentecost = feasts.find((f) => f.name === 'Pentecost');
        const trinity = feasts.find((f) => f.name === 'Trinity Sunday');
        expect(ymd(ashWednesday!.date)).toBe(KNOWN_ASH_WEDNESDAY[year]);
        expect(ymd(easter!.date)).toBe(KNOWN_EASTER[year]);
        expect(ymd(pentecost!.date)).toBe(KNOWN_PENTECOST[year]);
        expect(ymd(trinity!.date)).toBe(KNOWN_TRINITY[year]);
        expect(palmSunday!.date.getTime()).toBeGreaterThan(ashWednesday!.date.getTime());
      }
    });

    test('fixed feasts land on the correct civil dates', () => {
      for (let year = 2024; year <= 2026; year++) {
        const feasts = LiturgicalCalendar.calculateFixedFeasts(year);
        const christmas = feasts.find((f) => f.name === 'Christmas Day');
        const epiphany = feasts.find((f) => f.name === 'Epiphany');
        const allSaints = feasts.find((f) => f.name === 'All Saints\' Day');
        expect(ymd(christmas!.date)).toBe(`${year}-12-25`);
        expect(ymd(epiphany!.date)).toBe(`${year}-01-06`);
        expect(ymd(allSaints!.date)).toBe(`${year}-11-01`);
      }
    });

    test('Baptism of the Lord is the Sunday after January 6', () => {
      expect(formatCivilDate(calculateBaptismOfTheLordCivil(2024))).toBe('2024-01-07');
      expect(formatCivilDate(calculateBaptismOfTheLordCivil(2025))).toBe('2025-01-12');
      expect(formatCivilDate(calculateBaptismOfTheLordCivil(2026))).toBe('2026-01-11');
      // January 6, 2030 is Sunday → Baptism is the following Sunday
      expect(formatCivilDate(calculateBaptismOfTheLordCivil(2030))).toBe('2030-01-13');
    });

    test('Holy Family is the Sunday after Christmas, or December 30 when Christmas is Sunday', () => {
      expect(formatCivilDate(calculateHolyFamilyCivil(2022))).toBe('2022-12-30');
      expect(formatCivilDate(calculateHolyFamilyCivil(2024))).toBe('2024-12-29');
      expect(formatCivilDate(calculateHolyFamilyCivil(2025))).toBe('2025-12-28');
    });
  });

  describe('Ordinary Time and feast precedence', () => {
    test('2025 first Sunday after Trinity is Proper 7 (closest to June 22)', () => {
      const sundays = LiturgicalCalendar.getOrdinaryTimeSundays(2025);
      expect(ymd(sundays[0].date)).toBe('2025-06-22');
      expect(sundays[0].properNumber).toBe(7);
      const proper28 = sundays.find((s) => s.properNumber === 28);
      expect(proper28).toBeDefined();
      expect(ymd(proper28!.date)).toBe('2025-11-16');
      const christTheKing = sundays.find((s) => s.properNumber === 29);
      expect(ymd(christTheKing!.date)).toBe(formatCivilDate(calculateChristTheKingCivil(2025)));
      expect(ymd(christTheKing!.date)).toBe('2025-11-23');
    });

    test('Trinity Sunday takes precedence over Proper 4 on 2026-05-31', () => {
      const observance = getSundayObservance(new Date(2026, 4, 31));
      expect(observance).not.toBeNull();
      expect(observance!.name).toBe('Trinity Sunday');
      expect(observance!.properNumber).toBeNull();
      expect(observance!.omittedProperNumber).toBe(4);
      expect(getProperNumberForDate(new Date(2026, 4, 31))).toBeNull();

      const sundays = LiturgicalCalendar.getOrdinaryTimeSundays(2026);
      expect(sundays.find((s) => s.properNumber === 4)).toBeUndefined();
      expect(ymd(sundays[0].date)).toBe('2026-06-07');
      expect(sundays[0].properNumber).toBe(5);
    });

    test('every listed Ordinary Time Sunday is actually a Sunday', () => {
      for (let year = 2024; year <= 2030; year++) {
        const sundays = LiturgicalCalendar.getOrdinaryTimeSundays(year);
        expect(sundays.length).toBeGreaterThan(15);
        for (let i = 0; i < sundays.length; i++) {
          expect(sundays[i].date.getDay()).toBe(0);
          if (i > 0) {
            expect(sundays[i].date.getTime()).toBeGreaterThan(sundays[i - 1].date.getTime());
          }
        }
      }
    });
  });
});

describe('LiturgicalCalendarService uses the same calendar', () => {
  const service = new LiturgicalCalendarService();

  test('Easter, Ash Wednesday, Advent 1, and cycle match the utils module', () => {
    for (let year = 2024; year <= 2030; year++) {
      expect(service.calculateEaster(year).dateString).toBe(KNOWN_EASTER[year]);
      expect(service.calculateEasterDates(year).ashWednesday.dateString).toBe(KNOWN_ASH_WEDNESDAY[year]);
      expect(service.calculateEasterDates(year).trinitySunday.dateString).toBe(KNOWN_TRINITY[year]);
      expect(service.calculateEasterDates(year).christTheKing.dateString).toBe(
        formatCivilDate(calculateChristTheKingCivil(year)),
      );
      expect(service.getLiturgicalCycle(year)).toBe(KNOWN_CYCLE_AT_ADVENT[year]);
    }
  });

  test('dateString is the civil date, not the UTC ISO date', () => {
    const ash = service.calculateEasterDates(2026).ashWednesday;
    expect(ash.dateString).toBe('2026-02-18');
    expect(ash.year).toBe(2026);
    expect(ash.month).toBe(2);
    expect(ash.day).toBe(18);
  });

  test('seasons for liturgical year 2025 (starting Advent 2024) are in chronological order', () => {
    // Easter 2025 belongs to the year that started Advent 2024
    const seasons = service.calculateLiturgicalSeasons(2024);
    const ordinaryAfterEpiphany = seasons.filter((s) => s.name === 'Ordinary Time')[0];
    expect(ordinaryAfterEpiphany.startDate.dateString).toBe('2025-01-13'); // day after Baptism (Jan 12)
    expect(ordinaryAfterEpiphany.endDate.dateString).toBe('2025-03-04'); // day before Ash Wednesday
    expect(ordinaryAfterEpiphany.startDate.date.getTime()).toBeLessThan(ordinaryAfterEpiphany.endDate.date.getTime());

    expect(service.getSeasonForDate(new Date(2026, 0, 10), 2026)?.name).toBe('Christmas');
    expect(service.getSeasonForDate(new Date(2025, 10, 30), 2025)?.name).toBe('Advent');
    expect(service.getProperNumber(new Date(2025, 5, 22), 2025)).toBe(7);
    expect(service.getProperNumber(new Date(2026, 4, 31), 2026)).toBeNull();
    expect(service.getCycleForDate(new Date(2025, 5, 15))).toBe('C');
    expect(service.getCycleForDate(new Date(2025, 10, 30))).toBe('A');
  });

  test('Holy Family is not hardcoded to December 30', () => {
    const days = service.calculateSpecialDays(2024);
    const holyFamily = days.find((d) => d.name === 'Holy Family');
    expect(holyFamily?.date.dateString).toBe('2024-12-29');
  });
});

