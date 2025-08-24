import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany,
  Index,
  Unique
} from 'typeorm';
import { Reading } from './reading.entity';

@Entity('scriptures')
@Index('idx_scripture_book', ['book'])
@Index('idx_scripture_reference', ['book', 'chapter', 'verseStart', 'verseEnd'])
@Index('idx_scripture_translation', ['translation'])
@Unique('uq_scripture_reference_translation', ['book', 'chapter', 'verseStart', 'verseEnd', 'translation'])
export class Scripture {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 50 
  })
  book: string;

  @Column({
    type: 'int'
  })
  chapter: number;

  @Column({
    type: 'int',
    name: 'verse_start'
  })
  verseStart: number;

  @Column({
    type: 'int',
    name: 'verse_end',
    nullable: true,
    comment: 'End verse for ranges, null for single verses'
  })
  verseEnd: number;

  @Column({ 
    type: 'text' 
  })
  text: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'NRSV',
    comment: 'Bible translation abbreviation'
  })
  translation: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Testament categorization'
  })
  @Index('idx_scripture_testament')
  testament: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Book category (e.g., Gospels, Epistles, Prophets)'
  })
  bookCategory: string;

  @Column({
    type: 'int',
    name: 'book_order',
    nullable: true,
    comment: 'Canonical order of books'
  })
  bookOrder: number;

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
  @OneToMany(() => Reading, reading => reading.scripture)
  readings: Reading[];

  // Computed property for full reference
  get fullReference(): string {
    const chapter = this.chapter;
    const verses = this.verseEnd && this.verseEnd !== this.verseStart 
      ? `${this.verseStart}-${this.verseEnd}`
      : this.verseStart.toString();
    
    return `${this.book} ${chapter}:${verses}`;
  }

  // Computed property for citation with translation
  get citation(): string {
    return `${this.fullReference} (${this.translation})`;
  }
}