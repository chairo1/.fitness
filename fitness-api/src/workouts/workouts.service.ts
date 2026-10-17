import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { ExercisesService } from '../exercises/exercises.service';
import { ProgramDay } from '../programs/program.entity';
import { WorkoutDto } from './workout.dto';
import { Workout, WorkoutSet } from './workout.entity';

@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(Workout) private readonly repo: Repository<Workout>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly exercises: ExercisesService,
  ) {}

  list(userId: string, from?: string, to?: string) {
    const where: FindOptionsWhere<Workout> = { userId };
    if (from && to) where.date = Between(from, to);
    return this.repo.find({
      where,
      relations: { sets: true },
      order: { date: 'DESC', createdAt: 'DESC', sets: { order: 'ASC' } },
      take: 500,
    });
  }

  async get(userId: string, id: string) {
    const w = await this.repo.findOne({
      where: { id, userId },
      relations: { sets: true },
      order: { sets: { order: 'ASC' } },
    });
    if (!w) throw new NotFoundException('Məşq tapılmadı');
    return w;
  }

  async create(userId: string, dto: WorkoutDto) {
    await this.validate(userId, dto);
    const saved = await this.ds.transaction(async (m) => {
      const w = await m.save(m.create(Workout, { ...this.fields(dto), userId }));
      await this.saveSets(m.getRepository(WorkoutSet), w.id, dto);
      return w;
    });
    return this.get(userId, saved.id);
  }

  async update(userId: string, id: string, dto: WorkoutDto) {
    await this.get(userId, id);
    await this.validate(userId, dto);
    await this.ds.transaction(async (m) => {
      await m.update(Workout, id, this.fields(dto));
      await m.delete(WorkoutSet, { workoutId: id });
      await this.saveSets(m.getRepository(WorkoutSet), id, dto);
    });
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const w = await this.get(userId, id);
    await this.repo.remove(w);
  }

  private fields(dto: WorkoutDto) {
    return {
      date: dto.date.slice(0, 10),
      title: dto.title.trim(),
      notes: dto.notes ?? null,
      durationMin: dto.durationMin ?? null,
      programDayId: dto.programDayId ?? null,
    };
  }

  private saveSets(repo: Repository<WorkoutSet>, workoutId: string, dto: WorkoutDto) {
    if (!dto.sets.length) return;
    return repo.save(dto.sets.map((s, i) => repo.create({ ...s, workoutId, order: i })));
  }

  private async validate(userId: string, dto: WorkoutDto) {
    await this.exercises.assertAccessible(userId, dto.sets.map((s) => s.exerciseId));
    if (dto.programDayId) {
      const owned = await this.ds
        .getRepository(ProgramDay)
        .createQueryBuilder('d')
        .innerJoin('d.program', 'p')
        .where('d.id = :id AND p.userId = :userId', { id: dto.programDayId, userId })
        .getCount();
      if (!owned) throw new BadRequestException('Proqram günü tapılmadı');
    }
  }
}
