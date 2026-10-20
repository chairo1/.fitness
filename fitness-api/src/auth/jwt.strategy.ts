import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessService } from '../access/access.service';
import { AuthUser } from './current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly access: AccessService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', 'dev-secret'),
    });
  }

  // Deleted or blocked users lose access on their next request, not when the token expires.
  async validate(payload: { sub: string }): Promise<AuthUser> {
    const user = await this.access.loadAuthUser(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('Sessiya etibarsızdır');
    const { isActive: _omit, ...auth } = user;
    return auth;
  }
}
