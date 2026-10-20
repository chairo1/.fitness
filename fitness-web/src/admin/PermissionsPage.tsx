import LockRounded from '@mui/icons-material/LockRounded';
import {
  Alert,
  Card,
  Checkbox,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Fragment, useState } from 'react';
import { errorMessage } from '../api/client';
import { EmptyState, Loading, PageHeader } from '../components/common';
import { useCan } from '../store/auth';
import { notify } from '../store/ui';
import { useAsync } from '../utils/useAsync';
import { adminApi, roleColor, roleLabel, type AdminRole } from './api';
import { groupPermissions } from './RolesPage';

/** Role × permission matrix; ticking a box updates that role directly. */
export default function PermissionsPage() {
  const can = useCan();
  const editable = can('roles.write') && can('roles.read');
  const perms = useAsync(adminApi.permissions);
  const roles = useAsync(() => (can('roles.read') ? adminApi.roles() : Promise.resolve([] as AdminRole[])), [can]);
  const [pending, setPending] = useState<string | null>(null);

  if ((perms.loading && !perms.data) || (roles.loading && !roles.data)) return <Loading />;
  if (perms.error || !perms.data) return <EmptyState text={perms.error ?? 'Məlumat yüklənmədi'} />;

  const roleList = roles.data ?? [];

  const toggle = async (role: AdminRole, code: string) => {
    const next = role.permissions.includes(code) ? role.permissions.filter((c) => c !== code) : [...role.permissions, code];
    setPending(`${role.id}:${code}`);
    try {
      const updated = await adminApi.updateRole(role.id, { permissions: next });
      roles.setData(roleList.map((r) => (r.id === role.id ? updated : r)));
      perms.reload();
    } catch (e) {
      notify(errorMessage(e), 'error');
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <PageHeader title="Səlahiyyətlər" subtitle="Hər səlahiyyətin hansı rollara verildiyini görün və dəyişin" />
      {!editable && (
        <Alert severity="info" sx={{ mb: 2.5 }}>
          Yalnız baxış rejimi — dəyişiklik üçün <b>roles.write</b> səlahiyyəti lazımdır.
        </Alert>
      )}
      <Card>
        <TableContainer>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Səlahiyyət</TableCell>
                {roleList.length
                  ? roleList.map((r) => (
                      <TableCell key={r.id} align="center">
                        <Chip size="small" color={roleColor(r.name)} label={roleLabel(r.name)} />
                      </TableCell>
                    ))
                  : <TableCell>Rollar</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {groupPermissions(perms.data).map(([category, list]) => (
                <Fragment key={category}>
                  <TableRow>
                    <TableCell colSpan={roleList.length + 1} sx={{ bgcolor: 'action.hover', py: 1 }}>
                      <Typography variant="caption" fontWeight={700} textTransform="uppercase" color="text.secondary">
                        {category}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {list.map((p) => (
                    <TableRow key={p.code} hover>
                      <TableCell>
                        <Typography fontFamily="monospace" fontWeight={600} fontSize={14}>
                          {p.code}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {p.description}
                        </Typography>
                      </TableCell>
                      {roleList.length ? (
                        roleList.map((r) => {
                          const locked = r.name === 'admin';
                          const box = (
                            <Checkbox
                              checked={locked || r.permissions.includes(p.code)}
                              disabled={!editable || locked || pending !== null || !can(p.code)}
                              onChange={() => toggle(r, p.code)}
                              checkedIcon={locked ? <LockRounded fontSize="small" /> : undefined}
                            />
                          );
                          return (
                            <TableCell key={r.id} align="center">
                              {locked ? <Tooltip title="Administrator həmişə bütün səlahiyyətlərə malikdir"><span>{box}</span></Tooltip> : box}
                            </TableCell>
                          );
                        })
                      ) : (
                        <TableCell>
                          {p.roles.map((r) => (
                            <Chip key={r.id} size="small" label={roleLabel(r.name)} sx={{ mr: 0.5 }} />
                          ))}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
}
