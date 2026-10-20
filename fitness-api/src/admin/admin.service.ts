import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Permission, Role } from '../access/access.entities';
import { AccessService } from '../access/access.service';
import { ADMIN_ROLE, PERMISSIONS } from '../access/permissions';
import { AuthUser } from '../auth/current-user.decorator';
import { addDays, startOfWeek, todayStr } from '../common/dates';
import { User } from '../users/user.entity';
import { CreateRoleDto, CreateUserDto, ListUsersQuery, ResetPasswordDto, UpdateRoleDto, UpdateUserDto } from './admin.dto';

const SIGNUP_WEEKS = 12;
const LAST_ADMIN = 'Sistemdə ən azı bir aktiv administrator qalmalıdır';

const isAdmin = (roles: Role[]) => roles.some((r) => r.name === ADMIN_ROLE);
const codesOf = (roles: Role[]) => new Set(roles.flatMap((r) => r.permissions.map((p) => p.code)));

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly access: AccessService,
  ) {}

  // ---------- Overview ----------

  async overview() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const from = addDays(startOfWeek(todayStr()), -7 * (SIGNUP_WEEKS - 1));
    const [[users], [workouts], signupRows, roles, latest, admins] = await Promise.all([
      this.ds.query(
        `SELECT COUNT(*)::int AS "total",
                COUNT(*) FILTER (WHERE "isActive")::int AS "active",
                COUNT(*) FILTER (WHERE NOT "isActive")::int AS "blocked",
                COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days')::int AS "newThisWeek",
                COUNT(*) FILTER (WHERE "lastLoginAt" >= now() - interval '7 days')::int AS "loggedInThisWeek"
         FROM users`,
      ),
      this.ds.query(
        `SELECT COUNT(*)::int AS "total",
                COUNT(*) FILTER (WHERE date >= current_date - 6)::int AS "thisWeek"
         FROM workouts`,
      ),
      this.ds.query(
        `SELECT to_char(date_trunc('week', "createdAt" AT TIME ZONE $1), 'YYYY-MM-DD') AS "week", COUNT(*)::int AS "count"
         FROM users WHERE ("createdAt" AT TIME ZONE $1)::date >= $2::date
         GROUP BY 1 ORDER BY 1`,
        [tz, from],
      ),
      this.ds.query(
        `SELECT r.id, r.name, COUNT(ur."userId")::int AS "users"
         FROM roles r LEFT JOIN user_roles ur ON ur."roleId" = r.id
         GROUP BY r.id ORDER BY "users" DESC, r.name`,
      ),
      this.users.find({ relations: { roles: true }, order: { createdAt: 'DESC' }, take: 6 }),
      this.access.countActiveAdmins(),
    ]);

    const byWeek = new Map<string, number>(signupRows.map((r) => [r.week, r.count]));
    const signups = Array.from({ length: SIGNUP_WEEKS }, (_, i) => {
      const week = addDays(from, i * 7);
      return { week, count: byWeek.get(week) ?? 0 };
    });

    return {
      users: { ...users, admins },
      workouts,
      signups,
      roles,
      latest: latest.map((u) => this.serializeUser(u)),
    };
  }

  // ---------- Users ----------

  async listUsers(q: ListUsersQuery) {
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.roles', 'r')
      .orderBy('u.createdAt', 'DESC')
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize);
    if (q.search?.trim()) qb.andWhere('(u.name ILIKE :s OR u.email ILIKE :s)', { s: `%${q.search.trim()}%` });
    if (q.status) qb.andWhere('u.isActive = :active', { active: q.status === 'active' });
    // Sub-select so the joined roles of matching users are not filtered down to the one role.
    if (q.roleId) qb.andWhere('u.id IN (SELECT "userId" FROM user_roles WHERE "roleId" = :roleId)', { roleId: q.roleId });

    const [items, total] = await qb.getManyAndCount();
    return { items: await this.withActivity(items), total, page: q.page, pageSize: q.pageSize };
  }

  async createUser(actor: AuthUser, dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();
    await this.assertEmailFree(email);
    const roles = await this.findRoles(dto.roleIds);
    this.assertCanChangeRoles(actor, [], roles);
    const user = await this.users.save(
      this.users.create({
        email,
        name: dto.name.trim(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        isActive: dto.isActive ?? true,
        roles,
      }),
    );
    return this.getUser(user.id);
  }

  async updateUser(actor: AuthUser, id: string, dto: UpdateUserDto) {
    const user = await this.findUser(id);
    const self = actor.id === id;

    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      if (email !== user.email) await this.assertEmailFree(email);
      user.email = email;
    }
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.isActive === false && self) throw new BadRequestException('Öz hesabınızı bloklaya bilməzsiniz');

    let roles = user.roles;
    if (dto.roleIds) {
      roles = await this.findRoles(dto.roleIds);
      this.assertCanChangeRoles(actor, user.roles, roles);
      if (self && isAdmin(user.roles) && !isAdmin(roles)) {
        throw new BadRequestException('Öz administrator rolunuzu silə bilməzsiniz');
      }
    }
    const isActive = dto.isActive ?? user.isActive;
    if (user.isActive && isAdmin(user.roles) && !(isActive && isAdmin(roles))) {
      if ((await this.access.countActiveAdmins(id)) === 0) throw new BadRequestException(LAST_ADMIN);
    }

    Object.assign(user, { roles, isActive });
    await this.users.save(user);
    return this.getUser(id);
  }

  async resetPassword(actor: AuthUser, id: string, dto: ResetPasswordDto) {
    const user = await this.findUser(id);
    // Taking over someone's account must not grant more than the actor already has.
    this.assertCanChangeRoles(actor, user.roles, []);
    await this.users.update(id, { passwordHash: await bcrypt.hash(dto.password, 10) });
  }

  async deleteUser(actor: AuthUser, id: string) {
    if (actor.id === id) throw new BadRequestException('Öz hesabınızı silə bilməzsiniz');
    const user = await this.findUser(id);
    this.assertCanChangeRoles(actor, user.roles, []);
    await this.ds.transaction(async (m) => {
      if (user.isActive && isAdmin(user.roles) && (await this.access.countActiveAdmins(id, m)) === 0) {
        throw new BadRequestException(LAST_ADMIN);
      }
      // Domain tables keep a plain userId (no FK), so the user's data is removed explicitly.
      await m.query(`DELETE FROM workouts WHERE "userId" = $1`, [id]);
      await m.query(`DELETE FROM programs WHERE "userId" = $1`, [id]);
      await m.query(`DELETE FROM body_metrics WHERE "userId" = $1`, [id]);
      await m.query(`DELETE FROM exercises WHERE "userId" = $1`, [id]);
      await m.delete(User, id);
    });
  }

  private async getUser(id: string) {
    const [user] = await this.withActivity([await this.findUser(id)]);
    return user;
  }

  private async findUser(id: string) {
    const user = await this.users.findOne({ where: { id }, relations: { roles: { permissions: true } } });
    if (!user) throw new NotFoundException('İstifadəçi tapılmadı');
    return user;
  }

  private async assertEmailFree(email: string) {
    if (await this.users.exists({ where: { email } })) throw new ConflictException('Bu email artıq istifadə olunur');
  }

  private async findRoles(ids: string[]) {
    const roles = await this.roles.find({ where: { id: In(ids) }, relations: { permissions: true } });
    if (roles.length !== new Set(ids).size) throw new BadRequestException('Seçilmiş rollardan biri tapılmadı');
    return roles;
  }

  /**
   * Prevents privilege escalation: an actor may only grant or revoke roles whose permissions
   * they hold themselves (so only full admins can hand out or take away `admin`).
   */
  private assertCanChangeRoles(actor: AuthUser, before: Role[], after: Role[]) {
    const changed = [
      ...after.filter((r) => !before.some((b) => b.id === r.id)),
      ...before.filter((b) => !after.some((r) => r.id === b.id)),
    ];
    const missing = [...codesOf(changed)].filter((c) => !actor.permissions.includes(c));
    if (missing.length) {
      throw new ForbiddenException(`Bu rolu idarə etmək üçün özünüzdə olmayan səlahiyyətlər lazımdır: ${missing.join(', ')}`);
    }
  }

  private async withActivity(users: User[]) {
    if (!users.length) return [];
    const rows: { userId: string; workouts: number; lastWorkoutAt: string }[] = await this.ds.query(
      `SELECT "userId", COUNT(*)::int AS "workouts", to_char(MAX(date), 'YYYY-MM-DD') AS "lastWorkoutAt"
       FROM workouts WHERE "userId" = ANY($1) GROUP BY 1`,
      [users.map((u) => u.id)],
    );
    const byUser = new Map(rows.map((r) => [r.userId, r]));
    return users.map((u) => ({
      ...this.serializeUser(u),
      workouts: byUser.get(u.id)?.workouts ?? 0,
      lastWorkoutAt: byUser.get(u.id)?.lastWorkoutAt ?? null,
    }));
  }

  private serializeUser(u: User) {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      roles: (u.roles ?? []).map((r) => ({ id: r.id, name: r.name })),
    };
  }

  // ---------- Roles ----------

  async listRoles() {
    const [roles, counts] = await Promise.all([
      this.roles.find({ relations: { permissions: true }, order: { isSystem: 'DESC', name: 'ASC' } }),
      this.ds.query(`SELECT "roleId", COUNT(*)::int AS "count" FROM user_roles GROUP BY 1`),
    ]);
    const byRole = new Map<string, number>(counts.map((c) => [c.roleId, c.count]));
    return roles.map((r) => this.serializeRole(r, byRole.get(r.id) ?? 0));
  }

  async createRole(actor: AuthUser, dto: CreateRoleDto) {
    const name = dto.name.trim();
    await this.assertRoleNameFree(name);
    this.assertCanGrant(actor, [], dto.permissions);
    const role = await this.roles.save(
      this.roles.create({
        name,
        description: dto.description?.trim() ?? '',
        permissions: await this.permissions.findBy({ code: In(dto.permissions) }),
      }),
    );
    return this.serializeRole(role, 0);
  }

  async updateRole(actor: AuthUser, id: string, dto: UpdateRoleDto) {
    const role = await this.findRole(id);
    if (dto.name !== undefined && dto.name.trim() !== role.name) {
      if (role.isSystem) throw new BadRequestException('Sistem rolunun adı dəyişdirilə bilməz');
      await this.assertRoleNameFree(dto.name.trim());
      role.name = dto.name.trim();
    }
    if (dto.description !== undefined) role.description = dto.description.trim();
    if (dto.permissions) {
      if (role.name === ADMIN_ROLE) {
        throw new BadRequestException('Administrator rolunun səlahiyyətləri dəyişdirilə bilməz — o, həmişə bütün səlahiyyətlərə malikdir');
      }
      this.assertCanGrant(actor, role.permissions.map((p) => p.code), dto.permissions);
      role.permissions = await this.permissions.findBy({ code: In(dto.permissions) });
    }
    await this.roles.save(role);
    return (await this.listRoles()).find((r) => r.id === id);
  }

  async deleteRole(actor: AuthUser, id: string) {
    const role = await this.findRole(id);
    if (role.isSystem) throw new BadRequestException('Sistem rolları silinə bilməz');
    this.assertCanGrant(actor, role.permissions.map((p) => p.code), []);
    await this.ds.transaction(async (m: EntityManager) => {
      await m.delete(Role, id);
      await this.access.assignDefaultRole(m);
    });
  }

  private async findRole(id: string) {
    const role = await this.roles.findOne({ where: { id }, relations: { permissions: true } });
    if (!role) throw new NotFoundException('Rol tapılmadı');
    return role;
  }

  private async assertRoleNameFree(name: string) {
    const [row] = await this.ds.query(`SELECT 1 FROM roles WHERE lower(name) = lower($1)`, [name]);
    if (row) throw new ConflictException('Bu adda rol artıq mövcuddur');
  }

  /** Only permissions the actor holds may be added to or removed from a role. */
  private assertCanGrant(actor: AuthUser, before: string[], after: string[]) {
    const changed = [...after.filter((c) => !before.includes(c)), ...before.filter((c) => !after.includes(c))];
    const missing = changed.filter((c) => !actor.permissions.includes(c));
    if (missing.length) {
      throw new ForbiddenException(`Özünüzdə olmayan səlahiyyətləri idarə edə bilməzsiniz: ${missing.join(', ')}`);
    }
  }

  private serializeRole(r: Role, userCount: number) {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      createdAt: r.createdAt,
      userCount,
      permissions: r.permissions.map((p) => p.code).sort(),
    };
  }

  // ---------- Permissions ----------

  async listPermissions() {
    const [permissions, roles] = await Promise.all([
      this.permissions.find(),
      this.roles.find({ relations: { permissions: true }, order: { isSystem: 'DESC', name: 'ASC' } }),
    ]);
    const order = PERMISSIONS.map((p) => p.code as string);
    return permissions
      .sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code))
      .map((p) => ({
        ...p,
        roles: roles.filter((r) => r.permissions.some((x) => x.id === p.id)).map((r) => ({ id: r.id, name: r.name })),
      }));
  }
}
