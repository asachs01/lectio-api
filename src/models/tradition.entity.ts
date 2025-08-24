import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { LiturgicalYear } from './liturgical-year.entity';
import { SpecialDay } from './special-day.entity';
import { Reading } from './reading.entity';

@Entity('traditions')
@Index('idx_tradition_name', ['name'])
export class Tradition {
  @PrimaryGeneratedColumn('uuid')
    id: string;

  @Column({ 
    type: 'varchar', 
    length: 100, 
    unique: true, 
  })
  @Index('idx_tradition_name_unique')
    name: string;

  @Column({ 
    type: 'text', 
    nullable: true, 
  })
    description: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Short abbreviation for the tradition',
  })
    abbreviation: string;

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
  @OneToMany(() => LiturgicalYear, liturgicalYear => liturgicalYear.tradition, {
    cascade: ['remove'],
  })
    liturgicalYears: LiturgicalYear[];

  @OneToMany(() => SpecialDay, specialDay => specialDay.tradition, {
    cascade: ['remove'],
  })
    specialDays: SpecialDay[];

  @OneToMany(() => Reading, reading => reading.tradition, {
    cascade: ['remove'],
  })
    readings: Reading[];
}