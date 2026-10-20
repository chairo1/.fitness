import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded';
import BlockRounded from '@mui/icons-material/BlockRounded';
import GroupRounded from '@mui/icons-material/GroupRounded';
import ListAltRounded from '@mui/icons-material/ListAltRounded';
import LoginRounded from '@mui/icons-material/LoginRounded';
import PersonAddRounded from '@mui/icons-material/PersonAddRounded';
import { Avatar, Chip, Grid, List, ListItem, ListItemAvatar, ListItemText, Stack, useTheme } from '@mui/material';
import { BarChart, PieChart } from '@mui/x-charts';
import { EmptyState, GlassCard, Loading, PageHeader, StatCard } from '../components/common';
import { fmtDate, fmtDateShort } from '../utils/format';
import { useAsync } from '../utils/useAsync';
import { adminApi, roleColor, roleLabel } from './api';

export default function AdminDashboardPage() {
  const theme = useTheme();
  const { data, loading, error } = useAsync(adminApi.overview);

  if (loading && !data) return <Loading />;
  if (error || !data) return <EmptyState text={error ?? 'Məlumat yüklənmədi'} />;

  const { users, workouts, signups, roles, latest } = data;
  const palette = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.info.main];

  return (
    <>
      <PageHeader title="İcmal" subtitle="Platformanın ümumi vəziyyəti" />
      <Grid container spacing={2.5}>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard icon={<GroupRounded />} label="İstifadəçilər" value={users.total} hint={`${users.active} aktiv`} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard icon={<PersonAddRounded />} label="Yeni (7 gün)" value={users.newThisWeek} color="success.main" />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard icon={<LoginRounded />} label="Daxil olub (7 gün)" value={users.loggedInThisWeek} color="info.main" />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard icon={<BlockRounded />} label="Bloklanıb" value={users.blocked} color="error.main" />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard icon={<AdminPanelSettingsRounded />} label="Administratorlar" value={users.admins} color="secondary.main" />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard
            icon={<ListAltRounded />}
            label="Məşqlər"
            value={workouts.total}
            hint={`${workouts.thisWeek} son 7 gündə`}
            color="warning.main"
          />
        </Grid>

        <Grid item xs={12} lg={8}>
          <GlassCard title="Həftəlik qeydiyyatlar">
            <BarChart
              height={280}
              xAxis={[{ scaleType: 'band', data: signups.map((s) => fmtDateShort(s.week)) }]}
              yAxis={[{ tickMinStep: 1 }]}
              series={[{ data: signups.map((s) => s.count), label: 'Yeni istifadəçi', color: theme.palette.primary.main }]}
              slotProps={{ legend: { hidden: true } }}
              margin={{ left: 40, right: 16, top: 16, bottom: 28 }}
              borderRadius={6}
            />
          </GlassCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <GlassCard title="Rollar üzrə paylanma">
            <PieChart
              height={280}
              series={[
                {
                  data: roles.map((r, i) => ({ id: r.id, value: r.users, label: roleLabel(r.name), color: palette[i % palette.length] })),
                  innerRadius: 60,
                  paddingAngle: 2,
                  cornerRadius: 6,
                },
              ]}
              slotProps={{ legend: { direction: 'row', position: { vertical: 'bottom', horizontal: 'middle' } } }}
              margin={{ top: 8, bottom: 72, left: 8, right: 8 }}
            />
          </GlassCard>
        </Grid>

        <Grid item xs={12}>
          <GlassCard title="Son qeydiyyatdan keçənlər">
            <List disablePadding>
              {latest.map((u) => (
                <ListItem key={u.id} disableGutters divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: u.isActive ? 'primary.main' : 'action.disabled' }}>{u.name[0]?.toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={u.name} secondary={`${u.email} · ${fmtDate(u.createdAt)}`} />
                  <Stack direction="row" gap={0.5} flexWrap="wrap" justifyContent="flex-end">
                    {!u.isActive && <Chip size="small" color="error" label="Bloklanıb" />}
                    {u.roles.map((r) => (
                      <Chip key={r.id} size="small" variant="outlined" color={roleColor(r.name)} label={roleLabel(r.name)} />
                    ))}
                  </Stack>
                </ListItem>
              ))}
            </List>
          </GlassCard>
        </Grid>
      </Grid>
    </>
  );
}
