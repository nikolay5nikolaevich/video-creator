import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS, LAYOUT } from '../../../shared/roblox-devlog-theme';
import { usePop, useCue, useLayerFade } from '../timing';
import { GridBg, plateStyle, SceneTitle } from '../ui';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const ABILITIES: [string, string][] = [
  ['Рывок', '💨'],
  ['Приманка', '🎭'],
  ['Укрепление', '🛡️'],
  ['Закапывание', '⛏️'],
  ['Прыжок слизняка', '🟢'],
  ['Обмен местами', '🔁'],
  ['Магнит', '🧲'],
];

const TILE_TIMES = [395.75, 396.45, 397.17, 398.09, 399.01, 399.99, 400.81];

/** GFX-13: сетка 7 способностей, плитки загораются по словам. */
export const AbilityGrid = () => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  return (
    <AbsoluteFill style={{ opacity }}>
      <GridBg />
      <SceneTitle top={60}>
        <span style={{ color: COLORS.accent }}>7</span> способностей
      </SceneTitle>
      <div
        style={{
          position: 'absolute',
          top: 190,
          left: 0,
          right: 0,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 26,
          padding: '0 200px',
        }}
      >
        {ABILITIES.map(([name, icon], i) => {
          const at = cue(TILE_TIMES[i] ?? 0);
          const on = frame >= at;
          const bump = on ? Math.max(0, 1 - (frame - at) / 8) : 0;
          return (
            <div
              key={name}
              style={{
                width: 340,
                height: 290,
                borderRadius: 26,
                background: on ? COLORS.plateSolid : '#10131c',
                border: `4px solid ${on ? COLORS.accent : 'rgba(255,255,255,0.08)'}`,
                boxShadow: on ? `0 0 34px ${COLORS.accent}55` : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                transform: `scale(${1 + 0.08 * bump})`,
                opacity: on ? 1 : 0.45,
              }}
            >
              <div style={{ fontSize: 96, filter: on ? 'none' : 'grayscale(1)' }}>{icon}</div>
              <div style={{ fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 34, color: COLORS.text, textAlign: 'center' }}>{name}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** GFX-25: круговой таймер. secs — с какого числа, dur — за сколько секунд дойти до 0. */
const Timer = ({ at, secs, dur }: { at: number; secs: number; dur: number }) => {
  const frame = useCurrentFrame();
  const p = usePop(at);
  if (frame < at) return null;
  const t = interpolate(frame, [at, at + dur * 30], [0, 1], clamp);
  const left = Math.ceil(secs * (1 - t));
  const R = 52;
  const C = 2 * Math.PI * R;
  const danger = left <= 3;
  const color = danger ? COLORS.danger : COLORS.accent;
  return (
    <div style={{ position: 'relative', width: 140, height: 140, transform: `scale(${p})` }}>
      <svg width={140} height={140} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={70} cy={70} r={R} fill={COLORS.plateSolid} stroke="rgba(255,255,255,0.12)" strokeWidth={12} />
        <circle cx={70} cy={70} r={R} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * t} />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONTS.mono,
          fontWeight: 700,
          fontSize: 46,
          color,
        }}
      >
        {left}
      </div>
    </div>
  );
};

/** GFX-14: карточка способности «N/7 · Название» + минусы + таймер. */
export const AbilityCard = ({
  n,
  name,
  minus,
  timer,
}: {
  n: number;
  name: string;
  minus: [number, string][];
  timer?: { at: number; secs: number; dur: number };
}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(0, 6);
  const p = usePop(0);
  const icon = ABILITIES[n - 1]?.[1] ?? '';
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: 'absolute', top: LAYOUT.safe, left: LAYOUT.safe, display: 'flex', gap: 22, alignItems: 'flex-start' }}>
        <div
          style={{
            ...plateStyle,
            padding: '18px 28px 20px',
            minWidth: 380,
            maxWidth: 560,
            opacity: Math.min(1, p * 1.5),
            transform: `translateX(${(1 - p) * -50}px)`,
          }}
        >
          <div style={{ fontFamily: FONTS.mono, fontWeight: 700, fontSize: 26, color: COLORS.accent }}>СПОСОБНОСТЬ {n}/7</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONTS.heavy, fontWeight: 900, fontSize: 52, color: COLORS.text }}>
            <span style={{ fontSize: 46 }}>{icon}</span>
            {name}
          </div>
          {minus.map(([t, text]) => {
            const at = cue(t);
            if (frame < at) return null;
            const q = Math.min(1, (frame - at) / 6);
            return (
              <div
                key={text}
                style={{
                  marginTop: 10,
                  fontFamily: FONTS.text,
                  fontWeight: 800,
                  fontSize: 32,
                  color: COLORS.danger,
                  opacity: q,
                  transform: `translateY(${(1 - q) * 12}px)`,
                }}
              >
                − {text}
              </div>
            );
          })}
        </div>
        {timer && <Timer at={cue(timer.at)} secs={timer.secs} dur={timer.dur} />}
      </div>
    </AbsoluteFill>
  );
};

/** GFX-15: заглушка «Укрепление» — щит, на ударе вспышка. */
export const Shield = ({ flash }: { flash: number }) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const opacity = useLayerFade(6, 6);
  const hit = cue(flash);
  const pulse = 1 + 0.03 * Math.sin(frame / 7);
  const f = frame >= hit ? interpolate(frame, [hit, hit + 10], [0.85, 0], clamp) : 0;
  const shake = frame >= hit && frame < hit + 10 ? 14 * (1 - (frame - hit) / 10) * Math.sin((frame - hit) * 2.5) : 0;
  const caption = usePop(cue(431.37));
  return (
    <AbsoluteFill style={{ opacity }}>
      <GridBg />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 240 }}>
        <svg width={420} height={480} viewBox="0 0 100 115" style={{ transform: `translateX(${shake}px) scale(${pulse})`, filter: `drop-shadow(0 0 40px ${COLORS.ship}88)` }}>
          <path d="M50 4 L92 18 L92 52 C92 80 72 100 50 110 C28 100 8 80 8 52 L8 18 Z" fill="#14324a" stroke={COLORS.ship} strokeWidth={4} />
          <path d="M50 18 L80 28 L80 54 C80 74 66 89 50 97 C34 89 20 74 20 54 L20 28 Z" fill="none" stroke={`${COLORS.ship}88`} strokeWidth={2} />
          {frame >= hit && <path d="M50 20 L44 46 L56 58 L48 86" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" />}
        </svg>
        <div
          style={{
            marginTop: 30,
            fontFamily: FONTS.heavy,
            fontWeight: 900,
            fontSize: 48,
            color: COLORS.text,
            opacity: caption,
            transform: `translateY(${(1 - caption) * 20}px)`,
          }}
        >
          Переживает <span style={{ color: COLORS.ship }}>1 удар</span> молота
        </div>
      </AbsoluteFill>
      {f > 0 && <AbsoluteFill style={{ background: '#fff', opacity: f }} />}
    </AbsoluteFill>
  );
};
