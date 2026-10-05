import { AbsoluteFill, Freeze, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS, LAYOUT, RADIUS } from '../../../shared/roblox-devlog-theme';
import { BRoll } from '../BRoll';
import { usePop, useCue, useLayerFade } from '../timing';
import { accentColor, type AccentName, HandCircle, Label, plateStyle } from '../ui';

// Все плашки поверх лица держатся вне зоны лица x 700–1220, y 120–720 (план, раздел 5, правило 3).

/** GFX-5 / 8 / 12: плашка в левом верхнем углу. */
export const Plate = ({ text, color }: { text: string; color?: AccentName }) => {
  const p = usePop(0);
  const opacity = useLayerFade(0, 8);
  const c = accentColor(color);
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          ...plateStyle,
          position: 'absolute',
          top: LAYOUT.safe,
          left: LAYOUT.safe,
          maxWidth: 560,
          padding: '18px 28px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          fontFamily: FONTS.heavy,
          fontWeight: 900,
          fontSize: 36,
          lineHeight: 1.15,
          color: COLORS.text,
          borderLeft: `8px solid ${c}`,
          opacity: Math.min(1, p * 1.5),
          transform: `translateX(${(1 - p) * -50}px)`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** GFX-10: титр раздела по центру сверху. */
export const TitleCard = ({ small, big, color }: { small: string; big: string; color?: AccentName }) => {
  const p = usePop(0, 12);
  const opacity = useLayerFade(0, 8);
  const c = accentColor(color);
  return (
    <AbsoluteFill style={{ opacity, alignItems: 'center' }}>
      <div
        style={{
          marginTop: 70,
          textAlign: 'center',
          transform: `scale(${0.8 + 0.2 * p})`,
          opacity: Math.min(1, p * 1.5),
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: c,
            color: '#0b0d14',
            borderRadius: RADIUS.pill,
            padding: '6px 26px',
            fontFamily: FONTS.heavy,
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: 4,
          }}
        >
          {small}
        </div>
        <div
          style={{
            marginTop: 10,
            fontFamily: FONTS.heavy,
            fontWeight: 900,
            fontSize: 96,
            color: COLORS.text,
            WebkitTextStroke: '10px rgba(0,0,0,0.85)',
            paintOrder: 'stroke fill',
            textShadow: '0 8px 30px rgba(0,0,0,0.6)',
          }}
        >
          {big}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** GFX-11: подпись текущей комнаты, меняется по словам. */
export const Rooms = ({ items }: { items: [number, string][] }) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(0, 6);
  const idx = items.reduce((acc, [t], i) => (frame >= cue(t) ? i : acc), 0);
  const item = items[idx];
  const p = usePop(item ? cue(item[0]) : 0, 12);
  if (!item) return null;
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          ...plateStyle,
          position: 'absolute',
          top: LAYOUT.safe,
          left: LAYOUT.safe,
          padding: '14px 30px',
          fontFamily: FONTS.heavy,
          fontWeight: 900,
          fontSize: 46,
          color: COLORS.text,
          transform: `translateY(${(1 - p) * -20}px)`,
          opacity: Math.min(1, p * 1.6),
        }}
      >
        {item[1]}
      </div>
    </AbsoluteFill>
  );
};

/** GFX-9: три обводки на виде сверху по словам «пусто» / «негде спрятаться» / «одинаково». */
export const Markers = () => {
  const cue = useCue();
  const marks: [number, number, number, string][] = [
    [247.63, 520, 420, 'пусто'],
    [249.03, 1330, 330, 'негде спрятаться'],
    [250.85, 920, 640, 'всё одинаково'],
  ];
  return (
    <AbsoluteFill>
      {marks.map(([t, x, y, text]) => (
        <AbsoluteFill key={text}>
          <HandCircle at={cue(t)} cx={x} cy={y} rx={190} ry={120} />
          <Label at={cue(t) + 6} style={{ left: x - 200, top: y - 190, width: 400, textAlign: 'center' }} color="#fff">
            {text}
          </Label>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

/** GFX-28: стоп-кадр с кубом и обводка «вот же он!». */
export const Spot = ({ at }: { at: number }) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const { scale } = { scale: interpolate(frame, [0, 160], [1, 1.08], { extrapolateRight: 'clamp' }) };
  const t = cue(at);
  const wobble = Math.sin((frame - t) / 6) * 3;
  // Куб на первом кадре 01_disguise — примерно (1300, 640).
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: '1300px 640px' }}>
        <Freeze frame={0}>
          <BRoll file="01_disguise.mp4" />
        </Freeze>
      </AbsoluteFill>
      <HandCircle at={t} cx={1300} cy={600} rx={330} ry={300} width={12} />
      {frame >= t + 6 && (
        <>
          <svg style={{ position: 'absolute', left: 0, top: 0 }} width={1920} height={1080}>
            <path
              d="M 560 330 Q 760 300 920 470"
              fill="none"
              stroke={COLORS.danger}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={600}
              strokeDashoffset={interpolate(frame, [t + 6, t + 14], [600, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}
            />
            <path d="M 880 430 L 930 485 L 860 490" fill="none" stroke={COLORS.danger} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" opacity={frame >= t + 14 ? 1 : 0} />
          </svg>
          <Label at={t + 8} size={88} style={{ left: 120, top: 220, transform: `rotate(${-6 + wobble}deg)` }}>
            вот же он!
          </Label>
        </>
      )}
    </AbsoluteFill>
  );
};

/** GFX-17: две строки слева от лица. */
export const TwoLines = () => {
  const cue = useCue();
  const opacity = useLayerFade(0, 8);
  const a = usePop(0);
  const b = usePop(cue(540.87));
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: 'absolute', left: LAYOUT.safe, top: 260, width: 580, fontFamily: FONTS.heavy, fontWeight: 900 }}>
        <div style={{ fontSize: 44, color: COLORS.textMuted, opacity: a, transform: `translateX(${(1 - a) * -40}px)`, textShadow: '0 4px 16px rgba(0,0,0,0.8)' }}>
          Сделать игру — <span style={{ color: COLORS.text }}>легко</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 64,
            lineHeight: 1.05,
            color: COLORS.text,
            opacity: b,
            transform: `scale(${0.8 + 0.2 * b})`,
            transformOrigin: 'left center',
            textShadow: '0 4px 16px rgba(0,0,0,0.8)',
          }}
        >
          Найти игроков — <span style={{ color: COLORS.danger }}>сложно</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** GFX-19: кнопка «Подписаться» справа от лица, курсор нажимает. */
export const Subscribe = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(0, 8);
  const p = usePop(0);
  const click = cue(599.1);
  const done = frame >= click;
  const press = frame >= click && frame < click + 5 ? 0.92 : 1;
  const cursorT = interpolate(frame, [click - 18, click], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: 'absolute',
          left: 1290,
          top: 620,
          padding: '22px 44px',
          borderRadius: RADIUS.pill,
          background: done ? '#3a3d48' : COLORS.danger,
          color: '#fff',
          fontFamily: FONTS.heavy,
          fontWeight: 900,
          fontSize: 44,
          transform: `scale(${(0.6 + 0.4 * p) * press})`,
          opacity: p,
          boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
        }}
      >
        {done ? '✓ Вы подписаны' : 'Подписаться'}
      </div>
      <svg
        style={{
          position: 'absolute',
          left: 1700 - 240 * cursorT,
          top: 800 - 110 * cursorT,
          opacity: frame >= click - 18 ? 1 : 0,
        }}
        width={48}
        height={60}
        viewBox="0 0 24 30"
      >
        <path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17 Z" fill="#fff" stroke="#000" strokeWidth={1.6} />
      </svg>
    </AbsoluteFill>
  );
};

/** GFX-20: вопрос для комментариев слева от лица. */
export const Comment = () => {
  const opacity = useLayerFade(0, 8);
  const p = usePop(0);
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          ...plateStyle,
          position: 'absolute',
          left: LAYOUT.safe,
          top: 300,
          width: 560,
          padding: '24px 30px',
          borderRadius: 26,
          borderBottomLeftRadius: 6,
          transform: `scale(${0.7 + 0.3 * p})`,
          transformOrigin: 'left bottom',
          opacity: p,
        }}
      >
        <div style={{ fontFamily: FONTS.text, fontWeight: 800, fontSize: 24, color: COLORS.accent }}>💬 Напиши в комментариях</div>
        <div style={{ marginTop: 8, fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 42, lineHeight: 1.15, color: COLORS.text }}>
          Ты бы зашёл поиграть в такие прятки?
        </div>
      </div>
    </AbsoluteFill>
  );
};
