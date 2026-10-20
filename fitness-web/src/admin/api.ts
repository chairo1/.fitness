import { http } from '../api/client';
import type { RoleRef } from '../api/types';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  roles: RoleRef[];
  workouts?: number;
  lastWorkoutAt?: string | null;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  userCount: number;
  permissions: string[];
}

export interface AdminPermission {
  id: string;
  code: string;
  category: string;
  description: string;
  roles: RoleRef[];
}

export interface AdminOverview {
  users: { total: number; active: number; blocked: number; newThisWeek: number; loggedInThisWeek: number; admins: number };
  workouts: { total: number; thisWeek: number };
  signups: { week: string; count: number }[];
  roles: { id: string; name: string; users: number }[];
  latest: AdminUser[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserQuery {
  search?: string;
  roleId?: string;
  status?: 'active' | 'blocked';
  page: number;
  pageSize: number;
}

export interface UserInput {
  name: string;
  email: string;
  isActive: boolean;
  roleIds: string[];
  password?: string;
}

export interface RoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const adminApi = {
  overview: () => data(http.get<AdminOverview>('/admin/overview')),

  users: (q: UserQuery) =>
    data(http.get<Page<AdminUser>>('/admin/users', { params: { ...q, search: q.search || undefined } })),
  createUser: (body: UserInput) => data(http.post<AdminUser>('/admin/users', body)),
  updateUser: (id: string, body: Partial<UserInput>) => data(http.patch<AdminUser>(`/admin/users/${id}`, body)),
  resetPassword: (id: string, password: string) => http.put(`/admin/users/${id}/password`, { password }),
  deleteUser: (id: string) => http.delete(`/admin/users/${id}`),

  roles: () => data(http.get<AdminRole[]>('/admin/roles')),
  createRole: (body: RoleInput) => data(http.post<AdminRole>('/admin/roles', body)),
  updateRole: (id: string, body: RoleInput) => data(http.patch<AdminRole>(`/admin/roles/${id}`, body)),
  deleteRole: (id: string) => http.delete(`/admin/roles/${id}`),

  permissions: () => data(http.get<AdminPermission[]>('/admin/permissions')),
};

const ROLE_LABELS: Record<string, string> = { admin: 'Administrator', user: 'İstifadəçi', moderator: 'Moderator' };
export const roleLabel = (name: string) => ROLE_LABELS[name] ?? name;
export const roleColor = (name: string) =>
  name === 'admin' ? ('secondary' as const) : name === 'user' ? ('default' as const) : ('primary' as const);
