import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tradition } from './tradition.entity';
import { LiturgicalYear } from './liturgical-year.entity';
import { Season } from './season.entity';
import { SpecialDay } from './special-day.entity';
import { Scripture } from './scripture.entity';

export enum ReadingType {
  FIRST = 'first',
  PSALM = 'psalm',
  SECOND = 'second',
  GOSPEL = 'gospel',
  ALLELUIA = 'alleluia',
  SEQUENCE = 'sequence',
  TRACT = 'tract',
  // Daily Office types
  OLD_TESTAMENT = 'old_testament',
  NEW_TESTAMENT = 'new_testament',
  MORNING_PSALM = 'morning_psalm',
  EVENING_PSALM = 'evening_psalm'
}

export enum ReadingOffice {
  SUNDAY = 'sunday',          // Sunday service
  WEEKDAY = 'weekday',        // Weekday service
  MORNING = 'morning',        // Morning Prayer/Matins
  EVENING = 'evening',        // Evening Prayer/Vespers
  COMPLINE = 'compline',      // Night Prayer
  SPECIAL = 'special'         // Special services
}

@Entity('readings')
@Index('idx_reading_date', ['date'])
@Index('idx_reading_tradition', ['traditionId'])
@Index('idx_reading_liturgical_year', ['liturgicalYearId'])
@Index('idx_reading_season', ['seasonId'])
@Index('idx_reading_special_day', ['specialDayId'])
@Index('idx_reading_scripture', ['scriptureId'])
@Index('idx_reading_type', ['readingType'])
@Index('idx_reading_date_tradition', ['date', 'traditionId'])
@Index('idx_reading_office', ['readingOffice'])
@Index('idx_reading_date_office', ['date', 'readingOffice'])
@Unique('uq_reading_date_tradition_type_office', ['date', 'traditionId', 'readingType', 'readingOffice', 'scriptureId'])
export class Reading {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({
    type: 'date',
  })
    date: Date;

  @Column({
    type: 'enum',
    enum: ReadingType,
    name: 'reading_type',
  })
    readingType: ReadingType;

  @Column({
    type: 'varchar',
    length: 200,
    name: 'scripture_reference',
    comment: 'Human-readable scripture reference (e.g., "John 3:16-17")',
  })
    scriptureReference: string;

  @Column({ 
    type: 'text',
    nullable: true,
    comment: 'Full text of the reading, if available',
  })
    text: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'NRSV',
    comment: 'Bible translation used for this reading',
  })
    translation: string;

  @Column({
    type: 'int',
    name: 'reading_order',
    default: 1,
    comment: 'Order of readings within a single day/service',
  })
    readingOrder: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Additional notes or context for this reading',
  })
    notes: string;

  @Column({
    type: 'boolean',
    name: 'is_alternative',
    default: false,
    comment: 'Whether this is an alternative reading option',
  })
    isAlternative: boolean;

  @Column({
    type: 'enum',
    enum: ReadingOffice,
    name: 'reading_office',
    default: ReadingOffice.SUNDAY,
    comment: 'Which office/service this reading belongs to',
  })
    readingOffice: ReadingOffice;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'cycle_year',
    nullable: true,
    comment: 'Cycle year for daily office (Year1/Year2) or lectionary year (A/B/C)',
  })
    cycleYear: string;

  // Foreign Keys
  @Column({
    type: 'uuid',
    name: 'tradition_id',
  })
    traditionId: string;

  @Column({
    type: 'uuid',
    name: 'liturgical_year_id',
    nullable: true,
  })
    liturgicalYearId: string;

  @Column({
    type: 'uuid',
    name: 'season_id',
    nullable: true,
  })
    seasonId: string;

  @Column({
    type: 'uuid',
    name: 'special_day_id',
    nullable: true,
  })
    specialDayId: string;

  @Column({
    type: 'uuid',
    name: 'scripture_id',
    nullable: true,
    comment: 'Reference to normalized scripture text',
  })
    scriptureId: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
  })
    createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
  })
    updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tradition, tradition => tradition.readings, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'tradition_id' })
    tradition: Tradition;

  @ManyToOne(() => LiturgicalYear, liturgicalYear => liturgicalYear.readings, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'liturgical_year_id' })
    liturgicalYear: LiturgicalYear;

  @ManyToOne(() => Season, season => season.readings, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'season_id' })
    season: Season;

  @ManyToOne(() => SpecialDay, specialDay => specialDay.readings, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'special_day_id' })
    specialDay: SpecialDay;

  @ManyToOne(() => Scripture, scripture => scripture.readings, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'scripture_id' })
    scripture: Scripture;
}