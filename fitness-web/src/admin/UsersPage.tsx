import AddRounded from '@mui/icons-material/AddRounded';
import BlockRounded from '@mui/icons-material/BlockRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import LockResetRounded from '@mui/icons-material/LockResetRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { errorMessage } from '../api/client';
import { EmptyState, Loading, PageHeader } from '../components/common';
import { useAuthStore, useCan } from '../store/auth';
import { notify } from '../store/ui';
import { fmtDate } from '../utils/format';
import { useAsync } from '../utils/useAsync';
import { adminApi, roleColor, roleLabel, type AdminRole, type AdminUser, type UserInput } from './api';

function UserDialog({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: AdminUser | 'new';
  roles: AdminRole[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = user === 'new';
  const defaultRole = roles.find((r) => r.name === 'user');
  const [form, setForm] = useState<UserInput>(
    isNew
      ? { name: '', email: '', password: '', isActive: true, roleIds: defaultRole ? [defaultRole.id] : [] }
      : { name: user.name, email: user.email, isActive: user.isActive, roleIds: user.roles.map((r) => r.id) },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleRole = (id: string) =>
    setForm((f) => ({ ...f, roleIds: f.roleIds.includes(id) ? f.roleIds.filter((x) => x !== id) : [...f.roleIds, id] }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isNew) await adminApi.createUser(form);
      else {
        const { password: _omit, ...body } = form;
        await adminApi.updateUser(user.id, body);
      }
      notify(isNew ? 'İstifadəçi yaradıldı' : 'Dəyişikliklər yadda saxlanıldı');
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isNew ? 'Yeni istifadəçi' : 'İstifadəçini redaktə et'}</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Ad" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          {isNew && (
            <TextField
              label="Şifrə"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              helperText="Ən azı 6 simvol"
              required
            />
          )}
          <FormControlLabel
            control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
            label={form.isActive ? 'Aktiv' : 'Bloklanıb — daxil ola bilməz'}
          />
          <Box>
            <FormLabel>Rollar</FormLabel>
            <FormGroup>
              {roles.map((r) => (
                <FormControlLabel
                  key={r.id}
                  control={<Checkbox checked={form.roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />}
                  label={
                    <Box>
                      <Typography fontWeight={600}>{roleLabel(r.name)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.description || `${r.permissions.length} səlahiyyət`}
                      </Typography>
                    </Box>
                  }
                  sx={{ py: 0.5 }}
                />
              ))}
            </FormGroup>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Ləğv et</Button>
        <Button variant="contained" onClick={save} disabled={busy || !form.roleIds.length}>
          Yadda saxla
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    try {
      await adminApi.resetPassword(user.id, password);
      notify(`${user.name} üçün yeni şifrə təyin olundu`);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Şifrəni sıfırla</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography color="text.secondary">
            <b>{user.email}</b> üçün yeni şifrə təyin edin.
          </Typography>
          <TextField
            label="Yeni şifrə"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Ən azı 6 simvol"
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Ləğv et</Button>
        <Button variant="contained" onClick={save} disabled={password.length < 6}>
          Təyin et
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UsersPage() {
  const can = useCan();
  const me = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({ search: '', roleId: '', status: '' as '' | 'active' | 'blocked', page: 0, pageSize: 20 });
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);

  // Debounced search box
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.search === search ? q : { ...q, search, page: 0 })), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: roles } = useAsync(() => (can('roles.read') ? adminApi.roles() : Promise.resolve([])), [can]);
  const { data, loading, error, reload } = useAsync(
    () =>
      adminApi.users({
        search: query.search,
        roleId: query.roleId || undefined,
        status: query.status || undefined,
        page: query.page + 1,
        pageSize: query.pageSize,
      }),
    [query],
  );

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      notify(message);
      reload();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  const toggleActive = (u: AdminUser) =>
    run(() => adminApi.updateUser(u.id, { isActive: !u.isActive }), u.isActive ? 'İstifadəçi bloklandı' : 'İstifadəçi aktivləşdirildi');

  const remove = (u: AdminUser) => {
    if (!confirm(`"${u.name}" və onun bütün məlumatları (məşqlər, proqramlar, ölçülər) silinsin?`)) return;
    run(() => adminApi.deleteUser(u.id), 'İstifadəçi silindi');
  };

  const canWrite = can('users.write');

  return (
    <>
      <PageHeader
        title="İstifadəçilər"
        subtitle={data ? `Cəmi ${data.total} istifadəçi` : undefined}
        action={
          canWrite && (
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => setEditing('new')} disabled={!roles?.length}>
              Yeni istifadəçi
            </Button>
          )
        }
      />

      <Card sx={{ mb: 2.5, p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
          <TextField
            size="small"
            placeholder="Ad və ya email ilə axtar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> }}
            sx={{ flex: 1 }}
          />
          {!!roles?.length && (
            <TextField
              select
              size="small"
              label="Rol"
              value={query.roleId}
              onChange={(e) => setQuery({ ...query, roleId: e.target.value, page: 0 })}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Hamısı</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {roleLabel(r.name)}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            size="small"
            label="Status"
            value={query.status}
            onChange={(e) => setQuery({ ...query, status: e.target.value as typeof query.status, page: 0 })}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Hamısı</MenuItem>
            <MenuItem value="active">Aktiv</MenuItem>
            <MenuItem value="blocked">Bloklanıb</MenuItem>
          </TextField>
        </Stack>
      </Card>

      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <EmptyState text={error} />
        ) : !data?.items.length ? (
          <EmptyState text="Heç bir istifadəçi tapılmadı" />
        ) : (
          <>
            <TableContainer>
              <Table sx={{ minWidth: 820 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>İstifadəçi</TableCell>
                    <TableCell>Rollar</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Məşqlər</TableCell>
                    <TableCell>Son giriş</TableCell>
                    <TableCell>Qeydiyyat</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((u) => {
                    const self = u.id === me?.id;
                    return (
                      <TableRow key={u.id} hover sx={{ opacity: u.isActive ? 1 : 0.6 }}>
                        <TableCell>
                          <Stack direction="row" gap={1.5} alignItems="center">
                            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>{u.name[0]?.toUpperCase()}</Avatar>
                            <Box minWidth={0}>
                              <Typography fontWeight={600} noWrap>
                                {u.name} {self && <Chip size="small" label="Siz" sx={{ ml: 0.5 }} />}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {u.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" gap={0.5} flexWrap="wrap">
                            {u.roles.map((r) => (
                              <Chip key={r.id} size="small" variant="outlined" color={roleColor(r.name)} label={roleLabel(r.name)} />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {u.isActive ? (
                            <Chip size="small" color="success" label="Aktiv" />
                          ) : (
                            <Chip size="small" color="error" label="Bloklanıb" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600}>{u.workouts ?? 0}</Typography>
                          {u.lastWorkoutAt && (
                            <Typography variant="caption" color="text.secondary">
                              son: {fmtDate(u.lastWorkoutAt)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—'}</TableCell>
                        <TableCell>{fmtDate(u.createdAt)}</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          {canWrite && (
                            <>
                              <Tooltip title="Redaktə">
                                <IconButton size="small" onClick={() => setEditing(u)} disabled={!roles?.length}>
                                  <EditRounded fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Şifrəni sıfırla">
                                <IconButton size="small" onClick={() => setResetting(u)}>
                                  <LockResetRounded fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={u.isActive ? 'Blokla' : 'Aktivləşdir'}>
                                <span>
                                  <IconButton size="small" onClick={() => toggleActive(u)} disabled={self}>
                                    {u.isActive ? <BlockRounded fontSize="small" /> : <CheckCircleRounded fontSize="small" />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </>
                          )}
                          {can('users.delete') && (
                            <Tooltip title="Sil">
                              <span>
                                <IconButton size="small" onClick={() => remove(u)} disabled={self}>
                                  <DeleteOutlineRounded fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data.total}
              page={query.page}
              rowsPerPage={query.pageSize}
              rowsPerPageOptions={[10, 20, 50, 100]}
              onPageChange={(_, page) => setQuery({ ...query, page })}
              onRowsPerPageChange={(e) => setQuery({ ...query, pageSize: Number(e.target.value), page: 0 })}
              labelRowsPerPage="Səhifədə:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
            />
          </>
        )}
      </Card>

      {editing && roles && (
        <UserDialog
          user={editing}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {resetting && <PasswordDialog user={resetting} onClose={() => setResetting(null)} />}
    </>
  );
}
