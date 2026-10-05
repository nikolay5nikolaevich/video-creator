export type Skill = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

export const SKILLS: Skill[] = [
  { id: 'simplify', name: 'simplify', emoji: '✨', description: 'Убрать лишнее в коде' },
  { id: 'loop', name: 'loop', emoji: '🔁', description: 'Цикл по расписанию' },
  { id: 'schedule', name: 'schedule', emoji: '📆', description: 'Плановый агент' },
  { id: 'worktree', name: 'worktree', emoji: '🌳', description: 'Параллельные ветки' },
  { id: 'code-review', name: 'code-review', emoji: '🔍', description: 'Ревью PR' },
  { id: 'skill-creator', name: 'skill-creator', emoji: '🛠', description: 'Создать скилл' },
];

export const LAYOUT = {
  canvasWidth: 1080,
  canvasHeight: 1920,
  gridLeft: 70,
  gridTop: 420,
  columns: 2,
  cardWidth: 450,
  cardHeight: 330,
  gapX: 40,
  gapY: 40,
} as const;

export const TIMING = {
  titleIn: { start: 0, end: 20 },
  cardsIn: { start: 18, stagger: 4, duration: 20 },
  cursorStart: 55,
  cursorIdleAtStart: 8,
  transitionFrames: 18,
  dwellFrames: 24,
} as const;

export function getCardCenter(index: number): { x: number; y: number } {
  const col = index % LAYOUT.columns;
  const row = Math.floor(index / LAYOUT.columns);
  const x = LAYOUT.gridLeft + col * (LAYOUT.cardWidth + LAYOUT.gapX) + LAYOUT.cardWidth / 2;
  const y = LAYOUT.gridTop + row * (LAYOUT.cardHeight + LAYOUT.gapY) + LAYOUT.cardHeight / 2;
  return { x, y };
}

export function getCardTopLeft(index: number): { x: number; y: number } {
  const col = index % LAYOUT.columns;
  const row = Math.floor(index / LAYOUT.columns);
  return {
    x: LAYOUT.gridLeft + col * (LAYOUT.cardWidth + LAYOUT.gapX),
    y: LAYOUT.gridTop + row * (LAYOUT.cardHeight + LAYOUT.gapY),
  };
}
