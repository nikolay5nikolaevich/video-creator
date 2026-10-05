import { createContext, useContext, type ReactNode } from 'react';
import { Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { srcToOutFrame } from './edl';

const StartContext = createContext(0);

/**
 * Слой, живущий с секунды исходника `from` до `to`.
 * Внутри `useCue()` переводит любую секунду исходника в локальный кадр слоя.
 */
export const At = ({
  from,
  to,
  children,
  name,
}: {
  from: number;
  to: number;
  children: ReactNode;
  name?: string;
}) => {
  const start = srcToOutFrame(from);
  const end = srcToOutFrame(to);
  if (end <= start) return null;
  return (
    <Sequence from={start} durationInFrames={end - start} name={name} layout="none">
      <StartContext.Provider value={start}>{children}</StartContext.Provider>
    </Sequence>
  );
};

/** cue(сек исходника) → кадр относительно начала текущего <At>. */
export const useCue = () => {
  const start = useContext(StartContext);
  return (sec: number) => srcToOutFrame(sec) - start;
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Появление пружиной: 0 → 1 начиная с кадра `at`. */
export const usePop = (at: number, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 170, mass: 0.7 } });
};

/** Линейное 0 → 1 за `dur` кадров начиная с `at`, с ease-out. */
export const useRamp = (at: number, dur: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
};

/** Прозрачность слоя: заход за fadeIn кадров, уход за fadeOut кадров до конца Sequence. */
export const useLayerFade = (fadeIn = 6, fadeOut = 6) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const a = fadeIn > 0 ? interpolate(frame, [0, fadeIn], [0, 1], clamp) : 1;
  const b =
    fadeOut > 0 ? interpolate(frame, [durationInFrames - fadeOut, durationInFrames], [1, 0], clamp) : 1;
  return Math.min(a, b);
};
