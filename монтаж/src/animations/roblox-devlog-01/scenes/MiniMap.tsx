import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COLORS, FONTS, LAYOUT } from '../../../shared/roblox-devlog-theme';
import { usePop, useCue, useLayerFade } from '../timing';
import { plateStyle } from '../ui';

type Room = { id: string; label: string; x: number; y: number; w: number; h: number };

// Схемы приблизительные — точность не нужна (план, GFX-23). Координаты в viewBox 400×260.
const LAB: Room[] = [
  { id: 'warehouse', label: 'Склад', x: 10, y: 10, w: 180, h: 95 },
  { id: 'office', label: 'Офис', x: 210, y: 10, w: 180, h: 95 },
  { id: 'corridor', label: 'Коридор', x: 10, y: 113, w: 380, h: 34 },
  { id: 'reactor', label: 'Реакторная', x: 10, y: 155, w: 180, h: 95 },
  { id: 'server', label: 'Серверная', x: 210, y: 155, w: 180, h: 95 },
];

const SHIP: Room[] = [
  { id: 'upper', label: 'Верхняя палуба', x: 20, y: 30, w: 360, h: 40 },
  { id: 'cabin', label: 'Каюта', x: 290, y: 76, w: 90, h: 50 },
  { id: 'gundeck', label: 'Орудийная', x: 40, y: 76, w: 244, h: 50 },
  { id: 'brig', label: 'Карцер', x: 70, y: 132, w: 120, h: 50 },
  { id: 'hold', label: 'Трюм', x: 196, y: 132, w: 160, h: 50 },
];

/** GFX-23: мини-план в правом верхнем углу, названная комната подсвечивается. */
export const MiniMap = ({ map, marks }: { map: 'lab' | 'ship'; marks: [number, string][] }) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  const p = usePop(0);
  const rooms = map === 'lab' ? LAB : SHIP;
  const color = map === 'lab' ? COLORS.lab : COLORS.ship;
  const active = marks.reduce<string | null>((acc, [t, id]) => (frame >= cue(t) ? id : acc), null);
  const activeAt = marks.find(([, id]) => id === active)?.[0];
  const bump = activeAt !== undefined ? Math.max(0, 1 - (frame - cue(activeAt)) / 8) : 0;

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          ...plateStyle,
          position: 'absolute',
          top: LAYOUT.safe,
          right: LAYOUT.safe,
          width: 440,
          padding: 16,
          opacity: p,
          transform: `translateX(${(1 - p) * 60}px)`,
        }}
      >
        <svg width={408} height={265} viewBox="0 0 400 260">
          {map === 'ship' && (
            <>
              <path d="M8 24 L392 24 L372 196 Q200 236 28 196 Z" fill="rgba(110,70,40,0.45)" stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
              <line x1={150} y1={24} x2={150} y2={2} stroke="rgba(255,255,255,0.4)" strokeWidth={3} />
              <line x1={260} y1={24} x2={260} y2={2} stroke="rgba(255,255,255,0.4)" strokeWidth={3} />
            </>
          )}
          {rooms.map((r) => {
            const on = r.id === active;
            return (
              <g key={r.id} transform={on ? `translate(${r.x + r.w / 2} ${r.y + r.h / 2}) scale(${1 + 0.06 * bump}) translate(${-(r.x + r.w / 2)} ${-(r.y + r.h / 2)})` : undefined}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={8}
                  fill={on ? color : 'rgba(255,255,255,0.06)'}
                  stroke={on ? color : 'rgba(255,255,255,0.22)'}
                  strokeWidth={2}
                />
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2 + 7}
                  textAnchor="middle"
                  fontFamily={FONTS.heavy}
                  fontWeight={900}
                  fontSize={r.h < 45 ? 17 : 20}
                  fill={on ? '#0b0d14' : 'rgba(255,255,255,0.7)'}
                >
                  {r.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </AbsoluteFill>
  );
};
