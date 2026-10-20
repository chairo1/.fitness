import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ThreeSixtyRounded from '@mui/icons-material/ThreeSixtyRounded';
import TouchAppRounded from '@mui/icons-material/TouchAppRounded';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Slider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MuscleGroup } from '../../api/types';
import { MUSCLE_LABELS } from '../../utils/format';
import { BODY_GROUPS, exercisesUrl, MUSCLE_PARTS, musclePart, type MusclePart } from '../../utils/muscles';

// Anatomical model built from BodyParts3D (CC BY 4.0) — see public/models/README.md for how it is generated.
// Node names in the GLB: "skin" and "base" are the grey body, "shorts" / "shorts_back" the trunks, "hair",
// every other node is a muscle id from MUSCLE_PARTS.
const MODEL_URL = '/models/body.glb';

type State = 'idle' | 'group' | 'hot';

const COLORS: Record<State | 'body' | 'shorts' | 'hair', string> = {
  hair: '#3a3634',
  body: '#e4e5e8', // gymvisual-style light grey (darkened by the baked AO)
  shorts: '#2c2d31',
  idle: '#e4e5e8',
  group: '#f0896c',
  hot: '#e5432b',
};

/** Loads the model once and drives it; React only feeds angle / highlight state. */
function createScene(container: HTMLElement, onReady: () => void, onError: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 30);

  // Soft studio light: strong key from the front-left, rim from behind so the silhouette reads on white.
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a909b', 0.9));
  const key = new THREE.DirectionalLight('#ffffff', 2.6);
  key.position.set(-1.5, 2.5, 3);
  const fill = new THREE.DirectionalLight('#ffffff', 0.7);
  fill.position.set(2.5, 1, 2);
  const rim = new THREE.DirectionalLight('#ffffff', 1.1);
  rim.position.set(0, 2, -3);
  scene.add(key, fill, rim);

  const figure = new THREE.Group();
  scene.add(figure);

  const disposables: { dispose: () => void }[] = [];
  // Vertex colours carry baked ambient occlusion; the material colour multiplies them.
  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.body, roughness: 0.58, metalness: 0, vertexColors: true });
  disposables.push(bodyMat);
  const shortsMat = new THREE.MeshStandardMaterial({ color: COLORS.shorts, roughness: 0.75, metalness: 0, vertexColors: true });
  const hairMat = new THREE.MeshStandardMaterial({ color: COLORS.hair, roughness: 0.9, metalness: 0, vertexColors: true });
  disposables.push(shortsMat, hairMat);
  const muscleMats: { partId: string; mat: THREE.MeshStandardMaterial }[] = [];
  const pickables: THREE.Object3D[] = [];

  let dirty = true;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    MODEL_URL,
    (gltf) => {
      gltf.scene.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        const mesh = o as THREE.Mesh;
        disposables.push(mesh.geometry);
        const name = musclePart(mesh.name) || /^(shorts|hair)/.test(mesh.name) ? mesh.name : (mesh.parent?.name ?? '');
        if (name === 'shorts' || name === 'hair') {
          mesh.material = name === 'hair' ? hairMat : shortsMat;
        } else if (name === 'shorts_back' || musclePart(name)) {
          // The back panel of the shorts covers the glutes, so it stands in for them (dark until highlighted).
          const partId = name === 'shorts_back' ? 'glutes' : name;
          const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, vertexColors: true });
          mat.userData.idle = name === 'shorts_back' ? COLORS.shorts : COLORS.idle;
          mat.color.set(mat.userData.idle);
          disposables.push(mat);
          muscleMats.push({ partId, mat });
          mesh.material = mat;
          mesh.userData.partId = partId;
        } else {
          mesh.material = bodyMat;
        }
        pickables.push(mesh);
      });
      figure.add(gltf.scene);
      dirty = true;
      onReady();
    },
    undefined,
    onError,
  );

  // Render only when something changed or the figure is still easing towards its target angle.
  let target = 0;
  let frame = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const diff = target - figure.rotation.y;
    if (Math.abs(diff) > 1e-4) {
      figure.rotation.y += diff * Math.min(1, dt * 10);
      dirty = true;
    }
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // Fit ~1.85 m of height, and ~0.8 m of width on narrow screens.
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(0.93 / tan, 0.4 / (tan * camera.aspect));
    camera.position.set(0, 0.88, dist);
    camera.lookAt(0, 0.86, 0);
    camera.updateProjectionMatrix();
    dirty = true;
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  return {
    canvas: renderer.domElement,
    setAngle(deg: number) {
      target = THREE.MathUtils.degToRad(deg);
    },
    setStates(state: (id: string) => State) {
      muscleMats.forEach(({ partId, mat }) => {
        const st = state(partId);
        mat.color.set(st === 'idle' ? mat.userData.idle : COLORS[st]);
        mat.emissive.set(st === 'hot' ? '#5a0d04' : '#000000');
      });
      dirty = true;
    },
    /** Muscle id under a client-space point; the grey body occludes muscles behind it. */
    pick(clientX: number, clientY: number): string | null {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      return (hit?.object.userData.partId as string | undefined) ?? null;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

type BodyScene = ReturnType<typeof createScene>;

// Click events don't carry a reliable pointerType everywhere, so remember it from pointerdown.
let lastPointerType = 'mouse';

function ModelCanvas({
  angle,
  stateOf,
  onHover,
  onPick,
  onFail,
}: {
  angle: number;
  stateOf: (id: string) => State;
  onHover: (id: string | null) => void;
  onPick: (id: string | null, touch: boolean) => void;
  onFail: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BodyScene | null>(null);
  const [loading, setLoading] = useState(true);
  const handlers = useRef({ onHover, onPick, onFail, stateOf });
  handlers.current = { onHover, onPick, onFail, stateOf };

  useEffect(() => {
    let scene: BodyScene;
    try {
      scene = createScene(
        ref.current!,
        () => {
          setLoading(false);
          scene.setStates(handlers.current.stateOf);
        },
        () => handlers.current.onFail(),
      );
    } catch {
      handlers.current.onFail(); // no WebGL
      return;
    }
    sceneRef.current = scene;
    const { canvas } = scene;
    let down: { x: number; y: number } | null = null;

    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && !e.buttons) handlers.current.onHover(scene.pick(e.clientX, e.clientY));
    };
    const leave = () => handlers.current.onHover(null);
    const press = (e: PointerEvent) => {
      lastPointerType = e.pointerType;
      down = { x: e.clientX, y: e.clientY };
    };
    const release = (e: PointerEvent) => {
      // A tap / click, not the end of a rotate-drag.
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      handlers.current.onPick(scene.pick(e.clientX, e.clientY), lastPointerType !== 'mouse');
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointerdown', press);
    canvas.addEventListener('pointerup', release);
    return () => {
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointerdown', press);
      canvas.removeEventListener('pointerup', release);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => sceneRef.current?.setAngle(angle), [angle]);
  useEffect(() => sceneRef.current?.setStates(stateOf), [stateOf]);

  return (
    <Box ref={ref} sx={{ position: 'absolute', inset: 0, '& canvas': { display: 'block' } }}>
      {loading && (
        <Stack alignItems="center" justifyContent="center" gap={1} color="text.secondary" sx={{ position: 'absolute', inset: 0 }}>
          <CircularProgress size={28} />
          <Typography variant="body2">Model yüklənir…</Typography>
        </Stack>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Card: model + rotation controls + muscle-group list
// ---------------------------------------------------------------------------

const VIEWS = [
  { label: 'Ön', deg: 0 },
  { label: 'Sağ', deg: 90 },
  { label: 'Arxa', deg: 180 },
  { label: 'Sol', deg: 270 },
];
const norm = (deg: number) => ((deg % 360) + 360) % 360;

export default function BodyModel3D({
  sets = {},
  onUnsupported,
}: {
  sets?: Partial<Record<MuscleGroup, number>>;
  /** Called when WebGL or the model is unavailable, so the caller can show the 2D map instead. */
  onUnsupported: () => void;
}) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [angle, setAngle] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<MuscleGroup | null>(null);
  // Touch has no hover: the first tap selects, a second tap (or the button) opens the exercises.
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ x: number; start: number } | null>(null);

  const part = musclePart(hovered ?? selected);
  const activeGroup = part?.group ?? hoveredGroup;
  const partId = part?.id;
  const stateOf = useCallback(
    (id: string): State =>
      id === partId ? 'hot' : activeGroup && musclePart(id)?.group === activeGroup ? 'group' : 'idle',
    [partId, activeGroup],
  );

  const open = (p: MusclePart) => navigate(exercisesUrl(p.group, p.id));
  const onPick = (id: string | null, touch: boolean) => {
    const p = musclePart(id);
    if (!p) return setSelected(null);
    if (!touch || selected === p.id) open(p);
    else setSelected(p.id);
  };

  // Drag horizontally anywhere on the model to spin it around its vertical axis.
  const onPointerDown = (e: ReactPointerEvent) => {
    drag.current = { x: e.clientX, start: angle };
    const move = (ev: PointerEvent) => {
      if (drag.current) setAngle(drag.current.start + (ev.clientX - drag.current.x) * 0.6);
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  // Go the short way round from the current (unbounded) angle.
  const turnTo = (deg: number) => setAngle((a) => a + ((deg - norm(a) + 540) % 360) - 180);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} gap={3}>
      <Box flex={1} minWidth={0}>
        <Paper
          elevation={0}
          sx={{ px: 2, py: 1, mb: 1.5, minHeight: 52, display: 'flex', alignItems: 'center', bgcolor: 'action.hover', boxShadow: 'none' }}
        >
          {part ? (
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" flex={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS.hot }} />
              <Typography fontWeight={700}>{part.name}</Typography>
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                {part.latin}
              </Typography>
              <Box flex={1} />
              <Chip size="small" label={MUSCLE_LABELS[part.group]} sx={{ bgcolor: COLORS.group, color: '#fff', fontWeight: 600 }} />
              {selected && !hovered ? (
                <Button size="small" variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => open(part)}>
                  Hərəkətlərə bax
                </Button>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Klikləyin → hərəkətlər
                </Typography>
              )}
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center" gap={1} color="text.secondary">
              <TouchAppRounded fontSize="small" />
              <Typography variant="body2">
                Əzələnin üzərinə {compact ? 'toxunun' : 'klikləyin'} — uyğun hərəkətlər açılacaq. Fırlatmaq üçün sürüşdürün.
              </Typography>
            </Stack>
          )}
        </Paper>

        <Box
          position="relative"
          height={compact ? 480 : 620}
          onPointerDown={onPointerDown}
          sx={{
            borderRadius: '4px',
            overflow: 'hidden',
            cursor: hovered ? 'pointer' : 'grab',
            '&:active': { cursor: hovered ? 'pointer' : 'grabbing' },
            touchAction: 'pan-y', // vertical swipes still scroll the page on phones
            background: theme.tokens.sunken,
          }}
        >
          <ModelCanvas angle={angle} stateOf={stateOf} onHover={setHovered} onPick={onPick} onFail={onUnsupported} />
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" gap={2} mt={1.5}>
          <Stack direction="row" alignItems="center" gap={1.5} flex={1} width="100%">
            <ThreeSixtyRounded color="action" />
            <Slider
              value={Math.round(norm(angle))}
              min={0}
              max={359}
              onChange={(_, v) => setAngle((a) => a + ((v as number) - norm(a)))}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}°`}
              aria-label="Modeli fırlat"
            />
          </Stack>
          <ButtonGroup size="small" variant="outlined">
            {VIEWS.map((v) => (
              <Button key={v.deg} onClick={() => turnTo(v.deg)} variant={Math.round(norm(angle)) === v.deg ? 'contained' : 'outlined'}>
                {v.label}
              </Button>
            ))}
          </ButtonGroup>
        </Stack>
        <Typography variant="caption" color="text.disabled" display="block" mt={1}>
          3D model:{' '}
          <Link href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/" target="_blank" rel="noopener" color="inherit">
            BodyParts3D
          </Link>
          , © The Database Center for Life Science,{' '}
          <Link href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" color="inherit">
            CC BY 4.0
          </Link>{' '}
          (sadələşdirilib)
        </Typography>
      </Box>

      <Box width={{ md: 280 }} flexShrink={0}>
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Əzələ qrupları · son 30 gün
        </Typography>
        <List disablePadding>
          {BODY_GROUPS.map((g) => {
            const parts = MUSCLE_PARTS.filter((p) => p.group === g);
            return (
              <ListItemButton
                key={g}
                selected={activeGroup === g}
                onMouseEnter={() => setHoveredGroup(g)}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => navigate(exercisesUrl(g))}
                sx={{ borderBottom: `1px solid ${theme.tokens.rule}`, py: 0.75 }}
              >
                <ListItemText
                  primary={MUSCLE_LABELS[g]}
                  secondary={parts.map((p) => p.name).join(', ')}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ noWrap: true }}
                  sx={{ minWidth: 0 }}
                />
                <Chip size="small" label={`${sets[g] ?? 0} set`} sx={{ ml: 1 }} />
                <ChevronRightRounded color="action" />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Stack>
  );
}
