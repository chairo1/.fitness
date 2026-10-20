// The permission catalogue lives in code: guards check these codes, so the DB table is synced from here on boot.
export const PERMISSIONS = [
  { code: 'admin.access', category: 'Admin panel', description: 'Admin panelə daxil olmaq və ümumi statistikaya baxmaq' },
  { code: 'users.read', category: 'İstifadəçilər', description: 'İstifadəçilərin siyahısına baxmaq' },
  {
    code: 'users.write',
    category: 'İstifadəçilər',
    description: 'İstifadəçi yaratmaq, redaktə etmək, bloklamaq, rol təyin etmək və şifrə sıfırlamaq',
  },
  { code: 'users.delete', category: 'İstifadəçilər', description: 'İstifadəçiləri bütün məlumatları ilə silmək' },
  { code: 'roles.read', category: 'Rollar', description: 'Rollara və onların səlahiyyətlərinə baxmaq' },
  { code: 'roles.write', category: 'Rollar', description: 'Rol yaratmaq, redaktə etmək, silmək və səlahiyyət təyin etmək' },
  { code: 'permissions.read', category: 'Səlahiyyətlər', description: 'Səlahiyyətlər kataloqu və matrisinə baxmaq' },
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number]['code'];
export const PERMISSION_CODES: string[] = PERMISSIONS.map((p) => p.code);

/** System roles: cannot be renamed or deleted. `admin` always holds every permission. */
export const ADMIN_ROLE = 'admin';
export const USER_ROLE = 'user';
