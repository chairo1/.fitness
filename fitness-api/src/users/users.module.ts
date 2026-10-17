import { Body, Controller, Get, Module, NotFoundException, Patch } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Repository } from 'typeorm';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { User } from './user.entity';

class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80)
  name?: string;

  @IsOptional() @IsNumber() @Min(50) @Max(260)
  heightCm?: number | null;

  @IsOptional() @IsNumber() @Min(20) @Max(400)
  goalWeightKg?: number | null;
}

@Controller('users')
class UsersController {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  @Get('me')
  async me(@CurrentUser() u: AuthUser) {
    const user = await this.users.findOne({ where: { id: u.id } });
    if (!user) throw new NotFoundException();
    return user;
  }

  @Patch('me')
  async update(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) {
    await this.users.update(u.id, dto);
    return this.me(u);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
})
export class UsersModule {}
