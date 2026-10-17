import AddRounded from '@mui/icons-material/AddRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
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
import { EmptyState, Loading, PageHeader } from '../components/common';
import { notify } from '../store/ui';
import { fmtDate, ordinal, today } from '../utils/format';
import { useAsync } from '../utils/useAsync';

function phase(p: Program) {
  const t = today();
  if (t < p.startDate) return { label: 'Başlamayıb', color: 'default' as const };
  if (t > p.endDate) return { label: 'Bitib', color: 'default' as const };
  return { label: 'Davam edir', color: 'info' as const };
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
        subtitle="Həftəlik və aylıq məşq planlarınızı hazırlayın və icrasını izləyin"
        action={
          <Button variant="contained" startIcon={<AddRounded />} component={RouterLink} to="/programs/new">
            Yeni proqram
          </Button>
        }
      />

      {loading && !data ? (
        <Loading />
      ) : !data?.length ? (
        <Card>
          <EmptyState
            icon={<CalendarMonthRounded fontSize="inherit" />}
            text="Hələ proqramınız yoxdur. İlk həftəlik və ya aylıq planınızı yaradın."
            action={
              <Button variant="outlined" component={RouterLink} to="/programs/new">
                Proqram yarat
              </Button>
            }
          />
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {data.map((p) => {
            const ph = phase(p);
            return (
              <Grid item xs={12} md={6} xl={4} key={p.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    outline: p.isActive ? 2 : 0,
                    outlineColor: 'primary.main',
                  }}
                >
                  <CardActionArea onClick={() => navigate(`/programs/${p.id}`)} sx={{ flex: 1 }}>
                    <CardContent>
                      <Stack direction="row" gap={1} mb={1} flexWrap="wrap">
                        <Chip size="small" label={p.type === 'weekly' ? 'Həftəlik' : 'Aylıq'} color="primary" variant="outlined" />
                        <Chip size="small" label={ph.label} color={ph.color} variant="outlined" />
                        {p.isActive && <Chip size="small" color="primary" icon={<CheckCircleRounded />} label="Aktiv" />}
                      </Stack>
                      <Typography variant="h6">{p.name}</Typography>
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {fmtDate(p.startDate)} — {fmtDate(p.endDate)}
                      </Typography>
                      {p.description && (
                        <Typography variant="body2" color="text.secondary" mb={2} sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {p.description}
                        </Typography>
                      )}
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          {p.stats.completed}/{p.stats.totalDays} gün
                          {p.stats.missed > 0 && ` · ${p.stats.missed} buraxılıb`}
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {p.stats.progress}%
                        </Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={p.stats.progress} />
                      {p.weekStats.length > 1 && (
                        <Stack direction="row" gap={1} mt={1.5}>
                          {p.weekStats.map((w) => (
                            <Box key={w.week} flex={1}>
                              <LinearProgress
                                variant="determinate"
                                color="success"
                                value={w.planned ? (w.completed / w.planned) * 100 : 0}
                                sx={{ height: 5 }}
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
                  <Stack direction="row" px={1.5} pb={1.5} gap={1} alignItems="center">
                    {!p.isActive && (
                      <Button size="small" onClick={() => activate(p)}>
                        Aktiv et
                      </Button>
                    )}
                    <Box flex={1} />
                    <Tooltip title="Redaktə">
                      <IconButton size="small" component={RouterLink} to={`/programs/${p.id}/edit`}>
                        <EditRounded fontSize="small" />
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
