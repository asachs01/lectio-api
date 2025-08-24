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
  Unique
} from 'typeorm';
import { LiturgicalYear } from './liturgical-year.entity';
import { Reading } from './reading.entity';

export enum LiturgicalColor {
  WHITE = 'white',
  RED = 'red',
  GREEN = 'green',
  PURPLE = 'purple',
  VIOLET = 'violet',
  ROSE = 'rose',
  BLACK = 'black',
  GOLD = 'gold'
}

@Entity('seasons')
@Index('idx_season_liturgical_year', ['liturgicalYearId'])
@Index('idx_season_dates', ['startDate', 'endDate'])
@Unique('uq_season_name_year', ['name', 'liturgicalYearId'])
export class Season {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 50 
  })
  name: string;

  @Column({
    type: 'date',
    name: 'start_date'
  })
  startDate: Date;

  @Column({
    type: 'date',
    name: 'end_date'
  })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: LiturgicalColor,
    default: LiturgicalColor.GREEN
  })
  color: LiturgicalColor;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Additional description or notes about the season'
  })
  description: string;

  @Column({
    type: 'int',
    name: 'sort_order',
    default: 0,
    comment: 'Order of seasons within a liturgical year'
  })
  sortOrder: number;

  @Column({
    type: 'uuid',
    name: 'liturgical_year_id'
  })
  liturgicalYearId: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at'
  })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => LiturgicalYear, liturgicalYear => liturgicalYear.seasons, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: 'liturgical_year_id' })
  liturgicalYear: LiturgicalYear;

  @OneToMany(() => Reading, reading => reading.season)
  readings: Reading[];
}