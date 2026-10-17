import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
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
import { ProgramType } from './program.entity';

export class ProgramExerciseDto {
  @IsUUID()
  exerciseId: string;

  @IsInt() @Min(1) @Max(20)
  sets: number;

  @IsInt() @Min(1) @Max(200)
  reps: number;

  @IsOptional() @IsNumber() @Min(0) @Max(2000)
  targetWeightKg?: number | null;
}

export class ProgramDayDto {
  @IsInt() @Min(1) @Max(4)
  week: number;

  @IsInt() @Min(1) @Max(7)
  dayIndex: number;

  @IsString() @IsNotEmpty() @MaxLength(80)
  title: string;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProgramExerciseDto)
  exercises: ProgramExerciseDto[];
}

export class ProgramDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  name: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string | null;

  @IsIn(['weekly', 'monthly'])
  type: ProgramType;

  @IsDateString()
  startDate: string;

  @IsArray()
  @ArrayMaxSize(28)
  @ValidateNested({ each: true })
  @Type(() => ProgramDayDto)
  days: ProgramDayDto[];
}
