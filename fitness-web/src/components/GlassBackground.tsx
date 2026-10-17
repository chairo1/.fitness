import { Box, useTheme } from '@mui/material';

/** Fixed, blurred colour blobs that the glass surfaces float over. */
export default function GlassBackground() {
  const dark = useTheme().palette.mode === 'dark';
  const blobs = dark
    ? ['#3B3FD8', '#9B3FD8', '#0E8C9C']
    : ['#8C9BFF', '#FFA3D1', '#7FE3D6'];
  const pos = [
    { top: '-12%', left: '-8%', size: 520 },
    { top: '35%', right: '-10%', size: 480 },
    { bottom: '-15%', left: '25%', size: 440 },
  ];

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        bgcolor: 'background.default',
        transition: 'background-color .3s',
      }}
    >
      {pos.map(({ size, ...p }, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            ...p,
            width: size,
            height: size,
            borderRadius: '50%',
            background: blobs[i],
            filter: 'blur(110px)',
            opacity: dark ? 0.45 : 0.55,
          }}
        />
      ))}
    </Box>
  );
}
