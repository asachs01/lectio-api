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
import { Tradition } from './tradition.entity';
import { Season } from './season.entity';
import { Reading } from './reading.entity';

export enum LiturgicalCycle {
  A = 'A',
  B = 'B',
  C = 'C'
}

@Entity('liturgical_years')
@Index('idx_liturgical_year_tradition', ['traditionId'])
@Index('idx_liturgical_year_dates', ['startDate', 'endDate'])
@Unique('uq_liturgical_year_tradition_name', ['name', 'traditionId'])
export class LiturgicalYear {
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
    enum: LiturgicalCycle,
    nullable: true,
    comment: 'Liturgical cycle (A, B, C) for traditions that use them'
  })
  cycle: LiturgicalCycle;

  @Column({
    type: 'int',
    comment: 'Calendar year this liturgical year primarily represents'
  })
  @Index('idx_liturgical_year_year')
  year: number;

  @Column({
    type: 'uuid',
    name: 'tradition_id'
  })
  traditionId: string;

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
  @ManyToOne(() => Tradition, tradition => tradition.liturgicalYears, {
    onDelete: 'CASCADE',
    nullable: false
  })
  @JoinColumn({ name: 'tradition_id' })
  tradition: Tradition;

  @OneToMany(() => Season, season => season.liturgicalYear, {
    cascade: ['remove']
  })
  seasons: Season[];

  @OneToMany(() => Reading, reading => reading.liturgicalYear)
  readings: Reading[];
}