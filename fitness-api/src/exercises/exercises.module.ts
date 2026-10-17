import { Body, Controller, Delete, Get, HttpCode, Module, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { Exercise, MUSCLE_GROUPS, MuscleGroup } from './exercise.entity';
import { ExercisesService } from './exercises.service';

class CreateExerciseDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  name: string;

  @IsIn(MUSCLE_GROUPS)
  muscleGroup: MuscleGroup;
}

@Controller('exercises')
class ExercisesController {
  constructor(private readonly service: ExercisesService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.service.findAll(u.id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateExerciseDto) {
    return this.service.create(u.id, dto.name, dto.muscleGroup);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(u.id, id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Exercise])],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}
