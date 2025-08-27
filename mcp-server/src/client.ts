import axios from 'axios';
import type { AxiosInstance } from 'axios';

export interface Reading {
  type: 'first' | 'psalm' | 'second' | 'gospel';
  citation: string;
  text?: string;
  alternative?: string;
}

export interface DailyReading {
  id: string;
  date: string;
  traditionId: string;
  seasonId: string;
  readings: Reading[];
  liturgicalDay?: string;
  specialDay?: string;
}

export interface LiturgicalSeason {
  id: string;
  name: string;
  color: string;
  startDate: string;
  endDate: string;
  traditionId: string;
}

export interface CalendarInfo {
  currentSeason: LiturgicalSeason;
  currentYear: number;
  today: string;
  upcomingSpecialDays: Array<{
    name: string;
    date: string;
    daysUntil: number;
  }>;
}

export interface LiturgicalAnalysis {
  date: string;
  season: LiturgicalSeason;
  readings: DailyReading;
  themes: string[];
  connections: {
    oldTestament?: string;
    psalm?: string;
    newTestament?: string;
    gospel?: string;
  };
  liturgicalSignificance?: string;
  practicalApplication?: string;
}

export class LectionaryClient {
  private api: AxiosInstance;
  
  constructor(baseUrl: string) {
    this.api = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  async getReadings(date?: string, tradition = 'rcl', includeText = false): Promise<DailyReading> {
    const endpoint = date ? '/readings' : '/readings/today';
    const params: any = { tradition };
    if (date) params.date = date;
    if (includeText) params.includeText = true;
    
    const response = await this.api.get(endpoint, { params });
    return response.data.data;
  }
  
  async getCurrentCalendar(tradition = 'rcl'): Promise<CalendarInfo> {
    const response = await this.api.get('/calendar/current', {
      params: { tradition },
    });
    return response.data.data;
  }
  
  async getCalendarByYear(year: number, tradition = 'rcl') {
    const response = await this.api.get(`/calendar/${year}`, {
      params: { tradition },
    });
    return response.data.data;
  }
  
  async getSeasonsByYear(year: number, tradition = 'rcl'): Promise<LiturgicalSeason[]> {
    const response = await this.api.get(`/calendar/${year}/seasons`, {
      params: { tradition },
    });
    return response.data.data;
  }
  
  async getSpecialDays(year: number, tradition = 'rcl') {
    const calendar = await this.getCalendarByYear(year, tradition);
    return calendar.specialDays || [];
  }
  
  async getReadingsByDateRange(startDate: string, endDate: string, tradition = 'rcl') {
    const response = await this.api.get('/readings/range', {
      params: { start: startDate, end: endDate, tradition },
    });
    return response.data.data;
  }
  
  async getReadingsBySeason(season: string, tradition = 'rcl') {
    // This would need to be implemented on the API side
    // For now, we'll get the current year's season dates and fetch readings
    const year = new Date().getFullYear();
    const seasons = await this.getSeasonsByYear(year, tradition);
    const targetSeason = seasons.find(s => 
      s.name.toLowerCase().includes(season.toLowerCase())
    );
    
    if (!targetSeason) {
      throw new Error(`Season "${season}" not found`);
    }
    
    return this.getReadingsByDateRange(
      targetSeason.startDate, 
      targetSeason.endDate, 
      tradition
    );
  }
  
  async findByScripture(scripture: string, tradition = 'rcl') {
    // This would need a search endpoint on the API
    // For now, return a placeholder
    return {
      message: 'Scripture search not yet implemented',
      query: scripture,
      tradition,
    };
  }
  
  async findFeastDay(feastName: string, tradition = 'rcl') {
    const year = new Date().getFullYear();
    const specialDays = await this.getSpecialDays(year, tradition);
    
    const matches = specialDays.filter((day: any) =>
      day.name.toLowerCase().includes(feastName.toLowerCase())
    );
    
    if (matches.length === 0) {
      return { message: `No feast days found matching "${feastName}"` };
    }
    
    // Get readings for each matching feast day
    const results = await Promise.all(
      matches.map(async (day: any) => ({
        ...day,
        readings: await this.getReadings(day.date, tradition),
      }))
    );
    
    return results;
  }
  
  async analyzeLiturgicalContext(
    date: string, 
    depth: 'basic' | 'detailed' | 'comprehensive' = 'detailed',
    tradition = 'rcl'
  ): Promise<LiturgicalAnalysis> {
    // Get readings for the date
    const readings = await this.getReadings(date, tradition, depth !== 'basic');
    
    // Get calendar info
    const [year] = date.split('-');
    const calendar = await this.getCalendarByYear(parseInt(year), tradition);
    
    // Find the current season
    const dateObj = new Date(date);
    const season = calendar.seasons.find((s: LiturgicalSeason) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      return dateObj >= start && dateObj <= end;
    });
    
    // Build analysis based on depth
    const analysis: LiturgicalAnalysis = {
      date,
      season,
      readings,
      themes: extractThemes(readings, season),
      connections: depth !== 'basic' ? extractConnections(readings) : {},
    };
    
    if (depth === 'comprehensive') {
      analysis.liturgicalSignificance = generateSignificance(readings, season);
      analysis.practicalApplication = generateApplication(readings);
    }
    
    return analysis;
  }
}

// Helper functions for analysis
function extractThemes(readings: DailyReading, season: LiturgicalSeason): string[] {
  const themes: string[] = [];
  
  // Season-based themes
  const seasonThemes: Record<string, string[]> = {
    advent: ['Preparation', 'Waiting', 'Hope', 'Expectation'],
    christmas: ['Incarnation', 'Joy', 'Light', 'Emmanuel'],
    epiphany: ['Revelation', 'Manifestation', 'Light to Nations'],
    lent: ['Repentance', 'Sacrifice', 'Journey', 'Transformation'],
    easter: ['Resurrection', 'New Life', 'Victory', 'Joy'],
    pentecost: ['Spirit', 'Church', 'Mission', 'Gifts'],
    ordinary: ['Discipleship', 'Kingdom', 'Growth', 'Service'],
  };
  
  const seasonKey = season.name.toLowerCase().split(' ')[0];
  if (seasonThemes[seasonKey]) {
    themes.push(...seasonThemes[seasonKey]);
  }
  
  return themes;
}

function extractConnections(readings: DailyReading) {
  return {
    oldTestament: 'Connection between first reading and Gospel',
    psalm: 'Response to first reading',
    newTestament: 'Theological expansion of Gospel themes',
    gospel: 'Central narrative and teaching',
  };
}

function generateSignificance(readings: DailyReading, season: LiturgicalSeason): string {
  return `This day in the ${season.name} season emphasizes the theological themes present in the readings, 
  particularly the relationship between the Old Testament promises and their fulfillment in the Gospel.`;
}

function generateApplication(readings: DailyReading): string {
  return `These readings invite the community to reflect on their faith journey and consider how 
  the scriptural messages apply to contemporary Christian life and witness.`;
}