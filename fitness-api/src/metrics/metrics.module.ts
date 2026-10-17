import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';

@Entity('body_metrics')
export class BodyMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'float' })
  weightKg: number;

  @Column({ type: 'float', nullable: true })
  bodyFatPct: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

class BodyMetricDto {
  @IsDateString()
  date: string;

  @IsNumber() @Min(20) @Max(400)
  weightKg: number;

  @IsOptional() @IsNumber() @Min(2) @Max(70)
  bodyFatPct?: number | null;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string | null;
}

@Controller('metrics')
class MetricsController {
  constructor(@InjectRepository(BodyMetric) private readonly repo: Repository<BodyMetric>) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.repo.find({ where: { userId: u.id }, order: { date: 'ASC', createdAt: 'ASC' } });
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: BodyMetricDto) {
    return this.repo.save(
      this.repo.create({
        userId: u.id,
        date: dto.date.slice(0, 10),
        weightKg: dto.weightKg,
        bodyFatPct: dto.bodyFatPct ?? null,
        notes: dto.notes ?? null,
      }),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const res = await this.repo.delete({ id, userId: u.id });
    if (!res.affected) throw new NotFoundException();
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([BodyMetric])],
  controllers: [MetricsController],
  exports: [TypeOrmModule],
})
export class MetricsModule {}
