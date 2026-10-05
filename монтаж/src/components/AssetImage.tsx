import { Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CSSProperties } from 'react';
import { fadeOpacity } from './fade';

export type KenBurns = {
  /** Масштаб в начале (1 = 100%). */
  from: number;
  /** Масштаб в конце. */
  to: number;
  /** Сдвиг по X за весь диапазон, px. */
  panX?: number;
  /** Сдвиг по Y за весь диапазон, px. */
  panY?: number;
};

export type AssetImageProps = {
  /** Путь из `asset(slug, file)` (resolved через staticFile). */
  src: string;
  /** Как вписывать в бокс. По умолчанию 'cover'. */
  fit?: 'cover' | 'contain';
  /** Оживление статичного фото: плавный zoom/pan по всей длине бролла. */
  kenBurns?: KenBurns;
  /** Заход по прозрачности, кадров. */
  fadeIn?: number;
  /** Уход по прозрачности, кадров (от конца композиции). */
  fadeOut?: number;
  /** Доп. стили обёртки (позиционирование, размер зоны и т.п.). */
  style?: CSSProperties;
};

/**
 * Внешняя картинка/фото слоем, с опциональным Ken Burns (медленный
 * zoom + pan), чтобы статичный кадр не «замирал» на несколько секунд.
 */
export const AssetImage = ({
  src,
  fit = 'cover',
  kenBurns,
  fadeIn = 0,
  fadeOut = 0,
  style,
}: AssetImageProps) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = fadeOpacity(frame, durationInFrames, fadeIn, fadeOut);

  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = kenBurns ? interpolate(progress, [0, 1], [kenBurns.from, kenBurns.to]) : 1;
  const tx = kenBurns?.panX ? interpolate(progress, [0, 1], [0, kenBurns.panX]) : 0;
  const ty = kenBurns?.panY ? interpolate(progress, [0, 1], [0, kenBurns.panY]) : 0;

  // ВАЖНО: обёртка — обычный div с инсетами по умолчанию 0 (НЕ AbsoluteFill).
  // AbsoluteFill форсит width/height:100%, из-за чего переданные через `style`
  // инсеты `right`/`bottom` игнорировались (width:100% + left:PAD → бокс полного
  // размера, сдвинутый на PAD вправо-вниз → картинка съезжала и вылезала). С
  // инсетами 0 по умолчанию переданные top/left/right/bottom корректно задают
  // размер бокса; для полноэкранных вызовов (без style) поведение прежнее.
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        opacity,
        ...style,
      }}
    >
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
        }}
      />
    </div>
  );
};
