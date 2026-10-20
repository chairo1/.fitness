import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PERMISSION_CODES } from '../access/permissions';

export class ListUsersQuery {
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @IsOptional() @IsUUID('all')
  roleId?: string;

  @IsOptional() @IsIn(['active', 'blocked'])
  status?: 'active' | 'blocked';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;
}

export class CreateUserDto {
  @IsEmail({}, { message: 'Düzgün email daxil edin' })
  email: string;

  @IsString() @IsNotEmpty({ message: 'Ad boş ola bilməz' }) @MaxLength(80)
  name: string;

  @IsString() @MinLength(6, { message: 'Şifrə ən azı 6 simvol olmalıdır' })
  password: string;

  @IsArray() @ArrayMinSize(1, { message: 'Ən azı bir rol seçin' }) @IsUUID('all', { each: true })
  roleIds: string[];

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @IsOptional() @IsEmail({}, { message: 'Düzgün email daxil edin' })
  email?: string;

  @IsOptional() @IsString() @IsNotEmpty({ message: 'Ad boş ola bilməz' }) @MaxLength(80)
  name?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsArray() @ArrayMinSize(1, { message: 'Ən azı bir rol seçin' }) @IsUUID('all', { each: true })
  roleIds?: string[];
}

export class ResetPasswordDto {
  @IsString() @MinLength(6, { message: 'Şifrə ən azı 6 simvol olmalıdır' })
  password: string;
}

export class CreateRoleDto {
  @IsString() @IsNotEmpty({ message: 'Rolun adı boş ola bilməz' }) @MaxLength(40)
  name: string;

  @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @IsArray() @IsIn(PERMISSION_CODES, { each: true, message: 'Naməlum səlahiyyət' })
  permissions: string[];
}

export class UpdateRoleDto {
  @IsOptional() @IsString() @IsNotEmpty({ message: 'Rolun adı boş ola bilməz' }) @MaxLength(40)
  name?: string;

  @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @IsOptional() @IsArray() @IsIn(PERMISSION_CODES, { each: true, message: 'Naməlum səlahiyyət' })
  permissions?: string[];
}
