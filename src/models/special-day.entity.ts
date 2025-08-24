import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Tradition } from './tradition.entity';
import { Reading } from './reading.entity';

export enum SpecialDayType {
  FEAST = 'feast',
  FAST = 'fast',
  COMMEMORATION = 'commemoration',
  MEMORIAL = 'memorial',
  SOLEMNITY = 'solemnity',
  OPTIONAL_MEMORIAL = 'optional_memorial',
  OTHER = 'other'
}

export enum SpecialDayRank {
  SOLEMNITY = 'solemnity',
  FEAST = 'feast',
  MEMORIAL = 'memorial',
  OPTIONAL_MEMORIAL = 'optional_memorial',
  WEEKDAY = 'weekday'
}

@Entity('special_days')
@Index('idx_special_day_tradition', ['traditionId'])
@Index('idx_special_day_date', ['date'])
@Index('idx_special_day_type', ['type'])
@Unique('uq_special_day_tradition_date', ['name', 'date', 'traditionId'])
export class SpecialDay {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ 
    type: 'varchar', 
    length: 200, 
  })
    name: string;

  @Column({
    type: 'date',
  })
    date: Date;

  @Column({ 
    type: 'text',
    nullable: true,
  })
    description: string;

  @Column({
    type: 'enum',
    enum: SpecialDayType,
    default: SpecialDayType.OTHER,
  })
    type: SpecialDayType;

  @Column({
    type: 'enum',
    enum: SpecialDayRank,
    nullable: true,
    comment: 'Liturgical rank for priority determination',
  })
    rank: SpecialDayRank;

  @Column({
    type: 'boolean',
    name: 'is_feast_day',
    default: false,
  })
    isFeastDay: boolean;

  @Column({
    type: 'boolean',
    name: 'is_moveable',
    default: false,
    comment: 'Whether this day moves based on Easter calculation',
  })
    isMoveable: boolean;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Liturgical color for this special day',
  })
    liturgicalColor: string;

  @Column({
    type: 'int',
    name: 'year',
    nullable: true,
    comment: 'Specific year if this is a yearly occurrence',
  })
  @Index('idx_special_day_year')
    year: number;

  @Column({
    type: 'uuid',
    name: 'tradition_id',
  })
    traditionId: string;

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
  @ManyToOne(() => Tradition, tradition => tradition.specialDays, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'tradition_id' })
    tradition: Tradition;

  @OneToMany(() => Reading, reading => reading.specialDay)
    readings: Reading[];
}