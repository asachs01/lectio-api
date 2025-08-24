// Entity exports
export { Tradition } from './tradition.entity';
export { LiturgicalYear, LiturgicalCycle } from './liturgical-year.entity';
export { Season, LiturgicalColor } from './season.entity';
export { SpecialDay, SpecialDayType, SpecialDayRank } from './special-day.entity';
export { Scripture } from './scripture.entity';
export { Reading, ReadingType } from './reading.entity';

// Export all entities as an array for TypeORM configuration
import { Tradition } from './tradition.entity';
import { LiturgicalYear } from './liturgical-year.entity';
import { Season } from './season.entity';
import { SpecialDay } from './special-day.entity';
import { Scripture } from './scripture.entity';
import { Reading } from './reading.entity';

export const entities = [
  Tradition,
  LiturgicalYear,
  Season,
  SpecialDay,
  Scripture,
  Reading
];

export default entities;