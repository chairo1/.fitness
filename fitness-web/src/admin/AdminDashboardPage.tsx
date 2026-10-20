import { Avatar, Box, Chip, Grid, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts';
import { EmptyState, Loading, Num, PageHeader, Panel, StatStrip } from '../components/common';
import { fmtDate, fmtDateShort } from '../utils/format';
import { useAsync } from '../utils/useAsync';
import { adminApi, roleColor, roleLabel } from './api';

export default function AdminDashboardPage() {
  const theme = useTheme();
  const { data, loading, error } = useAsync(adminApi.overview);

  if (loading && !data) return <Loading />;
  if (error || !data) return <EmptyState text={error ?? 'Məlumat yüklənmədi'} />;

  const { users, workouts, signups, roles, latest } = data;
  const tk = theme.tokens;
  const maxRole = Math.max(1, ...roles.map((r) => r.users));

  return (
    <>
      <PageHeader title="İcmal" subtitle="İstifadəçilər, rollar və aktivlik" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <StatStrip
            items={[
              { label: 'İstifadəçilər', value: users.total, hint: `${users.active} aktiv` },
              { label: 'Yeni · 7 gün', value: users.newThisWeek },
              { label: 'Daxil olub · 7 gün', value: users.loggedInThisWeek },
              { label: 'Bloklanıb', value: users.blocked, accent: users.blocked > 0 },
              { label: 'Administratorlar', value: users.admins },
              { label: 'Məşqlər', value: workouts.total, hint: `${workouts.thisWeek} son 7 gündə` },
            ]}
          />
        </Grid>

        <Grid item xs={12} lg={8}>
          <Panel title="Həftəlik qeydiyyatlar">
            <BarChart
              height={280}
              xAxis={[{ scaleType: 'band', data: signups.map((s) => fmtDateShort(s.week)) }]}
              yAxis={[{ tickMinStep: 1 }]}
              series={[{ data: signups.map((s) => s.count), label: 'Yeni istifadəçi', color: tk.ink }]}
              slotProps={{ legend: { hidden: true } }}
              margin={{ left: 40, right: 16, top: 16, bottom: 28 }}
              grid={{ horizontal: true }}
              sx={{ '& .MuiChartsGrid-line': { stroke: tk.rule, strokeDasharray: '2 4' } }}
            />
          </Panel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Panel title="Rollar üzrə paylanma">
            {roles.map((r, i) => (
                <Stack
                  key={r.id}
                  direction="row"
                  alignItems="center"
                  gap={2}
                  py={1.25}
                  sx={{ borderBottom: i < roles.length - 1 ? `1px dotted ${tk.ruleStrong}` : 0 }}
                >
                  <Typography sx={{ width: 110, flexShrink: 0 }} noWrap>
                    {roleLabel(r.name)}
                  </Typography>
                  <Box flex={1} height={6} bgcolor={tk.sunken} position="relative" aria-hidden>
                    <Box position="absolute" left={0} top={0} bottom={0} width={`${(r.users / maxRole) * 100}%`} bgcolor={tk.ink} />
                  </Box>
                  <Num sx={{ width: 36, textAlign: 'right' }}>{r.users}</Num>
                </Stack>
              ))}
          </Panel>
        </Grid>

        <Grid item xs={12}>
          <Panel title="Son qeydiyyatdan keçənlər">
            <List disablePadding>
              {latest.map((u) => (
                <ListItem key={u.id} disableGutters divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: u.isActive ? 'text.primary' : 'action.disabled', width: 36, height: 36, fontSize: 15 }}>{u.name[0]?.toUpperCase()}</Avatar>
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
          </Panel>
        </Grid>
      </Grid>
    </>
  );
}
