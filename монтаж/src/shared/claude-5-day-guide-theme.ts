/**
 * Shared theme tokens for the «Пятидневный гайд для новичков» reels series.
 * Светлый минимализм: кремовый фон, почти-чёрный текст, тёплый terracotta accent.
 *
 * Используется во всех composition'ах `claude-5-day-guide-NN-half`.
 * Лежит в src/shared/ (вне src/animations/), чтобы Root.tsx его не пытался зарегистрировать.
 */

import type { CSSProperties } from 'react';

export const COLORS = {
  bg: '#fafaf7',
  text: '#0f172a',
  muted: '#64748b',
  mutedLight: '#94a3b8',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  card: '#ffffff',
  accent: '#cc785c', // Anthropic terracotta
  accentSoft: 'rgba(204, 120, 92, 0.15)',
  accentGlow: 'rgba(204, 120, 92, 0.35)',
  success: '#10b981',
  danger: '#ef4444',
  // тёмная панель для терминал / UI-сцен
  terminalBg: '#1d1b18',
  terminalPanel: '#26221d',
  terminalText: '#f3ede3',
  terminalGreen: '#7ee787',
  terminalDim: '#8b8378',
} as const;

export const FONTS = {
  text: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", Menlo, ui-monospace, "SF Mono", monospace',
} as const;

/**
 * Half-top mode: композиция 1080×1920, графика только в верхней половине [0, 960].
 * Нижняя половина — тот же кремовый фон без графики (там лицо ведущего).
 */
export const HALF = {
  width: 1080,
  height: 1920,
  topZoneHeight: 960,
  /** Безопасная зона по горизонтали — Reels UI съедает края */
  sidePadding: 96,
  /** Воздух перед стыком с лицом */
  bottomBreather: 80,
} as const;

export const FPS = 30;

/** Базовая обёртка с фоном для half-bролла. Плоский фон по всему канвасу 1920. */
export const halfBackground: CSSProperties = {
  background: COLORS.bg,
  fontFamily: FONTS.text,
  color: COLORS.text,
};

/** Контейнер верхней половины half-bролла — вся графика только сюда, overflow скрыт. */
export const halfTopZone: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: HALF.topZoneHeight,
  overflow: 'hidden',
};

/** Центрирующий «сцена»-слой внутри верхней зоны с safe-area и воздухом снизу. */
export const stage: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `0 ${HALF.sidePadding}px 120px`,
};

/** Карточка-плашка в едином стиле для всей серии */
export const cardStyle: CSSProperties = {
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 28,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
};

/** Чип-плашка «ДЕНЬ N» / короткий лейбл */
export const dayChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '14px 36px',
  borderRadius: 999,
  background: COLORS.accentSoft,
  color: COLORS.accent,
  fontSize: 40,
  fontWeight: 700,
  letterSpacing: 1,
};
