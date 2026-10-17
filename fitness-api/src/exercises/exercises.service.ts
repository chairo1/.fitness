import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, QueryFailedError, Repository } from 'typeorm';
import { Exercise, MuscleGroup } from './exercise.entity';

const DEFAULT_EXERCISES: [string, MuscleGroup][] = [
  ['Bench Press', 'chest'],
  ['Incline Dumbbell Press', 'chest'],
  ['Push-up', 'chest'],
  ['Cable Fly', 'chest'],
  ['Deadlift', 'back'],
  ['Pull-up', 'back'],
  ['Barbell Row', 'back'],
  ['Lat Pulldown', 'back'],
  ['Squat', 'legs'],
  ['Leg Press', 'legs'],
  ['Romanian Deadlift', 'legs'],
  ['Lunges', 'legs'],
  ['Leg Curl', 'legs'],
  ['Overhead Press', 'shoulders'],
  ['Lateral Raise', 'shoulders'],
  ['Face Pull', 'shoulders'],
  ['Barbell Curl', 'arms'],
  ['Hammer Curl', 'arms'],
  ['Triceps Pushdown', 'arms'],
  ['Dips', 'arms'],
  ['Plank', 'core'],
  ['Crunch', 'core'],
  ['Hanging Leg Raise', 'core'],
  ['Treadmill', 'cardio'],
  ['Rowing Machine', 'cardio'],
  ['Burpee', 'full_body'],
];

@Injectable()
export class ExercisesService implements OnModuleInit {
  constructor(@InjectRepository(Exercise) private readonly repo: Repository<Exercise>) {}

  async onModuleInit() {
    if ((await this.repo.count({ where: { userId: IsNull() } })) === 0) {
      await this.repo.save(DEFAULT_EXERCISES.map(([name, muscleGroup]) => this.repo.create({ name, muscleGroup })));
    }
  }

  findAll(userId: string) {
    return this.repo.find({
      where: [{ userId: IsNull() }, { userId }],
      order: { muscleGroup: 'ASC', name: 'ASC' },
    });
  }

  create(userId: string, name: string, muscleGroup: MuscleGroup) {
    return this.repo.save(this.repo.create({ userId, name: name.trim(), muscleGroup }));
  }

  async remove(userId: string, id: string) {
    const ex = await this.repo.findOne({ where: { id, userId } });
    if (!ex) throw new NotFoundException('Yalnız öz əlavə etdiyiniz hərəkətləri silə bilərsiniz');
    try {
      await this.repo.remove(ex);
    } catch (e) {
      if (e instanceof QueryFailedError && (e as any).code === '23503') {
        throw new ConflictException('Bu hərəkət məşq və ya proqramlarda istifadə olunur');
      }
      throw e;
    }
  }

  /** Throws if any of the ids is not visible to the user. */
  async assertAccessible(userId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const found = await this.repo.count({
      where: [
        { id: In(unique), userId: IsNull() },
        { id: In(unique), userId },
      ],
    });
    if (found !== unique.length) throw new BadRequestException('Naməlum hərəkət seçilib');
  }
}
