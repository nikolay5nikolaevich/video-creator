import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS, LAYOUT, RADIUS } from '../../../shared/roblox-devlog-theme';
import { BRoll } from '../BRoll';
import type { ClipFx, Seg } from '../timeline';
import { useCue } from '../timing';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Тряска кадра после удара: ±18 px и ±0,6°, затухает за 12 кадров. */
const shakeAt = (frame: number, hits: number[]) => {
  for (const h of hits) {
    const d = frame - h;
    if (d >= 0 && d < 12) {
      const k = 1 - d / 12;
      return {
        x: 18 * k * Math.sin(d * 2.3),
        y: 18 * k * Math.cos(d * 3.1),
        r: 0.6 * k * Math.sin(d * 1.7),
      };
    }
  }
  return { x: 0, y: 0, r: 0 };
};

const Alarm = ({ from, to }: { from: number; to: number }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(((frame - from) / 30) * Math.PI * 2));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ boxShadow: `inset 0 0 0 24px ${COLORS.danger}`, opacity: pulse }} />
      <div
        style={{
          position: 'absolute',
          top: LAYOUT.safe,
          right: LAYOUT.safe,
          background: COLORS.danger,
          color: '#fff',
          borderRadius: RADIUS.plate,
          padding: '12px 26px',
          fontFamily: FONTS.heavy,
          fontWeight: 900,
          fontSize: 40,
          opacity: pulse,
        }}
      >
        ⚠ ОПАСНОСТЬ
      </div>
    </AbsoluteFill>
  );
};

/** Клипы из Roblox на весь экран: куски по секундам исходника + эффекты катастроф. */
export const ClipLayer = ({ segs, to, fx }: { segs: Seg[]; to: number; fx?: ClipFx }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cue = useCue();
  const hits = (fx?.hits ?? []).map(cue);
  const shake = shakeAt(frame, hits);
  const flash = Math.max(0, ...hits.map((h) => interpolate(frame, [h, h + 8], [0.6, 0], clamp) * (frame >= h ? 1 : 0)));
  const vignette = fx?.vignette;
  const vStart = vignette ? cue(vignette.from) : 0;
  const vOpacity = vignette ? interpolate(frame, [vStart, vStart + 90], [0, 0.45], clamp) : 0;
  const vColor = vignette?.color === 'lab' ? '124,255,79' : '61,184,255';

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px) rotate(${shake.r}deg) scale(1.04)` }}>
        {segs.map((s, i) => {
          const start = cue(s.at);
          const next = segs[i + 1];
          const end = next ? cue(next.at) : Math.min(cue(to), durationInFrames);
          if (end <= start) return null;
          const clip = <BRoll file={s.file} from={s.from ?? 0} rate={s.rate ?? 1} />;
          return (
            <Sequence key={`${s.at}-${s.file}`} from={start} durationInFrames={end - start} name={s.file}>
              {s.freeze ? <Freeze frame={0}>{clip}</Freeze> : clip}
            </Sequence>
          );
        })}
      </AbsoluteFill>
      {vignette && (
        <AbsoluteFill
          style={{
            opacity: vOpacity,
            background: `radial-gradient(ellipse at center, rgba(${vColor},0) 45%, rgba(${vColor},0.9) 100%)`,
          }}
        />
      )}
      {fx?.alarm && <Alarm from={cue(fx.alarm[0])} to={cue(fx.alarm[1])} />}
      {flash > 0 && <AbsoluteFill style={{ background: '#fff', opacity: flash }} />}
    </AbsoluteFill>
  );
};
