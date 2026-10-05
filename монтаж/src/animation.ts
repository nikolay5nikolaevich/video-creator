import type { ComponentType } from 'react';

export type AnimationConfig<Props extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  component: ComponentType<Props>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps?: Props;
};

export function defineAnimation<Props extends Record<string, unknown> = Record<string, unknown>>(
  config: AnimationConfig<Props>,
): AnimationConfig<Props> {
  return config;
}
