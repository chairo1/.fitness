import {
  BACK_LINES,
  BACK_MUSCLES,
  BACK_SHORTS,
  BASE_SHAPES,
  FIGURE_H,
  FIGURE_W,
  FRONT_LINES,
  FRONT_MUSCLES,
  FRONT_SHORTS,
  GLUTES,
  HAIR_BACK,
  HAIR_FRONT,
} from '../../components/bodymap/anatomy';

export type MuscleState = 'idle' | 'group' | 'hot';

interface Props {
  stateOf: (part: string) => MuscleState;
  onHover: (part: string | null) => void;
  onPick: (part: string) => void;
}

// Line-drawing take on the app's body map, for the dark landing section.
const PAPER = 'rgba(242, 239, 232, ';
const FILL: Record<MuscleState, string> = { idle: `${PAPER}0.05)`, group: 'rgba(229, 67, 43, 0.38)', hot: '#e5432b' };
const STROKE: Record<MuscleState, string> = { idle: `${PAPER}0.55)`, group: '#ff8a73', hot: '#ffb3a3' };

export default function AnatomyFigure({ stateOf, onHover, onPick }: Props) {
  const muscle = (m: { part: string; d: string }, i: number) => {
    const st = stateOf(m.part);
    return (
      <path
        key={i}
        d={m.d}
        fill={FILL[st]}
        stroke={STROKE[st]}
        strokeWidth={1.3}
        strokeLinejoin="round"
        style={{ cursor: 'pointer', transition: 'fill .12s' }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(m.part)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
        onClick={() => onPick(m.part)}
      />
    );
  };

  const figure = (front: boolean) => (
    <>
      {BASE_SHAPES.map((d, i) => (
        <path key={`o${i}`} d={d} fill="none" stroke={`${PAPER}0.9)`} strokeWidth={3} strokeLinejoin="round" />
      ))}
      {BASE_SHAPES.map((d, i) => (
        <path key={`f${i}`} d={d} fill="#17160f" />
      ))}
      {(front ? FRONT_LINES : BACK_LINES).map((d, i) => (
        <path key={`l${i}`} d={d} fill="none" stroke={`${PAPER}0.35)`} strokeWidth={1.2} />
      ))}
      {(front ? FRONT_MUSCLES : BACK_MUSCLES).map(muscle)}
      <path d={front ? FRONT_SHORTS : BACK_SHORTS} fill="#2b2a24" stroke={`${PAPER}0.4)`} strokeWidth={1.2} />
      {!front && GLUTES.map(muscle)}
      <path d={front ? HAIR_FRONT : HAIR_BACK} fill={`${PAPER}0.22)`} />
    </>
  );

  return (
    <svg className="lp-map__figure" viewBox={`0 0 ${FIGURE_W * 2} ${FIGURE_H}`} aria-hidden="true">
      <g>{figure(true)}</g>
      <g transform={`translate(${FIGURE_W},0)`}>{figure(false)}</g>
    </svg>
  );
}
