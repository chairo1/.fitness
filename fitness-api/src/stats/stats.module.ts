import { Controller, Get, Injectable, Module, Param, ParseUUIDPipe } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { addDays, startOfWeek, todayStr } from '../common/dates';
import { BodyMetric, MetricsModule } from '../metrics/metrics.module';
import { ProgramsModule } from '../programs/programs.module';
import { ProgramsService } from '../programs/programs.service';

const WEEKS_IN_CHART = 12;
// Epley estimate of one-rep max
const EST_1RM = `s."weightKg" * (1 + s.reps / 30.0)`;

@Injectable()
class StatsService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly programs: ProgramsService,
  ) {}

  async dashboard(userId: string) {
    const today = todayStr();
    const weekStart = startOfWeek(today);
    const monthStart = `${today.slice(0, 8)}01`;
    const chartFrom = addDays(weekStart, -7 * (WEEKS_IN_CHART - 1));

    const [totals, volume, weeklyRows, weekRows, records, muscles, recent, body, activeProgram, weekDays] = await Promise.all([
      this.ds.query(
        `SELECT COUNT(*)::int AS "total",
                COUNT(*) FILTER (WHERE date >= $2)::int AS "thisWeek",
                COUNT(*) FILTER (WHERE date >= $3)::int AS "thisMonth",
                COALESCE(SUM("durationMin") FILTER (WHERE date >= $3), 0)::int AS "minutesThisMonth"
         FROM workouts WHERE "userId" = $1`,
        [userId, weekStart, monthStart],
      ),
      this.ds.query(
        `SELECT COALESCE(SUM(s.reps * s."weightKg") FILTER (WHERE w.date >= $2), 0)::float AS "volumeThisWeek",
                COALESCE(SUM(s.reps * s."weightKg") FILTER (WHERE w.date >= $3), 0)::float AS "volumeThisMonth"
         FROM workout_sets s JOIN workouts w ON w.id = s."workoutId"
         WHERE w."userId" = $1`,
        [userId, weekStart, monthStart],
      ),
      this.ds.query(
        `SELECT to_char(date_trunc('week', w.date::timestamp), 'YYYY-MM-DD') AS "week",
                COUNT(DISTINCT w.id)::int AS "workouts",
                COALESCE(SUM(s.reps * s."weightKg"), 0)::float AS "volume"
         FROM workouts w LEFT JOIN workout_sets s ON s."workoutId" = w.id
         WHERE w."userId" = $1 AND w.date >= $2
         GROUP BY 1 ORDER BY 1`,
        [userId, chartFrom],
      ),
      this.ds.query(
        `SELECT DISTINCT to_char(date_trunc('week', date::timestamp), 'YYYY-MM-DD') AS "week"
         FROM workouts WHERE "userId" = $1 ORDER BY 1 DESC LIMIT 260`,
        [userId],
      ),
      this.ds.query(
        `SELECT e.id, e.name, e."muscleGroup",
                MAX(s."weightKg")::float AS "maxWeight",
                MAX(${EST_1RM})::float AS "est1rm"
         FROM workout_sets s
         JOIN workouts w ON w.id = s."workoutId"
         JOIN exercises e ON e.id = s."exerciseId"
         WHERE w."userId" = $1 AND s."weightKg" > 0
         GROUP BY e.id ORDER BY "est1rm" DESC LIMIT 6`,
        [userId],
      ),
      this.ds.query(
        `SELECT e."muscleGroup" AS "muscleGroup", COUNT(*)::int AS "sets",
                to_char(MAX(w.date), 'YYYY-MM-DD') AS "lastDate"
         FROM workout_sets s
         JOIN workouts w ON w.id = s."workoutId"
         JOIN exercises e ON e.id = s."exerciseId"
         WHERE w."userId" = $1 AND w.date >= $2
         GROUP BY 1 ORDER BY 2 DESC`,
        [userId, addDays(today, -29)],
      ),
      this.ds.query(
        `SELECT w.id, w.title, to_char(w.date, 'YYYY-MM-DD') AS "date", w."durationMin",
                COUNT(s.id)::int AS "sets",
                COALESCE(SUM(s.reps * s."weightKg"), 0)::float AS "volume"
         FROM workouts w LEFT JOIN workout_sets s ON s."workoutId" = w.id
         WHERE w."userId" = $1
         GROUP BY w.id ORDER BY w.date DESC, w."createdAt" DESC LIMIT 5`,
        [userId],
      ),
      this.ds.getRepository(BodyMetric).find({ where: { userId }, order: { date: 'DESC', createdAt: 'DESC' }, take: 20 }),
      this.programs.getActive(userId),
      this.ds.query(
        `SELECT DISTINCT to_char(date, 'YYYY-MM-DD') AS "date" FROM workouts
         WHERE "userId" = $1 AND date >= $2 AND date <= $3 ORDER BY 1`,
        [userId, weekStart, addDays(weekStart, 6)],
      ),
    ]);

    const byWeek = new Map<string, { workouts: number; volume: number }>(weeklyRows.map((r) => [r.week, r]));
    const weekly = Array.from({ length: WEEKS_IN_CHART }, (_, i) => {
      const week = addDays(chartFrom, i * 7);
      const row = byWeek.get(week);
      return { week, workouts: row?.workouts ?? 0, volume: row?.volume ?? 0 };
    });

    // Consecutive weeks with at least one workout; the current week counts once it has one.
    const trained = new Set<string>(weekRows.map((r) => r.week));
    let cursor = trained.has(weekStart) ? weekStart : addDays(weekStart, -7);
    let weekStreak = 0;
    while (trained.has(cursor)) {
      weekStreak++;
      cursor = addDays(cursor, -7);
    }

    let program = null;
    let weekPlan: { date: string; title: string; status: string }[] = [];
    if (activeProgram) {
      const { days, ...rest } = activeProgram;
      const weekEnd = addDays(weekStart, 6);
      weekPlan = days
        .filter((d) => d.date >= weekStart && d.date <= weekEnd)
        .map((d) => ({ date: d.date, title: d.title, status: d.status }));
      const nextDay = days.find((d) => d.status === 'today') ?? days.find((d) => d.status === 'upcoming') ?? null;
      program = { ...rest, nextDay };
    }

    return {
      totals: { ...totals[0], ...volume[0], weekStreak },
      weekly,
      // Days of the current week (Mon–Sun) that have a workout.
      weekDays: weekDays.map((r) => r.date),
      // Active program days that fall in the current week.
      weekPlan,
      records,
      muscles,
      recent,
      body: [...body].reverse(),
      activeProgram: program,
    };
  }

  exerciseProgress(userId: string, exerciseId: string) {
    return this.ds.query(
      `SELECT to_char(w.date, 'YYYY-MM-DD') AS "date",
              MAX(s."weightKg")::float AS "maxWeight",
              MAX(${EST_1RM})::float AS "est1rm",
              SUM(s.reps * s."weightKg")::float AS "volume",
              SUM(s.reps)::int AS "reps",
              COUNT(*)::int AS "sets"
       FROM workout_sets s JOIN workouts w ON w.id = s."workoutId"
       WHERE w."userId" = $1 AND s."exerciseId" = $2
       GROUP BY w.date ORDER BY w.date`,
      [userId, exerciseId],
    );
  }
}

@Controller('stats')
class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() u: AuthUser) {
    return this.service.dashboard(u.id);
  }

  @Get('exercises/:id')
  exercise(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.exerciseProgress(u.id, id);
  }
}

@Module({
  imports: [ProgramsModule, MetricsModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
