/**
 * MCP Elicitation Module
 *
 * Provides schemas and utilities for interactive user prompts during tool execution.
 * Follows opt-in design: only elicit when parameters are missing, don't interrupt defaults.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Elicitation response actions
 */
export type ElicitAction = 'accept' | 'decline' | 'cancel';

/**
 * Result from an elicitation request
 */
export interface ElicitResponse<T extends Record<string, unknown>> {
  action: ElicitAction;
  content?: T;
}

/**
 * Property types supported by elicitation schemas
 */
export type ElicitPropertyType = 'string' | 'number' | 'boolean';

/**
 * Base property schema for elicitation
 */
interface BasePropertySchema {
  type: ElicitPropertyType;
  title?: string;
  description?: string;
}

/**
 * String enum property with human-readable names
 */
interface EnumPropertySchema extends Omit<BasePropertySchema, 'type'> {
  type: 'string';
  enum: string[];
  enumNames?: string[];
  default?: string;
}

/**
 * String property with optional format
 */
interface StringPropertySchema extends BasePropertySchema {
  type: 'string';
  format?: 'email' | 'uri' | 'date' | 'date-time';
  default?: string;
}

/**
 * Number property with optional constraints
 */
interface NumberPropertySchema extends BasePropertySchema {
  type: 'number';
  minimum?: number;
  maximum?: number;
  default?: number;
}

/**
 * Boolean property
 */
interface BooleanPropertySchema extends BasePropertySchema {
  type: 'boolean';
  default?: boolean;
}

/**
 * Union of all property schema types
 */
export type PropertySchema = EnumPropertySchema | StringPropertySchema | NumberPropertySchema | BooleanPropertySchema;

/**
 * Complete elicitation schema for requesting user input
 */
export interface ElicitSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
}

// ============================================================================
// Lectionary-Specific Schemas
// ============================================================================

/**
 * Schema for selecting a lectionary tradition
 */
export const TraditionElicitSchema: ElicitSchema = {
  type: 'object',
  properties: {
    tradition: {
      type: 'string',
      title: 'Lectionary Tradition',
      description: 'The liturgical tradition for scripture readings',
      enum: ['rcl', 'catholic', 'episcopal', 'lutheran'],
      enumNames: [
        'Revised Common Lectionary',
        'Roman Catholic',
        'Episcopal',
        'Lutheran (ELW)',
      ],
      default: 'rcl',
    },
  },
  required: ['tradition'],
};

/**
 * Schema for selecting a search type
 */
export const SearchTypeElicitSchema: ElicitSchema = {
  type: 'object',
  properties: {
    searchType: {
      type: 'string',
      title: 'Search Type',
      description: 'How would you like to search the lectionary?',
      enum: ['date_range', 'season', 'scripture', 'feast'],
      enumNames: [
        'Search by date range',
        'Search by liturgical season',
        'Search by scripture reference',
        'Search by feast or holy day',
      ],
    },
  },
  required: ['searchType'],
};

/**
 * Schema for date range input
 */
export const DateRangeElicitSchema: ElicitSchema = {
  type: 'object',
  properties: {
    startDate: {
      type: 'string',
      title: 'Start Date',
      description: 'Beginning of the date range',
      format: 'date',
    },
    endDate: {
      type: 'string',
      title: 'End Date',
      description: 'End of the date range',
      format: 'date',
    },
  },
  required: ['startDate', 'endDate'],
};

/**
 * Schema for season selection
 */
export const SeasonElicitSchema: ElicitSchema = {
  type: 'object',
  properties: {
    season: {
      type: 'string',
      title: 'Liturgical Season',
      description: 'Select a liturgical season to search',
      enum: ['advent', 'christmas', 'epiphany', 'lent', 'easter', 'pentecost', 'ordinary'],
      enumNames: [
        'Advent',
        'Christmas',
        'Epiphany',
        'Lent',
        'Easter',
        'Pentecost / Ordinary Time',
        'Ordinary Time',
      ],
    },
  },
  required: ['season'],
};

/**
 * Schema for scripture reference input
 */
export const ScriptureElicitSchema: ElicitSchema = {
  type: 'object',
  properties: {
    scripture: {
      type: 'string',
      title: 'Scripture Reference',
      description: 'Enter a scripture reference (e.g., "John 3:16", "Psalm 23")',
    },
  },
  required: ['scripture'],
};

/**
 * Schema for feast day name input
 */
export const FeastElicitSchema: ElicitSchema = {
  type: 'object',
  properties: {
    feastName: {
      type: 'string',
      title: 'Feast or Holy Day',
      description: 'Enter the name of a feast or holy day to search',
    },
  },
  required: ['feastName'],
};

/**
 * Schema for analysis depth selection
 */
export const AnalysisDepthElicitSchema: ElicitSchema = {
  type: 'object',
  properties: {
    depth: {
      type: 'string',
      title: 'Analysis Depth',
      description: 'How detailed should the liturgical analysis be?',
      enum: ['basic', 'detailed', 'comprehensive'],
      enumNames: [
        'Basic - Quick overview',
        'Detailed - Standard analysis',
        'Comprehensive - Full context and connections',
      ],
      default: 'detailed',
    },
  },
  required: ['depth'],
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if the connected client supports elicitation
 */
export function clientSupportsElicitation(server: Server): boolean {
  const capabilities = server.getClientCapabilities();
  return !!capabilities?.elicitation;
}

/**
 * Helper to create an elicitation request and handle the response
 * Returns the content if accepted, or undefined if declined/cancelled
 */
export async function elicitFromUser<T extends Record<string, unknown>>(
  server: Server,
  message: string,
  schema: ElicitSchema,
): Promise<ElicitResponse<T>> {
  const result = await server.elicitInput({
    mode: 'form',
    message,
    requestedSchema: schema,
  });

  return {
    action: result.action,
    content: result.action === 'accept' ? result.content as T : undefined,
  };
}

/**
 * Elicit tradition selection if not provided
 * Returns the tradition value or default 'rcl'
 */
export async function elicitTradition(
  server: Server,
  currentTradition?: string,
): Promise<string> {
  // If tradition is already specified, use it
  if (currentTradition) {
    return currentTradition;
  }

  // If client doesn't support elicitation, use default
  if (!clientSupportsElicitation(server)) {
    return 'rcl';
  }

  const response = await elicitFromUser<{ tradition: string }>(
    server,
    'Which lectionary tradition would you like to use?',
    TraditionElicitSchema,
  );

  if (response.action === 'accept' && response.content?.tradition) {
    return response.content.tradition;
  }

  // Fall back to default on decline or cancel
  return 'rcl';
}

/**
 * Elicit search type if not provided
 * Returns the search type or undefined if cancelled
 */
export async function elicitSearchType(
  server: Server,
  currentSearchType?: string,
): Promise<string | undefined> {
  if (currentSearchType) {
    return currentSearchType;
  }

  if (!clientSupportsElicitation(server)) {
    return undefined;
  }

  const response = await elicitFromUser<{ searchType: string }>(
    server,
    'What would you like to search for in the lectionary?',
    SearchTypeElicitSchema,
  );

  if (response.action === 'accept' && response.content?.searchType) {
    return response.content.searchType;
  }

  return undefined;
}

/**
 * Elicit date range for search
 */
export async function elicitDateRange(
  server: Server,
  existingStart?: string,
  existingEnd?: string,
): Promise<{ startDate: string; endDate: string } | undefined> {
  if (existingStart && existingEnd) {
    return { startDate: existingStart, endDate: existingEnd };
  }

  if (!clientSupportsElicitation(server)) {
    return undefined;
  }

  const response = await elicitFromUser<{ startDate: string; endDate: string }>(
    server,
    'Enter the date range to search:',
    DateRangeElicitSchema,
  );

  if (response.action === 'accept' && response.content?.startDate && response.content?.endDate) {
    return response.content;
  }

  return undefined;
}

/**
 * Elicit season selection for search
 */
export async function elicitSeason(
  server: Server,
  existingSeason?: string,
): Promise<string | undefined> {
  if (existingSeason) {
    return existingSeason;
  }

  if (!clientSupportsElicitation(server)) {
    return undefined;
  }

  const response = await elicitFromUser<{ season: string }>(
    server,
    'Which liturgical season would you like to search?',
    SeasonElicitSchema,
  );

  if (response.action === 'accept' && response.content?.season) {
    return response.content.season;
  }

  return undefined;
}

/**
 * Elicit scripture reference for search
 */
export async function elicitScripture(
  server: Server,
  existingScripture?: string,
): Promise<string | undefined> {
  if (existingScripture) {
    return existingScripture;
  }

  if (!clientSupportsElicitation(server)) {
    return undefined;
  }

  const response = await elicitFromUser<{ scripture: string }>(
    server,
    'Enter a scripture reference to search for (e.g., "John 3:16"):',
    ScriptureElicitSchema,
  );

  if (response.action === 'accept' && response.content?.scripture) {
    return response.content.scripture;
  }

  return undefined;
}

/**
 * Elicit feast day name for search
 */
export async function elicitFeastName(
  server: Server,
  existingFeastName?: string,
): Promise<string | undefined> {
  if (existingFeastName) {
    return existingFeastName;
  }

  if (!clientSupportsElicitation(server)) {
    return undefined;
  }

  const response = await elicitFromUser<{ feastName: string }>(
    server,
    'Enter the name of the feast or holy day to search:',
    FeastElicitSchema,
  );

  if (response.action === 'accept' && response.content?.feastName) {
    return response.content.feastName;
  }

  return undefined;
}
