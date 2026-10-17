import { Autocomplete, TextField } from '@mui/material';
import { useEffect } from 'react';
import { useExercisesStore } from '../store/exercises';
import { MUSCLE_LABELS } from '../utils/format';

export default function ExerciseSelect({
  value,
  onChange,
  label = 'Hərəkət',
  size = 'small',
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  size?: 'small' | 'medium';
}) {
  const { items, load } = useExercisesStore();
  useEffect(() => {
    load();
  }, [load]);

  const options = [...items].sort(
    (a, b) => a.muscleGroup.localeCompare(b.muscleGroup) || a.name.localeCompare(b.name),
  );

  return (
    <Autocomplete
      size={size}
      options={options}
      value={items.find((e) => e.id === value) ?? null}
      onChange={(_, v) => onChange(v?.id ?? null)}
      groupBy={(o) => MUSCLE_LABELS[o.muscleGroup]}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderInput={(p) => <TextField {...p} label={label} />}
      sx={{ minWidth: 200, flex: 1 }}
    />
  );
}
