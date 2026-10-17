import { Body, Controller, Delete, Get, HttpCode, Module, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { ExercisesModule } from '../exercises/exercises.module';
import { WorkoutDto } from './workout.dto';
import { Workout, WorkoutSet } from './workout.entity';
import { WorkoutsService } from './workouts.service';

@Controller('workouts')
class WorkoutsController {
  constructor(private readonly service: WorkoutsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(u.id, from, to);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(u.id, id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: WorkoutDto) {
    return this.service.create(u.id, dto);
  }

  @Put(':id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: WorkoutDto) {
    return this.service.update(u.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(u.id, id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Workout, WorkoutSet]), ExercisesModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
})
export class WorkoutsModule {}
