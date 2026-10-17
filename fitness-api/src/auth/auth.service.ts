import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    if ((await this.users.count({ where: { email } })) > 0) {
      throw new ConflictException('Bu email artıq qeydiyyatdan keçib');
    }
    const user = await this.users.save(
      this.users.create({ email, name: dto.name.trim(), passwordHash: await bcrypt.hash(dto.password, 10) }),
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
    return this.issue(user);
  }

  private issue(user: User) {
    const { passwordHash: _omit, ...safe } = user;
    return { accessToken: this.jwt.sign({ sub: user.id, email: user.email }), user: safe };
  }
}
