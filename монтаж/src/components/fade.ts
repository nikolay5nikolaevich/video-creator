import { interpolate } from 'remotion';

/**
 * Прозрачность слоя с заходом/уходом по краям диапазона.
 * Все `interpolate` с `clamp` — иначе мерцает до старта и после конца
 * (см. «Verification gotchas» в script-to-motion/SKILL.md).
 */
export const fadeOpacity = (
  frame: number,
  durationInFrames: number,
  fadeIn = 0,
  fadeOut = 0,
): number => {
  const inOpacity =
    fadeIn > 0
      ? interpolate(frame, [0, fadeIn], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  const outOpacity =
    fadeOut > 0
      ? interpolate(frame, [durationInFrames - fadeOut, durationInFrames], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  return Math.min(inOpacity, outOpacity);
};
