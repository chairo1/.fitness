import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Exercise } from '../exercises/exercise.entity';
import { Workout } from '../workouts/workout.entity';

export type ProgramType = 'weekly' | 'monthly';
export const PROGRAM_WEEKS: Record<ProgramType, number> = { weekly: 1, monthly: 4 };

@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 10 })
  type: ProgramType;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ default: false })
  isActive: boolean;

  @OneToMany(() => ProgramDay, (d) => d.program, { cascade: true })
  days: ProgramDay[];

  @CreateDateColumn()
  createdAt: Date;
}

/** A planned training day. Day slots without a row are rest days. */
@Entity('program_days')
@Unique(['programId', 'week', 'dayIndex'])
export class ProgramDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  programId: string;

  @ManyToOne(() => Program, (p) => p.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'programId' })
  program: Program;

  /** 1..4 */
  @Column({ type: 'int' })
  week: number;

  /** 1..7, counted from the program start date */
  @Column({ type: 'int' })
  dayIndex: number;

  @Column()
  title: string;

  @OneToMany(() => ProgramExercise, (e) => e.day, { cascade: true })
  exercises: ProgramExercise[];

  @OneToMany(() => Workout, (w) => w.programDay)
  workouts: Workout[];
}

@Entity('program_exercises')
export class ProgramExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  dayId: string;

  @ManyToOne(() => ProgramDay, (d) => d.exercises, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dayId' })
  day: ProgramDay;

  @Column('uuid')
  exerciseId: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'exerciseId' })
  exercise: Exercise;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'int' })
  sets: number;

  @Column({ type: 'int' })
  reps: number;

  @Column({ type: 'float', nullable: true })
  targetWeightKg: number | null;
}
