import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../access/access.entities';
import { AccessService } from '../access/access.service';
import { USER_ROLE } from '../access/permissions';
import { User } from '../users/user.entity';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly access: AccessService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    if ((await this.users.count({ where: { email } })) > 0) {
      throw new ConflictException('Bu email artıq qeydiyyatdan keçib');
    }
    const user = await this.users.save(
      this.users.create({
        email,
        name: dto.name.trim(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        roles: [await this.roles.findOneByOrFail({ name: USER_ROLE })],
      }),
    );
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email.toLowerCase().trim() })
      .getOne();
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email və ya şifrə yanlışdır');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Hesabınız bloklanıb. Administratorla əlaqə saxlayın');
    }
    await this.users.update(user.id, { lastLoginAt: new Date() });
    return this.issue(user);
  }

  private async issue(user: User) {
    return { accessToken: this.jwt.sign({ sub: user.id, email: user.email }), user: await this.access.profile(user.id) };
  }
}
