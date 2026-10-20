import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission, Role } from '../access/access.entities';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { RequirePermissions } from '../auth/permissions.guard';
import { User } from '../users/user.entity';
import { CreateRoleDto, CreateUserDto, ListUsersQuery, ResetPasswordDto, UpdateRoleDto, UpdateUserDto } from './admin.dto';
import { AdminService } from './admin.service';

// Every admin route needs `admin.access`; handlers add their own specific permission on top.

@RequirePermissions('admin.access')
@Controller('admin')
class AdminOverviewController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }
}

@RequirePermissions('admin.access')
@Controller('admin/users')
class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  @RequirePermissions('users.read')
  list(@Query() q: ListUsersQuery) {
    return this.admin.listUsers(q);
  }

  @Post()
  @RequirePermissions('users.write')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto) {
    return this.admin.createUser(actor, dto);
  }

  @Patch(':id')
  @RequirePermissions('users.write')
  update(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(actor, id, dto);
  }

  @Put(':id/password')
  @HttpCode(204)
  @RequirePermissions('users.write')
  resetPassword(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    return this.admin.resetPassword(actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('users.delete')
  remove(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteUser(actor, id);
  }
}

@RequirePermissions('admin.access')
@Controller('admin/roles')
class AdminRolesController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  @RequirePermissions('roles.read')
  list() {
    return this.admin.listRoles();
  }

  @Post()
  @RequirePermissions('roles.write')
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateRoleDto) {
    return this.admin.createRole(actor, dto);
  }

  @Patch(':id')
  @RequirePermissions('roles.write')
  update(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.admin.updateRole(actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('roles.write')
  remove(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteRole(actor, id);
  }
}

@RequirePermissions('admin.access')
@Controller('admin/permissions')
class AdminPermissionsController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  @RequirePermissions('permissions.read')
  list() {
    return this.admin.listPermissions();
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission])],
  controllers: [AdminOverviewController, AdminUsersController, AdminRolesController, AdminPermissionsController],
  providers: [AdminService],
})
export class AdminModule {}
