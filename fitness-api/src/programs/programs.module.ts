import { Body, Controller, Delete, Get, HttpCode, Module, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { ExercisesModule } from '../exercises/exercises.module';
import { ProgramDto } from './program.dto';
import { Program, ProgramDay, ProgramExercise } from './program.entity';
import { ProgramsService } from './programs.service';

@Controller('programs')
class ProgramsController {
  constructor(private readonly service: ProgramsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.service.list(u.id);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(u.id, id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: ProgramDto) {
    return this.service.create(u.id, dto);
  }

  @Put(':id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ProgramDto) {
    return this.service.update(u.id, id, dto);
  }

  @Post(':id/activate')
  @HttpCode(200)
  activate(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.activate(u.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(u.id, id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Program, ProgramDay, ProgramExercise]), ExercisesModule],
  controllers: [ProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
