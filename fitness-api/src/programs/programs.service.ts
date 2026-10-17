import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { addDays, todayStr } from '../common/dates';
import { ExercisesService } from '../exercises/exercises.service';
import { ProgramDto } from './program.dto';
import { Program, PROGRAM_WEEKS, ProgramDay, ProgramExercise } from './program.entity';

export type DayStatus = 'done' | 'missed' | 'today' | 'upcoming';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program) private readonly repo: Repository<Program>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly exercises: ExercisesService,
  ) {}

  async list(userId: string) {
    const programs = await this.repo.find({
      where: { userId },
      relations: { days: { workouts: true } },
      order: { isActive: 'DESC', createdAt: 'DESC' },
    });
    return programs.map((p) => {
      const { days, ...rest } = this.decorate(p);
      return { ...rest, weekStats: this.weekStats(p, days) };
    });
  }

  async get(userId: string, id: string) {
    const p = await this.repo.findOne({
      where: { id, userId },
      relations: { days: { exercises: true, workouts: true } },
    });
    if (!p) throw new NotFoundException('Proqram tapılmadı');
    const decorated = this.decorate(p);
    return { ...decorated, weekStats: this.weekStats(p, decorated.days) };
  }

  async getActive(userId: string) {
    const active = await this.repo.findOne({ where: { userId, isActive: true }, select: { id: true } });
    return active ? this.get(userId, active.id) : null;
  }

  async create(userId: string, dto: ProgramDto) {
    await this.validate(userId, dto);
    const hasActive = (await this.repo.count({ where: { userId, isActive: true } })) > 0;
    const id = await this.ds.transaction(async (m) => {
      const p = await m.save(m.create(Program, { ...this.fields(dto), userId, isActive: !hasActive }));
      await this.syncDays(m, p.id, dto);
      return p.id;
    });
    return this.get(userId, id);
  }

  async update(userId: string, id: string, dto: ProgramDto) {
    await this.get(userId, id);
    await this.validate(userId, dto);
    await this.ds.transaction(async (m) => {
      await m.update(Program, id, this.fields(dto));
      await this.syncDays(m, id, dto);
    });
    return this.get(userId, id);
  }

  async activate(userId: string, id: string) {
    await this.get(userId, id);
    await this.ds.transaction(async (m) => {
      await m.update(Program, { userId }, { isActive: false });
      await m.update(Program, { id, userId }, { isActive: true });
    });
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const p = await this.repo.findOne({ where: { id, userId } });
    if (!p) throw new NotFoundException('Proqram tapılmadı');
    await this.repo.remove(p);
  }

  private fields(dto: ProgramDto) {
    return {
      name: dto.name.trim(),
      description: dto.description ?? null,
      type: dto.type,
      startDate: dto.startDate.slice(0, 10),
    };
  }

  /**
   * Upserts days by (week, dayIndex) so logged workouts stay linked to days that survive an edit.
   */
  private async syncDays(m: EntityManager, programId: string, dto: ProgramDto) {
    const key = (w: number, d: number) => `${w}-${d}`;
    const existing = await m.find(ProgramDay, { where: { programId } });
    const byKey = new Map(existing.map((d) => [key(d.week, d.dayIndex), d]));
    const keep = new Set<string>();

    for (const dd of dto.days) {
      const k = key(dd.week, dd.dayIndex);
      keep.add(k);
      let day = byKey.get(k);
      if (day) {
        await m.update(ProgramDay, day.id, { title: dd.title.trim() });
        await m.delete(ProgramExercise, { dayId: day.id });
      } else {
        day = await m.save(
          m.create(ProgramDay, { programId, week: dd.week, dayIndex: dd.dayIndex, title: dd.title.trim() }),
        );
      }
      if (dd.exercises.length) {
        await m.save(
          dd.exercises.map((e, i) =>
            m.create(ProgramExercise, {
              dayId: day.id,
              exerciseId: e.exerciseId,
              sets: e.sets,
              reps: e.reps,
              targetWeightKg: e.targetWeightKg ?? null,
              order: i,
            }),
          ),
        );
      }
    }

    const stale = existing.filter((d) => !keep.has(key(d.week, d.dayIndex))).map((d) => d.id);
    if (stale.length) await m.delete(ProgramDay, stale);
  }

  private async validate(userId: string, dto: ProgramDto) {
    const weeks = PROGRAM_WEEKS[dto.type];
    const seen = new Set<string>();
    for (const d of dto.days) {
      if (d.week > weeks) throw new BadRequestException(`Bu proqram növündə ən çox ${weeks} həftə ola bilər`);
      const k = `${d.week}-${d.dayIndex}`;
      if (seen.has(k)) throw new BadRequestException('Eyni gün iki dəfə göndərilib');
      seen.add(k);
    }
    await this.exercises.assertAccessible(
      userId,
      dto.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)),
    );
  }

  private decorate(p: Program) {
    const weeks = PROGRAM_WEEKS[p.type];
    const today = todayStr();
    const endDate = addDays(p.startDate, weeks * 7 - 1);

    const days = [...(p.days ?? [])]
      .sort((a, b) => a.week - b.week || a.dayIndex - b.dayIndex)
      .map((d) => {
        const date = addDays(p.startDate, (d.week - 1) * 7 + (d.dayIndex - 1));
        const done = (d.workouts ?? []).length > 0;
        const status: DayStatus = done ? 'done' : date < today ? 'missed' : date === today ? 'today' : 'upcoming';
        return {
          id: d.id,
          week: d.week,
          dayIndex: d.dayIndex,
          title: d.title,
          date,
          status,
          exercises: [...(d.exercises ?? [])].sort((a, b) => a.order - b.order),
          workouts: (d.workouts ?? []).map((w) => ({ id: w.id, date: w.date, title: w.title })),
        };
      });

    const completed = days.filter((d) => d.status === 'done').length;
    const missed = days.filter((d) => d.status === 'missed').length;
    const { days: _raw, ...program } = p;
    return {
      ...program,
      endDate,
      days,
      stats: {
        totalDays: days.length,
        completed,
        missed,
        remaining: days.length - completed - missed,
        progress: days.length ? Math.round((completed / days.length) * 100) : 0,
      },
    };
  }

  private weekStats(p: Program, days: { week: number; status: DayStatus }[]) {
    return Array.from({ length: PROGRAM_WEEKS[p.type] }, (_, i) => {
      const inWeek = days.filter((d) => d.week === i + 1);
      return { week: i + 1, planned: inWeek.length, completed: inWeek.filter((d) => d.status === 'done').length };
    });
  }
}
