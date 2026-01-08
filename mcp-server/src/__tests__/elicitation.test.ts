import { describe, test, expect, jest } from '@jest/globals';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  TraditionElicitSchema,
  SearchTypeElicitSchema,
  DateRangeElicitSchema,
  SeasonElicitSchema,
  ScriptureElicitSchema,
  FeastElicitSchema,
  AnalysisDepthElicitSchema,
  clientSupportsElicitation,
  elicitTradition,
  elicitSearchType,
  elicitDateRange,
  elicitSeason,
  elicitScripture,
  elicitFeastName,
  type ElicitSchema,
} from '../elicitation.js';

// Mock server factory
function createMockServer(supportsElicitation: boolean, elicitResponse?: {
  action: 'accept' | 'decline' | 'cancel';
  content?: Record<string, unknown>;
}): Server {
  const defaultResponse = { action: 'decline' as const };
  const mockServer = {
    getClientCapabilities: jest.fn<() => { elicitation?: { form: object } } | undefined>().mockReturnValue(
      supportsElicitation ? { elicitation: { form: {} } } : undefined,
    ),
    elicitInput: jest.fn<() => Promise<{ action: string; content?: Record<string, unknown> }>>().mockResolvedValue(
      elicitResponse || defaultResponse,
    ),
  };
  return mockServer as unknown as Server;
}

describe('Elicitation Schemas', () => {
  describe('TraditionElicitSchema', () => {
    test('has correct structure', () => {
      expect(TraditionElicitSchema.type).toBe('object');
      expect(TraditionElicitSchema.properties).toHaveProperty('tradition');
      expect(TraditionElicitSchema.required).toContain('tradition');
    });

    test('tradition property has correct enum values', () => {
      const traditionProp = TraditionElicitSchema.properties.tradition;
      expect(traditionProp.type).toBe('string');
      expect((traditionProp as { enum: string[] }).enum).toContain('rcl');
      expect((traditionProp as { enum: string[] }).enum).toContain('catholic');
      expect((traditionProp as { enum: string[] }).enum).toContain('episcopal');
      expect((traditionProp as { enum: string[] }).enum).toContain('lutheran');
    });

    test('has human-readable enum names', () => {
      const traditionProp = TraditionElicitSchema.properties.tradition as { enumNames?: string[] };
      expect(traditionProp.enumNames).toBeDefined();
      expect(traditionProp.enumNames).toContain('Revised Common Lectionary');
    });

    test('has default value', () => {
      const traditionProp = TraditionElicitSchema.properties.tradition as { default?: string };
      expect(traditionProp.default).toBe('rcl');
    });
  });

  describe('SearchTypeElicitSchema', () => {
    test('has correct structure', () => {
      expect(SearchTypeElicitSchema.type).toBe('object');
      expect(SearchTypeElicitSchema.properties).toHaveProperty('searchType');
      expect(SearchTypeElicitSchema.required).toContain('searchType');
    });

    test('searchType property has all search options', () => {
      const searchProp = SearchTypeElicitSchema.properties.searchType as { enum: string[] };
      expect(searchProp.enum).toEqual(['date_range', 'season', 'scripture', 'feast']);
    });
  });

  describe('DateRangeElicitSchema', () => {
    test('has start and end date properties', () => {
      expect(DateRangeElicitSchema.properties).toHaveProperty('startDate');
      expect(DateRangeElicitSchema.properties).toHaveProperty('endDate');
      expect(DateRangeElicitSchema.required).toContain('startDate');
      expect(DateRangeElicitSchema.required).toContain('endDate');
    });

    test('date properties have date format', () => {
      const startProp = DateRangeElicitSchema.properties.startDate as { format?: string };
      const endProp = DateRangeElicitSchema.properties.endDate as { format?: string };
      expect(startProp.format).toBe('date');
      expect(endProp.format).toBe('date');
    });
  });

  describe('SeasonElicitSchema', () => {
    test('has all liturgical seasons', () => {
      const seasonProp = SeasonElicitSchema.properties.season as { enum: string[] };
      expect(seasonProp.enum).toContain('advent');
      expect(seasonProp.enum).toContain('christmas');
      expect(seasonProp.enum).toContain('lent');
      expect(seasonProp.enum).toContain('easter');
      expect(seasonProp.enum).toContain('pentecost');
    });
  });

  describe('ScriptureElicitSchema', () => {
    test('has scripture property', () => {
      expect(ScriptureElicitSchema.properties).toHaveProperty('scripture');
      expect(ScriptureElicitSchema.required).toContain('scripture');
    });
  });

  describe('FeastElicitSchema', () => {
    test('has feastName property', () => {
      expect(FeastElicitSchema.properties).toHaveProperty('feastName');
      expect(FeastElicitSchema.required).toContain('feastName');
    });
  });

  describe('AnalysisDepthElicitSchema', () => {
    test('has depth options', () => {
      const depthProp = AnalysisDepthElicitSchema.properties.depth as { enum: string[] };
      expect(depthProp.enum).toEqual(['basic', 'detailed', 'comprehensive']);
    });

    test('has default value', () => {
      const depthProp = AnalysisDepthElicitSchema.properties.depth as { default?: string };
      expect(depthProp.default).toBe('detailed');
    });
  });
});

describe('Client Capability Detection', () => {
  test('returns true when client supports elicitation', () => {
    const server = createMockServer(true);
    expect(clientSupportsElicitation(server)).toBe(true);
  });

  test('returns false when client does not support elicitation', () => {
    const server = createMockServer(false);
    expect(clientSupportsElicitation(server)).toBe(false);
  });

  test('returns false when capabilities are undefined', () => {
    const server = {
      getClientCapabilities: jest.fn().mockReturnValue(undefined),
    } as unknown as Server;
    expect(clientSupportsElicitation(server)).toBe(false);
  });
});

describe('Elicitation Helper Functions', () => {
  describe('elicitTradition', () => {
    test('returns existing tradition when provided', async () => {
      const server = createMockServer(true);
      const result = await elicitTradition(server, 'catholic');
      expect(result).toBe('catholic');
      expect(server.elicitInput).not.toHaveBeenCalled();
    });

    test('returns default when client does not support elicitation', async () => {
      const server = createMockServer(false);
      const result = await elicitTradition(server, undefined);
      expect(result).toBe('rcl');
      expect(server.elicitInput).not.toHaveBeenCalled();
    });

    test('returns elicited value on accept', async () => {
      const server = createMockServer(true, {
        action: 'accept',
        content: { tradition: 'episcopal' },
      });
      const result = await elicitTradition(server, undefined);
      expect(result).toBe('episcopal');
      expect(server.elicitInput).toHaveBeenCalled();
    });

    test('returns default on decline', async () => {
      const server = createMockServer(true, { action: 'decline' });
      const result = await elicitTradition(server, undefined);
      expect(result).toBe('rcl');
    });

    test('returns default on cancel', async () => {
      const server = createMockServer(true, { action: 'cancel' });
      const result = await elicitTradition(server, undefined);
      expect(result).toBe('rcl');
    });
  });

  describe('elicitSearchType', () => {
    test('returns existing search type when provided', async () => {
      const server = createMockServer(true);
      const result = await elicitSearchType(server, 'season');
      expect(result).toBe('season');
      expect(server.elicitInput).not.toHaveBeenCalled();
    });

    test('returns undefined when client does not support elicitation', async () => {
      const server = createMockServer(false);
      const result = await elicitSearchType(server, undefined);
      expect(result).toBeUndefined();
    });

    test('returns elicited value on accept', async () => {
      const server = createMockServer(true, {
        action: 'accept',
        content: { searchType: 'scripture' },
      });
      const result = await elicitSearchType(server, undefined);
      expect(result).toBe('scripture');
    });

    test('returns undefined on decline', async () => {
      const server = createMockServer(true, { action: 'decline' });
      const result = await elicitSearchType(server, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('elicitDateRange', () => {
    test('returns existing dates when both provided', async () => {
      const server = createMockServer(true);
      const result = await elicitDateRange(server, '2025-01-01', '2025-12-31');
      expect(result).toEqual({ startDate: '2025-01-01', endDate: '2025-12-31' });
      expect(server.elicitInput).not.toHaveBeenCalled();
    });

    test('elicits when dates not provided', async () => {
      const server = createMockServer(true, {
        action: 'accept',
        content: { startDate: '2025-03-01', endDate: '2025-03-31' },
      });
      const result = await elicitDateRange(server, undefined, undefined);
      expect(result).toEqual({ startDate: '2025-03-01', endDate: '2025-03-31' });
    });

    test('returns undefined when client does not support elicitation', async () => {
      const server = createMockServer(false);
      const result = await elicitDateRange(server, undefined, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('elicitSeason', () => {
    test('returns existing season when provided', async () => {
      const server = createMockServer(true);
      const result = await elicitSeason(server, 'lent');
      expect(result).toBe('lent');
    });

    test('returns elicited value on accept', async () => {
      const server = createMockServer(true, {
        action: 'accept',
        content: { season: 'advent' },
      });
      const result = await elicitSeason(server, undefined);
      expect(result).toBe('advent');
    });
  });

  describe('elicitScripture', () => {
    test('returns existing scripture when provided', async () => {
      const server = createMockServer(true);
      const result = await elicitScripture(server, 'John 3:16');
      expect(result).toBe('John 3:16');
    });

    test('returns elicited value on accept', async () => {
      const server = createMockServer(true, {
        action: 'accept',
        content: { scripture: 'Psalm 23' },
      });
      const result = await elicitScripture(server, undefined);
      expect(result).toBe('Psalm 23');
    });
  });

  describe('elicitFeastName', () => {
    test('returns existing feast name when provided', async () => {
      const server = createMockServer(true);
      const result = await elicitFeastName(server, 'Christmas');
      expect(result).toBe('Christmas');
    });

    test('returns elicited value on accept', async () => {
      const server = createMockServer(true, {
        action: 'accept',
        content: { feastName: 'Easter Sunday' },
      });
      const result = await elicitFeastName(server, undefined);
      expect(result).toBe('Easter Sunday');
    });
  });
});

describe('Elicitation Request Format', () => {
  test('elicitInput is called with correct form parameters', async () => {
    const server = createMockServer(true, { action: 'decline' });
    await elicitTradition(server, undefined);

    expect(server.elicitInput).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'form',
        message: expect.any(String),
        requestedSchema: expect.objectContaining({
          type: 'object',
          properties: expect.any(Object),
        }),
      }),
    );
  });

  test('message is descriptive for tradition elicitation', async () => {
    const server = createMockServer(true, { action: 'decline' });
    await elicitTradition(server, undefined);

    expect(server.elicitInput).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('tradition'),
      }),
    );
  });

  test('message is descriptive for search type elicitation', async () => {
    const server = createMockServer(true, { action: 'decline' });
    await elicitSearchType(server, undefined);

    expect(server.elicitInput).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('search'),
      }),
    );
  });
});

describe('Schema Validation', () => {
  function validateSchema(schema: ElicitSchema): boolean {
    // Check basic structure
    if (schema.type !== 'object') {
      return false;
    }
    if (!schema.properties || typeof schema.properties !== 'object') {
      return false;
    }

    // Check each property
    for (const prop of Object.values(schema.properties)) {
      if (!prop.type) {
        return false;
      }
      if (!['string', 'number', 'boolean'].includes(prop.type)) {
        return false;
      }
    }

    return true;
  }

  test('TraditionElicitSchema is valid', () => {
    expect(validateSchema(TraditionElicitSchema)).toBe(true);
  });

  test('SearchTypeElicitSchema is valid', () => {
    expect(validateSchema(SearchTypeElicitSchema)).toBe(true);
  });

  test('DateRangeElicitSchema is valid', () => {
    expect(validateSchema(DateRangeElicitSchema)).toBe(true);
  });

  test('SeasonElicitSchema is valid', () => {
    expect(validateSchema(SeasonElicitSchema)).toBe(true);
  });

  test('ScriptureElicitSchema is valid', () => {
    expect(validateSchema(ScriptureElicitSchema)).toBe(true);
  });

  test('FeastElicitSchema is valid', () => {
    expect(validateSchema(FeastElicitSchema)).toBe(true);
  });

  test('AnalysisDepthElicitSchema is valid', () => {
    expect(validateSchema(AnalysisDepthElicitSchema)).toBe(true);
  });
});
