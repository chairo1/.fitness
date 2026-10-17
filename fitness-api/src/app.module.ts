import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Public } from './auth/public.decorator';
import { ExercisesModule } from './exercises/exercises.module';
import { MetricsModule } from './metrics/metrics.module';
import { ProgramsModule } from './programs/programs.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';
import { WorkoutsModule } from './workouts/workouts.module';

@Controller('health')
class HealthController {
  @Public()
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'postgres',
        host: c.get('DB_HOST', 'localhost'),
        port: Number(c.get('DB_PORT', 5432)),
        username: c.get('DB_USER', 'fitness'),
        password: c.get('DB_PASSWORD', 'fitness'),
        database: c.get('DB_NAME', 'fitness'),
        autoLoadEntities: true,
        synchronize: c.get('DB_SYNC', 'true') === 'true',
      }),
    }),
    AuthModule,
    UsersModule,
    ExercisesModule,
    WorkoutsModule,
    ProgramsModule,
    MetricsModule,
    StatsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
