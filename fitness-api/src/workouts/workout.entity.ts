import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exercise } from '../exercises/exercise.entity';
import { ProgramDay } from '../programs/program.entity';

@Entity('workouts')
export class Workout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', nullable: true })
  durationMin: number | null;

  /** Set when the workout fulfils a planned program day. */
  @Column({ type: 'uuid', nullable: true })
  programDayId: string | null;

  @ManyToOne(() => ProgramDay, (d) => d.workouts, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'programDayId' })
  programDay: ProgramDay | null;

  @OneToMany(() => WorkoutSet, (s) => s.workout, { cascade: true })
  sets: WorkoutSet[];

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('workout_sets')
export class WorkoutSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  workoutId: string;

  @ManyToOne(() => Workout, (w) => w.sets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workoutId' })
  workout: Workout;

  @Column('uuid')
  exerciseId: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'exerciseId' })
  exercise: Exercise;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ type: 'int' })
  reps: number;

  @Column({ type: 'float', default: 0 })
  weightKg: number;
}
