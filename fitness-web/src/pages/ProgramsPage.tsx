import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Program } from '../api/types';
import { EmptyState, Loading, Num, PageHeader, Panel } from '../components/common';
import { notify } from '../store/ui';
import { fmtDate, ordinal, today } from '../utils/format';
import { useAsync } from '../utils/useAsync';

function phase(p: Program) {
  const t = today();
  if (t < p.startDate) return { label: 'Başlamayıb', color: 'default' as const };
  if (t > p.endDate) return { label: 'Bitib', color: 'default' as const };
  return { label: 'Davam edir', color: 'default' as const };
}

export default function ProgramsPage() {
  const navigate = useNavigate();
  const { data, loading, reload } = useAsync(api.programs);

  const activate = async (p: Program) => {
    try {
      await api.activateProgram(p.id);
      notify(`"${p.name}" aktiv proqram oldu`);
      reload();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  const remove = async (p: Program) => {
    if (!confirm(`"${p.name}" proqramı silinsin? Qeyd olunmuş məşqlər qalacaq.`)) return;
    try {
      await api.deleteProgram(p.id);
      notify('Proqram silindi');
      reload();
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Proqramlar"
        subtitle="Həftəlik və aylıq planlar və onların icrası"
        action={
          <Button variant="contained" startIcon={<AddRounded />} component={RouterLink} to="/programs/new">
            Yeni proqram
          </Button>
        }
      />

      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Panel>
          <EmptyState
            text="Hələ proqram yoxdur. Həftəlik (7 gün) və ya aylıq (4 həftə) plan qurun — hər gün üçün hərəkətlər, set və hədəf çəki."
            action={
              <Button variant="outlined" component={RouterLink} to="/programs/new">
                Proqram qur
              </Button>
            }
          />
        </Panel>
      ) : (
        <Grid container spacing={3}>
          {data.map((p) => {
            const ph = phase(p);
            return (
              <Grid item xs={12} md={6} xl={4} key={p.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: (t) => `${p.isActive ? 4 : 1}px solid ${p.isActive ? t.tokens.ink : t.tokens.ruleStrong}`,
                  }}
                >
                  <CardActionArea onClick={() => navigate(`/programs/${p.id}`)} sx={{ flex: 1 }}>
                    <CardContent sx={{ p: 2.75 }}>
                      <Stack direction="row" justifyContent="space-between" gap={1} mb={1.25}>
                        <Typography variant="body2" color="text.secondary">
                          {p.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} · {ph.label}
                        </Typography>
                        {p.isActive && (
                          <Typography variant="body2" fontWeight={600} color="secondary.main">
                            Aktiv
                          </Typography>
                        )}
                      </Stack>
                      <Typography variant="h5" component="h2">
                        {p.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.5} mb={2}>
                        <Num sx={{ fontSize: 13 }}>
                          {fmtDate(p.startDate)} — {fmtDate(p.endDate)}
                        </Num>
                      </Typography>
                      {p.description && (
                        <Typography
                          variant="body2"
                          mb={2}
                          sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {p.description}
                        </Typography>
                      )}
                      <Stack direction="row" justifyContent="space-between" mb={0.75}>
                        <Typography variant="body2" color="text.secondary">
                          {p.stats.completed}/{p.stats.totalDays} gün
                          {p.stats.missed > 0 && ` · ${p.stats.missed} buraxılıb`}
                        </Typography>
                        <Num sx={{ fontSize: 14, fontWeight: 600 }}>{p.stats.progress}%</Num>
                      </Stack>
                      <LinearProgress variant="determinate" value={p.stats.progress} />
                      {p.weekStats.length > 1 && (
                        <Stack direction="row" gap={1} mt={2}>
                          {p.weekStats.map((w) => (
                            <Box key={w.week} flex={1}>
                              <LinearProgress
                                variant="determinate"
                                color="success"
                                value={w.planned ? (w.completed / w.planned) * 100 : 0}
                                sx={{ height: 3 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {ordinal(w.week)} həftə
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </CardActionArea>
                  <Stack
                    direction="row"
                    px={2}
                    py={1}
                    gap={1}
                    alignItems="center"
                    sx={{ borderTop: (t) => `1px solid ${t.tokens.rule}` }}
                  >
                    {!p.isActive && (
                      <Button size="small" onClick={() => activate(p)} sx={{ px: 0.75 }}>
                        Aktiv et
                      </Button>
                    )}
                    <Box flex={1} />
                    <Tooltip title="Redaktə">
                      <IconButton size="small" component={RouterLink} to={`/programs/${p.id}/edit`}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton size="small" onClick={() => remove(p)}>
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </>
  );
}
