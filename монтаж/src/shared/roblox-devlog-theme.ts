/**
 * Тема девлога про игру в Roblox (горизонтальный YouTube 1920×1080).
 * Тёмные полупрозрачные плашки поверх яркой картинки Roblox, акценты по смыслу.
 * Лежит в src/shared/, чтобы Root.tsx не пытался зарегистрировать её как композицию.
 */

export const COLORS = {
  plate: 'rgba(10, 12, 20, 0.78)',
  plateSolid: '#0c0f19',
  plateBorder: 'rgba(255, 255, 255, 0.10)',
  bg: '#090b12',
  grid: 'rgba(255, 255, 255, 0.045)',
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.62)',
  accent: '#FFC83D', // общий
  lab: '#7CFF4F', // лаборатория, слизь
  ship: '#3DB8FF', // корабль, вода
  danger: '#FF4D4D', // опасность, минусы
  chatUser: '#2b6cff',
  chatAgent: '#1b2030',
} as const;

export const FONTS = {
  heavy: '"Segoe UI Black", "Segoe UI", system-ui, sans-serif',
  text: '"Segoe UI", system-ui, sans-serif',
  mono: 'Consolas, "Cascadia Mono", ui-monospace, monospace',
} as const;

export const LAYOUT = {
  width: 1920,
  height: 1080,
  fps: 30,
  safe: 80,
  /** Нижняя полоса под субтитры — графика сюда не заходит. */
  subtitleBand: 240,
} as const;

export const RADIUS = { plate: 22, pill: 999 } as const;
