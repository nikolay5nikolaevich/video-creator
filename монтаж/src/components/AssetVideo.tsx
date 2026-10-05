import { AbsoluteFill, OffthreadVideo, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CSSProperties } from 'react';
import { fadeOpacity } from './fade';

export type AssetVideoProps = {
  /** Путь из `asset(slug, file)` (resolved через staticFile). */
  src: string;
  /**
   * true → сохранять alpha-канал. Только для WebM (VP8/VP9 alpha) или
   * ProRes 4444 .mov. Кадры извлекаются как PNG → рендер чуть медленнее.
   */
  transparent?: boolean;
  /** Как вписывать в бокс. По умолчанию 'cover'. */
  fit?: 'cover' | 'contain';
  /** Громкость 0..1. Бролы обычно немые → по умолчанию 0. */
  volume?: number;
  /** Заход по прозрачности, кадров. */
  fadeIn?: number;
  /** Уход по прозрачности, кадров (от конца композиции). */
  fadeOut?: number;
  /**
   * CSS blend-режим — «выбить» монотонный фон без альфы:
   * 'screen' убирает ЧЁРНЫЙ фон (свечения/искры/дым/огонь),
   * 'multiply' убирает БЕЛЫЙ фон (тёмный контент/леттеринг).
   * Это приближение (смешивание со слоем ниже), не настоящий альфа-кей.
   */
  blend?: CSSProperties['mixBlendMode'];
  /** Доп. стили обёртки (позиционирование, размер зоны и т.п.). */
  style?: CSSProperties;
};

/**
 * Внешнее видео слоем. Для непрозрачных клипов (фон), прозрачных
 * оверлеев (transparent) и клипов на монотонном фоне (blend).
 * Обёртка задаёт зону, видео заполняет её по `fit`.
 */
export const AssetVideo = ({
  src,
  transparent = false,
  fit = 'cover',
  volume = 0,
  fadeIn = 0,
  fadeOut = 0,
  blend,
  style,
}: AssetVideoProps) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = fadeOpacity(frame, durationInFrames, fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: blend, ...style }}>
      <OffthreadVideo
        src={src}
        transparent={transparent}
        volume={volume}
        style={{ width: '100%', height: '100%', objectFit: fit }}
      />
    </AbsoluteFill>
  );
};
