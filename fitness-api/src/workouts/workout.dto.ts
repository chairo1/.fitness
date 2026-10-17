import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class WorkoutSetDto {
  @IsUUID()
  exerciseId: string;

  @IsInt() @Min(0) @Max(1000)
  reps: number;

  @IsNumber() @Min(0) @Max(2000)
  weightKg: number;
}

export class WorkoutDto {
  @IsDateString()
  date: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  title: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string | null;

  @IsOptional() @IsInt() @Min(0) @Max(1440)
  durationMin?: number | null;

  @IsOptional() @IsUUID()
  programDayId?: string | null;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => WorkoutSetDto)
  sets: WorkoutSetDto[];
}
