import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Düzgün email daxil edin' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Şifrə ən azı 6 simvol olmalıdır' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Ad boş ola bilməz' })
  @MaxLength(80)
  name: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Düzgün email daxil edin' })
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
