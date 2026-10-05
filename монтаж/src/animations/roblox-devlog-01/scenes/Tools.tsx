import type { ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS, LAYOUT, RADIUS } from '../../../shared/roblox-devlog-theme';
import { usePop, useCue, useLayerFade } from '../timing';

const Plate = ({ at, children, color }: { at: number; children: ReactNode; color: string }) => {
  const p = usePop(at);
  return (
    <div
      style={{
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * -36}px) scale(${0.9 + p * 0.1})`,
        background: COLORS.plate,
        border: `2px solid ${COLORS.plateBorder}`,
        borderRadius: RADIUS.plate,
        padding: '18px 34px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        fontFamily: FONTS.heavy,
        fontWeight: 900,
        fontSize: 52,
        color: COLORS.text,
      }}
    >
      <div style={{ width: 22, height: 22, borderRadius: 6, background: color, boxShadow: `0 0 18px ${color}` }} />
      {children}
    </div>
  );
};

/** GFX-2: плашки инструментов над лицом. */
export const ToolChips = () => {
  const cue = useCue();
  const opacity = useLayerFade(0, 6);
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: 'absolute',
          top: LAYOUT.safe,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 28,
        }}
      >
        <Plate at={cue(24.79)} color={COLORS.accent}>
          Claude Code
        </Plate>
        <Plate at={cue(25.81)} color={COLORS.ship}>
          + Roblox Studio
        </Plate>
      </div>
    </AbsoluteFill>
  );
};

// ---------- GFX-3: схема MCP ----------

const GridBg = () => (
  <AbsoluteFill
    style={{
      background: COLORS.bg,
      backgroundImage: `linear-gradient(${COLORS.grid} 2px, transparent 2px), linear-gradient(90deg, ${COLORS.grid} 2px, transparent 2px)`,
      backgroundSize: '64px 64px',
    }}
  />
);

const Node = ({
  at,
  x,
  title,
  sub,
  color,
  round,
}: {
  at: number;
  x: number;
  title: string;
  sub: string;
  color: string;
  round?: boolean;
}) => {
  const p = usePop(at, 12);
  const w = round ? 260 : 440;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: round ? 300 : 320,
        width: w,
        height: round ? 260 : 220,
        borderRadius: round ? '50%' : 28,
        background: COLORS.plateSolid,
        border: `4px solid ${color}`,
        boxShadow: `0 0 ${50 * p}px ${color}55`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: Math.min(1, p * 1.5),
        transform: `scale(${0.6 + p * 0.4})`,
      }}
    >
      <div style={{ fontFamily: FONTS.heavy, fontWeight: 900, fontSize: round ? 64 : 54, color: COLORS.text }}>
        {title}
      </div>
      <div style={{ fontFamily: FONTS.text, fontWeight: 600, fontSize: 28, color: COLORS.textMuted, marginTop: 6 }}>
        {sub}
      </div>
    </div>
  );
};

/** Связь между блоками: линия прорисовывается, по ней бегут точки в обе стороны. */
const Link = ({ at, x1, x2 }: { at: number; x1: number; x2: number }) => {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [at, at + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = 430;
  const len = x2 - x1;
  const dots = [0, 1, 2].map((i) => ((frame - at) / 40 + i / 3) % 1);
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0 }} width={1920} height={1080}>
      <line x1={x1} y1={y} x2={x1 + len * grow} y2={y} stroke="rgba(255,255,255,0.35)" strokeWidth={6} strokeDasharray="14 12" />
      {grow >= 1 &&
        dots.map((d, i) => (
          <circle key={i} cx={x1 + len * (i % 2 ? 1 - d : d)} cy={y} r={9} fill={i % 2 ? COLORS.ship : COLORS.accent} />
        ))}
    </svg>
  );
};

const Pill = ({ at, icon, text }: { at: number; icon: string; text: string }) => {
  const p = usePop(at);
  return (
    <div
      style={{
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * 40}px)`,
        background: COLORS.plate,
        border: `3px solid ${COLORS.accent}`,
        borderRadius: RADIUS.pill,
        padding: '16px 34px',
        fontFamily: FONTS.heavy,
        fontWeight: 900,
        fontSize: 40,
        color: COLORS.text,
        display: 'flex',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <span style={{ color: COLORS.accent }}>{icon}</span>
      {text}
    </div>
  );
};

export const McpDiagram = () => {
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  const head = usePop(0);
  return (
    <AbsoluteFill style={{ opacity }}>
      <GridBg />
      <div
        style={{
          position: 'absolute',
          top: 110,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONTS.heavy,
          fontWeight: 900,
          fontSize: 60,
          color: COLORS.text,
          opacity: head,
          transform: `translateY(${(1 - head) * -30}px)`,
        }}
      >
        Как нейросеть работает с <span style={{ color: COLORS.ship }}>Roblox Studio</span>
      </div>
      <Link at={cue(31.93)} x1={590} x2={830} />
      <Link at={cue(32.83)} x1={1090} x2={1330} />
      <Node at={cue(29.73)} x={370} title="Claude Code" sub="агент" color={COLORS.accent} />
      <Node at={cue(31.93)} x={960} title="MCP" sub="мост" color={COLORS.text} round />
      <Node at={cue(32.83)} x={1550} title="Roblox Studio" sub="редактор" color={COLORS.ship} />
      <div style={{ position: 'absolute', top: 650, width: '100%', display: 'flex', justifyContent: 'center', gap: 26 }}>
        <Pill at={cue(36.37)} icon="◉" text="смотреть объекты" />
        <Pill at={cue(37.37)} icon="▶" text="выполнять команды" />
        <Pill at={cue(38.71)} icon="✓" text="проверять результат" />
      </div>
    </AbsoluteFill>
  );
};
