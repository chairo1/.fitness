import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCode } from '../access/permissions';
import { AuthUser } from './current-user.decorator';

const PERMISSIONS_KEY = 'requiredPermissions';

/** Requires every listed permission; class- and handler-level requirements are combined. */
export const RequirePermissions = (...codes: PermissionCode[]) => SetMetadata(PERMISSIONS_KEY, codes);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const required = this.reflector.getAllAndMerge<string[]>(PERMISSIONS_KEY, [ctx.getClass(), ctx.getHandler()]);
    if (!required?.length) return true;
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    if (user && required.every((c) => user.permissions.includes(c))) return true;
    throw new ForbiddenException('Bu əməliyyat üçün səlahiyyətiniz yoxdur');
  }
}
