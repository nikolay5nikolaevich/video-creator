import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS, RADIUS } from '../../shared/roblox-devlog-theme';
import { usePop } from './timing';

export type AccentName = 'accent' | 'lab' | 'ship' | 'danger';
export const accentColor = (c: AccentName | undefined) => COLORS[c ?? 'accent'];

/** Тёмный фон с лёгкой сеткой для полноэкранной графики. */
export const GridBg = () => (
  <AbsoluteFill
    style={{
      background: COLORS.bg,
      backgroundImage: `linear-gradient(${COLORS.grid} 2px, transparent 2px), linear-gradient(90deg, ${COLORS.grid} 2px, transparent 2px)`,
      backgroundSize: '64px 64px',
    }}
  />
);

export const plateStyle: CSSProperties = {
  background: COLORS.plate,
  border: `2px solid ${COLORS.plateBorder}`,
  borderRadius: RADIUS.plate,
};

/** Заголовок полноэкранной сцены — появляется сразу со слоем. */
export const SceneTitle = ({ children, top = 70 }: { children: ReactNode; top?: number }) => {
  const p = usePop(0);
  return (
    <div
      style={{
        position: 'absolute',
        top,
        width: '100%',
        textAlign: 'center',
        fontFamily: FONTS.heavy,
        fontWeight: 900,
        fontSize: 58,
        color: COLORS.text,
        opacity: p,
        transform: `translateY(${(1 - p) * -30}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** Обводка «от руки»: эллипс с небольшим перехлёстом, прорисовывается за `dur` кадров. */
export const HandCircle = ({
  at,
  cx,
  cy,
  rx,
  ry,
  color = COLORS.danger,
  dur = 10,
  width = 10,
}: {
  at: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color?: string;
  dur?: number;
  width?: number;
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (frame < at) return null;
  // Чуть больше полного оборота и с наклоном — выглядит как маркер.
  const pts: string[] = [];
  const turns = 1.12;
  for (let i = 0; i <= 60; i++) {
    const t = (i / 60) * turns * Math.PI * 2 - 2.2;
    const wobble = 1 + 0.04 * Math.sin(t * 3);
    pts.push(`${cx + Math.cos(t) * rx * wobble},${cy + Math.sin(t) * ry * wobble}`);
  }
  const len = 2 * Math.PI * Math.max(rx, ry) * turns * 1.05;
  return (
    <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1920} height={1080}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - p)}
        style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
      />
    </svg>
  );
};

/** Надпись-ярлык с пружинным появлением. */
export const Label = ({
  at,
  children,
  style,
  color = COLORS.text,
  size = 40,
}: {
  at: number;
  children: ReactNode;
  style?: CSSProperties;
  color?: string;
  size?: number;
}) => {
  const p = usePop(at);
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: FONTS.heavy,
        fontWeight: 900,
        fontSize: size,
        color,
        textShadow: '0 4px 16px rgba(0,0,0,0.7)',
        opacity: Math.min(1, p * 1.5),
        transform: `scale(${0.7 + 0.3 * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Окно приложения (чат, браузер) в тёмной теме. */
export const AppWindow = ({
  title,
  children,
  style,
}: {
  title: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      position: 'absolute',
      left: (1920 - 1400) / 2,
      top: 60,
      width: 1400,
      height: 760,
      borderRadius: 28,
      background: '#11141f',
      border: `2px solid ${COLORS.plateBorder}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}
  >
    <div
      style={{
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 26px',
        borderBottom: `2px solid ${COLORS.plateBorder}`,
      }}
    >
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
        <div key={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c }} />
      ))}
      <div style={{ marginLeft: 16, fontFamily: FONTS.mono, fontSize: 24, color: COLORS.textMuted, flex: 1 }}>
        {title}
      </div>
    </div>
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
  </div>
);

/** Текст, набираемый посимвольно с кареткой. */
export const Typed = ({ at, text, cps = 28 }: { at: number; text: string; cps?: number }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - at) / 30) * cps)));
  const caret = n < text.length && Math.floor(frame / 8) % 2 === 0;
  return (
    <>
      {text.slice(0, n)}
      <span style={{ opacity: caret ? 1 : 0 }}>▍</span>
    </>
  );
};

/** Курсор мыши, едет из (x0,y0) в (x1,y1) за кадры [a,b], в кадре click «нажимается». */
export const Cursor = ({
  a,
  b,
  from,
  to,
  click,
}: {
  a: number;
  b: number;
  from: [number, number];
  to: [number, number];
  click: number;
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (x) => 1 - Math.pow(1 - x, 3),
  });
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t;
  const press = frame >= click && frame < click + 5 ? 0.82 : 1;
  if (frame < a) return null;
  return (
    <svg
      style={{ position: 'absolute', left: x, top: y, transform: `scale(${press})`, transformOrigin: '0 0' }}
      width={48}
      height={60}
      viewBox="0 0 24 30"
    >
      <path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17 Z" fill="#fff" stroke="#000" strokeWidth={1.6} />
    </svg>
  );
};
