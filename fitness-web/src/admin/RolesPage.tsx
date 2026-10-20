import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import LockRounded from '@mui/icons-material/LockRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../api/client';
import { EmptyState, Loading, PageHeader } from '../components/common';
import { useCan } from '../store/auth';
import { notify } from '../store/ui';
import { useAsync } from '../utils/useAsync';
import { adminApi, roleColor, roleLabel, type AdminPermission, type AdminRole } from './api';

/** Permissions grouped by category, preserving the API's order. */
export function groupPermissions(perms: AdminPermission[]) {
  const groups = new Map<string, AdminPermission[]>();
  for (const p of perms) groups.set(p.category, [...(groups.get(p.category) ?? []), p]);
  return [...groups.entries()];
}

function RoleDialog({
  role,
  permissions,
  onClose,
  onSaved,
}: {
  role: AdminRole | 'new';
  permissions: AdminPermission[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = role === 'new';
  const locked = !isNew && role.name === 'admin';
  const [form, setForm] = useState({
    name: isNew ? '' : role.name,
    description: isNew ? '' : role.description,
    permissions: isNew ? [] : role.permissions,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (code: string) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(code) ? f.permissions.filter((c) => c !== code) : [...f.permissions, code],
    }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isNew) await adminApi.createRole(form);
      else
        await adminApi.updateRole(role.id, {
          name: role.isSystem ? undefined : form.name,
          description: form.description,
          permissions: locked ? undefined : form.permissions,
        });
      notify(isNew ? 'Rol yaradıldı' : 'Rol yeniləndi');
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isNew ? 'Yeni rol' : `Rol: ${roleLabel(role.name)}`}</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {!isNew && role.isSystem && (
            <Alert severity="info" icon={<LockRounded />}>
              Sistem rolu: adı dəyişdirilə və silinə bilməz.
              {locked && ' Administrator həmişə bütün səlahiyyətlərə malikdir.'}
            </Alert>
          )}
          <TextField
            label="Rolun adı"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={!isNew && role.isSystem}
            placeholder="məs. trainer"
            required
          />
          <TextField
            label="Təsvir"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline
            minRows={2}
          />
          <Typography variant="subtitle1" mt={1}>
            Səlahiyyətlər
          </Typography>
          {groupPermissions(permissions).map(([category, perms]) => (
            <Box key={category}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                {category}
              </Typography>
              {perms.map((p) => (
                <FormControlLabel
                  key={p.code}
                  sx={{ display: 'flex', alignItems: 'flex-start', py: 0.5, mr: 0 }}
                  control={
                    <Checkbox
                      checked={locked || form.permissions.includes(p.code)}
                      onChange={() => toggle(p.code)}
                      disabled={locked}
                      sx={{ pt: 0.25 }}
                    />
                  }
                  label={
                    <Box>
                      <Typography fontWeight={600} fontFamily="monospace" fontSize={14}>
                        {p.code}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {p.description}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Ləğv et</Button>
        <Button variant="contained" onClick={save} disabled={busy || !form.name.trim()}>
          Yadda saxla
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function RolesPage() {
  const can = useCan();
  const canWrite = can('roles.write');
  const { data: roles, loading, error, reload } = useAsync(adminApi.roles);
  const { data: permissions } = useAsync(() =>
    can('permissions.read') ? adminApi.permissions() : Promise.resolve([] as AdminPermission[]),
  );
  const [editing, setEditing] = useState<AdminRole | 'new' | null>(null);

  const remove = async (r: AdminRole) => {
    const extra = r.userCount ? ` ${r.userCount} istifadəçidən bu rol götürüləcək.` : '';
    if (!confirm(`"${roleLabel(r.name)}" rolu silinsin?${extra}`)) return;
    try {
      await adminApi.deleteRole(r.id);
      notify('Rol silindi');
      reload();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  const describe = (code: string) => permissions?.find((p) => p.code === code)?.description ?? code;

  return (
    <>
      <PageHeader
        title="Rollar"
        subtitle="Rollar səlahiyyətləri qruplaşdırır; istifadəçilərə rol təyin olunur"
        action={
          canWrite && (
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => setEditing('new')} disabled={!permissions?.length}>
              Yeni rol
            </Button>
          )
        }
      />
      {loading && !roles ? (
        <Loading />
      ) : error || !roles ? (
        <EmptyState text={error ?? 'Məlumat yüklənmədi'} />
      ) : (
        <Grid container spacing={2.5}>
          {roles.map((r) => (
            <Grid item xs={12} md={6} xl={4} key={r.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" gap={1} mb={1}>
                    <Chip color={roleColor(r.name)} label={roleLabel(r.name)} sx={{ fontWeight: 700 }} />
                    {r.isSystem && (
                      <Tooltip title="Sistem rolu">
                        <LockRounded fontSize="small" color="disabled" />
                      </Tooltip>
                    )}
                    <Box flex={1} />
                    {canWrite && (
                      <>
                        <Tooltip title="Redaktə">
                          <span>
                            <IconButton size="small" onClick={() => setEditing(r)} disabled={!permissions?.length}>
                              <EditRounded fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {!r.isSystem && (
                          <Tooltip title="Sil">
                            <IconButton size="small" onClick={() => remove(r)}>
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </Stack>
                  <Typography color="text.secondary" mb={2} minHeight={24}>
                    {r.description || '—'}
                  </Typography>
                  <Stack direction="row" alignItems="center" gap={1} mb={1.5} color="text.secondary">
                    <GroupRounded fontSize="small" />
                    <Typography variant="body2">{r.userCount} istifadəçi</Typography>
                  </Stack>
                  <Stack direction="row" gap={0.75} flexWrap="wrap">
                    {r.permissions.length ? (
                      r.permissions.map((c) => (
                        <Tooltip key={c} title={describe(c)}>
                          <Chip size="small" variant="outlined" label={c} sx={{ fontFamily: 'monospace' }} />
                        </Tooltip>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Admin səlahiyyəti yoxdur — yalnız öz məlumatları
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {editing && permissions && (
        <RoleDialog
          role={editing}
          permissions={permissions}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}
