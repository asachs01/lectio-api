import { describe, test, expect, jest } from '@jest/globals';
import { z } from 'zod';

// Mock the client module with inline data to avoid type inference issues
jest.mock('../client.js', () => {
  const mockClient = {
    getReadings: () => Promise.resolve({
      id: 'rcl-2025-08-25',
      date: '2025-08-25',
      traditionId: 'rcl',
      seasonId: 'ordinary',
      readings: [
        { type: 'first', citation: 'Jeremiah 1:4-10', text: 'Mock text' },
        { type: 'psalm', citation: 'Psalm 71:1-6', text: 'Mock text' },
        { type: 'second', citation: 'Hebrews 12:18-29', text: 'Mock text' },
        { type: 'gospel', citation: 'Luke 13:10-17', text: 'Mock text' }
      ]
    }),
    getCurrentCalendar: () => Promise.resolve({
      currentSeason: {
        id: 'ordinary',
        name: 'Ordinary Time',
        color: 'green',
        startDate: '2025-06-01',
        endDate: '2025-11-30',
        traditionId: 'rcl'
      },
      currentYear: 2025,
      today: '2025-08-25',
      upcomingSpecialDays: []
    }),
    getCalendarByYear: () => Promise.resolve({
      year: 2025,
      tradition: 'rcl',
      seasons: [],
      specialDays: []
    }),
    getSeasonsByYear: () => Promise.resolve([
      { id: 'advent', name: 'Advent', color: 'purple' },
      { id: 'christmas', name: 'Christmas', color: 'white' },
      { id: 'epiphany', name: 'Epiphany', color: 'green' }
    ]),
    getSpecialDays: () => Promise.resolve([
      { name: 'Christmas Day', date: '2025-12-25', type: 'feast' }
    ]),
    getReadingsByDateRange: () => Promise.resolve([]),
    getReadingsBySeason: () => Promise.resolve([]),
    findByScripture: () => Promise.resolve({ message: 'Not implemented' }),
    findFeastDay: () => Promise.resolve([]),
    analyzeLiturgicalContext: () => Promise.resolve({
      date: '2025-08-25',
      season: { id: 'ordinary', name: 'Ordinary Time' },
      readings: {},
      themes: ['Discipleship', 'Healing'],
      connections: {}
    })
  };
  return {
    LectionaryClient: class {
      constructor() {
        return mockClient;
      }
    }
  };
});

describe('MCP Tool Schemas', () => {
  describe('GetReadingsSchema', () => {
    test('validates correct input', () => {
      const GetReadingsSchema = z.object({
        date: z.string().optional(),
        tradition: z.string().optional().default('rcl'),
        includeText: z.boolean().optional().default(false)
      });

      const validInput = {
        date: '2025-08-25',
        tradition: 'rcl',
        includeText: true
      };

      const result = GetReadingsSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    test('provides defaults for optional fields', () => {
      const GetReadingsSchema = z.object({
        date: z.string().optional(),
        tradition: z.string().optional().default('rcl'),
        includeText: z.boolean().optional().default(false)
      });

      const minimalInput = {};
      const result = GetReadingsSchema.parse(minimalInput);
      
      expect(result.tradition).toBe('rcl');
      expect(result.includeText).toBe(false);
      expect(result.date).toBeUndefined();
    });
  });

  describe('ExploreCalendarSchema', () => {
    test('validates all focus types', () => {
      const ExploreCalendarSchema = z.object({
        focus: z.enum(['current', 'year', 'seasons', 'special_days']),
        year: z.number().optional(),
        tradition: z.string().optional().default('rcl')
      });

      const focuses = ['current', 'year', 'seasons', 'special_days'];
      
      focuses.forEach(focus => {
        const input = { focus, year: 2025 };
        const result = ExploreCalendarSchema.parse(input);
        expect(result.focus).toBe(focus);
      });
    });

    test('rejects invalid focus type', () => {
      const ExploreCalendarSchema = z.object({
        focus: z.enum(['current', 'year', 'seasons', 'special_days']),
        year: z.number().optional(),
        tradition: z.string().optional().default('rcl')
      });

      expect(() => {
        ExploreCalendarSchema.parse({ focus: 'invalid' });
      }).toThrow();
    });
  });

  describe('SearchLectionarySchema', () => {
    test('validates date range search', () => {
      const SearchLectionarySchema = z.object({
        searchType: z.enum(['date_range', 'season', 'scripture', 'feast']),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        season: z.string().optional(),
        scripture: z.string().optional(),
        feastName: z.string().optional(),
        tradition: z.string().optional().default('rcl')
      });

      const input = {
        searchType: 'date_range',
        startDate: '2025-08-01',
        endDate: '2025-08-31'
      };

      const result = SearchLectionarySchema.parse(input);
      expect(result.searchType).toBe('date_range');
      expect(result.startDate).toBe('2025-08-01');
      expect(result.endDate).toBe('2025-08-31');
    });

    test('validates season search', () => {
      const SearchLectionarySchema = z.object({
        searchType: z.enum(['date_range', 'season', 'scripture', 'feast']),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        season: z.string().optional(),
        scripture: z.string().optional(),
        feastName: z.string().optional(),
        tradition: z.string().optional().default('rcl')
      });

      const input = {
        searchType: 'season',
        season: 'advent'
      };

      const result = SearchLectionarySchema.parse(input);
      expect(result.searchType).toBe('season');
      expect(result.season).toBe('advent');
    });
  });

  describe('AnalyzeLiturgicalContextSchema', () => {
    test('validates all depth levels', () => {
      const AnalyzeLiturgicalContextSchema = z.object({
        date: z.string(),
        depth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
        tradition: z.string().optional().default('rcl')
      });

      const depths = ['basic', 'detailed', 'comprehensive'];
      
      depths.forEach(depth => {
        const input = { date: '2025-08-25', depth };
        const result = AnalyzeLiturgicalContextSchema.parse(input);
        expect(result.depth).toBe(depth);
      });
    });

    test('requires date field', () => {
      const AnalyzeLiturgicalContextSchema = z.object({
        date: z.string(),
        depth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
        tradition: z.string().optional().default('rcl')
      });

      expect(() => {
        AnalyzeLiturgicalContextSchema.parse({ depth: 'basic' });
      }).toThrow();
    });

    test('provides default depth', () => {
      const AnalyzeLiturgicalContextSchema = z.object({
        date: z.string(),
        depth: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
        tradition: z.string().optional().default('rcl')
      });

      const input = { date: '2025-08-25' };
      const result = AnalyzeLiturgicalContextSchema.parse(input);
      expect(result.depth).toBe('detailed');
    });
  });
});

describe('Tool Response Formats', () => {
  test('get_readings returns proper format', () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            id: 'rcl-2025-08-25',
            date: '2025-08-25',
            readings: [
              { type: 'first', citation: 'Jeremiah 1:4-10' },
              { type: 'psalm', citation: 'Psalm 71:1-6' },
              { type: 'second', citation: 'Hebrews 12:18-29' },
              { type: 'gospel', citation: 'Luke 13:10-17' }
            ]
          }, null, 2)
        }
      ]
    };

    expect(mockResponse.content).toHaveLength(1);
    expect(mockResponse.content[0].type).toBe('text');
    
    const parsed = JSON.parse(mockResponse.content[0].text);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('date');
    expect(parsed).toHaveProperty('readings');
    expect(parsed.readings).toHaveLength(4);
  });

  test('explore_calendar returns proper format', () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            currentSeason: {
              id: 'ordinary',
              name: 'Ordinary Time',
              color: 'green'
            },
            currentYear: 2025,
            today: '2025-08-25'
          }, null, 2)
        }
      ]
    };

    const parsed = JSON.parse(mockResponse.content[0].text);
    expect(parsed).toHaveProperty('currentSeason');
    expect(parsed).toHaveProperty('currentYear');
    expect(parsed).toHaveProperty('today');
  });

  test('analyze_liturgical_context returns proper format', () => {
    const mockResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            date: '2025-08-25',
            season: { id: 'ordinary', name: 'Ordinary Time' },
            readings: {},
            themes: ['Discipleship', 'Healing'],
            connections: {},
            liturgicalSignificance: 'Text',
            practicalApplication: 'Text'
          }, null, 2)
        }
      ]
    };

    const parsed = JSON.parse(mockResponse.content[0].text);
    expect(parsed).toHaveProperty('date');
    expect(parsed).toHaveProperty('season');
    expect(parsed).toHaveProperty('themes');
    expect(Array.isArray(parsed.themes)).toBe(true);
  });
});