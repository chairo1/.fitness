import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';
import { Permission, Role } from './access.entities';
import { ADMIN_ROLE, PERMISSIONS, USER_ROLE } from './permissions';

const MODERATOR_PERMISSIONS = ['admin.access', 'users.read', 'roles.read', 'permissions.read'];

@Injectable()
export class AccessService implements OnApplicationBootstrap {
  private readonly log = new Logger('Access');

  constructor(
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.syncPermissions();
    await this.ensureRoles();
    await this.ensureAdmin();
  }

  /** Request identity: roles and permissions are read fresh so revocations apply immediately. */
  async loadAuthUser(id: string): Promise<(AuthUser & { isActive: boolean }) | null> {
    const user = await this.users.findOne({ where: { id }, relations: { roles: { permissions: true } } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      roles: user.roles.map((r) => r.name),
      permissions: [...new Set(user.roles.flatMap((r) => r.permissions.map((p) => p.code)))].sort(),
    };
  }

  /** The signed-in user's own profile, including what the UI may show them. */
  async profile(id: string) {
    const user = await this.users.findOne({ where: { id }, relations: { roles: { permissions: true } } });
    if (!user) return null;
    const { roles, ...rest } = user;
    return {
      ...rest,
      roles: roles.map((r) => ({ id: r.id, name: r.name })),
      permissions: [...new Set(roles.flatMap((r) => r.permissions.map((p) => p.code)))].sort(),
    };
  }

  /** Gives users that ended up with no role the default `user` role. */
  assignDefaultRole(manager = this.ds.manager) {
    return manager.query(
      `INSERT INTO user_roles ("userId", "roleId")
       SELECT u.id, r.id FROM users u CROSS JOIN roles r
       WHERE r.name = $1 AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur."userId" = u.id)`,
      [USER_ROLE],
    );
  }

  private async syncPermissions() {
    const existing = await this.permissions.find();
    for (const p of PERMISSIONS) {
      const row = existing.find((e) => e.code === p.code);
      await this.permissions.save(row ? Object.assign(row, p) : this.permissions.create({ ...p }));
    }
    const stale = existing.filter((e) => !PERMISSIONS.some((p) => p.code === e.code));
    if (stale.length) await this.permissions.remove(stale);
  }

  private async ensureRoles() {
    const all = await this.permissions.find();
    const firstRun = (await this.roles.count()) === 0;

    const admin = (await this.roles.findOne({ where: { name: ADMIN_ROLE } })) ?? this.roles.create({ name: ADMIN_ROLE });
    await this.roles.save(
      Object.assign(admin, {
        isSystem: true,
        description: admin.description || 'Tam səlahiyyətli administrator',
        permissions: all,
      }),
    );

    const user = await this.roles.findOne({ where: { name: USER_ROLE } });
    if (!user) {
      await this.roles.save(
        this.roles.create({
          name: USER_ROLE,
          isSystem: true,
          description: 'Standart istifadəçi — yalnız öz məşq məlumatlarını idarə edir',
          permissions: [],
        }),
      );
    } else if (!user.isSystem) {
      await this.roles.update(user.id, { isSystem: true });
    }

    if (firstRun) {
      await this.roles.save(
        this.roles.create({
          name: 'moderator',
          description: 'Admin panelə baxış hüququ (dəyişiklik edə bilməz)',
          permissions: all.filter((p) => MODERATOR_PERMISSIONS.includes(p.code)),
        }),
      );
    }

    await this.assignDefaultRole();
  }

  /** Bootstraps ADMIN_EMAIL only while the system has no active administrator, so manual changes stick. */
  private async ensureAdmin() {
    if ((await this.countActiveAdmins()) > 0) return;
    const email = this.config.get<string>('ADMIN_EMAIL')?.toLowerCase().trim();
    if (!email) return this.log.warn('Aktiv administrator yoxdur və ADMIN_EMAIL təyin olunmayıb');

    const adminRole = await this.roles.findOneByOrFail({ name: ADMIN_ROLE });
    const existing = await this.users.findOne({ where: { email }, relations: { roles: true } });
    if (existing) {
      existing.isActive = true;
      if (!existing.roles.some((r) => r.id === adminRole.id)) existing.roles.push(adminRole);
      await this.users.save(existing);
      return this.log.log(`${email} administrator edildi`);
    }

    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!password) return this.log.warn('ADMIN_PASSWORD təyin olunmayıb — administrator yaradılmadı');
    await this.users.save(
      this.users.create({
        email,
        name: this.config.get('ADMIN_NAME', 'Administrator'),
        passwordHash: await bcrypt.hash(password, 10),
        roles: [adminRole],
      }),
    );
    this.log.log(`Administrator yaradıldı: ${email}`);
  }

  async countActiveAdmins(excludeUserId?: string, manager = this.ds.manager): Promise<number> {
    const [row] = await manager.query(
      `SELECT COUNT(DISTINCT u.id)::int AS "count"
       FROM users u
       JOIN user_roles ur ON ur."userId" = u.id
       JOIN roles r ON r.id = ur."roleId"
       WHERE r.name = $1 AND u."isActive" AND u.id <> COALESCE($2::uuid, '00000000-0000-0000-0000-000000000000')`,
      [ADMIN_ROLE, excludeUserId ?? null],
    );
    return row.count;
  }
}
