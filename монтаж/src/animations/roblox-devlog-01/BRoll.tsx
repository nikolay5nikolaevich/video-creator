import type { CSSProperties } from 'react';
import { AbsoluteFill, OffthreadVideo } from 'remotion';
import { asset } from '../../assets';
import { SLUG } from './ARoll';

/**
 * Клип из Roblox на весь экран (или в заданной зоне). Клипы немые.
 * `from` — секунда внутри самого клипа, с которой начинать; `rate` — скорость.
 */
export const BRoll = ({
  file,
  from = 0,
  rate = 1,
  style,
}: {
  file: string;
  from?: number;
  rate?: number;
  style?: CSSProperties;
}) => (
  <AbsoluteFill style={style}>
    <OffthreadVideo
      src={asset(SLUG, `broll/${file}`)}
      trimBefore={Math.round(from * 30)}
      playbackRate={rate}
      muted
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  </AbsoluteFill>
);
