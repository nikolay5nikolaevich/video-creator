import { AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, useCurrentFrame } from 'remotion';
import { asset } from '../../assets';
import { KEEPS, srcToOutFrame } from './edl';
import { ACCENTS } from './timeline';

export const SLUG = 'roblox-devlog-01';

/** Центр зума — лицо ведущего (кадр 1920×1080). */
const FACE_ORIGIN = '50% 35%';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const ACCENT_FRAMES = ACCENTS.map((a) => ({ ...a, a: srcToOutFrame(a.from), b: srcToOutFrame(a.to) }));

/**
 * Масштаб лица в кадре `frame` (кадр ролика).
 * Базово: чередование 100% / 112% на склейках, чтобы джамп-каты не дёргались.
 * Акцентный наезд (раздел 3 плана) перекрывает базу: быстрый — за 6 кадров, медленный — за всё окно.
 */
const scaleAt = (frame: number, base: number) => {
  for (const acc of ACCENT_FRAMES) {
    if (frame >= acc.a && frame < acc.b) {
      const t = acc.slow
        ? interpolate(frame, [acc.a, acc.b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) })
        : interpolate(frame, [acc.a, acc.a + 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
      return base + (acc.scale - base) * t;
    }
  }
  return base;
};

const Segment = ({ srcFrom, outFrom, base }: { srcFrom: number; outFrom: number; base: number }) => {
  const frame = useCurrentFrame();
  const scale = scaleAt(outFrom + frame, base);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: FACE_ORIGIN }}>
      <OffthreadVideo
        src={asset(SLUG, 'aroll.mp4')}
        trimBefore={srcFrom}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </AbsoluteFill>
  );
};

/** Запись ведущего, склеенная из оставленных кусков. */
export const ARoll = () => (
  <AbsoluteFill>
    {KEEPS.map((k, i) => (
      <Sequence
        key={k.srcFrom}
        from={k.outFrom}
        durationInFrames={k.srcTo - k.srcFrom}
        name={`A-roll ${(k.srcFrom / 30).toFixed(1)}s`}
      >
        <Segment srcFrom={k.srcFrom} outFrom={k.outFrom} base={i % 2 === 0 ? 1 : 1.12} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
